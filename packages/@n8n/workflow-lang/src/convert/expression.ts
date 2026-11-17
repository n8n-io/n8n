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
import type { LuxonValue } from './code-native/luxon-expression.ts';
import { rewriteLuxon } from './code-native/luxon-expression.ts';
import { escapeControls, literal, raw, str } from './code.ts';
import { nullishness } from './conditions.ts';
import { EXTENSION_HELPERS } from './extension-helpers.ts';
import { nativeExpression } from './native-expression.ts';
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
	/** The workflow setting `binaryMode`. With `combined`, v1 keeps binary data in the JSON of an item. */
	binaryMode?: string;
	/**
	 * Records a helper that the code calls. With it, an expression whose plain form the
	 * compiler rejects gets its native form (`native-expression.ts`).
	 */
	useHelper?(name: string): void;
}

/** The code of the issue that says that the native form of an expression does not compile. */
export const NATIVE_FORM_FAILED = 'WL102';

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
	| {
			ok: true;
			code: string;
			usage: Usage;
			/** Set for a text template: true when the whole value needs `orNull`. */
			guard?: boolean;
			/**
			 * The native form: v1 gives null for every error of the expression (a TypeError, a
			 * RangeError, an error that the code throws), so the guard is `orNullAll`.
			 */
			guardAll?: boolean;
			/** A text template with a part in the native form (`orNullAll`). */
			nativeParts?: boolean;
	  }
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

/** The text of a `=` value that has no `{{ }}` part, or null. The text is the same in each run. */
export function constantText(value: unknown): string | null {
	if (typeof value !== 'string' || !value.startsWith('=')) return null;
	const body = value.replace(/^=+/, '');
	return segments(body).every((part) => part.expression === undefined) ? body : null;
}

/**
 * The literal of JSON text that the converter can parse for the run, or null. The run
 * parses text with a key that an object literal orders or reads in a different way.
 */
export function jsonLiteral(json: string): Code | null {
	let value: unknown;
	try {
		value = JSON.parse(json);
	} catch {
		return null;
	}
	const plain = (v: unknown): boolean => {
		if (typeof v === 'number') return Number.isFinite(v);
		if (Array.isArray(v)) return v.every(plain);
		if (!isRecord(v)) return true;
		return Object.entries(v).every(
			([k, x]) => k !== '__proto__' && k !== '...' && !/^(0|[1-9]\d*)$/.test(k) && plain(x),
		);
	};
	return plain(value) ? literal(value) : null;
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

const EXTENSION_USE = new RegExp(
	`\\$if\\s*\\(|\\.\\s*(${Object.keys(EXTENSION_HELPERS).join('|')})\\s*\\(`,
);

/**
 * Rewrites the expression extensions of n8n that have a helper (`extension-helpers.ts`):
 * `value.isEmpty()` becomes `extIsEmpty(value)`, and `$if(a, b, c)` becomes `a ? b : c`, as
 * v1 rewrites it. A call in an optional chain stays as it is (v1 has its own rules for it),
 * and so does `first` or `last` of a node (`$input.first()`), which is not an extension.
 * An expression that makes a Date keeps all its calls.
 */
export function rewriteExtensions(body: string): { code: string; helpers: string[] } {
	if (!EXTENSION_USE.test(body)) return { code: body, helpers: [] };
	// A Date is a number in the subset, so a helper cannot see that its receiver is a date.
	if (/\bDate\b/.test(body)) return { code: body, helpers: [] };
	const text = `(${body}\n)`;
	const sf = ts.createSourceFile('e.ts', text, ts.ScriptTarget.ES2022, true);
	// Inserted text has `end === start`; `outer` puts the insert of an outer call first.
	const edits: Array<{ start: number; end: number; text: string; outer: number }> = [];
	const helpers = new Set<string>();
	const isNode = (e: ts.Expression): boolean => {
		let x = e;
		while (ts.isParenthesizedExpression(x)) x = x.expression;
		if (ts.isIdentifier(x)) return x.text === '$input';
		return ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === '$';
	};
	const visit = (n: ts.Node): void => {
		ts.forEachChild(n, visit);
		if (!ts.isCallExpression(n) || n.arguments.some((a) => ts.isSpreadElement(a))) return;
		const callee = n.expression;
		if (ts.isIdentifier(callee) && callee.text === '$if') {
			const [test, yes, no] = n.arguments;
			if (n.arguments.length < 2 || n.arguments.length > 3) return;
			edits.push({ start: n.getStart(sf), end: test.getStart(sf), text: '((', outer: 0 });
			edits.push({ start: test.getEnd(), end: yes.getStart(sf), text: ') ? (', outer: 0 });
			if (no === undefined) {
				edits.push({ start: yes.getEnd(), end: n.getEnd(), text: ') : false)', outer: 0 });
			} else {
				edits.push({ start: yes.getEnd(), end: no.getStart(sf), text: ') : (', outer: 0 });
				edits.push({ start: no.getEnd(), end: n.getEnd(), text: '))', outer: 0 });
			}
			return;
		}
		if (!ts.isPropertyAccessExpression(callee) || (n.flags & ts.NodeFlags.OptionalChain) !== 0) {
			return;
		}
		const name = callee.name.text;
		if (!Object.hasOwn(EXTENSION_HELPERS, name)) return;
		const extension = EXTENSION_HELPERS[name];
		if (n.arguments.length !== extension.args) return;
		if ((name === 'first' || name === 'last') && isNode(callee.expression)) return;
		const receiver = callee.expression;
		helpers.add(extension.helper);
		edits.push({
			start: receiver.getStart(sf),
			end: receiver.getStart(sf),
			text: `${extension.helper}(`,
			outer: n.getEnd(),
		});
		if (n.arguments.length === 0) {
			edits.push({ start: receiver.getEnd(), end: n.getEnd(), text: ')', outer: 0 });
		} else {
			const first = n.arguments[0];
			const last = n.arguments[n.arguments.length - 1];
			edits.push({ start: receiver.getEnd(), end: first.getStart(sf), text: ', ', outer: 0 });
			edits.push({ start: last.getEnd(), end: n.getEnd(), text: ')', outer: 0 });
		}
	};
	visit(sf);
	if (edits.length === 0) return { code: body, helpers: [] };
	edits.sort(
		(a, b) =>
			a.start - b.start ||
			Number(a.end !== a.start) - Number(b.end !== b.start) ||
			b.outer - a.outer,
	);
	let out = '';
	let at = 0;
	for (const e of edits) {
		// Two edits never overlap; a broken order would give wrong code, so it gives no rewrite.
		if (e.start < at) return { code: body, helpers: [] };
		out += text.slice(at, e.start) + e.text;
		at = e.end;
	}
	out += text.slice(at);
	return { code: out.slice(1, -2), helpers: [...helpers] };
}

/** The members of a binary entry that are the same in v1 and in the runtime. */
const BINARY_META = new Set(['mimeType', 'fileName', 'fileExtension', 'fileSize', 'fileType']);

/**
 * True when the expression reads `$binary` (the node `n`) in a way that gives the value of
 * v1 with the binary data of the runtime (spec 10: `$binary` of an item, with one more
 * member `bytes` in each entry, and no key when the item has no binary data, where v1 has an
 * empty map). These ways
 * are: the names of the entries (`Object.keys($binary)`, also with `|| {}` or `?? {}`), a
 * member of an entry that is the same in both (`$binary.data.mimeType`), a test of the map or
 * of an entry (`!`, a condition, `&&`, a comparison with null), and, with `value`, the map
 * or an entry as the whole value of the expression.
 */
function binaryUse(n: ts.Identifier, value: boolean): boolean {
	let cur: ts.Node = n;
	let p: ts.Node = n.parent;
	const climb = () => {
		while (ts.isParenthesizedExpression(p)) {
			cur = p;
			p = p.parent;
		}
	};
	const emptyObject = (e: ts.Expression) =>
		ts.isObjectLiteralExpression(e) && e.properties.length === 0;
	const tested = (): boolean => {
		if (ts.isPrefixUnaryExpression(p)) return p.operator === ts.SyntaxKind.ExclamationToken;
		if (ts.isConditionalExpression(p)) return p.condition === cur;
		if (ts.isTypeOfExpression(p)) return true;
		if (ts.isCallExpression(p)) {
			return (
				ts.isIdentifier(p.expression) &&
				p.expression.text === 'Boolean' &&
				p.arguments.length === 1 &&
				p.arguments[0] === cur
			);
		}
		if (!ts.isBinaryExpression(p)) return false;
		const op = p.operatorToken.kind;
		if (op === ts.SyntaxKind.AmpersandAmpersandToken) return p.left === cur;
		const equality = [
			ts.SyntaxKind.EqualsEqualsToken,
			ts.SyntaxKind.ExclamationEqualsToken,
			ts.SyntaxKind.EqualsEqualsEqualsToken,
			ts.SyntaxKind.ExclamationEqualsEqualsToken,
		].includes(op);
		const other = p.left === cur ? p.right : p.left;
		return (
			equality &&
			(other.kind === ts.SyntaxKind.NullKeyword ||
				(ts.isIdentifier(other) && other.text === 'undefined'))
		);
	};
	const whole = (): boolean => value && ts.isExpressionStatement(p) && ts.isSourceFile(p.parent);
	climb();
	if (
		ts.isBinaryExpression(p) &&
		p.left === cur &&
		(p.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
			p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) &&
		emptyObject(p.right)
	) {
		cur = p;
		p = p.parent;
		climb();
		const keys =
			ts.isCallExpression(p) &&
			p.arguments.length === 1 &&
			p.arguments[0] === cur &&
			ts.isPropertyAccessExpression(p.expression) &&
			ts.isIdentifier(p.expression.expression) &&
			p.expression.expression.text === 'Object' &&
			p.expression.name.text === 'keys';
		return keys;
	}
	if (
		ts.isCallExpression(p) &&
		p.arguments.length === 1 &&
		p.arguments[0] === cur &&
		ts.isPropertyAccessExpression(p.expression) &&
		ts.isIdentifier(p.expression.expression) &&
		p.expression.expression.text === 'Object' &&
		p.expression.name.text === 'keys'
	) {
		return true;
	}
	if (
		(ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) &&
		p.expression === cur
	) {
		// An entry of the map.
		cur = p;
		p = p.parent;
		climb();
		if (ts.isPropertyAccessExpression(p) && p.expression === cur) {
			return BINARY_META.has(p.name.text);
		}
		return tested() || whole();
	}
	return tested() || whole();
}

/** An expression that throws, typed as an item, for references that v1 rejects at run time. */
const throwing = (message: string) => `((): Json => { throw new Error(${str(message)}); })()`;

const wrapItemsTyped = (list: string) => `${list}.map((json: Json) => ({ json }))`;

/**
 * Translates one `{{ }}` body. The result is subset code that reads `$json`,
 * `i` and the node list variables of the scope.
 */
export function translateBody(
	body: string,
	scope: ExpressionScope,
	native = false,
	luxonValue: LuxonValue = 'reject',
	binaryValue = false,
): BodyResult {
	const trimmed = body.trim();
	if (trimmed === '') return { ok: true, code: 'undefined', usage: emptyUsage() };
	if (!parsesAsExpression(trimmed)) {
		return {
			ok: false,
			issues: [{ feature: 'syntax', message: 'The body is not one expression.', code: 'WL100' }],
		};
	}
	const extended = rewriteExtensions(trimmed);
	for (const h of extended.helpers) scope.useHelper?.(h);
	const text = `(${extended.code})`;
	const sf = ts.createSourceFile('e.ts', text, ts.ScriptTarget.ES2022, true);
	// The native form is JavaScript until the translator of native code gives it its types.
	const wrapItems = native ? (list: string) => `${list}.map((json) => ({ json }))` : wrapItemsTyped;
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

	/**
	 * Code of the JSON of an item as v1 has it. Compiled code holds an item as its JSON with
	 * the binary data in the key `$binary` (spec 10). An expression that reads a member of the
	 * JSON does not see that key. An expression that reads the JSON as a whole (`at` is not
	 * the object of a member access) gets the JSON without it.
	 */
	const jsonValue = (at: ts.Node, code: string): string => {
		const p = at.parent;
		const member =
			(ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === at;
		if (member) return code;
		scope.useHelper?.('jsonOf');
		// The test of the key is cheaper than a call for an item without binary data.
		return /^[$A-Za-z_][\w$]*$/.test(code)
			? `(${code}.$binary === undefined ? ${code} : jsonOf(${code}))`
			: `jsonOf(${code})`;
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
			if (json) replace(base, after, jsonValue(after, code));
			else replace(base, p, `({ json: ${code} })`);
			return;
		}
		if ((member === 'first' || member === 'last') && call) {
			const l = list();
			if (l === null) return;
			const code = member === 'first' ? `${l}[0]` : `${l}[${l}.length - 1]`;
			if (json) replace(base, after, jsonValue(after, code));
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
			if (json) replace(base, after, jsonValue(after, matched));
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
				if (code !== null) replace(n, n.parent, jsonValue(n.parent, code));
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
				case '$data': {
					usage.item = true;
					const code = jsonValue(n, ITEM);
					if (code !== n.text) replace(n, n, code);
					return;
				}
				case '$binary':
					// In the mode `combined` v1 keeps binary data in the JSON of the item.
					if (scope.binaryMode === 'combined' || !binaryUse(n, binaryValue)) {
						unsupported('$binary');
						return;
					}
					usage.item = true;
					// v1 gives an empty map for an item without binary data. A default of the
					// expression itself (`$binary || {}`) is that same map.
					{
						const p = n.parent;
						const defaulted =
							ts.isBinaryExpression(p) &&
							p.left === n &&
							(p.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
								p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) &&
							ts.isObjectLiteralExpression(p.right) &&
							p.right.properties.length === 0;
						replace(n, defaulted ? p : n, `(${ITEM}.$binary ?? {})`);
					}
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
			!native &&
			ts.isIdentifier(n) &&
			['Boolean', 'String', 'Number'].includes(n.text) &&
			ts.isCallExpression(n.parent) &&
			n.parent.arguments.includes(n)
		) {
			replace(n, n, `((v: Json) => ${n.text}(v))`);
			return;
		}
		// Type the parameters of callbacks, so strict mode accepts them.
		if (!native && (ts.isArrowFunction(n) || ts.isFunctionExpression(n))) {
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
		const lux = rewriteLuxon(code, scope.timezone, luxonValue);
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
	if (native) {
		const form = nativeExpression(ended, trimmed, scope.timezone);
		if (!form.ok) {
			return {
				ok: false,
				issues: form.blockers.map((b) => ({
					feature: `native form: ${b}`,
					message: `The native form of the expression has no ${b}.`,
					code: 'WL101',
				})),
			};
		}
		for (const h of form.helpers) scope.useHelper?.(h);
		for (const z of form.zones) scope.useZone?.(z);
		return { ok: true, code: form.code, usage, guard: true, guardAll: true };
	}
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

/** The code without the marks of the source map (`ExpressionScope.mark`). */
function withoutMarks(marked: string): string {
	let code = '';
	for (let k = 0; k < marked.length; k++) {
		const ch = marked[k];
		if (ch === '\u0001') {
			const end = marked.indexOf('\u0002', k);
			if (end < 0) return marked;
			k = end;
		} else if (ch !== '\u0003') code += ch;
	}
	return code;
}

function textNeverThrows(marked: string): boolean {
	const code = withoutMarks(marked);
	if (isChainGuard(code)) return true;
	const sf = ts.createSourceFile('e.ts', `(${code})`, ts.ScriptTarget.ES2022, true);
	const st = sf.statements[0];
	if (sf.statements.length !== 1 || !st || !ts.isExpressionStatement(st)) return false;
	let e: ts.Expression = st.expression;
	while (ts.isParenthesizedExpression(e)) e = e.expression;
	// `orNull` catches a TypeError and a SyntaxError. Code without a call throws nothing else.
	let guarded = false;
	if (
		ts.isCallExpression(e) &&
		ts.isIdentifier(e.expression) &&
		e.expression.text === 'orNull' &&
		e.arguments.length === 1
	) {
		const [value] = e.arguments;
		if (ts.isArrowFunction(value) && !ts.isBlock(value.body)) {
			guarded = true;
			e = value.body;
		}
	}
	let quiet = true;
	const visit = (n: ts.Node): void => {
		if (!quiet) return;
		const typeCheck =
			ts.isBinaryExpression(n) &&
			(n.operatorToken.kind === ts.SyntaxKind.InKeyword ||
				n.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword);
		if (
			ts.isCallExpression(n) ||
			ts.isNewExpression(n) ||
			ts.isTaggedTemplateExpression(n) ||
			ts.isAwaitExpression(n) ||
			ts.isYieldExpression(n) ||
			ts.isDeleteExpression(n) ||
			ts.isFunctionLike(n) ||
			(typeCheck && !guarded)
		) {
			quiet = false;
			return;
		}
		ts.forEachChild(n, visit);
	};
	visit(e);
	return quiet && (guarded || !mayThrowTypeError(code));
}

/**
 * True when the code of a translated value cannot throw: it has no call, and it reads a
 * member of a value that can be undefined only inside `orNull`. The answer is on the safe
 * side: code that this function does not know counts as code that can throw.
 */
export function neverThrows(code: Code): boolean {
	switch (code.kind) {
		case 'raw':
			return textNeverThrows(code.text);
		case 'array':
			return code.items.every(neverThrows);
		case 'object':
			return code.entries.every(([, value]) => neverThrows(value));
	}
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

/**
 * The code of a chain of members (`a.b[0].c`) with each member optional (`a?.b?.[0]?.c`), or
 * null when the code is not such a chain.
 */
function optionalChain(code: string): string | null {
	const member = /\.[$A-Za-z_][\w$]*|\[(?:\d+|[$A-Za-z_][\w$]*|'[^'\\\n]*')\]/g;
	const root = /^[$A-Za-z_][\w$]*/.exec(code);
	if (!root) return null;
	const rest = code.slice(root[0].length);
	if (rest === '' || rest.replace(member, '') !== '') return null;
	return root[0] + rest.replace(member, (m) => (m.startsWith('.') ? `?${m}` : `?.${m}`));
}

/**
 * Code with the value of `orNull(() => chain)` for a chain of members, without a closure:
 * the chain throws only when a value before its last member is null or undefined. Null
 * when the code is not such a chain.
 */
function chainGuard(code: string): string | null {
	const last = /(?:\.[$A-Za-z_][\w$]*|\[(?:\d+|[$A-Za-z_][\w$]*|'[^'\\\n]*')\])$/.exec(code);
	if (!last || optionalChain(code) === null) return null;
	const before = code.slice(0, last.index);
	const guard = optionalChain(before);
	return guard === null ? null : `(${guard} == null ? null : ${code})`;
}

/** True for code that `chainGuard` made. */
function isChainGuard(code: string): boolean {
	const parts = /^\(.* == null \? null : (.*)\)$/.exec(code);
	return parts !== null && chainGuard(parts[1]) === code;
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
	/** Keeps `orNull(() => …)` for each value that can throw, for a caller that rewrites it. */
	guardCalls?: boolean;
	/**
	 * What a whole `{{ }}` value that is a Luxon DateTime gives. `text`: its ISO text, for a
	 * value inside a collection parameter (v1's \`getNodeParameter\` turns a DateTime there
	 * into text, \`cleanupParameterData\`). `object`: the DateTime, for a caller that reads
	 * it. Without it, such an expression does not translate.
	 */
	luxonValue?: 'text' | 'object';
	/**
	 * A whole `{{ }}` value can be `$binary` or one of its entries: the caller reads only
	 * whether the value is there, or the names of its members (see `binaryUse`).
	 */
	binaryValue?: boolean;
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
			let r: BodyResult;
			const lux = options.luxonValue ?? 'reject';
			const bin = options.binaryValue === true;
			if (!known) r = translateExpression(v, scope, options.templatePart, false, lux, bin);
			else if (!scope.useHelper || known.some((i) => i.code === NATIVE_FORM_FAILED)) {
				r = { ok: false, issues: known };
			} else {
				// The compiler rejects the plain form: the native form is the second one.
				const second = translateExpression(v, scope, options.templatePart, true, lux, bin);
				r = second.ok ? second : { ok: false, issues: [...known, ...second.issues] };
			}
			if (r.ok) {
				merge(r.usage);
				// v1 gives null when the expression throws a TypeError (`evaluateLegacy`).
				if (r.guardAll || r.nativeParts) scope.useHelper?.('orNullAll');
				const code = r.guardAll
					? `orNullAll(() => ${r.code})`
					: (r.guard ?? mayThrowTypeError(r.code))
						? ((options.guardCalls ? null : chainGuard(r.code)) ?? `orNull(() => ${r.code})`)
						: r.code;
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
	native = false,
	luxonValue: LuxonValue = 'reject',
	binaryValue = false,
): BodyResult {
	const parts = segments(value.slice(1));
	const usage = emptyUsage();
	if (parts.length === 1 && parts[0].expression !== undefined) {
		return translateBody(parts[0].expression, scope, native, luxonValue, binaryValue);
	}
	let code = '`';
	// The whole template needs `orNull` when one part has it and another part can throw.
	let guarded = false;
	let quiet = true;
	let all = false;
	for (const part of parts) {
		if (part.text !== undefined) {
			code += templateText(part.text);
			continue;
		}
		// A text template writes a DateTime as its text (`toString`).
		const r = translateBody(part.expression ?? '', scope, native, 'text');
		if (!r.ok) return r;
		usage.item ||= r.usage.item;
		usage.index ||= r.usage.index;
		usage.approximate ||= r.usage.approximate;
		for (const n of r.usage.nodes) usage.nodes.add(n);
		// v1 gives undefined for a part that throws a TypeError; the other parts stay.
		const throws = r.guard ?? mayThrowTypeError(r.code);
		if (throws) guarded = true;
		else if (r.code !== 'undefined' && !textNeverThrows(r.code)) quiet = false;
		const chain = throws && !templatePart ? optionalChain(r.code) : null;
		if (chain !== null) {
			// A chain of members throws only when a value before the last member is null or
			// undefined. The optional chain then gives undefined, which the template renders as
			// `orNull` renders its null.
			code += `\${${chain} ?? ''}`;
			continue;
		}
		all ||= r.guardAll === true;
		const piece = r.guardAll
			? `orNullAll(() => ${r.code})`
			: throws
				? `orNull(() => ${r.code})`
				: r.code;
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
	if (templatePart) return { ok: true, code, usage };
	// Each part of the native form has its own guard.
	if (all) return { ok: true, code, usage, guard: false, nativeParts: true };
	return { ok: true, code, usage, guard: guarded && !quiet };
}
