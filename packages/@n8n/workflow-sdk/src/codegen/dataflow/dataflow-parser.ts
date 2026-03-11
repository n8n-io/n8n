/**
 * Data-Flow Parser
 *
 * Converts data-flow code strings back to WorkflowJSON.
 * Uses Acorn to parse the code into an AST, then walks the AST statically
 * to extract nodes and connections.
 *
 * This is the inverse of the data-flow generator.
 */

import type {
	Program,
	CallExpression,
	MemberExpression,
	Identifier,
	ExpressionStatement,
	VariableDeclaration,
	VariableDeclarator,
	ArrowFunctionExpression,
	FunctionExpression,
	BlockStatement,
	IfStatement,
	SwitchStatement,
	SwitchCase,
	TryStatement,
	ObjectExpression,
	Property,
	ArrayExpression,
	Literal,
	BinaryExpression,
	UnaryExpression,
	LogicalExpression,
	Expression,
	Statement,
	Node as EstreeNode,
} from 'estree';

import { parseSDKCode } from '../../ast-interpreter/parser';
import { generateDefaultNodeName } from '../node-type-utils';
import type { WorkflowJSON, NodeJSON, IConnections, IDataObject } from '../../types/base';
import type { SemanticGraph, SemanticNode, AiConnectionType } from '../types';
import { semanticGraphToWorkflowJSON } from '../semantic-graph';
import { getOutputName, getInputName, getOutputIndex } from '../semantic-registry';
import { isTriggerNodeType } from '../../utils/trigger-detection';
import { AI_CONNECTION_TO_CONFIG_KEY, AI_CONNECTION_TO_BUILDER } from '../constants';

// Build reverse maps: builder name → connection type, config key → connection type
const BUILDER_TO_CONNECTION: Record<string, string> = {};
for (const [connType, builder] of Object.entries(AI_CONNECTION_TO_BUILDER)) {
	BUILDER_TO_CONNECTION[builder] = connType;
}
const CONFIG_KEY_TO_CONNECTION: Record<string, string> = {};
for (const [connType, configKey] of Object.entries(AI_CONNECTION_TO_CONFIG_KEY)) {
	CONFIG_KEY_TO_CONNECTION[configKey] = connType;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParserState {
	graphNodes: Map<string, SemanticNode>;
	nodeInsertionOrder: string[];
	varToNode: Map<string, { nodeName: string; outputIndex: number }>;
	workflowName: string;
	nodeCounter: number;
	usedNames: Set<string>;
	/** Lookup by explicit name+type → existing node (for deduplication of cross-trigger shared nodes) */
	nodesByName: Map<string, SemanticNode>;
	insideMap: boolean;
	/** Depth counter for if/else/switch branches — nodes inside branches don't get executeOnce */
	branchDepth: number;
	lastNodeInScope: { nodeName: string; outputIndex: number } | undefined;
	/** Name of the resumeUrl callback parameter (for expression replacement inside waitOnWebhook/waitOnForm) */
	resumeUrlParamName?: string;
	/** Current wait mode for expression replacement */
	resumeUrlMode?: 'webhook' | 'form';
}

interface NodeConfig {
	type: string;
	name?: string;
	params: Record<string, unknown>;
	credentials?: Record<string, unknown>;
	version?: number;
	subnodes?: Record<string, unknown[] | unknown>;
	sampleData?: unknown[];
}

interface ConditionInfo {
	leftValue: string;
	rightValue: unknown;
	operation: string;
	operatorType: string;
}

interface MultiConditionInfo {
	conditions: ConditionInfo[];
	combinator: 'and' | 'or';
}

type ConditionResult = ConditionInfo | MultiConditionInfo;

function isMultiCondition(result: ConditionResult): result is MultiConditionInfo {
	return 'conditions' in result && 'combinator' in result;
}

// ---------------------------------------------------------------------------
// Module-level context for resumeUrl expression replacement inside wait callbacks.
// Set before processing a waitOnWebhook/waitOnForm callback body, cleared after.
// ---------------------------------------------------------------------------
let _resumeUrlParam: string | undefined;
let _resumeUrlMode: 'webhook' | 'form' | undefined;

// ---------------------------------------------------------------------------
// AST type guards
// ---------------------------------------------------------------------------

function isIdentifier(node: EstreeNode): node is Identifier {
	return node.type === 'Identifier';
}

function isCallExpression(node: EstreeNode): node is CallExpression {
	return node.type === 'CallExpression';
}

function isMemberExpression(node: EstreeNode): node is MemberExpression {
	return node.type === 'MemberExpression';
}

function isObjectExpression(node: EstreeNode): node is ObjectExpression {
	return node.type === 'ObjectExpression';
}

function isArrayExpression(node: EstreeNode): node is ArrayExpression {
	return node.type === 'ArrayExpression';
}

function isLiteral(node: EstreeNode): node is Literal {
	return node.type === 'Literal';
}

function isArrowOrFunction(node: EstreeNode): node is ArrowFunctionExpression | FunctionExpression {
	return node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression';
}

function isBinaryExpression(node: EstreeNode): node is BinaryExpression {
	return node.type === 'BinaryExpression';
}

function isUnaryExpression(node: EstreeNode): node is UnaryExpression {
	return node.type === 'UnaryExpression';
}

function isLogicalExpression(node: EstreeNode): node is LogicalExpression {
	return node.type === 'LogicalExpression';
}

function isExpression(node: EstreeNode): node is Expression {
	return (
		node.type !== 'Super' && node.type !== 'PrivateIdentifier' && node.type !== 'SpreadElement'
	);
}

// ---------------------------------------------------------------------------
// Extract literal values from AST
// ---------------------------------------------------------------------------

function extractLiteralValue(node: EstreeNode): unknown {
	if (isLiteral(node)) {
		return node.value;
	}
	if (isObjectExpression(node)) {
		return extractObjectLiteral(node);
	}
	if (isArrayExpression(node)) {
		return node.elements.map((el) => {
			if (el === null) return null;
			if (el.type === 'SpreadElement') return null;
			return extractLiteralValue(el);
		});
	}
	if (isIdentifier(node)) {
		if (node.name === 'undefined') return undefined;
		if (node.name === 'true') return true;
		if (node.name === 'false') return false;
		// Inside waitOnWebhook/waitOnForm callback: replace resumeUrl identifier with expression
		if (_resumeUrlParam && node.name === _resumeUrlParam) {
			return _resumeUrlMode === 'form'
				? '={{ $execution.resumeFormUrl }}'
				: '={{ $execution.resumeUrl }}';
		}
		return node.name;
	}
	if (isUnaryExpression(node) && node.operator === '-' && isLiteral(node.argument)) {
		const val = node.argument.value;
		if (typeof val === 'number') return -val;
	}
	// Member expression: var.json.field → ={{ $json.field }}
	if (isMemberExpression(node)) {
		const fieldPath = memberExprToFieldPath(node as Expression);
		if (fieldPath !== undefined) {
			return `={{ $json.${fieldPath} }}`;
		}
		return undefined;
	}
	// Template literals and other complex expressions - return as string
	if (node.type === 'TemplateLiteral') {
		// Simple template literal extraction
		const tmpl = node as unknown as {
			quasis: Array<{ value: { raw: string } }>;
			expressions: Expression[];
		};
		if (tmpl.expressions.length === 0 && tmpl.quasis.length === 1) {
			return tmpl.quasis[0].value.raw;
		}
	}
	// Handle expr('{{ $json.field }}') → '={{ $json.field }}'
	// Handle subnode builder calls: languageModel({...}), tool({...}) etc.
	if (isCallExpression(node)) {
		const call = node as CallExpression;
		if (isIdentifier(call.callee)) {
			const calleeName = (call.callee as Identifier).name;
			if (calleeName === 'expr') {
				if (call.arguments.length > 0 && call.arguments[0].type !== 'SpreadElement') {
					const arg = call.arguments[0];
					if (isLiteral(arg) && typeof arg.value === 'string') {
						return '=' + arg.value;
					}
				}
			}
			// Subnode builder: languageModel({...}), tool({...}), memory({...}) etc.
			if (calleeName in BUILDER_TO_CONNECTION) {
				if (call.arguments.length > 0 && isObjectExpression(call.arguments[0])) {
					return extractObjectLiteral(call.arguments[0]);
				}
			}
		}
	}
	return undefined;
}

function extractObjectLiteral(objExpr: ObjectExpression): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const prop of objExpr.properties) {
		if (prop.type === 'SpreadElement') continue;
		const p = prop as Property;
		let key: string;
		if (p.key.type === 'Identifier') {
			key = p.key.name;
		} else if (p.key.type === 'Literal') {
			key = String(p.key.value);
		} else {
			continue;
		}
		result[key] = extractLiteralValue(p.value as Expression);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Node creation helpers
// ---------------------------------------------------------------------------

function createNodeId(counter: number): string {
	// Simple counter-based ID
	return `node-${counter}`;
}

interface CreateNodeResult {
	node: SemanticNode;
	isNew: boolean;
}

function createSemanticNode(config: NodeConfig, state: ParserState): CreateNodeResult {
	// Deduplicate: if same explicit name + same type already exists, reuse it
	// (happens with cross-trigger convergence where two triggers share a downstream node)
	if (config.name) {
		const existing = state.nodesByName.get(`${config.name}::${config.type}`);
		if (existing) {
			return { node: existing, isNew: false };
		}
	}

	const id = createNodeId(state.nodeCounter);
	let name = config.name ?? generateDefaultNodeName(config.type);

	// Ensure unique name — n8n connections are keyed by node name
	if (state.usedNames.has(name)) {
		let suffix = 1;
		while (state.usedNames.has(`${name} ${suffix}`)) {
			suffix++;
		}
		name = `${name} ${suffix}`;
	}
	state.usedNames.add(name);

	const position: [number, number] = [state.nodeCounter * 200, 0];
	state.nodeCounter++;

	const json: NodeJSON = {
		id,
		name,
		type: config.type,
		typeVersion: config.version ?? 1,
		position,
		parameters: config.params as NodeJSON['parameters'],
	};

	if (config.credentials) {
		json.credentials = config.credentials as NodeJSON['credentials'];
	}

	if (config.sampleData && config.sampleData.length > 0) {
		json.output = config.sampleData as IDataObject[];
	}

	const semanticNode: SemanticNode = {
		name,
		type: config.type,
		json,
		outputs: new Map(),
		inputSources: new Map(),
		subnodes: [],
		annotations: {
			isTrigger: isTriggerNodeType(config.type),
			isCycleTarget: false,
			isConvergencePoint: false,
		},
	};

	state.graphNodes.set(name, semanticNode);
	state.nodeInsertionOrder.push(name);
	state.nodesByName.set(`${name}::${config.type}`, semanticNode);

	return { node: semanticNode, isNew: true };
}

function addSemanticEdge(
	state: ParserState,
	fromName: string,
	toName: string,
	fromOutputIndex: number = 0,
	toInputIndex: number = 0,
): void {
	const fromNode = state.graphNodes.get(fromName);
	const toNode = state.graphNodes.get(toName);
	if (!fromNode || !toNode) return;

	const outputSlot = getOutputName(fromNode.type, fromOutputIndex, fromNode.json);
	const inputSlot = getInputName(toNode.type, toInputIndex, toNode.json);

	// Add to source's outputs
	let targets = fromNode.outputs.get(outputSlot);
	if (!targets) {
		targets = [];
		fromNode.outputs.set(outputSlot, targets);
	}
	targets.push({ target: toName, targetInputSlot: inputSlot });

	// Add to target's inputSources
	let sources = toNode.inputSources.get(inputSlot);
	if (!sources) {
		sources = [];
		toNode.inputSources.set(inputSlot, sources);
	}
	sources.push({ from: fromName, outputSlot });
}

// ---------------------------------------------------------------------------
// Extract node config from AST ObjectExpression
// ---------------------------------------------------------------------------

function extractNodeConfig(objExpr: ObjectExpression): NodeConfig {
	const raw = extractObjectLiteral(objExpr);
	return {
		type: raw.type as string,
		name: raw.name as string | undefined,
		params: (raw.params as Record<string, unknown>) ?? {},
		credentials: raw.credentials as Record<string, unknown> | undefined,
		version: raw.version as number | undefined,
		subnodes: raw.subnodes as Record<string, unknown[]> | undefined,
		sampleData: raw.sampleData as unknown[] | undefined,
	};
}

// ---------------------------------------------------------------------------
// Member expression -> n8n expression
// ---------------------------------------------------------------------------

/**
 * Join field path parts, using `.` between regular identifiers and
 * no separator before bracket-access parts like `['key']`.
 */
function joinFieldParts(parts: string[]): string {
	let result = '';
	for (const part of parts) {
		if (part.startsWith('[')) {
			result += part;
		} else if (result.length > 0) {
			result += '.' + part;
		} else {
			result = part;
		}
	}
	return result;
}

/**
 * Try to extract a field path from `items[0].json.path...` pattern.
 * Returns the n8n expression like `={{ $json.path }}` or undefined.
 */
function memberExprToFieldPath(expr: Expression): string | undefined {
	const parts: string[] = [];
	let current: Expression = expr;

	// Walk the member expression chain bottom-up
	while (current.type === 'MemberExpression') {
		const me: MemberExpression = current;
		if (me.computed) {
			// items[0] case — numeric index at root
			if (isLiteral(me.property) && (me.property as Literal).value === 0) {
				// Check if object is an identifier (the variable)
				if (me.object.type !== 'Super' && isIdentifier(me.object)) {
					// We've reached the root, parts collected so far are the path
					// parts is reversed: [field, json] -> $json.field
					parts.reverse();
					if (parts.length > 0 && parts[0] === 'json') {
						const fieldPath = joinFieldParts(parts.slice(1));
						return fieldPath || undefined;
					}
				}
				return undefined;
			}
			// Bracket-access with string literal key: obj['key'] or obj["key"]
			if (isLiteral(me.property) && typeof (me.property as Literal).value === 'string') {
				const key = (me.property as Literal).value as string;
				// Store as bracket notation to preserve in round-trip
				parts.push(`['${key}']`);
				if (me.object.type === 'Super') return undefined;
				current = me.object;
				continue;
			}
			return undefined;
		} else {
			if (isIdentifier(me.property)) {
				parts.push(me.property.name);
			} else {
				return undefined;
			}
			if (me.object.type === 'Super') return undefined;
			current = me.object;
		}
	}
	// Handle identifier.json.field (e.g. prevVar.json.name, item.json.email)
	if (isIdentifier(current)) {
		parts.reverse();
		if (parts.length > 0 && parts[0] === 'json') {
			const fieldPath = joinFieldParts(parts.slice(1));
			return fieldPath || undefined;
		}
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Condition extraction from if/switch AST
// ---------------------------------------------------------------------------

function extractConditionFromBinary(expr: BinaryExpression): ConditionInfo | undefined {
	// BinaryExpression.left can be PrivateIdentifier in ESTree; skip those
	if (expr.left.type === 'PrivateIdentifier') return undefined;

	const left: Expression = expr.left;

	// Check for === undefined / !== undefined first
	if (isIdentifier(expr.right) && expr.right.name === 'undefined') {
		const leftPath = memberExprToFieldPath(left);
		if (leftPath === undefined) return undefined;

		if (expr.operator === '===' || expr.operator === '==') {
			return {
				leftValue: `={{ $json.${leftPath} }}`,
				rightValue: '',
				operation: 'notExists',
				operatorType: 'boolean',
			};
		}
		if (expr.operator === '!==' || expr.operator === '!=') {
			return {
				leftValue: `={{ $json.${leftPath} }}`,
				rightValue: '',
				operation: 'exists',
				operatorType: 'boolean',
			};
		}
	}

	const leftPath = memberExprToFieldPath(left);
	if (leftPath === undefined) return undefined;

	const rightValue = extractLiteralValue(expr.right);

	const operatorMap: Record<string, string> = {
		'===': 'equals',
		'!==': 'notEquals',
		'==': 'equals',
		'!=': 'notEquals',
		'>': 'gt',
		'<': 'lt',
		'>=': 'gte',
		'<=': 'lte',
	};

	const operation = operatorMap[expr.operator];
	if (!operation) return undefined;

	const operatorType = typeof rightValue === 'number' ? 'number' : 'string';

	return {
		leftValue: `={{ $json.${leftPath} }}`,
		rightValue,
		operation,
		operatorType,
	};
}

function extractConditionFromIncludes(expr: CallExpression): ConditionInfo | undefined {
	// Pattern: items[0].json.field.includes('value')
	if (!isMemberExpression(expr.callee)) return undefined;
	const calleeMember = expr.callee;
	if (!isIdentifier(calleeMember.property) || calleeMember.property.name !== 'includes') {
		return undefined;
	}
	if (!isExpression(calleeMember.object)) return undefined;

	const fieldPath = memberExprToFieldPath(calleeMember.object);
	if (fieldPath === undefined) return undefined;

	if (expr.arguments.length === 0) return undefined;
	const rightValue = extractLiteralValue(expr.arguments[0]);

	return {
		leftValue: `={{ $json.${fieldPath} }}`,
		rightValue,
		operation: 'contains',
		operatorType: 'string',
	};
}

/**
 * Recursively collect conditions from a chain of same-combinator LogicalExpressions.
 * `a && b && c` parses as `(a && b) && c` — this flattens them.
 */
function collectConditions(expr: Expression, operator: '&&' | '||'): ConditionInfo[] | undefined {
	if (isLogicalExpression(expr) && expr.operator === operator) {
		const left = collectConditions(expr.left, operator);
		const right = collectConditions(expr.right, operator);
		if (left && right) return [...left, ...right];
		return undefined;
	}
	const single = extractSingleCondition(expr);
	if (single) return [single];
	return undefined;
}

/**
 * Extract a single (non-logical) condition from an expression.
 */
function extractSingleCondition(expr: Expression): ConditionInfo | undefined {
	// Binary expression: items[0].json.x === 'value'
	if (isBinaryExpression(expr)) {
		return extractConditionFromBinary(expr);
	}

	// Call expression: items[0].json.field.includes('value')
	if (isCallExpression(expr)) {
		return extractConditionFromIncludes(expr);
	}

	// Unary !: !items[0].json.isActive -> false
	if (isUnaryExpression(expr) && expr.operator === '!') {
		const fieldPath = memberExprToFieldPath(expr.argument);
		if (fieldPath !== undefined) {
			return {
				leftValue: `={{ $json.${fieldPath} }}`,
				rightValue: '',
				operation: 'false',
				operatorType: 'boolean',
			};
		}
	}

	// Truthy check: items[0].json.isActive -> true
	if (isMemberExpression(expr)) {
		const fieldPath = memberExprToFieldPath(expr);
		if (fieldPath !== undefined) {
			return {
				leftValue: `={{ $json.${fieldPath} }}`,
				rightValue: '',
				operation: 'true',
				operatorType: 'boolean',
			};
		}
	}

	return undefined;
}

function extractConditionFromExpression(expr: Expression): ConditionResult | undefined {
	// LogicalExpression: a && b, a || b
	if (isLogicalExpression(expr)) {
		const operator = expr.operator as '&&' | '||';
		const conditions = collectConditions(expr, operator);
		if (conditions && conditions.length >= 2) {
			return {
				conditions,
				combinator: operator === '&&' ? 'and' : 'or',
			};
		}
		return undefined;
	}

	return extractSingleCondition(expr);
}

function buildConditionEntry(condition: ConditionInfo): Record<string, unknown> {
	const entry: Record<string, unknown> = {
		operator: {
			type: condition.operatorType,
			operation: condition.operation,
		},
		leftValue: condition.leftValue,
	};

	if (
		condition.operation !== 'true' &&
		condition.operation !== 'false' &&
		condition.operation !== 'exists' &&
		condition.operation !== 'notExists'
	) {
		entry.rightValue = condition.rightValue;
	}

	return entry;
}

function buildIfParameters(result: ConditionResult): Record<string, unknown> {
	if (isMultiCondition(result)) {
		return {
			conditions: {
				options: {
					version: 2,
					caseSensitive: true,
					typeValidation: 'loose',
				},
				combinator: result.combinator,
				conditions: result.conditions.map(buildConditionEntry),
			},
		};
	}

	return {
		conditions: {
			options: {
				version: 2,
				caseSensitive: true,
				typeValidation: 'loose',
			},
			combinator: 'and',
			conditions: [buildConditionEntry(result)],
		},
	};
}

// ---------------------------------------------------------------------------
// Switch parameters builder
// ---------------------------------------------------------------------------

function buildSwitchParameters(fieldPath: string, caseValues: unknown[]): Record<string, unknown> {
	const rules: Record<string, unknown>[] = caseValues.map((value) => ({
		conditions: {
			options: {
				version: 2,
				caseSensitive: true,
				typeValidation: 'loose',
			},
			combinator: 'and',
			conditions: [
				{
					operator: {
						type: typeof value === 'number' ? 'number' : 'string',
						operation: 'equals',
					},
					leftValue: `={{ $json.${fieldPath} }}`,
					rightValue: value,
				},
			],
		},
	}));

	return {
		rules: {
			values: rules,
		},
		options: {
			fallbackOutput: 'extra',
		},
	};
}

// ---------------------------------------------------------------------------
// Statement processing
// ---------------------------------------------------------------------------

/**
 * Check if a call expression is `executeNode({...})` or `executeNode({...}, [a, b])`.
 * Returns the config ObjectExpression and optional inputs ArrayExpression if matched.
 */
function matchExecuteNodeCall(
	expr: CallExpression,
): { config: ObjectExpression; inputsArray?: ArrayExpression } | undefined {
	if (!isIdentifier(expr.callee) || expr.callee.name !== 'executeNode') return undefined;
	if (expr.arguments.length === 0) return undefined;
	const configArg = expr.arguments[0];
	if (configArg.type === 'SpreadElement' || !isObjectExpression(configArg)) return undefined;
	// Check for optional second argument: array of input variables
	let inputsArray: ArrayExpression | undefined;
	if (expr.arguments.length >= 2) {
		const secondArg = expr.arguments[1];
		if (secondArg.type !== 'SpreadElement' && secondArg.type === 'ArrayExpression') {
			inputsArray = secondArg;
		}
	}
	return { config: configArg, inputsArray };
}

/**
 * Check if a call expression is `source.map((item) => ...)`.
 * Returns the source variable name and callback if matched.
 */
function isMapCall(
	expr: CallExpression,
): { sourceVar: string; callback: ArrowFunctionExpression | FunctionExpression } | undefined {
	if (!isMemberExpression(expr.callee)) return undefined;
	const member = expr.callee;
	if (!isIdentifier(member.property) || member.property.name !== 'map') return undefined;
	if (member.object.type === 'Super' || !isIdentifier(member.object)) return undefined;
	const sourceVar = member.object.name;
	if (expr.arguments.length === 0) return undefined;
	const arg = expr.arguments[0];
	if (arg.type === 'SpreadElement' || !isArrowOrFunction(arg)) return undefined;
	return { sourceVar, callback: arg };
}

/**
 * Check if a call expression is `source.filter((item) => condition)`.
 * Returns the source variable name and the callback.
 */
function isFilterCall(
	expr: CallExpression,
): { sourceVar: string; callback: ArrowFunctionExpression | FunctionExpression } | undefined {
	if (!isMemberExpression(expr.callee)) return undefined;
	const member = expr.callee;
	if (!isIdentifier(member.property) || member.property.name !== 'filter') return undefined;
	if (member.object.type === 'Super' || !isIdentifier(member.object)) return undefined;
	const sourceVar = member.object.name;
	if (expr.arguments.length === 0) return undefined;
	const arg = expr.arguments[0];
	if (arg.type === 'SpreadElement' || !isArrowOrFunction(arg)) return undefined;
	return { sourceVar, callback: arg };
}

/**
 * Check if a call expression is a `node({...})(input)` or `node({...})()` pattern.
 * Returns the config ObjectExpression and optional input argument if matched.
 */
function matchNodeCall(
	expr: CallExpression,
): { configExpr: ObjectExpression; inputArg?: Expression } | undefined {
	// Pattern: node({ ... })(inputVar) or node({ ... })()
	// The outer call has callee = another CallExpression: node({...})
	if (!isCallExpression(expr.callee)) return undefined;

	const innerCall = expr.callee;
	if (!isIdentifier(innerCall.callee) || innerCall.callee.name !== 'node') {
		return undefined;
	}

	if (innerCall.arguments.length === 0) return undefined;
	const configArg = innerCall.arguments[0];
	if (!isObjectExpression(configArg)) return undefined;

	if (expr.arguments.length === 0) {
		return { configExpr: configArg };
	}
	const inputArg = expr.arguments[0];
	if (inputArg.type === 'SpreadElement') return undefined;

	return { configExpr: configArg, inputArg };
}

/**
 * Resolve the source node name from a variable reference.
 */
function resolveInputVar(expr: Expression, state: ParserState): string | undefined {
	if (isIdentifier(expr)) {
		const mapping = state.varToNode.get(expr.name);
		if (mapping) return mapping.nodeName;
	}
	return undefined;
}

/**
 * Resolve the output index from a variable reference.
 */
function resolveOutputIndex(expr: Expression, state: ParserState): number {
	if (isIdentifier(expr)) {
		const mapping = state.varToNode.get(expr.name);
		if (mapping) return mapping.outputIndex;
	}
	return 0;
}

/**
 * Process subnodes config and add subnode nodes + connections.
 */
function processSubnodes(config: NodeConfig, parentNodeName: string, state: ParserState): void {
	if (!config.subnodes) return;

	const parentNode = state.graphNodes.get(parentNodeName);
	if (!parentNode) return;

	for (const [key, subnodeConfigsRaw] of Object.entries(config.subnodes)) {
		// Map config key (e.g. 'model') to connection type (e.g. 'ai_languageModel')
		// Also accept raw connection types for backward compatibility
		const connectionType = CONFIG_KEY_TO_CONNECTION[key] ?? key;
		// Handle both array and single-object formats
		const subnodeConfigs = Array.isArray(subnodeConfigsRaw)
			? subnodeConfigsRaw
			: [subnodeConfigsRaw];

		for (let i = 0; i < subnodeConfigs.length; i++) {
			const subnodeRaw = subnodeConfigs[i] as Record<string, unknown>;
			if (!subnodeRaw || typeof subnodeRaw !== 'object' || !subnodeRaw.type) continue;
			const subnodeConfig: NodeConfig = {
				type: subnodeRaw.type as string,
				name: subnodeRaw.name as string | undefined,
				params: (subnodeRaw.params as Record<string, unknown>) ?? {},
				credentials: subnodeRaw.credentials as Record<string, unknown> | undefined,
				version: subnodeRaw.version as number | undefined,
			};

			const { node: subnodeNode } = createSemanticNode(subnodeConfig, state);

			// Position subnode below its parent node (AI subnodes render beneath)
			subnodeNode.json.position = [
				parentNode.json.position[0] + i * 200,
				parentNode.json.position[1] + 200,
			];

			// Register as AI subnode on parent
			parentNode.subnodes.push({
				connectionType: connectionType as AiConnectionType,
				subnodeName: subnodeNode.name,
				index: i,
			});
		}
	}
}

/**
 * Process a variable declaration with a node() call init.
 */
function processNodeVarDeclaration(
	declarator: VariableDeclarator,
	state: ParserState,
): string | undefined {
	if (!declarator.init || !isCallExpression(declarator.init)) return undefined;

	// Pattern A: const x = source.map((item) => executeNode({...}))
	const mapMatch = isMapCall(declarator.init);
	if (mapMatch) {
		const { callback } = mapMatch;
		let execConfig: ObjectExpression | undefined;
		const { body } = callback;
		if (body.type !== 'BlockStatement' && isCallExpression(body)) {
			const match = matchExecuteNodeCall(body);
			execConfig = match?.config;
		}
		if (execConfig) {
			const config = extractNodeConfig(execConfig);
			const { node: sNode, isNew } = createSemanticNode(config, state);
			if (isNew) processSubnodes(config, sNode.name, state);

			const mapping = state.varToNode.get(mapMatch.sourceVar);
			if (mapping) {
				addSemanticEdge(state, mapping.nodeName, sNode.name, mapping.outputIndex);
			}
			if (isIdentifier(declarator.id)) {
				state.varToNode.set(declarator.id.name, { nodeName: sNode.name, outputIndex: 0 });
			}
			state.lastNodeInScope = { nodeName: sNode.name, outputIndex: 0 };
			return isIdentifier(declarator.id) ? declarator.id.name : undefined;
		}
	}

	// Pattern A2: const x = source.filter((item) => condition) — creates Filter node
	// Also supports: const [kept, discarded] = source.filter((item) => condition)
	const filterMatch = isFilterCall(declarator.init);
	if (filterMatch) {
		const { callback } = filterMatch;
		const { body } = callback;

		// Extract condition from the arrow body (expression, not block)
		if (body.type !== 'BlockStatement') {
			const condition = extractConditionFromExpression(body);
			if (condition) {
				const filterParams = buildIfParameters(condition);
				const filterConfig: NodeConfig = {
					type: 'n8n-nodes-base.filter',
					params: filterParams,
					version: 2,
				};
				const { node: filterNode } = createSemanticNode(filterConfig, state);

				// Connect source → Filter node
				const mapping = state.varToNode.get(filterMatch.sourceVar);
				if (mapping) {
					addSemanticEdge(state, mapping.nodeName, filterNode.name, mapping.outputIndex);
				}

				// Handle LHS: Identifier (kept only) or ArrayPattern (kept + discarded)
				if (isIdentifier(declarator.id)) {
					state.varToNode.set(declarator.id.name, {
						nodeName: filterNode.name,
						outputIndex: 0,
					});
				} else if (declarator.id.type === 'ArrayPattern') {
					for (let i = 0; i < declarator.id.elements.length; i++) {
						const el = declarator.id.elements[i];
						if (el && isIdentifier(el)) {
							state.varToNode.set(el.name, {
								nodeName: filterNode.name,
								outputIndex: i,
							});
						}
					}
				}
				state.lastNodeInScope = { nodeName: filterNode.name, outputIndex: 0 };
				return isIdentifier(declarator.id) ? declarator.id.name : undefined;
			}
		}
	}

	// Pattern B: const x = executeNode({...}) or const [a, b] = executeNode({...})
	// Also supports array input syntax: executeNode({...}, [inputA, inputB])
	// Direct executeNode() calls (not inside .map()) are "execute once" nodes,
	// unless they're inside a branch (if/else/switch) where the branching node
	// controls item flow and executeOnce is not semantically meaningful.
	const execMatch = matchExecuteNodeCall(declarator.init);
	if (execMatch) {
		const config = extractNodeConfig(execMatch.config);
		const { node: sNode, isNew } = createSemanticNode(config, state);
		if (isNew && state.branchDepth === 0) {
			sNode.json.executeOnce = true;
		}
		if (isNew) processSubnodes(config, sNode.name, state);

		if (execMatch.inputsArray) {
			// Array input syntax: executeNode({...}, [inputA, inputB])
			// Each array element connects to a different input index of this node
			for (let i = 0; i < execMatch.inputsArray.elements.length; i++) {
				const el = execMatch.inputsArray.elements[i];
				if (el && el.type !== 'SpreadElement') {
					const sourceName = resolveInputVar(el, state);
					if (sourceName) {
						const sourceOutputIndex = resolveOutputIndex(el, state);
						addSemanticEdge(state, sourceName, sNode.name, sourceOutputIndex, i);
					}
				}
			}
		} else if (state.lastNodeInScope) {
			addSemanticEdge(
				state,
				state.lastNodeInScope.nodeName,
				sNode.name,
				state.lastNodeInScope.outputIndex,
			);
		}
		if (isIdentifier(declarator.id)) {
			state.varToNode.set(declarator.id.name, { nodeName: sNode.name, outputIndex: 0 });
		} else if (declarator.id.type === 'ArrayPattern') {
			// Destructuring: const [a, b, c] = executeNode({...})
			for (let i = 0; i < declarator.id.elements.length; i++) {
				const el = declarator.id.elements[i];
				if (el && isIdentifier(el)) {
					state.varToNode.set(el.name, { nodeName: sNode.name, outputIndex: i });
				}
			}
		}
		state.lastNodeInScope = { nodeName: sNode.name, outputIndex: 0 };
		return isIdentifier(declarator.id) ? declarator.id.name : undefined;
	}

	// Pattern C: const x = node({...})(input) or node({...})() — legacy format
	const match = matchNodeCall(declarator.init);
	if (!match) return undefined;

	const config = extractNodeConfig(match.configExpr);
	const { node: sNode } = createSemanticNode(config, state);

	// Process subnodes
	processSubnodes(config, sNode.name, state);

	// Determine input source
	if (match.inputArg) {
		const sourceNodeName = resolveInputVar(match.inputArg, state);
		const sourceOutputIndex = resolveOutputIndex(match.inputArg, state);
		if (sourceNodeName) {
			addSemanticEdge(state, sourceNodeName, sNode.name, sourceOutputIndex);
		}
	} else if (state.lastNodeInScope) {
		// node({...})() with no input — use implicit chaining
		addSemanticEdge(
			state,
			state.lastNodeInScope.nodeName,
			sNode.name,
			state.lastNodeInScope.outputIndex,
		);
	}
	state.lastNodeInScope = { nodeName: sNode.name, outputIndex: 0 };

	// Handle different LHS patterns
	const lhs = declarator.id;

	if (isIdentifier(lhs)) {
		// Simple: const foo = node({...})(input)
		state.varToNode.set(lhs.name, { nodeName: sNode.name, outputIndex: 0 });
		return lhs.name;
	}

	if (lhs.type === 'ArrayPattern') {
		// Destructuring: const [a, b] = node({...})(input)
		for (let i = 0; i < lhs.elements.length; i++) {
			const el = lhs.elements[i];
			if (el && isIdentifier(el)) {
				state.varToNode.set(el.name, { nodeName: sNode.name, outputIndex: i });
			}
		}
		return undefined;
	}

	return undefined;
}

/**
 * Get statements from a block (BlockStatement) or wrap a single statement.
 */
function getBlockStatements(node: Statement): Statement[] {
	if (node.type === 'BlockStatement') {
		return (node as BlockStatement).body;
	}
	return [node];
}

/**
 * Process an if/else statement and generate IF node + branches.
 */
function processIfStatement(
	stmt: IfStatement,
	state: ParserState,
	inputVarName: string | undefined,
): void {
	// Extract condition
	const condition = extractConditionFromExpression(stmt.test);

	// Create IF node
	const ifParams = condition ? buildIfParameters(condition) : {};
	const ifConfig: NodeConfig = {
		type: 'n8n-nodes-base.if',
		params: ifParams,
		version: 2,
	};
	const { node: ifNode } = createSemanticNode(ifConfig, state);

	// Connect input to IF node — prefer lastNodeInScope for implicit chaining
	// over inputVarName (which always points to the trigger param).
	if (state.lastNodeInScope) {
		addSemanticEdge(
			state,
			state.lastNodeInScope.nodeName,
			ifNode.name,
			state.lastNodeInScope.outputIndex,
		);
	} else if (inputVarName) {
		const sourceNodeName = resolveInputVar(
			{ type: 'Identifier', name: inputVarName } as Identifier,
			state,
		);
		if (sourceNodeName) {
			const sourceOutputIndex = resolveOutputIndex(
				{ type: 'Identifier', name: inputVarName } as Identifier,
				state,
			);
			addSemanticEdge(state, sourceNodeName, ifNode.name, sourceOutputIndex);
		}
	}

	// Remap inputVarName and lastNodeInScope so that branches resolve to the
	// IF node output instead of the upstream trigger.
	const originalMapping = inputVarName ? state.varToNode.get(inputVarName) : undefined;
	const originalLastNode = state.lastNodeInScope;

	// Process true branch (consequent) — remap to IF output 0
	if (inputVarName) {
		state.varToNode.set(inputVarName, { nodeName: ifNode.name, outputIndex: 0 });
	}
	state.lastNodeInScope = { nodeName: ifNode.name, outputIndex: 0 };
	state.branchDepth++;
	const trueStatements = getBlockStatements(stmt.consequent);
	processStatements(trueStatements, state, inputVarName);
	state.branchDepth--;

	// Process false branch (alternate) — remap to IF output 1
	if (stmt.alternate) {
		if (inputVarName) {
			state.varToNode.set(inputVarName, { nodeName: ifNode.name, outputIndex: 1 });
		}
		state.lastNodeInScope = { nodeName: ifNode.name, outputIndex: 1 };
		state.branchDepth++;
		const falseStatements = getBlockStatements(stmt.alternate);
		processStatements(falseStatements, state, inputVarName);
		state.branchDepth--;
	}

	// Restore original mapping so nodes after the if/else connect correctly
	if (inputVarName) {
		if (originalMapping) {
			state.varToNode.set(inputVarName, originalMapping);
		} else {
			state.varToNode.delete(inputVarName);
		}
	}
	state.lastNodeInScope = originalLastNode;
}

/**
 * Process a switch statement and generate Switch node + cases.
 */
function processSwitchStatement(
	stmt: SwitchStatement,
	state: ParserState,
	inputVarName: string | undefined,
): void {
	// Extract discriminant field path
	const fieldPath = memberExprToFieldPath(stmt.discriminant);

	// Extract case values
	const caseValues: unknown[] = [];
	const caseStatements: SwitchCase[] = [];
	let defaultCase: SwitchCase | undefined;

	for (const sc of stmt.cases) {
		if (sc.test == null) {
			defaultCase = sc;
		} else {
			caseValues.push(extractLiteralValue(sc.test));
			caseStatements.push(sc);
		}
	}

	// Create Switch node
	const switchParams = fieldPath
		? buildSwitchParameters(fieldPath, caseValues)
		: { rules: { values: [] } };
	const switchConfig: NodeConfig = {
		type: 'n8n-nodes-base.switch',
		params: switchParams,
		version: 3,
	};
	const { node: switchNode } = createSemanticNode(switchConfig, state);

	// Connect input to Switch node — prefer lastNodeInScope for implicit chaining
	if (state.lastNodeInScope) {
		addSemanticEdge(
			state,
			state.lastNodeInScope.nodeName,
			switchNode.name,
			state.lastNodeInScope.outputIndex,
		);
	} else if (inputVarName) {
		const sourceNodeName = resolveInputVar(
			{ type: 'Identifier', name: inputVarName } as Identifier,
			state,
		);
		if (sourceNodeName) {
			const sourceOutputIndex = resolveOutputIndex(
				{ type: 'Identifier', name: inputVarName } as Identifier,
				state,
			);
			addSemanticEdge(state, sourceNodeName, switchNode.name, sourceOutputIndex);
		}
	}

	// Remap inputVarName and lastNodeInScope so that cases resolve to the
	// Switch node output instead of the upstream trigger.
	const originalMapping = inputVarName ? state.varToNode.get(inputVarName) : undefined;
	const originalLastNode = state.lastNodeInScope;

	// Process each case — remap to Switch output i
	for (let i = 0; i < caseStatements.length; i++) {
		const sc = caseStatements[i];
		if (inputVarName) {
			state.varToNode.set(inputVarName, { nodeName: switchNode.name, outputIndex: i });
		}
		state.lastNodeInScope = { nodeName: switchNode.name, outputIndex: i };
		state.branchDepth++;
		processStatements(sc.consequent, state, inputVarName);
		state.branchDepth--;
	}

	// Process default case — remap to Switch output after all cases
	if (defaultCase) {
		if (inputVarName) {
			state.varToNode.set(inputVarName, {
				nodeName: switchNode.name,
				outputIndex: caseStatements.length,
			});
		}
		state.lastNodeInScope = { nodeName: switchNode.name, outputIndex: caseStatements.length };
		state.branchDepth++;
		processStatements(defaultCase.consequent, state, inputVarName);
		state.branchDepth--;
	}

	// Restore original mapping
	if (inputVarName) {
		if (originalMapping) {
			state.varToNode.set(inputVarName, originalMapping);
		} else {
			state.varToNode.delete(inputVarName);
		}
	}
	state.lastNodeInScope = originalLastNode;
}

/**
 * Build a sub-workflow JSON from extracted try-block nodes and their connections.
 */
function buildSubWorkflowJSON(tryNodes: NodeJSON[], subConnections: IConnections): WorkflowJSON {
	const triggerNode: NodeJSON = {
		id: 'sub-trigger',
		name: 'Execute Workflow Trigger',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		typeVersion: 1.1,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	const subNodes = [triggerNode, ...tryNodes];
	// Re-index positions
	for (let i = 0; i < subNodes.length; i++) {
		subNodes[i].position = [i * 200, 0];
	}

	// Add connection from trigger to first try node
	const firstTryNodeName = tryNodes[0].name!;
	const allSubConnections: IConnections = {
		'Execute Workflow Trigger': {
			main: [[{ node: firstTryNodeName, type: 'main', index: 0 }]],
		},
		...subConnections,
	};

	return {
		name: 'Sub-workflow',
		nodes: subNodes,
		connections: allSubConnections,
	};
}

/**
 * Find and remove the predecessor edge from a non-try node to the first try-block node.
 */
function findAndRemovePredecessorEdge(
	state: ParserState,
	tryNodeNames: Set<string>,
): { fromNode: string; outputIndex: number } | undefined {
	const firstTryNodeName = [...tryNodeNames][0];
	let predecessor: { fromNode: string; outputIndex: number } | undefined;

	for (const [nodeName, node] of state.graphNodes) {
		if (tryNodeNames.has(nodeName)) continue;
		for (const [outputSlot, targets] of node.outputs) {
			const targetIdx = targets.findIndex((t) => t.target === firstTryNodeName);
			if (targetIdx >= 0) {
				const outputIndex = getOutputIndex(node.type, outputSlot, node.json);
				predecessor = { fromNode: nodeName, outputIndex };
				targets.splice(targetIdx, 1);
				if (targets.length === 0) {
					node.outputs.delete(outputSlot);
				}
				break;
			}
		}
		if (predecessor) break;
	}

	return predecessor;
}

/**
 * Process a try/catch statement for error handling.
 */
function processTryStatement(
	stmt: TryStatement,
	state: ParserState,
	inputVarName: string | undefined,
): void {
	// Track which nodes exist before processing try block
	const nodeCountBefore = state.nodeInsertionOrder.length;

	// Process try block
	processStatements(stmt.block.body, state, inputVarName);

	const tryBlockNodeCount = state.nodeInsertionOrder.length - nodeCountBefore;

	if (tryBlockNodeCount >= 2) {
		// Multi-node try block: wrap in executeWorkflow sub-workflow
		processTryMultiNode(stmt, state, inputVarName, nodeCountBefore);
	} else {
		// Single-node try block: keep existing behavior
		processTrySingleNode(stmt, state, inputVarName, nodeCountBefore);
	}
}

/**
 * Handle single-node try/catch — existing behavior (set onError on the node).
 */
function processTrySingleNode(
	stmt: TryStatement,
	state: ParserState,
	inputVarName: string | undefined,
	nodeCountBefore: number,
): void {
	// Mark nodes added in try block with onError: continueErrorOutput
	for (let i = nodeCountBefore; i < state.nodeInsertionOrder.length; i++) {
		const node = state.graphNodes.get(state.nodeInsertionOrder[i]);
		if (node) node.json.onError = 'continueErrorOutput';
	}

	// Process catch block
	if (stmt.handler && stmt.handler.body) {
		const errorNodeCountBefore = state.nodeInsertionOrder.length;

		const originalMapping = inputVarName ? state.varToNode.get(inputVarName) : undefined;
		const originalLastNode = state.lastNodeInScope;
		if (inputVarName && nodeCountBefore < errorNodeCountBefore) {
			const lastTryNodeName = state.nodeInsertionOrder[errorNodeCountBefore - 1];
			state.varToNode.set(inputVarName, { nodeName: lastTryNodeName, outputIndex: 1 });
			state.lastNodeInScope = { nodeName: lastTryNodeName, outputIndex: 1 };
		}

		state.branchDepth++;
		processStatements(stmt.handler.body.body, state, inputVarName);
		state.branchDepth--;

		if (inputVarName) {
			if (originalMapping) {
				state.varToNode.set(inputVarName, originalMapping);
			} else {
				state.varToNode.delete(inputVarName);
			}
		}

		if (nodeCountBefore < errorNodeCountBefore) {
			const lastTryNodeName = state.nodeInsertionOrder[errorNodeCountBefore - 1];
			state.lastNodeInScope = { nodeName: lastTryNodeName, outputIndex: 0 };
		} else {
			state.lastNodeInScope = originalLastNode;
		}
	}
}

/**
 * Handle multi-node try/catch — wrap try-block nodes in an executeWorkflow sub-workflow.
 */
function processTryMultiNode(
	stmt: TryStatement,
	state: ParserState,
	inputVarName: string | undefined,
	nodeCountBefore: number,
): void {
	// Extract try-block node names from insertion order and adjust counter
	const tryNodeNames = state.nodeInsertionOrder.splice(nodeCountBefore);
	state.nodeCounter -= tryNodeNames.length;
	const tryNodeNameSet = new Set(tryNodeNames);

	// Extract SemanticNodes from graph
	const extractedNodes: SemanticNode[] = [];
	for (const name of tryNodeNames) {
		const node = state.graphNodes.get(name);
		if (node) {
			extractedNodes.push(node);
			state.graphNodes.delete(name);
		}
	}

	// Remove onError and executeOnce from sub-workflow nodes
	for (const n of extractedNodes) {
		delete n.json.onError;
		delete n.json.executeOnce;
	}

	// Find and remove predecessor edge
	const predecessor = findAndRemovePredecessorEdge(state, tryNodeNameSet);

	// Build sub-workflow using semantic graph → JSON conversion
	const subGraph: SemanticGraph = {
		nodes: new Map(extractedNodes.map((n) => [n.name, n])),
		roots: [tryNodeNames[0]],
		cycleEdges: new Map(),
	};
	const subJSON = semanticGraphToWorkflowJSON(subGraph, 'Sub-workflow');
	const subWorkflowJSON = buildSubWorkflowJSON(subJSON.nodes, subJSON.connections);

	// Create the executeWorkflow wrapper node
	const execWfConfig: NodeConfig = {
		type: 'n8n-nodes-base.executeWorkflow',
		name: 'Execute Workflow',
		params: {
			source: 'parameter',
			workflowJson: JSON.stringify(subWorkflowJSON),
			options: {},
		},
		version: 1.3,
	};
	const { node: execWfNode } = createSemanticNode(execWfConfig, state);
	if (state.branchDepth === 0) {
		execWfNode.json.executeOnce = true;
	}
	execWfNode.json.onError = 'continueErrorOutput';

	// Reconnect predecessor → executeWorkflow
	if (predecessor) {
		addSemanticEdge(state, predecessor.fromNode, execWfNode.name, predecessor.outputIndex);
	}

	// Remap any varToNode entries that pointed to try-block nodes
	for (const [varName, mapping] of state.varToNode.entries()) {
		if (tryNodeNameSet.has(mapping.nodeName)) {
			state.varToNode.set(varName, { nodeName: execWfNode.name, outputIndex: 0 });
		}
	}

	// Process catch block
	if (stmt.handler && stmt.handler.body) {
		const originalMapping = inputVarName ? state.varToNode.get(inputVarName) : undefined;

		// Catch block connects from executeWorkflow's error output (index 1)
		if (inputVarName) {
			state.varToNode.set(inputVarName, { nodeName: execWfNode.name, outputIndex: 1 });
		}
		state.lastNodeInScope = { nodeName: execWfNode.name, outputIndex: 1 };

		state.branchDepth++;
		processStatements(stmt.handler.body.body, state, inputVarName);
		state.branchDepth--;

		// Restore inputVarName mapping
		if (inputVarName) {
			if (originalMapping) {
				state.varToNode.set(inputVarName, originalMapping);
			} else {
				state.varToNode.delete(inputVarName);
			}
		}

		// After try/catch, lastNodeInScope → executeWorkflow success output (index 0)
		state.lastNodeInScope = { nodeName: execWfNode.name, outputIndex: 0 };
	}
}

/**
 * Process a batch() call → SplitInBatches node with loop-back connection.
 *
 * Patterns:
 *   `batch(source, (item) => { ... })`
 *   `batch(source, { params: { batchSize: 10 }, version: 3, name: 'My Batch' }, (item) => { ... })`
 *
 * - Creates a SplitInBatches node connected from source
 * - Loop body nodes connect from SplitInBatches output 1 (loop)
 * - Last loop body node connects back to SplitInBatches (loop-back)
 * - After the call, lastNodeInScope = SplitInBatches output 0 (done)
 */
function processBatchCall(
	call: CallExpression,
	state: ParserState,
	inputVarName: string | undefined,
): void {
	const args = call.arguments;
	if (args.length < 2) return;

	// First arg is the source variable
	const sourceArg = args[0];
	let sourceNodeName: string | undefined;
	let sourceOutputIndex = 0;
	if (sourceArg.type !== 'SpreadElement' && isIdentifier(sourceArg)) {
		const mapping = state.varToNode.get(sourceArg.name);
		if (mapping) {
			sourceNodeName = mapping.nodeName;
			sourceOutputIndex = mapping.outputIndex;
		}
	}

	// Determine if second arg is config (ObjectExpression) or callback (ArrowFunction)
	let configObj: Record<string, unknown> | undefined;
	let callbackArg: ArrowFunctionExpression | FunctionExpression | undefined;

	const secondArg = args[1];
	if (secondArg.type !== 'SpreadElement' && isObjectExpression(secondArg)) {
		// batch(source, { config }, (item) => { ... })
		configObj = extractObjectLiteral(secondArg);
		if (args.length >= 3) {
			const thirdArg = args[2];
			if (thirdArg.type !== 'SpreadElement' && isArrowOrFunction(thirdArg)) {
				callbackArg = thirdArg;
			}
		}
	} else if (secondArg.type !== 'SpreadElement' && isArrowOrFunction(secondArg)) {
		// batch(source, (item) => { ... })
		callbackArg = secondArg;
	}

	// Build SplitInBatches config from parsed config object or defaults
	const params = (configObj?.params as Record<string, unknown>) ?? { batchSize: 1 };
	const version = (configObj?.version as number) ?? 3;
	const name = configObj?.name as string | undefined;

	const sibConfig: NodeConfig = {
		type: 'n8n-nodes-base.splitInBatches',
		params,
		version,
		...(name ? { name } : {}),
	};
	const { node: sibNode } = createSemanticNode(sibConfig, state);

	// Connect source → SplitInBatches
	if (sourceNodeName) {
		addSemanticEdge(state, sourceNodeName, sibNode.name, sourceOutputIndex);
	} else if (state.lastNodeInScope) {
		addSemanticEdge(
			state,
			state.lastNodeInScope.nodeName,
			sibNode.name,
			state.lastNodeInScope.outputIndex,
		);
	}

	// Process loop body: nodes connect from SplitInBatches output 1 (loop)
	state.lastNodeInScope = { nodeName: sibNode.name, outputIndex: 1 };

	const nodesBeforeBody = state.nodeInsertionOrder.length;
	if (callbackArg) {
		const body = callbackArg.body;
		const bodyStatements = body.type === 'BlockStatement' ? (body as BlockStatement).body : [];
		processStatements(bodyStatements, state, inputVarName);
	}

	// Connect lastNodeInScope (success path) back to SplitInBatches
	if (state.lastNodeInScope && state.lastNodeInScope.nodeName !== sibNode.name) {
		addSemanticEdge(
			state,
			state.lastNodeInScope.nodeName,
			sibNode.name,
			state.lastNodeInScope.outputIndex,
		);
	}

	// Also connect any terminal loop body nodes (e.g., error handler paths
	// inside try/catch) that have no outgoing main connections.
	for (let i = nodesBeforeBody; i < state.nodeInsertionOrder.length; i++) {
		const bodyNodeName = state.nodeInsertionOrder[i];
		const bodyNode = state.graphNodes.get(bodyNodeName);
		if (!bodyNode) continue;
		const hasOutgoing = [...bodyNode.outputs.values()].some((targets) => targets.length > 0);
		if (!hasOutgoing) {
			addSemanticEdge(state, bodyNodeName, sibNode.name, 0);
		}
	}

	// After batch: lastNodeInScope = SplitInBatches output 0 (done)
	state.lastNodeInScope = { nodeName: sibNode.name, outputIndex: 0 };
}

/**
 * Process a waitOnWebhook() or waitOnForm() call.
 *
 * Patterns:
 *   `waitOnWebhook((resumeUrl) => { ...setup nodes... })`
 *   `waitOnWebhook(() => { ...setup nodes... })`
 *   `waitOnForm({ formTitle: '...' }, (resumeUrl) => { ...setup nodes... })`
 *
 * - Setup nodes inside the callback execute BEFORE the wait
 * - The `resumeUrl` identifier is replaced with `={{ $execution.resumeUrl }}` (webhook)
 *   or `={{ $execution.resumeFormUrl }}` (form) in node params
 * - Creates a Wait node connected after the last setup node
 * - After the call, lastNodeInScope = Wait output 0 (for continuation)
 */
function processWaitCall(
	call: CallExpression,
	state: ParserState,
	inputVarName: string | undefined,
	mode: 'webhook' | 'form',
): void {
	const args = call.arguments;
	if (args.length < 1) return;

	let configObj: Record<string, unknown> | undefined;
	let callbackArg: ArrowFunctionExpression | FunctionExpression | undefined;

	if (mode === 'form') {
		// waitOnForm(config, (resumeUrl) => { ... })
		if (args.length >= 2) {
			const firstArg = args[0];
			if (firstArg.type !== 'SpreadElement' && isObjectExpression(firstArg)) {
				configObj = extractObjectLiteral(firstArg);
			}
			const secondArg = args[1];
			if (secondArg.type !== 'SpreadElement' && isArrowOrFunction(secondArg)) {
				callbackArg = secondArg;
			}
		} else if (args.length === 1) {
			// waitOnForm((resumeUrl) => { ... }) — no config
			const firstArg = args[0];
			if (firstArg.type !== 'SpreadElement' && isArrowOrFunction(firstArg)) {
				callbackArg = firstArg;
			}
		}
	} else {
		// waitOnWebhook((resumeUrl) => { ... })
		const firstArg = args[0];
		if (firstArg.type !== 'SpreadElement' && isArrowOrFunction(firstArg)) {
			callbackArg = firstArg;
		}
	}

	// Extract callback parameter name (for resumeUrl replacement)
	let resumeUrlParamName: string | undefined;
	if (callbackArg && callbackArg.params.length > 0) {
		const param = callbackArg.params[0];
		if (isIdentifier(param)) {
			resumeUrlParamName = param.name;
		}
	}

	// Process callback body (setup nodes) with resumeUrl replacement enabled
	if (callbackArg) {
		const body = callbackArg.body;
		const bodyStatements = body.type === 'BlockStatement' ? (body as BlockStatement).body : [];

		// Enable resumeUrl → expression replacement
		const prevParam = _resumeUrlParam;
		const prevMode = _resumeUrlMode;
		_resumeUrlParam = resumeUrlParamName;
		_resumeUrlMode = mode;

		processStatements(bodyStatements, state, inputVarName);

		_resumeUrlParam = prevParam;
		_resumeUrlMode = prevMode;
	}

	// Create Wait node with appropriate params
	const waitParams: Record<string, unknown> = { resume: mode };
	if (mode === 'form' && configObj) {
		Object.assign(waitParams, configObj);
	}

	const waitConfig: NodeConfig = {
		type: 'n8n-nodes-base.wait',
		params: waitParams,
		version: 1.1,
	};
	const { node: waitNode } = createSemanticNode(waitConfig, state);

	// Connect last setup node → Wait
	if (state.lastNodeInScope) {
		addSemanticEdge(
			state,
			state.lastNodeInScope.nodeName,
			waitNode.name,
			state.lastNodeInScope.outputIndex,
		);
	}

	// After wait: continuation connects from Wait output 0
	state.lastNodeInScope = { nodeName: waitNode.name, outputIndex: 0 };
}

/**
 * Process a list of statements in a callback body.
 */
function processStatements(
	statements: Statement[],
	state: ParserState,
	inputVarName: string | undefined,
): void {
	for (const stmt of statements) {
		processStatement(stmt, state, inputVarName);
	}
}

/**
 * Process a single statement.
 */
function processStatement(
	stmt: Statement,
	state: ParserState,
	inputVarName: string | undefined,
): void {
	switch (stmt.type) {
		case 'VariableDeclaration': {
			const varDecl = stmt as VariableDeclaration;
			for (const declarator of varDecl.declarations) {
				processNodeVarDeclaration(declarator, state);
			}
			break;
		}

		case 'ExpressionStatement': {
			const exprStmt = stmt as ExpressionStatement;
			if (isCallExpression(exprStmt.expression)) {
				// Check for batch() / waitOnWebhook() / waitOnForm() calls
				const callExpr = exprStmt.expression as CallExpression;
				if (isIdentifier(callExpr.callee)) {
					if (callExpr.callee.name === 'batch') {
						processBatchCall(callExpr, state, inputVarName);
						break;
					}
					if (callExpr.callee.name === 'waitOnWebhook') {
						processWaitCall(callExpr, state, inputVarName, 'webhook');
						break;
					}
					if (callExpr.callee.name === 'waitOnForm') {
						processWaitCall(callExpr, state, inputVarName, 'form');
						break;
					}
				}

				// Check for .map() call without assignment (expression body only)
				const mapMatch = isMapCall(exprStmt.expression);
				if (mapMatch) {
					const { callback } = mapMatch;
					const { body } = callback;
					if (body.type !== 'BlockStatement' && isCallExpression(body)) {
						const execMatch = matchExecuteNodeCall(body);
						if (execMatch) {
							const config = extractNodeConfig(execMatch.config);
							const { node: sNode, isNew } = createSemanticNode(config, state);
							if (isNew) processSubnodes(config, sNode.name, state);

							const mapping = state.varToNode.get(mapMatch.sourceVar);
							if (mapping) {
								addSemanticEdge(state, mapping.nodeName, sNode.name, mapping.outputIndex);
							}
							state.lastNodeInScope = { nodeName: sNode.name, outputIndex: 0 };
						}
					}
					break;
				}

				// Check for standalone node() call without assignment
				const match = matchNodeCall(exprStmt.expression);
				if (match) {
					const config = extractNodeConfig(match.configExpr);
					const { node: sNode } = createSemanticNode(config, state);

					processSubnodes(config, sNode.name, state);

					if (match.inputArg) {
						const sourceNodeName = resolveInputVar(match.inputArg, state);
						const sourceOutputIndex = resolveOutputIndex(match.inputArg, state);
						if (sourceNodeName) {
							addSemanticEdge(state, sourceNodeName, sNode.name, sourceOutputIndex);
						}
					} else if (state.lastNodeInScope) {
						addSemanticEdge(
							state,
							state.lastNodeInScope.nodeName,
							sNode.name,
							state.lastNodeInScope.outputIndex,
						);
					}
					state.lastNodeInScope = { nodeName: sNode.name, outputIndex: 0 };
				}
			}
			break;
		}

		case 'IfStatement': {
			processIfStatement(stmt as IfStatement, state, inputVarName);
			break;
		}

		case 'SwitchStatement': {
			processSwitchStatement(stmt as SwitchStatement, state, inputVarName);
			break;
		}

		case 'TryStatement': {
			processTryStatement(stmt as TryStatement, state, inputVarName);
			break;
		}

		case 'ForOfStatement':
		case 'ForInStatement':
		case 'ForStatement':
		case 'WhileStatement':
		case 'DoWhileStatement':
			throw new Error(
				'Imperative loops are not supported. Use .map() for per-item processing, or batch() for large datasets that need batching.',
			);

		case 'BreakStatement':
			// Skip break statements in switch cases
			break;

		case 'BlockStatement': {
			// Process nested block
			processStatements((stmt as BlockStatement).body, state, inputVarName);
			break;
		}

		default:
			// Skip unrecognized statements
			break;
	}
}

// ---------------------------------------------------------------------------
// onTrigger processing
// ---------------------------------------------------------------------------

/**
 * Process an onTrigger() call expression.
 */
function processOnTriggerCall(callExpr: CallExpression, state: ParserState): void {
	if (callExpr.arguments.length < 1) return;

	const configArg = callExpr.arguments[0];
	if (configArg.type === 'SpreadElement' || !isObjectExpression(configArg)) return;

	const config = extractNodeConfig(configArg);
	const { node: triggerNode } = createSemanticNode(config, state);

	// If there's a callback function, process its body
	if (callExpr.arguments.length >= 2) {
		const callbackArg = callExpr.arguments[1];
		if (callbackArg.type === 'SpreadElement') return;

		if (isArrowOrFunction(callbackArg)) {
			const fn = callbackArg;

			// Get the callback parameter name (usually 'items')
			let paramName: string | undefined;
			if (fn.params.length > 0 && isIdentifier(fn.params[0])) {
				paramName = fn.params[0].name;
				state.varToNode.set(paramName, {
					nodeName: triggerNode.name,
					outputIndex: 0,
				});
			}
			state.lastNodeInScope = { nodeName: triggerNode.name, outputIndex: 0 };

			// Get the body statements
			let bodyStatements: Statement[];
			if (fn.body.type === 'BlockStatement') {
				bodyStatements = (fn.body as BlockStatement).body;
			} else {
				// Arrow with expression body
				bodyStatements = [];
			}

			processStatements(bodyStatements, state, paramName);
		}
	}
}

// ---------------------------------------------------------------------------
// Top-level workflow() call processing
// ---------------------------------------------------------------------------

/**
 * Find and process the workflow() call at the top level.
 */
function findWorkflowCall(program: Program): {
	name: string;
	bodyFn: ArrowFunctionExpression | FunctionExpression;
} {
	for (const stmt of program.body) {
		if (stmt.type !== 'ExpressionStatement') continue;
		const exprStmt = stmt as ExpressionStatement;

		if (!isCallExpression(exprStmt.expression)) continue;
		const call = exprStmt.expression;

		if (!isIdentifier(call.callee) || call.callee.name !== 'workflow') {
			continue;
		}

		// Extract name from first argument
		if (call.arguments.length < 2) {
			throw new Error('workflow() call must have at least 2 arguments');
		}

		const configArg = call.arguments[0];
		if (configArg.type === 'SpreadElement' || !isObjectExpression(configArg)) {
			throw new Error('First argument to workflow() must be an object');
		}

		const config = extractObjectLiteral(configArg);
		const name = config.name as string;
		if (!name) {
			throw new Error('workflow() config must include a name');
		}

		const bodyArg = call.arguments[1];
		if (bodyArg.type === 'SpreadElement') {
			throw new Error('Second argument to workflow() must be a function');
		}
		if (!isArrowOrFunction(bodyArg)) {
			throw new Error('Second argument to workflow() must be a function');
		}

		return {
			name,
			bodyFn: bodyArg,
		};
	}

	throw new Error('No workflow() call found in code');
}

/**
 * Process the workflow body function's statements.
 */
function processWorkflowBody(
	fn: ArrowFunctionExpression | FunctionExpression,
	state: ParserState,
): void {
	let bodyStatements: Statement[];
	if (fn.body.type === 'BlockStatement') {
		bodyStatements = (fn.body as BlockStatement).body;
	} else {
		bodyStatements = [];
	}

	for (const stmt of bodyStatements) {
		if (stmt.type === 'ExpressionStatement') {
			const exprStmt = stmt as ExpressionStatement;
			if (isCallExpression(exprStmt.expression)) {
				const call = exprStmt.expression;
				if (isIdentifier(call.callee) && call.callee.name === 'onTrigger') {
					processOnTriggerCall(call, state);
					continue;
				}
			}
		}
		// Process any other top-level statements
		processStatement(stmt, state, undefined);
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse data-flow code and build the internal parser state as a SemanticGraph.
 */
function parseToGraph(code: string): { graph: SemanticGraph; name: string } {
	const program = parseSDKCode(code);

	const { name, bodyFn } = findWorkflowCall(program);

	const state: ParserState = {
		graphNodes: new Map(),
		nodeInsertionOrder: [],
		varToNode: new Map(),
		workflowName: name,
		nodeCounter: 0,
		usedNames: new Set<string>(),
		nodesByName: new Map(),
		insideMap: false,
		branchDepth: 0,
		lastNodeInScope: undefined,
	};

	processWorkflowBody(bodyFn, state);

	// Identify roots: triggers + nodes with no inputSources (excluding subnodes)
	const subnodeNames = new Set<string>();
	for (const [, node] of state.graphNodes) {
		for (const sub of node.subnodes) {
			subnodeNames.add(sub.subnodeName);
		}
	}
	const roots: string[] = [];
	for (const [nodeName, node] of state.graphNodes) {
		if (subnodeNames.has(nodeName)) continue;
		if (node.annotations.isTrigger || node.inputSources.size === 0) {
			roots.push(nodeName);
		}
	}

	return {
		graph: { nodes: state.graphNodes, roots, cycleEdges: new Map() },
		name: state.workflowName,
	};
}

/**
 * Parse data-flow code to a SemanticGraph.
 * This is the canonical intermediate representation shared with the generation pipeline.
 */
export function parseDataFlowCodeToGraph(code: string): SemanticGraph {
	return parseToGraph(code).graph;
}

/**
 * Parse data-flow code to WorkflowJSON.
 * Builds SemanticGraph directly then converts to JSON.
 */
export function parseDataFlowCode(code: string): WorkflowJSON {
	const { graph, name } = parseToGraph(code);
	const result = semanticGraphToWorkflowJSON(graph, name);

	// Collect pinData from node.json.output fields
	const pinData: Record<string, IDataObject[]> = {};
	for (const [, node] of graph.nodes) {
		if (node.json.output && node.json.output.length > 0) {
			pinData[node.name] = node.json.output;
		}
	}
	if (Object.keys(pinData).length > 0) {
		result.pinData = pinData;
	}

	return result;
}
