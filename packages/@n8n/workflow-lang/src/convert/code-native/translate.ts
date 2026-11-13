/**
 * Translates the JavaScript of a Code, Function or Function Item node to
 * subset code, so the node runs in the runtime and not in the fallback host.
 *
 * The translation parses the code with the TypeScript compiler API and edits
 * the text:
 *
 * - n8n globals become plain values, as in the fallback host prologue
 *   (`code-node.ts`): `$input.all()` and `items` are the input items as
 *   `{ json }` wrappers, `$json` is the current item, `$('Node').all()` is
 *   the item list of another node, and so on;
 * - declarations, parameters and functions get the type `Json`, because the
 *   compiler checks the subset with strict types;
 * - a few JavaScript forms that the subset does not have get an equal form:
 *   `var` (hoisted to `let`), `==` (a helper with the rules of loose
 *   equality), `x.toString()`, `for...in`, `console.log`, `Math.random()`
 *   and `await` of values that are not promises.
 *
 * Constructs without a translation are blockers. The caller then keeps the
 * host step. The compiler can reject more (for example a method that is not
 * in the library); `check.ts` compiles the result and reports these too.
 *
 * The result reads the input list and the lists of other nodes as plain JSON
 * lists. `emit` wraps it, so the code gets copies when it can change its input
 * and the result has the shape that the host gives (`items.ts` of the host).
 */
import ts from 'typescript';

import { isKnownTimezone } from '../../compiler/triggers.ts';
import { DEFAULT_TIMEZONE } from '../triggers.ts';
import { LOCALE_NAMES, LOCALE_TABLE } from './locale-data.generated.ts';
import { planCatch } from './catch-check.ts';
import { checkRegex } from './regex-syntax.ts';

export type CodeMode = 'all' | 'each';

export type CodeKind = 'code' | 'function' | 'functionItem';

export interface CodeNativeInput {
	code: string;
	mode: CodeMode;
	kind: CodeKind;
	/**
	 * Tells if node `name` ran before this node, so `$('name')` can read its
	 * list. Unknown nodes and nodes that did not run are blockers.
	 */
	hasNode(name: string): boolean;
	/** Name and id of the workflow, for `$workflow`. */
	workflow?: { name: string; id: string };
	/** Code of the run index of the node (`$runIndex`), as in expressions. */
	runIndex?: string;
	/** Names of every node that ran before this one, for `$(name)` with a computed name. */
	allNodes?: string[];
	/**
	 * The default zone of Luxon: the workflow time zone. The default is
	 * America/New_York. `system` is the zone of the runtime (UTC).
	 */
	timezone?: string;
	/** The name of the node, for static data of type `node`. */
	nodeName?: string;
}

export interface Blocker {
	/** Short stable name of the construct, used to rank blockers. */
	feature: string;
	message: string;
}

export interface Translation {
	/** The user code as subset statements, the body of a function. */
	body: string;
	/** Names of the other nodes that the code reads, in order of first use. */
	nodes: string[];
	/** Helper functions that the body calls (keys of `CODE_HELPERS`). */
	helpers: Set<string>;
	/** True when the code can change objects that it gets, so it needs copies. */
	mutates: boolean;
	/** The code reads `$json` of the first item (all-items mode). */
	usesFirstJson: boolean;
	/** The code reads the clock or the random generator. */
	nondeterministic: boolean;
	/** The code makes a Set or a Map (`collNew`). */
	usesCollections: boolean;
	/** IANA time zones that the code formats dates in (META `zones`). */
	zones: Set<string>;
	/** The code reads a node by a computed name: it gets every node that ran before. */
	usesAllNodes: boolean;
	allNodes: string[];
	/** The code reads `.index`, `.input` or `.groups` of matches (registry `__wf_matches`). */
	usesMatchProps: boolean;
}

export type TranslateResult =
	| { ok: true; translation: Translation }
	| {
			ok: false;
			blockers: Blocker[];
			/** The translation without the blocked rewrites, so a compile can find more blockers. */
			partial?: Translation;
	  };

/** Prefix of the names that the translation adds. User code does not use it. */
export const P = '__wf_';
export const ITEMS = `${P}items`;
export const ITEM = `${P}item`;
export const INDEX = `${P}i`;
export const FIRST_JSON = `${P}json0`;
export const nodeVar = (k: number) => `${P}n${k}`;
export const ALL_NODES = `${P}nodes`;
export const MATCHES = `${P}matches`;

/** Globals of the subset that code can name (spec section 4.3). */
const SUBSET_GLOBALS = new Set([
	'Math',
	'JSON',
	'Object',
	'Array',
	'Number',
	'String',
	'Boolean',
	'parseInt',
	'parseFloat',
	'isNaN',
	'NaN',
	'Infinity',
	'undefined',
	'Error',
	'TypeError',
	'RangeError',
	'Date',
]);

/** n8n globals without a native form. The feature name ranks them. */
export const HOST_GLOBALS: Record<string, string> = {
	Duration: 'Luxon ($now, $today, DateTime)',
	Interval: 'Luxon ($now, $today, DateTime)',
	$jmespath: '$jmespath',
	$env: '$env',
	$prevNode: '$prevNode',
	$secrets: '$secrets',
	$binary: 'binary data',
	$evaluateExpression: '$evaluateExpression',
	$fromAI: '$fromAI',
	$parameter: '$parameter',
	$position: '$position',
	$mode: '$mode',
	require: 'require',
	Buffer: 'Buffer',
	crypto: 'crypto',
	fetch: 'fetch',
	process: 'process',
	setTimeout: 'timers',
	setInterval: 'timers',
	Promise: 'Promise',
	RegExp: 'regular expression',
	Set: 'Set / Map',
	Map: 'Set / Map',
	WeakMap: 'Set / Map',
	WeakSet: 'Set / Map',
	Symbol: 'Symbol',
	Intl: 'Intl',
	btoa: 'btoa / atob',
	atob: 'btoa / atob',
	structuredClone: 'structuredClone',
	arguments: 'arguments',
	globalThis: 'globalThis',
	eval: 'eval',
	Function: 'Function',
	URL: 'URL',
	URLSearchParams: 'URL',
	TextEncoder: 'TextEncoder',
	TextDecoder: 'TextDecoder',
};

/** Global functions that the subset does not have: a helper (`helpers.ts`) replaces each call. */
const FUNCTION_HELPERS: Record<string, string> = {
	encodeURIComponent: 'encodeUriComponent',
	encodeURI: 'encodeUri',
	decodeURIComponent: 'decodeUriComponent',
	decodeURI: 'decodeUri',
	isFinite: 'isFiniteValue',
	$getWorkflowStaticData: 'ctx.staticData',
};

/** Static functions that the subset does not have, and their helper. */
/** Locales whose CLDR collation is the root collation: no tailoring (checked against Node's ICU). */
export const ROOT_COLLATION_LOCALES = new Set([
	'und',
	'en',
	'en-US',
	'en-GB',
	'en-AU',
	'en-CA',
	'en-NZ',
	'en-IE',
	'en-IN',
	'en-ZA',
	'en-SG',
	'de',
	'de-DE',
	'de-AT',
	'de-CH',
	'fr',
	'fr-FR',
	'it',
	'nl',
	'pt',
	'pt-BR',
	'pt-PT',
]);

const STATIC_HELPERS: Record<string, string> = {
	'Object.fromEntries': 'fromEntries',
	'Array.from': 'arrayFrom',
	'Number.isNaN': 'numberIsNaN',
	'Number.isSafeInteger': 'numberIsSafeInteger',
	'Object.hasOwn': 'hasOwnOf',
	'Math.imul': 'mathImul',
};

/** Static functions with any number of arguments: the helper takes them as one array. */
const VARIADIC_HELPERS: Record<string, string> = {
	'String.fromCharCode': 'fromCharCodes',
	'Math.max': 'mathMaxOf',
	'Math.min': 'mathMinOf',
	'Object.assign': 'assignInto',
};

/** Methods that the subset does not have: `x.m(a, b)` becomes `helper(x, a, b)`. */
const METHOD_HELPERS: Record<string, string> = {
	lastIndexOf: 'lastIndexOfOf',
	hasOwnProperty: 'hasOwnOf',
	substr: 'substrOf',
};

/**
 * Date methods that read a value. On an untyped receiver they become
 * `new Date(x).m()`: a Date that went into an untyped place is its ISO text in
 * native code, and `new Date` of that text gives the same time value.
 */
const DATE_READERS = new Set([
	'getTime',
	'toISOString',
	'getFullYear',
	'getMonth',
	'getDate',
	'getDay',
	'getHours',
	'getMinutes',
	'getSeconds',
	'getMilliseconds',
	'getUTCFullYear',
	'getUTCMonth',
	'getUTCDate',
	'getUTCDay',
	'getUTCHours',
	'getUTCMinutes',
	'getUTCSeconds',
	'getUTCMilliseconds',
	'getTimezoneOffset',
	'toDateString',
	'toTimeString',
	'toUTCString',
]);

/** Methods with another name in the subset. */
const METHOD_ALIASES: Record<string, string> = {
	trimLeft: 'trimStart',
	trimRight: 'trimEnd',
};

/** Globals that are functions, and an arrow with the same result when code uses one as a value. */
const FUNCTION_VALUES: Record<string, string> = {
	['Boolean']: '((v: Json): boolean => Boolean(v))',
	['Number']: '((v: Json): number => Number(v))',
	['String']: '((v: Json): string => String(v))',
	parseFloat: '((v: Json): number => parseFloat(v))',
	parseInt: '((v: Json, r: Json): number => parseInt(v, r))',
	isNaN: '((v: Json): boolean => isNaN(v))',
};

/** Arithmetic operators, for which JavaScript turns a Date into its time value. */
const ARITHMETIC = new Set([
	ts.SyntaxKind.MinusToken,
	ts.SyntaxKind.AsteriskToken,
	ts.SyntaxKind.SlashToken,
	ts.SyntaxKind.PercentToken,
]);

/** A table entry of the key itself, not of `Object.prototype` (`toString`, `constructor`). */
function own(table: Record<string, string>, key: string): string | undefined {
	return Object.hasOwn(table, key) ? table[key] : undefined;
}

/** Methods that change their receiver. */
const MUTATING_METHODS = new Set([
	'push',
	'pop',
	'shift',
	'unshift',
	'splice',
	'sort',
	'reverse',
	'fill',
	'copyWithin',
]);

/** Calls whose result is a new array or object (not one of the inputs). */
const FRESH_METHODS = new Set([
	'map',
	'filter',
	'slice',
	'concat',
	'flatMap',
	'flat',
	'split',
	'keys',
	'values',
	'entries',
	'parse',
	'match',
]);

/** Marks text that a pragma in the code uses to keep the host step. */
export const HOST_PRAGMA = /\/[/*]\s*@n8n-host\b/;

const WRAP_PREFIX = 'async function __wf_user() {\n';
const WRAP_SUFFIX = '\n}';

interface Edit {
	start: number;
	end: number;
	text: string;
	/** Orders edits at the same position: lower first. */
	order: number;
}

/** A program of one JavaScript file, to resolve names to declarations. */
function programOf(text: string): { sf: ts.SourceFile; checker: ts.TypeChecker; syntax: number } {
	const fileName = '/code.js';
	const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
	const host: ts.CompilerHost = {
		getSourceFile: (f) => (f === fileName ? sf : undefined),
		getDefaultLibFileName: () => '/lib.d.ts',
		writeFile: () => {},
		getCurrentDirectory: () => '/',
		getDirectories: () => [],
		fileExists: (f) => f === fileName,
		readFile: (f) => (f === fileName ? text : undefined),
		getCanonicalFileName: (f) => f,
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => '\n',
	};
	const program = ts.createProgram({
		rootNames: [fileName],
		options: { allowJs: true, noLib: true, noResolve: true, noEmit: true, types: [] },
		host,
	});
	return {
		sf,
		checker: program.getTypeChecker(),
		syntax: program.getSyntacticDiagnostics(sf).length,
	};
}

function isNameOf(n: ts.Identifier): boolean {
	const p = n.parent;
	return (
		(ts.isPropertyAccessExpression(p) && p.name === n) ||
		(ts.isPropertyAssignment(p) && p.name === n) ||
		(ts.isMethodDeclaration(p) && p.name === n) ||
		(ts.isBindingElement(p) && p.propertyName === n) ||
		(ts.isPropertySignature(p) && p.name === n) ||
		(ts.isGetAccessor(p) && p.name === n) ||
		(ts.isSetAccessor(p) && p.name === n) ||
		ts.isLabeledStatement(p) ||
		ts.isBreakOrContinueStatement(p)
	);
}

function isFunctionNode(n: ts.Node): n is ts.FunctionLikeDeclaration {
	return (
		ts.isFunctionDeclaration(n) ||
		ts.isFunctionExpression(n) ||
		ts.isArrowFunction(n) ||
		ts.isMethodDeclaration(n)
	);
}

function stripParens(e: ts.Expression): ts.Expression {
	let x = e;
	while (ts.isParenthesizedExpression(x)) x = x.expression;
	return x;
}

function stringArgument(call: ts.CallExpression): string | null {
	const a = call.arguments[0];
	if (call.arguments.length !== 1 || !a) return null;
	if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) return a.text;
	return null;
}

function isNewDate(e: ts.Expression | undefined): boolean {
	if (!e) return false;
	const x = stripParens(e);
	return ts.isNewExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'Date';
}

/** True when `e` makes a new array or object, so changing it changes no input. */
function isFresh(e: ts.Expression): boolean {
	const x = stripParens(e);
	if (ts.isArrayLiteralExpression(x) || ts.isObjectLiteralExpression(x)) return true;
	if (ts.isNewExpression(x)) return true;
	if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression)) {
		return FRESH_METHODS.has(x.expression.name.text);
	}
	return false;
}

/** The text of an expression as V8 shows it in "… is not iterable". */
function iterableText(e: ts.Expression, sf: ts.SourceFile): string {
	const show = (x: ts.Expression): string => {
		const s = stripParens(x);
		if (ts.isPropertyAccessExpression(s)) return `${show(s.expression)}.${s.name.text}`;
		if (
			ts.isElementAccessExpression(s) &&
			(ts.isStringLiteral(s.argumentExpression) || ts.isNumericLiteral(s.argumentExpression))
		) {
			return ts.isStringLiteral(s.argumentExpression)
				? `${show(s.expression)}.${s.argumentExpression.text}`
				: `${show(s.expression)}[${s.argumentExpression.text}]`;
		}
		return s.getText(sf);
	};
	const s = stripParens(e);
	if (ts.isCallExpression(s)) {
		return `${show(s.expression)} is not a function or its return value`;
	}
	return show(s);
}

/** True when \`n\` is written: the left side of an assignment or an operand of ++ / --. */
function isAssignmentTarget(n: ts.Node): boolean {
	const p = n.parent;
	if (ts.isBinaryExpression(p) && p.left === n) {
		return (
			p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
			p.operatorToken.kind <= ts.SyntaxKind.LastAssignment
		);
	}
	return (
		(ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) &&
		(p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken)
	);
}

/** True for \`Buffer.from(...)\` with the global Buffer. */
function isBufferFrom(e: ts.Expression): boolean {
	return (
		ts.isCallExpression(e) &&
		ts.isPropertyAccessExpression(e.expression) &&
		ts.isIdentifier(e.expression.expression) &&
		e.expression.expression.text === 'Buffer' &&
		e.expression.name.text === 'from'
	);
}

/** Translates the code. See the file comment. */
export function translateCode(input: CodeNativeInput): TranslateResult {
	const text = WRAP_PREFIX + input.code + WRAP_SUFFIX;
	const { sf, checker, syntax } = programOf(text);
	const blockers: Blocker[] = [];
	const block = (feature: string, message: string) => {
		if (!blockers.some((b) => b.feature === feature)) blockers.push({ feature, message });
	};
	if (HOST_PRAGMA.test(input.code)) {
		block('host pragma', 'The code has the `@n8n-host` comment, which keeps the host step.');
	}
	if (syntax > 0) {
		block('syntax error', 'The code does not parse.');
		return { ok: false, blockers };
	}
	const root = sf.statements[0];
	if (!root || !ts.isFunctionDeclaration(root) || !root.body) {
		block('syntax error', 'The code does not parse as a function body.');
		return { ok: false, blockers };
	}

	const edits: Edit[] = [];
	let seq = 0;
	const replace = (start: number, end: number, code: string) =>
		edits.push({ start, end, text: code, order: seq++ });
	// An edit that opens a construct goes before the edits of the code inside it. An edit that
	// closes it goes after them: `owner` is the `seq` of the construct, and inner ones are later.
	const open = (at: number, code: string) =>
		edits.push({ start: at, end: at, text: code, order: -2_000_000 + seq++ });
	const closing = (start: number, end: number, code: string, owner: number) =>
		edits.push({ start, end, text: code, order: 1_000_000 - owner });
	const replaceNode = (n: ts.Node, code: string) => replace(n.getStart(sf), n.getEnd(), code);
	const insert = (at: number, code: string, order: number) =>
		edits.push({ start: at, end: at, text: code, order });

	const helpers = new Set<string>();
	const nodes: string[] = [];
	let usesFirstJson = false;
	let nondeterministic = false;
	let mutates = false;
	/** Local variables that hold a Date (declared with `new Date(…)`, without a type). */
	const dateVars = new Set<ts.Symbol>();
	/** Catch blocks that read the error and have a native form (`catch-check.ts`). */
	const plannedCatches = new Set<ts.Node>();
	/** Nodes that become `errText(<error>)`, by the name of the error. */
	const errTextNodes = new Map<ts.Node, string>();
	/** Receivers of method calls that `mcheck` checks first. */
	const methodChecks = new Map<ts.Node, { method: string; text: string }>();
	/** True when the catch clause reads its error. */
	const readsError = (c: ts.CatchClause): boolean => {
		const d = c.variableDeclaration;
		if (!d || !ts.isIdentifier(d.name)) return false;
		const sym = checker.getSymbolAtLocation(d.name);
		let used = false;
		const find = (x: ts.Node): void => {
			if (used) return;
			if (
				ts.isShorthandPropertyAssignment(x) &&
				checker.getShorthandAssignmentValueSymbol(x) === sym
			) {
				used = true;
				return;
			}
			if (ts.isIdentifier(x) && x !== d.name && checker.getSymbolAtLocation(x) === sym) {
				used = true;
				return;
			}
			ts.forEachChild(x, find);
		};
		find(c.block);
		return used;
	};
	const isDateValue = (e: ts.Expression): boolean => {
		const x = stripParens(e);
		if (isNewDate(x)) return true;
		if (!ts.isIdentifier(x)) return false;
		const sym = checker.getSymbolAtLocation(x);
		return sym !== undefined && dateVars.has(sym);
	};

	const isFree = (id: ts.Identifier): boolean => {
		const sym = checker.getSymbolAtLocation(id);
		return sym === undefined || (sym.declarations ?? []).length === 0;
	};

	const nodeList = (name: string): string | null => {
		if (!input.hasNode(name)) {
			block(
				'$() of a node that has not run',
				`The code reads node "${name}", which has not run before this node.`,
			);
			return null;
		}
		let k = nodes.indexOf(name);
		if (k < 0) {
			nodes.push(name);
			k = nodes.length - 1;
		}
		return nodeVar(k);
	};

	/** `<list>.all() / .first() / .last() / .item / .isExecuted` of `$input` or `$('X')`. */
	const itemChain = (base: ts.Node, list: string | null, own: boolean): void => {
		const p = base.parent;
		if (!ts.isPropertyAccessExpression(p) || p.expression !== base) {
			block(own ? '$input as a value' : "$('…') as a value", 'The code uses the object itself.');
			return;
		}
		const member = p.name.text;
		const call = ts.isCallExpression(p.parent) && p.parent.expression === p ? p.parent : null;
		if (list === null) return;
		if (call && call.arguments.length === 0) {
			if (member === 'all') {
				replace(base.getStart(sf), call.getEnd(), list);
				return;
			}
			if (member === 'first') {
				replace(base.getStart(sf), call.getEnd(), `${list}[0]`);
				return;
			}
			if (member === 'last') {
				replace(base.getStart(sf), call.getEnd(), `${list}[${list}.length - 1]`);
				return;
			}
		}
		if (!call && member === 'item') {
			// As the host: `.item` is the current item in "each item" mode, else the first item.
			replace(base.getStart(sf), p.getEnd(), own && input.mode === 'each' ? ITEM : `${list}[0]`);
			return;
		}
		if (!call && member === 'isExecuted' && !own) {
			replace(base.getStart(sf), p.getEnd(), `(${list}.length > 0)`);
			return;
		}
		block(
			own ? `$input.${member}` : `$('…').${member}`,
			`\`${own ? '$input' : "$('…')"}.${member}\` has no native form.`,
		);
	};

	// ---- $() with a computed name -------------------------------------------

	let usesAllNodes = false;

	/** \`$(expr).all() / .first() / .last() / .item / .isExecuted\` over every node that ran before. */
	const computedNode = (call: ts.CallExpression): void => {
		const arg = call.arguments[0];
		const p = call.parent;
		if (
			!arg ||
			call.arguments.length !== 1 ||
			!ts.isPropertyAccessExpression(p) ||
			p.expression !== call
		) {
			block('$() with a computed name', '`$(…)` with a computed node name is used as a value.');
			return;
		}
		const member = p.name.text;
		const called = ts.isCallExpression(p.parent) && p.parent.expression === p ? p.parent : null;
		const which =
			called && called.arguments.length === 0 && ['all', 'first', 'last'].includes(member)
				? member
				: !called && (member === 'item' || member === 'isExecuted')
					? member
					: null;
		if (which === null) {
			block(`$('…').${member}`, `\`$(…).${member}\` has no native form.`);
			return;
		}
		usesAllNodes = true;
		helpers.add('nodeByName');
		const end = called ?? p;
		const o = seq;
		replace(call.getStart(sf), arg.getStart(sf), `nodeByName(${ALL_NODES}, `);
		closing(arg.getEnd(), end.getEnd(), `, ${JSON.stringify(which)})`, o);
		visit(arg);
	};

	// ---- var hoisting ------------------------------------------------------

	/** Names declared with `var`, for each function body (or the root). */
	const hoisted = new Map<ts.Node, Set<string>>();
	const functionOf = (n: ts.Node): ts.Node => {
		let p: ts.Node | undefined = n.parent;
		while (p && !isFunctionNode(p)) p = p.parent;
		return p ?? root;
	};

	const hoistVar = (list: ts.VariableDeclarationList): boolean => {
		const fn = functionOf(list);
		const names = hoisted.get(fn) ?? new Set<string>();
		hoisted.set(fn, names);
		for (const d of list.declarations) {
			if (!ts.isIdentifier(d.name)) {
				block('var with destructuring', '`var` with a destructuring pattern has no native form.');
				return false;
			}
			names.add(d.name.text);
		}
		return true;
	};

	/** Rewrites `var a = 1, b;` as `a = 1;` (the names are declared at the top). */
	const rewriteVarStatement = (st: ts.VariableStatement) => {
		const list = st.declarationList;
		if (!hoistVar(list)) return;
		const decls = list.declarations;
		// Remove `var` and the declarations without a value.
		replace(st.getStart(sf), decls[0].getStart(sf), '');
		decls.forEach((d, k) => {
			if (k > 0) replace(decls[k - 1].getEnd(), d.getStart(sf), '; ');
			if (!d.initializer) replaceNode(d, '');
		});
	};

	const rewriteVarHead = (list: ts.VariableDeclarationList, inLoopHead: 'for' | 'of') => {
		if (!hoistVar(list)) return;
		const decls = list.declarations;
		if (inLoopHead === 'for' && decls.length > 1) {
			block('var list in a for head', '`for (var a = 0, b = 1; …)` has no native form.');
			return;
		}
		replace(list.getStart(sf), decls[0].getStart(sf), '');
	};

	// ---- type annotations --------------------------------------------------

	const isBareArrow = (fn: ts.SignatureDeclaration): boolean =>
		ts.isArrowFunction(fn) &&
		!fn.getChildren(sf).some((c) => c.kind === ts.SyntaxKind.OpenParenToken);

	const annotateParameters = (fn: ts.SignatureDeclaration) => {
		const bareArrow = isBareArrow(fn);
		for (const p of fn.parameters) {
			if (p.type) continue;
			if (p.dotDotDotToken) {
				// The compiler does not lower rest parameters.
				block('rest parameter', 'A rest parameter (`...args`) has no native form.');
				continue;
			}
			if (bareArrow) {
				insert(p.getStart(sf), '(', -1);
				insert(p.name.getEnd(), ': Json): Json', 1);
				continue;
			}
			if (p.initializer || p.questionToken) {
				insert(p.name.getEnd(), ': Json', 0);
			} else if (ts.isIdentifier(p.name)) {
				// JavaScript allows calls with fewer arguments.
				insert(p.name.getEnd(), '?: Json', 0);
			} else {
				insert(p.name.getEnd(), ': Json = undefined', 0);
			}
		}
	};

	const annotateReturn = (fn: ts.FunctionLikeDeclaration) => {
		if (fn.type || fn.asteriskToken || isBareArrow(fn)) return;
		if (ts.isArrowFunction(fn)) {
			const arrow = fn.equalsGreaterThanToken;
			const close = fn
				.getChildren(sf)
				.find((c) => c.kind === ts.SyntaxKind.CloseParenToken && c.getEnd() <= arrow.getStart(sf));
			if (close) insert(close.getEnd(), ': Json', 0);
			return;
		}
		const close = fn.getChildren(sf).find((c) => c.kind === ts.SyntaxKind.CloseParenToken);
		if (close) insert(close.getEnd(), ': Json', 0);
	};

	// ---- mutation ----------------------------------------------------------

	/** Local variables that only ever hold new arrays or objects. */
	const freshVars = new Set<ts.Symbol>();
	const notFresh = new Set<ts.Symbol>();
	const noteAssignment = (target: ts.Expression, value: ts.Expression | undefined) => {
		if (!ts.isIdentifier(target)) return;
		const sym = checker.getSymbolAtLocation(target);
		if (!sym) return;
		if (value && isFresh(value)) freshVars.add(sym);
		else notFresh.add(sym);
	};
	const mutationTargets: ts.Expression[] = [];
	const noteMutation = (target: ts.Expression) => mutationTargets.push(target);

	// ---- Set and Map -----------------------------------------------------------

	const isCollectionNew = (x: ts.Node): x is ts.NewExpression =>
		ts.isNewExpression(x) &&
		ts.isIdentifier(x.expression) &&
		(x.expression.text === 'Set' || x.expression.text === 'Map') &&
		isFree(x.expression);

	/** True when the code makes a Set or a Map: then the methods of both become helpers. */
	const usesCollections = ((): boolean => {
		let found = false;
		const scan = (x: ts.Node): void => {
			if (found) return;
			if (isCollectionNew(x)) {
				found = true;
				return;
			}
			ts.forEachChild(x, scan);
		};
		scan(root);
		return found;
	})();

	const COLLECTION_METHODS: Record<string, string> = {
		add: 'collAdd',
		set: 'collSet',
		get: 'collGet',
		has: 'collHas',
		delete: 'collDelete',
		clear: 'collClear',
		forEach: 'collForEach',
		keys: 'collList',
		values: 'collList',
		entries: 'collList',
	};

	/** Rewrites a method of a Set or a Map. Returns true when it wrote a helper call. */
	const collectionMethod = (
		n: ts.CallExpression,
		callee: ts.PropertyAccessExpression,
		name: string,
	): boolean => {
		if (!usesCollections) return false;
		const helper = own(COLLECTION_METHODS, name);
		if (!helper) return false;
		const recv = stripParens(callee.expression);
		if (ts.isIdentifier(recv) && isFree(recv) && recv.text !== 'items') return false;
		if (helper === 'collList') toHelper(n, callee, helper, `, ${JSON.stringify(name)}`);
		else toHelper(n, callee, helper);
		return true;
	};

	/** The text of a string literal, or of a const that a string literal sets. */
	const constText = (e: ts.Expression): string | null => {
		const x = stripParens(e);
		if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) return x.text;
		if (!ts.isIdentifier(x)) return null;
		const decls = checker.getSymbolAtLocation(x)?.declarations ?? [];
		const d = decls[0];
		if (
			decls.length !== 1 ||
			!ts.isVariableDeclaration(d) ||
			!ts.isVariableDeclarationList(d.parent) ||
			(d.parent.flags & ts.NodeFlags.Const) === 0 ||
			d.initializer === undefined
		) {
			return null;
		}
		const init = stripParens(d.initializer);
		return ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init) ? init.text : null;
	};

	// ---- Luxon ---------------------------------------------------------------

	/** True when the code uses Luxon: then DateTime methods and getters become helpers. */
	const usesLuxon = /\$now\b|\$today\b|\bDateTime\b/.test(input.code);
	/** The default zone of Luxon, as code. */
	const dz = JSON.stringify(input.timezone ?? DEFAULT_TIMEZONE);

	/** A zone name of a literal argument (recorded for META `zones`), null when absent, false when computed. */
	const luxZoneArg = (e: ts.Expression | undefined): string | null | false => {
		if (e === undefined) return null;
		const z = constText(e);
		if (z === null) return false;
		const lower = z.toLowerCase();
		if (
			['local', 'system', 'default', 'utc', 'gmt', 'z'].includes(lower) ||
			/^utc[+-]\d{1,2}(:\d{2})?$/i.test(z)
		) {
			return z;
		}
		if (!isKnownTimezone(z)) return false;
		zones.add(z);
		return z;
	};

	/** True for absent options or a literal `{ zone, setZone }` object. */
	const luxOptions = (e: ts.Expression | undefined): boolean => {
		if (e === undefined) return true;
		if (!ts.isObjectLiteralExpression(e)) return false;
		for (const p of e.properties) {
			if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) return false;
			if (p.name.text === 'zone') {
				if (luxZoneArg(p.initializer) === false) return false;
			} else if (p.name.text !== 'setZone') return false;
		}
		return true;
	};

	/** `DateTime.x(...)`: true when it wrote the call. */
	const luxStatic = (n: ts.CallExpression, name: string): boolean => {
		const args = n.arguments;
		if (args.some((a) => ts.isSpreadElement(a))) return false;
		if (name === 'now') {
			if (args.length > 0) return false;
			helpers.add('luxOf');
			nondeterministic = true;
			replaceNode(n, `luxOf(Date.now(), ${dz})`);
			return true;
		}
		if (name === 'fromISO') {
			if (args.length < 1 || args.length > 2 || !luxOptions(args[1])) return false;
			helpers.add('luxFromISO');
			nondeterministic = true;
			const o = seq;
			replace(n.getStart(sf), args[0].getStart(sf), 'luxFromISO(');
			closing(
				args[args.length - 1].getEnd(),
				n.getEnd(),
				`${args.length === 1 ? ', undefined' : ''}, Date.now(), ${dz})`,
				o,
			);
			for (const a of args) visit(a);
			return true;
		}
		if (!['fromMillis', 'fromSeconds', 'fromJSDate', 'fromObject', 'utc'].includes(name))
			return false;
		if (name !== 'utc' && (args.length < 1 || args.length > 2 || !luxOptions(args[1])))
			return false;
		helpers.add('luxStatic');
		nondeterministic = true;
		const first = args[0];
		if (first === undefined)
			replaceNode(n, `luxStatic(${JSON.stringify(name)}, [], Date.now(), ${dz})`);
		else {
			const o = seq;
			replace(n.getStart(sf), first.getStart(sf), `luxStatic(${JSON.stringify(name)}, [`);
			closing(args[args.length - 1].getEnd(), n.getEnd(), `], Date.now(), ${dz})`, o);
		}
		for (const a of args) visit(a);
		return true;
	};

	const LUX_METHODS = new Set([
		'toFormat',
		'toISO',
		'toISODate',
		'toISOTime',
		'toMillis',
		'toSeconds',
		'toUnixInteger',
		'toJSDate',
		'plus',
		'minus',
		'startOf',
		'endOf',
		'set',
		'toUTC',
		'toLocal',
		'setZone',
		'equals',
		'diff',
		'as',
		'toObject',
	]);

	const LUX_GETTERS = new Set([
		'year',
		'month',
		'day',
		'hour',
		'minute',
		'second',
		'millisecond',
		'weekday',
		'isValid',
		'invalidReason',
		'zoneName',
		'offset',
		'daysInMonth',
		'ordinal',
		'quarter',
		// Duration getters.
		'years',
		'quarters',
		'months',
		'weeks',
		'days',
		'hours',
		'minutes',
		'seconds',
		'milliseconds',
	]);

	/** The tokens of `luxFormat`. */
	const LUX_TOKENS = new Set(
		'yyyy yy y yyyyyy M MM MMM MMMM MMMMM L LL LLL LLLL LLLLL d dd H HH h hh m mm s ss S SSS a c ccc cccc ccccc E EEE EEEE EEEEE o ooo Z ZZ ZZZ z x X q qq'.split(
			' ',
		),
	);

	const formatSupported = (fmt: string): boolean => {
		let k = 0;
		while (k < fmt.length) {
			const ch = fmt.charAt(k);
			if (ch === "'") {
				const end = fmt.indexOf("'", k + 1);
				k = end < 0 ? fmt.length : end + 1;
				continue;
			}
			let n = 1;
			while (fmt.charAt(k + n) === ch) n++;
			if (/[A-Za-z]/.test(ch) && !LUX_TOKENS.has(fmt.slice(k, k + n))) return false;
			k += n;
		}
		return true;
	};

	/** A DateTime method on any receiver: true when it wrote the call. */
	const luxMethod = (
		n: ts.CallExpression,
		callee: ts.PropertyAccessExpression,
		name: string,
	): boolean => {
		if (!usesLuxon || !LUX_METHODS.has(name)) return false;
		const a0 = n.arguments[0];
		if (name === 'toFormat') {
			const fmt = a0 === undefined ? null : constText(a0);
			if (fmt === null || !formatSupported(fmt) || n.arguments.length > 1) {
				block(
					'Luxon toFormat',
					'A computed format, options or a format token without a native form.',
				);
				return true;
			}
		}
		if (name === 'setZone' && (luxZoneArg(a0) === false || n.arguments.length > 1)) {
			block('Luxon setZone', '`setZone` with a computed zone or options has no native form.');
			return true;
		}
		if (n.arguments.some((a) => ts.isSpreadElement(a))) return false;
		if (callee.questionDotToken || ts.isOptionalChain(callee)) {
			block('optional chain', 'A method rewrite inside an optional chain has no native form.');
			return true;
		}
		helpers.add('luxCall');
		const o = seq;
		open(callee.expression.getStart(sf), 'luxCall(');
		if (n.arguments.length === 0) {
			closing(callee.expression.getEnd(), n.getEnd(), `, ${JSON.stringify(name)}, [], ${dz})`, o);
		} else {
			closing(
				callee.expression.getEnd(),
				n.arguments[0].getStart(sf),
				`, ${JSON.stringify(name)}, [`,
				o,
			);
			closing(n.arguments[n.arguments.length - 1].getEnd(), n.getEnd(), `], ${dz})`, o);
		}
		visit(callee.expression);
		for (const x of n.arguments) visit(x);
		return true;
	};

	// ---- locale formatting ---------------------------------------------------

	const zones = new Set<string>();
	if (usesLuxon) {
		const tz = input.timezone ?? DEFAULT_TIMEZONE;
		if (tz !== 'UTC' && tz !== 'system' && isKnownTimezone(tz)) zones.add(tz);
		else if (tz !== 'UTC' && tz !== 'system')
			block('Luxon zone', 'The workflow time zone is not in the zone table.');
	}
	/** True when the code makes an Intl formatter: then \`format\` calls become helpers. */
	const hasIntl = /\bIntl\s*\.\s*(DateTimeFormat|NumberFormat)\b/.test(input.code);

	/** The locale and options of literal arguments, or a blocker reason. */
	const localeArgs = (
		a0: ts.Expression | undefined,
		a1: ts.Expression | undefined,
	): { locale: string | null; options: Record<string, unknown>; zone: string | null } | string => {
		let locale: string | null = null;
		if (a0 !== undefined && !(ts.isIdentifier(a0) && a0.text === 'undefined')) {
			const text = constText(a0);
			if (text === null) return 'a computed locale';
			locale = text;
		}
		const options: Record<string, unknown> = {};
		let zone: string | null = null;
		if (a1 !== undefined) {
			if (!ts.isObjectLiteralExpression(a1)) return 'computed options';
			for (const p of a1.properties) {
				if (
					!ts.isPropertyAssignment(p) ||
					!(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
				) {
					return 'computed options';
				}
				const v = p.initializer;
				let value: unknown;
				const text = constText(v);
				if (text !== null) value = text;
				else if (ts.isNumericLiteral(v)) value = Number(v.text);
				else if (v.kind === ts.SyntaxKind.TrueKeyword) value = true;
				else if (v.kind === ts.SyntaxKind.FalseKeyword) value = false;
				else return p.name.text === 'timeZone' ? 'a computed time zone' : 'computed options';
				if (p.name.text === 'timeZone') {
					if (typeof value !== 'string' || !isKnownTimezone(value)) return 'an unknown time zone';
					zone = value === 'UTC' || value === 'Etc/UTC' ? null : value;
				} else options[p.name.text] = value;
			}
		}
		const sorted: Record<string, unknown> = {};
		for (const k of Object.keys(options).sort()) sorted[k] = options[k];
		return { locale, options: sorted, zone };
	};

	/** The spec of a table entry with its name lists in place, as code. */
	const specCode = (spec: Record<string, unknown> | undefined): string => {
		if (!spec) return 'null';
		const out: Record<string, unknown> = { ...spec };
		for (const k of ['m', 'w', 'ap']) {
			const at = spec[k];
			if (typeof at === 'number') out[k] = LOCALE_NAMES[at];
		}
		return JSON.stringify(out);
	};

	const tableEntry = (
		method: string,
		a: { locale: string | null; options: Record<string, unknown> },
	) =>
		Object.hasOwn(LOCALE_TABLE, JSON.stringify([method, a.locale, a.options]))
			? LOCALE_TABLE[JSON.stringify([method, a.locale, a.options])]
			: undefined;

	/** \`x.toLocaleString(locale, options)\` and the Date forms. True when it wrote the call. */
	const localeMethod = (
		n: ts.CallExpression,
		callee: ts.PropertyAccessExpression,
		name: string,
	): boolean => {
		if (
			name !== 'toLocaleString' &&
			name !== 'toLocaleDateString' &&
			name !== 'toLocaleTimeString'
		) {
			return false;
		}
		const recv = callee.expression;
		const a = localeArgs(n.arguments[0], n.arguments[1]);
		if (typeof a === 'string' || n.arguments.length > 2) {
			block(
				`locale formatting with ${typeof a === 'string' ? a : 'more arguments'}`,
				'The locale or the options are not literals.',
			);
			return true;
		}
		const entry = tableEntry(name, a);
		const typedDate = isDateValue(recv);
		const isDate = name !== 'toLocaleString' || typedDate;
		if (!entry || (isDate && !entry.date) || (!isDate && !entry.num && !entry.date)) {
			block(
				'locale formatting outside the table',
				`\`${name}\` with these options is not in the locale table.`,
			);
			return true;
		}
		if (ts.isOptionalChain(callee)) {
			block('optional chain', 'A method rewrite inside an optional chain has no native form.');
			return true;
		}
		if (a.zone) zones.add(a.zone);
		helpers.add('localeFormat');
		const o = seq;
		open(recv.getStart(sf), 'localeFormat(');
		const zone = a.zone === null ? 'null' : JSON.stringify(a.zone);
		const tail = `, ${specCode(entry.date)}, ${specCode(entry.num)}, ${zone}, ${isDate})`;
		closing(recv.getEnd(), n.getEnd(), (typedDate ? '.getTime()' : '') + tail, o);
		visit(recv);
		return true;
	};

	// ---- regular expressions -----------------------------------------------

	/** True when the code makes a regular expression anywhere. */
	const hasRegex = ((): boolean => {
		let found = false;
		const scan = (x: ts.Node): void => {
			if (found) return;
			if (
				x.kind === ts.SyntaxKind.RegularExpressionLiteral ||
				(ts.isNewExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'RegExp')
			) {
				found = true;
				return;
			}
			ts.forEachChild(x, scan);
		};
		scan(root);
		return found;
	})();

	/** True when the code reads `.index`, `.input` or `.groups` and makes regular expressions. */
	const usesMatchProps =
		hasRegex &&
		((): boolean => {
			let found = false;
			const scan = (x: ts.Node): void => {
				if (found) return;
				if (
					ts.isPropertyAccessExpression(x) &&
					['index', 'input', 'groups'].includes(x.name.text)
				) {
					found = true;
					return;
				}
				ts.forEachChild(x, scan);
			};
			scan(root);
			return found;
		})();

	/** Writes a regular expression value (`regexOf`) in place of `n`. */
	const regexValue = (n: ts.Node, source: string, flags: string) => {
		const checked = checkRegex(source, flags);
		if (!checked.ok) {
			block(
				`regular expression: ${checked.reason}`,
				`The regular expression has ${checked.reason}.`,
			);
			return;
		}
		const p = n.parent;
		// JavaScript prints a RegExp as \`/source/flags\`; the native value is a plain object.
		if (
			ts.isTemplateSpan(p) ||
			(ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken) ||
			(ts.isPropertyAccessExpression(p) && p.name.text === 'toString')
		) {
			block('regular expression as text', 'The code uses a regular expression as text.');
			return;
		}
		if (checked.info.groups > 9) maxGroups = Math.max(maxGroups, checked.info.groups);
		helpers.add('regexOf');
		replaceNode(
			n,
			`regexOf(${JSON.stringify(source)}, ${JSON.stringify(flags)}, ${JSON.stringify(checked.info.names)})`,
		);
	};
	let maxGroups = 0;

	/** True when `e` is certainly a regular expression: a literal, `new RegExp`, or a const of one. */
	const regexish = (e: ts.Expression | undefined): boolean => {
		if (!e) return false;
		const x = stripParens(e);
		if (x.kind === ts.SyntaxKind.RegularExpressionLiteral) return true;
		if (ts.isNewExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'RegExp') {
			return true;
		}
		if (!ts.isIdentifier(x)) return false;
		const decls = checker.getSymbolAtLocation(x)?.declarations ?? [];
		return (
			decls.length === 1 &&
			ts.isVariableDeclaration(decls[0]) &&
			ts.isVariableDeclarationList(decls[0].parent) &&
			(decls[0].parent.flags & ts.NodeFlags.Const) !== 0 &&
			decls[0].initializer !== undefined &&
			regexish(decls[0].initializer)
		);
	};

	const isStringLiteral = (e: ts.Expression | undefined): boolean => {
		if (!e) return false;
		const x = stripParens(e);
		return ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) || ts.isNumericLiteral(x);
	};

	/** \`recv.m(a, b)\` becomes \`helper(recv, a, b)\` (the caller visits the parts). */
	const toHelper = (
		n: ts.CallExpression,
		callee: ts.PropertyAccessExpression,
		helper: string,
		extra = '',
	) => {
		helpers.add(helper);
		const o = seq;
		const recv = callee.expression;
		if (callee.questionDotToken) {
			// \`x?.m(a)\` becomes \`optCall(x, (o) => helper(o, a))\`: the arguments run only for a value.
			helpers.add('optCall');
			const fn = `(${P}o: Json): Json => ${helper}(${P}o`;
			open(recv.getStart(sf), 'optCall(');
			if (n.arguments.length === 0) {
				closing(recv.getEnd(), n.getEnd(), `, ${fn}${extra}))`, o);
				return;
			}
			const lastArg = n.arguments[n.arguments.length - 1];
			closing(recv.getEnd(), n.arguments[0].getStart(sf), `, ${fn}, `, o);
			if (extra !== '') closing(lastArg.getEnd(), lastArg.getEnd(), extra, o);
			closing(n.getEnd() - 1, n.getEnd(), '))', o);
			return;
		}
		if (ts.isOptionalChain(callee)) {
			block('optional chain', 'A method rewrite inside an optional chain has no native form.');
			return;
		}
		open(callee.expression.getStart(sf), `${helper}(`);
		if (n.arguments.length === 0) {
			closing(callee.expression.getEnd(), n.getEnd(), `${extra})`, o);
			return;
		}
		closing(callee.expression.getEnd(), n.arguments[0].getStart(sf), ', ', o);
		// After the last argument: a trailing comma before `)` stays valid.
		const last = n.arguments[n.arguments.length - 1];
		if (extra !== '') closing(last.getEnd(), last.getEnd(), extra, o);
	};

	/**
	 * Rewrites the methods that take a regular expression. Returns true when it
	 * wrote a helper call. String forms with string arguments stay methods.
	 */
	const regexMethod = (
		n: ts.CallExpression,
		callee: ts.PropertyAccessExpression,
		name: string,
	): boolean => {
		const [a0, a1] = n.arguments;
		switch (name) {
			case 'test':
			case 'exec':
				if (!hasRegex || n.arguments.length > 1) return false;
				toHelper(
					n,
					callee,
					name === 'test' ? 'regexTestOf' : 'regexExecOf',
					name === 'exec' && usesMatchProps
						? `${n.arguments.length === 0 ? ', undefined' : ''}, ${MATCHES}`
						: '',
				);
				return true;
			case 'match':
			case 'matchAll':
			case 'search':
				if (!hasRegex && !regexish(a0)) return false;
				if (!regexish(a0) || n.arguments.length !== 1) {
					block(
						`${name} without a regular expression`,
						`\`${name}\` with a string or a computed pattern has no native form.`,
					);
					return true;
				}
				toHelper(
					n,
					callee,
					name === 'match' ? 'strMatch' : name === 'matchAll' ? 'strMatchAll' : 'strSearch',
					name !== 'search' && usesMatchProps ? `, ${MATCHES}` : '',
				);
				return true;
			case 'replace':
			case 'replaceAll':
				if (n.arguments.length !== 2) return false;
				if (
					isStringLiteral(a0) &&
					(isStringLiteral(a1) || ts.isTemplateExpression(stripParens(a1)))
				) {
					return false;
				}
				// The helper handles strings, regular expressions and callbacks at run time.
				toHelper(n, callee, 'strReplace', name === 'replaceAll' ? ', true' : ', false');
				return true;
			case 'split':
				if (a0 === undefined || isStringLiteral(a0) || (!hasRegex && !regexish(a0))) return false;
				if (n.arguments.length === 1) toHelper(n, callee, 'strSplit', ', undefined');
				else toHelper(n, callee, 'strSplit');
				return true;
			default:
				return false;
		}
	};

	// ---- the walk ----------------------------------------------------------

	const visit = (n: ts.Node): void => {
		const errName = errTextNodes.get(n);
		if (errName !== undefined) {
			helpers.add('errText');
			replaceNode(n, `errText(${errName})`);
			return;
		}
		const mc = methodChecks.get(n);
		if (mc) {
			helpers.add('mcheck');
			const o = seq;
			open(n.getStart(sf), 'mcheck(');
			closing(
				n.getEnd(),
				n.getEnd(),
				`, ${JSON.stringify(mc.method)}, ${JSON.stringify(mc.text)})`,
				o,
			);
		}
		if (ts.isTryStatement(n) && n.catchClause && readsError(n.catchClause)) {
			const plan = planCatch(n, checker, { dateVars });
			if (typeof plan === 'string') {
				block(
					'catch reads the error',
					`The catch block reads the error, and the try block has ${plan}.`,
				);
			} else {
				plannedCatches.add(n.catchClause);
				const name = n.catchClause.variableDeclaration?.name.getText(sf) ?? 'e';
				for (const x of plan.errText) errTextNodes.set(x, name);
				for (const c of plan.checks)
					methodChecks.set(c.receiver, { method: c.method, text: c.text });
			}
		}
		switch (n.kind) {
			case ts.SyntaxKind.ClassDeclaration:
			case ts.SyntaxKind.ClassExpression:
				block('class', 'Classes have no native form.');
				return;
			case ts.SyntaxKind.ThisKeyword:
				block('this (this.helpers)', '`this` has no native form.');
				return;
			case ts.SyntaxKind.GetAccessor:
			case ts.SyntaxKind.SetAccessor:
				block('getter / setter', 'Getters and setters have no native form.');
				return;
			case ts.SyntaxKind.LabeledStatement:
				block('label', 'Labels have no native form.');
				break;
			case ts.SyntaxKind.YieldExpression:
				block('generator', 'Generators have no native form.');
				return;
			case ts.SyntaxKind.RegularExpressionLiteral: {
				const literal = n.getText(sf);
				const slash = literal.lastIndexOf('/');
				regexValue(n, literal.slice(1, slash), literal.slice(slash + 1));
				return;
			}
			case ts.SyntaxKind.TaggedTemplateExpression:
				block('tagged template', 'Tagged templates have no native form.');
				return;
			case ts.SyntaxKind.WithStatement:
				block('with', '`with` has no native form.');
				return;
			default:
				break;
		}

		if (ts.isFunctionExpression(n) && n.name) {
			// The compiler does not bind the name of a function expression inside it.
			block('named function expression', 'A named function expression has no native form.');
			return;
		}
		if (isFunctionNode(n) && n !== root) {
			if (n.asteriskToken) block('generator', 'Generators have no native form.');
			if (ts.isMethodDeclaration(n)) {
				block('object method', 'Object literal methods have no native form.');
				return;
			}
			annotateParameters(n);
			annotateReturn(n);
			const asyncMod = n.modifiers?.find((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
			// No value in native code is a promise, so an async function runs to its end at once.
			if (asyncMod) replace(asyncMod.getStart(sf), asyncMod.getEnd() + 1, '');
		}

		if (ts.isAwaitExpression(n)) {
			const at = n.getStart(sf);
			replace(at, n.expression.getStart(sf), '');
		}

		if (ts.isVariableStatement(n) && (n.declarationList.flags & ts.NodeFlags.BlockScoped) === 0) {
			rewriteVarStatement(n);
		}
		if (
			ts.isVariableDeclarationList(n) &&
			(n.flags & ts.NodeFlags.BlockScoped) === 0 &&
			!ts.isVariableStatement(n.parent)
		) {
			if (ts.isForStatement(n.parent)) rewriteVarHead(n, 'for');
			else rewriteVarHead(n, 'of');
		}
		if (ts.isVariableDeclaration(n)) {
			if (ts.isIdentifier(n.name)) noteAssignment(n.name, n.initializer);
			const blockScoped =
				ts.isVariableDeclarationList(n.parent) && (n.parent.flags & ts.NodeFlags.BlockScoped) !== 0;
			const loopHead =
				ts.isVariableDeclarationList(n.parent) &&
				(ts.isForOfStatement(n.parent.parent) || ts.isForInStatement(n.parent.parent));
			if (blockScoped && !loopHead && !n.type && !isNewDate(n.initializer)) {
				insert(n.name.getEnd(), ': Json', 0);
			} else if (blockScoped && isNewDate(n.initializer) && ts.isIdentifier(n.name)) {
				const sym = checker.getSymbolAtLocation(n.name);
				if (sym) dateVars.add(sym);
			}
		}

		if (
			ts.isForOfStatement(n) ||
			(ts.isSpreadElement(n) && ts.isArrayLiteralExpression(n.parent))
		) {
			// JavaScript iterates arrays and the code points of strings, and throws for other values.
			const e = n.expression;
			helpers.add('iterOf');
			const o = seq;
			open(e.getStart(sf), 'iterOf(');
			closing(e.getEnd(), e.getEnd(), `, ${JSON.stringify(iterableText(e, sf))})`, o);
		}
		if (
			ts.isCatchClause(n) &&
			n.variableDeclaration &&
			ts.isIdentifier(n.variableDeclaration.name)
		) {
			// Errors of the runtime have other messages than V8's, and \`String(e)\` differs.
			const sym = checker.getSymbolAtLocation(n.variableDeclaration.name);
			let used = false;
			const find = (x: ts.Node): void => {
				if (used) return;
				if (
					(ts.isShorthandPropertyAssignment(x) &&
						checker.getShorthandAssignmentValueSymbol(x) === sym) ||
					(ts.isIdentifier(x) &&
						x !== n.variableDeclaration?.name &&
						checker.getSymbolAtLocation(x) === sym)
				) {
					used = true;
					return;
				}
				ts.forEachChild(x, find);
			};
			find(n.block);
			if (used && !plannedCatches.has(n))
				block(
					'catch reads the error',
					'The catch block reads the error, whose message can differ.',
				);
		}
		if (
			ts.isCallExpression(n) &&
			ts.isIdentifier(n.expression) &&
			n.expression.text === 'Date' &&
			isFree(n.expression)
		) {
			// `Date(…)` without `new` gives the text of the current time; it ignores its arguments.
			const plain = n.arguments.every(
				(x) => ts.isIdentifier(x) || ts.isLiteralExpression(x) || ts.isPropertyAccessExpression(x),
			);
			if (!plain) {
				block('Date()', '`Date(…)` with arguments that may have effects has no native form.');
				return;
			}
			nondeterministic = true;
			replaceNode(n, 'new Date().toString()');
			return;
		}
		if (
			ts.isCallExpression(n) &&
			ts.isPropertyAccessExpression(n.expression) &&
			n.expression.name.text === 'localeCompare' &&
			n.arguments.length >= 2 &&
			n.arguments.length <= 3
		) {
			// A locale whose CLDR collation is the root one, without options: the runtime's
			// collation (spec 4.4). Other locales and options do not compile and keep the host.
			const [first, loc, opts] = n.arguments;
			const name = constText(loc);
			const rootLocale =
				(ts.isIdentifier(loc) && loc.text === 'undefined') ||
				(name !== null && ROOT_COLLATION_LOCALES.has(name));
			const noOptions =
				opts === undefined || (ts.isObjectLiteralExpression(opts) && opts.properties.length === 0);
			if (rootLocale && noOptions) {
				replace(first.getEnd(), n.arguments[n.arguments.length - 1].getEnd(), '');
			} else {
				block(
					'localeCompare with a locale or options',
					'`localeCompare` with a tailored or computed locale, or with options, has no native form.',
				);
			}
		}
		if (
			ts.isCallExpression(n) &&
			ts.isPropertyAccessExpression(n.expression) &&
			n.expression.name.text === 'localeCompare' &&
			n.arguments.length > 3
		) {
			block('localeCompare with a locale or options', '`localeCompare` with extra arguments.');
		}
		if (
			ts.isElementAccessExpression(n) &&
			ts.isObjectLiteralExpression(stripParens(n.expression))
		) {
			// `({ … })[key]`: the subset types an object literal by its keys; a Json one takes any key.
			const lit = stripParens(n.expression);
			const o = seq;
			open(lit.getStart(sf), '(');
			closing(lit.getEnd(), lit.getEnd(), ' as Json)', o);
		}
		if (ts.isObjectLiteralExpression(n)) {
			// A key that comes again: JavaScript keeps the first position and the last value, as
			// Object.assign of the parts does. TypeScript rejects the literal.
			const seen = new Set<string>();
			const starts: ts.Node[] = [];
			for (const p of n.properties) {
				const name =
					(ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
					(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name))
						? ts.isNumericLiteral(p.name)
							? String(Number(p.name.text))
							: p.name.text
						: null;
				if (name === null) continue;
				if (seen.has(name)) {
					starts.push(p);
					seen.clear();
				}
				seen.add(name);
			}
			if (starts.length > 0) {
				helpers.add('assignInto');
				const o = seq;
				open(n.getStart(sf), 'assignInto([{}, ');
				for (const p of starts) open(p.getStart(sf), '}, {');
				closing(n.getEnd(), n.getEnd(), '])', o);
			}
		}
		if (
			(ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) &&
			ts.isIdentifier(n.name) &&
			n.name.text === 'binary'
		) {
			// The host adds sizes to binary data that code makes; native code does not.
			block('binary data', 'The code makes binary data.');
		}
		if (
			ts.isBinaryExpression(n) &&
			n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isPropertyAccessExpression(n.left) &&
			n.left.name.text === 'binary'
		) {
			block('binary data', 'The code makes binary data.');
		}
		if (ts.isForInStatement(n)) {
			// For plain JSON objects and arrays, `for...in` visits the keys of `Object.keys`.
			const o = seq++;
			closing(n.initializer.getEnd(), n.expression.getStart(sf), ' of Object.keys(', o);
			closing(n.expression.getEnd(), n.expression.getEnd(), ')', o);
		}

		if (ts.isBinaryExpression(n)) {
			const op = n.operatorToken.kind;
			if (op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) {
				const nullish = (e: ts.Expression) => {
					const s = stripParens(e);
					return (
						s.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(s) && s.text === 'undefined')
					);
				};
				if (!nullish(n.left) && !nullish(n.right)) {
					helpers.add('looseEq');
					const o = seq;
					open(n.getStart(sf), op === ts.SyntaxKind.EqualsEqualsToken ? 'looseEq(' : '!looseEq(');
					closing(n.left.getEnd(), n.right.getStart(sf), ', ', o);
					closing(n.getEnd(), n.getEnd(), ')', o);
				}
			}
			if (op === ts.SyntaxKind.InstanceOfKeyword)
				block('instanceof', '`instanceof` has no native form.');
			if (
				usesLuxon &&
				(op === ts.SyntaxKind.LessThanToken ||
					op === ts.SyntaxKind.LessThanEqualsToken ||
					op === ts.SyntaxKind.GreaterThanToken ||
					op === ts.SyntaxKind.GreaterThanEqualsToken ||
					op === ts.SyntaxKind.MinusToken ||
					op === ts.SyntaxKind.PlusToken)
			) {
				// JavaScript compares and adds a DateTime by its time value (valueOf).
				helpers.add('luxNum');
				for (const side of [n.left, n.right]) {
					const o = seq++;
					open(side.getStart(sf), 'luxNum(');
					closing(side.getEnd(), side.getEnd(), ')', o);
				}
			}
			if (ARITHMETIC.has(op)) {
				// JavaScript uses the time value of a Date in arithmetic.
				for (const side of [n.left, n.right]) {
					if (isDateValue(side)) closing(side.getEnd(), side.getEnd(), '.getTime()', seq++);
				}
			}
			if (op >= ts.SyntaxKind.FirstAssignment && op <= ts.SyntaxKind.LastAssignment) {
				const left = stripParens(n.left);
				if (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) {
					noteMutation(left.expression);
				} else if (op === ts.SyntaxKind.EqualsToken) {
					noteAssignment(left, n.right);
				} else {
					noteAssignment(left, undefined);
				}
			}
		}
		if (
			ts.isPrefixUnaryExpression(n) &&
			n.operator === ts.SyntaxKind.MinusToken &&
			isDateValue(n.operand)
		) {
			closing(n.operand.getEnd(), n.operand.getEnd(), '.getTime()', seq++);
		}
		if (
			(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
			(n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)
		) {
			const target = stripParens(n.operand);
			if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) {
				noteMutation(target.expression);
			}
		}
		if (ts.isDeleteExpression(n)) {
			const target = stripParens(n.expression);
			if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) {
				noteMutation(target.expression);
			}
		}

		if (ts.isCallExpression(n)) {
			const callee = stripParens(n.expression);
			if (ts.isPropertyAccessExpression(callee)) {
				const name = callee.name.text;
				if (MUTATING_METHODS.has(name)) noteMutation(callee.expression);
				if (DATE_READERS.has(name) && !isDateValue(callee.expression)) {
					const o = seq;
					open(callee.expression.getStart(sf), 'new Date(');
					closing(callee.expression.getEnd(), callee.expression.getEnd(), ')', o);
				}
				const alias = own(METHOD_ALIASES, name);
				if (alias) replaceNode(callee.name, alias);
				const methodHelper = own(METHOD_HELPERS, name);
				if (methodHelper && !isDateValue(callee.expression)) toHelper(n, callee, methodHelper);
				if (
					ts.isOptionalChain(callee) &&
					(name === 'splice' || name === 'push' || DATE_READERS.has(name))
				) {
					block('optional chain', 'A method rewrite inside an optional chain has no native form.');
				}
				if (name === 'push' && n.arguments.some((a) => ts.isSpreadElement(a))) {
					// \`a.push(...xs)\` becomes \`pushAll(a, [...xs])\`.
					helpers.add('pushAll');
					const o = seq;
					open(callee.expression.getStart(sf), 'pushAll(');
					closing(callee.expression.getEnd(), n.arguments[0].getStart(sf), ', [', o);
					closing(n.getEnd() - 1, n.getEnd(), '])', o);
				}
				if (
					name === 'toString' &&
					ts.isCallExpression(stripParens(callee.expression)) &&
					isBufferFrom(stripParens(callee.expression))
				) {
					// \`Buffer.from(v, a).toString(b)\` becomes \`bufferConvert(v, a, b)\`.
					const inner = stripParens(callee.expression);
					if (
						ts.isCallExpression(inner) &&
						inner.arguments.length >= 1 &&
						inner.arguments.length <= 2 &&
						n.arguments.length <= 1
					) {
						helpers.add('bufferConvert');
						const o = seq;
						const args = inner.arguments;
						replace(n.getStart(sf), args[0].getStart(sf), 'bufferConvert(');
						const tail = n.arguments.length === 1 ? n.arguments[0] : undefined;
						closing(
							args[args.length - 1].getEnd(),
							tail ? tail.getStart(sf) : n.getEnd(),
							(args.length === 1 ? ', undefined' : '') + (tail ? ', ' : ', undefined)'),
							o,
						);
						if (tail) closing(tail.getEnd(), n.getEnd(), ')', o);
						for (const a of args) visit(a);
						if (tail) visit(tail);
						return;
					}
				}
				if (name === 'splice') {
					// \`a.splice(s, c, x, y)\` becomes \`spliceOf(a, [s, c], [x, y])\`.
					helpers.add('spliceOf');
					const o = seq;
					const args = n.arguments;
					open(callee.expression.getStart(sf), 'spliceOf(');
					if (args.length === 0) closing(callee.expression.getEnd(), n.getEnd(), ', [], [])', o);
					else {
						closing(callee.expression.getEnd(), args[0].getStart(sf), ', [', o);
						if (args.length <= 2) closing(args[args.length - 1].getEnd(), n.getEnd(), '], [])', o);
						else {
							closing(args[1].getEnd(), args[2].getStart(sf), '], [', o);
							closing(args[args.length - 1].getEnd(), n.getEnd(), '])', o);
						}
					}
				}
				if (name === 'toString' && !isNewDate(callee.expression)) {
					toHelper(
						n,
						callee,
						n.arguments.length === 0 ? (usesLuxon ? 'luxToString' : 'toStringOf') : 'toStringRadix',
					);
				}
				if (luxMethod(n, callee, name)) return;
				if (localeMethod(n, callee, name)) return;
				if (hasIntl && (name === 'format' || name === 'formatToParts') && n.arguments.length <= 1) {
					toHelper(n, callee, 'intlFormat', name === 'formatToParts' ? ', true' : ', false');
					if (n.arguments.length === 0) {
						// \`f.format()\` formats now: the helper gets undefined.
					}
					for (const x of n.arguments) visit(x);
					visit(callee.expression);
					return;
				}
				if (collectionMethod(n, callee, name) || regexMethod(n, callee, name)) {
					for (const a of n.arguments) visit(a);
					visit(callee.expression);
					return;
				}
				if (name === 'then' || name === 'catch' || name === 'finally') {
					if (n.arguments.some((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a))) {
						block('Promise', 'Promise callbacks have no native form.');
					}
				}
				if (ts.isIdentifier(callee.expression) && isFree(callee.expression)) {
					const g = callee.expression.text;
					if (g === 'Object' && name === 'assign') {
						const first = n.arguments[0];
						if (first && !ts.isObjectLiteralExpression(stripParens(first))) {
							noteMutation(first);
						}
					}
					const full = `${g}.${name}`;
					const staticHelper = own(STATIC_HELPERS, full);
					if (staticHelper) {
						helpers.add(staticHelper);
						replace(callee.getStart(sf), callee.getEnd(), staticHelper);
					}
					const variadic = own(VARIADIC_HELPERS, full);
					const spread = n.arguments.some((a) => ts.isSpreadElement(a));
					const literalTarget =
						full === 'Object.assign' &&
						n.arguments[0] !== undefined &&
						ts.isObjectLiteralExpression(stripParens(n.arguments[0]));
					if (
						variadic &&
						(full === 'String.fromCharCode' ||
							(full.startsWith('Math.') && spread) ||
							(full === 'Object.assign' && (!literalTarget || spread)))
					) {
						helpers.add(variadic);
						const o = seq;
						replace(callee.getStart(sf), n.arguments.pos, `${variadic}([`);
						closing(n.getEnd() - 1, n.getEnd(), '])', o);
					}
					if (g === 'Array' && name === 'isArray') {
						// No narrowing: \`Array.isArray\` would narrow \`Json\` to \`unknown[]\`.
						const o = seq;
						open(n.getStart(sf), '(');
						closing(n.getEnd(), n.getEnd(), ' as boolean)', o);
					}
					if (
						usesCollections &&
						g === 'Object' &&
						(name === 'keys' || name === 'values' || name === 'entries')
					) {
						helpers.add('collKeysOf');
						const o = seq;
						replace(callee.getStart(sf), n.arguments.pos, 'collKeysOf(');
						const last = n.arguments[n.arguments.length - 1];
						if (last) closing(last.getEnd(), last.getEnd(), `, ${JSON.stringify(name)}`, o);
					} else if ((usesCollections || usesLuxon) && g === 'JSON' && name === 'stringify') {
						helpers.add('collJson');
						replace(callee.getStart(sf), callee.getEnd(), 'collJson');
					} else if (g === 'Object' && (name === 'values' || name === 'entries')) {
						const o = seq;
						open(n.getStart(sf), '(');
						closing(n.getEnd(), n.getEnd(), ' as Json[])', o);
					}
					if (g === 'Number' && (name === 'parseFloat' || name === 'parseInt')) {
						// The same functions as the globals.
						replace(callee.getStart(sf), callee.getEnd(), name);
					}
					if (g === 'Math' && name === 'random' && n.arguments.length === 0) {
						nondeterministic = true;
						replaceNode(n, 'ctx.random()');
						return;
					}
					if (g === 'Date' && name === 'now') nondeterministic = true;
					if (g === 'console') {
						// Logs go nowhere in a run. The arguments are still evaluated, as in JavaScript.
						if (!ts.isExpressionStatement(n.parent)) {
							block('console as a value', 'The code uses the value of a console call.');
							return;
						}
						const o = seq;
						replace(callee.getStart(sf), n.arguments.pos, 'Array.isArray([');
						closing(n.getEnd() - 1, n.getEnd(), '])', o);
						for (const a of n.arguments) visit(a);
						return;
					}
				}
			}
		}
		if (ts.isNewExpression(n) && isNewDate(n) && (n.arguments?.length ?? 0) === 0) {
			nondeterministic = true;
		}
		if (
			ts.isNewExpression(n) &&
			ts.isPropertyAccessExpression(n.expression) &&
			ts.isIdentifier(n.expression.expression) &&
			n.expression.expression.text === 'Intl' &&
			isFree(n.expression.expression)
		) {
			const kind = n.expression.name.text;
			const args = n.arguments ?? [];
			const a = localeArgs(args[0], args[1]);
			const entry =
				typeof a === 'string' || (kind !== 'DateTimeFormat' && kind !== 'NumberFormat')
					? undefined
					: tableEntry(kind, a);
			const spec = kind === 'DateTimeFormat' ? entry?.date : entry?.num;
			if (typeof a === 'string' || !spec || args.length > 2) {
				block(`Intl.${kind}`, `\`Intl.${kind}\` with these arguments is not in the locale table.`);
				return;
			}
			if (a.zone) zones.add(a.zone);
			helpers.add('intlOf');
			const zone = a.zone === null ? 'null' : JSON.stringify(a.zone);
			replaceNode(
				n,
				`intlOf(${JSON.stringify(kind === 'DateTimeFormat' ? 'date' : 'number')}, ${specCode(spec)}, ${zone})`,
			);
			return;
		}
		if (isCollectionNew(n)) {
			helpers.add('collNew');
			const kind = JSON.stringify(n.expression.getText(sf));
			const args = n.arguments ?? [];
			if (args.length === 0) replaceNode(n, `collNew(${kind}, undefined)`);
			else {
				const o = seq;
				replace(n.getStart(sf), args[0].getStart(sf), `collNew(${kind}, `);
				closing(args[args.length - 1].getEnd(), n.getEnd(), ')', o);
				for (const a of args) visit(a);
			}
			return;
		}
		if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'RegExp') {
			const [pattern, flags] = n.arguments ?? [];
			const literal = (e: ts.Expression | undefined) =>
				e !== undefined && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e));
			if (literal(pattern) && (flags === undefined || literal(flags))) {
				const text = (e: ts.Expression | undefined) =>
					e !== undefined && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))
						? e.text
						: '';
				regexValue(n, text(pattern), text(flags));
			} else if (pattern !== undefined && (n.arguments?.length ?? 0) <= 2) {
				// The pattern is checked when it runs: the engine throws for a form it does not have.
				helpers.add('regexNew');
				const o = seq;
				replace(n.getStart(sf), pattern.getStart(sf), 'regexNew(');
				const last = flags ?? pattern;
				closing(last.getEnd(), n.getEnd(), flags ? ')' : ', undefined)', o);
				visit(pattern);
				if (flags) visit(flags);
			} else {
				block(
					'RegExp with a computed pattern',
					'`new RegExp` without a pattern has no native form.',
				);
			}
			return;
		}
		if (
			usesLuxon &&
			ts.isPropertyAccessExpression(n) &&
			LUX_GETTERS.has(n.name.text) &&
			!isAssignmentTarget(n) &&
			!(ts.isCallExpression(n.parent) && n.parent.expression === n)
		) {
			if (n.questionDotToken || ts.isOptionalChain(n)) {
				block('optional chain', 'A property rewrite inside an optional chain has no native form.');
				return;
			}
			helpers.add('luxGet');
			const o = seq;
			open(n.expression.getStart(sf), 'luxGet(');
			closing(n.expression.getEnd(), n.getEnd(), `, ${JSON.stringify(n.name.text)})`, o);
			visit(n.expression);
			return;
		}
		if (usesLuxon && ts.isTemplateSpan(n)) {
			// A template prints a DateTime with toString.
			helpers.add('luxText');
			const o = seq++;
			open(n.expression.getStart(sf), 'luxText(');
			closing(n.expression.getEnd(), n.expression.getEnd(), ')', o);
		}
		if (
			usesLuxon &&
			ts.isNewExpression(n) &&
			isNewDate(n) &&
			n.arguments !== undefined &&
			n.arguments.length === 1
		) {
			// A new Date of a DateTime reads its time value.
			helpers.add('luxNum');
			const a = n.arguments[0];
			const o = seq++;
			open(a.getStart(sf), 'luxNum(');
			closing(a.getEnd(), a.getEnd(), ')', o);
		}
		if (hasRegex && ts.isPropertyAccessExpression(n) && n.name.text === 'indices') {
			block('match properties (indices)', '`.indices` of a match has no native form.');
		}
		if (
			usesMatchProps &&
			ts.isPropertyAccessExpression(n) &&
			['index', 'input', 'groups'].includes(n.name.text) &&
			!isAssignmentTarget(n)
		) {
			// A match of the runtime is a plain array: the registry keeps its index, input and groups.
			if (n.questionDotToken || ts.isOptionalChain(n)) {
				block('optional chain', 'A property rewrite inside an optional chain has no native form.');
				return;
			}
			helpers.add('matchProp');
			const o = seq;
			open(n.expression.getStart(sf), 'matchProp(');
			closing(
				n.expression.getEnd(),
				n.getEnd(),
				`, ${JSON.stringify(n.name.text)}, ${MATCHES})`,
				o,
			);
			visit(n.expression);
			return;
		}

		if (ts.isIdentifier(n) && !isNameOf(n) && isFree(n)) {
			if (!visitGlobal(n)) return;
		}
		ts.forEachChild(n, visit);
	};

	/** Handles a free identifier. False stops the walk below it. */
	const visitGlobal = (n: ts.Identifier): boolean => {
		const name = n.text;
		const parent = n.parent;
		switch (name) {
			case '$input':
				itemChain(n, ITEMS, true);
				return false;
			case 'items':
				if (input.kind === 'functionItem') break;
				replaceNode(n, ITEMS);
				return false;
			case 'item':
				if (input.mode !== 'each') break;
				replaceNode(n, input.kind === 'functionItem' ? `${ITEM}.json` : ITEM);
				return false;
			case '$json':
			case '$data':
				if (input.mode === 'each') replaceNode(n, `${ITEM}.json`);
				else {
					usesFirstJson = true;
					replaceNode(n, FIRST_JSON);
				}
				return false;
			case '$itemIndex':
				if (input.mode !== 'each') break;
				replaceNode(n, INDEX);
				return false;
			case '$': {
				if (!ts.isCallExpression(parent) || parent.expression !== n) {
					block('$ as a value', '`$` is used without a call.');
					return false;
				}
				const nodeName = stringArgument(parent);
				if (nodeName === null) {
					computedNode(parent);
					return false;
				}
				itemChain(parent, nodeList(nodeName), false);
				return false;
			}
			case '$node': {
				const access = parent;
				const nodeName =
					ts.isElementAccessExpression(access) && access.expression === n
						? ts.isStringLiteral(access.argumentExpression)
							? access.argumentExpression.text
							: null
						: ts.isPropertyAccessExpression(access) && access.expression === n
							? access.name.text
							: null;
				if (nodeName === null) {
					block(
						'$node with a computed name',
						'`$node[…]` with a computed name has no native form.',
					);
					return false;
				}
				const member = access.parent;
				if (
					!ts.isPropertyAccessExpression(member) ||
					member.expression !== access ||
					member.name.text !== 'json'
				) {
					block('$node[…] other than .json', 'Only `$node[…].json` has a native form.');
					return false;
				}
				const list = nodeList(nodeName);
				if (list !== null) replace(n.getStart(sf), member.getEnd(), `${list}[0]?.json`);
				return false;
			}
			case '$item': {
				// `$item(k).$node["Node"].json`: item k of the node, as v1's data proxy gives it.
				const call = parent;
				const nodeAccess = call.parent;
				const named = nodeAccess?.parent;
				const member = named?.parent;
				const nameOf = (x: ts.Node | undefined): string | null =>
					x && ts.isElementAccessExpression(x) && x.expression === nodeAccess
						? ts.isStringLiteral(x.argumentExpression)
							? x.argumentExpression.text
							: null
						: x && ts.isPropertyAccessExpression(x) && x.expression === nodeAccess
							? x.name.text
							: null;
				const nodeName = nameOf(named);
				if (
					!ts.isCallExpression(call) ||
					call.expression !== n ||
					call.arguments.length !== 1 ||
					ts.isSpreadElement(call.arguments[0]) ||
					!ts.isPropertyAccessExpression(nodeAccess) ||
					nodeAccess.name.text !== '$node' ||
					nodeName === null ||
					!member ||
					!ts.isPropertyAccessExpression(member) ||
					member.expression !== named ||
					(member.name.text !== 'json' && member.name.text !== 'data')
				) {
					block('$item', 'Only `$item(k).$node["Node"].json` has a native form.');
					return false;
				}
				const list = nodeList(nodeName);
				if (list === null) return false;
				helpers.add('itemOfNode');
				const arg = call.arguments[0];
				const o = seq;
				replace(n.getStart(sf), arg.getStart(sf), `itemOfNode(${list}, `);
				closing(arg.getEnd(), member.getEnd(), `, ${JSON.stringify(nodeName)})`, o);
				return false;
			}
			case '$items': {
				if (!ts.isCallExpression(parent) || parent.expression !== n) {
					block('$items', '`$items` has no native form.');
					return false;
				}
				const nodeName = stringArgument(parent);
				if (nodeName === null) {
					block('$items() without a node name', '`$items()` has no native form.');
					return false;
				}
				const list = nodeList(nodeName);
				if (list !== null) replaceNode(parent, list);
				return false;
			}
			case 'console':
				block('console as a value', '`console` is used other than in a call.');
				return false;
			case '$execution': {
				const m = ts.isPropertyAccessExpression(parent) ? parent.name.text : '';
				if (['id', 'mode', 'resumeUrl', 'resumeFormUrl'].includes(m)) {
					replace(n.getStart(sf), parent.getEnd(), `ctx.execution().${m}`);
				} else block('$execution', `\`$execution.${m}\` has no native form.`);
				return false;
			}
			case '$now':
			case '$today':
				helpers.add('luxOf');
				nondeterministic = true;
				if (name === '$now') replaceNode(n, `luxOf(Date.now(), ${dz})`);
				else {
					helpers.add('luxStartOf');
					replaceNode(n, `luxStartOf(luxOf(Date.now(), ${dz}), 'day')`);
				}
				return false;
			case 'DateTime': {
				const p2 = parent.parent;
				if (
					ts.isPropertyAccessExpression(parent) &&
					parent.expression === n &&
					ts.isCallExpression(p2) &&
					p2.expression === parent &&
					luxStatic(p2, parent.name.text)
				) {
					return false;
				}
				block(
					'Luxon DateTime',
					'`DateTime` other than now, fromISO, fromMillis, fromSeconds, fromJSDate, fromObject and utc has no native form.',
				);
				return false;
			}
			case '$vars':
				// The variables of the instance, captured when the execution starts (spec 9.5).
				replaceNode(n, 'ctx.vars()');
				return false;
			case '$runIndex':
				if (input.runIndex === undefined) break;
				replaceNode(n, `(${input.runIndex})`);
				return false;
			case '$workflow': {
				const m = ts.isPropertyAccessExpression(parent) ? parent.name.text : '';
				const wf = input.workflow;
				if (wf && (m === 'id' || m === 'name')) {
					replace(n.getStart(sf), parent.getEnd(), JSON.stringify(m === 'id' ? wf.id : wf.name));
				} else if (m === 'active') {
					replace(n.getStart(sf), parent.getEnd(), 'true');
				} else block('$workflow', `\`$workflow.${m}\` has no native form.`);
				return false;
			}
			default:
				break;
		}
		if (
			(name === 'isNaN' || name === 'isFinite') &&
			ts.isCallExpression(parent) &&
			parent.expression === n &&
			parent.arguments.length === 1 &&
			isDateValue(parent.arguments[0])
		) {
			// JavaScript reads the time value of a Date here.
			const arg = parent.arguments[0];
			closing(arg.getEnd(), arg.getEnd(), '.getTime()', seq++);
		}
		const fnHelper = own(FUNCTION_HELPERS, name);
		if (fnHelper) {
			if (!ts.isCallExpression(parent) || parent.expression !== n) {
				block(`${name} as a value`, `\`${name}\` is used other than in a call.`);
				return false;
			}
			if (name === '$getWorkflowStaticData') {
				// The runtime's working copy of the workflow static data (spec 9.7): all
				// nodes of the execution share it, as in v1.
				const args = parent.arguments;
				if (args.length !== 1 || ts.isSpreadElement(args[0])) {
					block('$getWorkflowStaticData', '`$getWorkflowStaticData` needs one argument.');
					return false;
				}
				const o = seq;
				replace(n.getStart(sf), args[0].getStart(sf), 'ctx.staticData(');
				closing(
					args[0].getEnd(),
					parent.getEnd(),
					`, ${JSON.stringify(input.nodeName ?? 'Code')})`,
					o,
				);
				return false;
			}
			helpers.add(fnHelper);
			replaceNode(n, fnHelper);
			return true;
		}
		const fnValue = own(FUNCTION_VALUES, name);
		const called = ts.isCallExpression(parent) && parent.expression === n;
		const member = ts.isPropertyAccessExpression(parent) && parent.expression === n;
		if (fnValue && !called && !member) {
			replaceNode(n, fnValue);
			return false;
		}
		const host = own(HOST_GLOBALS, name);
		if (host) {
			block(host, `\`${name}\` has no native form.`);
			return false;
		}
		if (!SUBSET_GLOBALS.has(name)) {
			block(
				name.startsWith('$') ? name : `global ${name}`,
				`\`${name}\` is not defined for native code.`,
			);
			return false;
		}
		return true;
	};

	if (root.body) for (const st of root.body.statements) visit(st);

	// The rewrites call helpers by name, so the code must not declare a name of its own like them.
	const declared = new Set<string>();
	const collect = (x: ts.Node): void => {
		if (
			(ts.isVariableDeclaration(x) ||
				ts.isFunctionDeclaration(x) ||
				ts.isParameter(x) ||
				ts.isBindingElement(x)) &&
			x.name !== undefined &&
			ts.isIdentifier(x.name)
		) {
			declared.add(x.name.text);
		}
		ts.forEachChild(x, collect);
	};
	collect(root.body);
	for (const h of helpers) {
		if (declared.has(h))
			block('name of a helper', `The code declares \`${h}\`, a name of a native helper.`);
	}

	if (maxGroups > 9 && /\.replace(All)?\s*\(/.test(input.code)) {
		block(
			'regular expression with more than 9 groups',
			'A replace callback gets at most 9 groups.',
		);
	}

	// Code that can change an input object needs copies of the inputs.
	for (const t of mutationTargets) {
		const target = stripParens(t);
		if (ts.isIdentifier(target)) {
			const sym = checker.getSymbolAtLocation(target);
			if (sym && freshVars.has(sym) && !notFresh.has(sym)) continue;
		}
		mutates = true;
		break;
	}

	// Hoisted `var` names: one `let` at the top of each function body.
	for (const [fn, names] of hoisted) {
		const body = fn === root ? root.body : isFunctionNode(fn) ? fn.body : undefined;
		if (!body) continue;
		const decl = `let ${[...names].map((x) => `${x}: Json`).join(', ')};`;
		if (fn === root) insert(WRAP_PREFIX.length, `${decl}\n`, -1000000);
		else if (ts.isBlock(body)) insert(body.getStart(sf) + 1, `\n${decl}`, -1000000);
		else {
			block('var in an arrow body', '`var` in an arrow function without a body block.');
		}
	}

	edits.sort((a, b) => a.start - b.start || a.order - b.order);
	let out = '';
	let at = 0;
	for (const e of edits) {
		if (e.start < at) {
			if (process.env.WF_DEBUG_OVERLAP) {
				process.stderr.write(
					`OVERLAP at ${e.start} (prev end ${at}): ${JSON.stringify(text.slice(Math.max(0, e.start - 60), e.start + 40))} -> ${JSON.stringify(e.text)}\n`,
				);
			}
			return {
				ok: false,
				blockers: [{ feature: 'translation overlap', message: 'Two rewrites overlap.' }],
			};
		}
		out += text.slice(at, e.start) + e.text;
		at = e.end;
	}
	out += text.slice(at);
	// No edit touches the wrapper text, so the body is between the prefix and the suffix.
	const body = out.slice(WRAP_PREFIX.length, out.length - WRAP_SUFFIX.length);
	// The edits must give valid code: a syntax error would break the whole workflow file.
	const check = ts.createSourceFile(
		'/native.ts',
		`(async (): Promise<Json> => {\n${body}\n})`,
		ts.ScriptTarget.ES2022,
		false,
		ts.ScriptKind.TS,
	);
	// `parseDiagnostics` is internal to the TypeScript API; a full program would cost more.
	const parseErrors: unknown = Reflect.get(check, 'parseDiagnostics');
	if (Array.isArray(parseErrors) && parseErrors.length > 0) {
		block('translation syntax', 'The native form does not parse.');
	}
	const translation = {
		body,
		nodes,
		helpers,
		mutates,
		usesFirstJson,
		nondeterministic,
		usesCollections: usesCollections || usesLuxon,
		zones,
		usesAllNodes,
		allNodes: usesAllNodes ? (input.allNodes ?? []) : [],
		usesMatchProps,
	};
	if (blockers.length > 0) return { ok: false, blockers, partial: translation };
	return { ok: true, translation };
}
