/**
 * Workflow SDK Decompiler
 *
 * Decompiles n8n Workflow-SDK TypeScript code back into the simplified JS DSL.
 * This is the inverse of the transpiler in compiler.ts.
 *
 * Architecture:
 *   SDK TypeScript code → Acorn parse → AST → extract nodes & chains → reverse-map → Simplified JS
 */

import * as acorn from 'acorn';
import type { CompilerError } from './compiler';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface DecompilerResult {
	code: string;
	errors: CompilerError[];
}

// ─── AST Node Type ──────────────────────────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: AST nodes are inherently dynamic
type AcornNode = acorn.Node & Record<string, any>;

// ─── Parsed Node ────────────────────────────────────────────────────────────

interface ParsedNode {
	varName: string;
	factory: string; // 'trigger' | 'node' | 'ifElse' | 'switchCase'
	nodeType: string; // e.g. 'n8n-nodes-base.httpRequest'
	version: number;
	// biome-ignore lint/suspicious/noExplicitAny: config is a dynamic SDK object
	config: Record<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: metadata is a dynamic object
	metadata: Record<string, any>;
	branches?: {
		onTrue?: string[]; // chain of varNames
		onFalse?: string[]; // chain of varNames
	};
	cases?: Array<{
		index: number;
		chain: string[];
	}>;
}

// ─── Decompiler Context ─────────────────────────────────────────────────────

interface DecompilerContext {
	nodes: Map<string, ParsedNode>;
	chains: string[][]; // each chain is ordered list of varNames
	nodeNameToVar: Map<string, string>; // SDK node name → simplified variable name
	codeNodeVars: Set<string>; // variable names exported by Code node return statements
	indent: number;
	lines: string[];
	loopSplitters: Set<string>; // varNames of splitter Code nodes
	loopAggregates: Set<string>; // varNames of aggregate nodes consumed by loops
	triggerType: string; // 'webhook' | 'schedule' | 'manual' | 'error'
	errors: CompilerError[];
}

// ─── Main Decompiler ────────────────────────────────────────────────────────

export function decompileWorkflowSDK(sdkCode: string): DecompilerResult {
	const errors: CompilerError[] = [];

	// Step 1: Parse with Acorn
	let ast: AcornNode;
	try {
		ast = acorn.parse(sdkCode, {
			ecmaVersion: 'latest',
			sourceType: 'module',
		}) as AcornNode;
	} catch (e) {
		const err = e as { message: string };
		errors.push({ message: err.message, category: 'syntax' });
		return { code: '', errors };
	}

	// Step 2: Extract node declarations
	const nodes = extractNodeDeclarations(ast);

	// Step 3: Extract chains from export default
	const chains = extractChains(ast);

	if (chains.length === 0) {
		errors.push({ message: 'No workflow chain found', category: 'structure' });
		return { code: '', errors };
	}

	// Step 4: Build context with variable recovery and loop detection
	const ctx: DecompilerContext = {
		nodes,
		chains,
		nodeNameToVar: new Map(),
		codeNodeVars: new Set(),
		indent: 0,
		lines: [],
		loopSplitters: new Set(),
		loopAggregates: new Set(),
		triggerType: '',
		errors,
	};

	recoverVariableNames(ctx);
	collectCodeNodeVars(ctx);
	detectLoopPatterns(ctx);

	// Step 5: Decompile each chain
	for (let i = 0; i < chains.length; i++) {
		if (i > 0) ctx.lines.push('');
		decompileChain(chains[i], ctx);
	}

	const code = ctx.lines.join('\n');
	return { code: code.endsWith('\n') ? code : `${code}\n`, errors };
}

// ─── AST → Value ────────────────────────────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: converting AST nodes to dynamic JS values
function astToValue(node: AcornNode): any {
	if (!node) return undefined;

	switch (node.type) {
		case 'Literal':
			return node.value;

		case 'TemplateLiteral': {
			// Template literals without expressions → concatenate quasis
			const parts: string[] = [];
			for (const quasi of node.quasis ?? []) {
				parts.push(quasi.value?.cooked ?? quasi.value?.raw ?? '');
			}
			return parts.join('');
		}

		case 'ObjectExpression': {
			// biome-ignore lint/suspicious/noExplicitAny: building dynamic object from AST
			const obj: Record<string, any> = {};
			for (const prop of node.properties ?? []) {
				if (prop.type === 'SpreadElement') continue;
				const key = prop.key?.type === 'Identifier' ? prop.key.name : String(prop.key?.value ?? '');
				obj[key] = astToValue(prop.value);
			}
			return obj;
		}

		case 'ArrayExpression':
			return (node.elements ?? []).map((el: AcornNode) => (el ? astToValue(el) : null));

		case 'UnaryExpression':
			if (node.operator === '-' && node.argument?.type === 'Literal') {
				return -(node.argument.value as number);
			}
			return undefined;

		case 'CallExpression': {
			// Handle subnode factories: languageModel({...}), tool({...}), etc.
			const callee = node.callee;
			if (callee?.type === 'Identifier' && node.arguments?.[0]) {
				const factoryName = callee.name as string;
				const arg = astToValue(node.arguments[0]);
				if (typeof arg === 'object' && arg !== null) {
					return { __factory: factoryName, ...arg };
				}
			}
			return undefined;
		}

		case 'Identifier':
			// Return identifier name as-is (used for variable references in chains)
			return node.name;

		default:
			return undefined;
	}
}

// ─── Node Declaration Extraction ────────────────────────────────────────────

function extractNodeDeclarations(ast: AcornNode): Map<string, ParsedNode> {
	const nodes = new Map<string, ParsedNode>();
	if (!ast.body) return nodes;

	for (const stmt of ast.body) {
		if (stmt.type !== 'VariableDeclaration') continue;

		for (const decl of stmt.declarations ?? []) {
			if (!decl.id?.name || !decl.init) continue;
			const varName = decl.id.name as string;

			const parsed = parseNodeInit(varName, decl.init);
			if (parsed) {
				nodes.set(varName, parsed);
			}
		}
	}

	return nodes;
}

function parseNodeInit(varName: string, initNode: AcornNode): ParsedNode | null {
	// Unwrap chained calls: ifElse({...}).onTrue(x).onFalse(y)
	const { baseCall, chainedCalls } = unwrapChainedCalls(initNode);

	if (!baseCall || baseCall.type !== 'CallExpression') return null;

	const callee = baseCall.callee;
	if (!callee || callee.type !== 'Identifier') return null;

	const factory = callee.name as string;
	const validFactories = ['trigger', 'node', 'ifElse', 'switchCase'];
	if (!validFactories.includes(factory)) return null;

	const arg = baseCall.arguments?.[0];
	if (!arg) return null;

	const config = astToValue(arg);
	if (typeof config !== 'object' || config === null) return null;

	const nodeType = (config.type as string) ?? '';
	const version = (config.version as number) ?? 1;
	const nodeConfig = (config.config as Record<string, unknown>) ?? config;
	const metadata = (config.metadata as Record<string, unknown>) ?? {};

	const parsed: ParsedNode = {
		varName,
		factory,
		nodeType,
		version,
		config: nodeConfig,
		metadata,
	};

	// Extract branch info for ifElse/switchCase
	if (factory === 'ifElse') {
		parsed.branches = {};
		for (const { method, args } of chainedCalls) {
			if (method === 'onTrue' && args[0]) {
				parsed.branches.onTrue = extractChainFromArg(args[0]);
			} else if (method === 'onFalse' && args[0]) {
				parsed.branches.onFalse = extractChainFromArg(args[0]);
			}
		}
	} else if (factory === 'switchCase') {
		parsed.cases = [];
		for (const { method, args } of chainedCalls) {
			if (method === 'onCase' && args.length >= 2) {
				const index = args[0].type === 'Literal' ? (args[0].value as number) : 0;
				const chain = extractChainFromArg(args[1]);
				parsed.cases.push({ index, chain });
			}
		}
	}

	return parsed;
}

interface ChainedCall {
	method: string;
	args: AcornNode[];
}

function unwrapChainedCalls(node: AcornNode): {
	baseCall: AcornNode;
	chainedCalls: ChainedCall[];
} {
	const calls: ChainedCall[] = [];
	let current = node;

	while (
		current.type === 'CallExpression' &&
		current.callee?.type === 'MemberExpression' &&
		current.callee.property?.type === 'Identifier'
	) {
		const method = current.callee.property.name as string;
		// Only unwrap known SDK methods, not the base factory call
		if (!['onTrue', 'onFalse', 'onCase', 'to'].includes(method)) break;

		calls.unshift({ method, args: current.arguments ?? [] });
		current = current.callee.object;
	}

	return { baseCall: current, chainedCalls: calls };
}

function extractChainFromArg(node: AcornNode): string[] {
	// Could be a single Identifier or a .to() chain
	if (node.type === 'Identifier') {
		return [node.name as string];
	}

	// Unwrap .to() chain: http2.to(http3).to(http4) → ["http2", "http3", "http4"]
	// AST nests outside-in: .to(http4) wraps .to(http3) wraps http2
	// So we encounter args in reverse order and must unshift
	const chain: string[] = [];
	let current = node;

	while (
		current.type === 'CallExpression' &&
		current.callee?.type === 'MemberExpression' &&
		current.callee.property?.name === 'to'
	) {
		const arg = current.arguments?.[0];
		if (arg) {
			const argChain = extractChainFromArg(arg);
			chain.unshift(...argChain);
		}
		current = current.callee.object;
	}

	if (current.type === 'Identifier') {
		chain.unshift(current.name as string);
	}

	return chain;
}

// ─── Chain Extraction ───────────────────────────────────────────────────────

function extractChains(ast: AcornNode): string[][] {
	const chains: string[][] = [];
	if (!ast.body) return chains;

	for (const stmt of ast.body) {
		if (stmt.type !== 'ExportDefaultDeclaration') continue;

		// Collect all .add() calls
		const addCalls: AcornNode[] = [];
		let current = stmt.declaration;

		while (
			current?.type === 'CallExpression' &&
			current.callee?.type === 'MemberExpression' &&
			current.callee.property?.name === 'add'
		) {
			addCalls.unshift(current);
			current = current.callee.object;
		}

		for (const addCall of addCalls) {
			const arg = addCall.arguments?.[0];
			if (arg) {
				chains.push(extractChainFromArg(arg));
			}
		}
	}

	return chains;
}

// ─── Variable Name Recovery ─────────────────────────────────────────────────

function recoverVariableNames(ctx: DecompilerContext): void {
	// Scan Code nodes for $('NodeName') references to recover original variable names
	for (const [, node] of ctx.nodes) {
		if (node.nodeType !== 'n8n-nodes-base.code') continue;

		const jsCode = node.config.parameters?.jsCode as string;
		if (!jsCode) continue;

		const refPattern = /const (\w+) = \$\('([^']+)'\)\.all\(\)\.map\(i => i\.json\)/g;
		let match: RegExpExecArray | null;
		while ((match = refPattern.exec(jsCode)) !== null) {
			if (!ctx.nodeNameToVar.has(match[2])) {
				ctx.nodeNameToVar.set(match[2], match[1]);
			}
		}
	}

	// Also map Set node assignment names
	for (const [, node] of ctx.nodes) {
		if (node.nodeType !== 'n8n-nodes-base.set') continue;

		const assignments = node.config.parameters?.assignments?.assignments as Array<{
			name: string;
		}>;
		if (assignments?.length === 1) {
			const nodeName = node.config.name as string;
			ctx.nodeNameToVar.set(nodeName, assignments[0].name);
		}
	}
}

// ─── Code Node Variable Collection ──────────────────────────────────────────

/** Collect variable names from Code node return statements and assignments. */
function collectCodeNodeVars(ctx: DecompilerContext): void {
	for (const [, node] of ctx.nodes) {
		// Collect variables from Code node bodies
		if (node.nodeType !== 'n8n-nodes-base.code') continue;
		const jsCode = (node.config.parameters?.jsCode as string) ?? '';

		// Collect from return statements: return [{ json: { x, y } }]
		const returnMatch = /return \[\{ json: \{ ([^}]+) \} \}\];?$/.exec(jsCode);
		if (returnMatch) {
			for (const v of returnMatch[1].split(',')) {
				const name = v.trim();
				if (name) ctx.codeNodeVars.add(name);
			}
		}

		// Collect from variable declarations: let x, y; or let x = ...; or const x = ...;
		const declPattern = /(?:let|var|const)\s+([^;=]+)/g;
		let declMatch: RegExpExecArray | null;
		while ((declMatch = declPattern.exec(jsCode)) !== null) {
			// Handle "let provider, model" and "const x = ..."
			const declPart = declMatch[1].split('=')[0].trim();
			for (const v of declPart.split(',')) {
				const name = v.trim();
				if (name && /^\w+$/.test(name)) ctx.codeNodeVars.add(name);
			}
		}

		// Collect from bare assignments: model = ...; provider = ...;
		const assignPattern = /^(\w+)\s*=/gm;
		let assignMatch: RegExpExecArray | null;
		while ((assignMatch = assignPattern.exec(jsCode)) !== null) {
			const name = assignMatch[1];
			// Skip common non-variable prefixes
			if (name !== 'return' && name !== 'const' && name !== 'let' && name !== 'var') {
				ctx.codeNodeVars.add(name);
			}
		}
	}
}

// ─── Loop Pattern Detection ─────────────────────────────────────────────────

function detectLoopPatterns(ctx: DecompilerContext): void {
	for (const chain of ctx.chains) {
		for (let i = 0; i < chain.length; i++) {
			const node = ctx.nodes.get(chain[i]);
			if (!node) continue;

			if (isSplitterNode(node)) {
				ctx.loopSplitters.add(chain[i]);

				// Check if an aggregate follows the loop body
				for (let j = i + 1; j < chain.length; j++) {
					const nextNode = ctx.nodes.get(chain[j]);
					if (nextNode?.nodeType === 'n8n-nodes-base.aggregate') {
						ctx.loopAggregates.add(chain[j]);
						break;
					}
					// Stop looking if we hit a node with executeOnce (not part of loop body)
					if (nextNode?.config.executeOnce) break;
				}
			}
		}
	}
}

function isSplitterNode(node: ParsedNode): boolean {
	if (node.nodeType !== 'n8n-nodes-base.code') return false;
	const name = (node.config.name as string) ?? '';
	if (!name.startsWith('Split ')) return false;
	const jsCode = (node.config.parameters?.jsCode as string) ?? '';
	return jsCode.includes('.map(') && jsCode.includes('({ json:');
}

// ─── Chain Decompilation ────────────────────────────────────────────────────

function decompileChain(chain: string[], ctx: DecompilerContext): void {
	if (chain.length === 0) return;

	const triggerVarName = chain[0];
	const triggerNode = ctx.nodes.get(triggerVarName);
	if (!triggerNode) return;

	// Set trigger type for expression resolution context
	if (triggerNode.nodeType === 'n8n-nodes-base.webhook') {
		ctx.triggerType = 'webhook';
	} else if (triggerNode.nodeType === 'n8n-nodes-base.scheduleTrigger') {
		ctx.triggerType = 'schedule';
	} else if (triggerNode.nodeType === 'n8n-nodes-base.errorTrigger') {
		ctx.triggerType = 'error';
	} else {
		ctx.triggerType = 'manual';
	}

	// Determine callback params for webhook
	const hasRespond = chain.some((v) => {
		const n = ctx.nodes.get(v);
		return n?.nodeType === 'n8n-nodes-base.respondToWebhook';
	});

	// Emit trigger header
	const header = emitTriggerHeader(triggerNode, hasRespond);
	emit(ctx, header);
	ctx.indent++;

	// Decompile body nodes
	const bodyNodes = chain.slice(1);
	decompileNodes(bodyNodes, ctx, false);

	// Close callback
	ctx.indent--;
	emit(ctx, '});');
}

function decompileNodes(varNames: string[], ctx: DecompilerContext, inLoop: boolean): void {
	let i = 0;
	let prevWasMultiLine = false;
	let bodyIndex = 0; // index within body (excluding skipped nodes)

	while (i < varNames.length) {
		const varName = varNames[i];
		const node = ctx.nodes.get(varName);
		if (!node) {
			i++;
			continue;
		}

		// Skip nodes consumed by loop patterns
		if (ctx.loopAggregates.has(varName)) {
			i++;
			continue;
		}

		// Handle splitter → for-of loop
		if (ctx.loopSplitters.has(varName)) {
			const consumed = emitForOfLoop(varName, varNames, i, ctx);
			i += consumed;
			prevWasMultiLine = true;
			bodyIndex++;
			continue;
		}

		// Emit blank line before this node if the previous emitted multi-line output
		// For respond: only add blank if the respond itself is multi-line
		const isRespond = node.nodeType === 'n8n-nodes-base.respondToWebhook';
		const respondIsMultiLine = isRespond && willRespondBeMultiLine(node, ctx);
		const needsBlank = bodyIndex > 0 && prevWasMultiLine && (!isRespond || respondIsMultiLine);
		const currentIsMultiLine = willEmitMultiLine(node, ctx);

		// Check factory first for control flow nodes (ifElse/switchCase may have empty nodeType)
		if (node.factory === 'ifElse') {
			if (needsBlank) emit(ctx, '');
			emitIfElseNode(node, ctx, false);
			prevWasMultiLine = true;
		} else if (node.factory === 'switchCase') {
			if (needsBlank) emit(ctx, '');
			emitSwitchNode(node, ctx);
			prevWasMultiLine = true;
		} else {
			switch (node.nodeType) {
				case 'n8n-nodes-base.set':
					if (needsBlank) emit(ctx, '');
					emitSetNode(node, ctx);
					break;

				case 'n8n-nodes-base.httpRequest':
					if (needsBlank) emit(ctx, '');
					emitHttpNode(node, ctx, inLoop);
					break;

				case 'n8n-nodes-base.code':
					if (needsBlank) emit(ctx, '');
					emitCodeNode(node, ctx);
					break;

				case '@n8n/n8n-nodes-langchain.agent':
					if (needsBlank) emit(ctx, '');
					emitAiNode(node, ctx);
					break;

				case 'n8n-nodes-base.respondToWebhook':
					if (needsBlank) emit(ctx, '');
					emitRespondNode(node, ctx);
					break;

				case 'n8n-nodes-base.executeWorkflow':
					if (needsBlank) emit(ctx, '');
					emitWorkflowNode(node, ctx);
					break;

				case 'n8n-nodes-base.if': {
					if (needsBlank) emit(ctx, '');
					emitIfElseNode(node, ctx, false);
					break;
				}

				case 'n8n-nodes-base.switch': {
					if (needsBlank) emit(ctx, '');
					emitSwitchNode(node, ctx);
					break;
				}

				default:
					break;
			}
			prevWasMultiLine = currentIsMultiLine;
		}

		bodyIndex++;
		i++;
	}
}

function willRespondBeMultiLine(node: ParsedNode, ctx: DecompilerContext): boolean {
	const params = node.config.parameters ?? {};
	const status = (params.responseCode as number) ?? 200;
	const bodyStr = params.responseBody as string | undefined;
	const headers = params.responseHeaders as Record<string, string> | undefined;

	// If has headers, always multi-line
	if (headers && Object.keys(headers).length > 0) return true;

	const args: string[] = [`status: ${status}`];
	if (bodyStr) {
		try {
			const parsed = JSON.parse(bodyStr);
			args.push(`body: ${formatObjectWithExpressions(parsed, ctx, 1)}`);
		} catch {
			args.push(`body: '${bodyStr.replace(/'/g, "\\'")}'`);
		}
	}

	const inline = `respond({ ${args.join(', ')} });`;
	return inline.length >= 100 || inline.includes('\n');
}

function willEmitMultiLine(node: ParsedNode, ctx: DecompilerContext): boolean {
	// Determine if this node warrants a blank line after it.
	// This is used to decide whether the NEXT statement should be preceded by a blank line.
	switch (node.nodeType) {
		case 'n8n-nodes-base.httpRequest': {
			const params = node.config.parameters ?? {};
			const nodeName = (node.config.name as string) ?? '';
			const assignedVar = ctx.nodeNameToVar.get(nodeName);
			const jsonBody = params.jsonBody as string | undefined;
			const credStr = reverseCredentials(node.config);
			const hasBody = !!(jsonBody && params.sendBody);
			const hasAuth = !!credStr;

			// HTTP calls with assignment are always "significant" — blank after them
			if (assignedVar) return true;
			// Multi-arg calls are multi-line
			if (hasBody || hasAuth) return true;
			return false;
		}
		case '@n8n/n8n-nodes-langchain.agent':
			return true; // AI calls are always multi-line
		case 'n8n-nodes-base.executeWorkflow':
			return false; // workflow.run is always single-line
		case 'n8n-nodes-base.respondToWebhook':
			return false; // respond() is typically single-line
		case 'n8n-nodes-base.set':
			return true; // Set nodes (const x = ...) usually followed by blank
		case 'n8n-nodes-base.code':
			return true; // Code nodes usually produce multi-line
		default:
			return false;
	}
}

// ─── Trigger Header ─────────────────────────────────────────────────────────

function emitTriggerHeader(node: ParsedNode, hasRespond: boolean): string {
	const params = node.config.parameters ?? {};

	switch (node.nodeType) {
		case 'n8n-nodes-base.manualTrigger':
			return 'onManual(async () => {';

		case 'n8n-nodes-base.webhook': {
			const method = (params.httpMethod as string) ?? 'POST';
			const path = (params.path as string) ?? '/';
			const cbParams = hasRespond ? '{ body, respond }' : '{ body }';
			return `onWebhook({ method: '${method}', path: '${path}' }, async (${cbParams}) => {`;
		}

		case 'n8n-nodes-base.scheduleTrigger': {
			const schedule = reverseScheduleParams(params);
			return `onSchedule(${schedule}, async () => {`;
		}

		case 'n8n-nodes-base.errorTrigger':
			return 'onError(async ({ error, workflow }) => {';

		default:
			return 'onManual(async () => {';
	}
}

function reverseScheduleParams(params: Record<string, unknown>): string {
	const rule = params.rule as { interval?: Array<Record<string, unknown>> };
	if (!rule?.interval?.[0]) return "{ every: '1h' }";

	const interval = rule.interval[0];
	const field = interval.field as string;

	switch (field) {
		case 'hours':
			return `{ every: '${interval.hoursInterval}h' }`;
		case 'minutes':
			return `{ every: '${interval.minutesInterval}m' }`;
		case 'seconds':
			return `{ every: '${interval.secondsInterval}s' }`;
		case 'days':
			return `{ every: '${interval.daysInterval}d' }`;
		case 'weeks':
			return `{ every: '${interval.weeksInterval}w' }`;
		case 'cronExpression':
			return `{ cron: '${interval.expression}' }`;
		default:
			return "{ every: '1h' }";
	}
}

// ─── Set Node ───────────────────────────────────────────────────────────────

function emitSetNode(node: ParsedNode, ctx: DecompilerContext): void {
	const assignments =
		(node.config.parameters?.assignments?.assignments as Array<{
			name: string;
			type: string;
			value: unknown;
		}>) ?? [];

	for (const assignment of assignments) {
		const value = formatLiteral(assignment.value, assignment.type);
		emit(ctx, `const ${assignment.name} = ${value};`);
	}
}

function formatLiteral(value: unknown, type?: string): string {
	if (type === 'string' || typeof value === 'string') {
		return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(value);
}

// ─── HTTP Node ──────────────────────────────────────────────────────────────

function emitHttpNode(node: ParsedNode, ctx: DecompilerContext, _inLoop: boolean): void {
	const params = node.config.parameters ?? {};
	const method = ((params.method as string) ?? 'GET').toLowerCase();
	const url = (params.url as string) ?? '';
	const nodeName = (node.config.name as string) ?? '';

	// Determine variable assignment
	const assignedVar = ctx.nodeNameToVar.get(nodeName);
	const hasAssignment = assignedVar !== undefined;

	// Build arguments
	const args: string[] = [];
	args.push(`'${url}'`);

	// Body (for POST/PUT/PATCH)
	const jsonBody = params.jsonBody as string | undefined;
	if (jsonBody && params.sendBody) {
		const bodyStr = decompileJsonBody(jsonBody, ctx);
		args.push(bodyStr);
	}

	// Credentials/options
	const credStr = reverseCredentials(node.config);
	if (credStr) {
		// If no body but has credentials, need to pass options as second arg for GET/DELETE
		if (!jsonBody && (method === 'get' || method === 'delete')) {
			args.push(credStr);
		} else {
			args.push(credStr);
		}
	}

	// Build the onError annotation
	const onError = node.config.onError as string | undefined;
	if (onError === 'continueRegularOutput') {
		emit(ctx, '// @onError continue');
	}

	// Format the call
	const prefix = hasAssignment ? `const ${assignedVar} = await ` : 'await ';
	const fnCall = `http.${method}`;

	// Try inline format first
	const inline = `${prefix}${fnCall}(${args.join(', ')});`;
	if (inline.length < 80 && !inline.includes('\n')) {
		emit(ctx, inline);
	} else if (args.length === 3 || (args.length === 2 && jsonBody && credStr)) {
		// URL + body + auth → full multi-line
		emitMultiLineCall(ctx, prefix, fnCall, args);
	} else if (args.length === 2 && jsonBody && !credStr) {
		// URL + body (no auth)
		// If first line fits → attached: fn('url', {\n\tkey: val,\n})
		// Otherwise → multi-line: fn(\n\t'url',\n\t{body},\n)
		const attachedFirstLine = `${prefix}${fnCall}(${args[0]}, {`;
		const indentLen = '\t'.repeat(ctx.indent).length;
		if (attachedFirstLine.length + indentLen < 90) {
			emitAttachedBodyCall(ctx, prefix, fnCall, args[0], args[1]);
		} else {
			emitMultiLineCall(ctx, prefix, fnCall, [args[0], args[1]]);
		}
	} else if (args.length === 2 && !jsonBody && credStr) {
		// URL + auth (no body)
		// If first line fits → attached: fn('url', {\n\tauth: ...,\n})
		// Otherwise → multi-line: fn(\n\t'url',\n\t{ auth: ... },\n)
		const attachedFirstLine = `${prefix}${fnCall}(${args[0]}, {`;
		const totalLen = attachedFirstLine.length + ctx.indent;
		if (totalLen <= 102) {
			emitAttachedOptionsCall(ctx, prefix, fnCall, args[0], credStr);
		} else {
			emitMultiLineCall(ctx, prefix, fnCall, args);
		}
	} else {
		emitMultiLineCall(ctx, prefix, fnCall, args);
	}
}

function emitMultiLineCall(
	ctx: DecompilerContext,
	prefix: string,
	fnCall: string,
	args: string[],
): void {
	emit(ctx, `${prefix}${fnCall}(`);
	ctx.indent++;
	for (let i = 0; i < args.length; i++) {
		const trailing = i < args.length - 1 ? ',' : ',';
		const argLines = args[i].split('\n');
		for (let j = 0; j < argLines.length; j++) {
			if (j === argLines.length - 1) {
				emit(ctx, `${argLines[j]}${trailing}`);
			} else {
				emit(ctx, argLines[j]);
			}
		}
	}
	ctx.indent--;
	emit(ctx, ');');
}

function emitAttachedBodyCall(
	ctx: DecompilerContext,
	prefix: string,
	fnCall: string,
	urlArg: string,
	bodyStr: string,
): void {
	// Format: fn('url', {\n\tkey: val,\n});
	// bodyStr is like "{ key: val }" or "{\n\tkey: val,\n}"
	if (bodyStr.startsWith('{')) {
		const inner = bodyStr.slice(1).trimStart();
		// Check if it's a single-line object
		if (!bodyStr.includes('\n')) {
			// Single line: { key: val } → attach directly
			const innerContent = bodyStr.slice(2, -2).trim(); // strip "{ " and " }"
			emit(ctx, `${prefix}${fnCall}(${urlArg}, {`);
			ctx.indent++;
			emit(ctx, `${innerContent},`);
			ctx.indent--;
			emit(ctx, '});');
		} else {
			// Multi-line body: {\nkey: val,\n}
			const lines = inner.split('\n');
			emit(ctx, `${prefix}${fnCall}(${urlArg}, {`);
			ctx.indent++;
			for (const line of lines) {
				const trimmed = line.replace(/^\t+/, '');
				if (trimmed === '}' || trimmed === '},') {
					// closing brace handled below
				} else if (trimmed) {
					emit(ctx, trimmed.endsWith(',') ? trimmed : `${trimmed},`);
				}
			}
			ctx.indent--;
			emit(ctx, '});');
		}
	} else {
		// Fallback to multi-line
		emitMultiLineCall(ctx, prefix, fnCall, [urlArg, bodyStr]);
	}
}

function emitAttachedOptionsCall(
	ctx: DecompilerContext,
	prefix: string,
	fnCall: string,
	urlArg: string,
	optionsStr: string,
): void {
	// Format: fn('url', {\n\tauth: ...,\n});
	// Parse the options to extract the inner content
	// optionsStr is like: { auth: { type: 'bearer', credential: 'Name' } }
	const inner = optionsStr.slice(2, -2).trim(); // strip outer "{ " and " }"
	emit(ctx, `${prefix}${fnCall}(${urlArg}, {`);
	ctx.indent++;
	emit(ctx, `${inner},`);
	ctx.indent--;
	emit(ctx, '});');
}

function decompileJsonBody(jsonStr: string, ctx: DecompilerContext): string {
	try {
		const parsed = JSON.parse(jsonStr);
		// Force multi-line for objects with 2+ top-level properties
		const forceMultiLine =
			typeof parsed === 'object' &&
			!Array.isArray(parsed) &&
			parsed !== null &&
			Object.keys(parsed).length >= 2;
		// depth=1 means properties at 1 tab, closing } at 0 tabs (relative)
		// emitMultiLineCall adds ctx.indent tabs on top via emit()
		return formatObjectWithExpressions(parsed, ctx, 1, forceMultiLine);
	} catch {
		return `'${jsonStr}'`;
	}
}

// biome-ignore lint/suspicious/noExplicitAny: formatting dynamic JSON values
function formatObjectWithExpressions(
	obj: any,
	ctx: DecompilerContext,
	depth: number,
	forceMultiLine: boolean = false,
): string {
	if (obj === null || obj === undefined) return 'null';

	if (typeof obj === 'string') {
		// Check for n8n expression
		const resolved = resolveExpression(obj, ctx);
		if (resolved) return resolved;
		return `'${obj.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
	}

	if (typeof obj === 'number' || typeof obj === 'boolean') {
		return String(obj);
	}

	if (Array.isArray(obj)) {
		if (obj.length === 0) return '[]';
		const items = obj.map((item) => formatObjectWithExpressions(item, ctx, depth));
		const inline = `[${items.join(', ')}]`;
		if (inline.length < 80 && !inline.includes('\n')) return inline;
		const indent = '\t'.repeat(depth);
		const outerIndent = '\t'.repeat(depth - 1);
		return `[\n${items.map((item) => `${indent}${item}`).join(',\n')},\n${outerIndent}]`;
	}

	if (typeof obj === 'object') {
		const entries = Object.entries(obj);
		if (entries.length === 0) return '{}';

		const formatted = entries.map(
			([key, val]) => `${key}: ${formatObjectWithExpressions(val, ctx, depth + 1)}`,
		);

		// Try inline first (unless forced multi-line)
		if (!forceMultiLine) {
			const inline = `{ ${formatted.join(', ')} }`;
			if (inline.length < 90 && !inline.includes('\n')) return inline;
		}

		// Multi-line with proper indentation
		const indent = '\t'.repeat(depth);
		const outerIndent = '\t'.repeat(depth - 1);
		return `{\n${formatted.map((f) => `${indent}${f}`).join(',\n')},\n${outerIndent}}`;
	}

	return String(obj);
}

function resolveExpression(value: string, _ctx: DecompilerContext): string | null {
	// Match ={{ $('NodeName').first().json.prop.path }}
	const namedRef = /^={{ \$\('([^']+)'\)\.first\(\)\.json\.(.+) }}$/;
	let match = namedRef.exec(value);
	if (match) {
		const nodeName = match[1];
		const propPath = match[2];
		// If the first segment of propPath is a known variable (from Code node returns
		// or metadata.varName), use propPath directly — the nodeNameToVar mapping from
		// Code node reference scaffolding lines may be ambiguous
		const firstProp = propPath.split('.')[0];
		if (_ctx.codeNodeVars.has(firstProp)) return propPath;
		const varName = _ctx.nodeNameToVar.get(nodeName);
		if (varName) return `${varName}.${propPath}`;
		return propPath;
	}

	// Match ={{ $('NodeName').first().json }}
	const namedRefFull = /^={{ \$\('([^']+)'\)\.first\(\)\.json }}$/;
	match = namedRefFull.exec(value);
	if (match) {
		const varName = _ctx.nodeNameToVar.get(match[1]);
		return varName ?? match[1];
	}

	// Match ={{ $json.prop }}
	const jsonRef = /^={{ \$json\.(.+) }}$/;
	match = jsonRef.exec(value);
	if (match) {
		const prop = match[1];
		const firstSegment = prop.split('.')[0].split('[')[0];
		// If first segment is a known Code node variable, it's not a webhook body reference
		if (_ctx.triggerType === 'webhook' && !_ctx.codeNodeVars.has(firstSegment))
			return `body.${prop}`;
		return prop;
	}

	// Match ={{$json.prop}} (no spaces)
	const jsonRefNoSpace = /^={{(\$json(?:\..+)?)}}$/;
	match = jsonRefNoSpace.exec(value);
	if (match) {
		const expr = match[1];
		if (expr === '$json') return null; // loop variable reference
		const propMatch = /^\$json\.(.+)$/.exec(expr);
		if (propMatch) {
			const firstSeg = propMatch[1].split('.')[0].split('[')[0];
			if (_ctx.triggerType === 'webhook' && !_ctx.codeNodeVars.has(firstSeg))
				return `body.${propMatch[1]}`;
			return propMatch[1];
		}
	}

	// Match ={{$json}} (loop variable)
	if (value === '={{$json}}') return null;

	return null;
}

function reverseCredentials(config: Record<string, unknown>): string | null {
	const credentials = config.credentials as Record<string, { name: string }> | undefined;
	if (!credentials) return null;

	const params = config.parameters as Record<string, unknown>;
	const genericAuthType = params?.genericAuthType as string | undefined;

	let authType: string;
	let credName: string;

	if (genericAuthType === 'httpHeaderAuth' && credentials.httpHeaderAuth) {
		authType = 'bearer';
		credName = credentials.httpHeaderAuth.name;
	} else if (genericAuthType === 'httpBasicAuth' && credentials.httpBasicAuth) {
		authType = 'basic';
		credName = credentials.httpBasicAuth.name;
	} else if (genericAuthType === 'oAuth2Api' && credentials.oAuth2Api) {
		authType = 'oauth2';
		credName = credentials.oAuth2Api.name;
	} else {
		// Try to detect from credentials keys
		if (credentials.httpHeaderAuth) {
			authType = 'bearer';
			credName = credentials.httpHeaderAuth.name;
		} else if (credentials.httpBasicAuth) {
			authType = 'basic';
			credName = credentials.httpBasicAuth.name;
		} else if (credentials.oAuth2Api) {
			authType = 'oauth2';
			credName = credentials.oAuth2Api.name;
		} else {
			return null;
		}
	}

	return `{ auth: { type: '${authType}', credential: '${credName}' } }`;
}

// ─── Code Node ──────────────────────────────────────────────────────────────

function emitCodeNode(node: ParsedNode, ctx: DecompilerContext): void {
	const jsCode = (node.config.parameters?.jsCode as string) ?? '';

	// Strip scaffolding lines
	const lines = jsCode.split('\n');
	const userLines: string[] = [];

	for (const line of lines) {
		// Skip "// From:" comment
		if (line.startsWith('// From:')) continue;

		// Skip $() reference lines
		if (/^const \w+ = \$\('[^']+'\)\.all\(\)\.map\(i => i\.json\);?$/.test(line.trim())) continue;

		// Skip return [{ json: ... }] lines
		if (/^return \[\{ json: \{.*\} \}\];?$/.test(line.trim())) continue;

		userLines.push(line);
	}

	// Strip base indentation — code was stored with original source indentation
	// which includes the callback body indent. Find minimum indent and strip it.
	let minIndent = Infinity;
	for (const line of userLines) {
		if (!line.trim()) continue;
		const leadingTabs = line.match(/^\t*/)?.[0].length ?? 0;
		if (leadingTabs < minIndent) minIndent = leadingTabs;
	}
	if (!Number.isFinite(minIndent)) minIndent = 0;

	// Emit remaining user code with base indentation stripped, preserving blank lines
	for (const line of userLines) {
		if (line.trim()) {
			emit(ctx, line.slice(minIndent));
		} else {
			emit(ctx, '');
		}
	}
}

// ─── AI Node ────────────────────────────────────────────────────────────────

function emitAiNode(node: ParsedNode, ctx: DecompilerContext): void {
	const params = node.config.parameters ?? {};
	const prompt = (params.text as string) ?? '';
	const subnodes = node.config.subnodes as Record<string, unknown> | undefined;

	let model = 'gpt-4o-mini';
	if (subnodes?.model) {
		// biome-ignore lint/suspicious/noExplicitAny: dynamic subnode structure
		const modelNode = subnodes.model as any;
		model = modelNode?.config?.parameters?.model?.value ?? 'gpt-4o-mini';
	}

	// Build options
	const options: string[] = [];

	// Tools
	if (subnodes?.tools && Array.isArray(subnodes.tools)) {
		const tools = (subnodes.tools as Array<Record<string, unknown>>).map(reverseToolSubnode);
		// Format each tool as inline object
		const toolStrs = tools.map((t) => {
			const entries = Object.entries(t)
				.map(([k, v]) => `${k}: '${v}'`)
				.join(', ');
			return `{ ${entries} }`;
		});
		// Check if all tools fit on one line
		const inlineTools = `tools: [${toolStrs.join(', ')}]`;
		if (inlineTools.length < 80 && !inlineTools.includes('\n')) {
			options.push(inlineTools);
		} else {
			// Multi-line tools array
			const indent = '\t\t\t';
			const toolLines = toolStrs.map((t) => `${indent}${t}`).join(',\n');
			options.push(`tools: [\n${toolLines},\n\t\t]`);
		}
	}

	// Memory
	if (subnodes?.memory) {
		const memoryStr = reverseMemorySubnode(subnodes.memory as Record<string, unknown>);
		options.push(`memory: ${memoryStr}`);
	}

	// Determine variable assignment
	const nodeName = (node.config.name as string) ?? '';
	const assignedVar = ctx.nodeNameToVar.get(nodeName);
	const prefix = assignedVar ? `const ${assignedVar} = await ` : 'await ';

	// Build onError annotation
	const onError = node.config.onError as string | undefined;
	if (onError === 'continueRegularOutput') {
		emit(ctx, '// @onError continue');
	}

	// Determine if we'll have options (need to know before choosing format)
	const hasOutputParser = !!subnodes?.outputParser;
	const hasOptions = options.length > 0 || hasOutputParser;

	const modelStr = `'${model}'`;
	const promptStr = `'${prompt}'`;

	if (!hasOptions) {
		emit(ctx, `${prefix}ai.chat(${modelStr}, ${promptStr});`);
	} else {
		// Determine format: attached vs multi-line
		const attachedFirstLine = `${prefix}ai.chat(${modelStr}, ${promptStr}, {`;
		const totalLen = attachedFirstLine.length + ctx.indent;
		const useAttached = totalLen <= 80;

		// Build output parser with correct depth
		if (hasOutputParser) {
			// In attached format: options emit at ctx.indent+1, so parser depth = ctx.indent+2
			// In multi-line format: options emit at ctx.indent+2, so parser depth = ctx.indent+3
			const parserDepth = useAttached ? ctx.indent + 2 : ctx.indent + 3;
			const parserStr = reverseOutputParserSubnode(
				subnodes!.outputParser as Record<string, unknown>,
				parserDepth,
			);
			options.push(`outputParser: ${parserStr}`);
		}

		if (useAttached) {
			// Attached format
			emit(ctx, attachedFirstLine);
			ctx.indent++;
			for (const opt of options) {
				emit(ctx, `${opt},`);
			}
			ctx.indent--;
			emit(ctx, '});');
		} else {
			// Multi-line format: ai.chat(\n\t'model',\n\t'prompt',\n\t{...},\n)
			emit(ctx, `${prefix}ai.chat(`);
			ctx.indent++;
			emit(ctx, `${modelStr},`);
			emit(ctx, `${promptStr},`);
			emit(ctx, '{');
			ctx.indent++;
			for (const opt of options) {
				emit(ctx, `${opt},`);
			}
			ctx.indent--;
			emit(ctx, '},');
			ctx.indent--;
			emit(ctx, ');');
		}
	}
}

function reverseToolSubnode(tool: Record<string, unknown>): Record<string, unknown> {
	const type = (tool.type as string) ?? '';
	const params = ((tool as Record<string, unknown>).config as Record<string, unknown>)
		?.parameters as Record<string, unknown>;

	if (type.includes('toolCode')) {
		return {
			type: 'code',
			name: params?.name ?? '',
			code: params?.jsCode ?? '',
		};
	}
	if (type.includes('toolHttpRequest')) {
		return {
			type: 'httpRequest',
			name: params?.name ?? '',
			url: params?.url ?? '',
		};
	}
	return { type: 'unknown' };
}

function reverseMemorySubnode(memory: Record<string, unknown>): string {
	const type = (memory.type as string) ?? '';
	const params = (memory.config as Record<string, unknown>)?.parameters as Record<string, unknown>;

	if (type.includes('memoryBufferWindow')) {
		const contextLength = params?.contextWindowLength ?? 5;
		return `{ type: 'bufferWindow', contextLength: ${contextLength} }`;
	}
	return "{ type: 'bufferWindow' }";
}

function reverseOutputParserSubnode(parser: Record<string, unknown>, baseDepth: number): string {
	const type = (parser.type as string) ?? '';
	const params = (parser.config as Record<string, unknown>)?.parameters as Record<string, unknown>;

	if (type.includes('outputParserStructured')) {
		const schema = params?.schema;
		if (schema) {
			const schemaStr = formatSchemaObject(schema as Record<string, unknown>, baseDepth);
			const d1 = '\t'.repeat(baseDepth);
			const d0 = '\t'.repeat(baseDepth - 1);
			// Check if schema fits inline
			const inline = `{ type: 'structured', schema: ${schemaStr} }`;
			if (inline.length < 70) return inline;
			return `{\n${d1}type: 'structured',\n${d1}schema: ${schemaStr},\n${d0}}`;
		}
		return "{ type: 'structured', schema: {} }";
	}
	if (type.includes('outputParserAutoFix')) {
		return "{ type: 'autoFix' }";
	}
	return "{ type: 'structured' }";
}

function formatSchemaObject(schema: Record<string, unknown>, depth?: number): string {
	const entries = Object.entries(schema);
	const formatted = entries.map(([k, v]) => `${k}: '${v}'`);
	const inline = `{ ${formatted.join(', ')} }`;
	if (inline.length < 80 || depth === undefined) return inline;
	// Multi-line
	const d1 = '\t'.repeat(depth + 1);
	const d0 = '\t'.repeat(depth);
	return `{\n${formatted.map((f) => `${d1}${f}`).join(',\n')},\n${d0}}`;
}

// ─── Respond Node ───────────────────────────────────────────────────────────

function emitRespondNode(node: ParsedNode, ctx: DecompilerContext): void {
	const params = node.config.parameters ?? {};
	const status = (params.responseCode as number) ?? 200;
	const bodyStr = params.responseBody as string | undefined;
	const headers = params.responseHeaders as Record<string, string> | undefined;

	const args: string[] = [];
	args.push(`status: ${status}`);

	if (headers && Object.keys(headers).length > 0) {
		const headerEntries = Object.entries(headers)
			.map(([k, v]) => `'${k}': '${v}'`)
			.join(', ');
		args.push(`headers: { ${headerEntries} }`);
	}

	if (bodyStr) {
		try {
			const parsed = JSON.parse(bodyStr);
			// depth=1 because emit() will add ctx.indent tabs to each line
			const bodyFormatted = formatObjectWithExpressions(parsed, ctx, 1);
			args.push(`body: ${bodyFormatted}`);
		} catch {
			// Not JSON (e.g., XML string)
			args.push(`body: '${bodyStr.replace(/'/g, "\\'")}'`);
		}
	}

	const inline = `respond({ ${args.join(', ')} });`;
	if (inline.length < 100 && !inline.includes('\n')) {
		emit(ctx, inline);
	} else {
		emit(ctx, 'respond({');
		ctx.indent++;
		for (const arg of args) {
			const argWithComma = `${arg},`;
			const argLines = argWithComma.split('\n');
			for (const line of argLines) {
				emit(ctx, line);
			}
		}
		ctx.indent--;
		emit(ctx, '});');
	}
}

// ─── Execute Workflow Node ──────────────────────────────────────────────────

function emitWorkflowNode(node: ParsedNode, ctx: DecompilerContext): void {
	const params = node.config.parameters ?? {};
	const workflowId = params.workflowId as { value?: string } | undefined;
	const name = workflowId?.value ?? 'Unknown';

	const nodeName = (node.config.name as string) ?? '';
	const assignedVar = ctx.nodeNameToVar.get(nodeName);
	const prefix = assignedVar ? `const ${assignedVar} = await ` : 'await ';

	emit(ctx, `${prefix}workflow.run('${name}');`);
}

// ─── IfElse Node ────────────────────────────────────────────────────────────

function emitIfElseNode(node: ParsedNode, ctx: DecompilerContext, isElseIf: boolean): void {
	const params = node.config.parameters ?? {};
	const conditions = params.conditions as Record<string, unknown>;
	const condStr = reverseConditions(conditions, ctx);

	const keyword = isElseIf ? '} else if' : 'if';
	emit(ctx, `${keyword} (${condStr}) {`);
	ctx.indent++;

	// Emit true branch
	if (node.branches?.onTrue) {
		decompileNodes(node.branches.onTrue, ctx, false);
	}

	ctx.indent--;

	// Emit false branch
	if (node.branches?.onFalse && node.branches.onFalse.length > 0) {
		const falseNode = ctx.nodes.get(node.branches.onFalse[0]);
		if (falseNode?.factory === 'ifElse') {
			// else-if chain
			emitIfElseNode(falseNode, ctx, true);
		} else {
			emit(ctx, '} else {');
			ctx.indent++;
			decompileNodes(node.branches.onFalse, ctx, false);
			ctx.indent--;
			emit(ctx, '}');
		}
	} else {
		emit(ctx, '}');
	}
}

function reverseConditions(conditions: Record<string, unknown>, ctx: DecompilerContext): string {
	const condArray = conditions?.conditions as Array<Record<string, unknown>>;
	const combinator = (conditions?.combinator as string) ?? 'and';

	if (!condArray || condArray.length === 0) return 'true';

	const parts = condArray.map((cond) => reverseSingleCondition(cond, ctx));

	if (parts.length === 1) return parts[0];
	const joiner = combinator === 'or' ? ' || ' : ' && ';
	return parts.join(joiner);
}

function reverseSingleCondition(cond: Record<string, unknown>, ctx: DecompilerContext): string {
	const leftValue = cond.leftValue as string;
	const rightValue = cond.rightValue as string;
	const operator = cond.operator as { type?: string; operation?: string; singleValue?: boolean };

	const left = resolveConditionExpr(leftValue, ctx);

	if (operator?.singleValue) {
		// Unary operations
		switch (operator.operation) {
			case 'exists':
				return left;
			case 'notExists':
				return `!${left}`;
			default:
				return left;
		}
	}

	const right = resolveConditionExpr(rightValue, ctx);

	switch (operator?.operation) {
		case 'equals':
			return `${left} === ${right}`;
		case 'notEquals':
			return `${left} !== ${right}`;
		case 'gt':
			return `${left} > ${right}`;
		case 'lt':
			return `${left} < ${right}`;
		case 'gte':
			return `${left} >= ${right}`;
		case 'lte':
			return `${left} <= ${right}`;
		default:
			return `${left} === ${right}`;
	}
}

function resolveConditionExpr(value: string, ctx: DecompilerContext): string {
	if (!value) return '""';

	// Match ={{ $('NodeName').first().json.prop.path }}
	const namedRef = /^={{ \$\('([^']+)'\)\.first\(\)\.json\.(.+) }}$/;
	let match = namedRef.exec(value);
	if (match) {
		const propPath = match[2];
		const firstProp = propPath.split('.')[0];
		if (ctx.codeNodeVars.has(firstProp)) return propPath;
		const varName = ctx.nodeNameToVar.get(match[1]);
		if (varName) return `${varName}.${propPath}`;
		return propPath;
	}

	// Match ={{ $json.prop }}
	const jsonRef = /^={{ \$json\.(.+) }}$/;
	match = jsonRef.exec(value);
	if (match) {
		const prop = match[1];
		const firstSeg = prop.split('.')[0].split('[')[0];
		if (ctx.triggerType === 'webhook' && !ctx.codeNodeVars.has(firstSeg)) return `body.${prop}`;
		return prop;
	}

	// Literal string value
	if (typeof value === 'string' && value && !value.startsWith('={{')) {
		return `'${value}'`;
	}

	return `'${value}'`;
}

// ─── Switch Node ────────────────────────────────────────────────────────────

function emitSwitchNode(node: ParsedNode, ctx: DecompilerContext): void {
	const params = node.config.parameters ?? {};
	const rules = params.rules as Record<string, unknown>;
	const values = (rules?.values as Array<Record<string, unknown>>) ?? [];

	// Extract discriminant from first condition's leftValue
	let discriminant = 'value';
	if (values.length > 0) {
		const firstCond = values[0]?.conditions as Record<string, unknown>;
		const condArr = firstCond?.conditions as Array<Record<string, unknown>>;
		if (condArr?.[0]) {
			discriminant = resolveConditionExpr(condArr[0].leftValue as string, ctx);
		}
	}

	emit(ctx, `switch (${discriminant}) {`);
	ctx.indent++;

	// Emit each case
	if (node.cases) {
		for (const caseInfo of node.cases) {
			const value = values[caseInfo.index];
			const cond = value?.conditions as Record<string, unknown>;
			const condArr = cond?.conditions as Array<Record<string, unknown>>;
			const testValue = condArr?.[0]?.rightValue as string;

			emit(ctx, `case '${testValue}':`);
			ctx.indent++;
			decompileNodes(caseInfo.chain, ctx, false);
			emit(ctx, 'break;');
			ctx.indent--;
		}
	}

	// Check for default case (fallbackOutput: 'extra')
	const options = params.options as Record<string, unknown> | undefined;
	const fallback = options?.fallbackOutput ?? (rules as Record<string, unknown>)?.fallbackOutput;
	if (fallback === 'extra') {
		// Default case would be the last output, but we may not have the chain for it
		// since it's not in .onCase() calls
	}

	ctx.indent--;
	emit(ctx, '}');
}

// ─── For-Of Loop ────────────────────────────────────────────────────────────

function emitForOfLoop(
	splitterVarName: string,
	chain: string[],
	startIndex: number,
	ctx: DecompilerContext,
): number {
	const splitter = ctx.nodes.get(splitterVarName);
	if (!splitter) return 1;

	const jsCode = (splitter.config.parameters?.jsCode as string) ?? '';

	// Extract loop variable and iterable from splitter code
	// Pattern: return X.map(loopVar => ({ json: loopVar }));
	const mapMatch = /return (\w+)\.map\((\w+) => \(\{ json: \2 \}\)\)/.exec(jsCode);
	const loopVar = mapMatch?.[2] ?? 'item';
	const iterableVar = mapMatch?.[1] ?? 'items';

	emit(ctx, `for (const ${loopVar} of ${iterableVar}) {`);
	ctx.indent++;

	// Collect loop body nodes (nodes without executeOnce, until aggregate or executeOnce node)
	const bodyNodes: string[] = [];
	let consumed = 1; // count the splitter itself

	for (let i = startIndex + 1; i < chain.length; i++) {
		const nextVarName = chain[i];
		if (ctx.loopAggregates.has(nextVarName)) {
			consumed++;
			break;
		}
		const nextNode = ctx.nodes.get(nextVarName);
		// ifElse/switchCase always have executeOnce, so don't break on those
		if (
			nextNode?.config.executeOnce &&
			nextNode.factory !== 'ifElse' &&
			nextNode.factory !== 'switchCase'
		)
			break;

		bodyNodes.push(nextVarName);
		consumed++;
	}

	decompileNodes(bodyNodes, ctx, true);

	ctx.indent--;
	emit(ctx, '}');

	return consumed;
}

// ─── Output Helpers ─────────────────────────────────────────────────────────

function emit(ctx: DecompilerContext, text: string): void {
	if (text === '') {
		ctx.lines.push('');
	} else {
		const indent = '\t'.repeat(ctx.indent);
		ctx.lines.push(`${indent}${text}`);
	}
}
