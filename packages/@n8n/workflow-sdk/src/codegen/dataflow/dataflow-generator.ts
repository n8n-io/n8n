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
	VariableReference,
} from '../composite-tree';
import {
	AI_ALWAYS_ARRAY_TYPES,
	AI_CONNECTION_TO_CONFIG_KEY,
	AI_CONNECTION_TO_BUILDER,
} from '../constants';
import type { IDataObject, WorkflowJSON } from '../../types/base';

/**
 * Extended context for data-flow code generation.
 * Includes the semantic graph for looking up subnodes.
 */
interface DataFlowContext extends VarNameContext {
	graph: SemanticGraph;
	/** When true, suppress .map() wrapping for per-item nodes (e.g., inside branches) */
	insideBranch?: boolean;
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
	return undefined;
}

/**
 * Format a parameter value for data-flow output.
 * Converts n8n expressions to JS variable references when possible.
 * Falls back to `formatValue` for non-expression values.
 */
function formatDataFlowValue(value: unknown, prevVarName: string): string {
	if (typeof value === 'string' && value.startsWith('=')) {
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

	let prevVar = 'items';
	for (const compositeNode of bodyNodes) {
		const nodeCode = generateCompositeNode(compositeNode, ctx, depth + 1, prevVar);
		if (nodeCode.varName) {
			prevVar = nodeCode.varName;
		}
		lines.push(nodeCode.code);
	}

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
		case 'varRef':
			return { code: '', varName: (compositeNode as VariableReference).varName };
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
 * Generate a leaf node wrapped in try/catch for error handling.
 */
function generateLeafWithErrorHandler(
	leaf: LeafNode,
	varName: string,
	config: string,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const innerIndent = getIndent(depth + 1);
	const lines: string[] = [];

	lines.push(`${indent}try {`);
	lines.push(`${innerIndent}const ${varName} = executeNode(${config});`);
	lines.push(`${indent}} catch (e) {`);

	// Generate the error handler body (inside branch context to suppress .map())
	const prevInsideBranch = ctx.insideBranch;
	ctx.insideBranch = true;
	const errorResult = generateCompositeNode(leaf.errorHandler!, ctx, depth + 1, inputVar);
	ctx.insideBranch = prevInsideBranch;
	if (errorResult.code) {
		lines.push(errorResult.code);
	}

	lines.push(`${indent}}`);

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
	const match = expr.match(
		/^=\{\{\s*\$json((?:\.[a-zA-Z_$][a-zA-Z0-9_$]*|\["[^"]*"\]|\['[^']*'\])*)\s*\}\}$/,
	);
	if (match) {
		if (itemLevel) {
			return `${inputVar}.json${match[1]}`;
		}
		return `${inputVar}[0].json${match[1]}`;
	}
	return `/* ${expr} */`;
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
 * Try to extract a simple condition string from the IF/Filter node parameters.
 * Returns null if the condition is too complex (multiple conditions or OR combinator).
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

	// Multiple conditions with OR combinator => complex
	if (conditions.length > 1 || conditionsBlock.combinator === 'or') {
		return null;
	}

	return buildConditionExpr(conditions[0], inputVar, itemLevel);
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
 * Generate code for an IF/Else composite node.
 */
function generateIfElseNode(
	node: IfElseCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const lines: string[] = [];

	const conditionExpr = extractIfCondition(node.ifNode.json.parameters, inputVar);

	if (conditionExpr) {
		lines.push(`${indent}if (${conditionExpr}) {`);
	} else {
		lines.push(`${indent}// Complex condition - see IF node parameters`);
		lines.push(`${indent}if (/* complex */) {`);
	}

	// True branch body
	const trueBranchCode = generateBranchBody(node.trueBranch, ctx, depth + 1, inputVar);
	lines.push(trueBranchCode);

	// False branch
	if (node.falseBranch !== null) {
		lines.push(`${indent}} else {`);
		const falseBranchCode = generateBranchBody(node.falseBranch, ctx, depth + 1, inputVar);
		lines.push(falseBranchCode);
	}

	lines.push(`${indent}}`);

	return { code: lines.join('\n'), varName: null };
}

/**
 * Generate code for a Filter composite node.
 * Emits: const varName = inputVar.filter((item) => conditionExpr);
 * Then generates the keptBranch using varName as input (not as a branch context,
 * since filter is a pass-through — downstream nodes should use normal .map() wrapping).
 */
function generateFilterNode(
	node: FilterCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const lines: string[] = [];

	const conditionExpr = extractIfCondition(node.filterNode.json.parameters, 'item', true);
	const varName = getUniqueVarName(node.filterNode.name, ctx);

	if (conditionExpr) {
		lines.push(`${indent}const ${varName} = ${inputVar}.filter((item) => ${conditionExpr});`);
	} else {
		lines.push(`${indent}// Complex filter condition - see Filter node parameters`);
		lines.push(`${indent}const ${varName} = ${inputVar}.filter((item) => /* complex */);`);
	}

	// Generate keptBranch at same depth using varName as input.
	// Unlike if/else branches, filter kept output is a continuation (not a branch),
	// so we don't set insideBranch — downstream nodes keep their normal .map() wrapping.
	if (node.keptBranch !== null) {
		const keptNodes = Array.isArray(node.keptBranch) ? node.keptBranch : [node.keptBranch];
		let prevVar = varName;
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

	// Generate discardedBranch if present (not typical for .filter() but supported)
	if (node.discardedBranch !== null) {
		lines.push(`${indent}// discarded items branch`);
		const discardedCode = generateBranchBody(node.discardedBranch, ctx, depth, inputVar);
		lines.push(discardedCode);
	}

	return { code: lines.join('\n'), varName };
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

	const field = n8nExprToJs(firstConditions[0].leftValue, inputVar);

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
 * Generate code for a Switch/Case composite node.
 */
function generateSwitchCaseNode(
	node: SwitchCaseCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const caseIndent = getIndent(depth + 1);
	const bodyIndent = getIndent(depth + 2);
	const lines: string[] = [];

	const switchInfo = extractSwitchInfo(node.switchNode.json.parameters, inputVar);
	const rules = (node.switchNode.json.parameters?.rules as SwitchRulesBlock | undefined)?.values;
	const numRules = rules?.length ?? 0;

	if (switchInfo) {
		lines.push(`${indent}switch (${switchInfo.field}) {`);
	} else {
		lines.push(`${indent}// Complex switch - see Switch node parameters`);
		lines.push(`${indent}switch (/* unknown */) {`);
	}

	for (let i = 0; i < node.cases.length; i++) {
		const caseIndex = node.caseIndices[i];
		const branch = node.cases[i];

		// Determine if this is the default (fallback) case
		const isDefault = caseIndex >= numRules;

		if (isDefault) {
			lines.push(`${caseIndent}default: {`);
		} else if (switchInfo && i < switchInfo.caseValues.length) {
			lines.push(`${caseIndent}case ${switchInfo.caseValues[i]}: {`);
		} else {
			lines.push(`${caseIndent}case /* case ${caseIndex} */: {`);
		}

		const branchBody = generateBranchBody(branch, ctx, depth + 2, inputVar);
		lines.push(branchBody);
		lines.push(`${bodyIndent}break;`);
		lines.push(`${caseIndent}}`);
	}

	lines.push(`${indent}}`);

	return { code: lines.join('\n'), varName: null };
}

/**
 * Generate code for a SplitInBatches composite node as a `for...of` loop.
 *
 * Produces code like:
 *   for (const item of sourceVar) {
 *     const processItem = executeNode({ ... });
 *   }
 */
function generateSplitInBatchesNode(
	sib: SplitInBatchesCompositeNode,
	ctx: DataFlowContext,
	depth: number,
	inputVar: string,
): CompositeNodeResult {
	const indent = getIndent(depth);
	const lines: string[] = [];

	const sourceVar = inputVar;

	// Generate loop body
	lines.push(`${indent}for (const item of ${sourceVar}) {`);

	if (sib.loopChain !== null) {
		const loopBody = generateBranchBody(sib.loopChain, ctx, depth + 1, 'item');
		lines.push(loopBody);
	}

	lines.push(`${indent}}`);

	// Generate done chain after the loop (if any)
	if (sib.doneChain !== null) {
		const doneCode = generateBranchBody(sib.doneChain, ctx, depth, inputVar);
		if (doneCode) {
			lines.push(doneCode);
		}
	}

	return { code: lines.join('\n'), varName: null };
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

	// Generate: const [var0, _, var2] = executeNode({ ... });
	lines.push(`${indent}const [${destructuredVars.join(', ')}] = executeNode(${config});`);

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

	// Generate each target using .map() from source variable
	for (const target of fanOut.targets) {
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
 * Main entry point: generate data-flow code from a CompositeTree.
 */
export function generateDataFlowCode(
	tree: CompositeTree,
	workflow: WorkflowJSON,
	graph: SemanticGraph,
): string {
	const ctx: DataFlowContext = {
		nodeNameToVarName: new Map(),
		usedVarNames: new Set(),
		graph,
	};

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

	lines.push('});');

	return lines.join('\n');
}
