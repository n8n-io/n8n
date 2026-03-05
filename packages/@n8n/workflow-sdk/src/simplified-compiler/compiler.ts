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
	discriminant?: AcornNode;
	leadingComments?: Array<{ type: string; value: string }>;
};

// ─── Callback Info ───────────────────────────────────────────────────────────

interface CallbackInfo {
	triggerType: 'manual' | 'webhook' | 'schedule' | 'error';
	triggerOptions: Record<string, unknown>;
	callbackBody: AcornNode[];
	callbackParams: string[];
}

// ─── IO Call ─────────────────────────────────────────────────────────────────

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
	modelVarRef?: string; // variable name when model is a variable reference, not a literal
	promptVarRef?: string; // variable name when prompt is a variable reference, not a literal
	nodeName: string;
	// AI-specific subnodes
	aiTools?: Array<Record<string, unknown>>;
	aiOutputParser?: Record<string, unknown>;
	aiMemory?: Record<string, unknown>;
	// respond-specific
	respondArgs?: Record<string, unknown>;
	// workflow.run-specific
	workflowName?: string;
	// Credentials
	credentials?: { type: string; credential: string };
	// Error handling
	onError?: string;
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
		| 'switchCase'
		| 'aggregate';
	nodeName: string;
	branchOnly?: boolean;
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
	aggCounter: number;
	needsAggregate: boolean;
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

	// Step 3: Find onX() callbacks
	const callbacks = findCallbacks(ast);
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

	// Step 5: Transpile each callback
	const allNodes: EmittedNode[] = [];
	const allChains: string[] = [];

	for (const cb of callbacks) {
		const { nodes, chainExpr } = transpileCallback(cb, source, allNodes.length, comments, errors);
		allNodes.push(...nodes);
		allChains.push(chainExpr);
	}

	// Step 6: Generate final SDK code
	const code = generateSDKCode(allNodes, allChains);
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

function findCallbacks(ast: AcornNode): CallbackInfo[] {
	const callbacks: CallbackInfo[] = [];
	if (!ast.body) return callbacks;

	for (const stmt of ast.body) {
		if (stmt.type !== 'ExpressionStatement' || !stmt.expression) continue;
		const expr = stmt.expression;
		if (expr.type !== 'CallExpression' || !expr.callee) continue;

		const callee = expr.callee;
		if (callee.type !== 'Identifier') continue;

		const name = callee.name ?? '';
		const args = expr.arguments ?? [];

		const triggerMap: Record<string, CallbackInfo['triggerType']> = {
			onManual: 'manual',
			onWebhook: 'webhook',
			onSchedule: 'schedule',
			onError: 'error',
		};

		const triggerType = triggerMap[name];
		if (!triggerType) continue;

		let callbackFn: AcornNode | undefined;
		let triggerOptions: Record<string, unknown> = {};

		if (triggerType === 'manual' || triggerType === 'error') {
			callbackFn = args[0];
		} else {
			if (args[0]) triggerOptions = extractObjectLiteral(args[0]) ?? {};
			callbackFn = args[1];
		}

		if (!callbackFn) continue;

		const fnBody = extractFunctionBody(callbackFn);
		if (!fnBody) continue;

		const cbParams = extractCallbackParams(callbackFn);

		callbacks.push({ triggerType, triggerOptions, callbackBody: fnBody, callbackParams: cbParams });
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

// ─── Callback Transpilation ──────────────────────────────────────────────────

function transpileCallback(
	cb: CallbackInfo,
	source: string,
	nodeOffset: number,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
	errors: CompilerError[],
): { nodes: EmittedNode[]; chainExpr: string } {
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
		consumedComments: new Set(),
		inLoopBody: false,
		loopCounter: nodeOffset,
		aggCounter: nodeOffset,
		needsAggregate: false,
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

	return { nodes: ctx.nodes, chainExpr };
}

// ─── Statement Walking ───────────────────────────────────────────────────────

function walkStatements(
	ctx: TranspilerContext,
	statements: AcornNode[],
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	for (const stmt of statements) {
		// If a for...of loop preceded this statement and had IO, insert aggregate
		if (ctx.needsAggregate && hasNonTrivialEffect(stmt, ctx.source)) {
			emitAggregateNode(ctx);
			ctx.needsAggregate = false;
		}

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

		const ioCall = extractIOCall(stmt, ctx.source);
		if (ioCall) {
			// Apply @onError annotation
			if (ctx.hasOnErrorAnnotation) {
				ioCall.onError = 'continueRegularOutput';
				ctx.hasOnErrorAnnotation = false;
			}
			processIOCall(ctx, ioCall);
			continue;
		}

		// Check for respond() call
		if (isRespondCall(stmt)) {
			processRespondCall(ctx, stmt);
			continue;
		}

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

		// Check for Promise.all
		if (isPromiseAll(stmt)) {
			processPromiseAll(ctx, stmt, comments);
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

		// Skip bare return statements — they are early exits with no n8n equivalent
		if (stmt.type === 'ReturnStatement' && !stmt.argument) {
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
		const httpNode = generateHttpSDK(ioCall, httpVar, {
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

function processRespondCall(ctx: TranspilerContext, stmt: AcornNode): void {
	flushPendingCode(ctx);

	const expr = stmt.expression!;
	const args = (expr as AcornNode).arguments ?? [];
	const respondArgs = args[0] ? (extractObjectLiteral(args[0]) ?? {}) : {};

	ctx.respondCounter++;
	const respondVar = `respond${ctx.respondCounter}`;

	const params: Record<string, unknown> = {
		respondWith: 'json',
	};

	if (respondArgs.status) {
		params.responseCode = respondArgs.status;
	}
	if (respondArgs.body) {
		if (typeof respondArgs.body === 'object') {
			params.responseBody = JSON.stringify(respondArgs.body);
		} else {
			params.responseBody = respondArgs.body;
		}
	}
	if (respondArgs.headers) {
		params.responseHeaders = respondArgs.headers;
	}

	const configStr = JSON.stringify(
		{ name: `Respond ${ctx.respondCounter}`, parameters: params, executeOnce: true },
		null,
		2,
	)
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
		options: { caseSensitive: true, leftValue: '' },
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

	// Detect guard clause: true branch ends with bare return, no false branch
	const consequent = stmt.consequent as AcornNode;
	const bodyStmts =
		consequent.type === 'BlockStatement' && consequent.body ? consequent.body : [consequent];
	const lastBodyStmt = bodyStmts[bodyStmts.length - 1];
	const isGuardClause =
		lastBodyStmt?.type === 'ReturnStatement' && !lastBodyStmt.argument && !stmt.alternate;

	// Emit ifElse node
	const conditionsParam = buildIfConditionsParam(stmt.test!, ctx);
	const metaStr = isGuardClause ? ', metadata: { guardClause: true }' : '';
	let sdkCode = `const ${ifVar} = ifElse({ version: 2.2, config: { name: 'IF ${myIfNum}', parameters: { conditions: ${conditionsParam} }, executeOnce: true }${metaStr} })`;

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
	'aggCounter',
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
		aggCounter: parentCtx.aggCounter,
		needsAggregate: false,
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
 * Resolve a discriminant AST node to a `={{ $json.property }}` expression.
 * Extracts the property chain, drops the root variable name (since the Switch
 * node receives data as `$json`), and prefixes with `$json`.
 */
function buildJsonExpression(astNode: AcornNode): string {
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

	// Build $json expression from discriminant (e.g. body.action → $json.action)
	const discExpr = stmt.discriminant ? buildJsonExpression(stmt.discriminant) : '={{ $json }}';

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

// ─── Aggregate Node ─────────────────────────────────────────────────────────

function hasNonTrivialEffect(stmt: AcornNode, source: string): boolean {
	// Returns true if the statement has IO calls or control flow that produces nodes
	if (extractIOCall(stmt, source)) return true;
	if (isRespondCall(stmt)) return true;
	if (stmt.type === 'IfStatement' || stmt.type === 'SwitchStatement') return true;
	if (stmt.type === 'TryStatement') return true;
	if (isPromiseAll(stmt)) return true;
	if (findNestedIO(stmt, source).length > 0) return true;
	return false;
}

function emitAggregateNode(ctx: TranspilerContext): void {
	flushPendingCode(ctx);
	ctx.aggCounter++;
	const aggVar = `agg${ctx.aggCounter}`;
	const aggName = `Aggregate ${ctx.aggCounter}`;

	const sdkCode = `const ${aggVar} = node({
  type: 'n8n-nodes-base.aggregate', version: 1,
  config: {
    name: '${aggName}',
    parameters: {
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'data',
      include: 'allFieldsExceptBinary'
    }
  }
});`;

	ctx.nodes.push({
		varName: aggVar,
		sdkCode,
		kind: 'aggregate',
		nodeName: aggName,
	});
	ctx.prevVar = aggVar;
}

// ─── For-Of Processing ───────────────────────────────────────────────────────

function loopBodyHasIO(bodyNode: AcornNode, source: string): boolean {
	const stmts = bodyNode.type === 'BlockStatement' && bodyNode.body ? bodyNode.body : [bodyNode];
	for (const s of stmts) {
		if (findNestedIO(s, source).length > 0) return true;
	}
	return false;
}

function processForOfStatement(
	ctx: TranspilerContext,
	stmt: AcornNode,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	const bodyNode = (stmt as unknown as { body: AcornNode }).body;

	// Case 3: No IO in loop body → keep as plain JS in Code node
	if (!loopBodyHasIO(bodyNode, ctx.source)) {
		const loopSource = ctx.source.slice(stmt.start, stmt.end);
		const baseIndent = getBaseIndent(ctx.source, stmt.start);
		ctx.pendingStatements.push({ source: dedentSource(loopSource, baseIndent), ast: stmt });
		return;
	}

	// Case 1 & 2: Loop body has IO → splitter + per-item nodes
	flushPendingCode(ctx);
	ctx.loopCounter++;

	// Extract loop variable name and iterable
	const leftNode = (stmt as unknown as { left: AcornNode }).left;
	const loopVar =
		leftNode.type === 'VariableDeclaration' && leftNode.declarations?.[0]
			? (leftNode.declarations[0].id?.name ?? 'item')
			: (leftNode.name ?? 'item');

	const rightNode = (stmt as unknown as { right: AcornNode }).right;
	const iterableName = rightNode.name ?? '';

	// Check if there was a blank line before this for-of in the original source
	let blankLineBefore = false;
	{
		let pos = stmt.start - 1;
		let newlineCount = 0;
		while (pos >= 0 && ' \t\n\r'.includes(ctx.source[pos])) {
			if (ctx.source[pos] === '\n') newlineCount++;
			pos--;
		}
		blankLineBefore = newlineCount >= 2;
	}

	// Emit splitter Code node — splits array into individual n8n items
	ctx.codeCounter++;
	const splitterVar = `code${ctx.codeCounter}`;
	const splitterName = `Split ${loopVar}s`;

	// Build reference to the source array
	const sourceNodeName = ctx.varSourceMap.get(iterableName);
	const refLine = sourceNodeName
		? `const ${iterableName} = $('${sourceNodeName}').all().map(i => i.json);\n`
		: '';
	// If iterable is a property access (e.g. items from a previous code node returning { items: [...] }),
	// we output the whole array. If it's a direct variable, output items.map(x => ({ json: x }))
	const jsCode = `${refLine}return ${iterableName}.map(${loopVar} => ({ json: ${loopVar} }));`;

	const metadataStr = blankLineBefore ? `,\n  metadata: { blankLineBefore: true }` : '';
	const splitterSdk = `const ${splitterVar} = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: '${splitterName}',
    parameters: {
      jsCode: \`${jsCode.replace(/`/g, '\\`')}\`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }${metadataStr}
});`;

	ctx.nodes.push({
		varName: splitterVar,
		sdkCode: splitterSdk,
		kind: 'code',
		nodeName: splitterName,
	});
	ctx.prevVar = splitterVar;

	// Map loop variable to $json (the splitter outputs individual items)
	ctx.varSourceMap.set(loopVar, splitterName);
	ctx.varSourceKind.set(loopVar, 'code');

	// Walk loop body with inLoopBody=true (skips executeOnce on emitted nodes)
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

	// Update prevVar to last node in loop body
	if (branchCtx.nodes.length > 0) {
		ctx.prevVar = branchCtx.nodes[branchCtx.nodes.length - 1].varName;
	}

	// Mark that we need an aggregate if there's more code after this loop
	ctx.needsAggregate = true;

	syncCounters(ctx, branchCtx);
}

// ─── Try/Catch Processing ────────────────────────────────────────────────────

function processTryStatement(
	ctx: TranspilerContext,
	stmt: AcornNode,
	comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	// Process try block statements — mark nodes with onError
	const tryBlock = stmt.block;
	if (tryBlock?.type === 'BlockStatement' && tryBlock.body) {
		// Walk try body, but annotate all IO calls with onError
		for (const tryStmt of tryBlock.body) {
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

	// Process catch block
	if (stmt.handler) {
		const handlerBody = (stmt.handler as AcornNode).body as unknown as AcornNode;
		if (handlerBody?.type === 'BlockStatement' && handlerBody.body) {
			walkStatements(ctx, handlerBody.body, comments);
		}
	}
}

// ─── Promise.all Processing ──────────────────────────────────────────────────

function isPromiseAll(stmt: AcornNode): boolean {
	if (stmt.type !== 'ExpressionStatement' || !stmt.expression) return false;
	const expr = stmt.expression;
	const callExpr = expr.type === 'AwaitExpression' ? expr.argument : expr;
	if (!callExpr || callExpr.type !== 'CallExpression') return false;

	const callee = callExpr.callee;
	return (
		callee?.type === 'MemberExpression' &&
		callee.object?.type === 'Identifier' &&
		callee.object.name === 'Promise' &&
		callee.property?.type === 'Identifier' &&
		callee.property.name === 'all'
	);
}

function processPromiseAll(
	ctx: TranspilerContext,
	stmt: AcornNode,
	_comments: Array<{ type: string; value: string; start: number; end: number }>,
): void {
	flushPendingCode(ctx);

	const expr = stmt.expression!;
	const callExpr = expr.type === 'AwaitExpression' ? expr.argument! : expr;
	const args = callExpr.arguments ?? [];
	const arrayArg = args[0];

	if (!arrayArg || arrayArg.type !== 'ArrayExpression' || !arrayArg.elements) return;

	const prevVar = ctx.prevVar;
	const fanOutVars: string[] = [];

	for (const element of arrayArg.elements) {
		if (!element) continue;

		// Handle direct http.* calls
		const ioCall = extractIOCallFromExpression(element, ctx.source);
		if (ioCall) {
			ctx.httpCounter++;
			const httpVar = `http${ctx.httpCounter}`;
			const httpNode = generateHttpSDK(ioCall, httpVar);
			ctx.nodes.push(httpNode);
			if (ioCall.assignedVar) {
				ctx.varSourceMap.set(ioCall.assignedVar, httpNode.nodeName);
				ctx.varSourceKind.set(ioCall.assignedVar, 'io');
			}
			fanOutVars.push(httpVar);
		}
	}

	// Rewrite the chain to fan out from prevVar
	if (fanOutVars.length > 0) {
		// Remove prevVar's last .to() and add fan-out
		const prevNodeIdx = ctx.nodes.findIndex((n) => n.varName === prevVar);
		if (prevNodeIdx >= 0) {
			// The chain expression will handle the fan-out
			ctx.prevVar = fanOutVars[fanOutVars.length - 1];
		}
	}
}

function extractIOCallFromExpression(expr: AcornNode, source: string): IOCall | null {
	// Handle: http.post('/a', d) (without await)
	if (expr.type === 'CallExpression') {
		return matchIOCallNode(expr, source);
	}
	// Handle: await http.post('/a', d)
	if (expr.type === 'AwaitExpression' && expr.argument) {
		return matchIOCallNode(expr.argument, source);
	}
	return null;
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
	}

	return null;
}

function matchIOCallNode(callNode: AcornNode, source: string): IOCall | null {
	if (callNode.type !== 'CallExpression' || !callNode.callee) return null;
	const callee = callNode.callee;

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

	if (obj === 'ai' && method === 'chat') {
		return extractAiCall(callNode, source);
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

function extractAiCall(callNode: AcornNode, _source: string): IOCall {
	const args = callNode.arguments ?? [];
	const model = args[0] ? extractStringLiteral(args[0]) : undefined;
	const prompt = args[1] ? extractStringLiteral(args[1]) : undefined;
	const modelVarRef =
		!model && args[0]?.type === 'Identifier' ? (args[0].name as string) : undefined;
	const promptVarRef =
		!prompt && args[1]?.type === 'Identifier' ? (args[1].name as string) : undefined;
	const options = args[2] ? extractObjectLiteral(args[2]) : undefined;

	// Parse AI subnodes from options
	let aiTools: Array<Record<string, unknown>> | undefined;
	let aiOutputParser: Record<string, unknown> | undefined;
	let aiMemory: Record<string, unknown> | undefined;

	if (options) {
		if (options.tools && Array.isArray(options.tools)) {
			aiTools = options.tools as Array<Record<string, unknown>>;
		}
		if (options.outputParser) {
			aiOutputParser = options.outputParser as Record<string, unknown>;
		}
		if (options.memory) {
			aiMemory = options.memory as Record<string, unknown>;
		}
	}

	const shortPrompt = prompt ? prompt.slice(0, 30) : 'AI Chat';
	const nodeName = `AI: ${shortPrompt}`;

	return {
		type: 'ai',
		method: 'chat',
		assignedVar: null,
		model,
		prompt,
		modelVarRef,
		promptVarRef,
		nodeName: nodeName.length > 40 ? nodeName.slice(0, 37) + '...' : nodeName,
		aiTools,
		aiOutputParser,
		aiMemory,
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
}

function findReferencedVars(code: string, varSourceMap: Map<string, string>): VarReference[] {
	const refs: VarReference[] = [];
	const seen = new Set<string>();
	for (const [varName, sourceNode] of varSourceMap) {
		const regex = new RegExp(`\\b${varName}\\b`);
		if (regex.test(code) && !seen.has(varName)) {
			refs.push({ varName, sourceNode });
			seen.add(varName);
		}
	}
	return refs;
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
	const referencedVars = findReferencedVars(codeSource, ctx.varSourceMap);
	const jsCodeLines: string[] = [];

	if (referencedVars.length > 0) {
		jsCodeLines.push(`// From: ${referencedVars[0].sourceNode}`);
	}

	for (const { varName, sourceNode } of referencedVars) {
		jsCodeLines.push(`const ${varName} = $('${sourceNode}').all().map(i => i.json);`);
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
	const triggerTypeMap: Record<string, { type: string; version: number }> = {
		manual: { type: 'n8n-nodes-base.manualTrigger', version: 1 },
		webhook: { type: 'n8n-nodes-base.webhook', version: 2 },
		schedule: { type: 'n8n-nodes-base.scheduleTrigger', version: 1.2 },
		error: { type: 'n8n-nodes-base.errorTrigger', version: 1 },
	};

	const triggerInfo = triggerTypeMap[cb.triggerType] ?? triggerTypeMap.manual;
	const configParams = mapTriggerParams(cb);

	// If webhook callback has `respond` param, set responseMode
	if (cb.triggerType === 'webhook' && cb.callbackParams.includes('respond')) {
		configParams.responseMode = 'responseNode';
	}

	const paramsStr =
		Object.keys(configParams).length > 0 ? `parameters: ${JSON.stringify(configParams)}` : '';

	const configBody = paramsStr ? `{ ${paramsStr} }` : '{}';
	const nodeName = 'Start';
	const sdkCode = `const ${varName} = trigger({ type: '${triggerInfo.type}', version: ${triggerInfo.version}, config: ${configBody} });`;

	return { varName, sdkCode, kind: 'trigger', nodeName };
}

function mapTriggerParams(cb: CallbackInfo): Record<string, unknown> {
	if (cb.triggerType === 'schedule') return mapScheduleOptions(cb.triggerOptions);
	if (cb.triggerType === 'webhook') return mapWebhookOptions(cb.triggerOptions);
	return {};
}

function mapScheduleOptions(options: Record<string, unknown>): Record<string, unknown> {
	if (typeof options.every === 'string') {
		const match = (options.every as string).match(/^(\d+)\s*(s|m|h|d|w)$/);
		if (match) {
			const value = parseInt(match[1], 10);
			const unitMap: Record<string, Record<string, unknown>> = {
				s: { field: 'seconds', secondsInterval: value },
				m: { field: 'minutes', minutesInterval: value },
				h: { field: 'hours', hoursInterval: value },
				d: { field: 'days', daysInterval: value },
				w: { field: 'weeks', weeksInterval: value },
			};
			return { rule: { interval: [unitMap[match[2]]] } };
		}
	}
	if (typeof options.cron === 'string') {
		return { rule: { interval: [{ field: 'cronExpression', expression: options.cron }] } };
	}
	return { rule: { interval: [{ field: 'days', daysInterval: 1 }] } };
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
			params.jsonBody = `={{ $json.${io.bodyExpression} }}`;
		} else if (io.body) {
			params.sendBody = true;
			params.contentType = 'json';
			params.specifyBody = 'json';
			params.jsonBody = JSON.stringify(io.body);
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
		const authTypeMap: Record<string, string> = {
			bearer: 'httpHeaderAuth',
			basic: 'httpBasicAuth',
			oauth2: 'oAuth2Api',
		};
		const credType = authTypeMap[io.credentials.type] ?? 'httpHeaderAuth';
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

	const metadataStr = io.assignedVar ? `,\n  metadata: { varName: '${io.assignedVar}' }` : '';

	const sdkCode = `const ${varName} = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: ${finalConfig}${metadataStr}
});`;

	return { varName, sdkCode, kind: 'http', nodeName: io.nodeName };
}

function generateAiSDK(io: IOCall, varName: string): EmittedNode {
	const model = io.model ?? 'gpt-4o-mini';
	const prompt = io.prompt ?? '';
	const modelConfig = mapModelToType(model);

	// Build subnodes
	const subnodeParts: string[] = [];

	// Language model (always present)
	subnodeParts.push(`      model: languageModel({
        type: '${modelConfig.type}', version: ${modelConfig.version},
        config: { parameters: { model: { __rl: true, mode: 'id', value: '${model}' }, options: {} } }
      })`);

	// Tools
	if (io.aiTools && io.aiTools.length > 0) {
		const toolStrs = io.aiTools.map((t) => {
			const toolType = mapToolType(t.type as string);
			const toolConfig: Record<string, unknown> = {};
			if (t.name) toolConfig.name = t.name;
			if (t.url) toolConfig.url = t.url;
			if (t.code) toolConfig.jsCode = t.code;
			return `tool({
          type: '${toolType}', version: 1,
          config: { parameters: ${JSON.stringify(toolConfig)} }
        })`;
		});
		subnodeParts.push(`      tools: [${toolStrs.join(', ')}]`);
	}

	// Output parser
	if (io.aiOutputParser) {
		const parserType = mapOutputParserType(io.aiOutputParser.type as string);
		const parserConfig: Record<string, unknown> = {};
		if (io.aiOutputParser.schema) parserConfig.schema = io.aiOutputParser.schema;
		subnodeParts.push(`      outputParser: outputParser({
        type: '${parserType}', version: 1,
        config: { parameters: ${JSON.stringify(parserConfig)} }
      })`);
	}

	// Memory
	if (io.aiMemory) {
		const memType = mapMemoryType(io.aiMemory.type as string);
		const memConfig: Record<string, unknown> = {};
		if (io.aiMemory.contextLength) memConfig.contextWindowLength = io.aiMemory.contextLength;
		subnodeParts.push(`      memory: memory({
        type: '${memType}', version: 1,
        config: { parameters: ${JSON.stringify(memConfig)} }
      })`);
	}

	const subnodeBlock = subnodeParts.join(',\n');
	const onErrorStr = io.onError ? `,\n    onError: '${io.onError}'` : '';

	const metaEntries: string[] = [];
	if (io.assignedVar) metaEntries.push(`varName: '${io.assignedVar}'`);
	if (io.modelVarRef) metaEntries.push(`modelVarRef: '${io.modelVarRef}'`);
	if (io.promptVarRef) metaEntries.push(`promptVarRef: '${io.promptVarRef}'`);
	const metadataStr = metaEntries.length > 0 ? `,\n  metadata: { ${metaEntries.join(', ')} }` : '';

	const sdkCode = `const ${varName} = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: '${io.nodeName.replace(/'/g, "\\'")}',
    parameters: {
      promptType: 'define',
      text: '${prompt.replace(/'/g, "\\'")}',
      options: {}
    },
    subnodes: {
${subnodeBlock}
    },
    executeOnce: true${onErrorStr}
  }${metadataStr}
});`;

	return { varName, sdkCode, kind: 'ai', nodeName: io.nodeName };
}

function generateWorkflowRunSDK(io: IOCall, varName: string): EmittedNode {
	const wfName = io.workflowName ?? 'Sub-Workflow';

	const metadataStr = io.assignedVar ? `,\n  metadata: { varName: '${io.assignedVar}' }` : '';

	const sdkCode = `const ${varName} = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.2,
  config: {
    name: '${io.nodeName.replace(/'/g, "\\'")}',
    parameters: {
      workflowId: { __rl: true, mode: 'name', value: '${wfName}' }
    },
    executeOnce: true
  }${metadataStr}
});`;

	return { varName, sdkCode, kind: 'workflow', nodeName: io.nodeName };
}

// ─── AI Subnode Type Mapping ─────────────────────────────────────────────────

function mapModelToType(model: string): { type: string; version: number } {
	if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) {
		return { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2 };
	}
	if (model.includes('claude')) {
		return { type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.2 };
	}
	if (model.includes('gemini')) {
		return { type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1 };
	}
	if (model.includes('llama') || model.includes('mixtral')) {
		return { type: '@n8n/n8n-nodes-langchain.lmChatGroq', version: 1 };
	}
	return { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2 };
}

function mapToolType(type: string): string {
	const toolTypeMap: Record<string, string> = {
		code: '@n8n/n8n-nodes-langchain.toolCode',
		httpRequest: '@n8n/n8n-nodes-langchain.toolHttpRequest',
	};
	return toolTypeMap[type] ?? '@n8n/n8n-nodes-langchain.toolCode';
}

function mapOutputParserType(type: string): string {
	const parserTypeMap: Record<string, string> = {
		structured: '@n8n/n8n-nodes-langchain.outputParserStructured',
		autoFix: '@n8n/n8n-nodes-langchain.outputParserAutofixing',
	};
	return parserTypeMap[type] ?? '@n8n/n8n-nodes-langchain.outputParserStructured';
}

function mapMemoryType(type: string): string {
	const memoryTypeMap: Record<string, string> = {
		bufferWindow: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
		postgres: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
	};
	return memoryTypeMap[type] ?? '@n8n/n8n-nodes-langchain.memoryBufferWindow';
}

// ─── Final SDK Code Assembly ─────────────────────────────────────────────────

function generateSDKCode(allNodes: EmittedNode[], allChains: string[]): string {
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
			case 'aggregate':
				usedFactories.add('node');
				break;
		}
	}

	// Node declarations
	for (const n of allNodes) {
		lines.push(n.sdkCode);
		lines.push('');
	}

	// Workflow builder
	const addCalls = allChains.map((chain) => `.add(${chain})`).join('\n  ');
	lines.push(`export default workflow('compiled', 'Compiled Workflow')`);
	lines.push(`  ${addCalls};`);

	return lines.join('\n');
}
