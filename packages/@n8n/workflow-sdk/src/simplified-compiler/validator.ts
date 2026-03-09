/**
 * Pre-Compile DSL Validator
 *
 * Validates simplified JS DSL source BEFORE compilation.
 * Returns structured errors with actionable suggestions so an LLM agent can fix its own mistakes.
 *
 * Architecture: Parse → Collect → Validate
 *   1. Parse with Acorn (syntax errors caught here)
 *   2. Single AST walk collects structured info
 *   3. Independent rule functions validate the collected info
 */

import * as acorn from 'acorn';
import { classNameToEntry, getKnownIoMethods } from '../shared/ai-node-mapping';
import { AUTH_TYPE_TO_CREDENTIAL } from '../shared/credential-mapping';
import { CALLBACK_TO_TRIGGER } from '../shared/trigger-mapping';
import { validateNodeConfig } from '../validation/schema-validator';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ValidationError {
	line?: number;
	column?: number;
	message: string;
	suggestion: string;
	category: 'syntax' | 'structure' | 'validation';
	ruleId: string;
}

export interface RuleResult {
	ruleId: string;
	passed: boolean;
	errors: ValidationError[];
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	ruleResults: RuleResult[];
}

// ─── AST Node Type ───────────────────────────────────────────────────────────

type AcornNode = acorn.Node & {
	type: string;
	body?: AcornNode | AcornNode[];
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
	async?: boolean;
	loc?: { start: { line: number; column: number }; end: { line: number; column: number } };
};

/** Safely cast an unknown value to AcornNode if it looks like an AST node */
function asNode(val: unknown): AcornNode | undefined {
	if (val && typeof val === 'object' && 'type' in val) return val as AcornNode;
	return undefined;
}

/** Get primitive value from a node (for Literal nodes) */
function literalValue(node: AcornNode | undefined): unknown {
	if (!node || node.type !== 'Literal') return undefined;
	return node.value;
}

// ─── Collected Info ──────────────────────────────────────────────────────────

interface HttpCallInfo {
	method: string; // get, post, put, patch, delete
	argCount: number;
	authType?: string;
	line?: number;
	column?: number;
}

interface CallbackCallInfo {
	callbackName: string; // onManual, onWebhook, onSchedule, onError
	hasDestructuredParams: boolean;
	scheduleEvery?: string; // raw value of `every` option
	hasCron?: boolean;
	line?: number;
	column?: number;
}

interface AiSubnodeCallInfo {
	className: string;
	configNode?: AcornNode; // ObjectExpression for schema validation
	line?: number;
	column?: number;
}

interface AiCallInfo {
	className: string;
	ioMethod: string;
	subnodes: AiSubnodeCallInfo[]; // model, tools items, outputParser, memory
	configNode?: AcornNode; // ObjectExpression for Agent passthrough validation
	line?: number;
	column?: number;
}

interface RespondCallInfo {
	statusValue?: unknown; // literal value of status property
	callbackIndex: number;
	inConditional: boolean; // true if inside if/else/switch
	line?: number;
	column?: number;
}

interface FunctionDeclInfo {
	name: string;
	paramCount: number;
	hasReturnWithValue: boolean;
	hasIO: boolean;
	line?: number;
	column?: number;
}

interface FunctionCallInfo {
	name: string;
	argCount: number;
	line?: number;
	column?: number;
}

interface TryCatchInfo {
	tryHasIO: boolean;
	line?: number;
	column?: number;
}

interface ForOfLoopInfo {
	variableName: string;
	loopEndLine?: number; // end of the for-of statement
	parentBodyNode?: AcornNode; // parent block to scan for post-loop usage
	loopNodeIndex?: number; // index in parent body
	line?: number;
	column?: number;
}

interface CollectedInfo {
	httpCalls: HttpCallInfo[];
	callbacks: CallbackCallInfo[];
	aiCalls: AiCallInfo[];
	respondCalls: RespondCallInfo[];
	functionDecls: FunctionDeclInfo[];
	functionCalls: FunctionCallInfo[];
	tryCatchBlocks: TryCatchInfo[];
	forOfLoops: ForOfLoopInfo[];
}

// ─── Collector ───────────────────────────────────────────────────────────────

const NO_BODY_METHODS = new Set(['get', 'delete']);

const VALID_SCHEDULE_RE = /^\d+\s*(s|m|h|d|w)$/;

interface WalkContext {
	callbackIndex: number; // -1 = outside any callback
	inConditional: boolean;
}

function collectInfo(program: AcornNode): CollectedInfo {
	const info: CollectedInfo = {
		httpCalls: [],
		callbacks: [],
		aiCalls: [],
		respondCalls: [],
		functionDecls: [],
		functionCalls: [],
		tryCatchBlocks: [],
		forOfLoops: [],
	};

	walkNode(program, info, { callbackIndex: -1, inConditional: false });
	return info;
}

function walkNode(node: AcornNode, info: CollectedInfo, ctx: WalkContext): void {
	if (!node || typeof node.type !== 'string') return;

	// Detect top-level async function declarations
	if (node.type === 'FunctionDeclaration' && node.async && node.id?.name) {
		const body = Array.isArray(node.body) ? node.body : (node.body as AcornNode)?.body;
		const stmts = (Array.isArray(body) ? body : []) as AcornNode[];
		const hasIO = bodyHasIO(stmts);
		const hasReturnWithValue = bodyHasReturnWithValue(stmts);
		info.functionDecls.push({
			name: node.id.name,
			paramCount: node.params?.length ?? 0,
			hasReturnWithValue,
			hasIO,
			line: node.loc?.start.line,
			column: node.loc?.start.column,
		});
	}

	// Detect try-catch blocks
	if (node.type === 'TryStatement' && node.block) {
		const tryBody = Array.isArray(node.block.body) ? node.block.body : [];
		info.tryCatchBlocks.push({
			tryHasIO: bodyHasIO(tryBody as AcornNode[]),
			line: node.loc?.start.line,
			column: node.loc?.start.column,
		});
	}

	// Detect for-of loops
	if (node.type === 'ForOfStatement' && node.left) {
		const leftNode = node.left;
		let variableName = '';
		if (leftNode.type === 'VariableDeclaration' && leftNode.declarations?.[0]?.id?.name) {
			variableName = leftNode.declarations[0].id.name;
		}
		if (variableName) {
			info.forOfLoops.push({
				variableName,
				loopEndLine: node.loc?.end.line,
				line: node.loc?.start.line,
				column: node.loc?.start.column,
			});
		}
	}

	// Detect await fn() calls (function calls that are awaited)
	if (node.type === 'AwaitExpression' && node.argument?.type === 'CallExpression') {
		const callExpr = node.argument;
		if (callExpr.callee?.type === 'Identifier') {
			const name = callExpr.callee.name ?? '';
			// Don't count callback names or builtins
			if (name && !(name in CALLBACK_TO_TRIGGER) && name !== 'respond' && name !== 'onTrigger') {
				info.functionCalls.push({
					name,
					argCount: callExpr.arguments?.length ?? 0,
					line: callExpr.loc?.start.line ?? node.loc?.start.line,
					column: callExpr.loc?.start.column ?? node.loc?.start.column,
				});
			}
		}
	}

	// Detect onManual/onWebhook/onSchedule/onError/onTrigger callback calls
	if (node.type === 'CallExpression' && node.callee?.type === 'Identifier') {
		const name = node.callee.name ?? '';
		if (name in CALLBACK_TO_TRIGGER || name === 'onTrigger') {
			const callbackInfo = extractCallbackInfo(name, node);
			info.callbacks.push(callbackInfo);
			// Walk the callback body with the callback index
			const args = node.arguments ?? [];
			const callbackArg = args[args.length - 1];
			if (
				callbackArg &&
				(callbackArg.type === 'ArrowFunctionExpression' ||
					callbackArg.type === 'FunctionExpression')
			) {
				const bodyNode = callbackArg.body;
				if (bodyNode) {
					walkNode(bodyNode as AcornNode, info, {
						callbackIndex: info.callbacks.length - 1,
						inConditional: false,
					});
				}
			}
			return; // Don't recurse again into children (we handled the body)
		}

		// Detect respond() calls
		if (name === 'respond') {
			const respondInfo: RespondCallInfo = {
				callbackIndex: ctx.callbackIndex,
				inConditional: ctx.inConditional,
				line: node.loc?.start.line,
				column: node.loc?.start.column,
			};
			const configArg = node.arguments?.[0];
			if (configArg?.type === 'ObjectExpression') {
				for (const prop of configArg.properties ?? []) {
					const valNode = asNode(prop.value);
					if (
						prop.type === 'Property' &&
						prop.key?.name === 'status' &&
						valNode?.type === 'Literal'
					) {
						respondInfo.statusValue = literalValue(valNode);
					}
				}
			}
			info.respondCalls.push(respondInfo);
		}
	}

	// Detect http.method() calls
	if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression') {
		const obj = node.callee.object;
		const prop = node.callee.property;
		if (obj?.type === 'Identifier' && obj.name === 'http' && prop?.name) {
			const method = prop.name;
			const argCount = node.arguments?.length ?? 0;

			const httpCall: HttpCallInfo = {
				method,
				argCount,
				line: node.loc?.start.line,
				column: node.loc?.start.column,
			};

			// Extract auth type from options object
			const authType = extractAuthType(node.arguments ?? [], method);
			if (authType) httpCall.authType = authType;

			info.httpCalls.push(httpCall);
		}
	}

	// Detect new ClassName({...}).method() AI calls
	const aiCall = extractAiCall(node);
	if (aiCall) {
		info.aiCalls.push(aiCall);
	}

	// Recurse into child nodes, propagating inConditional for if/switch bodies
	if (node.type === 'IfStatement') {
		const conditionalCtx = { ...ctx, inConditional: true };
		if (node.test) walkNode(node.test, info, ctx);
		if (node.consequent) walkNode(node.consequent as AcornNode, info, conditionalCtx);
		if (node.alternate) walkNode(node.alternate as AcornNode, info, conditionalCtx);
		return;
	}
	if (node.type === 'SwitchStatement') {
		if (node.discriminant) walkNode(node.discriminant, info, ctx);
		for (const caseNode of node.cases ?? []) {
			walkNode(caseNode as AcornNode, info, { ...ctx, inConditional: true });
		}
		return;
	}
	for (const key of Object.keys(node)) {
		if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
		const child = (node as unknown as Record<string, unknown>)[key];
		if (child && typeof child === 'object') {
			if (Array.isArray(child)) {
				for (const item of child) {
					if (item && typeof item === 'object' && 'type' in item) {
						walkNode(item as AcornNode, info, ctx);
					}
				}
			} else if ('type' in child) {
				walkNode(child as AcornNode, info, ctx);
			}
		}
	}
}

/** Check if a statement list contains any IO calls (http.*, new X().method(), workflow.run) */
function bodyHasIO(stmts: AcornNode[]): boolean {
	for (const stmt of stmts) {
		if (nodeContainsIO(stmt)) return true;
	}
	return false;
}

function nodeContainsIO(node: AcornNode): boolean {
	if (!node || typeof node.type !== 'string') return false;

	// http.method() call
	if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression') {
		const obj = node.callee.object;
		if (obj?.type === 'Identifier' && (obj.name === 'http' || obj.name === 'workflow')) return true;
	}

	// new ClassName().method() AI call
	if (
		node.type === 'CallExpression' &&
		node.callee?.type === 'MemberExpression' &&
		node.callee.object?.type === 'NewExpression'
	) {
		return true;
	}

	// Recurse
	for (const key of Object.keys(node)) {
		if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
		const child = (node as unknown as Record<string, unknown>)[key];
		if (child && typeof child === 'object') {
			if (Array.isArray(child)) {
				for (const item of child) {
					if (
						item &&
						typeof item === 'object' &&
						'type' in item &&
						nodeContainsIO(item as AcornNode)
					)
						return true;
				}
			} else if ('type' in child && nodeContainsIO(child as AcornNode)) return true;
		}
	}
	return false;
}

/** Check if a function body has a return statement with a value */
function bodyHasReturnWithValue(stmts: AcornNode[]): boolean {
	for (const stmt of stmts) {
		if (nodeContainsReturnWithValue(stmt)) return true;
	}
	return false;
}

function nodeContainsReturnWithValue(node: AcornNode): boolean {
	if (!node || typeof node.type !== 'string') return false;
	if (node.type === 'ReturnStatement' && node.argument) return true;

	// Don't descend into nested functions
	if (
		node.type === 'FunctionDeclaration' ||
		node.type === 'FunctionExpression' ||
		node.type === 'ArrowFunctionExpression'
	)
		return false;

	for (const key of Object.keys(node)) {
		if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
		const child = (node as unknown as Record<string, unknown>)[key];
		if (child && typeof child === 'object') {
			if (Array.isArray(child)) {
				for (const item of child) {
					if (
						item &&
						typeof item === 'object' &&
						'type' in item &&
						nodeContainsReturnWithValue(item as AcornNode)
					)
						return true;
				}
			} else if ('type' in child && nodeContainsReturnWithValue(child as AcornNode)) return true;
		}
	}
	return false;
}

const AGENT_SUGAR_FIELDS = new Set(['prompt', 'model', 'tools', 'outputParser', 'memory']);

/** Detect `new ClassName({...}).method()` pattern */
function extractAiCall(node: AcornNode): AiCallInfo | undefined {
	// Pattern: CallExpression > MemberExpression > NewExpression
	if (node.type !== 'CallExpression') return undefined;
	const callee = node.callee;
	if (!callee || callee.type !== 'MemberExpression') return undefined;
	const newExpr = callee.object;
	if (!newExpr || newExpr.type !== 'NewExpression') return undefined;

	const ioMethod = callee.property?.name;
	if (!ioMethod) return undefined;

	const className = newExpr.callee?.type === 'Identifier' ? (newExpr.callee.name ?? '') : '';
	if (!className) return undefined;

	const configArg = newExpr.arguments?.[0];
	const subnodes: AiSubnodeCallInfo[] = [];

	// Extract subnodes from config object
	if (configArg?.type === 'ObjectExpression') {
		for (const prop of configArg.properties ?? []) {
			if (prop.type !== 'Property') continue;
			const keyName = prop.key?.name;
			if (!keyName) continue;
			const valNode = asNode(prop.value);

			// model: new XxxModel({...})
			if (keyName === 'model' && valNode?.type === 'NewExpression') {
				const sub = extractSubnodeInfo(valNode);
				if (sub) subnodes.push(sub);
			}
			// tools: [new XxxTool({...}), ...]
			if (keyName === 'tools' && valNode?.type === 'ArrayExpression') {
				for (const el of valNode.elements ?? []) {
					if (el?.type === 'NewExpression') {
						const sub = extractSubnodeInfo(el);
						if (sub) subnodes.push(sub);
					}
				}
			}
			// outputParser, memory: new Xxx({...})
			if (
				(keyName === 'outputParser' || keyName === 'memory') &&
				valNode?.type === 'NewExpression'
			) {
				const sub = extractSubnodeInfo(valNode);
				if (sub) subnodes.push(sub);
			}
		}
	}

	return {
		className,
		ioMethod,
		subnodes,
		configNode: configArg?.type === 'ObjectExpression' ? configArg : undefined,
		line: node.loc?.start.line,
		column: node.loc?.start.column,
	};
}

function extractSubnodeInfo(newExpr: AcornNode): AiSubnodeCallInfo | undefined {
	const className = newExpr.callee?.type === 'Identifier' ? (newExpr.callee.name ?? '') : '';
	if (!className) return undefined;
	const configArg = newExpr.arguments?.[0];
	return {
		className,
		configNode: configArg?.type === 'ObjectExpression' ? configArg : undefined,
		line: newExpr.loc?.start.line,
		column: newExpr.loc?.start.column,
	};
}

/** Extract a plain JS object from an ObjectExpression AST node (literals only) */
function astObjectToPlain(node: AcornNode): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const prop of node.properties ?? []) {
		if (prop.type !== 'Property') continue;
		const key = prop.key?.name ?? prop.key?.value;
		if (!key || typeof key !== 'string') continue;
		const valNode = asNode(prop.value);
		if (valNode) result[key] = astValueToPlain(valNode);
	}
	return result;
}

function astValueToPlain(node: AcornNode): unknown {
	if (node.type === 'Literal') return literalValue(node);
	if (node.type === 'ObjectExpression') return astObjectToPlain(node);
	if (node.type === 'ArrayExpression')
		return (node.elements ?? []).map((el) => (el ? astValueToPlain(el) : null));
	if (
		node.type === 'UnaryExpression' &&
		node.operator === '-' &&
		node.argument?.type === 'Literal'
	) {
		return -(literalValue(node.argument) as number);
	}
	return undefined; // Non-literal expressions can't be statically evaluated
}

/** Extract callback info from onX() call */
function extractCallbackInfo(name: string, node: AcornNode): CallbackCallInfo {
	const args = node.arguments ?? [];
	const cbInfo: CallbackCallInfo = {
		callbackName: name,
		hasDestructuredParams: false,
		line: node.loc?.start.line,
		column: node.loc?.start.column,
	};

	// Find the callback function (last argument, should be ArrowFunctionExpression or FunctionExpression)
	const callbackArg = args[args.length - 1];
	if (
		callbackArg &&
		(callbackArg.type === 'ArrowFunctionExpression' || callbackArg.type === 'FunctionExpression')
	) {
		const params = callbackArg.params ?? [];
		if (params.length > 0 && params[0].type === 'ObjectPattern') {
			cbInfo.hasDestructuredParams = true;
		}
	}

	// For onSchedule, extract the options object (first argument)
	if (name === 'onSchedule' && args.length >= 1 && args[0].type === 'ObjectExpression') {
		for (const prop of args[0].properties ?? []) {
			const valNode = asNode(prop.value);
			if (prop.type === 'Property' && prop.key?.name === 'every' && valNode?.type === 'Literal') {
				cbInfo.scheduleEvery = literalValue(valNode) as string;
			}
			if (prop.type === 'Property' && prop.key?.name === 'cron') {
				cbInfo.hasCron = true;
			}
		}
	}

	return cbInfo;
}

/** Extract auth type string from http call arguments */
function extractAuthType(args: AcornNode[], method: string): string | undefined {
	// For GET/DELETE: options is 2nd arg; for POST/PUT/PATCH: options is 3rd arg
	const optionsIndex = NO_BODY_METHODS.has(method) ? 1 : 2;
	const optionsArg = args[optionsIndex];
	if (!optionsArg || optionsArg.type !== 'ObjectExpression') return undefined;

	for (const prop of optionsArg.properties ?? []) {
		const valNode = asNode(prop.value);
		if (
			prop.type === 'Property' &&
			prop.key?.name === 'auth' &&
			valNode?.type === 'ObjectExpression'
		) {
			for (const authProp of valNode.properties ?? []) {
				const authValNode = asNode(authProp.value);
				if (
					authProp.type === 'Property' &&
					authProp.key?.name === 'type' &&
					authValNode?.type === 'Literal'
				) {
					return literalValue(authValNode) as string;
				}
			}
		}
	}
	return undefined;
}

// ─── Rules ───────────────────────────────────────────────────────────────────

type Rule = (info: CollectedInfo, program: AcornNode) => ValidationError[];

function ruleMissingHttpUrl(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const call of info.httpCalls) {
		if (call.argCount === 0) {
			errors.push({
				line: call.line,
				column: call.column,
				message: `http.${call.method}() called with no arguments.`,
				suggestion:
					"Provide a URL as the first argument, e.g. http.get('https://api.example.com').",
				category: 'validation',
				ruleId: 'missing-http-url',
			});
		}
	}
	return errors;
}

function ruleInvalidHttpArgs(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const call of info.httpCalls) {
		if (NO_BODY_METHODS.has(call.method) && call.argCount > 2) {
			errors.push({
				line: call.line,
				column: call.column,
				message: `http.${call.method}() takes at most 2 arguments (url, options), got ${call.argCount}.`,
				suggestion: `http.${call.method}() does not accept a request body. Use at most 2 arguments: (url, options).`,
				category: 'validation',
				ruleId: 'invalid-http-args',
			});
		}
	}
	return errors;
}

function ruleInvalidAuthType(info: CollectedInfo): ValidationError[] {
	const validTypes = Object.keys(AUTH_TYPE_TO_CREDENTIAL);
	const errors: ValidationError[] = [];
	for (const call of info.httpCalls) {
		if (call.authType && !AUTH_TYPE_TO_CREDENTIAL[call.authType]) {
			errors.push({
				line: call.line,
				column: call.column,
				message: `Unknown auth type '${call.authType}'.`,
				suggestion: `Valid auth types are: ${validTypes.join(', ')}.`,
				category: 'validation',
				ruleId: 'invalid-auth-type',
			});
		}
	}
	return errors;
}

function ruleInvalidScheduleFormat(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const cb of info.callbacks) {
		if (cb.callbackName !== 'onSchedule') continue;
		if (cb.hasCron) continue; // cron format is always valid at this level
		if (cb.scheduleEvery && !VALID_SCHEDULE_RE.test(cb.scheduleEvery)) {
			errors.push({
				line: cb.line,
				column: cb.column,
				message: `Invalid schedule format '${cb.scheduleEvery}'.`,
				suggestion: "Use a number followed by a unit: s, m, h, d, w. Examples: '5m', '1h', '30s'.",
				category: 'validation',
				ruleId: 'invalid-schedule-format',
			});
		}
	}
	return errors;
}

function ruleWrongCallbackParams(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const cb of info.callbacks) {
		if (
			cb.hasDestructuredParams &&
			cb.callbackName !== 'onWebhook' &&
			cb.callbackName !== 'onError'
		) {
			errors.push({
				line: cb.line,
				column: cb.column,
				message: `${cb.callbackName}() does not provide destructured parameters like { body }.`,
				suggestion:
					'Only onWebhook() provides destructured parameters ({ body, headers, query }). Remove the parameter or use onWebhook().',
				category: 'validation',
				ruleId: 'wrong-callback-params',
			});
		}
	}
	return errors;
}

function ruleInvalidAiClassName(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const call of info.aiCalls) {
		// Agent is a special known class
		if (call.className === 'Agent') continue;
		const entry = classNameToEntry(call.className);
		if (!entry) {
			errors.push({
				line: call.line,
				column: call.column,
				message: `Unknown AI class '${call.className}'.`,
				suggestion:
					'Check the class name against the AI node registry. Common classes: Agent, OpenAiModel, AnthropicModel, CodeTool, HttpRequestTool.',
				category: 'validation',
				ruleId: 'invalid-ai-class-name',
			});
		}
	}
	// Also check subnodes
	for (const call of info.aiCalls) {
		for (const sub of call.subnodes) {
			const entry = classNameToEntry(sub.className);
			if (!entry) {
				errors.push({
					line: sub.line,
					column: sub.column,
					message: `Unknown AI class '${sub.className}'.`,
					suggestion:
						'Check the class name against the AI node registry. Common classes: OpenAiModel, AnthropicModel, CodeTool, HttpRequestTool.',
					category: 'validation',
					ruleId: 'invalid-ai-class-name',
				});
			}
		}
	}
	return errors;
}

function ruleInvalidAiIoMethod(info: CollectedInfo): ValidationError[] {
	const knownMethods = getKnownIoMethods();
	const errors: ValidationError[] = [];
	for (const call of info.aiCalls) {
		if (!knownMethods.has(call.ioMethod)) {
			errors.push({
				line: call.line,
				column: call.column,
				message: `Unknown AI IO method '.${call.ioMethod}()'.`,
				suggestion: `Valid IO methods are: ${[...knownMethods].join(', ')}.`,
				category: 'validation',
				ruleId: 'invalid-ai-io-method',
			});
		}
	}
	return errors;
}

function ruleInvalidAiClassProps(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validate subnodes
	for (const call of info.aiCalls) {
		for (const sub of call.subnodes) {
			const entry = classNameToEntry(sub.className);
			if (!entry || !sub.configNode) continue;
			const params = astObjectToPlain(sub.configNode);
			const result = validateNodeConfig(
				entry.nodeType,
				entry.version,
				{ parameters: params },
				{ strict: true },
			);
			if (!result.valid) {
				for (const err of result.errors) {
					errors.push({
						line: sub.line,
						column: sub.column,
						message: `${sub.className}: ${err.message}`,
						suggestion: `Check the properties for ${sub.className}. ${err.message}`,
						category: 'validation',
						ruleId: 'invalid-ai-class-props',
					});
				}
			}
		}

		// Validate Agent passthrough params (non-sugar fields)
		if (call.className === 'Agent' && call.configNode) {
			const entry = classNameToEntry('Agent');
			if (entry) {
				const allProps = astObjectToPlain(call.configNode);
				const passthroughParams: Record<string, unknown> = {};
				for (const [key, value] of Object.entries(allProps)) {
					if (!AGENT_SUGAR_FIELDS.has(key)) {
						passthroughParams[key] = value;
					}
				}
				if (Object.keys(passthroughParams).length > 0) {
					const result = validateNodeConfig(
						entry.nodeType,
						entry.version,
						{ parameters: passthroughParams },
						{ strict: true },
					);
					if (!result.valid) {
						for (const err of result.errors) {
							errors.push({
								line: call.line,
								column: call.column,
								message: `Agent: ${err.message}`,
								suggestion: `Check the properties for Agent. ${err.message}`,
								category: 'validation',
								ruleId: 'invalid-ai-class-props',
							});
						}
					}
				}
			}
		}
	}

	return errors;
}

function ruleMultipleRespond(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];
	// Group respond calls by callback index
	const byCallback = new Map<number, RespondCallInfo[]>();
	for (const r of info.respondCalls) {
		const existing = byCallback.get(r.callbackIndex) ?? [];
		existing.push(r);
		byCallback.set(r.callbackIndex, existing);
	}
	for (const [, calls] of byCallback) {
		if (calls.length > 1) {
			// Allow multiple respond() when any are inside conditionals (if/else/switch branches)
			// Pattern: early-return respond in if + final respond, or respond in each branch
			const anyInConditional = calls.some((c) => c.inConditional);
			if (!anyInConditional) {
				// Error on the second respond call
				errors.push({
					line: calls[1].line,
					column: calls[1].column,
					message: 'Multiple respond() calls in the same callback.',
					suggestion:
						'Only one respond() call is allowed per callback. Remove the extra respond() calls.',
					category: 'structure',
					ruleId: 'multiple-respond',
				});
			}
		}
	}
	return errors;
}

function ruleNonNumericRespondStatus(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const r of info.respondCalls) {
		if (r.statusValue !== undefined && typeof r.statusValue !== 'number') {
			errors.push({
				line: r.line,
				column: r.column,
				message: `respond() status must be a number, got '${String(r.statusValue)}'.`,
				suggestion: 'Use a numeric HTTP status code, e.g. respond({ status: 200, body: ... }).',
				category: 'validation',
				ruleId: 'non-numeric-respond-status',
			});
		}
	}
	return errors;
}

function ruleFunctionArgCountMismatch(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];
	const declMap = new Map<string, FunctionDeclInfo>();
	for (const decl of info.functionDecls) {
		declMap.set(decl.name, decl);
	}
	for (const call of info.functionCalls) {
		const decl = declMap.get(call.name);
		if (!decl) continue; // unknown function — not our problem
		if (call.argCount < decl.paramCount) {
			errors.push({
				line: call.line,
				column: call.column,
				message: `${call.name}() expects ${decl.paramCount} argument(s), got ${call.argCount}.`,
				suggestion: `Pass all ${decl.paramCount} required argument(s) to ${call.name}().`,
				category: 'validation',
				ruleId: 'function-arg-count-mismatch',
			});
		}
	}
	return errors;
}

function ruleTryCatchWithoutIO(info: CollectedInfo): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const tc of info.tryCatchBlocks) {
		if (!tc.tryHasIO) {
			errors.push({
				line: tc.line,
				column: tc.column,
				message: 'try/catch block has no IO calls in the try body.',
				suggestion:
					'try/catch in the DSL is used for error handling of IO operations (http, ai, workflow). Regular JS try/catch should be placed inside a Code node.',
				category: 'structure',
				ruleId: 'try-catch-without-io',
			});
		}
	}
	return errors;
}

function ruleLoopVariableAfterLoop(info: CollectedInfo, program: AcornNode): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const loop of info.forOfLoops) {
		const loopEnd = loop.loopEndLine;
		if (!loopEnd) continue;

		// Find identifiers matching loop variable name that appear after the loop
		const refs = findIdentifiersAfterLine(program, loop.variableName, loopEnd);
		for (const ref of refs) {
			errors.push({
				line: ref.line,
				column: ref.column,
				message: `Loop variable '${loop.variableName}' used after the for-of loop has ended.`,
				suggestion: `The variable '${loop.variableName}' is scoped to the for-of loop body and is not available after the loop. Use a different variable or collect results inside the loop.`,
				category: 'structure',
				ruleId: 'loop-variable-after-loop',
			});
		}
	}
	return errors;
}

/** Find Identifier nodes matching `name` that appear after `afterLine` */
function findIdentifiersAfterLine(
	node: AcornNode,
	name: string,
	afterLine: number,
): Array<{ line: number; column: number }> {
	const results: Array<{ line: number; column: number }> = [];

	function walk(n: AcornNode): void {
		if (!n || typeof n.type !== 'string') return;
		if (n.type === 'Identifier' && n.name === name && n.loc && n.loc.start.line > afterLine) {
			results.push({ line: n.loc.start.line, column: n.loc.start.column });
		}
		// Don't descend into for-of loops that declare the same variable
		if (n.type === 'ForOfStatement') {
			const leftNode = n.left;
			if (
				leftNode?.type === 'VariableDeclaration' &&
				leftNode.declarations?.[0]?.id?.name === name
			) {
				return; // This is a different scope for the same variable name
			}
		}
		for (const key of Object.keys(n)) {
			if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
			const child = (n as unknown as Record<string, unknown>)[key];
			if (child && typeof child === 'object') {
				if (Array.isArray(child)) {
					for (const item of child) {
						if (item && typeof item === 'object' && 'type' in item) walk(item as AcornNode);
					}
				} else if ('type' in child) walk(child as AcornNode);
			}
		}
	}

	walk(node);
	return results;
}

interface NamedRule {
	ruleId: string;
	fn: Rule;
}

const ALL_RULES: NamedRule[] = [
	{ ruleId: 'missing-http-url', fn: ruleMissingHttpUrl },
	{ ruleId: 'invalid-http-args', fn: ruleInvalidHttpArgs },
	{ ruleId: 'invalid-auth-type', fn: ruleInvalidAuthType },
	{ ruleId: 'invalid-schedule-format', fn: ruleInvalidScheduleFormat },
	{ ruleId: 'wrong-callback-params', fn: ruleWrongCallbackParams },
	{ ruleId: 'invalid-ai-class-name', fn: ruleInvalidAiClassName },
	{ ruleId: 'invalid-ai-io-method', fn: ruleInvalidAiIoMethod },
	{ ruleId: 'invalid-ai-class-props', fn: ruleInvalidAiClassProps },
	{ ruleId: 'multiple-respond', fn: ruleMultipleRespond },
	{ ruleId: 'non-numeric-respond-status', fn: ruleNonNumericRespondStatus },
	{ ruleId: 'function-arg-count-mismatch', fn: ruleFunctionArgCountMismatch },
	{ ruleId: 'try-catch-without-io', fn: ruleTryCatchWithoutIO },
	{ ruleId: 'loop-variable-after-loop', fn: ruleLoopVariableAfterLoop },
];

// ─── Main Entry Point ────────────────────────────────────────────────────────

export function validateSimplifiedJS(source: string): ValidationResult {
	// Step 1: Parse
	let program: AcornNode;
	try {
		program = acorn.parse(source, {
			ecmaVersion: 'latest',
			sourceType: 'module',
			locations: true,
		}) as AcornNode;
	} catch (err: unknown) {
		if (err instanceof SyntaxError) {
			const acornErr = err as SyntaxError & { loc?: { line: number; column: number } };
			const syntaxError: ValidationError = {
				line: acornErr.loc?.line,
				column: acornErr.loc?.column,
				message: acornErr.message,
				suggestion: 'Fix the syntax error and try again.',
				category: 'syntax',
				ruleId: 'syntax-error',
			};
			return {
				valid: false,
				errors: [syntaxError],
				ruleResults: [{ ruleId: 'syntax-error', passed: false, errors: [syntaxError] }],
			};
		}
		throw err;
	}

	// Step 2: Collect
	const info = collectInfo(program);

	// Step 3: Validate
	const errors: ValidationError[] = [];
	const ruleResults: RuleResult[] = [];
	for (const rule of ALL_RULES) {
		const ruleErrors = rule.fn(info, program);
		ruleResults.push({ ruleId: rule.ruleId, passed: ruleErrors.length === 0, errors: ruleErrors });
		errors.push(...ruleErrors);
	}

	// Sort by line
	errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));

	return {
		valid: errors.length === 0,
		errors,
		ruleResults,
	};
}
