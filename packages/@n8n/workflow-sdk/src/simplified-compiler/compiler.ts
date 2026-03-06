/**
 * Workflow JS Transpiler
 *
 * Transpiles simplified JS with `onManual()`, `http.*`, `ai.*` callbacks
 * into n8n Workflow-SDK TypeScript code. The caller evaluates the SDK code
 * to get validated WorkflowJSON.
 *
 * Architecture:
 *   Simplified JS → Acorn parse → AST → transpile (pattern → string) → SDK TypeScript code
 */

import * as acorn from 'acorn';
import { classNameToEntry, getKnownIoMethods } from '../shared/ai-node-mapping';
import type { AiNodeEntry } from '../shared/ai-node-mapping';
import { AUTH_TYPE_TO_CREDENTIAL } from '../shared/credential-mapping';
import { toScheduleRule } from '../shared/schedule-mapping';
import { CALLBACK_TO_TRIGGER, TRIGGER_TYPES } from '../shared/trigger-mapping';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TranspilerResult {
	code: string;
	errors: CompilerError[];
}

export interface CompilerError {
	line?: number;
	column?: number;
	message: string;
	category: 'syntax' | 'structure' | 'validation';
}

// ─── AST Helpers ─────────────────────────────────────────────────────────────

type AcornNode = acorn.Node & {
	type: string;
	body?: AcornNode[];
	declarations?: AcornNode[];
	expression?: AcornNode;
	argument?: AcornNode;
	callee?: AcornNode;
	object?: AcornNode;
	property?: AcornNode & { name?: string };
	arguments?: AcornNode[];
	init?: AcornNode;
	id?: AcornNode & { name?: string };
	name?: string;
	value?: unknown;
	elements?: AcornNode[];
	properties?: AcornNode[];
	key?: AcornNode & { name?: string; value?: string };
	quasis?: AcornNode[];
	expressions?: AcornNode[];
	raw?: string;
	params?: AcornNode[];
	left?: AcornNode;
	right?: AcornNode;
	operator?: string;
	consequent?: AcornNode | AcornNode[];
	alternate?: AcornNode;
	test?: AcornNode;
	cases?: AcornNode[];
	block?: AcornNode;
	handler?: AcornNode;
	param?: AcornNode;
	computed?: boolean;
	discriminant?: AcornNode;
	leadingComments?: Array<{ type: string; value: string }>;
};

// ─── Callback Info ───────────────────────────────────────────────────────────

interface CallbackInfo {
	triggerType: 'manual' | 'webhook' | 'schedule' | 'error';
	triggerOptions: Record<string, unknown>;
	callbackBody: AcornNode[];
	callbackParams: string[];
	pinData?: unknown[];
}

// ─── IO Call ─────────────────────────────────────────────────────────────────

/** Parsed subnode from `new ClassName({...})` expression */
interface AiSubnodeInfo {
	className: string;
	entry: AiNodeEntry;
	config: Record<string, unknown>;
}

interface IOCall {
	type: 'http' | 'ai' | 'workflow' | 'respond';
	method: string;
	assignedVar: string | null;
	url?: string;
	body?: Record<string, unknown> | null;
	bodyExpression?: string;
	options?: Record<string, unknown>;
	model?: string;
	prompt?: string;
	nodeName: string;
	// AI class-based: root node info
	aiRootEntry?: AiNodeEntry;
	aiRootClassName?: string;
	aiRootConfig?: Record<string, unknown>;
	// AI class-based: parsed subnodes (model, tools, outputParser, memory)
	aiModel?: AiSubnodeInfo;
	aiToolSubnodes?: AiSubnodeInfo[];
	aiOutputParserSubnode?: AiSubnodeInfo;
	aiMemorySubnode?: AiSubnodeInfo;
	// respond-specific
	respondArgs?: Record<string, unknown>;
	// workflow.run-specific
	workflowName?: string;
	// Credentials
	credentials?: { type: string; credential: string };
	// Error handling
	onError?: string;
	// Pin data (mock output)
	pinData?: unknown[];
}

// ─── Emitted Node ────────────────────────────────────────────────────────────

interface EmittedNode {
	varName: string;
	sdkCode: string;
	kind:
		| 'trigger'
		| 'http'
		| 'code'
		| 'set'
		| 'ai'
		| 'respond'
		| 'workflow'
		| 'ifElse'
		| 'switchCase';
	nodeName: string;
	branchOnly?: boolean;
}

// ─── Function Definitions ────────────────────────────────────────────────────

interface FunctionDef {
	name: string;
	params: string[];
	body: AcornNode[];
	hasReturn: boolean;
	node: AcornNode;
}

interface CompiledFunction {
	/** SDK code lines for the sub-workflow nodes */
	nodeDeclarations: string[];
	/** SDK code for the workflow builder variable */
	builderDeclaration: string;
	/** Variable name for the workflow builder (e.g. processOrderWorkflow) */
	builderVarName: string;
	/** Trigger node name in the sub-workflow */
	triggerNodeName: string;
	/** Error connections within this sub-workflow (e.g. exec1.onError(http1)) */
	errorConnections: Array<{ sourceVar: string; catchChainStartVar: string }>;
}

// ─── Transpiler Context ──────────────────────────────────────────────────────

interface TranspilerContext {
	source: string;
	nodes: EmittedNode[];
	varSourceMap: Map<string, string>;
	varSourceKind: Map<string, 'io' | 'code'>;
	httpCounter: number;
	codeCounter: number;
	ifCounter: number;
	switchCounter: number;
	sibCounter: number;
	respondCounter: number;
	wfCounter: number;
	setCounter: number;
	pendingStatements: Array<{ source: string; ast: AcornNode }>;
	prevVar: string;
	triggerType: CallbackInfo['triggerType'];
	callbackParams: string[];
	errors: CompilerError[];
	hasOnErrorAnnotation: boolean;
	consumedComments: Set<number>; // tracks consumed comment start positions
	inLoopBody: boolean;
	loopCounter: number;
	functionDefs: Map<string, FunctionDef>;
	compiledFunctions: Map<string, CompiledFunction>;
	compiledLoopBodies: CompiledFunction[];
	compiledTryCatchBodies: CompiledFunction[];
	execCounter: number;
	tryCatchCounter: number;
	errorConnections: Array<{ sourceVar: string; catchChainStartVar: string }>;
	pendingPinData?: unknown[];
}

// ─── Expression Resolution ──────────────────────────────────────────────────

/**
 * Replace `$json.varName` / `$json.varName.prop` expressions in a string
 * with explicit `$('NodeName').first().json` references using the compiler's
 * variable-source tracking.
 */
function resolveJsonRefs(str: string, ctx: TranspilerContext): string {
	return str.replace(
		/\$json\.(\w+)((?:\.\w+|\[\w+\])*)/g,
		(match: string, root: string, rest: string) => {
			const sourceNode = ctx.varSourceMap.get(root);
			if (!sourceNode) return match;
			const kind = ctx.varSourceKind.get(root) ?? 'code';
			if (kind === 'io') {
				// IO node output: variable IS the json, strip root
				return `$('${sourceNode}').first().json${rest}`;
			}
			// Code node output: variable is inside json, keep root
			return `$('${sourceNode}').first().json.${root}${rest}`;
		},
	);
}

// ─── Main Transpiler ─────────────────────────────────────────────────────────

export function transpileWorkflowJS(source: string): TranspilerResult {
	const errors: CompilerError[] = [];

	// Step 1: Parse with acorn — enable comment collection
	let ast: AcornNode;
	const comments: Array<{ type: string; value: string; start: number; end: number }> = [];
	try {
		ast = acorn.parse(source, {
			ecmaVersion: 'latest',
			sourceType: 'module',
			locations: true,
			onComment: comments as unknown as acorn.Comment[],
		}) as AcornNode;
	} catch (e) {
		const err = e as { message: string; loc?: { line: number; column: number } };
		errors.push({
			message: err.message,
			line: err.loc?.line,
			column: err.loc?.column,
			category: 'syntax',
		});
		return { code: '', errors };
	}

	// Step 2: Check for legacy trigger.X() syntax
	const legacyTrigger = findLegacyTrigger(ast);
	if (legacyTrigger) {
		errors.push({
			message: `Legacy trigger.${legacyTrigger}() syntax is not supported. Use onManual(async () => {...}) instead.`,
			category: 'structure',
		});
		return { code: '', errors };
	}

	// Step 2.5: Extract top-level async function declarations (sub-functions)
	const functionDefs = extractFunctionDeclarations(ast);

	// Check for recursive calls
	if (functionDefs.size > 0) {
		const recursionError = detectRecursion(functionDefs, source);
		if (recursionError) {
			errors.push({ message: recursionError, category: 'validation' });
			return { code: '', errors };
		}
	}

	// Step 3: Find onX() callbacks (with @example pin data parsing)
	const consumedComments = new Set<number>();
	const callbacks = findCallbacks(ast, comments, consumedComments);
	if (callbacks.length === 0) {
		errors.push({
			message:
				'No trigger callback found. Use onManual(async () => {...}), onWebhook({...}, async () => {...}), or onSchedule({...}, async () => {...}).',
			category: 'structure',
		});
		return { code: '', errors };
	}

	// Step 4: Check for respond() misuse
	for (const cb of callbacks) {
		if (cb.triggerType !== 'webhook' && hasRespondCall(cb.callbackBody, source)) {
			errors.push({
				message:
					'respond() can only be used inside onWebhook() callbacks. Use onWebhook({...}, async ({body, respond}) => {...}) instead.',
				category: 'structure',
			});
			return { code: '', errors };
		}
	}

	// Step 4.5a: Detect shared pipelines (must run before sub-function compilation)
	const sharedPipelines = detectSharedPipelines(functionDefs, callbacks);

	// Save shared pipeline function defs before removing from functionDefs
	const sharedPipelineDefs = new Map<string, FunctionDef>();
	for (const name of sharedPipelines.keys()) {
		sharedPipelineDefs.set(name, functionDefs.get(name)!);
		functionDefs.delete(name);
	}

	// Step 4.5b: Compile remaining sub-functions in topological order (callees first)
	const compiledFunctions = new Map<string, CompiledFunction>();
	if (functionDefs.size > 0) {
		const sortedNames = topologicalSortFunctions(functionDefs, source);
		for (const name of sortedNames) {
			const fnDef = functionDefs.get(name)!;
			const compiled = compileFunctionToSDK(
				fnDef,
				source,
				comments,
				functionDefs,
				compiledFunctions,
				errors,
			);
			compiledFunctions.set(name, compiled);
		}
	}

	// Step 5: Transpile each callback
	const allNodes: EmittedNode[] = [];
	const allChains: string[] = [];
	const allLoopBodies: CompiledFunction[] = [];
	const allTryCatchBodies: CompiledFunction[] = [];
	const allErrorConnections: Array<{ sourceVar: string; catchChainStartVar: string }> = [];

	// Track compiled shared pipelines: fnName → first pipeline node var
	const compiledSharedPipelineFirstNode = new Map<string, string>();

	for (let i = 0; i < callbacks.length; i++) {
		const cb = callbacks[i];

		// Check if this callback calls a shared pipeline function
		const sharedFnName = extractSolePipelineCall(cb.callbackBody, sharedPipelineDefs);
		if (sharedFnName && sharedPipelines.has(sharedFnName)) {
			if (!compiledSharedPipelineFirstNode.has(sharedFnName)) {
				// First callback: inline the function body
				const fnDef = sharedPipelineDefs.get(sharedFnName)!;
				const inlinedCb: CallbackInfo = { ...cb, callbackBody: fnDef.body };
				const { nodes, chainExpr, loopBodies, tryCatchBodies, errorConnections } =
					transpileCallback(
						inlinedCb,
						source,
						allNodes.length,
						comments,
						errors,
						functionDefs,
						compiledFunctions,
						consumedComments,
					);
				// First non-trigger node is the pipeline entry point
				const pipelineNodes = nodes.filter((n) => n.kind !== 'trigger');
				if (pipelineNodes.length > 0) {
					compiledSharedPipelineFirstNode.set(sharedFnName, pipelineNodes[0].varName);
				}
				allNodes.push(...nodes);
				allChains.push(chainExpr);
				allLoopBodies.push(...loopBodies);
				allTryCatchBodies.push(...tryCatchBodies);
				allErrorConnections.push(...errorConnections);
			} else {
				// Subsequent callback: just create trigger, connect to shared chain
				const triggerVar = `t${allNodes.length}`;
				const triggerNode = generateTriggerSDK(cb, triggerVar);
				const firstPipelineVar = compiledSharedPipelineFirstNode.get(sharedFnName)!;
				allNodes.push(triggerNode);
				allChains.push(`${triggerVar}.to(${firstPipelineVar})`);
			}
			continue;
		}

		const { nodes, chainExpr, loopBodies, tryCatchBodies, errorConnections } = transpileCallback(
			cb,
			source,
			allNodes.length,
			comments,
			errors,
			functionDefs,
			compiledFunctions,
			consumedComments,
		);
		allNodes.push(...nodes);
		allChains.push(chainExpr);
		allLoopBodies.push(...loopBodies);
		allTryCatchBodies.push(...tryCatchBodies);
		allErrorConnections.push(...errorConnections);
	}

	// Step 6: Generate final SDK code
	const code = generateSDKCode(
		allNodes,
		allChains,
		compiledFunctions,
		allLoopBodies,
		allTryCatchBodies,
		allErrorConnections,
	);
	return { code, errors };
}

// ─── Legacy Trigger Detection ────────────────────────────────────────────────

function findLegacyTrigger(ast: AcornNode): string | null {
	if (!ast.body) return null;

	for (const stmt of ast.body) {
		let callExpr: AcornNode | null = null;

		if (stmt.type === 'ExpressionStatement' && stmt.expression) {
			const expr = stmt.expression;
			if (expr.type === 'CallExpression') {
				callExpr = expr;
			} else if (expr.type === 'AwaitExpression' && expr.argument?.type === 'CallExpression') {
				callExpr = expr.argument;
			}
		}

		if (!callExpr?.callee) continue;
		const callee = callExpr.callee;

		if (
			callee.type === 'MemberExpression' &&
			callee.object?.type === 'Identifier' &&
			callee.object.name === 'trigger' &&
			callee.property?.type === 'Identifier'
		) {
			return callee.property.name ?? 'manual';
		}
	}

	return null;
}

// ─── Callback Detection ──────────────────────────────────────────────────────

function findCallbacks(
	ast: AcornNode,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
	consumedComments: Set<number>,
): CallbackInfo[] {
	const callbacks: CallbackInfo[] = [];
	if (!ast.body) return callbacks;

	let prevStmtEnd = 0;
	for (const stmt of ast.body) {
		if (stmt.type !== 'ExpressionStatement' || !stmt.expression) {
			prevStmtEnd = stmt.end ?? prevStmtEnd;
			continue;
		}
		const expr = stmt.expression;
		if (expr.type !== 'CallExpression' || !expr.callee) {
			prevStmtEnd = stmt.end ?? prevStmtEnd;
			continue;
		}

		const callee = expr.callee;
		if (callee.type !== 'Identifier') {
			prevStmtEnd = stmt.end ?? prevStmtEnd;
			continue;
		}

		const name = callee.name ?? '';
		const args = expr.arguments ?? [];

		const triggerType = CALLBACK_TO_TRIGGER[name] as CallbackInfo['triggerType'] | undefined;
		if (!triggerType) {
			prevStmtEnd = stmt.end ?? prevStmtEnd;
			continue;
		}

		let callbackFn: AcornNode | undefined;
		let triggerOptions: Record<string, unknown> = {};

		if (triggerType === 'manual' || triggerType === 'error') {
			callbackFn = args[0];
		} else {
			if (args[0]) triggerOptions = extractObjectLiteral(args[0]) ?? {};
			callbackFn = args[1];
		}

		if (!callbackFn) {
			prevStmtEnd = stmt.end ?? prevStmtEnd;
			continue;
		}

		const fnBody = extractFunctionBody(callbackFn);
		if (!fnBody) {
			prevStmtEnd = stmt.end ?? prevStmtEnd;
			continue;
		}

		const cbParams = extractCallbackParams(callbackFn);

		// Parse @example pin data annotation for non-schedule triggers.
		// Only match comments between previous top-level statement and current one
		// to avoid consuming comments inside function bodies.
		let pinData: unknown[] | undefined;
		if (triggerType !== 'schedule') {
			const exampleComments = comments.filter(
				(c) =>
					c.type === 'Block' &&
					c.start >= prevStmtEnd &&
					c.end <= stmt.start &&
					c.value.includes('@example') &&
					!consumedComments.has(c.start),
			);
			if (exampleComments.length > 0) {
				const comment = exampleComments[exampleComments.length - 1];
				const parsed = parseExampleAnnotation(comment.value);
				if (parsed) pinData = parsed;
				for (const c of exampleComments) consumedComments.add(c.start);
			}
		}

		callbacks.push({
			triggerType,
			triggerOptions,
			callbackBody: fnBody,
			callbackParams: cbParams,
			pinData,
		});

		prevStmtEnd = stmt.end ?? prevStmtEnd;
	}

	return callbacks;
}

function extractFunctionBody(fnNode: AcornNode): AcornNode[] | null {
	if (fnNode.type === 'ArrowFunctionExpression' || fnNode.type === 'FunctionExpression') {
		const body = fnNode.body as unknown as AcornNode;
		if (body?.type === 'BlockStatement' && body.body) {
			return body.body;
		}
	}
	return null;
}

function extractCallbackParams(fnNode: AcornNode): string[] {
	if (!fnNode.params || fnNode.params.length === 0) return [];
	const param = fnNode.params[0];
	if (param.type === 'ObjectPattern' && param.properties) {
		return param.properties
			.map((p: AcornNode) => {
				if (p.type === 'Property' && p.key?.type === 'Identifier') return p.key.name ?? '';
				return '';
			})
			.filter((n: string) => n.length > 0);
	}
	if (param.type === 'Identifier') return [param.name ?? ''];
	return [];
}

// ─── Function Extraction ─────────────────────────────────────────────────────

function extractFunctionDeclarations(ast: AcornNode): Map<string, FunctionDef> {
	const functions = new Map<string, FunctionDef>();
	if (!ast.body) return functions;

	// First pass: collect all top-level async function declarations
	for (const stmt of ast.body) {
		if (stmt.type !== 'FunctionDeclaration') continue;
		if (!stmt.id?.name) continue;

		const isAsync = (stmt as unknown as { async?: boolean }).async;
		if (!isAsync) continue;

		const body = stmt.body as unknown as AcornNode;
		if (body?.type !== 'BlockStatement' || !body.body) continue;

		const params = (stmt.params ?? [])
			.map((p: AcornNode) => p.name ?? '')
			.filter((n: string) => n.length > 0);

		const hasReturn = body.body.some((s: AcornNode) => s.type === 'ReturnStatement');

		functions.set(stmt.id.name, {
			name: stmt.id.name,
			params,
			body: body.body,
			hasReturn,
			node: stmt,
		});
	}

	// Second pass: only keep functions that have IO calls or call other known functions
	// (needed for recursion detection and sub-workflow compilation)
	const toRemove: string[] = [];
	for (const [name, def] of functions) {
		let hasIO = false;
		for (const s of def.body) {
			if (findNestedIO(s, '').length > 0) {
				hasIO = true;
				break;
			}
			if (extractIOCall(s, '')) {
				hasIO = true;
				break;
			}
		}
		if (hasIO) continue;

		// Check if it calls other known functions
		const calls = new Set<string>();
		findFunctionCalls(def.body, functions, '', calls);
		if (calls.size === 0) {
			toRemove.push(name);
		}
	}
	for (const name of toRemove) {
		functions.delete(name);
	}

	return functions;
}

// ─── Shared Pipeline Detection ───────────────────────────────────────────────

/**
 * Extract a sole function call from a callback body.
 * Matches: callback body is exactly one statement: `await fnName()`
 * where fnName is a known function with no parameters.
 */
function extractSolePipelineCall(
	body: AcornNode[],
	functionDefs: Map<string, FunctionDef>,
): string | null {
	if (body.length !== 1) return null;
	const stmt = body[0];
	if (stmt.type !== 'ExpressionStatement' || !stmt.expression) return null;
	const expr = stmt.expression;
	if (expr.type !== 'AwaitExpression' || !expr.argument) return null;
	const call = expr.argument;
	if (call.type !== 'CallExpression' || !call.callee) return null;
	if (call.callee.type !== 'Identifier') return null;
	const name = call.callee.name ?? '';
	if (!functionDefs.has(name)) return null;
	const fnDef = functionDefs.get(name)!;
	// Only parameterless functions qualify
	if (fnDef.params.length > 0) return null;
	// No arguments passed
	if ((call.arguments ?? []).length > 0) return null;
	return name;
}

/**
 * Detect shared pipeline functions: parameterless functions called from 2+
 * callbacks where each callback body is solely `await fnName()`.
 * Returns map of function name → callback indices.
 */
function detectSharedPipelines(
	functionDefs: Map<string, FunctionDef>,
	callbacks: CallbackInfo[],
): Map<string, number[]> {
	const candidates = new Map<string, number[]>();

	for (let i = 0; i < callbacks.length; i++) {
		const fnName = extractSolePipelineCall(callbacks[i].callbackBody, functionDefs);
		if (!fnName) continue;
		if (!candidates.has(fnName)) {
			candidates.set(fnName, []);
		}
		candidates.get(fnName)!.push(i);
	}

	// Keep only functions called from 2+ callbacks
	for (const [name, indices] of candidates) {
		if (indices.length < 2) {
			candidates.delete(name);
		}
	}

	return candidates;
}

/**
 * Build a call graph from function definitions and detect cycles (recursion).
 * Returns an error message if recursion is found, or null if clean.
 */
function detectRecursion(functions: Map<string, FunctionDef>, source: string): string | null {
	// Build adjacency list: function name -> called function names
	const callGraph = new Map<string, Set<string>>();
	for (const [name, def] of functions) {
		const calls = new Set<string>();
		findFunctionCalls(def.body, functions, source, calls);
		callGraph.set(name, calls);
	}

	// DFS cycle detection
	const visited = new Set<string>();
	const inStack = new Set<string>();

	function dfs(name: string): boolean {
		if (inStack.has(name)) return true; // cycle found
		if (visited.has(name)) return false;
		visited.add(name);
		inStack.add(name);
		for (const callee of callGraph.get(name) ?? []) {
			if (dfs(callee)) return true;
		}
		inStack.delete(name);
		return false;
	}

	for (const name of functions.keys()) {
		if (dfs(name)) {
			return `Recursive function calls are not supported: '${name}' is involved in a call cycle.`;
		}
	}
	return null;
}

/**
 * Find all function calls within statements that reference known function definitions.
 */
function findFunctionCalls(
	stmts: AcornNode[],
	functions: Map<string, FunctionDef>,
	_source: string,
	result: Set<string>,
): void {
	for (const stmt of stmts) {
		walkASTForFunctionCalls(stmt, functions, result);
	}
}

function walkASTForFunctionCalls(
	node: AcornNode,
	functions: Map<string, FunctionDef>,
	result: Set<string>,
): void {
	if (!node) return;

	// Check for await fnName(...)
	if (node.type === 'CallExpression' && node.callee?.type === 'Identifier') {
		const name = node.callee.name ?? '';
		if (functions.has(name)) {
			result.add(name);
		}
	}

	// Recurse into child nodes
	if (node.type === 'AwaitExpression' && node.argument) {
		walkASTForFunctionCalls(node.argument, functions, result);
	}
	if (node.body && Array.isArray(node.body)) {
		for (const child of node.body) walkASTForFunctionCalls(child, functions, result);
	}
	if (node.expression) walkASTForFunctionCalls(node.expression, functions, result);
	if (node.argument) walkASTForFunctionCalls(node.argument, functions, result);
	if (node.init) walkASTForFunctionCalls(node.init, functions, result);
	if (node.declarations) {
		for (const d of node.declarations) walkASTForFunctionCalls(d, functions, result);
	}
	if (node.consequent) {
		if (Array.isArray(node.consequent)) {
			for (const c of node.consequent) walkASTForFunctionCalls(c, functions, result);
		} else {
			walkASTForFunctionCalls(node.consequent, functions, result);
		}
	}
	if (node.alternate) walkASTForFunctionCalls(node.alternate, functions, result);
	if (node.block) walkASTForFunctionCalls(node.block, functions, result);
	if (node.handler)
		walkASTForFunctionCalls(node.handler as unknown as AcornNode, functions, result);
	if (node.cases) {
		for (const c of node.cases) walkASTForFunctionCalls(c, functions, result);
	}
}

/**
 * Topological sort of function definitions by their call dependencies.
 * Returns function names in order: callees before callers.
 */
function topologicalSortFunctions(functions: Map<string, FunctionDef>, source: string): string[] {
	const callGraph = new Map<string, Set<string>>();
	for (const [name, def] of functions) {
		const calls = new Set<string>();
		findFunctionCalls(def.body, functions, source, calls);
		callGraph.set(name, calls);
	}

	const sorted: string[] = [];
	const visited = new Set<string>();

	function visit(name: string): void {
		if (visited.has(name)) return;
		visited.add(name);
		for (const dep of callGraph.get(name) ?? []) {
			visit(dep);
		}
		sorted.push(name);
	}

	for (const name of functions.keys()) {
		visit(name);
	}

	return sorted;
}

// ─── Respond Detection ───────────────────────────────────────────────────────

function hasRespondCall(stmts: AcornNode[], source: string): boolean {
	for (const stmt of stmts) {
		if (isRespondCall(stmt)) return true;
		const nested = findNestedIO(stmt, source);
		for (const io of nested) {
			if (io.type === 'respond') return true;
		}
	}
	return false;
}

function isRespondCall(stmt: AcornNode): boolean {
	if (stmt.type === 'ExpressionStatement' && stmt.expression) {
		const expr = stmt.expression;
		if (
			expr.type === 'CallExpression' &&
			expr.callee?.type === 'Identifier' &&
			expr.callee.name === 'respond'
		) {
			return true;
		}
	}
	return false;
}

// ─── Function Call Handling ───────────────────────────────────────────────────

interface FunctionCallInfo {
	functionName: string;
	args: AcornNode[];
	assignedVar: string | null;
}

/**
 * Check if a statement is a call to a known sub-function.
 * Matches: `await fnName(args)` or `const x = await fnName(args)`
 */
function extractFunctionCall(stmt: AcornNode, ctx: TranspilerContext): FunctionCallInfo | null {
	if (ctx.functionDefs.size === 0) return null;

	// const x = await fnName(...)
	if (stmt.type === 'VariableDeclaration' && stmt.declarations) {
		for (const decl of stmt.declarations) {
			if (decl.init?.type === 'AwaitExpression' && decl.init.argument) {
				const call = decl.init.argument;
				if (call.type === 'CallExpression' && call.callee?.type === 'Identifier') {
					const name = call.callee.name ?? '';
					if (ctx.functionDefs.has(name)) {
						return {
							functionName: name,
							args: call.arguments ?? [],
							assignedVar: decl.id?.name ?? null,
						};
					}
				}
			}
		}
	}

	// await fnName(...)
	if (stmt.type === 'ExpressionStatement' && stmt.expression) {
		const expr = stmt.expression;
		if (expr.type === 'AwaitExpression' && expr.argument) {
			const call = expr.argument;
			if (call.type === 'CallExpression' && call.callee?.type === 'Identifier') {
				const name = call.callee.name ?? '';
				if (ctx.functionDefs.has(name)) {
					return {
						functionName: name,
						args: call.arguments ?? [],
						assignedVar: null,
					};
				}
			}
		}
	}

	return null;
}

/**
 * Process a sub-function call: emit Set node for params + Execute Workflow node.
 */
function processFunctionCall(ctx: TranspilerContext, fnCall: FunctionCallInfo): void {
	flushPendingCode(ctx);

	const compiled = ctx.compiledFunctions.get(fnCall.functionName);
	if (!compiled) return;

	const fnDef = ctx.functionDefs.get(fnCall.functionName);
	if (!fnDef) return;

	// Emit Set node to map arguments to function params
	if (fnDef.params.length > 0 && fnCall.args.length > 0) {
		ctx.setCounter++;
		const setVar = `set${ctx.setCounter}`;
		const setName = `Set ${fnCall.functionName} params`;

		const assignments = fnDef.params
			.map((param, i) => {
				if (i >= fnCall.args.length) return null;
				const argValue = resolveExpressionFromAST(fnCall.args[i], ctx);
				return {
					id: `assign_${i}`,
					name: param,
					type: 'string',
					value: argValue,
				};
			})
			.filter((a): a is NonNullable<typeof a> => a !== null);

		const configObj: Record<string, unknown> = {
			name: setName,
			parameters: {
				options: {},
				assignments: { assignments },
			},
		};
		if (!ctx.inLoopBody) {
			configObj.executeOnce = true;
		}

		const configStr = JSON.stringify(configObj, null, 2)
			.split('\n')
			.map((line, i) => (i === 0 ? line : '  ' + line))
			.join('\n');

		const sdkCode = `const ${setVar} = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: ${configStr}
});`;

		ctx.nodes.push({ varName: setVar, sdkCode, kind: 'set', nodeName: setName });
		ctx.prevVar = setVar;
	}

	// Emit Execute Workflow node
	ctx.execCounter++;
	const execVar = `exec${ctx.execCounter}`;
	const execName = fnCall.functionName;

	const execOnceStr = ctx.inLoopBody ? '' : ',\n    executeOnce: true';
	const sdkCode = `const ${execVar} = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: '${execName}',
    parameters: {
      source: 'parameter',
      workflowJson: ${compiled.builderVarName},
      options: {}
    }${execOnceStr}
  }
});`;

	ctx.nodes.push({ varName: execVar, sdkCode, kind: 'workflow', nodeName: execName });

	// Track return value if assigned
	if (fnCall.assignedVar) {
		ctx.varSourceMap.set(fnCall.assignedVar, execName);
		ctx.varSourceKind.set(fnCall.assignedVar, 'io');
	}

	ctx.prevVar = execVar;
}

/**
 * Compile a function definition into a sub-workflow SDK representation.
 */
function compileFunctionToSDK(
	fnDef: FunctionDef,
	source: string,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
	functionDefs: Map<string, FunctionDef>,
	compiledFunctions: Map<string, CompiledFunction>,
	errors: CompilerError[],
): CompiledFunction {
	const prefix = `fn_${fnDef.name}`;
	const triggerNodeName = 'When Executed by Another Workflow';

	// Create a context for compiling the function body
	const ctx: TranspilerContext = {
		source,
		nodes: [],
		varSourceMap: new Map(),
		varSourceKind: new Map(),
		httpCounter: 0,
		codeCounter: 0,
		ifCounter: 0,
		switchCounter: 0,
		sibCounter: 0,
		respondCounter: 0,
		wfCounter: 0,
		setCounter: 0,
		pendingStatements: [],
		prevVar: '',
		triggerType: 'manual',
		callbackParams: [],
		errors,
		hasOnErrorAnnotation: false,
		consumedComments: new Set(),
		inLoopBody: false,
		loopCounter: 0,
		functionDefs,
		compiledFunctions,
		compiledLoopBodies: [],
		compiledTryCatchBodies: [],
		execCounter: 0,
		tryCatchCounter: 0,
		errorConnections: [],
	};

	// Generate executeWorkflowTrigger as first node
	const triggerVar = `${prefix}_t0`;
	const triggerSdk = `const ${triggerVar} = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });`;
	ctx.nodes.push({
		varName: triggerVar,
		sdkCode: triggerSdk,
		kind: 'trigger',
		nodeName: triggerNodeName,
	});
	ctx.prevVar = triggerVar;

	// Seed varSourceMap with function parameters → trigger node
	// Use 'code' kind so expressions resolve to $('trigger').first().json.paramName
	for (const param of fnDef.params) {
		ctx.varSourceMap.set(param, triggerNodeName);
		ctx.varSourceKind.set(param, 'code');
	}

	// Walk function body
	walkStatements(ctx, fnDef.body, comments);
	flushPendingCode(ctx);

	// Prefix all non-trigger node variable names to avoid collisions with main workflow
	// Two-pass: collect renames first, then apply across all sdkCode
	const renames = new Map<string, string>();
	for (const node of ctx.nodes) {
		if (node.varName === triggerVar) continue;
		renames.set(node.varName, `${prefix}_${node.varName}`);
	}
	for (const node of ctx.nodes) {
		if (node.varName === triggerVar) continue;
		for (const [oldVar, newVar] of renames) {
			node.sdkCode = node.sdkCode.replaceAll(`(${oldVar})`, `(${newVar})`);
			node.sdkCode = node.sdkCode.replace(`const ${oldVar} `, `const ${newVar} `);
		}
		node.varName = renames.get(node.varName) ?? node.varName;
	}

	// Rename error connection variables to match prefixed names
	for (const ec of ctx.errorConnections) {
		ec.sourceVar = renames.get(ec.sourceVar) ?? ec.sourceVar;
		ec.catchChainStartVar = renames.get(ec.catchChainStartVar) ?? ec.catchChainStartVar;
	}

	// Build chain expression
	const nodeVars = ctx.nodes.filter((n) => !n.branchOnly).map((n) => n.varName);
	let chainExpr: string;
	if (nodeVars.length <= 1) {
		chainExpr = nodeVars[0] ?? triggerVar;
	} else {
		chainExpr = nodeVars[0];
		for (let i = 1; i < nodeVars.length; i++) {
			chainExpr += `.to(${nodeVars[i]})`;
		}
	}

	// Build node declarations
	const nodeDeclarations = ctx.nodes.map((n) => n.sdkCode);

	// Build workflow builder declaration
	const builderVarName = `${fnDef.name}Workflow`;
	const builderDeclaration = `const ${builderVarName} = workflow('${fnDef.name}', '${fnDef.name}')\n  .add(${chainExpr});`;

	return {
		nodeDeclarations,
		builderDeclaration,
		builderVarName,
		triggerNodeName,
		errorConnections: ctx.errorConnections,
	};
}

// ─── Callback Transpilation ──────────────────────────────────────────────────

function transpileCallback(
	cb: CallbackInfo,
	source: string,
	nodeOffset: number,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
	errors: CompilerError[],
	functionDefs?: Map<string, FunctionDef>,
	compiledFunctions?: Map<string, CompiledFunction>,
	initialConsumedComments?: Set<number>,
): {
	nodes: EmittedNode[];
	chainExpr: string;
	loopBodies: CompiledFunction[];
	tryCatchBodies: CompiledFunction[];
	errorConnections: Array<{ sourceVar: string; catchChainStartVar: string }>;
} {
	const ctx: TranspilerContext = {
		source,
		nodes: [],
		varSourceMap: new Map(),
		varSourceKind: new Map(),
		httpCounter: nodeOffset,
		codeCounter: nodeOffset,
		ifCounter: nodeOffset,
		switchCounter: nodeOffset,
		sibCounter: nodeOffset,
		respondCounter: nodeOffset,
		wfCounter: nodeOffset,
		setCounter: nodeOffset,
		pendingStatements: [],
		prevVar: '',
		triggerType: cb.triggerType,
		callbackParams: cb.callbackParams,
		errors,
		hasOnErrorAnnotation: false,
		consumedComments: initialConsumedComments ? new Set(initialConsumedComments) : new Set(),
		inLoopBody: false,
		loopCounter: nodeOffset,
		functionDefs: functionDefs ?? new Map(),
		compiledFunctions: compiledFunctions ?? new Map(),
		compiledLoopBodies: [],
		compiledTryCatchBodies: [],
		execCounter: nodeOffset,
		tryCatchCounter: nodeOffset,
		errorConnections: [],
	};

	// Generate trigger node
	const triggerVar = `t${nodeOffset}`;
	const triggerNode = generateTriggerSDK(cb, triggerVar);
	ctx.nodes.push(triggerNode);
	ctx.prevVar = triggerVar;

	// Seed varSourceMap with webhook params
	if (cb.triggerType === 'webhook') {
		for (const param of cb.callbackParams) {
			if (param !== 'respond') {
				ctx.varSourceMap.set(param, triggerNode.nodeName);
				ctx.varSourceKind.set(param, 'io');
			}
		}
	}

	// Walk callback body
	walkStatements(ctx, cb.callbackBody, comments);

	// Flush remaining code
	flushPendingCode(ctx);

	// Build chain expression
	const nodeVars = ctx.nodes.filter((n) => !n.branchOnly).map((n) => n.varName);
	let chainExpr: string;
	if (nodeVars.length <= 1) {
		chainExpr = nodeVars[0] ?? triggerVar;
	} else {
		chainExpr = nodeVars[0];
		for (let i = 1; i < nodeVars.length; i++) {
			chainExpr += `.to(${nodeVars[i]})`;
		}
	}

	return {
		nodes: ctx.nodes,
		chainExpr,
		loopBodies: ctx.compiledLoopBodies,
		tryCatchBodies: ctx.compiledTryCatchBodies,
		errorConnections: ctx.errorConnections,
	};
}

// ─── Statement Walking ───────────────────────────────────────────────────────

function walkStatements(
	ctx: TranspilerContext,
	statements: AcornNode[],
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	for (const stmt of statements) {
		// Check for @onError continue annotation in preceding comments
		const stmtComments = comments.filter(
			(c) =>
				c.end <= stmt.start &&
				c.value.trim() === '@onError continue' &&
				!ctx.consumedComments.has(c.start),
		);
		if (stmtComments.length > 0) {
			ctx.hasOnErrorAnnotation = true;
			for (const c of stmtComments) ctx.consumedComments.add(c.start);
		}

		// Check for @example pin data annotation in preceding block comments
		const exampleComments = comments.filter(
			(c) =>
				c.type === 'Block' &&
				c.end <= stmt.start &&
				c.value.includes('@example') &&
				!ctx.consumedComments.has(c.start),
		);
		if (exampleComments.length > 0) {
			const comment = exampleComments[exampleComments.length - 1];
			const pinData = parseExampleAnnotation(comment.value);
			if (pinData) {
				ctx.pendingPinData = pinData;
			}
			for (const c of exampleComments) ctx.consumedComments.add(c.start);
		}

		const ioCall = extractIOCall(stmt, ctx.source);
		if (ioCall) {
			// Apply @onError annotation
			if (ctx.hasOnErrorAnnotation) {
				ioCall.onError = 'continueRegularOutput';
				ctx.hasOnErrorAnnotation = false;
			}
			// Apply @example pin data annotation
			if (ctx.pendingPinData) {
				ioCall.pinData = ctx.pendingPinData;
				ctx.pendingPinData = undefined;
			}
			processIOCall(ctx, ioCall);
			continue;
		}

		// Check for sub-function calls: await funcName(args) or const x = await funcName(args)
		const fnCall = extractFunctionCall(stmt, ctx);
		if (fnCall) {
			ctx.pendingPinData = undefined;
			processFunctionCall(ctx, fnCall);
			continue;
		}

		// Check for respond() call
		if (isRespondCall(stmt)) {
			const respondPinData = ctx.pendingPinData;
			ctx.pendingPinData = undefined;
			processRespondCall(ctx, stmt, respondPinData);
			continue;
		}

		// Clear pending pin data if statement was not an IO call or respond
		ctx.pendingPinData = undefined;

		// Check for structured control flow
		if (stmt.type === 'IfStatement') {
			processIfStatement(ctx, stmt, comments);
			continue;
		}

		if (stmt.type === 'SwitchStatement') {
			processSwitchStatement(ctx, stmt, comments);
			continue;
		}

		if (stmt.type === 'ForOfStatement') {
			processForOfStatement(ctx, stmt, comments);
			continue;
		}

		if (stmt.type === 'TryStatement') {
			processTryStatement(ctx, stmt, comments);
			continue;
		}

		// Check for nested IO in unrecognized structures
		const nestedIO = findNestedIO(stmt, ctx.source);
		if (nestedIO.length > 0) {
			for (const nio of nestedIO) {
				processIOCall(ctx, nio);
			}
			continue;
		}

		// Skip return statements — bare returns are early exits, return <expr> in
		// sub-function bodies just passes through the last node's output
		if (stmt.type === 'ReturnStatement') {
			continue;
		}

		// Accumulate code statements — dedent to strip callback-body indentation
		const stmtSource = ctx.source.slice(stmt.start, stmt.end);
		const baseIndent = getBaseIndent(ctx.source, stmt.start);
		ctx.pendingStatements.push({ source: dedentSource(stmtSource, baseIndent), ast: stmt });
	}
}

// ─── IO Processing ───────────────────────────────────────────────────────────

function processIOCall(ctx: TranspilerContext, ioCall: IOCall): void {
	flushPendingCode(ctx);

	if (ioCall.type === 'http') {
		ctx.httpCounter++;
		const httpVar = `http${ctx.httpCounter}`;
		const httpNode = generateHttpSDK(ioCall, httpVar, ctx, {
			skipExecuteOnce: ctx.inLoopBody,
		});
		ctx.nodes.push(httpNode);
		if (ioCall.assignedVar) {
			ctx.varSourceMap.set(ioCall.assignedVar, httpNode.nodeName);
			ctx.varSourceKind.set(ioCall.assignedVar, 'io');
		}
		ctx.prevVar = httpVar;
	} else if (ioCall.type === 'ai') {
		ctx.httpCounter++;
		const aiVar = `ai${ctx.httpCounter}`;
		const aiNode = generateAiSDK(ioCall, aiVar);
		ctx.nodes.push(aiNode);
		if (ioCall.assignedVar) {
			ctx.varSourceMap.set(ioCall.assignedVar, aiNode.nodeName);
			ctx.varSourceKind.set(ioCall.assignedVar, 'io');
		}
		ctx.prevVar = aiVar;
	} else if (ioCall.type === 'workflow') {
		ctx.wfCounter++;
		const wfVar = `wf${ctx.wfCounter}`;
		const wfNode = generateWorkflowRunSDK(ioCall, wfVar);
		ctx.nodes.push(wfNode);
		if (ioCall.assignedVar) {
			ctx.varSourceMap.set(ioCall.assignedVar, wfNode.nodeName);
			ctx.varSourceKind.set(ioCall.assignedVar, 'io');
		}
		ctx.prevVar = wfVar;
	}
}

function processRespondCall(ctx: TranspilerContext, stmt: AcornNode, pinData?: unknown[]): void {
	flushPendingCode(ctx);

	const expr = stmt.expression!;
	const args = (expr as AcornNode).arguments ?? [];
	const respondArgs = args[0] ? (extractObjectLiteral(args[0]) ?? {}) : {};

	ctx.respondCounter++;
	const respondVar = `respond${ctx.respondCounter}`;

	const params: Record<string, unknown> = {
		respondWith: 'json',
	};

	if (respondArgs.body) {
		if (typeof respondArgs.body === 'object') {
			params.responseBody = resolveJsonRefs(JSON.stringify(respondArgs.body), ctx);
		} else {
			params.responseBody = resolveJsonRefs(String(respondArgs.body), ctx);
		}
	}

	const options: Record<string, unknown> = {};
	if (respondArgs.status) {
		options.responseCode = respondArgs.status;
	}
	if (respondArgs.headers) {
		const headerObj = respondArgs.headers as Record<string, string>;
		options.responseHeaders = {
			entries: Object.entries(headerObj).map(([name, value]) => ({ name, value })),
		};
	}
	if (Object.keys(options).length > 0) {
		params.options = options;
	}

	const configObj: Record<string, unknown> = {
		name: `Respond ${ctx.respondCounter}`,
		parameters: params,
		executeOnce: true,
	};
	if (pinData) {
		configObj.pinData = pinData;
	}
	const configStr = JSON.stringify(configObj, null, 2)
		.split('\n')
		.map((line, i) => (i === 0 ? line : '  ' + line))
		.join('\n');

	const sdkCode = `const ${respondVar} = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: ${configStr}
});`;

	ctx.nodes.push({
		varName: respondVar,
		sdkCode,
		kind: 'respond',
		nodeName: `Respond ${ctx.respondCounter}`,
	});
	ctx.prevVar = respondVar;
}

// ─── IF Condition Helpers ────────────────────────────────────────────────────

interface IfConditionEntry {
	leftValue: string;
	rightValue: string;
	operator: { type: string; operation: string; singleValue?: boolean };
}

/** Extract the root identifier name from an AST node (Identifier or MemberExpression). */
function extractRootIdentifier(astNode: AcornNode): string | null {
	if (astNode.type === 'Identifier') return astNode.name ?? null;
	if (astNode.type === 'MemberExpression' && astNode.object) {
		return extractRootIdentifier(astNode.object);
	}
	return null;
}

/** Extract the full property chain from a MemberExpression as a dot-separated string. */
function extractPropertyChain(astNode: AcornNode): string {
	if (astNode.type === 'Identifier') return astNode.name ?? '';
	if (astNode.type === 'MemberExpression' && astNode.object && astNode.property) {
		const obj = extractPropertyChain(astNode.object);
		const prop = astNode.property.name ?? String(astNode.property.value ?? '');
		return obj ? `${obj}.${prop}` : prop;
	}
	return '';
}

/**
 * Resolve an AST node to an n8n expression string.
 * - Identifier / MemberExpression → `={{ $('NodeName').first().json.path }}`
 * - Literal → plain value as string
 */
function resolveExpressionFromAST(astNode: AcornNode, ctx: TranspilerContext): string {
	if (astNode.type === 'Literal') {
		return String(astNode.value ?? '');
	}

	if (astNode.type === 'Identifier' || astNode.type === 'MemberExpression') {
		const root = extractRootIdentifier(astNode);
		if (!root) return ctx.source.slice(astNode.start, astNode.end);

		const sourceNode = ctx.varSourceMap.get(root);
		if (!sourceNode) return ctx.source.slice(astNode.start, astNode.end);

		const kind = ctx.varSourceKind.get(root) ?? 'code';
		const chain = extractPropertyChain(astNode);

		if (kind === 'io') {
			// IO node: variable IS the $json, so strip the root identifier
			const propsAfterRoot = chain.includes('.') ? chain.slice(chain.indexOf('.') + 1) : '';
			const jsonPath = propsAfterRoot ? `.${propsAfterRoot}` : '';
			return `={{ $('${sourceNode}').first().json${jsonPath} }}`;
		}
		// Code node: variable is wrapped inside $json, keep full chain
		return `={{ $('${sourceNode}').first().json.${chain} }}`;
	}

	// Fallback: use raw source
	return ctx.source.slice(astNode.start, astNode.end);
}

/** Infer the operator type from a right-hand Literal value. */
function inferTypeFromLiteral(astNode: AcornNode): string {
	if (astNode.type === 'Literal') {
		if (typeof astNode.value === 'number') return 'number';
		if (typeof astNode.value === 'boolean') return 'boolean';
	}
	return 'string';
}

/** Map a JS binary operator to an IF node v2 operator object. */
function mapBinaryOperator(
	op: string,
	rightNode: AcornNode,
): { type: string; operation: string; singleValue?: boolean } {
	const rhsType = inferTypeFromLiteral(rightNode);

	// Boolean literal comparisons
	if (rightNode.type === 'Literal' && typeof rightNode.value === 'boolean') {
		return {
			type: 'boolean',
			operation: rightNode.value ? 'true' : 'false',
			singleValue: true,
		};
	}

	const opMap: Record<string, string> = {
		'===': 'equals',
		'==': 'equals',
		'!==': 'notEquals',
		'!=': 'notEquals',
		'>': 'gt',
		'<': 'lt',
		'>=': 'gte',
		'<=': 'lte',
	};

	const operation = opMap[op];
	if (!operation) return { type: 'string', operation: 'equals' };

	return { type: rhsType, operation };
}

/** Parse a single condition operand (not a LogicalExpression) into an IfConditionEntry. */
function parseSingleCondition(astNode: AcornNode, ctx: TranspilerContext): IfConditionEntry {
	// UnaryExpression: !x → notExists
	if (astNode.type === 'UnaryExpression' && astNode.operator === '!' && astNode.argument) {
		return {
			leftValue: resolveExpressionFromAST(astNode.argument, ctx),
			rightValue: '',
			operator: { type: 'string', operation: 'notExists', singleValue: true },
		};
	}

	// BinaryExpression: a === b, a !== b, a > b, etc.
	if (astNode.type === 'BinaryExpression' && astNode.left && astNode.right && astNode.operator) {
		const left = resolveExpressionFromAST(astNode.left, ctx);
		const right = resolveExpressionFromAST(astNode.right, ctx);
		const operator = mapBinaryOperator(astNode.operator, astNode.right);
		return { leftValue: left, rightValue: right, operator };
	}

	// Truthiness: bare identifier or member expression
	return {
		leftValue: resolveExpressionFromAST(astNode, ctx),
		rightValue: '',
		operator: { type: 'string', operation: 'exists', singleValue: true },
	};
}

/** Collect all conditions and determine combinator from an AST test node. */
function collectConditions(
	astNode: AcornNode,
	ctx: TranspilerContext,
): { conditions: IfConditionEntry[]; combinator: 'and' | 'or' } {
	if (astNode.type === 'LogicalExpression' && astNode.left && astNode.right && astNode.operator) {
		const combinator = astNode.operator === '||' ? 'or' : 'and';
		const leftResult = collectConditions(astNode.left, ctx);
		const rightResult = collectConditions(astNode.right, ctx);
		return {
			conditions: [...leftResult.conditions, ...rightResult.conditions],
			combinator,
		};
	}
	return { conditions: [parseSingleCondition(astNode, ctx)], combinator: 'and' };
}

/**
 * Build the `conditions` parameter object for an IF node v2.2 from an AST test node.
 * Returns a JSON string suitable for embedding in SDK code.
 */
function buildIfConditionsParam(testNode: AcornNode, ctx: TranspilerContext): string {
	const { conditions, combinator } = collectConditions(testNode, ctx);

	const conditionsObj = {
		conditions: conditions.map((c) => ({
			leftValue: c.leftValue,
			rightValue: c.rightValue,
			operator: c.operator,
		})),
		combinator,
	};

	return JSON.stringify(conditionsObj);
}

// ─── If/Else Processing ──────────────────────────────────────────────────────

function processIfStatement(
	ctx: TranspilerContext,
	stmt: AcornNode,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	flushPendingCode(ctx);
	ctx.ifCounter++;

	const myIfNum = ctx.ifCounter;
	const ifVar = `if${myIfNum}`;

	// Process true branch
	const trueBranch = transpileBranch(ctx, stmt.consequent as AcornNode, comments);

	// Process false branch (may be another IfStatement for else-if)
	let falseBranch: { nodes: EmittedNode[]; chainExpr: string } | null = null;
	if (stmt.alternate) {
		if (stmt.alternate.type === 'IfStatement') {
			// else-if: recursively create another ifElse
			const nestedCtx = createBranchContext(ctx);
			processIfStatement(nestedCtx, stmt.alternate, comments);
			flushPendingCode(nestedCtx);
			syncCounters(ctx, nestedCtx);
			falseBranch = { nodes: nestedCtx.nodes, chainExpr: buildBranchChain(nestedCtx.nodes) };
		} else {
			falseBranch = transpileBranch(ctx, stmt.alternate, comments);
		}
	}

	// Emit all branch nodes
	const allBranchNodes = [...trueBranch.nodes, ...(falseBranch?.nodes ?? [])];
	for (const bn of allBranchNodes) {
		ctx.nodes.push({ ...bn, branchOnly: true });
	}

	// Emit ifElse node
	const conditionsParam = buildIfConditionsParam(stmt.test!, ctx);
	let sdkCode = `const ${ifVar} = ifElse({ version: 2.2, config: { name: 'IF ${myIfNum}', parameters: { conditions: ${conditionsParam} }, executeOnce: true } })`;

	if (trueBranch.chainExpr) {
		sdkCode += `\n  .onTrue(${trueBranch.chainExpr})`;
	}
	if (falseBranch?.chainExpr) {
		sdkCode += `\n  .onFalse(${falseBranch.chainExpr})`;
	}
	sdkCode += ';';

	ctx.nodes.push({ varName: ifVar, sdkCode, kind: 'ifElse', nodeName: `IF ${myIfNum}` });
	ctx.prevVar = ifVar;
}

function transpileBranch(
	parentCtx: TranspilerContext,
	blockNode: AcornNode,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): { nodes: EmittedNode[]; chainExpr: string } {
	const branchCtx = createBranchContext(parentCtx);

	const stmts =
		blockNode.type === 'BlockStatement' && blockNode.body ? blockNode.body : [blockNode];

	walkStatements(branchCtx, stmts, comments);
	flushPendingCode(branchCtx);

	// Sync counters back so subsequent branches/code see the highest values
	syncCounters(parentCtx, branchCtx);

	return { nodes: branchCtx.nodes, chainExpr: buildBranchChain(branchCtx.nodes) };
}

const COUNTER_KEYS = [
	'httpCounter',
	'codeCounter',
	'ifCounter',
	'switchCounter',
	'sibCounter',
	'respondCounter',
	'wfCounter',
	'setCounter',
	'loopCounter',
	'execCounter',
	'tryCatchCounter',
] as const;

function syncCounters(target: TranspilerContext, source: TranspilerContext): void {
	for (const key of COUNTER_KEYS) {
		target[key] = Math.max(target[key], source[key]);
	}
}

function createBranchContext(parentCtx: TranspilerContext): TranspilerContext {
	return {
		source: parentCtx.source,
		nodes: [],
		varSourceMap: new Map(parentCtx.varSourceMap),
		varSourceKind: new Map(parentCtx.varSourceKind),
		httpCounter: parentCtx.httpCounter,
		codeCounter: parentCtx.codeCounter,
		ifCounter: parentCtx.ifCounter,
		switchCounter: parentCtx.switchCounter,
		sibCounter: parentCtx.sibCounter,
		respondCounter: parentCtx.respondCounter,
		wfCounter: parentCtx.wfCounter,
		setCounter: parentCtx.setCounter,
		pendingStatements: [],
		prevVar: '',
		triggerType: parentCtx.triggerType,
		callbackParams: parentCtx.callbackParams,
		errors: parentCtx.errors,
		hasOnErrorAnnotation: false,
		consumedComments: parentCtx.consumedComments,
		inLoopBody: parentCtx.inLoopBody,
		loopCounter: parentCtx.loopCounter,
		functionDefs: parentCtx.functionDefs,
		compiledFunctions: parentCtx.compiledFunctions,
		compiledLoopBodies: parentCtx.compiledLoopBodies,
		compiledTryCatchBodies: parentCtx.compiledTryCatchBodies,
		execCounter: parentCtx.execCounter,
		tryCatchCounter: parentCtx.tryCatchCounter,
		errorConnections: parentCtx.errorConnections,
	};
}

function buildBranchChain(nodes: EmittedNode[]): string {
	const chainNodes = nodes.filter((n) => !n.branchOnly);
	if (chainNodes.length === 0) return '';
	const vars = chainNodes.map((n) => n.varName);
	let chain = vars[0];
	for (let i = 1; i < vars.length; i++) {
		chain += `.to(${vars[i]})`;
	}
	return chain;
}

// ─── Switch Processing ───────────────────────────────────────────────────────

/**
 * Resolve a discriminant AST node to an n8n expression.
 * Uses `resolveExpressionFromAST` for explicit `$('NodeName')` references,
 * falling back to `$json.property` when the source node is unknown.
 */
function buildJsonExpression(astNode: AcornNode, ctx: TranspilerContext): string {
	const resolved = resolveExpressionFromAST(astNode, ctx);
	if (resolved && resolved.startsWith('={{')) return resolved;
	// Fallback: strip root variable, use $json
	const chain = extractPropertyChain(astNode);
	const dotIdx = chain.indexOf('.');
	const jsonPath = dotIdx >= 0 ? chain.slice(dotIdx + 1) : '';
	return jsonPath ? `={{ $json.${jsonPath} }}` : '={{ $json }}';
}

function processSwitchStatement(
	ctx: TranspilerContext,
	stmt: AcornNode,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	flushPendingCode(ctx);
	ctx.switchCounter++;

	const switchVar = `sw${ctx.switchCounter}`;

	// Build expression from discriminant (e.g. body.action → $('NodeName').first().json.action)
	const discExpr = stmt.discriminant ? buildJsonExpression(stmt.discriminant, ctx) : '={{ $json }}';

	const cases = stmt.cases ?? [];
	const caseBranches: Array<{ index: number; chainExpr: string }> = [];
	const caseRules: Array<{ testValue: string; type: string }> = [];
	const allCaseNodes: EmittedNode[] = [];
	let hasDefault = false;

	let ruleIdx = 0;
	for (let i = 0; i < cases.length; i++) {
		const c = cases[i];

		// Collect case test value and determine output index
		let outputIndex: number;
		if (c.test) {
			const testValue = extractStringLiteral(c.test) ?? ctx.source.slice(c.test.start, c.test.end);
			const type = inferTypeFromLiteral(c.test);
			caseRules.push({ testValue, type });
			outputIndex = ruleIdx;
			ruleIdx++;
		} else {
			// Default case – placeholder, remapped after loop
			hasDefault = true;
			outputIndex = -1;
		}

		const consequent = (c.consequent ?? []) as AcornNode[];
		const caseStmts = consequent.filter((s: AcornNode) => s.type !== 'BreakStatement');
		if (caseStmts.length === 0) continue;

		const branchCtx = createBranchContext(ctx);
		walkStatements(branchCtx, caseStmts, comments);
		flushPendingCode(branchCtx);

		for (const bn of branchCtx.nodes) {
			allCaseNodes.push(bn);
		}

		const chainExpr = buildBranchChain(branchCtx.nodes);
		if (chainExpr) {
			caseBranches.push({ index: outputIndex, chainExpr });
		}

		syncCounters(ctx, branchCtx);
	}

	// Fix default case output index → fallback output after all rules
	for (const cb of caseBranches) {
		if (cb.index === -1) {
			cb.index = caseRules.length;
		}
	}

	// Emit case nodes
	for (const cn of allCaseNodes) {
		ctx.nodes.push({ ...cn, branchOnly: true });
	}

	// Build rules.values from non-default cases
	const rulesValues = caseRules.map((r) => ({
		conditions: {
			conditions: [
				{
					leftValue: discExpr,
					rightValue: r.testValue,
					operator: { type: r.type, operation: 'equals' },
				},
			],
			combinator: 'and',
		},
	}));

	const options: Record<string, string> = hasDefault ? { fallbackOutput: 'extra' } : {};

	// Emit switchCase with rules
	const rulesStr = JSON.stringify({ values: rulesValues });
	const optionsStr = JSON.stringify(options);
	let sdkCode = `const ${switchVar} = switchCase({ version: 3.2, config: { name: 'Switch ${ctx.switchCounter}', parameters: { mode: 'rules', rules: ${rulesStr}, options: ${optionsStr} }, executeOnce: true } })`;

	for (const cb of caseBranches) {
		sdkCode += `\n  .onCase(${cb.index}, ${cb.chainExpr})`;
	}
	sdkCode += ';';

	ctx.nodes.push({
		varName: switchVar,
		sdkCode,
		kind: 'switchCase',
		nodeName: `Switch ${ctx.switchCounter}`,
	});
	ctx.prevVar = switchVar;
}

// ─── For-Of Processing ───────────────────────────────────────────────────────

function loopBodyHasIO(bodyNode: AcornNode, source: string): boolean {
	const stmts = bodyNode.type === 'BlockStatement' && bodyNode.body ? bodyNode.body : [bodyNode];
	for (const s of stmts) {
		if (findNestedIO(s, source).length > 0) return true;
	}
	return false;
}

function countIOInBody(bodyNode: AcornNode, source: string): number {
	const stmts = bodyNode.type === 'BlockStatement' && bodyNode.body ? bodyNode.body : [bodyNode];
	let count = 0;
	for (const s of stmts) {
		// findNestedIO handles both direct IO (extractIOCall) and nested IO in if/for/try
		count += findNestedIO(s, source).length;
	}
	return count;
}

function loopBodyHasFunctionCall(bodyNode: AcornNode, ctx: TranspilerContext): boolean {
	const stmts = bodyNode.type === 'BlockStatement' && bodyNode.body ? bodyNode.body : [bodyNode];
	for (const s of stmts) {
		if (extractFunctionCall(s, ctx) !== null) return true;
	}
	return false;
}

function countFunctionCallsInBody(bodyNode: AcornNode, ctx: TranspilerContext): number {
	const stmts = bodyNode.type === 'BlockStatement' && bodyNode.body ? bodyNode.body : [bodyNode];
	let count = 0;
	for (const s of stmts) {
		if (extractFunctionCall(s, ctx) !== null) count++;
	}
	return count;
}

function processForOfStatement(
	ctx: TranspilerContext,
	stmt: AcornNode,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	const bodyNode = (stmt as unknown as { body: AcornNode }).body;

	// Case 1: No IO and no function calls in loop body → keep as plain JS in Code node
	if (!loopBodyHasIO(bodyNode, ctx.source) && !loopBodyHasFunctionCall(bodyNode, ctx)) {
		const loopSource = ctx.source.slice(stmt.start, stmt.end);
		const baseIndent = getBaseIndent(ctx.source, stmt.start);
		ctx.pendingStatements.push({ source: dedentSource(loopSource, baseIndent), ast: stmt });
		return;
	}

	// Common setup: splitter node
	flushPendingCode(ctx);
	ctx.loopCounter++;

	// Extract loop variable name and iterable
	const leftNode = (stmt as unknown as { left: AcornNode }).left;
	const loopVar =
		leftNode.type === 'VariableDeclaration' && leftNode.declarations?.[0]
			? (leftNode.declarations[0].id?.name ?? 'item')
			: (leftNode.name ?? 'item');

	const rightNode = (stmt as unknown as { right: AcornNode }).right;
	const iterableChain = extractPropertyChain(rightNode);
	const iterableRoot =
		rightNode.type === 'Identifier'
			? (rightNode.name ?? '')
			: (extractRootIdentifier(rightNode) ?? '');

	// Emit splitter Code node — splits array into individual n8n items
	ctx.codeCounter++;
	const splitterVar = `code${ctx.codeCounter}`;
	const splitterName = `Split ${loopVar}s`;

	// Build reference to the source array
	const sourceNodeName = ctx.varSourceMap.get(iterableRoot);
	const refLine = sourceNodeName
		? `const ${iterableRoot} = $('${sourceNodeName}').all().map(i => i.json);\n`
		: '';
	// Use the full property chain for the iterable (e.g. analysis.action_items)
	const jsCode = `${refLine}return ${iterableChain}.map(${loopVar} => ({ json: ${loopVar} }));`;

	const splitterSdk = `const ${splitterVar} = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: '${splitterName}',
    parameters: {
      jsCode: \`${jsCode.replace(/`/g, '\\`')}\`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});`;

	ctx.nodes.push({
		varName: splitterVar,
		sdkCode: splitterSdk,
		kind: 'code',
		nodeName: splitterName,
	});
	ctx.prevVar = splitterVar;

	const ioCount = countIOInBody(bodyNode, ctx.source);
	const fnCallCount = countFunctionCallsInBody(bodyNode, ctx);
	const effectiveIO = ioCount + fnCallCount;

	if (effectiveIO <= 1) {
		// Case 2: Single IO in loop → splitter + inline per-item node (current approach)
		ctx.varSourceMap.set(loopVar, splitterName);
		ctx.varSourceKind.set(loopVar, 'io');

		const branchCtx = createBranchContext(ctx);
		branchCtx.inLoopBody = true;
		branchCtx.prevVar = splitterVar;
		const bodyStmts =
			bodyNode.type === 'BlockStatement' && bodyNode.body ? bodyNode.body : [bodyNode];
		walkStatements(branchCtx, bodyStmts, comments);
		flushPendingCode(branchCtx);

		for (const bn of branchCtx.nodes) {
			ctx.nodes.push(bn);
		}

		if (branchCtx.nodes.length > 0) {
			ctx.prevVar = branchCtx.nodes[branchCtx.nodes.length - 1].varName;
		}

		syncCounters(ctx, branchCtx);
	} else {
		// Case 3: Multi-IO in loop → splitter + Execute Sub-Workflow
		const compiled = compileLoopBodyAsSubWorkflow(loopVar, bodyNode, ctx, comments);
		ctx.compiledLoopBodies.push(compiled);

		// Emit Execute Workflow node — no executeOnce, runs per item
		ctx.execCounter++;
		const execVar = `exec${ctx.execCounter}`;
		const execName = `Loop ${loopVar}s`;

		const sdkCode = `const ${execVar} = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: '${execName}',
    parameters: {
      source: 'parameter',
      workflowJson: ${compiled.builderVarName},
      options: {}
    }
  }
});`;

		ctx.nodes.push({
			varName: execVar,
			sdkCode,
			kind: 'workflow',
			nodeName: execName,
		});
		ctx.prevVar = execVar;
	}
}

/**
 * Compile a loop body into an inline sub-workflow for the Execute Workflow node.
 * Follows the same pattern as compileFunctionToSDK, but:
 * - Trigger is executeWorkflowTrigger in passthrough mode
 * - Loop variable is seeded as 'io' kind pointing to the trigger
 * - Sub-workflow name is `_loop_<loopVar>` (decompiler hint)
 */
function compileLoopBodyAsSubWorkflow(
	loopVar: string,
	bodyNode: AcornNode,
	parentCtx: TranspilerContext,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): CompiledFunction {
	const subWfName = `_loop_${loopVar}`;
	const prefix = `loop_${loopVar}`;
	const triggerNodeName = 'When Executed by Another Workflow';

	const ctx: TranspilerContext = {
		source: parentCtx.source,
		nodes: [],
		varSourceMap: new Map(parentCtx.varSourceMap),
		varSourceKind: new Map(parentCtx.varSourceKind),
		httpCounter: 0,
		codeCounter: 0,
		ifCounter: 0,
		switchCounter: 0,
		sibCounter: 0,
		respondCounter: 0,
		wfCounter: 0,
		setCounter: 0,
		pendingStatements: [],
		prevVar: '',
		triggerType: 'manual',
		callbackParams: [],
		errors: parentCtx.errors,
		hasOnErrorAnnotation: false,
		consumedComments: parentCtx.consumedComments,
		inLoopBody: false,
		loopCounter: 0,
		functionDefs: parentCtx.functionDefs,
		compiledFunctions: parentCtx.compiledFunctions,
		compiledLoopBodies: parentCtx.compiledLoopBodies,
		compiledTryCatchBodies: parentCtx.compiledTryCatchBodies,
		execCounter: 0,
		tryCatchCounter: 0,
		errorConnections: [],
	};

	// Generate executeWorkflowTrigger as first node
	const triggerVar = `${prefix}_t0`;
	const triggerSdk = `const ${triggerVar} = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });`;
	ctx.nodes.push({
		varName: triggerVar,
		sdkCode: triggerSdk,
		kind: 'trigger',
		nodeName: triggerNodeName,
	});
	ctx.prevVar = triggerVar;

	// Seed loop variable → trigger node (io kind, so lead.email → $('trigger').first().json.email)
	ctx.varSourceMap.set(loopVar, triggerNodeName);
	ctx.varSourceKind.set(loopVar, 'io');

	// Walk loop body
	const bodyStmts =
		bodyNode.type === 'BlockStatement' && bodyNode.body ? bodyNode.body : [bodyNode];
	walkStatements(ctx, bodyStmts, comments);
	flushPendingCode(ctx);

	// Prefix non-trigger node variables to avoid collision with main workflow
	const renames = new Map<string, string>();
	for (const node of ctx.nodes) {
		if (node.varName === triggerVar) continue;
		renames.set(node.varName, `${prefix}_${node.varName}`);
	}
	for (const node of ctx.nodes) {
		if (node.varName === triggerVar) continue;
		for (const [oldVar, newVar] of renames) {
			node.sdkCode = node.sdkCode.replaceAll(`(${oldVar})`, `(${newVar})`);
			node.sdkCode = node.sdkCode.replace(`const ${oldVar} `, `const ${newVar} `);
		}
		node.varName = renames.get(node.varName) ?? node.varName;
	}

	// Rename error connection variables to match prefixed names
	for (const ec of ctx.errorConnections) {
		ec.sourceVar = renames.get(ec.sourceVar) ?? ec.sourceVar;
		ec.catchChainStartVar = renames.get(ec.catchChainStartVar) ?? ec.catchChainStartVar;
	}

	// Build chain expression
	const nodeVars = ctx.nodes.filter((n) => !n.branchOnly).map((n) => n.varName);
	let chainExpr: string;
	if (nodeVars.length <= 1) {
		chainExpr = nodeVars[0] ?? triggerVar;
	} else {
		chainExpr = nodeVars[0];
		for (let i = 1; i < nodeVars.length; i++) {
			chainExpr += `.to(${nodeVars[i]})`;
		}
	}

	const nodeDeclarations = ctx.nodes.map((n) => n.sdkCode);
	const builderVarName = `${subWfName.replace(/-/g, '_')}Workflow`;
	const builderDeclaration = `const ${builderVarName} = workflow('${subWfName}', '${subWfName}')\n  .add(${chainExpr});`;

	return {
		nodeDeclarations,
		builderDeclaration,
		builderVarName,
		triggerNodeName,
		errorConnections: ctx.errorConnections,
	};
}

// ─── Try/Catch Processing ────────────────────────────────────────────────────

function processTryStatement(
	ctx: TranspilerContext,
	stmt: AcornNode,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	const tryBlock = stmt.block;
	if (!tryBlock?.body) return;

	const tryBodyStmts =
		tryBlock.type === 'BlockStatement' && tryBlock.body ? tryBlock.body : [tryBlock];

	// Check if catch body has statements
	const catchStmts = getCatchStatements(stmt);
	const hasCatchBody = catchStmts.length > 0;

	// Count IO calls in try body
	const ioCount = countIOInBody(tryBlock, ctx.source);

	if (ioCount <= 1) {
		// Case 1/2: Single or no IO in try body → inline with onError markers
		processTryBodyInline(ctx, tryBodyStmts, comments);

		if (hasCatchBody) {
			// Route error output to catch chain
			const tryNodeVar = ctx.prevVar;
			const catchBranch = transpileBranch(ctx, buildBlockFromStmts(catchStmts), comments);

			for (const bn of catchBranch.nodes) {
				ctx.nodes.push({ ...bn, branchOnly: true });
			}

			if (catchBranch.chainExpr) {
				ctx.errorConnections.push({
					sourceVar: tryNodeVar,
					catchChainStartVar: catchBranch.chainExpr,
				});
			}
		}
		// else: empty catch → existing behavior (onError set, no error connection)
	} else {
		// Case 3: Multi-IO in try body → wrap in __tryCatch_ sub-workflow
		flushPendingCode(ctx);
		ctx.tryCatchCounter++;

		const subWfName = `__tryCatch_${ctx.tryCatchCounter}`;

		// Collect captured outer-scope variables used in try body
		const capturedVars = collectCapturedVariables(tryBodyStmts, ctx.varSourceMap);

		// Compile try body as sub-workflow
		const compiled = compileTryCatchBodyAsSubWorkflow(
			subWfName,
			tryBlock,
			capturedVars,
			ctx,
			comments,
		);
		ctx.compiledTryCatchBodies.push(compiled);

		// Emit Set node for captured variables (if any)
		if (capturedVars.length > 0) {
			ctx.setCounter++;
			const setVar = `set${ctx.setCounter}`;
			const setName = `Set ${subWfName} params`;

			const assignments = capturedVars.map((cv, i) => ({
				id: `assign_${i}`,
				name: cv.name,
				type: 'string',
				value: resolveExpressionFromAST(cv.astNode, ctx),
			}));

			const configObj = {
				name: setName,
				parameters: { options: {}, assignments: { assignments } },
				executeOnce: true,
			};

			const configStr = JSON.stringify(configObj, null, 2)
				.split('\n')
				.map((line, i) => (i === 0 ? line : '  ' + line))
				.join('\n');

			const sdkCode = `const ${setVar} = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: ${configStr}
});`;

			ctx.nodes.push({ varName: setVar, sdkCode, kind: 'set', nodeName: setName });
			ctx.prevVar = setVar;
		}

		// Emit Execute Workflow node
		ctx.execCounter++;
		const execVar = `exec${ctx.execCounter}`;

		const execConfig: Record<string, unknown> = {
			name: subWfName,
			parameters: {
				source: 'parameter',
				workflowJson: `__BUILDER_REF__${compiled.builderVarName}`,
				options: {},
			},
			onError: 'continueErrorOutput',
			executeOnce: true,
		};

		let execConfigStr = JSON.stringify(execConfig, null, 2)
			.split('\n')
			.map((line, i) => (i === 0 ? line : '    ' + line))
			.join('\n');
		// Replace the JSON-serialized builder ref with the actual variable reference
		execConfigStr = execConfigStr.replace(
			`"__BUILDER_REF__${compiled.builderVarName}"`,
			compiled.builderVarName,
		);

		const sdkCode = `const ${execVar} = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: ${execConfigStr}
});`;

		ctx.nodes.push({
			varName: execVar,
			sdkCode,
			kind: 'workflow',
			nodeName: subWfName,
		});
		ctx.prevVar = execVar;

		if (hasCatchBody) {
			const catchBranch = transpileBranch(ctx, buildBlockFromStmts(catchStmts), comments);
			for (const bn of catchBranch.nodes) {
				ctx.nodes.push({ ...bn, branchOnly: true });
			}
			if (catchBranch.chainExpr) {
				ctx.errorConnections.push({
					sourceVar: execVar,
					catchChainStartVar: catchBranch.chainExpr,
				});
			}
		}
	}
}

/** Extract catch block statements from a TryStatement node. */
function getCatchStatements(stmt: AcornNode): AcornNode[] {
	if (!stmt.handler) return [];
	const handlerBody = (stmt.handler as AcornNode).body as unknown as AcornNode;
	if (handlerBody?.type === 'BlockStatement' && handlerBody.body) {
		return handlerBody.body;
	}
	return [];
}

/** Build a synthetic BlockStatement-like node from an array of statements. */
function buildBlockFromStmts(stmts: AcornNode[]): AcornNode {
	return {
		type: 'BlockStatement',
		body: stmts,
		start: stmts[0]?.start ?? 0,
		end: stmts[stmts.length - 1]?.end ?? 0,
	};
}

/** Process try body inline (single IO or no IO) — marks IO nodes with onError. */
function processTryBodyInline(
	ctx: TranspilerContext,
	stmts: AcornNode[],
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	for (const tryStmt of stmts) {
		const ioCall = extractIOCall(tryStmt, ctx.source);
		if (ioCall) {
			ioCall.onError = 'continueErrorOutput';
			processIOCall(ctx, ioCall);
		} else {
			const nestedIO = findNestedIO(tryStmt, ctx.source);
			if (nestedIO.length > 0) {
				for (const nio of nestedIO) {
					nio.onError = 'continueErrorOutput';
					processIOCall(ctx, nio);
				}
			} else if (tryStmt.type === 'IfStatement') {
				processIfStatement(ctx, tryStmt, comments);
			} else {
				const stmtSource = ctx.source.slice(tryStmt.start, tryStmt.end);
				const tryBaseIndent = getBaseIndent(ctx.source, tryStmt.start);
				ctx.pendingStatements.push({
					source: dedentSource(stmtSource, tryBaseIndent),
					ast: tryStmt,
				});
			}
		}
	}
}

interface CapturedVariable {
	name: string;
	astNode: AcornNode;
}

/** Walk try body AST for Identifier references that exist in varSourceMap (outer scope). */
function collectCapturedVariables(
	stmts: AcornNode[],
	varSourceMap: Map<string, string>,
): CapturedVariable[] {
	const found = new Map<string, AcornNode>();

	function walk(node: AcornNode): void {
		if (!node) return;

		if (node.type === 'Identifier' && node.name) {
			if (varSourceMap.has(node.name) && !found.has(node.name)) {
				found.set(node.name, node);
			}
		}

		// Recurse into child nodes
		if (node.body && Array.isArray(node.body)) {
			for (const child of node.body) walk(child);
		}
		if (node.expression) walk(node.expression);
		if (node.argument) walk(node.argument);
		if (node.init) walk(node.init);
		if (node.declarations) {
			for (const d of node.declarations) walk(d);
		}
		if (node.arguments) {
			for (const a of node.arguments) walk(a);
		}
		if (node.consequent) {
			if (Array.isArray(node.consequent)) {
				for (const c of node.consequent) walk(c);
			} else {
				walk(node.consequent);
			}
		}
		if (node.alternate) walk(node.alternate);
		if (node.left) walk(node.left);
		if (node.right) walk(node.right);
		if (node.test) walk(node.test);
		if (node.object) walk(node.object);
		if (node.property) walk(node.property as AcornNode);
		if (node.callee) walk(node.callee);
		if (node.elements) {
			for (const e of node.elements) if (e) walk(e);
		}
		if (node.properties) {
			for (const p of node.properties) {
				if (p.value) walk(p.value as unknown as AcornNode);
			}
		}
		if (node.block) walk(node.block);
		if (node.handler) walk(node.handler as unknown as AcornNode);
	}

	for (const s of stmts) walk(s);

	return Array.from(found.entries()).map(([name, astNode]) => ({ name, astNode }));
}

/**
 * Compile a try body into an inline sub-workflow for wrapping in Execute Workflow.
 * Similar to compileLoopBodyAsSubWorkflow but for try/catch.
 */
function compileTryCatchBodyAsSubWorkflow(
	subWfName: string,
	bodyNode: AcornNode,
	capturedVars: CapturedVariable[],
	parentCtx: TranspilerContext,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): CompiledFunction {
	const prefix = `tc_${subWfName.replace(/__/g, '')}`;
	const triggerNodeName = 'When Executed by Another Workflow';

	const ctx: TranspilerContext = {
		source: parentCtx.source,
		nodes: [],
		varSourceMap: new Map(parentCtx.varSourceMap),
		varSourceKind: new Map(parentCtx.varSourceKind),
		httpCounter: 0,
		codeCounter: 0,
		ifCounter: 0,
		switchCounter: 0,
		sibCounter: 0,
		respondCounter: 0,
		wfCounter: 0,
		setCounter: 0,
		pendingStatements: [],
		prevVar: '',
		triggerType: 'manual',
		callbackParams: [],
		errors: parentCtx.errors,
		hasOnErrorAnnotation: false,
		consumedComments: parentCtx.consumedComments,
		inLoopBody: false,
		loopCounter: 0,
		functionDefs: parentCtx.functionDefs,
		compiledFunctions: parentCtx.compiledFunctions,
		compiledLoopBodies: [],
		compiledTryCatchBodies: [],
		execCounter: 0,
		tryCatchCounter: 0,
		errorConnections: [],
	};

	// Generate executeWorkflowTrigger as first node
	const triggerVar = `${prefix}_t0`;
	const triggerSdk = `const ${triggerVar} = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });`;
	ctx.nodes.push({
		varName: triggerVar,
		sdkCode: triggerSdk,
		kind: 'trigger',
		nodeName: triggerNodeName,
	});
	ctx.prevVar = triggerVar;

	// Seed captured variables → trigger node with 'code' kind
	for (const cv of capturedVars) {
		ctx.varSourceMap.set(cv.name, triggerNodeName);
		ctx.varSourceKind.set(cv.name, 'code');
	}

	// Walk try body
	const bodyStmts =
		bodyNode.type === 'BlockStatement' && bodyNode.body ? bodyNode.body : [bodyNode];
	walkStatements(ctx, bodyStmts, comments);
	flushPendingCode(ctx);

	// Prefix non-trigger node variables
	const renames = new Map<string, string>();
	for (const node of ctx.nodes) {
		if (node.varName === triggerVar) continue;
		renames.set(node.varName, `${prefix}_${node.varName}`);
	}
	for (const node of ctx.nodes) {
		if (node.varName === triggerVar) continue;
		for (const [oldVar, newVar] of renames) {
			node.sdkCode = node.sdkCode.replaceAll(`(${oldVar})`, `(${newVar})`);
			node.sdkCode = node.sdkCode.replace(`const ${oldVar} `, `const ${newVar} `);
		}
		node.varName = renames.get(node.varName) ?? node.varName;
	}

	// Rename error connection variables to match prefixed names
	for (const ec of ctx.errorConnections) {
		ec.sourceVar = renames.get(ec.sourceVar) ?? ec.sourceVar;
		ec.catchChainStartVar = renames.get(ec.catchChainStartVar) ?? ec.catchChainStartVar;
	}

	// Build chain expression
	const nodeVars = ctx.nodes.filter((n) => !n.branchOnly).map((n) => n.varName);
	let chainExpr: string;
	if (nodeVars.length <= 1) {
		chainExpr = nodeVars[0] ?? triggerVar;
	} else {
		chainExpr = nodeVars[0];
		for (let i = 1; i < nodeVars.length; i++) {
			chainExpr += `.to(${nodeVars[i]})`;
		}
	}

	const nodeDeclarations = ctx.nodes.map((n) => n.sdkCode);
	const builderVarName = `${subWfName.replace(/-/g, '_')}Workflow`;
	const builderDeclaration = `const ${builderVarName} = workflow('${subWfName}', '${subWfName}')\n  .add(${chainExpr});`;

	return {
		nodeDeclarations,
		builderDeclaration,
		builderVarName,
		triggerNodeName,
		errorConnections: ctx.errorConnections,
	};
}

// ─── Nested IO Detection ─────────────────────────────────────────────────────

function findNestedIO(stmt: AcornNode, source: string): IOCall[] {
	const results: IOCall[] = [];

	function walk(node: AcornNode): void {
		const io = extractIOCall(node, source);
		if (io) {
			results.push(io);
			return;
		}

		if (node.type === 'IfStatement') {
			if (node.consequent) walkBlock(node.consequent as AcornNode);
			if (node.alternate) walkBlock(node.alternate);
		} else if (
			node.type === 'ForOfStatement' ||
			node.type === 'ForInStatement' ||
			node.type === 'ForStatement'
		) {
			const body = (node as unknown as { body: AcornNode }).body;
			if (body) walkBlock(body);
		} else if (node.type === 'TryStatement') {
			if (node.block) walkBlock(node.block);
			if (node.handler) {
				const handlerBody = (node.handler as AcornNode).body as unknown as AcornNode;
				if (handlerBody) walkBlock(handlerBody);
			}
		} else if (node.type === 'BlockStatement' && node.body) {
			for (const s of node.body) walk(s);
		}
	}

	function walkBlock(node: AcornNode): void {
		if (node.type === 'BlockStatement' && node.body) {
			for (const s of node.body) walk(s);
		} else {
			walk(node);
		}
	}

	walk(stmt);
	return results;
}

// ─── IO Call Extraction ──────────────────────────────────────────────────────

function extractIOCall(stmt: AcornNode, source: string): IOCall | null {
	// const x = await http.get(...) / const x = await workflow.run(...)
	if (stmt.type === 'VariableDeclaration' && stmt.declarations) {
		for (const decl of stmt.declarations) {
			if (decl.init?.type === 'AwaitExpression' && decl.init.argument) {
				const call = decl.init.argument;
				const io = matchIOCallNode(call, source);
				if (io) {
					io.assignedVar = decl.id?.name ?? null;
					return io;
				}
			}
		}
	}

	// await http.post(...) / await workflow.run(...)
	if (stmt.type === 'ExpressionStatement' && stmt.expression) {
		const expr = stmt.expression;
		if (expr.type === 'AwaitExpression' && expr.argument) {
			return matchIOCallNode(expr.argument, source);
		}
		// existing = await http.get(...) / result = await workflow.run(...)
		if (
			expr.type === 'AssignmentExpression' &&
			expr.right?.type === 'AwaitExpression' &&
			expr.right.argument
		) {
			const io = matchIOCallNode(expr.right.argument, source);
			if (io) {
				io.assignedVar = expr.left?.name ?? null;
				return io;
			}
		}
	}

	return null;
}

function matchIOCallNode(callNode: AcornNode, source: string): IOCall | null {
	if (callNode.type !== 'CallExpression' || !callNode.callee) return null;
	const callee = callNode.callee;

	// Pattern: new ClassName({...}).method() — AI class-based syntax
	if (
		callee.type === 'MemberExpression' &&
		callee.object?.type === 'NewExpression' &&
		callee.object.callee?.type === 'Identifier' &&
		callee.property?.type === 'Identifier'
	) {
		const className = callee.object.callee.name ?? '';
		const ioMethod = callee.property.name ?? '';
		const knownMethods = getKnownIoMethods();
		if (knownMethods.has(ioMethod)) {
			const entry = classNameToEntry(className);
			if (entry) {
				return extractAiClassCall(callee.object, ioMethod, entry, className);
			}
		}
	}

	if (
		callee.type !== 'MemberExpression' ||
		callee.object?.type !== 'Identifier' ||
		callee.property?.type !== 'Identifier'
	) {
		return null;
	}

	const obj = callee.object.name ?? '';
	const method = callee.property.name ?? '';

	if (obj === 'http' && ['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
		return extractHttpCall(callNode, method, source);
	}

	if (obj === 'workflow' && method === 'run') {
		return extractWorkflowRunCall(callNode);
	}

	return null;
}

function extractHttpCall(callNode: AcornNode, method: string, _source: string): IOCall {
	const args = callNode.arguments ?? [];
	const url = args[0] ? extractStringLiteral(args[0]) : undefined;

	let body: Record<string, unknown> | null = null;
	let bodyExpression: string | undefined;
	let options: Record<string, unknown> | undefined;

	if (method === 'get' || method === 'delete') {
		if (args[1]) options = extractObjectLiteral(args[1]);
	} else {
		if (args[1]) {
			body = extractObjectLiteral(args[1]) ?? null;
			if (!body && args[1].type === 'Identifier') {
				bodyExpression = args[1].name;
			}
		}
		if (args[2]) options = extractObjectLiteral(args[2]);
	}

	// Extract credentials from auth option
	let credentials: IOCall['credentials'];
	if (options?.auth) {
		const auth = options.auth;
		if (typeof auth === 'object' && auth !== null) {
			const authObj = auth as Record<string, unknown>;
			credentials = {
				type: (authObj.type as string) ?? 'bearer',
				credential: (authObj.credential as string) ?? '',
			};
		}
		delete options.auth;
	}

	// Generate node name from URL
	let nodeName: string;
	try {
		if (url && !url.startsWith('={{')) {
			const urlObj = new URL(url);
			nodeName = `${method.toUpperCase()} ${urlObj.hostname}${urlObj.pathname}`;
		} else {
			nodeName = `${method.toUpperCase()} Request`;
		}
	} catch {
		nodeName = `${method.toUpperCase()} Request`;
	}
	if (nodeName.length > 40) nodeName = nodeName.slice(0, 37) + '...';

	return {
		type: 'http',
		method,
		assignedVar: null,
		url,
		body,
		bodyExpression,
		options,
		nodeName,
		credentials,
	};
}

/**
 * Parse `new ClassName({...})` AST node to extract an AiSubnodeInfo.
 * Returns undefined if the node isn't a recognized AI class constructor.
 */
function parseAiSubnodeExpression(node: AcornNode): AiSubnodeInfo | undefined {
	if (node.type !== 'NewExpression' || node.callee?.type !== 'Identifier') return undefined;
	const className = node.callee.name ?? '';
	const entry = classNameToEntry(className);
	if (!entry) return undefined;
	const config = node.arguments?.[0] ? (extractObjectLiteral(node.arguments[0]) ?? {}) : {};
	return { className, entry, config };
}

/**
 * Extract an AI class-based IOCall from `new Agent({...}).chat()` or similar.
 *
 * Agent gets sugar: prompt → text, model/tools/outputParser/memory lifted from config as subnodes.
 * All other root AI nodes: config passed through as-is except for known subnode fields.
 */
function extractAiClassCall(
	newExpr: AcornNode,
	ioMethod: string,
	rootEntry: AiNodeEntry,
	rootClassName: string,
): IOCall {
	const configNode = newExpr.arguments?.[0];
	const rawConfig = configNode ? (extractObjectLiteral(configNode) ?? {}) : {};

	// Parse subnodes from config (model, tools, outputParser, memory)
	let aiModel: AiSubnodeInfo | undefined;
	let aiToolSubnodes: AiSubnodeInfo[] | undefined;
	let aiOutputParserSubnode: AiSubnodeInfo | undefined;
	let aiMemorySubnode: AiSubnodeInfo | undefined;

	// Extract subnodes from AST (we need AST, not extracted values, to detect new XxxNode(...))
	if (configNode?.type === 'ObjectExpression' && configNode.properties) {
		for (const prop of configNode.properties) {
			const key = prop.key?.name ?? prop.key?.value;
			const propVal = prop.value as AcornNode | undefined;
			if (key === 'model' && propVal?.type === 'NewExpression') {
				aiModel = parseAiSubnodeExpression(propVal);
			}
			if (key === 'outputParser' && propVal?.type === 'NewExpression') {
				aiOutputParserSubnode = parseAiSubnodeExpression(propVal);
			}
			if (key === 'memory' && propVal?.type === 'NewExpression') {
				aiMemorySubnode = parseAiSubnodeExpression(propVal);
			}
			if (key === 'tools' && propVal?.type === 'ArrayExpression' && propVal.elements) {
				aiToolSubnodes = [];
				for (const el of propVal.elements) {
					if (el.type === 'NewExpression') {
						const sub = parseAiSubnodeExpression(el);
						if (sub) aiToolSubnodes.push(sub);
					}
				}
			}
		}
	}

	// Extract prompt for Agent sugar
	const isAgent = rootEntry.category === 'agent';
	const prompt = isAgent ? ((rawConfig.prompt as string) ?? '') : '';

	const shortPrompt = prompt ? prompt.slice(0, 30) : 'AI Chat';
	const nodeName = isAgent ? `AI: ${shortPrompt}` : rootClassName;
	const truncName = nodeName.length > 40 ? nodeName.slice(0, 37) + '...' : nodeName;

	return {
		type: 'ai',
		method: ioMethod,
		assignedVar: null,
		prompt,
		nodeName: truncName,
		aiRootEntry: rootEntry,
		aiRootClassName: rootClassName,
		aiRootConfig: rawConfig,
		aiModel,
		aiToolSubnodes,
		aiOutputParserSubnode,
		aiMemorySubnode,
	};
}

function extractWorkflowRunCall(callNode: AcornNode): IOCall {
	const args = callNode.arguments ?? [];
	const workflowName = args[0] ? extractStringLiteral(args[0]) : 'Sub-Workflow';

	return {
		type: 'workflow',
		method: 'run',
		assignedVar: null,
		workflowName,
		nodeName: `Run: ${workflowName}`,
	};
}

// ─── AST Value Extraction ────────────────────────────────────────────────────

function extractStringLiteral(node: AcornNode): string | undefined {
	if (node.type === 'Literal' && typeof node.value === 'string') {
		return node.value;
	}
	if (node.type === 'TemplateLiteral') {
		const quasis = node.quasis ?? [];
		const parts: string[] = [];
		for (const q of quasis) {
			parts.push((q.value as unknown as string) ?? q.raw ?? '');
		}
		return parts.join('');
	}
	return undefined;
}

function extractArrayElements(elements: AcornNode[]): unknown[] {
	return elements.map((el: AcornNode) => {
		if (el.type === 'ObjectExpression') return extractObjectLiteral(el);
		if (el.type === 'Literal') return el.value;
		if (el.type === 'ArrayExpression' && el.elements) return extractArrayElements(el.elements);
		if (el.type === 'MemberExpression') {
			const chain = extractMemberChain(el);
			return chain ? `={{ $json.${chain} }}` : '={{$json}}';
		}
		return extractStringLiteral(el);
	});
}

function extractObjectLiteral(node: AcornNode): Record<string, unknown> | undefined {
	if (node.type !== 'ObjectExpression' || !node.properties) return undefined;

	const obj: Record<string, unknown> = {};
	for (const prop of node.properties) {
		if (prop.type === 'Property' && prop.key) {
			const key = prop.key.name ?? (prop.key.value as string);
			const valNode = (prop as unknown as { value: AcornNode }).value;
			if (key && valNode) {
				if (valNode.type === 'Literal') {
					obj[key] = valNode.value;
				} else if (valNode.type === 'Identifier') {
					obj[key] = `={{ $json.${valNode.name} }}`;
				} else if (valNode.type === 'ObjectExpression') {
					obj[key] = extractObjectLiteral(valNode);
				} else if (valNode.type === 'ArrayExpression' && valNode.elements) {
					obj[key] = extractArrayElements(valNode.elements);
				} else if (valNode.type === 'MemberExpression') {
					const chain = extractMemberChain(valNode);
					obj[key] = chain ? `={{ $json.${chain} }}` : '={{$json}}';
				} else {
					const strVal = extractStringLiteral(valNode);
					obj[key] = strVal ?? '={{$json}}';
				}
			}
		}
	}
	return obj;
}

/** Serialize a MemberExpression AST node into a dotted property chain string. */
function extractMemberChain(node: AcornNode): string | null {
	if (node.type === 'Identifier') return node.name as string;
	if (node.type === 'MemberExpression') {
		const obj = extractMemberChain(node.object as AcornNode);
		if (!obj) return null;
		if (node.computed) {
			if (node.property?.type === 'Literal') {
				return `${obj}[${JSON.stringify(node.property.value)}]`;
			}
			return null;
		}
		const prop = node.property?.name as string;
		return prop ? `${obj}.${prop}` : null;
	}
	return null;
}

// ─── Variable Analysis ───────────────────────────────────────────────────────

interface VarReference {
	varName: string;
	sourceNode: string;
	kind?: 'io' | 'code';
}

function findReferencedVars(
	code: string,
	varSourceMap: Map<string, string>,
	varSourceKind?: Map<string, 'io' | 'code'>,
): VarReference[] {
	const refs: VarReference[] = [];
	const seen = new Set<string>();
	for (const [varName, sourceNode] of varSourceMap) {
		const regex = new RegExp(`\\b${varName}\\b`);
		if (regex.test(code) && !seen.has(varName)) {
			refs.push({ varName, sourceNode, kind: varSourceKind?.get(varName) });
			seen.add(varName);
		}
	}
	return refs;
}

/**
 * Parse a JSDoc @example annotation value as a JSON array.
 * Input is the raw block comment value (everything between /* and *​/).
 * Supports both strict JSON and relaxed JS object literals (unquoted keys, single-quoted values).
 * Returns the parsed array or null if malformed.
 */
function parseExampleAnnotation(commentValue: string): unknown[] | null {
	// Strip JSDoc * prefixes from each line and join
	const cleaned = commentValue
		.split('\n')
		.map((line) => line.replace(/^\s*\*\s?/, ''))
		.join('\n');

	// Find @example tag and extract everything after it
	const idx = cleaned.indexOf('@example');
	if (idx === -1) return null;

	let jsonStr = cleaned.slice(idx + '@example'.length).trim();
	if (!jsonStr) return null;

	// Normalize relaxed JS syntax to valid JSON:
	// 1. Quote unquoted keys: { key: value } → { "key": value }
	jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
	// 2. Replace single-quoted strings with double-quoted
	jsonStr = jsonStr.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

	try {
		const parsed: unknown = JSON.parse(jsonStr);
		if (Array.isArray(parsed)) return parsed;
		// Wrap single objects in array
		if (typeof parsed === 'object' && parsed !== null) return [parsed];
		return null;
	} catch {
		return null;
	}
}

/** Compute the tab indentation at position `pos` by scanning backwards. */
function getBaseIndent(fullSource: string, pos: number): number {
	let indent = 0;
	let p = pos - 1;
	while (p >= 0 && fullSource[p] === '\t') {
		indent++;
		p--;
	}
	// Only count if we hit a newline (or start of string) — i.e. these tabs are leading
	if (p >= 0 && fullSource[p] !== '\n' && fullSource[p] !== '\r') return 0;
	return indent;
}

/** Strip `baseIndent` tabs from continuation lines of a sliced source snippet. */
function dedentSource(source: string, baseIndent: number): string {
	if (baseIndent <= 0) return source.trim();
	const lines = source.split('\n');
	return lines
		.map((line, i) => {
			if (i === 0) return line; // First line already has no leading indent (sliced from AST start)
			if (!line.trim()) return '';
			const tabs = line.match(/^\t*/)?.[0].length ?? 0;
			return line.slice(Math.min(baseIndent, tabs));
		})
		.join('\n')
		.trim();
}

function findDeclaredVars(code: string): string[] {
	const vars: string[] = [];
	const regex = /\b(?:const|let|var)\s+(?:\{([^}]+)\}|(\w+))/g;
	let match;
	while ((match = regex.exec(code)) !== null) {
		if (match[1]) {
			for (const part of match[1].split(',')) {
				const name = part.trim().split(':')[0].trim().split('=')[0].trim();
				if (name) vars.push(name);
			}
		} else if (match[2]) {
			vars.push(match[2]);
		}
	}
	return vars;
}

// ─── Static Assignment Detection ─────────────────────────────────────────────

interface StaticAssignment {
	varName: string;
	type: 'string' | 'number' | 'boolean';
	value: string | number | boolean;
}

function tryExtractStaticAssignment(ast: AcornNode): StaticAssignment | null {
	if (ast.type !== 'VariableDeclaration') return null;
	if (!ast.declarations || ast.declarations.length !== 1) return null;
	const decl = ast.declarations[0];
	if (decl.id?.type !== 'Identifier' || !decl.id.name) return null;
	if (decl.init?.type !== 'Literal') return null;
	const val = decl.init.value;
	if (typeof val === 'string') return { varName: decl.id.name, type: 'string', value: val };
	if (typeof val === 'number') return { varName: decl.id.name, type: 'number', value: val };
	if (typeof val === 'boolean') return { varName: decl.id.name, type: 'boolean', value: val };
	return null;
}

// ─── Set Node Emission ───────────────────────────────────────────────────────

function emitSetNode(ctx: TranspilerContext, assignments: StaticAssignment[]): void {
	ctx.setCounter++;
	const setVar = `set${ctx.setCounter}`;
	const nodeName =
		assignments.length === 1 ? `Set ${assignments[0].varName}` : `Set Variables ${ctx.setCounter}`;

	const configObj = {
		name: nodeName,
		parameters: {
			options: {},
			assignments: {
				assignments: assignments.map((a, i) => ({
					id: `assign_${i}`,
					name: a.varName,
					type: a.type,
					value: a.value,
				})),
			},
		},
		executeOnce: true,
	};

	const configStr = JSON.stringify(configObj, null, 2)
		.split('\n')
		.map((line, i) => (i === 0 ? line : '  ' + line))
		.join('\n');

	const sdkCode = `const ${setVar} = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: ${configStr}
});`;

	ctx.nodes.push({ varName: setVar, sdkCode, kind: 'set', nodeName });

	for (const a of assignments) {
		ctx.varSourceMap.set(a.varName, nodeName);
		ctx.varSourceKind.set(a.varName, 'code');
	}

	ctx.pendingStatements = [];
	ctx.prevVar = setVar;
}

// ─── Code Flushing ───────────────────────────────────────────────────────────

function flushPendingCode(ctx: TranspilerContext): void {
	if (ctx.pendingStatements.length === 0) return;

	// Check if all pending statements are static scalar assignments → emit Set node
	const statics: StaticAssignment[] = [];
	for (const { ast } of ctx.pendingStatements) {
		const sa = tryExtractStaticAssignment(ast);
		if (!sa) {
			statics.length = 0;
			break;
		}
		statics.push(sa);
	}
	if (statics.length > 0) {
		emitSetNode(ctx, statics);
		return;
	}

	ctx.codeCounter++;
	const codeVar = `code${ctx.codeCounter}`;
	// Join statements, preserving blank lines that existed in the original source
	const codeParts: string[] = [];
	for (let i = 0; i < ctx.pendingStatements.length; i++) {
		if (i > 0) {
			const prevEnd = ctx.pendingStatements[i - 1].ast.end;
			const curStart = ctx.pendingStatements[i].ast.start;
			const gap = ctx.source.slice(prevEnd, curStart);
			const newlines = (gap.match(/\n/g) || []).length;
			codeParts.push(newlines >= 2 ? '\n\n' : '\n');
		}
		codeParts.push(ctx.pendingStatements[i].source);
	}
	const codeSource = codeParts.join('');
	const referencedVars = findReferencedVars(codeSource, ctx.varSourceMap, ctx.varSourceKind);
	const jsCodeLines: string[] = [];

	if (referencedVars.length > 0) {
		jsCodeLines.push(`// From: ${referencedVars[0].sourceNode}`);
	}

	for (const { varName, sourceNode, kind } of referencedVars) {
		// Use .first().json for IO-kind vars (webhook params, IO call results) for single-item access
		// Use .all().map() for code-kind vars (variables from Code nodes) for array access
		if (kind === 'io') {
			jsCodeLines.push(`const ${varName} = $('${sourceNode}').first().json;`);
		} else {
			jsCodeLines.push(`const ${varName} = $('${sourceNode}').all().map(i => i.json);`);
		}
	}

	// Escape backslashes and backticks in user code for safe embedding in template literal
	const escapedCodeSource = codeSource
		.replace(/\\/g, '\\\\')
		.replace(/`/g, '\\`')
		.replace(/\$\{/g, '\\${');
	jsCodeLines.push(escapedCodeSource);

	const declaredVars = findDeclaredVars(codeSource);
	if (declaredVars.length > 0) {
		jsCodeLines.push(`return [{ json: { ${declaredVars.join(', ')} } }];`);
	} else {
		jsCodeLines.push(`return [{ json: {} }];`);
	}

	const jsCode = jsCodeLines.join('\\n');
	const nodeName = `Code ${ctx.codeCounter}`;

	const sdkCode = `const ${codeVar} = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: '${nodeName}',
    parameters: {
      jsCode: \`${jsCode}\`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});`;

	ctx.nodes.push({ varName: codeVar, sdkCode, kind: 'code', nodeName });

	for (const v of declaredVars) {
		ctx.varSourceMap.set(v, nodeName);
		ctx.varSourceKind.set(v, 'code');
	}

	ctx.pendingStatements = [];
	ctx.prevVar = codeVar;
}

// ─── SDK Code Generation ─────────────────────────────────────────────────────

function generateTriggerSDK(cb: CallbackInfo, varName: string): EmittedNode {
	const triggerEntry = TRIGGER_TYPES[cb.triggerType] ?? TRIGGER_TYPES.manual;
	const triggerInfo = { type: triggerEntry.nodeType, version: triggerEntry.version };
	const configParams = mapTriggerParams(cb);

	// If webhook callback has `respond` param, set responseMode
	if (cb.triggerType === 'webhook' && cb.callbackParams.includes('respond')) {
		configParams.responseMode = 'responseNode';
	}

	const configParts: string[] = [];
	if (Object.keys(configParams).length > 0) {
		configParts.push(`parameters: ${JSON.stringify(configParams)}`);
	}
	if (cb.pinData) {
		configParts.push(`pinData: ${JSON.stringify(cb.pinData)}`);
	}

	const configBody = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';
	// Derive node name from trigger type the same way the SDK builder does
	const typeParts = triggerInfo.type.split('.');
	const rawName = typeParts[typeParts.length - 1];
	const nodeName = rawName
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/^./, (s) => s.toUpperCase());
	const sdkCode = `const ${varName} = trigger({ type: '${triggerInfo.type}', version: ${triggerInfo.version}, config: ${configBody} });`;

	return { varName, sdkCode, kind: 'trigger', nodeName };
}

function mapTriggerParams(cb: CallbackInfo): Record<string, unknown> {
	if (cb.triggerType === 'schedule') return mapScheduleOptions(cb.triggerOptions);
	if (cb.triggerType === 'webhook') return mapWebhookOptions(cb.triggerOptions);
	return {};
}

function mapScheduleOptions(options: Record<string, unknown>): Record<string, unknown> {
	return toScheduleRule(options);
}

function mapWebhookOptions(options: Record<string, unknown>): Record<string, unknown> {
	const params: Record<string, unknown> = {};
	if (options.method) params.httpMethod = (options.method as string).toUpperCase();
	if (options.path) params.path = options.path;
	if (options.response) params.responseMode = options.response;
	return params;
}

function generateHttpSDK(
	io: IOCall,
	varName: string,
	ctx: TranspilerContext,
	options?: { skipExecuteOnce?: boolean },
): EmittedNode {
	const method = io.method.toUpperCase();
	const url = io.url ?? '{{dynamic URL}}';

	const params: Record<string, unknown> = { method, url, options: {} };

	if (['POST', 'PUT', 'PATCH'].includes(method)) {
		if (io.bodyExpression) {
			params.sendBody = true;
			params.contentType = 'json';
			params.specifyBody = 'json';
			params.jsonBody = resolveJsonRefs(`={{ $json.${io.bodyExpression} }}`, ctx);
		} else if (io.body) {
			params.sendBody = true;
			params.contentType = 'json';
			params.specifyBody = 'json';
			params.jsonBody = resolveJsonRefs(JSON.stringify(io.body), ctx);
		}
	}

	if (io.options?.headers) {
		params.sendHeaders = true;
		params.headerParameters = {
			parameters: Object.entries(io.options.headers as Record<string, string>).map(
				([name, value]) => ({ name, value }),
			),
		};
	}
	if (io.options?.query) {
		params.sendQuery = true;
		params.queryParameters = {
			parameters: Object.entries(io.options.query as Record<string, string>).map(
				([name, value]) => ({ name, value }),
			),
		};
	}

	// Credentials
	let credentialsStr = '';
	if (io.credentials) {
		const credType = AUTH_TYPE_TO_CREDENTIAL[io.credentials.type] ?? 'httpHeaderAuth';
		params.authentication = 'genericCredentialType';
		params.genericAuthType = credType;
		credentialsStr = `, credentials: { ${credType}: { name: '${io.credentials.credential}', id: '' } }`;
	}

	const configObj: Record<string, unknown> = {
		name: io.nodeName,
		parameters: params,
	};
	if (!options?.skipExecuteOnce) {
		configObj.executeOnce = true;
	}
	if (io.onError) {
		configObj.onError = io.onError;
	}
	if (io.pinData) {
		configObj.pinData = io.pinData;
	}

	const configStr = JSON.stringify(configObj, null, 2)
		.split('\n')
		.map((line, i) => (i === 0 ? line : '  ' + line))
		.join('\n');

	// Insert credentials into config string if present
	let finalConfig = configStr;
	if (credentialsStr) {
		// Insert before the last }
		finalConfig = configStr.slice(0, -1) + credentialsStr + '\n}';
	}

	const sdkCode = `const ${varName} = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: ${finalConfig}
});`;

	return { varName, sdkCode, kind: 'http', nodeName: io.nodeName };
}

function generateAiSDK(io: IOCall, varName: string): EmittedNode {
	return generateAiClassSDK(io, varName);
}

/**
 * Normalize subnode config for SDK emission.
 * For model subnodes: wrap `model` field in `__rl` resource locator, ensure `options` exists.
 * For all subnodes: pass through as-is.
 */
function normalizeSubnodeConfig(
	config: Record<string, unknown>,
	category: string,
): Record<string, unknown> {
	if (category === 'model' || category === 'completionModel') {
		const result = { ...config };
		// Wrap model string in __rl resource locator
		if (typeof result.model === 'string') {
			result.model = { __rl: true, mode: 'id', value: result.model };
		}
		// Ensure options exists (schema expects it)
		if (!result.options) result.options = {};
		return result;
	}
	return config;
}

/** Generate SDK from class-based AI syntax (new Agent({...}).chat()) */
function generateAiClassSDK(io: IOCall, varName: string): EmittedNode {
	const rootEntry = io.aiRootEntry!;
	const isAgent = rootEntry.category === 'agent';
	const prompt = io.prompt ?? '';

	// Build subnodes
	const subnodeParts: string[] = [];

	// Model subnode
	if (io.aiModel) {
		const m = io.aiModel;
		const normalizedConfig = normalizeSubnodeConfig(m.config, m.entry.category);
		subnodeParts.push(`      model: languageModel({
        type: '${m.entry.nodeType}', version: ${m.entry.version},
        config: { parameters: ${JSON.stringify(normalizedConfig)} }
      })`);
	}

	// Tools subnodes
	if (io.aiToolSubnodes && io.aiToolSubnodes.length > 0) {
		const toolStrs = io.aiToolSubnodes.map((t) => {
			return `tool({
          type: '${t.entry.nodeType}', version: ${t.entry.version},
          config: { parameters: ${JSON.stringify(t.config)} }
        })`;
		});
		subnodeParts.push(`      tools: [${toolStrs.join(', ')}]`);
	}

	// Output parser subnode
	if (io.aiOutputParserSubnode) {
		const p = io.aiOutputParserSubnode;
		subnodeParts.push(`      outputParser: outputParser({
        type: '${p.entry.nodeType}', version: ${p.entry.version},
        config: { parameters: ${JSON.stringify(p.config)} }
      })`);
	}

	// Memory subnode
	if (io.aiMemorySubnode) {
		const mem = io.aiMemorySubnode;
		subnodeParts.push(`      memory: memory({
        type: '${mem.entry.nodeType}', version: ${mem.entry.version},
        config: { parameters: ${JSON.stringify(mem.config)} }
      })`);
	}

	const subnodeBlock = subnodeParts.join(',\n');
	const onErrorStr = io.onError ? `,\n    onError: '${io.onError}'` : '';
	const pinDataStr = io.pinData ? `,\n    pinData: ${JSON.stringify(io.pinData)}` : '';
	const hasOutputParser = io.aiOutputParserSubnode ? ',\n      hasOutputParser: true' : '';

	// Build parameters
	let parametersBlock: string;
	if (isAgent) {
		// Agent sugar: prompt → text + promptType
		parametersBlock = `{
      promptType: 'define',
      text: '${prompt.replace(/'/g, "\\'")}',
      options: {}${hasOutputParser}
    }`;
	} else {
		// Non-agent root nodes: passthrough config (minus subnodes)
		const params = { ...(io.aiRootConfig ?? {}) };
		delete params.model;
		delete params.tools;
		delete params.outputParser;
		delete params.memory;
		parametersBlock = JSON.stringify(params);
	}

	const subnodeSection =
		subnodeParts.length > 0 ? `,\n    subnodes: {\n${subnodeBlock}\n    }` : '';

	const sdkCode = `const ${varName} = node({
  type: '${rootEntry.nodeType}', version: ${rootEntry.version},
  config: {
    name: '${io.nodeName.replace(/'/g, "\\'")}',
    parameters: ${parametersBlock}${subnodeSection},
    executeOnce: true${onErrorStr}${pinDataStr}
  }
});`;

	return { varName, sdkCode, kind: 'ai', nodeName: io.nodeName };
}

function generateWorkflowRunSDK(io: IOCall, varName: string): EmittedNode {
	const wfName = io.workflowName ?? 'Sub-Workflow';

	const sdkCode = `const ${varName} = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.2,
  config: {
    name: '${io.nodeName.replace(/'/g, "\\'")}',
    parameters: {
      workflowId: { __rl: true, mode: 'name', value: '${wfName}' }
    },
    executeOnce: true
  }
});`;

	return { varName, sdkCode, kind: 'workflow', nodeName: io.nodeName };
}

// ─── Final SDK Code Assembly ─────────────────────────────────────────────────

function generateSDKCode(
	allNodes: EmittedNode[],
	allChains: string[],
	compiledFunctions?: Map<string, CompiledFunction>,
	compiledLoopBodies?: CompiledFunction[],
	compiledTryCatchBodies?: CompiledFunction[],
	errorConnections?: Array<{ sourceVar: string; catchChainStartVar: string }>,
): string {
	const lines: string[] = [];

	// Determine imports
	const usedFactories = new Set<string>();
	usedFactories.add('workflow');
	for (const n of allNodes) {
		switch (n.kind) {
			case 'trigger':
				usedFactories.add('trigger');
				break;
			case 'http':
			case 'code':
			case 'set':
			case 'respond':
			case 'workflow':
				usedFactories.add('node');
				break;
			case 'ai':
				usedFactories.add('node');
				usedFactories.add('languageModel');
				// Check for subnodes in SDK code
				if (n.sdkCode.includes('tool(')) usedFactories.add('tool');
				if (n.sdkCode.includes('outputParser(')) usedFactories.add('outputParser');
				if (n.sdkCode.includes('memory(')) usedFactories.add('memory');
				break;
			case 'ifElse':
				usedFactories.add('ifElse');
				break;
			case 'switchCase':
				usedFactories.add('switchCase');
				break;
		}
	}

	// Sub-workflow declarations: compiled functions
	const hasSubWorkflows =
		(compiledFunctions && compiledFunctions.size > 0) ||
		(compiledLoopBodies && compiledLoopBodies.length > 0) ||
		(compiledTryCatchBodies && compiledTryCatchBodies.length > 0);

	if (compiledFunctions && compiledFunctions.size > 0) {
		for (const [name, compiled] of compiledFunctions) {
			lines.push(`// --- Sub-workflow: ${name} ---`);
			for (const decl of compiled.nodeDeclarations) {
				lines.push(decl);
				lines.push('');
			}
			if (compiled.errorConnections.length > 0) {
				for (const ec of compiled.errorConnections) {
					lines.push(`${ec.sourceVar}.onError(${ec.catchChainStartVar});`);
				}
				lines.push('');
			}
			lines.push(compiled.builderDeclaration);
			lines.push('');
		}
	}

	// Sub-workflow declarations: try/catch bodies (before loop bodies, since loops may reference them)
	if (compiledTryCatchBodies && compiledTryCatchBodies.length > 0) {
		for (const compiled of compiledTryCatchBodies) {
			lines.push(`// --- Try/catch sub-workflow ---`);
			for (const decl of compiled.nodeDeclarations) {
				lines.push(decl);
				lines.push('');
			}
			if (compiled.errorConnections.length > 0) {
				for (const ec of compiled.errorConnections) {
					lines.push(`${ec.sourceVar}.onError(${ec.catchChainStartVar});`);
				}
				lines.push('');
			}
			lines.push(compiled.builderDeclaration);
			lines.push('');
		}
	}

	// Sub-workflow declarations: loop bodies
	if (compiledLoopBodies && compiledLoopBodies.length > 0) {
		for (const compiled of compiledLoopBodies) {
			lines.push(`// --- Loop body sub-workflow ---`);
			for (const decl of compiled.nodeDeclarations) {
				lines.push(decl);
				lines.push('');
			}
			if (compiled.errorConnections.length > 0) {
				for (const ec of compiled.errorConnections) {
					lines.push(`${ec.sourceVar}.onError(${ec.catchChainStartVar});`);
				}
				lines.push('');
			}
			lines.push(compiled.builderDeclaration);
			lines.push('');
		}
	}

	if (hasSubWorkflows) {
		lines.push('// --- Main workflow ---');
	}

	// Node declarations
	for (const n of allNodes) {
		lines.push(n.sdkCode);
		lines.push('');
	}

	// Error connections
	if (errorConnections && errorConnections.length > 0) {
		for (const ec of errorConnections) {
			lines.push(`${ec.sourceVar}.onError(${ec.catchChainStartVar});`);
			lines.push('');
		}
	}

	// Workflow builder
	const addCalls = allChains.map((chain) => `.add(${chain})`).join('\n  ');
	lines.push(`export default workflow('compiled', 'Compiled Workflow')`);
	lines.push(`  ${addCalls};`);

	return lines.join('\n');
}
