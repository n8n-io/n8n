/**
 * Data-Flow Generator
 *
 * Generates data-flow style code from a CompositeTree.
 * Handles leaf, chain, ifElse, switchCase, multiOutput composite kinds,
 * error handling (try/catch), and AI subnodes.
 */

import { getUniqueVarName } from '../variable-names';
import type { VarNameContext } from '../variable-names';
import { isTriggerType, isStickyNote, generateDefaultNodeName } from '../node-type-utils';
import { escapeString, formatKey } from '../string-utils';
import { formatValue } from '../subnode-generator';
import type { SemanticGraph, SemanticNode, AiConnectionType } from '../types';
import type {
	CompositeTree,
	CompositeNode,
	LeafNode,
	ChainNode,
	IfElseCompositeNode,
	FilterCompositeNode,
	SwitchCaseCompositeNode,
	MultiOutputNode,
	FanOutCompositeNode,
	SplitInBatchesCompositeNode,
	WaitWebhookCompositeNode,
	VariableReference,
} from '../composite-tree';
import {
	N8N_EXPRESSION_GLOBALS,
	AI_ALWAYS_ARRAY_TYPES,
	AI_CONNECTION_TO_CONFIG_KEY,
	AI_CONNECTION_TO_BUILDER,
} from '../constants';
import type { IDataObject, WorkflowJSON } from '../../types/base';

// Module-level context for resumeUrl expression replacement inside wait callbacks.
let _genResumeUrlVar: string | undefined;
let _genResumeUrlMode: 'webhook' | 'form' | undefined;
let _genUsedGlobals: Set<string> | undefined;

/**
 * Extended context for data-flow code generation.
 * Includes the semantic graph for looking up subnodes.
 */
interface DataFlowContext extends VarNameContext {
	graph: SemanticGraph;
	/** When true, suppress .map() wrapping for per-item nodes (e.g., inside branches) */
	insideBranch?: boolean;
	/** Set of node names emitted in the current trigger body. VarRefs to nodes NOT in this set
	 *  are cross-trigger shared nodes and get re-emitted as full leaf nodes. */
	currentTriggerNodes?: Set<string>;
	/** When set, $execution.resumeUrl/$execution.resumeFormUrl expressions are replaced with this var */
	resumeUrlVar?: string;
	/** Current wait mode for expression replacement */
	resumeUrlMode?: 'webhook' | 'form';
	/** n8n expression globals used as bare identifiers in the generated code */
	usedGlobals: Set<string>;
}

/**
 * Build the config object string for a single subnode entry.
 * Includes: type, params, version, name (if non-default), credentials.
 */
function buildSubnodeEntry(subnodeNode: SemanticNode): string {
	const parts: string[] = [];

	parts.push(`type: '${subnodeNode.type}'`);

	const params = subnodeNode.json.parameters;
	if (params && Object.keys(params).length > 0) {
		parts.push(`params: ${formatValue(params)}`);
	} else {
		parts.push('params: {}');
	}

	if (subnodeNode.json.typeVersion) {
		parts.push(`version: ${subnodeNode.json.typeVersion}`);
	}

	const defaultName = generateDefaultNodeName(subnodeNode.type);
	if (subnodeNode.json.name && subnodeNode.json.name !== defaultName) {
		parts.push(`name: '${escapeString(subnodeNode.json.name)}'`);
	}

	if (subnodeNode.json.credentials) {
		parts.push(`credentials: ${formatValue(subnodeNode.json.credentials)}`);
	}

	return `{ ${parts.join(', ')} }`;
}

/**
 * Build the subnodes config string for a node with AI subnodes.
 * Groups subnodes by connection type.
 * Uses array for ai_tool (always) and for types with multiple items.
 * Uses single object for other types with one item.
 *
 * @returns The subnodes config string, or null if no subnodes
 */
function buildSubnodesConfig(node: SemanticNode, ctx: DataFlowContext): string | null {
	if (node.subnodes.length === 0) {
		return null;
	}

	// Group subnodes by connection type
	const grouped = new Map<AiConnectionType, SemanticNode[]>();

	for (const sub of node.subnodes) {
		const subnodeNode = ctx.graph.nodes.get(sub.subnodeName);
		if (!subnodeNode) continue;

		const existing = grouped.get(sub.connectionType) ?? [];
		existing.push(subnodeNode);
		grouped.set(sub.connectionType, existing);
	}

	if (grouped.size === 0) {
		return null;
	}

	// Build config entries per connection type
	const entries: string[] = [];

	for (const [connType, subnodeNodes] of grouped) {
		if (subnodeNodes.length === 0) continue;

		const configKey = AI_CONNECTION_TO_CONFIG_KEY[connType] ?? connType;
		const builderName = AI_CONNECTION_TO_BUILDER[connType] ?? connType;
		const entryStrings = subnodeNodes.map((sn) => `${builderName}(${buildSubnodeEntry(sn)})`);

		if (AI_ALWAYS_ARRAY_TYPES.has(connType) || subnodeNodes.length > 1) {
			entries.push(`${configKey}: [${entryStrings.join(', ')}]`);
		} else {
			entries.push(`${configKey}: ${entryStrings[0]}`);
		}
	}

	if (entries.length === 0) {
		return null;
	}

	return `{ ${entries.join(', ')} }`;
}

/**
 * Convert a single n8n expression value to a JS variable reference.
 * E.g., `={{ $json.name }}` with prevVar `fetch_Data` → `fetch_Data.json.name`
 *
 * For complex expressions (runtime globals, template strings), falls back to `expr()`.
 */
function exprToVarRef(value: string, prevVarName: string): string | undefined {
	// Simple $json field reference: ={{ $json.field.path }}
	const jsonMatch = value.match(
		/^=\{\{\s*\$json((?:\.[a-zA-Z_$][a-zA-Z0-9_$]*|\["[^"]*"\]|\['[^']*'\])*)\s*\}\}$/,
	);
	if (jsonMatch) {
		return `${prevVarName}.json${jsonMatch[1]}`;
	}

	// Strict pattern for simple global expressions: identifier + optional .prop or .method() chains
	// Does NOT match globals with arguments like DateTime.fromISO($json.x)
	const SIMPLE_GLOBAL_CHAIN =
		/^((?:\$(?!json\b)[a-zA-Z_]\w*|DateTime|Duration|Interval)(?:\.\w+(?:\(\))?)*)\s*$/;

	// Pure n8n global expression: ={{ $now.toISO() }}, ={{ $today }}, ={{ $execution.id }}
	const globalMatch = value.match(
		/^=\{\{\s*((?:\$(?!json\b)[a-zA-Z_]\w*|DateTime|Duration|Interval)(?:\.\w+(?:\(\))?)*)\s*\}\}$/,
	);
	if (globalMatch && N8N_EXPRESSION_GLOBALS.has(globalMatch[1].match(/^[\w$]+/)![0])) {
		_genUsedGlobals?.add(globalMatch[1].match(/^[\w$]+/)![0]);
		return globalMatch[1];
	}

	// Mixed expression with $json refs, globals, and/or literal text:
	// e.g. ={{ $json.base_url }}/api/menu → `${prevVar.json.base_url}/api/menu`
	// e.g. ={{ $json.url }}?ts={{ $now.toISO() }} → `${prevVar.json.url}?ts=${$now.toISO()}`
	// Uses dotAll flag (s) so multi-line {{ }} blocks are counted and rejected properly.
	if (value.startsWith('=')) {
		const exprBody = value.slice(1);
		const allMustaches = [...exprBody.matchAll(/\{\{\s*(.*?)\s*\}\}/gs)];
		if (allMustaches.length > 0) {
			let templateStr = exprBody;
			let allConverted = true;
			for (const m of allMustaches) {
				const inner = m[1];
				// $json field reference
				const jsonFieldMatch = inner.match(
					/^\$json((?:\.[a-zA-Z_$][a-zA-Z0-9_$]*|\["[^"]*"\]|\['[^']*'\])*)$/,
				);
				if (jsonFieldMatch) {
					templateStr = templateStr.replace(m[0], `\${${prevVarName}.json${jsonFieldMatch[1]}}`);
					continue;
				}
				// Simple n8n global reference (no arguments in calls)
				const simpleGlobal = inner.match(SIMPLE_GLOBAL_CHAIN);
				if (simpleGlobal && N8N_EXPRESSION_GLOBALS.has(inner.match(/^[\w$]+/)![0])) {
					_genUsedGlobals?.add(inner.match(/^[\w$]+/)![0]);
					templateStr = templateStr.replace(m[0], `\${${simpleGlobal[1]}}`);
					continue;
				}
				allConverted = false;
				break;
			}
			if (allConverted) {
				return '`' + templateStr + '`';
			}
		}
	}

	return undefined;
}

/**
 * Format a parameter value for data-flow output.
 * Converts n8n expressions to JS variable references when possible.
 * Falls back to `formatValue` for non-expression values.
 */
function formatDataFlowValue(value: unknown, prevVarName: string): string {
	if (typeof value === 'string' && value.startsWith('=')) {
		// Inside wait callback: replace $execution.resumeUrl expressions with the callback variable
		if (_genResumeUrlVar) {
			const resumeExpr =
				_genResumeUrlMode === 'form'
					? '={{ $execution.resumeFormUrl }}'
					: '={{ $execution.resumeUrl }}';
			if (value === resumeExpr) {
				return _genResumeUrlVar;
			}
		}
		const varRef = exprToVarRef(value, prevVarName);
		if (varRef) return varRef;
		// Fall back to expr() for complex expressions
		return formatValue(value);
	}
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return '{}';
		const formattedEntries = entries.map(
			([k, v]) => `${formatKey(k)}: ${formatDataFlowValue(v, prevVarName)}`,
		);
		return `{ ${formattedEntries.join(', ')} }`;
	}
	if (Array.isArray(value)) {
		const formattedElements = value.map((v) => formatDataFlowValue(v, prevVarName));
		return `[${formattedElements.join(', ')}]`;
	}
	return formatValue(value);
}

/**
 * Build array input argument string for multi-input nodes.
 * Returns `[var0, var1]` if the node has multiple input sources, or undefined.
 */
function buildMultiInputArgs(node: SemanticNode, ctx: DataFlowContext): string | undefined {
	if (node.inputSources.size <= 1) return undefined;

	// Build sparse array indexed by input slot number
	const maxIndex = Math.max(
		...[...node.inputSources.keys()].map((slot) => extractInputIndex(slot)),
	);
	const inputVars: string[] = new Array(maxIndex + 1).fill('undefined');

	for (const [inputSlot, sources] of node.inputSources) {
		const idx = extractInputIndex(inputSlot);
		if (sources.length > 0) {
			const sourceName = sources[0].from;
			const varName = ctx.nodeNameToVarName.get(sourceName);
			if (varName) {
				inputVars[idx] = varName;
			}
		}
	}

	return `[${inputVars.join(', ')}]`;
}

/**
 * Extract numeric index from input slot name (e.g., 'input0' → 0, 'inputA' → 0)
 */
function extractInputIndex(slot: string): number {
	const match = slot.match(/(\d+)$/);
	return match ? parseInt(match[1], 10) : 0;
}

/**
 * Build the config object string for a node (trigger or regular).
 * Includes: type, name (if non-default), params, credentials, version, subnodes.
 */
function buildNodeConfig(node: SemanticNode, ctx: DataFlowContext, prevVarName?: string): string {
	const parts: string[] = [];

	parts.push(`type: '${node.type}'`);

	const defaultName = generateDefaultNodeName(node.type);
	if (node.json.name && node.json.name !== defaultName) {
		parts.push(`name: '${escapeString(node.json.name)}'`);
	}

	const params = node.json.parameters;
	if (params && Object.keys(params).length > 0) {
		const paramStr = prevVarName ? formatDataFlowValue(params, prevVarName) : formatValue(params);
		parts.push(`params: ${paramStr}`);
	} else {
		parts.push('params: {}');
	}

	if (node.json.credentials) {
		parts.push(`credentials: ${formatValue(node.json.credentials)}`);
	}

	if (node.json.typeVersion) {
		parts.push(`version: ${node.json.typeVersion}`);
	}

	const subnodesConfig = buildSubnodesConfig(node, ctx);
	if (subnodesConfig) {
		parts.push(`subnodes: ${subnodesConfig}`);
	}

	if (node.json.output && node.json.output.length > 0) {
		const key = node.annotations.isTrigger ? 'outputSampleData' : 'output';
		parts.push(`${key}: ${formatValue(node.json.output)}`);
	}

	return `{ ${parts.join(', ')} }`;
}

/**
 * Get indentation string for a given depth.
 */
function getIndent(depth: number): string {
	return '  '.repeat(depth);
}

/**
 * Generate a trigger block: onTrigger({ ... }, (items) => { ... });
 *
 * @param triggerNode - The trigger SemanticNode
 * @param bodyNodes - Nodes that follow the trigger in the chain
 * @param ctx - Generation context for variable naming
 * @param depth - Current indentation depth
 */
function generateTriggerBlock(
	triggerNode: SemanticNode,
	bodyNodes: CompositeNode[],
	ctx: DataFlowContext,
	depth: number,
): string {
	const indent = getIndent(depth);
	const config = buildNodeConfig(triggerNode, ctx);
	const lines: string[] = [];

	lines.push(`${indent}onTrigger(${config}, (items) => {`);

	const prevTriggerNodes = ctx.currentTriggerNodes;
	ctx.currentTriggerNodes = new Set<string>();

	let prevVar = 'items';
	for (const compositeNode of bodyNodes) {
		const nodeCode = generateCompositeNode(compositeNode, ctx, depth + 1, prevVar);
		if (nodeCode.varName) {
			prevVar = nodeCode.varName;
		}
		lines.push(nodeCode.code);
	}

	ctx.currentTriggerNodes = prevTriggerNodes;

	lines.push(`${indent}});`);
	return lines.join('\n');
}

interface CompositeNodeResult {
	code: string;
	varName: string | null;
}

/**
 * Generate code for a single composite node inside a callback body.
 */
function generateCompositeNode(
	compositeNode: CompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	switch (compositeNode.kind) {
		case 'leaf':
			return generateLeafNode(compositeNode, ctx, depth, inputVar);
		case 'chain':
			return generateChainNodes(compositeNode, ctx, depth, inputVar);
		case 'ifElse':
			return generateIfElseNode(compositeNode, ctx, depth, inputVar);
		case 'filter':
			return generateFilterNode(compositeNode, ctx, depth, inputVar);
		case 'switchCase':
			return generateSwitchCaseNode(compositeNode, ctx, depth, inputVar);
		case 'multiOutput':
			return generateMultiOutputNode(compositeNode, ctx, depth, inputVar);
		case 'fanOut':
			return generateFanOutNode(compositeNode as FanOutCompositeNode, ctx, depth, inputVar);
		case 'splitInBatches':
			return generateSplitInBatchesNode(
				compositeNode as SplitInBatchesCompositeNode,
				ctx,
				depth,
				inputVar,
			);
		case 'waitWebhook':
			return generateWaitWebhookNode(
				compositeNode as WaitWebhookCompositeNode,
				ctx,
				depth,
				inputVar,
			);
		case 'varRef': {
			const ref = compositeNode as VariableReference;
			// Cross-trigger shared node: VarRef references a node NOT emitted in the
			// current trigger body → re-emit as full leaf so both triggers have code.
			if (ctx.currentTriggerNodes && !ctx.currentTriggerNodes.has(ref.nodeName)) {
				const refNode = ctx.graph.nodes.get(ref.nodeName);
				if (refNode) {
					const leaf: LeafNode = { kind: 'leaf', node: refNode };
					return generateLeafNode(leaf, ctx, depth, inputVar);
				}
			}
			return { code: '', varName: ref.varName };
		}
		default:
			return {
				code: `${getIndent(depth)}// TODO: unsupported pattern (${compositeNode.kind})`,
				varName: null,
			};
	}
}

/**
 * Generate a single leaf node as a const assignment.
 * When the leaf has an errorHandler, wraps the node call in try/catch.
 */
function generateLeafNode(
	leaf: LeafNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const node = leaf.node;

	if (isStickyNote(node.type)) {
		return { code: '', varName: null };
	}

	if (isTriggerType(node.type)) {
		// A trigger as a leaf (standalone, no chain after it)
		const config = buildNodeConfig(node, ctx);
		return {
			code: `${indent}onTrigger(${config}, (items) => {\n${indent}});`,
			varName: null,
		};
	}

	const varName = getUniqueVarName(node.name, ctx);

	// Track node as emitted in the current trigger body
	ctx.currentTriggerNodes?.add(node.name);

	// Error handler nodes always use plain executeNode() in try/catch
	if (leaf.errorHandler) {
		const config = buildNodeConfig(node, ctx, inputVar);
		return generateLeafWithErrorHandler(leaf, varName, config, ctx, depth, inputVar);
	}

	// Per-item wrapping is suppressed inside branches (if/else/switch) because
	// the parser uses lastNodeInScope for connections, not .map() source vars.
	const useMap = !node.json.executeOnce && !ctx.insideBranch;

	// For per-item nodes with .map(), params reference `item` (the callback param)
	// For execute-once or branch nodes, params reference the inputVar directly
	const paramRefVar = useMap ? 'item' : inputVar;
	const config = buildNodeConfig(node, ctx, paramRefVar);

	if (useMap) {
		return {
			code: `${indent}const ${varName} = ${inputVar}.map((item) =>\n${indent}  executeNode(${config}),\n${indent});`,
			varName,
		};
	}

	return {
		code: `${indent}const ${varName} = executeNode(${config});`,
		varName,
	};
}

/**
 * Generate a leaf node with .handleError() chained for error handling.
 */
function generateLeafWithErrorHandler(
	leaf: LeafNode,
	varName: string,
	config: string,
	ctx: DataFlowContext,
	depth: number,
	_inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const innerIndent = getIndent(depth + 1);
	const lines: string[] = [];

	lines.push(`${indent}const ${varName} = executeNode(${config})`);
	lines.push(`${innerIndent}.handleError((items) => {`);

	// Generate the error handler body (inside branch context to suppress .map())
	const prevInsideBranch = ctx.insideBranch;
	ctx.insideBranch = true;
	const errorResult = generateCompositeNode(leaf.errorHandler!, ctx, depth + 2, 'items');
	ctx.insideBranch = prevInsideBranch;
	if (errorResult.code) {
		lines.push(errorResult.code);
	}

	lines.push(`${innerIndent}});`);

	return {
		code: lines.join('\n'),
		varName,
	};
}

/**
 * Generate code for a chain of nodes.
 * If the chain starts with a trigger, generates onTrigger block.
 * Otherwise generates sequential const assignments.
 */
function generateChainNodes(
	chain: ChainNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	if (chain.nodes.length === 0) {
		return { code: '', varName: null };
	}

	const firstNode = chain.nodes[0];

	// If chain starts with trigger, wrap in onTrigger block
	if (firstNode.kind === 'leaf' && isTriggerType(firstNode.node.type)) {
		const bodyNodes = chain.nodes.slice(1);
		const code = generateTriggerBlock(firstNode.node, bodyNodes, ctx, depth);
		return { code, varName: null };
	}

	// Otherwise generate sequential assignments
	const lines: string[] = [];
	let prevVar = inputVar;

	for (const node of chain.nodes) {
		const result = generateCompositeNode(node, ctx, depth, prevVar);
		if (result.code) {
			lines.push(result.code);
		}
		if (result.varName) {
			prevVar = result.varName;
		}
	}

	return {
		code: lines.join('\n'),
		varName: prevVar !== inputVar ? prevVar : null,
	};
}

/**
 * Convert an n8n expression like `={{ $json.field }}` to JS code using the inputVar.
 * For example, `={{ $json.status }}` with inputVar `items` becomes `items[0].json.status`.
 * When itemLevel is true, returns `inputVar.json.status` (no [0] indexing).
 */
function n8nExprToJs(expr: string, inputVar: string, itemLevel = false): string {
	if (typeof expr !== 'string') return String(expr);
	const m = expr.match(/^=\{\{\s*(.*?)\s*\}\}$/s);
	if (!m) return `/* ${expr} */`;
	const inner = m[1];
	const prefix = itemLevel ? `${inputVar}.json` : `${inputVar}[0].json`;
	return inner.replace(/\$json/g, prefix);
}

/**
 * Format a right-hand value as a JS literal for use in conditions.
 */
function formatRightValue(value: unknown): string {
	if (typeof value === 'string') {
		return `'${escapeString(value)}'`;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return String(value);
}

/** Operator info extracted from an IF/Switch condition */
interface ConditionOperator {
	type?: string;
	operation: string;
	singleValue?: boolean;
}

/** A single condition from IF/Switch parameters */
interface ConditionEntry {
	id?: string;
	operator: ConditionOperator;
	leftValue: string;
	rightValue?: unknown;
}

/** Conditions block from IF/Switch parameters */
interface ConditionsBlock {
	options?: Record<string, unknown>;
	combinator?: string;
	conditions: ConditionEntry[];
}

/**
 * Build a JS condition expression string from an IF node's single condition.
 */
function buildConditionExpr(
	condition: ConditionEntry,
	inputVar: string,
	itemLevel = false,
): string {
	const left = n8nExprToJs(condition.leftValue, inputVar, itemLevel);
	const op = condition.operator.operation;

	switch (op) {
		case 'equals':
			return `${left} === ${formatRightValue(condition.rightValue)}`;
		case 'notEquals':
			return `${left} !== ${formatRightValue(condition.rightValue)}`;
		case 'gt':
		case 'largerThan':
			return `${left} > ${formatRightValue(condition.rightValue)}`;
		case 'lt':
		case 'smallerThan':
			return `${left} < ${formatRightValue(condition.rightValue)}`;
		case 'gte':
		case 'largerEqual':
			return `${left} >= ${formatRightValue(condition.rightValue)}`;
		case 'lte':
		case 'smallerEqual':
			return `${left} <= ${formatRightValue(condition.rightValue)}`;
		case 'contains':
			return `${left}.includes(${formatRightValue(condition.rightValue)})`;
		case 'notContains':
			return `!${left}.includes(${formatRightValue(condition.rightValue)})`;
		case 'true':
			return left;
		case 'false':
			return `!${left}`;
		case 'exists':
			return `${left} !== undefined`;
		case 'notExists':
			return `${left} === undefined`;
		default:
			return `/* unknown operator: ${op} */ ${left}`;
	}
}

/**
 * Try to extract a condition string from the IF/Filter node parameters.
 * Supports single conditions and multi-conditions with && (and) or || (or) combinators.
 * When itemLevel is true, generates item-level references (item.json.x) instead of array-level (items[0].json.x).
 */
function extractIfCondition(
	params: IDataObject | undefined,
	inputVar: string,
	itemLevel = false,
): string | null {
	if (!params) return null;

	const conditionsBlock = params.conditions as ConditionsBlock | undefined;
	if (!conditionsBlock) return null;

	const conditions = conditionsBlock.conditions;
	if (!Array.isArray(conditions) || conditions.length === 0) return null;

	if (conditions.length === 1) {
		return buildConditionExpr(conditions[0], inputVar, itemLevel);
	}

	// Multi-condition: join with && or ||
	const jsOperator = conditionsBlock.combinator === 'or' ? ' || ' : ' && ';
	const parts = conditions.map((c) => buildConditionExpr(c, inputVar, itemLevel));
	return parts.join(jsOperator);
}

/**
 * Generate code for branch body nodes (used by IF branches and Switch cases).
 * A branch can be null (empty), a single CompositeNode, or an array of CompositeNodes.
 * Sets insideBranch flag so per-item nodes use plain executeNode() instead of .map().
 */
function generateBranchBody(
	branch: CompositeNode | CompositeNode[] | null,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): string {
	if (branch === null) {
		return `${getIndent(depth)}// empty branch`;
	}

	const prevInsideBranch = ctx.insideBranch;
	ctx.insideBranch = true;

	let result: string;

	if (Array.isArray(branch)) {
		const lines: string[] = [];
		for (const node of branch) {
			const nodeResult = generateCompositeNode(node, ctx, depth, inputVar);
			if (nodeResult.code) {
				lines.push(nodeResult.code);
			}
		}
		result = lines.length > 0 ? lines.join('\n') : `${getIndent(depth)}// empty branch`;
	} else {
		const nodeResult = generateCompositeNode(branch, ctx, depth, inputVar);
		result = nodeResult.code || `${getIndent(depth)}// empty branch`;
	}

	ctx.insideBranch = prevInsideBranch;
	return result;
}

/**
 * Generate code for an IF/Else composite node using .branch() syntax.
 */
function generateIfElseNode(
	node: IfElseCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const innerIndent = getIndent(depth + 1);
	const lines: string[] = [];

	ctx.currentTriggerNodes?.add(node.ifNode.name);

	const conditionExpr = extractIfCondition(node.ifNode.json.parameters, 'item', true);

	const condStr = conditionExpr ?? '/* complex */';
	lines.push(`${indent}${inputVar}.branch(`);
	lines.push(`${innerIndent}(item) => ${condStr},`);

	// True branch callback
	lines.push(`${innerIndent}(items) => {`);
	const trueBranchCode = generateBranchBody(node.trueBranch, ctx, depth + 2, 'items');
	lines.push(trueBranchCode);
	lines.push(`${innerIndent}},`);

	// False branch callback
	if (node.falseBranch !== null) {
		lines.push(`${innerIndent}(items) => {`);
		const falseBranchCode = generateBranchBody(node.falseBranch, ctx, depth + 2, 'items');
		lines.push(falseBranchCode);
		lines.push(`${innerIndent}},`);
	}

	lines.push(`${indent});`);

	return { code: lines.join('\n'), varName: null };
}

/**
 * Generate code for a Filter composite node.
 *
 * Kept-only:     const varName = inputVar.filter((item) => conditionExpr);
 * With discard:  const [keptVar, discardedVar] = inputVar.filter((item) => conditionExpr);
 *
 * Both branches are continuations (not branch contexts), so downstream nodes
 * keep their normal .map() wrapping.
 */
function generateFilterNode(
	node: FilterCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const lines: string[] = [];

	ctx.currentTriggerNodes?.add(node.filterNode.name);

	const conditionExpr = extractIfCondition(node.filterNode.json.parameters, 'item', true);
	const keptVar = getUniqueVarName(node.filterNode.name, ctx);

	const filterExpr = conditionExpr
		? `${inputVar}.filter((item) => ${conditionExpr})`
		: `${inputVar}.filter((item) => /* complex */)`;

	if (!conditionExpr) {
		lines.push(`${indent}// Complex filter condition - see Filter node parameters`);
	}
	lines.push(`${indent}const ${keptVar} = ${filterExpr};`);

	// Generate keptBranch at same depth using keptVar as input.
	// Unlike if/else branches, filter kept output is a continuation (not a branch),
	// so we don't set insideBranch — downstream nodes keep their normal .map() wrapping.
	if (node.keptBranch !== null) {
		const keptNodes = Array.isArray(node.keptBranch) ? node.keptBranch : [node.keptBranch];
		let prevVar = keptVar;
		for (const keptNode of keptNodes) {
			const result = generateCompositeNode(keptNode, ctx, depth, prevVar);
			if (result.code) {
				lines.push(result.code);
			}
			if (result.varName) {
				prevVar = result.varName;
			}
		}
	}

	return { code: lines.join('\n'), varName: keptVar };
}

/** A single rule value from Switch parameters */
interface SwitchRuleValue {
	outputKey?: string;
	conditions?: ConditionsBlock;
}

/** Rules block from Switch parameters */
interface SwitchRulesBlock {
	values?: SwitchRuleValue[];
}

/**
 * Extract the common field and case values from Switch node parameters.
 * Returns the field expression and an array of case values (strings/numbers),
 * or null if the parameters can't be parsed.
 */
function extractSwitchInfo(
	params: IDataObject | undefined,
	inputVar: string,
	itemLevel = false,
): { field: string; caseValues: string[] } | null {
	if (!params) return null;

	const rules = params.rules as SwitchRulesBlock | undefined;
	if (!rules?.values || !Array.isArray(rules.values) || rules.values.length === 0) {
		return null;
	}

	// Extract the common field from the first rule
	const firstRule = rules.values[0];
	const firstConditions = firstRule.conditions?.conditions;
	if (!Array.isArray(firstConditions) || firstConditions.length === 0) return null;

	const firstOp = firstConditions[0].operator;
	const field = n8nExprToJs(firstConditions[0].leftValue, inputVar, itemLevel);

	// Check if all rules use boolean operators (true/false with singleValue)
	const isBoolean = firstOp?.type === 'boolean' && firstOp?.singleValue === true;

	if (isBoolean) {
		const caseValues: string[] = [];
		for (const rule of rules.values) {
			const ruleConditions = rule.conditions?.conditions;
			if (Array.isArray(ruleConditions) && ruleConditions.length > 0) {
				const op = ruleConditions[0].operator;
				caseValues.push(op?.operation === 'true' ? 'true' : 'false');
			} else {
				caseValues.push(`/* unknown */`);
			}
		}
		return { field, caseValues };
	}

	// Extract case values from each rule's rightValue
	const caseValues: string[] = [];
	for (const rule of rules.values) {
		const ruleConditions = rule.conditions?.conditions;
		if (Array.isArray(ruleConditions) && ruleConditions.length > 0) {
			caseValues.push(formatRightValue(ruleConditions[0].rightValue));
		} else {
			caseValues.push(`/* unknown */`);
		}
	}

	return { field, caseValues };
}

/**
 * Generate code for a Switch/Case composite node using .route() syntax.
 */
function generateSwitchCaseNode(
	node: SwitchCaseCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const innerIndent = getIndent(depth + 1);

	ctx.currentTriggerNodes?.add(node.switchNode.name);
	const lines: string[] = [];

	const switchInfo = extractSwitchInfo(node.switchNode.json.parameters, 'item', true);
	const rules = (node.switchNode.json.parameters?.rules as SwitchRulesBlock | undefined)?.values;
	const numRules = rules?.length ?? 0;

	const fieldExpr = switchInfo?.field ?? '/* unknown */';
	lines.push(`${indent}${inputVar}.route((item) => ${fieldExpr}, {`);

	for (let i = 0; i < node.cases.length; i++) {
		const caseIndex = node.caseIndices[i];
		const branch = node.cases[i];

		// Determine if this is the default (fallback) case
		const isDefault = caseIndex >= numRules;

		let key: string;
		if (isDefault) {
			key = 'default';
		} else if (switchInfo && i < switchInfo.caseValues.length) {
			// Use the case value as the key — strip quotes for simple identifiers
			const rawValue = switchInfo.caseValues[i];
			key = rawValue;
		} else {
			key = `/* case ${caseIndex} */`;
		}

		// Format key: if it's a quoted string like 'London', use it directly as a property key
		// For complex keys (spaces, special chars), wrap in quotes
		const formattedKey = formatRouteKey(key);
		lines.push(`${innerIndent}${formattedKey}: (items) => {`);
		const branchBody = generateBranchBody(branch, ctx, depth + 2, 'items');
		lines.push(branchBody);
		lines.push(`${innerIndent}},`);
	}

	lines.push(`${indent}});`);

	return { code: lines.join('\n'), varName: null };
}

/**
 * Format a route key for use as an object property.
 * Simple identifiers: London → London
 * Quoted strings: 'New York' → 'New York'
 * Boolean values: true → true, false → false
 */
function formatRouteKey(key: string): string {
	if (key === 'default' || key === 'true' || key === 'false') return key;
	// If key is a quoted string like 'London', extract and check if valid identifier
	const unquoted = key.replace(/^'(.*)'$/, '$1');
	if (unquoted !== key) {
		// Was a quoted string — check if it's a valid JS identifier
		if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(unquoted)) {
			return unquoted;
		}
		return key; // Keep quotes for non-identifier keys like 'New York'
	}
	return key;
}

/**
 * Generate code for a SplitInBatches composite node as a `.batch()` method call.
 *
 * Produces code like:
 *   sourceVar.batch((items) => {
 *     const processItem = items.map((item) => executeNode({ ... }));
 *   });
 *
 * When non-default config:
 *   sourceVar.batch({ params: { batchSize: 10 }, name: 'Process Each' }, (items) => {
 *     ...
 *   });
 */
function generateSplitInBatchesNode(
	sib: SplitInBatchesCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const lines: string[] = [];

	// Track SIB node as emitted in the current trigger body
	ctx.currentTriggerNodes?.add(sib.sibNode.name);

	const sourceVar = inputVar;

	// Build config object if non-default settings exist
	const configStr = buildBatchConfig(sib, ctx);

	if (configStr) {
		lines.push(`${indent}${sourceVar}.batch(${configStr}, (items) => {`);
	} else {
		lines.push(`${indent}${sourceVar}.batch((items) => {`);
	}

	if (sib.loopChain !== null) {
		const loopBody = generateBranchBody(sib.loopChain, ctx, depth + 1, 'items');
		lines.push(loopBody);
	}

	lines.push(`${indent}});`);

	// Generate done chain after the batch() call (if any)
	if (sib.doneChain !== null) {
		const doneCode = generateBranchBody(sib.doneChain, ctx, depth, inputVar);
		if (doneCode) {
			lines.push(doneCode);
		}
	}

	return { code: lines.join('\n'), varName: null };
}

/**
 * Build the optional config object for a batch() call.
 * Returns null when all defaults (batchSize <= 1, version 3, auto-generated name).
 */
function buildBatchConfig(sib: SplitInBatchesCompositeNode, _ctx: DataFlowContext): string | null {
	const json = sib.sibNode.json;
	const batchSize = (json.parameters?.batchSize as number) ?? 1;
	const version = json.typeVersion ?? 3;
	const defaultName = generateDefaultNodeName(sib.sibNode.type);
	const hasCustomName = json.name !== undefined && json.name !== defaultName;

	const isDefault = batchSize <= 1 && version === 3 && !hasCustomName;
	if (isDefault) return null;

	const parts: string[] = [];

	if (batchSize > 1) {
		parts.push(`params: { batchSize: ${batchSize} }`);
	}

	if (version !== 3) {
		parts.push(`version: ${version}`);
	}

	if (hasCustomName) {
		parts.push(`name: '${escapeString(json.name!)}'`);
	}

	return `{ ${parts.join(', ')} }`;
}

/**
 * Check if any node parameters in a composite tree contain a resume URL expression.
 */
function hasResumeUrlExpression(
	node: CompositeNode | null,
	expr: string,
	graph: SemanticGraph,
): boolean {
	if (!node) return false;
	if (node.kind === 'leaf') {
		return JSON.stringify(node.node.json.parameters ?? {}).includes(expr);
	}
	if (node.kind === 'chain') {
		return node.nodes.some((n) => hasResumeUrlExpression(n, expr, graph));
	}
	return false;
}

/**
 * Generate code for a wait webhook/form composite node.
 *
 * Produces code like:
 *   waitOnWebhook((resumeUrl) => {
 *     const notify = executeNode({ ..., body: { callback: resumeUrl } });
 *   });
 *   const afterResume = executeNode({ ... });
 *
 * For form mode with config:
 *   waitOnForm({ formTitle: 'Approval' }, (resumeUrl) => {
 *     ...
 *   });
 */
function generateWaitWebhookNode(
	wait: WaitWebhookCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const lines: string[] = [];

	ctx.currentTriggerNodes?.add(wait.waitNode.name);

	const funcName = wait.mode === 'form' ? 'waitOnForm' : 'waitOnWebhook';

	// Check if any setup node references the resume URL expression
	const resumeExpr =
		wait.mode === 'form' ? '={{ $execution.resumeFormUrl }}' : '={{ $execution.resumeUrl }}';
	const needsResumeParam = hasResumeUrlExpression(wait.setupChain, resumeExpr, ctx.graph);
	const callbackParam = needsResumeParam ? '(resumeUrl)' : '()';

	// Build the function call opening
	if (wait.mode === 'form') {
		const formConfig = buildWaitFormConfig(wait.waitNode);
		if (formConfig) {
			lines.push(`${indent}${funcName}(${formConfig}, ${callbackParam} => {`);
		} else {
			lines.push(`${indent}${funcName}(${callbackParam} => {`);
		}
	} else {
		lines.push(`${indent}${funcName}(${callbackParam} => {`);
	}

	// Generate setup chain body inside the callback
	if (wait.setupChain) {
		const prevInsideBranch = ctx.insideBranch;
		ctx.insideBranch = true;

		// Enable resumeUrl expression replacement
		const prevResumeVar = _genResumeUrlVar;
		const prevResumeMode = _genResumeUrlMode;
		if (needsResumeParam) {
			_genResumeUrlVar = 'resumeUrl';
			_genResumeUrlMode = wait.mode;
		}

		const setupResult = generateCompositeNode(wait.setupChain, ctx, depth + 1, inputVar);
		if (setupResult.code) {
			lines.push(setupResult.code);
		}

		_genResumeUrlVar = prevResumeVar;
		_genResumeUrlMode = prevResumeMode;
		ctx.insideBranch = prevInsideBranch;
	}

	lines.push(`${indent}});`);

	// Generate continuation after the wait
	if (wait.continuationChain) {
		const contResult = generateCompositeNode(wait.continuationChain, ctx, depth, inputVar);
		if (contResult.code) {
			lines.push(contResult.code);
		}
	}

	return { code: lines.join('\n'), varName: null };
}

/**
 * Build the config object string for a waitOnForm() call.
 * Extracts form-specific params (formTitle, formDescription, formFields, etc.)
 * from the Wait node's parameters. Returns null if no form-specific params.
 */
function buildWaitFormConfig(waitNode: SemanticNode): string | null {
	const params = waitNode.json.parameters;
	if (!params) return null;

	const formKeys = ['formTitle', 'formDescription', 'formFields', 'formRespondMode'];
	const entries: string[] = [];

	for (const key of formKeys) {
		if (params[key] !== undefined) {
			entries.push(`${key}: ${formatValue(params[key])}`);
		}
	}

	if (entries.length === 0) return null;
	return `{ ${entries.join(', ')} }`;
}

/**
 * Generate code for a multi-output node using array destructuring.
 *
 * Produces code like:
 *   const [output0, _, output2] = node({ ... })(inputVar);
 *   const handleA = node({ ... })(output0);
 *   const handleB = node({ ... })(output2);
 */
function generateMultiOutputNode(
	multiOutput: MultiOutputNode,
	ctx: DataFlowContext,
	depth: number,
	_inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const lines: string[] = [];

	const sourceNode = multiOutput.sourceNode;
	ctx.currentTriggerNodes?.add(sourceNode.name);
	const config = buildNodeConfig(sourceNode, ctx);
	const baseVarName = getUniqueVarName(sourceNode.name, ctx);

	// Determine max output index to know array size
	const outputIndices = [...multiOutput.outputTargets.keys()];
	const maxIndex = Math.max(...outputIndices);

	// Build destructuring variable names
	const destructuredVars: string[] = [];
	for (let i = 0; i <= maxIndex; i++) {
		if (multiOutput.outputTargets.has(i)) {
			destructuredVars.push(`${baseVarName}_${i}`);
		} else {
			destructuredVars.push('_');
		}
	}

	// Check if source node has multiple input sources (e.g., Compare Datasets with 2 inputs)
	const inputArgs = buildMultiInputArgs(sourceNode, ctx);
	if (inputArgs) {
		lines.push(
			`${indent}const [${destructuredVars.join(', ')}] = executeNode(${config}, ${inputArgs});`,
		);
	} else {
		lines.push(`${indent}const [${destructuredVars.join(', ')}] = executeNode(${config});`);
	}

	// Generate downstream code for each output target using .map()
	const sortedOutputs = [...multiOutput.outputTargets.entries()].sort((a, b) => a[0] - b[0]);
	for (const [outputIndex, targetComposite] of sortedOutputs) {
		const outputVar = `${baseVarName}_${outputIndex}`;
		// For leaf targets, emit x.map((item) => executeNode(...));
		if (targetComposite.kind === 'leaf') {
			const targetNode = (targetComposite as LeafNode).node;
			const targetVarName = getUniqueVarName(targetNode.name, ctx);
			const targetConfig = buildNodeConfig(targetNode, ctx);
			lines.push(
				`${indent}const ${targetVarName} = ${outputVar}.map((item) =>\n${indent}  executeNode(${targetConfig}),\n${indent});`,
			);
		} else {
			const result = generateCompositeNode(targetComposite, ctx, depth, outputVar);
			if (result.code) {
				lines.push(result.code);
			}
		}
	}

	return {
		code: lines.join('\n'),
		varName: null,
	};
}

/**
 * Generate code for a fan-out node: one source feeding multiple parallel targets.
 *
 * Produces code like:
 *   const source = node({ ... })(input);
 *   const target1 = node({ ... })(source);
 *   const target2 = node({ ... })(source);
 */
function generateFanOutNode(
	fanOut: FanOutCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const lines: string[] = [];

	// Generate source node/chain
	const sourceResult = generateCompositeNode(fanOut.sourceNode, ctx, depth, inputVar);
	if (sourceResult.code) lines.push(sourceResult.code);
	const sourceVar = sourceResult.varName ?? inputVar;

	// Sort targets: leaves first, then composites. This ensures simple branches
	// (e.g., Data B) are defined before chains that reference them via array inputs
	// (e.g., Compare Datasets with [data_A, data_B]).
	const sortedTargets = [...fanOut.targets].sort((a, b) => {
		const aWeight = a.kind === 'leaf' ? 0 : 1;
		const bWeight = b.kind === 'leaf' ? 0 : 1;
		return aWeight - bWeight;
	});

	// Generate each target using .map() from source variable
	for (const target of sortedTargets) {
		if (target.kind === 'leaf') {
			const targetNode = (target as LeafNode).node;
			const targetVarName = getUniqueVarName(targetNode.name, ctx);
			const targetConfig = buildNodeConfig(targetNode, ctx);
			lines.push(
				`${indent}const ${targetVarName} = ${sourceVar}.map((item) =>\n${indent}  executeNode(${targetConfig}),\n${indent});`,
			);
		} else {
			const targetResult = generateCompositeNode(target, ctx, depth, sourceVar);
			if (targetResult.code) lines.push(targetResult.code);
		}
	}

	return { code: lines.join('\n'), varName: null };
}

/**
 * Generate deferred connection code for multi-input nodes (Merge, etc.).
 * Groups deferred connections by target node and emits:
 *   const merged = executeNode({ ... }, [source0, source1]);
 */
function generateDeferredConnections(
	tree: CompositeTree,
	ctx: DataFlowContext,
	depth: number,
): string | undefined {
	const indent = getIndent(depth);
	const lines: string[] = [];

	// Group deferred connections by target node name.
	// Skip connections to multi-output nodes (like Compare Datasets) — those are
	// already handled by generateMultiOutputNode() via buildMultiInputArgs().
	const byTarget = new Map<string, { node: SemanticNode; inputs: Map<number, string> }>();
	for (const conn of tree.deferredConnections) {
		const targetName = conn.targetNode.name;

		// Check if target is already emitted inline as a multiOutput source
		// by looking for it in the composite tree roots. Multi-output nodes
		// use buildMultiInputArgs() directly, so skip them here.
		const targetGraphNode = ctx.graph.nodes.get(targetName);
		if (targetGraphNode) {
			const hasMultipleOutputSlots =
				[...targetGraphNode.outputs.keys()].filter((k) => k !== 'error').length > 1;
			if (hasMultipleOutputSlots) continue;
		}

		if (!byTarget.has(targetName)) {
			byTarget.set(targetName, { node: conn.targetNode, inputs: new Map() });
		}
		const entry = byTarget.get(targetName)!;

		// Resolve source variable name
		const sourceVarName = ctx.nodeNameToVarName.get(conn.sourceNodeName);
		if (sourceVarName) {
			const varRef =
				conn.sourceOutputIndex > 0 ? `${sourceVarName}_${conn.sourceOutputIndex}` : sourceVarName;
			entry.inputs.set(conn.targetInputIndex, varRef);
		}
	}

	// Generate executeNode() call with array inputs for each target
	for (const [targetName, { node, inputs }] of byTarget) {
		const varName = getUniqueVarName(targetName, ctx);
		const config = buildNodeConfig(node, ctx);

		// Build sparse input array
		const maxInputIdx = Math.max(...inputs.keys());
		const inputVars: string[] = [];
		for (let i = 0; i <= maxInputIdx; i++) {
			inputVars.push(inputs.get(i) ?? 'undefined');
		}

		lines.push(`${indent}const ${varName} = executeNode(${config}, [${inputVars.join(', ')}]);`);
	}

	// Generate deferred merge downstream chains
	for (const downstream of tree.deferredMergeDownstreams) {
		const mergeVarName = ctx.nodeNameToVarName.get(downstream.mergeNode.name);
		if (downstream.downstreamChain && mergeVarName) {
			const result = generateCompositeNode(downstream.downstreamChain, ctx, depth, mergeVarName);
			if (result.code) {
				lines.push(result.code);
			}
		}
	}

	return lines.length > 0 ? lines.join('\n') : undefined;
}

/**
 * Main entry point: generate data-flow code from a CompositeTree.
 */
export function generateDataFlowCode(
	tree: CompositeTree,
	workflow: WorkflowJSON,
	graph: SemanticGraph,
): string {
	_genUsedGlobals = new Set();
	const ctx: DataFlowContext = {
		nodeNameToVarName: new Map(),
		usedVarNames: new Set(),
		graph,
		usedGlobals: _genUsedGlobals,
	};

	// Populate node output from workflow pinData (supports JSON→code generation)
	if (workflow.pinData) {
		for (const [nodeName, data] of Object.entries(workflow.pinData)) {
			const node = graph.nodes.get(nodeName);
			if (node && !node.json.output) {
				node.json.output = data;
			}
		}
	}

	// Pre-register all node variable names to avoid collisions
	for (const nodeName of graph.nodes.keys()) {
		getUniqueVarName(nodeName, ctx);
	}

	const workflowName = escapeString(workflow.name ?? '');
	const lines: string[] = [];

	lines.push(`workflow({ name: '${workflowName}' }, () => {`);

	for (const root of tree.roots) {
		// Skip sticky notes at root level
		if (root.kind === 'leaf' && isStickyNote(root.node.type)) {
			continue;
		}

		const result = generateCompositeNode(root, ctx, 1, 'items');
		if (result.code) {
			lines.push(result.code);
		}
	}

	// Process deferred connections — emit multi-input nodes (e.g., Merge)
	// Uses same depth as roots (depth=1 inside the workflow wrapper)
	if (tree.deferredConnections.length > 0) {
		const deferredCode = generateDeferredConnections(tree, ctx, 1);
		if (deferredCode) {
			lines.push(deferredCode);
		}
	}

	lines.push('});');

	const code = lines.join('\n');

	// Prepend import for any n8n globals used in the generated code
	if (_genUsedGlobals && _genUsedGlobals.size > 0) {
		const sorted = [..._genUsedGlobals].sort();
		return `import { ${sorted.join(', ')} } from 'n8n';\n\n${code}`;
	}

	return code;
}
