/**
 * Translates v1 parameter values (`=…{{ … }}…`) to subset code.
 *
 * The translation rewrites the n8n variables that have a plain meaning in the
 * generated source: the current item, the item lists of other nodes, the item
 * index and a few constants. It then passes the code through `rewriteLegacy`
 * of `src/legacy/`, which reports the n8n variables that are left. The
 * compiler checks the result when it compiles the whole workflow.
 */
import ts from 'typescript';

import type { LegacyIssue } from '../legacy/index.ts';
import { parsesAsExpression, rewriteLegacy } from '../legacy/index.ts';
import type { Code } from './code.ts';
import { rewriteLuxon } from './code-native/luxon-expression.ts';
import { escapeControls, literal, raw, str } from './code.ts';
import { nullishness } from './conditions.ts';
import { isRecord } from './types.ts';

/** The variable that holds the current item in generated loops. */
export const ITEM = '$json';
/** The variable that holds the index of the current item. */
export const INDEX = 'i';

export interface PairedItem {
	code: string;
	usesIndex: boolean;
	/** Set when the pairing is a guess by position. */
	approximate?: boolean;
}

/** What the translation knows about the scope of the expression. */
export interface ExpressionScope {
	/** Code of the paired item of node `name`, or null when the node is unknown. */
	pairedItem(name: string): PairedItem | null;
	/** Code of the item list of node `name`, or null when the node is unknown. */
	nodeList(name: string): string | null;
	nodeParameters(name: string): Record<string, unknown> | null;
	/** Code of the input list of the node. */
	inputList: string;
	/**
	 * Code of the whole input list for `$items()`, when it differs from
	 * `inputList`: v1 gives all input items to `$items()` of a node with
	 * "execute once", which runs with the first item only.
	 */
	itemsList?: string;
	ownParameters: Record<string, unknown>;
	workflowName: string;
	workflowId: string;
	/** The name of the node before this one, when it is fixed. */
	prevNode: string | null;
	/** Code of the v1 source of the input (`{ previousNode, previousNodeOutput, previousNodeRun }`), when it changes at run time. */
	prevSource?: string;
	/** Code of the run index of the node. The default is `0`. */
	runIndex?: string;
	/** Code of the node context of node `name`, or null when the node is unknown. */
	nodeContext?(name: string): string | null;
	/** Code of n8n instance data: `execution` (id, mode, resume URLs), `customData`, `vars` or `env`. */
	instance?(key: 'execution' | 'customData' | 'vars' | 'env'): string;
	/** Wraps translated code, so the driver can find it in the generated source. */
	mark?(code: string, path: string, expression: string): string;
	/** Issues that an earlier compile of the generated source found at `path`. */
	knownIssues?(path: string): LegacyIssue[] | undefined;
	/**
	 * Code of the v1 value of a whole parameter value (`=…`) that n8n's
	 * expression engine gives in the fallback host. The code reads the item
	 * index. Without it, an expression that does not translate is a failure.
	 */
	hostValue?(value: string): string;
	/** Code of variables that the node binds, for example `$response` in HTTP pagination. */
	locals?: Record<string, string>;
	/** The workflow time zone, the default zone of Luxon. Without it, Luxon forms do not translate. */
	timezone?: string;
	/** Records a time zone that the code uses (META `zones`). */
	useZone?(zone: string): void;
}

export interface Usage {
	/** Uses the current item. */
	item: boolean;
	/** Uses the item index. */
	index: boolean;
	/** Pairs an item by position only. */
	approximate: boolean;
	nodes: Set<string>;
}

export const emptyUsage = (): Usage => ({
	item: false,
	index: false,
	approximate: false,
	nodes: new Set(),
});

/**
 * Where a raw expression gives the same value as in v1, when the fallback
 * host evaluates it against the items of the call:
 * `any`: in every call; `batch`: only when the call has all items;
 * `none`: never, because it reads data that the host does not have.
 */
export type HostSafety = 'any' | 'batch' | 'none';

export interface Failure {
	expression: string;
	issues: LegacyIssue[];
	hostSafety: HostSafety;
	/** Parameter path. */
	path: string;
	/** Start and end of the expression code in the generated value, filled in later. */
}

export type BodyResult =
	| { ok: true; code: string; usage: Usage }
	| { ok: false; issues: LegacyIssue[] };

const HOST_UNSAFE =
	/\$\(|\$node\b|\$items\b|\$prevNode\b|\$execution\b|\$workflow\b|\$vars\b|\$env\b|\$fromAI\b|\$parameter\b|\$runIndex\b|\$response\b|\$pageCount\b|\$agentInfo\b|\$evaluateExpression\b/;
const HOST_BATCH_ONLY = /\$input\s*\.\s*(all|first|last)\b|\$itemIndex\b|\$index\b/;

export function hostSafety(body: string): HostSafety {
	if (HOST_UNSAFE.test(body)) return 'none';
	if (HOST_BATCH_ONLY.test(body)) return 'batch';
	return 'any';
}

export interface Segment {
	text?: string;
	expression?: string;
}

/** Splits the text of an `=` value (without the `=`) into text and `{{ }}` parts. */
export function segments(value: string): Segment[] {
	const out: Segment[] = [];
	let i = 0;
	for (;;) {
		const open = value.indexOf('{{', i);
		if (open < 0) break;
		const close = value.indexOf('}}', open + 2);
		if (close < 0) break;
		if (open > i) out.push({ text: value.slice(i, open) });
		out.push({ expression: value.slice(open + 2, close) });
		i = close + 2;
	}
	if (i < value.length) out.push({ text: value.slice(i) });
	return out;
}

export function isExpression(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('=');
}

interface Edit {
	start: number;
	end: number;
	text: string;
}

function stringArgument(call: ts.CallExpression): string | null {
	const a = call.arguments[0];
	if (call.arguments.length !== 1 || !a) return null;
	if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) return a.text;
	return null;
}

function isNameOf(n: ts.Identifier): boolean {
	const p = n.parent;
	return (
		(ts.isPropertyAccessExpression(p) && p.name === n) ||
		(ts.isPropertyAssignment(p) && p.name === n) ||
		(ts.isMethodDeclaration(p) && p.name === n) ||
		(ts.isBindingElement(p) && p.propertyName === n)
	);
}

function memberName(n: ts.Node): string | null {
	if (ts.isPropertyAccessExpression(n)) return n.name.text;
	return null;
}

const ITEM_MEMBERS = new Set(['json', 'binary', 'pairedItem', 'index']);

const ARRAY_MEMBERS = new Set([
	'length',
	'map',
	'filter',
	'find',
	'findIndex',
	'some',
	'every',
	'reduce',
	'forEach',
	'flatMap',
	'slice',
	'concat',
	'join',
	'includes',
	'indexOf',
	'at',
	'sort',
	'reverse',
	'flat',
	'push',
	'pop',
	'shift',
	'unshift',
]);

/** An expression that throws, typed as an item, for references that v1 rejects at run time. */
const throwing = (message: string) => `((): Json => { throw new Error(${str(message)}); })()`;

const wrapItems = (list: string) => `${list}.map((json: Json) => ({ json }))`;

/**
 * Translates one `{{ }}` body. The result is subset code that reads `$json`,
 * `i` and the node list variables of the scope.
 */
export function translateBody(body: string, scope: ExpressionScope): BodyResult {
	const trimmed = body.trim();
	if (trimmed === '') return { ok: true, code: 'undefined', usage: emptyUsage() };
	if (!parsesAsExpression(trimmed)) {
		return {
			ok: false,
			issues: [{ feature: 'syntax', message: 'The body is not one expression.', code: 'WL100' }],
		};
	}
	const text = `(${trimmed})`;
	const sf = ts.createSourceFile('e.ts', text, ts.ScriptTarget.ES2022, true);
	const edits: Edit[] = [];
	const issues: LegacyIssue[] = [];
	const usage = emptyUsage();
	const unsupported = (feature: string) =>
		issues.push({
			feature,
			message: `\`${feature}\` has no mapping to the subset.`,
			code: 'WL101',
		});
	const replace = (from: ts.Node, to: ts.Node, code: string) =>
		edits.push({ start: from.getStart(sf), end: to.getEnd(), text: code });
	// v1 stops with an expression error when the node does not exist or has not run.
	const missing = (name: string) =>
		throwing(
			scope.nodeParameters(name) === null
				? "Referenced node doesn't exist"
				: `Node '${name}' hasn't been executed`,
		);
	const listOf = (name: string): string | null => {
		const list = scope.nodeList(name);
		if (list === null) return missing(name);
		usage.nodes.add(name);
		return list;
	};
	const pairedOf = (name: string): string | null => {
		const p = scope.pairedItem(name);
		if (p === null) return missing(name);
		usage.nodes.add(name);
		if (p.code.includes(ITEM)) usage.item = true;
		if (p.usesIndex) usage.index = true;
		if (p.approximate) usage.approximate = true;
		return p.code;
	};
	const paramsOf = (name: string): string | null => {
		const p = scope.nodeParameters(name);
		if (p === null) {
			unsupported(`unknown node "${name}"`);
			return null;
		}
		return printFlat(literal(p));
	};

	/** Rewrites `<base>.item / .first() / .last() / .all() / .params …` chains. */
	const nodeChain = (base: ts.Node, name: string, list: () => string | null, own: boolean) => {
		const p = base.parent;
		const member = memberName(p);
		const call = member !== null && ts.isCallExpression(p.parent) && p.parent.expression === p;
		const after = call ? p.parent.parent : p.parent;
		const json = ts.isPropertyAccessExpression(after) && after.name.text === 'json';
		// An item has `json`, `binary`, `pairedItem` and `index`; other members are undefined in v1.
		const itemMember =
			ts.isPropertyAccessExpression(after) && !ITEM_MEMBERS.has(after.name.text) ? after : null;
		const single =
			(member === 'item' && !call) || ((member === 'first' || member === 'last') && call);
		if (single && itemMember && !own) {
			replace(base, itemMember, 'undefined');
			return;
		}
		// `.all()` gives an array; a member that arrays do not have is undefined.
		if (
			member === 'all' &&
			call &&
			ts.isPropertyAccessExpression(after) &&
			!ARRAY_MEMBERS.has(after.name.text)
		) {
			replace(base, after, 'undefined');
			return;
		}
		if (member === 'item' && !call) {
			const code = own ? ITEM : pairedOf(name);
			if (own) usage.item = true;
			if (code === null) return;
			if (json) replace(base, after, code);
			else replace(base, p, `({ json: ${code} })`);
			return;
		}
		if ((member === 'first' || member === 'last') && call) {
			const l = list();
			if (l === null) return;
			const code = member === 'first' ? `${l}[0]` : `${l}[${l}.length - 1]`;
			if (json) replace(base, after, code);
			else replace(base, p.parent, `({ json: ${code} })`);
			return;
		}
		if (member === 'all' && call) {
			const l = list();
			if (l !== null) replace(base, p.parent, wrapItems(l));
			return;
		}
		if (member === 'params' && !call) {
			const code = own ? printFlat(literal(scope.ownParameters)) : paramsOf(name);
			if (code !== null) replace(base, p, code);
			return;
		}
		if (member === 'isExecuted' && !call && !own) {
			const l = scope.nodeList(name);
			replace(base, p, l === null ? 'false' : `(${l}.length > 0)`);
			return;
		}
		if (member === 'itemMatching' && call && !own && ts.isCallExpression(p.parent)) {
			const arg = p.parent.arguments[0];
			const at = arg ? translateBody(arg.getText(sf), scope) : null;
			if (!at || !at.ok) {
				unsupported("$('…').itemMatching with an argument that does not translate");
				return;
			}
			usage.item ||= at.usage.item;
			usage.index ||= at.usage.index;
			const code = pairedOf(name);
			if (code === null) return;
			// The paired item of input item k: the same rule as `.item`, for item k.
			const k = `(${at.code})`;
			const matched =
				code === ITEM
					? `${scope.inputList}[${k}]`
					: code.endsWith(`[${INDEX}]`)
						? `${code.slice(0, -INDEX.length - 2)}[${k}]`
						: code;
			if (json) replace(base, after, matched);
			else replace(base, p.parent, `({ json: ${matched} })`);
			return;
		}
		unsupported(own ? `$input.${member ?? '?'}` : `$('…').${member ?? '?'}`);
	};

	const visit = (n: ts.Node): void => {
		// $('Node')…
		if (
			ts.isCallExpression(n) &&
			ts.isIdentifier(n.expression) &&
			n.expression.text === '$' &&
			ts.isPropertyAccessExpression(n.parent)
		) {
			const name = stringArgument(n);
			if (name === null) unsupported('$(…) with a computed name');
			else nodeChain(n, name, () => listOf(name), false);
			return;
		}
		if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === '$') {
			const name = stringArgument(n);
			// v1 checks that the node exists when `$()` runs.
			if (name !== null && scope.nodeParameters(name) === null) {
				replace(n, n, throwing("Referenced node doesn't exist"));
				return;
			}
			unsupported("$('…') without a member");
			return;
		}
		// $node["Node"].json, $node.Node.json
		if (
			(ts.isElementAccessExpression(n) || ts.isPropertyAccessExpression(n)) &&
			ts.isIdentifier(n.expression) &&
			n.expression.text === '$node'
		) {
			const name = ts.isElementAccessExpression(n)
				? ts.isStringLiteral(n.argumentExpression)
					? n.argumentExpression.text
					: null
				: n.name.text;
			const member = memberName(n.parent);
			if (name === null) unsupported('$node[…] with a computed name');
			else if (member === 'context' && scope.nodeContext) {
				const code = scope.nodeContext(name);
				if (code === null) unsupported(`unknown node "${name}"`);
				else replace(n, n.parent, code);
			} else if (member === 'json' || member === 'data') {
				const code = pairedOf(name);
				if (code !== null) replace(n, n.parent, code);
			} else if (member === 'parameter') {
				const code = paramsOf(name);
				if (code !== null) replace(n, n.parent, code);
			} else unsupported(`$node[…].${member ?? '?'}`);
			return;
		}
		if (ts.isIdentifier(n) && !isNameOf(n)) {
			const local = scope.locals?.[n.text];
			if (local !== undefined) {
				replace(n, n, local);
				return;
			}
			switch (n.text) {
				case '$json':
					usage.item = true;
					return;
				case '$data':
					usage.item = true;
					replace(n, n, ITEM);
					return;
				case '$input':
					nodeChain(n, '', () => scope.inputList, true);
					return;
				case '$itemIndex':
					usage.index = true;
					replace(n, n, INDEX);
					return;
				case '$runIndex':
					replace(n, n, scope.runIndex ?? '0');
					return;
				case '$min':
					replace(n, n, 'Math.min');
					return;
				case '$max':
					replace(n, n, 'Math.max');
					return;
				case '$items': {
					const call = n.parent;
					if (ts.isCallExpression(call) && call.expression === n) {
						if (call.arguments.length === 0) {
							replace(n, call, wrapItems(scope.itemsList ?? scope.inputList));
							return;
						}
						const name = stringArgument(call);
						const l = name === null ? null : listOf(name);
						if (l !== null) replace(n, call, wrapItems(l));
						else if (name === null) unsupported('$items(…) with arguments');
						return;
					}
					unsupported('$items');
					return;
				}
				case '$execution': {
					const m = memberName(n.parent);
					if (
						scope.instance &&
						(m === 'id' || m === 'mode' || m === 'resumeUrl' || m === 'resumeFormUrl')
					) {
						replace(n, n.parent, `${scope.instance('execution')}.${m}`);
					} else if (scope.instance && m === 'customData') {
						const call = n.parent.parent;
						const get =
							ts.isPropertyAccessExpression(call) &&
							call.name.text === 'get' &&
							ts.isCallExpression(call.parent) &&
							call.parent.expression === call
								? call.parent
								: null;
						const key = get ? stringArgument(get) : null;
						if (get && key !== null) {
							replace(n, get, `${scope.instance('customData')}?.[${str(key)}]`);
						} else unsupported('$execution.customData');
					} else unsupported(scope.instance ? `$execution.${m ?? '?'}` : '$execution');
					return;
				}
				case '$vars':
				case '$env': {
					if (!scope.instance) {
						unsupported(n.text);
						return;
					}
					replace(n, n, `${scope.instance(n.text === '$vars' ? 'vars' : 'env')}`);
					return;
				}
				case '$workflow': {
					const m = memberName(n.parent);
					if (m === 'name') replace(n, n.parent, str(scope.workflowName));
					else if (m === 'id') replace(n, n.parent, str(scope.workflowId));
					else if (m === 'active') replace(n, n.parent, 'true');
					else unsupported(`$workflow.${m ?? '?'}`);
					return;
				}
				case '$prevNode': {
					const m = memberName(n.parent);
					const src = scope.prevSource;
					if (src !== undefined && (m === 'name' || m === 'outputIndex' || m === 'runIndex')) {
						const field =
							m === 'name'
								? `${src}?.previousNode`
								: `(${src}?.${m === 'outputIndex' ? 'previousNodeOutput' : 'previousNodeRun'} ?? 0)`;
						replace(n, n.parent, field);
					} else if (m === 'name' && scope.prevNode !== null) {
						replace(n, n.parent, str(scope.prevNode));
					} else if (m === 'outputIndex' || m === 'runIndex') {
						replace(n, n.parent, '0');
					} else unsupported(`$prevNode.${m ?? '?'}`);
					return;
				}
				case 'Math': {
					const p = n.parent;
					if (
						memberName(p) === 'random' &&
						ts.isCallExpression(p.parent) &&
						p.parent.arguments.length === 0
					) {
						replace(n, p.parent, 'ctx.random()');
						return;
					}
					break;
				}
				case 'Date': {
					const p = n.parent;
					if (
						memberName(p) === 'now' &&
						ts.isCallExpression(p.parent) &&
						p.parent.arguments.length === 0
					) {
						replace(n, p.parent, 'ctx.now()');
						return;
					}
					break;
				}
				default:
					break;
			}
		}
		// `Boolean`, `String` and `Number` as callback values (`.filter(Boolean)`): the subset
		// calls them only, so they become arrow functions of their first argument.
		if (
			ts.isIdentifier(n) &&
			['Boolean', 'String', 'Number'].includes(n.text) &&
			ts.isCallExpression(n.parent) &&
			n.parent.arguments.includes(n)
		) {
			replace(n, n, `((v: Json) => ${n.text}(v))`);
			return;
		}
		// Type the parameters of callbacks, so strict mode accepts them.
		if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
			const bare =
				ts.isArrowFunction(n) &&
				n.parameters.length === 1 &&
				text.charAt(n.getStart(sf)) !== '(' &&
				!n.typeParameters;
			for (const p of n.parameters) {
				if (p.type) continue;
				if (bare) {
					edits.push({
						start: p.getStart(sf),
						end: p.name.getEnd(),
						text: `(${p.name.getText(sf)}: Json)`,
					});
				} else {
					edits.push({ start: p.name.getEnd(), end: p.name.getEnd(), text: ': Json' });
				}
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
	if (issues.length > 0) return { ok: false, issues };

	edits.sort((a, b) => a.start - b.start || b.end - a.end);
	let code = '';
	let at = 0;
	for (const e of edits) {
		if (e.start < at) continue;
		code += text.slice(at, e.start) + e.text;
		at = e.end;
	}
	code += text.slice(at);
	code = code.slice(1, -1).trim();
	// An object literal needs its parentheses, or a statement reads `{` as a block.
	if (code.startsWith('{')) code = `(${code})`;
	if (scope.timezone !== undefined) {
		const lux = rewriteLuxon(code, scope.timezone);
		if (!lux.ok) {
			return { ok: false, issues: [{ feature: lux.feature, message: lux.message, code: 'WL101' }] };
		}
		code = lux.code;
		for (const z of lux.zones) scope.useZone?.(z);
	}

	// Let the legacy import report the n8n variables that are left.
	const legacy = rewriteLegacy(code);
	if (legacy.unsupported.length > 0) {
		return {
			ok: false,
			issues: legacy.unsupported.map((v) => ({
				feature: v,
				message: `\`${v}\` has no mapping to the subset.`,
				code: 'WL101',
			})),
		};
	}
	if (legacy.nodes.size > 0) {
		return {
			ok: false,
			issues: [{ feature: 'node reference', message: 'A node reference is left.', code: 'WL101' }],
		};
	}
	// A line comment at the end would hide the code that wraps the expression: end the line.
	const lastLine = legacy.code.slice(legacy.code.lastIndexOf('\n') + 1);
	const ended = lastLine.includes('//') ? `${legacy.code}\n` : legacy.code;
	return { ok: true, code: ended, usage };
}

function printFlat(code: Code): string {
	switch (code.kind) {
		case 'raw':
			return code.text;
		case 'array':
			return `[${code.items.map(printFlat).join(', ')}]`;
		case 'object':
			return `{ ${code.entries.map(([k, v]) => `${str(k)}: ${printFlat(v)}`).join(', ')} }`;
	}
}

/**
 * True when the code reads a member of a value that can be undefined: a member,
 * element or call on the result of another member, element or call.
 */
export function mayThrowTypeError(code: string): boolean {
	const sf = ts.createSourceFile('e.ts', `(${code})`, ts.ScriptTarget.ES2022, true);
	type Access = ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.CallExpression;
	const access = (n: ts.Node): n is Access =>
		ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isCallExpression(n);
	let found = false;
	const visit = (n: ts.Node): void => {
		if (found) return;
		if (access(n) && n.questionDotToken === undefined) {
			let inner: ts.Node = n.expression;
			while (ts.isParenthesizedExpression(inner)) inner = inner.expression;
			if (access(inner)) {
				found = true;
				return;
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
	return found;
}

/** True when the code cannot be `null` or `undefined`, so a template needs no `?? ''`. */
function neverNullish(code: string): boolean {
	const sf = ts.createSourceFile('e.ts', `(${code})`, ts.ScriptTarget.ES2022, true);
	const st = sf.statements[0];
	if (!st || !ts.isExpressionStatement(st)) return false;
	let e: ts.Expression = st.expression;
	while (ts.isParenthesizedExpression(e)) e = e.expression;
	// TypeScript rejects `?? ''` after an expression that it reads as never nullish (TS2869).
	if (nullishness(e) === 'never') return true;
	return (
		ts.isStringLiteral(e) ||
		ts.isNumericLiteral(e) ||
		ts.isTemplateExpression(e) ||
		ts.isNoSubstitutionTemplateLiteral(e) ||
		ts.isCallExpression(e) ||
		(ts.isBinaryExpression(e) &&
			[
				ts.SyntaxKind.PlusToken,
				ts.SyntaxKind.MinusToken,
				ts.SyntaxKind.AsteriskToken,
				ts.SyntaxKind.SlashToken,
				ts.SyntaxKind.PercentToken,
			].includes(e.operatorToken.kind))
	);
}

function isSimpleOperand(code: string): boolean {
	return /^[$A-Za-z_][\w$]*(\??\.[$A-Za-z_][\w$]*|\[[^\][]*\])*$/.test(code);
}

function templateText(text: string): string {
	return escapeControls(
		text
			.replace(/\\/g, '\\\\')
			.replace(/`/g, '\\`')
			.replace(/\$\{/g, '\\$' + '{'),
	);
}

export interface TranslatedValue {
	code: Code;
	usage: Usage;
	failures: Failure[];
}

export interface TranslateOptions {
	/** Turns resource locator values (`{ __rl, value }`) into their value. */
	flattenResourceLocators?: boolean;
	/** Renders one `{{ }}` part of a text template. The default renders as v1 text. */
	templatePart?: (code: string) => string;
	/** Variables that the node binds (`ExpressionScope.locals`). */
	locals?: Record<string, string>;
}

/**
 * Translates a parameter value tree. Expressions that do not translate keep
 * their raw text and are listed in `failures`.
 */
export function translateValue(
	value: unknown,
	scope: ExpressionScope,
	path: string,
	options: TranslateOptions = {},
): TranslatedValue {
	if (options.locals) scope = { ...scope, locals: { ...scope.locals, ...options.locals } };
	const usage = emptyUsage();
	const failures: Failure[] = [];
	const merge = (u: Usage) => {
		usage.item ||= u.item;
		usage.index ||= u.index;
		usage.approximate ||= u.approximate;
		for (const n of u.nodes) usage.nodes.add(n);
	};
	const walk = (v: unknown, p: string): Code => {
		if (isExpression(v)) {
			const known = scope.knownIssues?.(p);
			const r: BodyResult = known
				? { ok: false, issues: known }
				: translateExpression(v, scope, options.templatePart);
			if (r.ok) {
				merge(r.usage);
				// v1 gives null when the expression throws a TypeError (`evaluateLegacy`).
				const code = mayThrowTypeError(r.code) ? `orNull(() => ${r.code})` : r.code;
				return raw(scope.mark ? scope.mark(code, p, v) : code);
			}
			if (scope.hostValue) {
				usage.index = true;
				return raw(scope.hostValue(v));
			}
			failures.push({ expression: v, issues: r.issues, hostSafety: hostSafety(v), path: p });
			return raw(str(v));
		}
		if (Array.isArray(v)) return { kind: 'array', items: v.map((x, i) => walk(x, `${p}[${i}]`)) };
		if (isRecord(v)) {
			if (options.flattenResourceLocators && v.__rl === true) return walk(v.value, `${p}.value`);
			return {
				kind: 'object',
				entries: Object.entries(v).map(([k, x]): [string, Code] => [
					k,
					walk(x, p ? `${p}.${k}` : k),
				]),
			};
		}
		return literal(v);
	};
	return { code: walk(value, path), usage, failures };
}

/** Translates one `=` string: one bare `{{ }}` keeps its value; other text becomes a string. */
export function translateExpression(
	value: string,
	scope: ExpressionScope,
	templatePart?: (code: string) => string,
): BodyResult {
	const parts = segments(value.slice(1));
	const usage = emptyUsage();
	if (parts.length === 1 && parts[0].expression !== undefined) {
		return translateBody(parts[0].expression, scope);
	}
	let code = '`';
	for (const part of parts) {
		if (part.text !== undefined) {
			code += templateText(part.text);
			continue;
		}
		const r = translateBody(part.expression ?? '', scope);
		if (!r.ok) return r;
		usage.item ||= r.usage.item;
		usage.index ||= r.usage.index;
		usage.approximate ||= r.usage.approximate;
		for (const n of r.usage.nodes) usage.nodes.add(n);
		// v1 gives undefined for a part that throws a TypeError; the other parts stay.
		const piece = mayThrowTypeError(r.code) ? `orNull(() => ${r.code})` : r.code;
		// v1 renders null and undefined as an empty string in a template.
		const inner = templatePart
			? templatePart(piece)
			: piece === 'undefined'
				? "''"
				: piece === r.code && neverNullish(piece)
					? piece
					: `${isSimpleOperand(piece) ? piece : `(${piece})`} ?? ''`;
		code += `\${${inner}}`;
	}
	code += '`';
	return { ok: true, code, usage };
}
