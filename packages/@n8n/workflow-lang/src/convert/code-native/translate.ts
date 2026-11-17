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
import { LOCALE_NAMES } from './locale-data.generated.ts';
import { planBody, planCatch } from './catch-check.ts';
import { localeEntry } from './locale-entry.ts';
import { formatSupported as luxonFormatSupported } from './luxon-expression.ts';
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
	/**
	 * The code is node code from the node compiler (`src/node-compile/`), not the code of a
	 * Code node: `async` and `await` stay, because the code makes requests; `globals` are
	 * names that the module defines; a catch block can read the error.
	 */
	nodeCode?: { globals: Set<string> };
	/**
	 * The code is one parameter expression that the converter translated already
	 * (`../native-expression.ts`): `globals` are the variables of the generated source that it
	 * reads. They stay as they are.
	 */
	expression?: { globals: Set<string> };
	/** The name of the node, for static data of type `node`. */
	nodeName?: string;
	/**
	 * The traced form of the code: the same code with the line of each place where an error
	 * can come from, as V8 gives it in the stack of the error (`traceLines`). The node runs it
	 * after the code failed, to make v1's message with ` [line N]`; code that cannot run twice
	 * (requests, random numbers, static data) runs only in this form.
	 */
	traced?: boolean;
	/**
	 * For `$items()` without a node name, which gives the input items: true when the node
	 * before this one has "execute once" (v1 then gives the first item only). Undefined when
	 * the node before this one is not fixed: then `$items()` has no native form.
	 */
	itemsOfFirstOnly?: boolean;
	/**
	 * The built-in modules that the deployment lets code load with \`require\`
	 * (\`ConvertOptions.codeModules\`); \`*\` is every module. The default is none, as in n8n.
	 */
	allowedModules?: string[];
	/**
	 * True when each item holds the bytes of its binary data as base64 text (`data`), and no
	 * item names a stored file (`id`). Only then `this.helpers.getBinaryDataBuffer` has a
	 * native form: the bytes of a stored file need a call of the runtime that reads them.
	 */
	inlineBinary?: boolean;
	/** Parameters and results of functions keep the type `Json` (see `Translation.typedDates`). */
	plainDates?: boolean;
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
	/**
	 * True when the code provably changes no object that it gets (\`provesReadOnly\`): then it
	 * can read an input list that is plain JSON without a copy.
	 */
	readOnly: boolean;
	/** The code reads `$json` of the first item (all-items mode). */
	usesFirstJson: boolean;
	/**
	 * The code makes HTTP requests (`this.helpers.httpRequest`): `async` and `await` stay, and
	 * `emit` gives the code the function `__wf_http`, which runs the `http` effect.
	 */
	usesHttp: boolean;
	/** The code reads the clock or the random generator. */
	nondeterministic: boolean;
	/**
	 * The code can run a second time with the same result: no request, no random number and no
	 * static data. Then the node runs the plain form, and the traced form only after a failure.
	 */
	repeatable: boolean;
	/**
	 * Why the text of an error of the code can differ from V8's text, or null when every
	 * operation that can fail gives V8's text (the rules of `catch-check.ts` for the whole code).
	 */
	errorTextGap: string | null;
	/** The code makes a Set or a Map (`collNew`). */
	usesCollections: boolean;
	/** IANA time zones that the code formats dates in (META `zones`). */
	zones: Set<string>;
	/** The code reads a node by a computed name: it gets every node that ran before. */
	usesAllNodes: boolean;
	allNodes: string[];
	/** The code reads `.index`, `.input` or `.groups` of matches (registry `__wf_matches`). */
	usesMatchProps: boolean;
	/**
	 * A parameter or a result of a function of the code has the type Date, because each call
	 * gives a Date. When this form does not compile, the caller translates again with
	 * `plainDates`.
	 */
	typedDates: boolean;
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
export const HTTP = `${P}http`;
/** The line of the current place in a function with a name, in the traced form. */
export const LINE = `${P}l`;
const MARK = `${P}m`;
const SET = `${P}s`;

/** Options of `this.helpers.httpRequest` that the native form sends as v1 does. */
const HTTP_OPTIONS = new Set([
	'method',
	'url',
	'headers',
	'body',
	'json',
	'qs',
	'timeout',
	'ignoreHttpStatusErrors',
	'returnFullResponse',
]);

/** `this.helpers.httpRequest`. */
function isHttpHelper(e: ts.Expression): boolean {
	return (
		ts.isPropertyAccessExpression(e) &&
		e.name.text === 'httpRequest' &&
		!e.questionDotToken &&
		ts.isPropertyAccessExpression(e.expression) &&
		e.expression.name.text === 'helpers' &&
		!e.expression.questionDotToken &&
		e.expression.expression.kind === ts.SyntaxKind.ThisKeyword
	);
}

/**
 * The options of `await this.helpers.httpRequest({ … })` when the request has a native form,
 * a reason when it has none, and null when the expression is not such a call.
 *
 * The options are an object literal with known names, so every option that the native form
 * does not send (a proxy, a response as bytes) keeps the node in the host. `method`,
 * `ignoreHttpStatusErrors` and `returnFullResponse` are literals: they decide the form of
 * the request and of the result. `isRequest` tells if a callee is the request helper.
 */
export function httpRequestOptions(
	n: ts.AwaitExpression,
	isRequest: (callee: ts.Expression) => boolean = isHttpHelper,
	constantOf: (id: ts.Identifier) => ts.Expression | null = () => null,
): ts.ObjectLiteralExpression | string | null {
	const call = stripParens(n.expression);
	if (!ts.isCallExpression(call) || !isRequest(stripParens(call.expression))) return null;
	let options = call.arguments.length === 1 ? stripParens(call.arguments[0]) : undefined;
	// The options in a constant that the code uses only for requests.
	if (options !== undefined && ts.isIdentifier(options)) {
		options = constantOf(options) ?? options;
	}
	if (options === undefined || !ts.isObjectLiteralExpression(options)) {
		return 'options that are not an object literal';
	}
	for (const p of options.properties) {
		if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) {
			return 'options with a spread or a method';
		}
		if (!ts.isIdentifier(p.name) && !ts.isStringLiteral(p.name)) return 'a computed option name';
		const name = p.name.text;
		if (!HTTP_OPTIONS.has(name)) return `the option \`${name}\``;
		const value = ts.isPropertyAssignment(p) ? stripParens(p.initializer) : undefined;
		if (
			name === 'method' &&
			!(
				value !== undefined &&
				(ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
			)
		) {
			return 'a computed method';
		}
		if (
			(name === 'ignoreHttpStatusErrors' || name === 'returnFullResponse') &&
			value?.kind !== ts.SyntaxKind.TrueKeyword &&
			value?.kind !== ts.SyntaxKind.FalseKeyword
		) {
			return `\`${name}\` that is not true or false`;
		}
	}
	return options;
}

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

/** The names that an object inherits from `Object.prototype`. */
const OBJECT_PROTOTYPE_NAMES: ReadonlySet<string> = new Set(
	Object.getOwnPropertyNames(Object.prototype),
);

/**
 * The helper for an own-property test. A key that is a literal and not a name of
 * `Object.prototype` needs no test for an inherited name.
 */
function ownHelperFor(key: ts.Expression | undefined): string {
	return key !== undefined && ts.isStringLiteralLike(key) && !OBJECT_PROTOTYPE_NAMES.has(key.text)
		? 'hasOwnNamedOf'
		: 'hasOwnOf';
}

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

/** Options of \`toLocaleString\` that only the format of a date reads. */
const DATE_FORMAT_OPTIONS = new Set([
	'dateStyle',
	'timeStyle',
	'weekday',
	'era',
	'year',
	'month',
	'day',
	'dayPeriod',
	'hour',
	'minute',
	'second',
	'fractionalSecondDigits',
	'hour12',
	'hourCycle',
	'timeZoneName',
	'calendar',
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

/** `new Date(…)`, or a choice between two such values: the variable that holds it is a Date. */
function isDateInit(e: ts.Expression | undefined): boolean {
	if (!e) return false;
	const x = stripParens(e);
	return (
		isNewDate(x) ||
		(ts.isConditionalExpression(x) && isDateInit(x.whenTrue) && isDateInit(x.whenFalse))
	);
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

/** The functions of the crypto module with a native form. */
type CryptoFunction = 'createHash' | 'createHmac' | 'timingSafeEqual';

function isCryptoFunction(name: string): name is CryptoFunction {
	return name === 'createHash' || name === 'createHmac' || name === 'timingSafeEqual';
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

/** Methods that change their receiver: the ones of lists, and the ones of a Set or a Map. */
const RECEIVER_CHANGERS = new Set([...MUTATING_METHODS, 'add', 'set', 'delete', 'clear']);

/** List methods that give a new list. */
const NEW_LIST_METHODS = new Set(['map', 'filter', 'slice', 'concat', 'flatMap', 'flat']);

/** List methods that take a `this` value after the callback. */
const THIS_ARG_METHODS = new Set([
	'forEach',
	'map',
	'filter',
	'some',
	'every',
	'find',
	'findIndex',
	'findLast',
	'findLastIndex',
	'flatMap',
]);

/** Functions of `Object` that change nothing. */
const OBJECT_READERS = new Set(['keys', 'values', 'entries', 'fromEntries', 'hasOwn', 'is']);

/**
 * True when the code provably changes no object that it gets: not an input item, not a
 * part of one, not an item of another node.
 *
 * Every change in JavaScript is an assignment to a property, a `delete`, or a call of a
 * built-in that changes its receiver or its first argument. The proof allows these only on
 * a local variable that only ever holds a list or an object that the code made itself
 * (a literal, `Object.keys(…)`, `list.map(…)` of a list, …) or the list of the input items
 * (`items`, `$input.all()`), which is a list of the node's own wrappers. A change of
 * anything else, a way to call a built-in indirectly (`call`, `apply`, `bind`, a computed
 * method name, a `this` argument) and `this` itself give "not proven". The proof errs to
 * "not proven": then the code gets copies.
 */
function provesReadOnly(root: ts.Node, checker: ts.TypeChecker, mode: CodeMode): boolean {
	const free = (id: ts.Identifier): boolean => {
		const sym = checker.getSymbolAtLocation(id);
		return sym === undefined || (sym.declarations ?? []).length === 0;
	};
	const freeNamed = (e: ts.Expression, name: string): boolean =>
		ts.isIdentifier(e) && e.text === name && free(e);
	/** `G.m(…)` of a free global `G`: the name `m`, or null. */
	const staticCall = (x: ts.Expression, global: string): string | null =>
		ts.isCallExpression(x) &&
		ts.isPropertyAccessExpression(x.expression) &&
		freeNamed(x.expression.expression, global)
			? x.expression.name.text
			: null;
	/** `$input.all()`: the list of the node's own wrappers of the input items. */
	const isInputAll = (x: ts.Expression): boolean =>
		ts.isCallExpression(x) &&
		x.arguments.length === 0 &&
		ts.isPropertyAccessExpression(x.expression) &&
		x.expression.name.text === 'all' &&
		freeNamed(x.expression.expression, '$input');
	/** `items` in "all items" mode: the same list as `$input.all()`. */
	const isItems = (x: ts.Expression): boolean => mode === 'all' && freeNamed(x, 'items');
	/** A list that the code made itself. */
	const newList = (e: ts.Expression): boolean => {
		const x = stripParens(e);
		if (ts.isArrayLiteralExpression(x)) return true;
		if ((ts.isCallExpression(x) || ts.isNewExpression(x)) && freeNamed(x.expression, 'Array')) {
			return true;
		}
		const ofArray = staticCall(x, 'Array');
		if (ofArray === 'from' || ofArray === 'of') return true;
		const ofObject = staticCall(x, 'Object');
		if (ofObject === 'keys' || ofObject === 'values' || ofObject === 'entries') return true;
		return (
			ts.isCallExpression(x) &&
			ts.isPropertyAccessExpression(x.expression) &&
			!ts.isOptionalChain(x) &&
			NEW_LIST_METHODS.has(x.expression.name.text) &&
			listValue(x.expression.expression)
		);
	};
	/** A value that is a list for certain. */
	const listValue = (e: ts.Expression): boolean => {
		const x = stripParens(e);
		if (newList(x) || isInputAll(x) || isItems(x)) return true;
		// `$('Node').all()`.
		return (
			ts.isCallExpression(x) &&
			x.arguments.length === 0 &&
			ts.isPropertyAccessExpression(x.expression) &&
			x.expression.name.text === 'all' &&
			ts.isCallExpression(x.expression.expression) &&
			freeNamed(x.expression.expression.expression, '$')
		);
	};
	/** A list or an object whose own places the code can change without a change of an input. */
	const own = (e: ts.Expression): boolean => {
		const x = stripParens(e);
		if (newList(x) || isInputAll(x) || ts.isObjectLiteralExpression(x)) return true;
		if (staticCall(x, 'Object') === 'fromEntries' || staticCall(x, 'JSON') === 'parse') return true;
		if (
			ts.isNewExpression(x) &&
			(freeNamed(x.expression, 'Map') || freeNamed(x.expression, 'Set'))
		) {
			return true;
		}
		return ts.isConditionalExpression(x) && own(x.whenTrue) && own(x.whenFalse);
	};

	const ownVars = new Set<ts.Symbol>();
	const otherVars = new Set<ts.Symbol>();
	const holds = (name: ts.Identifier, value: ts.Expression | undefined) => {
		const sym = checker.getSymbolAtLocation(name);
		if (sym === undefined) return;
		if (value !== undefined && own(value)) ownVars.add(sym);
		else otherVars.add(sym);
	};
	const changed: ts.Expression[] = [];
	let proven = true;
	/** The value whose property an assignment, an update or a `delete` changes. */
	const changes = (target: ts.Expression): void => {
		const x = stripParens(target);
		if (ts.isIdentifier(x)) return;
		if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) {
			changed.push(x.expression);
		} else {
			proven = false;
		}
	};
	const visit = (n: ts.Node): void => {
		if (!proven) return;
		if (
			n.kind === ts.SyntaxKind.ThisKeyword ||
			ts.isClassLike(n) ||
			ts.isGetAccessor(n) ||
			ts.isSetAccessor(n) ||
			ts.isTaggedTemplateExpression(n)
		) {
			proven = false;
			return;
		}
		if (ts.isVariableDeclaration(n)) {
			if (ts.isIdentifier(n.name)) holds(n.name, n.initializer);
		} else if (ts.isBinaryExpression(n)) {
			const op = n.operatorToken.kind;
			if (op >= ts.SyntaxKind.FirstAssignment && op <= ts.SyntaxKind.LastAssignment) {
				const left = stripParens(n.left);
				if (ts.isIdentifier(left)) {
					holds(left, op === ts.SyntaxKind.EqualsToken ? n.right : undefined);
				} else changes(left);
			}
		} else if (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) {
			if (
				n.operator === ts.SyntaxKind.PlusPlusToken ||
				n.operator === ts.SyntaxKind.MinusMinusToken
			) {
				changes(n.operand);
			}
		} else if (ts.isDeleteExpression(n)) {
			changes(n.expression);
		} else if (ts.isForInStatement(n) || ts.isForOfStatement(n)) {
			if (!ts.isVariableDeclarationList(n.initializer)) changes(n.initializer);
		} else if (ts.isCallExpression(n)) {
			const callee = stripParens(n.expression);
			if (ts.isElementAccessExpression(callee)) {
				proven = false;
				return;
			}
			if (ts.isPropertyAccessExpression(callee)) {
				const name = callee.name.text;
				if (name === 'call' || name === 'apply' || name === 'bind') {
					const inner = stripParens(callee.expression);
					const proto =
						ts.isPropertyAccessExpression(inner) && inner.name.text === 'hasOwnProperty'
							? stripParens(inner.expression)
							: undefined;
					const hasOwn =
						name === 'call' &&
						proto !== undefined &&
						ts.isPropertyAccessExpression(proto) &&
						proto.name.text === 'prototype' &&
						freeNamed(proto.expression, 'Object');
					if (!hasOwn) proven = false;
				}
				if (RECEIVER_CHANGERS.has(name)) changed.push(callee.expression);
				if (THIS_ARG_METHODS.has(name) && n.arguments.length > 1) proven = false;
				if (freeNamed(callee.expression, 'Array') && name === 'from' && n.arguments.length > 2) {
					proven = false;
				}
				if (freeNamed(callee.expression, 'Object') && !OBJECT_READERS.has(name)) {
					const first = n.arguments[0];
					if (name === 'assign' && first !== undefined && !ts.isSpreadElement(first)) {
						if (!ts.isObjectLiteralExpression(stripParens(first))) changed.push(first);
					} else proven = false;
				}
			}
		} else if (
			ts.isPropertyAccessExpression(n) &&
			RECEIVER_CHANGERS.has(n.name.text) &&
			!(ts.isCallExpression(n.parent) && n.parent.expression === n)
		) {
			// A method that changes its receiver, as a value.
			proven = false;
			return;
		} else if (ts.isIdentifier(n) && (n.text === 'Object' || n.text === 'Reflect') && free(n)) {
			const parent = n.parent;
			const isName =
				(ts.isPropertyAccessExpression(parent) || ts.isPropertyAssignment(parent)) &&
				parent.name === n;
			const isStatic =
				n.text === 'Object' &&
				ts.isPropertyAccessExpression(parent) &&
				parent.expression === n &&
				ts.isCallExpression(parent.parent) &&
				parent.parent.expression === parent;
			// `Object.prototype.hasOwnProperty`, which only reads.
			const isHasOwn =
				n.text === 'Object' &&
				ts.isPropertyAccessExpression(parent) &&
				parent.expression === n &&
				parent.name.text === 'prototype' &&
				ts.isPropertyAccessExpression(parent.parent) &&
				parent.parent.expression === parent &&
				parent.parent.name.text === 'hasOwnProperty';
			if (!isName && !isStatic && !isHasOwn) {
				proven = false;
				return;
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(root);
	if (!proven) return false;
	for (const target of changed) {
		const x = stripParens(target);
		if (isItems(x) || own(x)) continue;
		if (!ts.isIdentifier(x)) return false;
		const sym = checker.getSymbolAtLocation(x);
		if (sym === undefined || !ownVars.has(sym) || otherVars.has(sym)) return false;
	}
	return true;
}

/** True when the code names the input items both as \`items\` or \`item\` and through \`$input\`, \`$json\` or \`$items()\`. */
function usesBothItemViews(root: ts.Node, checker: ts.TypeChecker): boolean {
	let direct = false;
	let proxy = false;
	const visit = (x: ts.Node): void => {
		if (ts.isIdentifier(x) && !isNameOf(x)) {
			const sym = checker.getSymbolAtLocation(x);
			const free = sym === undefined || (sym.declarations ?? []).length === 0;
			if (free && (x.text === 'items' || x.text === 'item')) direct = true;
			if (free && (x.text === '$input' || x.text === '$json' || x.text === '$binary')) proxy = true;
			if (
				free &&
				x.text === '$items' &&
				ts.isCallExpression(x.parent) &&
				x.parent.arguments.length === 0
			) {
				proxy = true;
			}
		}
		ts.forEachChild(x, visit);
	};
	visit(root);
	return direct && proxy;
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
	/** The code draws random numbers: a second run draws other ones. */
	let nondeterministicRandom = false;
	let mutates = false;
	/** Local variables that hold a Date (declared with `new Date(…)`, without a type). */
	const dateVars = new Set<ts.Symbol>();
	/** Catch blocks that read the error and have a native form (`catch-check.ts`). */
	const plannedCatches = new Set<ts.Node>();
	/** Nodes that become `errText(<error>)`, by the name of the error. */
	const errTextNodes = new Map<ts.Node, string>();
	/** \`instanceof\` tests with a result that is certain. */
	const certain = new Map<ts.Node, boolean>();
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
	/** Parameters of local functions that get a Date from each call: they keep the type Date. */
	const dateParams = new Set<ts.Node>();
	/** Local functions whose every result is a Date: their result keeps the type Date. */
	const dateFunctions = new Set<ts.Node>();
	/** The local function that `id` names, when its declaration is the only one. */
	const localFunctionOf = (id: ts.Expression): ts.FunctionLikeDeclaration | undefined => {
		const x = stripParens(id);
		if (!ts.isIdentifier(x)) return undefined;
		const declarations = checker.getSymbolAtLocation(x)?.declarations ?? [];
		if (declarations.length !== 1) return undefined;
		const d = declarations[0];
		if (ts.isFunctionDeclaration(d)) return d.body ? d : undefined;
		if (
			!ts.isVariableDeclaration(d) ||
			!ts.isVariableDeclarationList(d.parent) ||
			(d.parent.flags & ts.NodeFlags.Const) === 0 ||
			d.initializer === undefined
		) {
			return undefined;
		}
		const f = stripParens(d.initializer);
		return ts.isArrowFunction(f) || ts.isFunctionExpression(f) ? f : undefined;
	};
	const isDateValue = (e: ts.Expression): boolean => {
		const x = stripParens(e);
		if (isNewDate(x)) return true;
		if (ts.isCallExpression(x) && !x.questionDotToken) {
			const f = localFunctionOf(x.expression);
			return f !== undefined && dateFunctions.has(f);
		}
		if (!ts.isIdentifier(x)) return false;
		const sym = checker.getSymbolAtLocation(x);
		return sym !== undefined && dateVars.has(sym);
	};
	/** The start value of a variable that holds a Date: \`isDateInit\`, or a call of a Date function. */
	const isDateStart = (e: ts.Expression | undefined): boolean => {
		if (isDateInit(e)) return true;
		if (e === undefined) return false;
		const x = stripParens(e);
		if (ts.isCallExpression(x)) return isDateValue(x);
		return ts.isConditionalExpression(x) && isDateStart(x.whenTrue) && isDateStart(x.whenFalse);
	};
	/**
	 * The calls of each local function that the code only calls by its name, without a spread
	 * argument. A function that the code uses as a value has no entry: its callers are not known.
	 */
	const directCalls = new Map<ts.FunctionLikeDeclaration, ts.CallExpression[]>();
	/** True when the translation gave a parameter or a result the type Date. */
	let typedDates = false;
	const inferDates = (infer: boolean): void => {
		const functions = new Map<ts.Symbol, ts.FunctionLikeDeclaration>();
		const callsOf = new Map<ts.Symbol, ts.CallExpression[] | null>();
		const declarations: ts.VariableDeclaration[] = [];
		const collect = (n: ts.Node): void => {
			if (ts.isFunctionDeclaration(n) && n.name && n.body) {
				const s = checker.getSymbolAtLocation(n.name);
				if (s && localFunctionOf(n.name) === n) functions.set(s, n);
			}
			if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) {
				declarations.push(n);
				const f = localFunctionOf(n.name);
				const s = checker.getSymbolAtLocation(n.name);
				if (s && f) functions.set(s, f);
			}
			ts.forEachChild(n, collect);
		};
		collect(root);
		for (const s of functions.keys()) callsOf.set(s, []);
		const uses = (n: ts.Node): void => {
			if (ts.isShorthandPropertyAssignment(n)) {
				const s = checker.getShorthandAssignmentValueSymbol(n);
				if (s && callsOf.has(s)) callsOf.set(s, null);
			} else if (ts.isIdentifier(n)) {
				const s = checker.getSymbolAtLocation(n);
				const p = n.parent;
				const list = s ? callsOf.get(s) : undefined;
				const isName = (ts.isFunctionDeclaration(p) || ts.isVariableDeclaration(p)) && p.name === n;
				if (s && list !== undefined && list !== null && !isName) {
					if (
						ts.isCallExpression(p) &&
						p.expression === n &&
						!p.questionDotToken &&
						!p.arguments.some((a) => ts.isSpreadElement(a))
					) {
						list.push(p);
					} else callsOf.set(s, null);
				}
			}
			ts.forEachChild(n, uses);
		};
		uses(root);
		for (const [s, list] of callsOf) {
			const f = functions.get(s);
			if (f && list !== null) directCalls.set(f, list);
		}
		const plain = (f: ts.FunctionLikeDeclaration): boolean => {
			if (f.asteriskToken || f.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
				return false;
			}
			let ok = true;
			const scan = (n: ts.Node): void => {
				if (ts.isIdentifier(n) && n.text === 'arguments') ok = false;
				if (ok) ts.forEachChild(n, scan);
			};
			scan(f);
			return ok;
		};
		const assigned = (f: ts.FunctionLikeDeclaration, symbol: ts.Symbol): boolean => {
			let found = false;
			const same = (e: ts.Expression): boolean => {
				const x = stripParens(e);
				return ts.isIdentifier(x) && checker.getSymbolAtLocation(x) === symbol;
			};
			const scan = (n: ts.Node): void => {
				if (found) return;
				if (
					ts.isBinaryExpression(n) &&
					n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
					n.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
					same(n.left)
				) {
					found = true;
				} else if (
					(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
					(n.operator === ts.SyntaxKind.PlusPlusToken ||
						n.operator === ts.SyntaxKind.MinusMinusToken) &&
					same(n.operand)
				) {
					found = true;
				} else if (
					(ts.isArrayLiteralExpression(n) || ts.isObjectLiteralExpression(n)) &&
					ts.isBinaryExpression(n.parent) &&
					n.parent.left === n
				) {
					found = true;
				} else if (
					(ts.isForOfStatement(n) || ts.isForInStatement(n)) &&
					ts.isIdentifier(n.initializer) &&
					same(n.initializer)
				) {
					found = true;
				}
				ts.forEachChild(n, scan);
			};
			scan(f);
			return found;
		};
		const returnsDate = (f: ts.FunctionLikeDeclaration): boolean => {
			const body = f.body;
			if (body === undefined) return false;
			const isResult = (e: ts.Expression | undefined): boolean =>
				isDateStart(e) || (e !== undefined && isDateValue(e));
			if (!ts.isBlock(body)) return isResult(body);
			const last = body.statements[body.statements.length - 1];
			if (last === undefined || !ts.isReturnStatement(last)) return false;
			let ok = true;
			const scan = (n: ts.Node): void => {
				if (!ok || isFunctionNode(n)) return;
				if (ts.isReturnStatement(n) && !isResult(n.expression)) ok = false;
				ts.forEachChild(n, scan);
			};
			ts.forEachChild(body, scan);
			return ok;
		};
		const dateDeclaration = (d: ts.VariableDeclaration): boolean =>
			ts.isVariableDeclarationList(d.parent) &&
			(d.parent.flags & ts.NodeFlags.BlockScoped) !== 0 &&
			!ts.isForOfStatement(d.parent.parent) &&
			!ts.isForInStatement(d.parent.parent) &&
			!d.type &&
			isDateStart(d.initializer);
		for (let round = 0; round < 6; round++) {
			let changed = false;
			for (const d of declarations) {
				const s = checker.getSymbolAtLocation(d.name);
				if (s && !dateVars.has(s) && dateDeclaration(d)) {
					dateVars.add(s);
					changed = true;
				}
			}
			for (const [f, calls] of directCalls) {
				if (!infer || !plain(f)) continue;
				f.parameters.forEach((p, k) => {
					if (
						dateParams.has(p) ||
						!ts.isIdentifier(p.name) ||
						p.type ||
						p.initializer ||
						p.dotDotDotToken ||
						p.questionToken ||
						calls.length === 0
					) {
						return;
					}
					const s = checker.getSymbolAtLocation(p.name);
					if (
						s === undefined ||
						!calls.every((c) => c.arguments[k] !== undefined && isDateValue(c.arguments[k])) ||
						assigned(f, s)
					) {
						return;
					}
					dateParams.add(p);
					dateVars.add(s);
					typedDates = true;
					changed = true;
				});
				if (!dateFunctions.has(f) && !f.type && returnsDate(f)) {
					dateFunctions.add(f);
					typedDates = true;
					changed = true;
				}
			}
			if (!changed) break;
		}
	};
	if (!input.nodeCode && !input.expression) inferDates(input.plainDates !== true);

	const isFree = (id: ts.Identifier): boolean => {
		const sym = checker.getSymbolAtLocation(id);
		return sym === undefined || (sym.declarations ?? []).length === 0;
	};

	/** \`Object.prototype.hasOwnProperty\` of the global \`Object\`. */
	const isPrototypeHasOwn = (e: ts.Expression): boolean => {
		const x = stripParens(e);
		if (!ts.isPropertyAccessExpression(x) || x.name.text !== 'hasOwnProperty') return false;
		const proto = stripParens(x.expression);
		return (
			ts.isPropertyAccessExpression(proto) &&
			proto.name.text === 'prototype' &&
			ts.isIdentifier(proto.expression) &&
			proto.expression.text === 'Object' &&
			isFree(proto.expression)
		);
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
		// \`$input.all\` of v1 takes no arguments and reads none.
		const noArguments =
			call !== null &&
			(call.arguments.length === 0 ||
				(own && member === 'all' && call.arguments.every((x) => ts.isNumericLiteral(x))));
		if (call && noArguments) {
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

	/** Rest parameters whose function gets the rest arguments as one list at each call. */
	const restParameters = new Set<ts.ParameterDeclaration>();

	/**
	 * A function with a rest parameter that the code only calls by its name: each call
	 * \`f(a, b, c)\` of \`f(x, ...rest)\` becomes \`f(a, [b, c])\`, and the parameter a plain one.
	 * Any other use of the name (a value, a shadowing declaration) keeps the blocker.
	 */
	const planRest = (fn: ts.Node): void => {
		if (!isFunctionNode(fn)) return;
		const rest = fn.parameters[fn.parameters.length - 1];
		if (rest === undefined || !rest.dotDotDotToken || rest.type || !ts.isIdentifier(rest.name)) {
			return;
		}
		let nameId: ts.Identifier | undefined;
		if (ts.isFunctionDeclaration(fn)) nameId = fn.name;
		else if (
			(ts.isArrowFunction(fn) || (ts.isFunctionExpression(fn) && fn.name === undefined)) &&
			ts.isVariableDeclaration(fn.parent) &&
			fn.parent.initializer === fn &&
			ts.isIdentifier(fn.parent.name) &&
			ts.isVariableDeclarationList(fn.parent.parent) &&
			(fn.parent.parent.flags & ts.NodeFlags.Const) !== 0
		) {
			nameId = fn.parent.name;
		}
		if (nameId === undefined) return;
		const sym = checker.getSymbolAtLocation(nameId);
		if (sym === undefined || (sym.declarations ?? []).length !== 1) return;
		const fixed = fn.parameters.length - 1;
		const calls: ts.CallExpression[] = [];
		let onlyCalls = true;
		const scan = (x: ts.Node): void => {
			if (!onlyCalls) return;
			if (ts.isIdentifier(x) && x.text === nameId.text && x !== nameId) {
				const parent = x.parent;
				const isPropertyName =
					(ts.isPropertyAccessExpression(parent) || ts.isPropertyAssignment(parent)) &&
					parent.name === x;
				if (!isPropertyName) {
					const direct =
						ts.isCallExpression(parent) &&
						parent.expression === x &&
						!parent.questionDotToken &&
						checker.getSymbolAtLocation(x) === sym &&
						!parent.arguments.some((arg) => ts.isSpreadElement(arg));
					if (direct) calls.push(parent);
					else onlyCalls = false;
				}
			}
			ts.forEachChild(x, scan);
		};
		scan(root);
		if (!onlyCalls) return;
		restParameters.add(rest);
		for (const call of calls) {
			const args = call.arguments;
			const close = call.getEnd() - 1;
			if (args.length <= fixed) {
				const missing = 'undefined, '.repeat(fixed - args.length);
				// After the edits of the last argument, and after a trailing comma.
				insert(
					close,
					`${args.length > 0 && !args.hasTrailingComma ? ', ' : ''}${missing}[]`,
					3_000_000,
				);
			} else {
				insert(args[fixed].getStart(sf), '[', -3_000_000);
				insert(close, ']', 3_000_000);
			}
		}
	};
	const planRestOf = (x: ts.Node): void => {
		planRest(x);
		ts.forEachChild(x, planRestOf);
	};

	const annotateParameters = (fn: ts.SignatureDeclaration) => {
		const bareArrow = isBareArrow(fn);
		const result = dateFunctions.has(fn) ? 'Date' : 'Json';
		for (const p of fn.parameters) {
			if (p.type) continue;
			if (dateParams.has(p)) {
				if (bareArrow) {
					insert(p.getStart(sf), '(', -1);
					insert(p.name.getEnd(), `: Date): ${result}`, 1);
				} else insert(p.name.getEnd(), ': Date', 0);
				continue;
			}
			if (p.dotDotDotToken) {
				if (restParameters.has(p)) {
					// Each call gives the rest arguments as one list (\`planRest\`).
					replace(p.dotDotDotToken.getStart(sf), p.name.getStart(sf), '');
					insert(p.name.getEnd(), '?: Json', 0);
					continue;
				}
				// The compiler does not lower rest parameters.
				block(
					'rest parameter',
					'A rest parameter (`...args`) has a native form only in a function that the code only calls by its name.',
				);
				continue;
			}
			if (bareArrow) {
				insert(p.getStart(sf), '(', -1);
				insert(p.name.getEnd(), `: Json): ${result}`, 1);
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
		const result = dateFunctions.has(fn) ? ': Date' : ': Json';
		if (ts.isArrowFunction(fn)) {
			const arrow = fn.equalsGreaterThanToken;
			const close = fn
				.getChildren(sf)
				.find((c) => c.kind === ts.SyntaxKind.CloseParenToken && c.getEnd() <= arrow.getStart(sf));
			if (close) insert(close.getEnd(), result, 0);
			return;
		}
		const close = fn.getChildren(sf).find((c) => c.kind === ts.SyntaxKind.CloseParenToken);
		if (close) insert(close.getEnd(), result, 0);
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
	/**
	 * The code calls `this.helpers.httpRequest`. A body of the type `multipart/form-data` has no
	 * native form, and the type can be a computed text, so code with that text stays in the host.
	 * Code with a strict mode directive stays there too.
	 */
	const usesHttp =
		!input.nodeCode &&
		/\.\s*httpRequest\b/.test(input.code) &&
		!/multipart\/form-data/i.test(input.code) &&
		// In strict mode, \`this\` of a called function is undefined.
		!/use strict/.test(input.code);
	/** `async` and `await` stay as they are: the code makes requests. */
	const keepsAsync = input.nodeCode !== undefined || usesHttp;

	/**
	 * Other names of the request helper. Code often keeps \`this\`, \`this.helpers\` or
	 * \`this.helpers.httpRequest\` (also with \`.bind(this)\`) in a constant, and n8n's task
	 * runner also gives \`helpers\` as a global. A constant counts when the code uses it only
	 * to make awaited requests: then its declaration has no native form of its own and goes.
	 */
	const requestNames = new Map<ts.Symbol, 'this' | 'helpers' | 'request'>();
	const requestDeclarations = new Set<ts.Node>();
	const requestKind = (e: ts.Expression): 'this' | 'helpers' | 'request' | null => {
		const x = stripParens(e);
		if (x.kind === ts.SyntaxKind.ThisKeyword) return 'this';
		if (ts.isIdentifier(x)) {
			const sym = checker.getSymbolAtLocation(x);
			const known = sym === undefined ? undefined : requestNames.get(sym);
			if (known !== undefined) return known;
			return x.text === 'helpers' && isFree(x) ? 'helpers' : null;
		}
		if (ts.isPropertyAccessExpression(x) && !x.questionDotToken) {
			const inner = requestKind(x.expression);
			if (inner === 'this' && x.name.text === 'helpers') return 'helpers';
			if (inner === 'helpers' && x.name.text === 'httpRequest') return 'request';
			return null;
		}
		if (
			ts.isCallExpression(x) &&
			ts.isPropertyAccessExpression(x.expression) &&
			x.expression.name.text === 'bind' &&
			x.arguments.length === 1
		) {
			const bound = requestKind(x.arguments[0]);
			return requestKind(x.expression.expression) === 'request' &&
				(bound === 'this' || bound === 'helpers')
				? 'request'
				: null;
		}
		return null;
	};
	const isRequest = (callee: ts.Expression): boolean => requestKind(callee) === 'request';
	/**
	 * The object literal of a constant that holds the options of requests, or null. Each use of
	 * the constant is the one argument of an awaited request, so no code changes the object.
	 */
	const optionsConstant = (id: ts.Identifier): ts.Expression | null => {
		const sym = checker.getSymbolAtLocation(id);
		const declarations = sym?.declarations ?? [];
		const d = declarations.length === 1 ? declarations[0] : undefined;
		if (
			d === undefined ||
			!ts.isVariableDeclaration(d) ||
			!ts.isVariableDeclarationList(d.parent) ||
			(d.parent.flags & ts.NodeFlags.Const) === 0 ||
			d.initializer === undefined
		) {
			return null;
		}
		const literal = stripParens(d.initializer);
		if (!ts.isObjectLiteralExpression(literal)) return null;
		let only = true;
		const scan = (x: ts.Node): void => {
			if (!only) return;
			if (
				ts.isIdentifier(x) &&
				x !== d.name &&
				!isNameOf(x) &&
				checker.getSymbolAtLocation(x) === sym
			) {
				let call: ts.Node = x.parent;
				while (ts.isParenthesizedExpression(call)) call = call.parent;
				let wait: ts.Node = call.parent;
				while (ts.isParenthesizedExpression(wait)) wait = wait.parent;
				const request =
					ts.isCallExpression(call) &&
					call.arguments.length === 1 &&
					stripParens(call.arguments[0]) === x &&
					isRequest(stripParens(call.expression)) &&
					ts.isAwaitExpression(wait);
				if (!request) only = false;
			}
			ts.forEachChild(x, scan);
		};
		scan(root);
		return only ? literal : null;
	};
	/**
	 * The full response (\`returnFullResponse: true\`) also has the headers and the status text
	 * of the transport, which native code does not give as v1 does. So the code must read only
	 * \`body\` and \`statusCode\` of it: from a constant that holds the response, or in a
	 * destructuring declaration.
	 */
	const fullResponseFits = (
		n: ts.AwaitExpression,
		options: ts.ObjectLiteralExpression,
	): boolean => {
		const full = options.properties.some(
			(p) =>
				ts.isPropertyAssignment(p) &&
				(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
				p.name.text === 'returnFullResponse' &&
				stripParens(p.initializer).kind === ts.SyntaxKind.TrueKeyword,
		);
		if (!full) return true;
		let p: ts.Node = n.parent;
		while (ts.isParenthesizedExpression(p)) p = p.parent;
		if (
			!ts.isVariableDeclaration(p) ||
			!ts.isVariableDeclarationList(p.parent) ||
			(p.parent.flags & ts.NodeFlags.Const) === 0
		) {
			return false;
		}
		const read = (name: string): boolean => name === 'body' || name === 'statusCode';
		if (ts.isObjectBindingPattern(p.name)) {
			return p.name.elements.every((el) => {
				const key = el.propertyName ?? el.name;
				return !el.dotDotDotToken && ts.isIdentifier(key) && read(key.text);
			});
		}
		if (!ts.isIdentifier(p.name)) return false;
		const declared = p.name;
		const sym = checker.getSymbolAtLocation(declared);
		let fits = sym !== undefined;
		const scan = (x: ts.Node): void => {
			if (!fits) return;
			if (
				ts.isIdentifier(x) &&
				x !== declared &&
				!isNameOf(x) &&
				checker.getSymbolAtLocation(x) === sym
			) {
				const use = x.parent;
				const reads =
					ts.isPropertyAccessExpression(use) &&
					use.expression === x &&
					read(use.name.text) &&
					!(
						ts.isBinaryExpression(use.parent) &&
						use.parent.left === use &&
						use.parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
						use.parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment
					);
				if (!reads) fits = false;
			}
			ts.forEachChild(x, scan);
		};
		scan(root);
		return fits;
	};
	const hasThis = (x: ts.Node): boolean =>
		x.kind === ts.SyntaxKind.ThisKeyword || (ts.forEachChild(x, hasThis) ?? false);
	/** True when the code uses a constant of the request helper for something else. */
	let requestNameMisuse = false;
	/** True when `id` names a local async function. */
	const isAsyncFunction = (id: ts.Identifier): boolean => {
		const declarations = checker.getSymbolAtLocation(id)?.declarations ?? [];
		return (
			declarations.length === 1 &&
			declarations.every((d) => {
				const fn = ts.isVariableDeclaration(d) && d.initializer ? stripParens(d.initializer) : d;
				return (
					(ts.isFunctionDeclaration(fn) || ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) &&
					(fn.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
				);
			})
		);
	};
	/**
	 * True when `this` at `n` is the context of the Code node for certain, so `this.helpers`
	 * is the helpers of n8n. The code of a Code node is not in strict mode: `this` is the
	 * context at the top, in arrow functions, and in a function declaration that the code only
	 * calls by its name. In a method, or in a function that the code uses as a value, `this`
	 * can be another value.
	 */
	const thisIsContext = (n: ts.Node): boolean => {
		for (let x: ts.Node | undefined = n.parent; x !== undefined; x = x.parent) {
			if (x === root) return true;
			if (!isFunctionNode(x) || ts.isArrowFunction(x)) continue;
			if (!ts.isFunctionDeclaration(x) || x.name === undefined) return false;
			const name = x.name;
			const sym = checker.getSymbolAtLocation(name);
			if (sym === undefined || (sym.declarations ?? []).length !== 1) return false;
			let onlyCalls = true;
			const scan = (y: ts.Node): void => {
				if (!onlyCalls) return;
				if (ts.isIdentifier(y) && y.text === name.text && y !== name && !isNameOf(y)) {
					const parent = y.parent;
					const direct =
						ts.isCallExpression(parent) &&
						parent.expression === y &&
						checker.getSymbolAtLocation(y) === sym;
					if (!direct) onlyCalls = false;
				}
				ts.forEachChild(y, scan);
			};
			scan(root);
			if (!onlyCalls) return false;
		}
		return false;
	};

	if (usesHttp && root.body) {
		const declare = (x: ts.Node): void => {
			if (
				ts.isVariableStatement(x) &&
				(x.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
				x.declarationList.declarations.length === 1
			) {
				const d = x.declarationList.declarations[0];
				const kind = d.initializer === undefined ? null : requestKind(d.initializer);
				const sym = ts.isIdentifier(d.name) ? checker.getSymbolAtLocation(d.name) : undefined;
				if (kind !== null && sym !== undefined && d.initializer !== undefined) {
					if (hasThis(d.initializer) && !thisIsContext(d)) requestNameMisuse = true;
					requestNames.set(sym, kind);
					requestDeclarations.add(x);
					return;
				}
			}
			ts.forEachChild(x, declare);
		};
		declare(root.body);
		// Each use of such a constant is in a declaration of another one, or in the callee of an
		// awaited request.
		const uses = (x: ts.Node, allowed: boolean): void => {
			if (ts.isIdentifier(x) && !isNameOf(x)) {
				const sym = checker.getSymbolAtLocation(x);
				const declared = ts.isVariableDeclaration(x.parent) && x.parent.name === x;
				if (sym !== undefined && requestNames.has(sym) && !declared && !allowed) {
					requestNameMisuse = true;
				}
				return;
			}
			if (requestDeclarations.has(x)) {
				ts.forEachChild(x, (c) => uses(c, true));
				return;
			}
			if (ts.isAwaitExpression(x)) {
				const call = stripParens(x.expression);
				if (ts.isCallExpression(call) && isRequest(stripParens(call.expression))) {
					uses(call.expression, true);
					for (const arg of call.arguments) uses(arg, false);
					return;
				}
			}
			ts.forEachChild(x, (c) => uses(c, allowed));
		};
		uses(root.body, false);
	}

	/**
	 * What an `await` waits for in code that makes requests: a request (`http`), a call of a
	 * local async function or `Promise.all` (`call`), or a value that is not a promise (null).
	 */
	const awaited = (n: ts.AwaitExpression): 'http' | 'call' | null => {
		if (!usesHttp) return null;
		if (httpRequestOptions(n, isRequest, optionsConstant) !== null) return 'http';
		const call = stripParens(n.expression);
		if (!ts.isCallExpression(call)) return null;
		const callee = stripParens(call.expression);
		if (ts.isIdentifier(callee)) return isAsyncFunction(callee) ? 'call' : null;
		return ts.isPropertyAccessExpression(callee) &&
			callee.name.text === 'all' &&
			ts.isIdentifier(callee.expression) &&
			callee.expression.text === 'Promise'
			? 'call'
			: null;
	};
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

	/** A format whose tokens `luxFormat` has (`luxon-expression.ts`). */
	const formatSupported = luxonFormatSupported;

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

	/** True when \`e\` is an argument of a locale formatting call: the call does not change it. */
	const isFormatArgument = (e: ts.Node): boolean => {
		const call = e.parent;
		if (ts.isNewExpression(call)) {
			const made = call.expression;
			return (
				(call.arguments ?? []).some((x) => x === e) &&
				ts.isPropertyAccessExpression(made) &&
				ts.isIdentifier(made.expression) &&
				made.expression.text === 'Intl'
			);
		}
		if (!ts.isCallExpression(call) || !call.arguments.some((x) => x === e)) return false;
		const callee = call.expression;
		return (
			ts.isPropertyAccessExpression(callee) &&
			['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].includes(callee.name.text)
		);
	};

	/**
	 * The object literal of the options of a locale formatting call: the argument itself, or
	 * the start value of a constant that the code gives only to such calls (so no code changes
	 * the object). Null for another value.
	 */
	const optionsLiteral = (e: ts.Expression): ts.ObjectLiteralExpression | null => {
		const x = stripParens(e);
		if (ts.isObjectLiteralExpression(x)) return x;
		if (!ts.isIdentifier(x)) return null;
		const symbol = checker.getSymbolAtLocation(x);
		const decls = symbol?.declarations ?? [];
		const d = decls[0];
		if (
			symbol === undefined ||
			decls.length !== 1 ||
			!ts.isVariableDeclaration(d) ||
			!ts.isIdentifier(d.name) ||
			!ts.isVariableDeclarationList(d.parent) ||
			(d.parent.flags & ts.NodeFlags.Const) === 0 ||
			d.initializer === undefined
		) {
			return null;
		}
		const start = stripParens(d.initializer);
		if (!ts.isObjectLiteralExpression(start)) return null;
		let onlyFormats = true;
		const scan = (n: ts.Node): void => {
			if (!onlyFormats) return;
			if (
				ts.isIdentifier(n) &&
				n !== d.name &&
				n.text === x.text &&
				checker.getSymbolAtLocation(n) === symbol &&
				!isFormatArgument(n)
			) {
				onlyFormats = false;
				return;
			}
			if (
				ts.isShorthandPropertyAssignment(n) &&
				checker.getShorthandAssignmentValueSymbol(n) === symbol
			) {
				onlyFormats = false;
				return;
			}
			ts.forEachChild(n, scan);
		};
		scan(root);
		return onlyFormats ? start : null;
	};

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
			const literal = optionsLiteral(a1);
			if (literal === null) return 'computed options';
			for (const p of literal.properties) {
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
		// From the table when it has the identity of the target Node.js, else from the ICU data
		// of this process, checked against Node.js (\`node-identity.ts\`).
		localeEntry(method, a.locale, a.options);

	/** The code reads the parts of a format somewhere. */
	const readsParts = /\bformatToParts\b/.test(input.code);

	/** The code makes a Date somewhere: \`new Date(…)\` or \`Date(…)\`. */
	const makesDates = /\bnew\s+Date\b|\bDate\s*\(/.test(input.code);

	/** True when the value of \`e\` is a number for certain. */
	const isNumberValue = (e: ts.Expression): boolean => {
		const x = stripParens(e);
		if (ts.isNumericLiteral(x)) return true;
		if (ts.isPrefixUnaryExpression(x)) {
			return x.operator === ts.SyntaxKind.MinusToken || x.operator === ts.SyntaxKind.PlusToken;
		}
		if (ts.isBinaryExpression(x)) return ARITHMETIC.has(x.operatorToken.kind);
		if (ts.isPropertyAccessExpression(x)) return x.name.text === 'length';
		if (!ts.isCallExpression(x)) return false;
		const callee = stripParens(x.expression);
		if (ts.isIdentifier(callee)) {
			return ['Number', 'parseInt', 'parseFloat'].includes(callee.text) && isFree(callee);
		}
		return (
			ts.isPropertyAccessExpression(callee) &&
			ts.isIdentifier(callee.expression) &&
			callee.expression.text === 'Math' &&
			isFree(callee.expression)
		);
	};

	/** True when the code provably changes no input (\`provesReadOnly\`): then no input value is a Date. */
	let inputsStay: boolean | undefined;
	/** Methods of a list that give each item to their callback as its first parameter. */
	const ITEM_CALLBACKS = new Set(['map', 'forEach', 'filter', 'find', 'some', 'every', 'flatMap']);
	/**
	 * True when the value of \`e\` comes from the JSON of an input item or of another node,
	 * through reads of members only: \`$json.a.b\`, \`items[0].json.x\`, the parameter of a
	 * callback over such a list, a constant that holds such a value.
	 */
	const isInputValue = (e: ts.Expression, depth: number): boolean => {
		if (depth > 6) return false;
		let x = stripParens(e);
		while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) {
			x = stripParens(x.expression);
		}
		if (ts.isCallExpression(x)) {
			const callee = stripParens(x.expression);
			if (ts.isIdentifier(callee)) return callee.text === '$' && isFree(callee);
			// \`$input.first()\`, \`$('Node').all()\`.
			return (
				ts.isPropertyAccessExpression(callee) &&
				['first', 'last', 'all'].includes(callee.name.text) &&
				isInputValue(callee.expression, depth + 1)
			);
		}
		if (!ts.isIdentifier(x)) return false;
		if (isFree(x)) return ['$json', 'item', 'items', '$input', '$node'].includes(x.text);
		const declarations = checker.getSymbolAtLocation(x)?.declarations ?? [];
		if (declarations.length !== 1) return false;
		const d = declarations[0];
		if (ts.isVariableDeclaration(d) && ts.isVariableDeclarationList(d.parent)) {
			if ((d.parent.flags & ts.NodeFlags.Const) === 0 || !ts.isIdentifier(d.name)) return false;
			const loop = d.parent.parent;
			if (ts.isForOfStatement(loop)) return isInputValue(loop.expression, depth + 1);
			return d.initializer !== undefined && isInputValue(d.initializer, depth + 1);
		}
		if (ts.isParameter(d) && ts.isIdentifier(d.name) && isFunctionNode(d.parent)) {
			const fn = d.parent;
			const call = fn.parent;
			if (!ts.isCallExpression(call) || call.arguments[0] !== fn || fn.parameters[0] !== d) {
				return false;
			}
			const callee = stripParens(call.expression);
			return (
				ts.isPropertyAccessExpression(callee) &&
				ITEM_CALLBACKS.has(callee.name.text) &&
				isInputValue(callee.expression, depth + 1)
			);
		}
		return false;
	};
	/** Methods whose result is text. */
	const TEXT_METHODS = new Set([
		'toFixed',
		'toString',
		'join',
		'trim',
		'toUpperCase',
		'toLowerCase',
	]);
	/**
	 * True when the value of \`e\` is no Date for certain: a number or a text by its form, a
	 * constant with such a value, or a value of the input in code that changes no input (the
	 * input is JSON, which has no Date).
	 */
	/**
	 * True when each assignment to the variable \`symbol\` gives it a value that is no Date. A
	 * compound assignment (\`+=\`, \`-=\`) gives a number or a text. An assignment in a pattern
	 * (\`[a, b] = …\`) has a value of unknown kind.
	 */
	const assignedNoDate = (symbol: ts.Symbol | undefined, depth: number): boolean => {
		if (symbol === undefined) return false;
		let ok = true;
		const same = (e: ts.Node): boolean =>
			ts.isIdentifier(e) && checker.getSymbolAtLocation(e) === symbol;
		const scan = (n: ts.Node): void => {
			if (!ok) return;
			if (
				ts.isBinaryExpression(n) &&
				n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				same(stripParens(n.left))
			) {
				ok = isNotDate(n.right, depth);
			} else if (
				(ts.isArrayLiteralExpression(n) || ts.isObjectLiteralExpression(n)) &&
				ts.isBinaryExpression(n.parent) &&
				n.parent.left === n &&
				n.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
			) {
				let named = false;
				const find = (x: ts.Node): void => {
					if (same(x)) named = true;
					else ts.forEachChild(x, find);
				};
				find(n);
				if (named) ok = false;
			} else if ((ts.isForOfStatement(n) || ts.isForInStatement(n)) && same(n.initializer)) {
				ok = false;
			}
			ts.forEachChild(n, scan);
		};
		scan(root);
		return ok;
	};

	const isNotDate = (e: ts.Expression, depth: number): boolean => {
		if (depth > 6) return false;
		const x = stripParens(e);
		if (isNumberValue(x) || ts.isStringLiteralLike(x) || ts.isTemplateExpression(x)) return true;
		// \`a + b\` is a number or a text.
		if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.PlusToken) return true;
		// One of two values that are no Date: \`a || b\`, \`a && b\`, \`a ?? b\`, \`c ? a : b\`.
		if (
			ts.isBinaryExpression(x) &&
			[
				ts.SyntaxKind.BarBarToken,
				ts.SyntaxKind.AmpersandAmpersandToken,
				ts.SyntaxKind.QuestionQuestionToken,
			].includes(x.operatorToken.kind)
		) {
			return isNotDate(x.left, depth + 1) && isNotDate(x.right, depth + 1);
		}
		if (ts.isConditionalExpression(x)) {
			return isNotDate(x.whenTrue, depth + 1) && isNotDate(x.whenFalse, depth + 1);
		}
		if (ts.isCallExpression(x)) {
			const callee = stripParens(x.expression);
			if (ts.isPropertyAccessExpression(callee) && TEXT_METHODS.has(callee.name.text)) return true;
			if (ts.isIdentifier(callee) && callee.text === 'String' && isFree(callee)) return true;
		}
		if (ts.isIdentifier(x) && !isFree(x)) {
			const declarations = checker.getSymbolAtLocation(x)?.declarations ?? [];
			const d = declarations.length === 1 ? declarations[0] : undefined;
			// A \`let\` or \`var\` variable that gets no Date: its start value and each value
			// that the code gives it are no Date.
			if (
				d !== undefined &&
				ts.isVariableDeclaration(d) &&
				ts.isIdentifier(d.name) &&
				ts.isVariableDeclarationList(d.parent) &&
				(d.parent.flags & ts.NodeFlags.Const) === 0 &&
				!ts.isForOfStatement(d.parent.parent) &&
				!ts.isForInStatement(d.parent.parent) &&
				(d.initializer === undefined || isNotDate(d.initializer, depth + 1)) &&
				assignedNoDate(checker.getSymbolAtLocation(x), depth + 1)
			) {
				return true;
			}
			if (
				d !== undefined &&
				ts.isVariableDeclaration(d) &&
				ts.isVariableDeclarationList(d.parent) &&
				(d.parent.flags & ts.NodeFlags.Const) !== 0 &&
				d.initializer !== undefined &&
				!ts.isForOfStatement(d.parent.parent) &&
				isNotDate(d.initializer, depth + 1)
			) {
				return true;
			}
		}
		if (ts.isIdentifier(x) && !isFree(x)) {
			// A parameter of a function that the code only calls by its name: no call gives a Date.
			const symbol = checker.getSymbolAtLocation(x);
			const declarations = symbol?.declarations ?? [];
			const d = declarations.length === 1 ? declarations[0] : undefined;
			if (
				d !== undefined &&
				ts.isParameter(d) &&
				ts.isIdentifier(d.name) &&
				!d.dotDotDotToken &&
				isFunctionNode(d.parent)
			) {
				const calls = directCalls.get(d.parent);
				const k = d.parent.parameters.indexOf(d);
				if (
					calls !== undefined &&
					calls.length > 0 &&
					(d.initializer === undefined || isNotDate(d.initializer, depth + 1)) &&
					calls.every(
						(c) => c.arguments[k] === undefined || isNotDate(c.arguments[k], depth + 1),
					) &&
					assignedNoDate(symbol, depth + 1)
				) {
					return true;
				}
			}
		}
		if (!isInputValue(x, 0)) return false;
		inputsStay ??= provesReadOnly(root, checker, input.mode);
		return inputsStay;
	};

	/**
	 * Refuses code in which a Date can lose its kind. Native code holds a Date as a number
	 * only in a place with the type Date. In each other place it is the JSON of the Date, and
	 * code that reads it back gets a text where JavaScript has a Date. So a Date can go only
	 * to a place that keeps its type, to \`JSON.stringify\`, or under a property name that no
	 * code reads.
	 */
	const guardDates = (): void => {
		const refuse = (what: string) =>
			block(
				'Date: a Date in a place that loses its kind',
				`${what} The Date is text there in native code, and JavaScript has a Date.`,
			);
		const stored = new Set<string>();
		const LOGICAL = [
			ts.SyntaxKind.BarBarToken,
			ts.SyntaxKind.AmpersandAmpersandToken,
			ts.SyntaxKind.QuestionQuestionToken,
		];
		/** \`date\`: a Date for certain. \`part\`: a Date or another value. */
		const kindOf = (e: ts.Expression): 'none' | 'date' | 'part' => {
			const x = stripParens(e);
			if (isDateValue(x)) return 'date';
			let a: 'none' | 'date' | 'part';
			let b: 'none' | 'date' | 'part';
			if (ts.isConditionalExpression(x)) {
				a = kindOf(x.whenTrue);
				b = kindOf(x.whenFalse);
			} else if (ts.isBinaryExpression(x) && LOGICAL.includes(x.operatorToken.kind)) {
				a = kindOf(x.left);
				b = kindOf(x.right);
			} else if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.CommaToken) {
				return kindOf(x.right);
			} else return 'none';
			if (a === 'none' && b === 'none') return 'none';
			return a === 'date' && b === 'date' ? 'date' : 'part';
		};
		const passesOn = (e: ts.Node): boolean => {
			const p = e.parent;
			if (ts.isParenthesizedExpression(p)) return true;
			if (ts.isConditionalExpression(p)) return p.condition !== e;
			return (
				ts.isBinaryExpression(p) &&
				(LOGICAL.includes(p.operatorToken.kind) ||
					(p.operatorToken.kind === ts.SyntaxKind.CommaToken && p.right === e))
			);
		};
		const nameOf = (name: ts.PropertyName): string | null =>
			ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)
				? name.text
				: null;
		const store = (name: string | null, what: string): void => {
			if (name === null) refuse(what);
			else stored.add(name);
		};
		const globalCall = (call: ts.CallExpression): string | null => {
			const c = stripParens(call.expression);
			if (ts.isIdentifier(c)) return isFree(c) ? c.text : null;
			if (
				ts.isPropertyAccessExpression(c) &&
				ts.isIdentifier(c.expression) &&
				isFree(c.expression)
			) {
				return `${c.expression.text}.${c.name.text}`;
			}
			return null;
		};
		const ownerFunction = (n: ts.Node): ts.Node | undefined => {
			let p: ts.Node | undefined = n.parent;
			while (p && !isFunctionNode(p)) p = p.parent;
			return p;
		};
		const place = (e: ts.Expression, kind: 'date' | 'part'): void => {
			const p = e.parent;
			const typed = kind === 'date';
			if (ts.isVariableDeclaration(p)) {
				if (!isDateStart(e)) refuse('A variable gets a value that can be a Date.');
				return;
			}
			if (ts.isPropertyAssignment(p)) {
				store(nameOf(p.name), 'A property with a computed name gets a Date.');
				return;
			}
			if (ts.isArrayLiteralExpression(p)) {
				let list: ts.Node = p;
				while (
					ts.isArrayLiteralExpression(list.parent) ||
					ts.isParenthesizedExpression(list.parent)
				) {
					list = list.parent;
				}
				const owner = list.parent;
				if (ts.isPropertyAssignment(owner) && owner.initializer === list) {
					store(nameOf(owner.name), 'A list with a Date is under a computed name.');
				} else refuse('A list that is not the value of a property gets a Date.');
				return;
			}
			if (ts.isBinaryExpression(p)) {
				const op = p.operatorToken.kind;
				if (op === ts.SyntaxKind.EqualsToken && p.right === e) {
					const target = stripParens(p.left);
					const used = !ts.isExpressionStatement(p.parent) && !ts.isForStatement(p.parent);
					if (used) refuse('The code uses the value of an assignment of a Date.');
					else if (ts.isIdentifier(target)) {
						if (!(typed && isDateValue(target) && isDateStart(e))) {
							refuse('A variable gets a value that can be a Date.');
						}
					} else if (ts.isPropertyAccessExpression(target)) stored.add(target.name.text);
					else if (
						ts.isElementAccessExpression(target) &&
						ts.isStringLiteralLike(target.argumentExpression)
					) {
						stored.add(target.argumentExpression.text);
					} else refuse('A member with a computed name gets a Date.');
					return;
				}
				if (!typed) refuse('An operator gets a value that can be a Date.');
				return;
			}
			if (ts.isCallExpression(p) && p.expression !== e) {
				const k = p.arguments.indexOf(e);
				const g = globalCall(p);
				if (g === 'JSON.stringify' && k === 0) return;
				if (
					typed &&
					g !== null &&
					(['String', 'Number', 'isNaN', 'isFinite'].includes(g) || g.startsWith('Math.'))
				) {
					return;
				}
				const f = localFunctionOf(p.expression);
				if (typed && f !== undefined && k >= 0 && dateParams.has(f.parameters[k])) return;
				const method = stripParens(p.expression);
				if (
					hasIntl &&
					isDateValue(e) &&
					p.arguments.length === 1 &&
					ts.isPropertyAccessExpression(method) &&
					(method.name.text === 'format' || method.name.text === 'formatToParts')
				) {
					return;
				}
				refuse('A function gets a Date as an argument.');
				return;
			}
			if (ts.isNewExpression(p) && p.expression !== e) {
				const made = stripParens(p.expression);
				if (typed && ts.isIdentifier(made) && ['Date', 'Error'].includes(made.text)) return;
				refuse('A constructor gets a Date as an argument.');
				return;
			}
			if (ts.isReturnStatement(p) || (ts.isArrowFunction(p) && p.body === e)) {
				const f = ts.isArrowFunction(p) ? p : ownerFunction(p);
				if (!(typed && f !== undefined && dateFunctions.has(f))) {
					refuse('A function gives a Date as its result.');
				}
				return;
			}
			if (
				typed &&
				((ts.isPropertyAccessExpression(p) && p.expression === e) ||
					ts.isPrefixUnaryExpression(p) ||
					ts.isTypeOfExpression(p) ||
					ts.isVoidExpression(p) ||
					ts.isTemplateSpan(p) ||
					ts.isExpressionStatement(p) ||
					ts.isIfStatement(p) ||
					ts.isWhileStatement(p) ||
					ts.isDoStatement(p) ||
					ts.isForStatement(p) ||
					ts.isConditionalExpression(p))
			) {
				return;
			}
			refuse('The code uses a Date in a place that has no type Date.');
		};
		const isJsDate = (x: ts.Node): boolean =>
			ts.isCallExpression(x) &&
			ts.isPropertyAccessExpression(x.expression) &&
			x.expression.name.text === 'toJSDate';
		/** \`toJSDate()\` gives the time value in native code: only places that read a number are equal. */
		const placeJsDate = (e: ts.Node): void => {
			let x = e;
			while (ts.isParenthesizedExpression(x.parent)) x = x.parent;
			const p = x.parent;
			if (ts.isPropertyAccessExpression(p) && p.expression === x && DATE_READERS.has(p.name.text)) {
				return;
			}
			if (
				ts.isBinaryExpression(p) &&
				(ARITHMETIC.has(p.operatorToken.kind) ||
					[
						ts.SyntaxKind.LessThanToken,
						ts.SyntaxKind.LessThanEqualsToken,
						ts.SyntaxKind.GreaterThanToken,
						ts.SyntaxKind.GreaterThanEqualsToken,
					].includes(p.operatorToken.kind))
			) {
				return;
			}
			if (ts.isNewExpression(p) && isNewDate(p)) return;
			if (ts.isCallExpression(p) && p.expression !== x) {
				const g = globalCall(p);
				if (g !== null && (['Number', 'isNaN', 'isFinite'].includes(g) || g.startsWith('Math.'))) {
					return;
				}
			}
			block(
				'Luxon toJSDate',
				'The Date of `toJSDate()` goes to a place that reads more than its time value.',
			);
		};
		const walk = (n: ts.Node): void => {
			if (ts.isShorthandPropertyAssignment(n)) {
				const s = checker.getShorthandAssignmentValueSymbol(n);
				if (s && dateVars.has(s)) stored.add(n.name.text);
				return;
			}
			if (isJsDate(n)) placeJsDate(n);
			if (ts.isExpression(n) && !ts.isParenthesizedExpression(n) && !passesOn(n)) {
				const kind = kindOf(n);
				const declared =
					ts.isIdentifier(n) &&
					(ts.isVariableDeclaration(n.parent) ||
						ts.isParameter(n.parent) ||
						ts.isBindingElement(n.parent)) &&
					n.parent.name === n;
				const target =
					ts.isBinaryExpression(n.parent) &&
					n.parent.left === n &&
					n.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
				if (kind !== 'none' && !declared && !target) place(n, kind);
			}
			ts.forEachChild(n, walk);
		};
		walk(root);
		if (stored.size === 0) return;
		/** True when the value of \`e\` is a number for certain: an index of a list. */
		const isIndex = (e: ts.Expression): boolean => {
			const x = stripParens(e);
			if (isNumberValue(x)) return true;
			if (!ts.isIdentifier(x) || isFree(x)) return false;
			const symbol = checker.getSymbolAtLocation(x);
			const declarations = symbol?.declarations ?? [];
			const d = declarations.length === 1 ? declarations[0] : undefined;
			if (d === undefined) return false;
			if (ts.isParameter(d) && isFunctionNode(d.parent)) {
				const call = d.parent.parent;
				if (!ts.isCallExpression(call) || call.arguments[0] !== d.parent) return false;
				const callee = stripParens(call.expression);
				return (
					d.parent.parameters[1] === d &&
					ts.isPropertyAccessExpression(callee) &&
					(ITEM_CALLBACKS.has(callee.name.text) || callee.name.text === 'findIndex')
				);
			}
			if (!ts.isVariableDeclaration(d) || d.initializer === undefined) return false;
			if (!isNumberValue(d.initializer)) return false;
			let numeric = true;
			const scan = (n: ts.Node): void => {
				if (!numeric) return;
				if (
					ts.isBinaryExpression(n) &&
					n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
					ts.isIdentifier(n.left) &&
					checker.getSymbolAtLocation(n.left) === symbol &&
					!isNumberValue(n.right)
				) {
					numeric = false;
				}
				if (
					(ts.isArrayLiteralExpression(n) || ts.isObjectLiteralExpression(n)) &&
					ts.isBinaryExpression(n.parent) &&
					n.parent.left === n
				) {
					numeric = false;
				}
				if (
					(ts.isForOfStatement(n) || ts.isForInStatement(n)) &&
					ts.isIdentifier(n.initializer) &&
					checker.getSymbolAtLocation(n.initializer) === symbol
				) {
					numeric = false;
				}
				ts.forEachChild(n, scan);
			};
			scan(root);
			return numeric;
		};
		const readsBack = (what: string) =>
			block(
				'Date: a Date read back from an object',
				`${what} The code stores a Date in an object, which is text there in native code.`,
			);
		const isTarget = (n: ts.Node): boolean =>
			ts.isBinaryExpression(n.parent) &&
			n.parent.left === n &&
			n.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
		const reads = (n: ts.Node): void => {
			if (ts.isPropertyAccessExpression(n) && stored.has(n.name.text) && !isTarget(n)) {
				readsBack(`The code reads the property \`${n.name.text}\`.`);
			} else if (ts.isElementAccessExpression(n)) {
				const a = n.argumentExpression;
				if (ts.isStringLiteralLike(a)) {
					if (stored.has(a.text) && !isTarget(n)) {
						readsBack(`The code reads the member "${a.text}".`);
					}
				} else if (!isIndex(a)) readsBack('The code reads a member with a computed name.');
			} else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent)) {
				const key = n.propertyName ?? n.name;
				const text = ts.isIdentifier(key) || ts.isStringLiteralLike(key) ? key.text : null;
				if (n.dotDotDotToken || text === null || stored.has(text)) {
					readsBack('The code reads a property with a pattern.');
				}
			} else if (ts.isObjectLiteralExpression(n) && isTarget(n)) {
				readsBack('The code reads properties with a pattern.');
			} else if (ts.isForInStatement(n)) {
				readsBack('The code reads the names of an object.');
			} else if (ts.isCallExpression(n)) {
				const g = globalCall(n);
				if (g === 'Object.values' || g === 'Object.entries') {
					readsBack(`The code reads the values of an object with \`${g}\`.`);
				}
			}
			ts.forEachChild(n, reads);
		};
		reads(root);
	};
	if (!input.nodeCode && !input.expression && (makesDates || usesLuxon)) guardDates();
	/**
	 * True when `n` is in the branch of a test \`x instanceof Date\` that is false for certain
	 * (\`x\` is no Date): the branch does not run.
	 */
	const inDeadDateBranch = (n: ts.Node, receiver: ts.Expression): boolean => {
		if (!ts.isIdentifier(receiver)) return false;
		const symbol = checker.getSymbolAtLocation(receiver);
		const tests = (e: ts.Expression): boolean => {
			const x = stripParens(e);
			if (!ts.isBinaryExpression(x) || x.operatorToken.kind !== ts.SyntaxKind.InstanceOfKeyword) {
				return false;
			}
			const left = stripParens(x.left);
			const right = stripParens(x.right);
			return (
				ts.isIdentifier(left) &&
				checker.getSymbolAtLocation(left) === symbol &&
				ts.isIdentifier(right) &&
				right.text === 'Date' &&
				isFree(right) &&
				isNotDate(left, 0)
			);
		};
		for (let c = n, p = n.parent; p && !isFunctionNode(p); c = p, p = p.parent) {
			if (ts.isIfStatement(p) && p.thenStatement === c && tests(p.expression)) return true;
			if (ts.isConditionalExpression(p) && p.whenTrue === c && tests(p.condition)) return true;
			if (
				ts.isBinaryExpression(p) &&
				p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
				p.right === c &&
				tests(p.left)
			) {
				return true;
			}
		}
		return false;
	};

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
		if (!isDate && !isNotDate(recv, 0) && (makesDates || usesLuxon)) {
			// A Date that went through an untyped place is text in native code, and the text of
			// \`toLocaleString\` of text is the text itself. So the value must be no Date for
			// certain (\`isNotDate\`), or the code must make no Date at all.
			block(
				'Date: toLocaleString of a value of unknown kind',
				'`toLocaleString` needs a value whose kind is known in code that makes dates.',
			);
			return true;
		}
		if (!isDate && Object.keys(a.options).some((k) => DATE_FORMAT_OPTIONS.has(k))) {
			// The options are those of a date, but the value has no known kind: a Date that went
			// through an untyped place is text in native code, and text has no date format.
			block(
				'Date: toLocaleString of a value of unknown kind',
				'`toLocaleString` with date options needs a value that is a Date for certain.',
			);
			return true;
		}
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
				if (n.arguments.length !== 1) {
					if (!hasRegex) return false;
					block(
						`${name} without a regular expression`,
						`\`${name}\` without one pattern has no native form.`,
					);
					return true;
				}
				toHelper(
					n,
					callee,
					name === 'match' ? 'strMatch' : name === 'matchAll' ? 'strMatchAll' : 'strSearch',
					name !== 'search' && usesMatchProps ? `, ${MATCHES}` : '',
				);
				if (!regexish(a0)) {
					// As JavaScript: a pattern that is not a regular expression makes one
					// (\`new RegExp(pattern)\`, with the flag \`g\` for \`matchAll\`).
					helpers.add('regexFrom');
					const o = seq;
					open(a0.getStart(sf), 'regexFrom(');
					closing(a0.getEnd(), a0.getEnd(), name === 'matchAll' ? ", 'g')" : ', undefined)', o);
				}
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

	// ---- hashes of the crypto module ----------------------------------------

	/**
	 * Names of the crypto module of Node.js: \`const crypto = require('crypto')\` and
	 * \`const { createHash, createHmac } = require('crypto')\`. The native form has the hashes
	 * MD5, SHA-1 and SHA-256 of text, with a digest as hex or base64 text, when the deployment
	 * allows the module (\`allowedModules\`).
	 */
	const cryptoNames = new Map<ts.Symbol, 'module' | CryptoFunction>();
	const cryptoDeclarations = new Set<ts.Node>();
	const isCryptoRequire = (e: ts.Expression | undefined): boolean => {
		if (e === undefined) return false;
		const x = stripParens(e);
		return (
			ts.isCallExpression(x) &&
			ts.isIdentifier(x.expression) &&
			x.expression.text === 'require' &&
			isFree(x.expression) &&
			x.arguments.length === 1 &&
			ts.isStringLiteralLike(x.arguments[0]) &&
			x.arguments[0].text === 'crypto'
		);
	};
	/** The hash function that a callee names, or null. */
	const cryptoCallee = (e: ts.Expression): CryptoFunction | null => {
		const x = stripParens(e);
		if (ts.isIdentifier(x)) {
			const sym = checker.getSymbolAtLocation(x);
			const kind = sym === undefined ? undefined : cryptoNames.get(sym);
			return kind === undefined || kind === 'module' ? null : kind;
		}
		if (!ts.isPropertyAccessExpression(x) || x.questionDotToken) return null;
		const name = x.name.text;
		if (!isCryptoFunction(name)) return null;
		const from = stripParens(x.expression);
		if (isCryptoRequire(from)) return name;
		const sym = ts.isIdentifier(from) ? checker.getSymbolAtLocation(from) : undefined;
		return sym !== undefined && cryptoNames.get(sym) === 'module' ? name : null;
	};
	/** True when the code uses a name of the crypto module for something without a native form. */
	let cryptoMisuse = false;
	// v1 gives an error for a module that the deployment does not allow: such code has no
	// native form, and the fallback host gives that error.
	const cryptoAllowed =
		input.allowedModules !== undefined &&
		(input.allowedModules.includes('*') || input.allowedModules.includes('crypto'));
	const usesCrypto =
		!input.nodeCode && cryptoAllowed && /\brequire\s*\(\s*['"`]crypto['"`]\s*\)/.test(input.code);
	if (usesCrypto && root.body) {
		const declare = (x: ts.Node): void => {
			if (ts.isVariableStatement(x) && x.declarationList.declarations.length === 1) {
				const d = x.declarationList.declarations[0];
				if (isCryptoRequire(d.initializer)) {
					if (ts.isIdentifier(d.name)) {
						const sym = checker.getSymbolAtLocation(d.name);
						if (sym !== undefined) {
							cryptoNames.set(sym, 'module');
							cryptoDeclarations.add(x);
							return;
						}
					} else if (ts.isObjectBindingPattern(d.name)) {
						let known = true;
						for (const el of d.name.elements) {
							const key = el.propertyName ?? el.name;
							const sym = ts.isIdentifier(el.name)
								? checker.getSymbolAtLocation(el.name)
								: undefined;
							if (
								el.dotDotDotToken ||
								el.initializer ||
								!ts.isIdentifier(key) ||
								sym === undefined ||
								!isCryptoFunction(key.text)
							) {
								known = false;
							} else cryptoNames.set(sym, key.text);
						}
						if (!known) cryptoMisuse = true;
						cryptoDeclarations.add(x);
						return;
					}
				}
			}
			ts.forEachChild(x, declare);
		};
		declare(root.body);
		// Each other use of such a name is the callee of a call that makes a hash.
		const uses = (x: ts.Node): void => {
			if (cryptoDeclarations.has(x)) return;
			if (ts.isCallExpression(x) && cryptoCallee(x.expression) !== null) {
				for (const arg of x.arguments) uses(arg);
				return;
			}
			if (ts.isIdentifier(x) && !isNameOf(x)) {
				const sym = checker.getSymbolAtLocation(x);
				if (sym !== undefined && cryptoNames.has(sym)) cryptoMisuse = true;
				return;
			}
			ts.forEachChild(x, uses);
		};
		uses(root.body);
	}
	const HASHES = new Set(['md5', 'sha1', 'sha256', 'sha384', 'sha512']);
	const literalText = (e: ts.Expression | undefined): string | null => {
		const x = e === undefined ? undefined : stripParens(e);
		return x !== undefined && ts.isStringLiteralLike(x) ? x.text : null;
	};
	// ---- Buffer values -------------------------------------------------------

	/**
	 * A Buffer of the code is a list of its bytes in native code (`buffer-helpers.ts`). The
	 * code must not see that: a Buffer has a native form only in a constant that holds it and
	 * in the places below, where a helper or a read of the list gives the result of Node.js.
	 *
	 * Makers: `Buffer.from(value, encoding)`, `Buffer.concat([...])`, `slice` and `subarray`
	 * of a Buffer, `digest()` of a hash, and the awaited `this.helpers.getBinaryDataBuffer`.
	 * Places: `toString(encoding)`, `equals`, `toJSON()`, `length`, a read of one byte,
	 * `Buffer.isBuffer`, `Buffer.byteLength`, `update` of a hash, the key of `createHmac`,
	 * and `timingSafeEqual`. Each other use of a Buffer keeps the node in the host.
	 */
	const bufVars = new Set<ts.Symbol>();
	/** Buffer expressions in a place that takes a Buffer. */
	const bufOk = new Set<ts.Node>();
	let usesBuffers = false;
	const isBufferGlobal = (e: ts.Expression): boolean => {
		const x = stripParens(e);
		return ts.isIdentifier(x) && x.text === 'Buffer' && isFree(x);
	};
	/** `this.helpers.getBinaryDataBuffer(index, name)` or the same call of the global `helpers`. */
	const isBinaryBufferCall = (e: ts.Expression): boolean =>
		ts.isCallExpression(e) &&
		!e.questionDotToken &&
		ts.isPropertyAccessExpression(e.expression) &&
		!e.expression.questionDotToken &&
		e.expression.name.text === 'getBinaryDataBuffer' &&
		requestKind(e.expression.expression) === 'helpers';
	const isBuf = (e: ts.Expression): boolean => {
		const x = stripParens(e);
		if (ts.isIdentifier(x)) {
			const sym = checker.getSymbolAtLocation(x);
			return sym !== undefined && bufVars.has(sym);
		}
		if (ts.isAwaitExpression(x)) return isBinaryBufferCall(stripParens(x.expression));
		if (!ts.isCallExpression(x) || x.questionDotToken) return false;
		if (x.arguments.some((a) => ts.isSpreadElement(a))) return false;
		const callee = x.expression;
		if (!ts.isPropertyAccessExpression(callee) || callee.questionDotToken) return false;
		const name = callee.name.text;
		if (isBufferGlobal(callee.expression)) {
			if (name === 'from') return x.arguments.length >= 1 && x.arguments.length <= 2;
			if (name !== 'concat' || x.arguments.length !== 1) return false;
			const list = stripParens(x.arguments[0]);
			return (
				ts.isArrayLiteralExpression(list) &&
				list.elements.every(
					(el) => !ts.isSpreadElement(el) && !ts.isOmittedExpression(el) && isBuf(el),
				)
			);
		}
		if (name === 'slice' || name === 'subarray') {
			return x.arguments.length <= 2 && isBuf(callee.expression);
		}
		return name === 'digest' && usesCrypto && x.arguments.length === 0;
	};
	if (!input.nodeCode && !input.expression && root.body) {
		// Constants that hold a Buffer, in the order of the source.
		const declare = (x: ts.Node): void => {
			if (
				ts.isVariableDeclaration(x) &&
				ts.isIdentifier(x.name) &&
				x.initializer !== undefined &&
				ts.isVariableDeclarationList(x.parent) &&
				(x.parent.flags & ts.NodeFlags.Const) !== 0 &&
				isBuf(x.initializer)
			) {
				const sym = checker.getSymbolAtLocation(x.name);
				if (sym !== undefined) bufVars.add(sym);
			}
			ts.forEachChild(x, declare);
		};
		declare(root.body);
	}
	/** The Buffer expression `n` without the parentheses and the `await` around it. */
	const bufOuter = (n: ts.Node): ts.Node => {
		let x = n;
		while (ts.isParenthesizedExpression(x.parent) || ts.isAwaitExpression(x.parent)) x = x.parent;
		return x;
	};
	/** True when the Buffer expression `n` is in a place that has a native form. */
	const bufPlace = (n: ts.Node): boolean => {
		for (let x = n; ; x = x.parent) {
			if (bufOk.has(x)) return true;
			if (!ts.isParenthesizedExpression(x.parent) && !ts.isAwaitExpression(x.parent)) break;
		}
		const x = bufOuter(n);
		const p = x.parent;
		if (ts.isPropertyAccessExpression(p) && p.expression === x) {
			return p.name.text === 'length' && !p.questionDotToken && !isAssignmentTarget(p);
		}
		if (ts.isElementAccessExpression(p) && p.expression === x) {
			const index = checker.getTypeAtLocation(p.argumentExpression);
			return (
				(index.flags & ts.TypeFlags.NumberLike) !== 0 &&
				!p.questionDotToken &&
				!isAssignmentTarget(p)
			);
		}
		if (ts.isVariableDeclaration(p) && p.initializer === x && ts.isIdentifier(p.name)) {
			const sym = checker.getSymbolAtLocation(p.name);
			return sym !== undefined && bufVars.has(sym);
		}
		return false;
	};
	const blockBuffer = (): void => {
		block(
			'Buffer',
			'A Buffer has a native form only in a constant, and as the value of `toString`, `length`, `equals`, `slice`, `subarray`, `toJSON`, `Buffer.concat`, a hash and `timingSafeEqual`.',
		);
	};
	/** Walks a Buffer expression in a place that takes a Buffer. */
	const emitBuf = (e: ts.Expression): void => {
		bufOk.add(e);
		bufOk.add(stripParens(e));
		visit(e);
	};
	/** Writes `fn(parts...tail)` in place of the call `n`; `parts` are parts of `n` in the order of the source. */
	const writeCall = (n: ts.CallExpression, fn: string, parts: ts.Expression[], tail = ''): void => {
		const o = seq;
		if (parts[0].getStart(sf) === n.getStart(sf)) open(n.getStart(sf), `${fn}(`);
		else replace(n.getStart(sf), parts[0].getStart(sf), `${fn}(`);
		for (let k = 0; k + 1 < parts.length; k++) {
			closing(parts[k].getEnd(), parts[k + 1].getStart(sf), ', ', o);
		}
		closing(parts[parts.length - 1].getEnd(), n.getEnd(), `${tail})`, o);
	};
	/** True when an argument of the call is a Buffer. */
	const usesBufferValue = (e: ts.Expression): boolean =>
		ts.isCallExpression(e) && e.arguments.some((a) => isBuf(a));
	/** A call that makes or reads a Buffer. True when it wrote the call or blocked it. */
	const bufferCall = (n: ts.CallExpression, callee: ts.PropertyAccessExpression): boolean => {
		if (input.nodeCode || input.expression) return false;
		const name = callee.name.text;
		const args = n.arguments;
		const receiver = callee.expression;
		const statics = isBufferGlobal(receiver);
		const binary = isBinaryBufferCall(n);
		const maker = isBuf(n);
		const reads =
			isBuf(receiver) && (name === 'toString' || name === 'equals' || name === 'toJSON');
		const hashes =
			usesCrypto && name === 'update' && args.length === 1 && isBuf(args[0]) && !statics;
		if (!statics && !binary && !maker && !reads && !hashes) return false;
		// The form `Buffer.from(v, a).toString(b)` has its own helper (below).
		if (
			name === 'toString' &&
			isBufferFrom(stripParens(receiver)) &&
			args.length <= 1 &&
			n.expression === callee &&
			!usesBufferValue(stripParens(receiver))
		) {
			return false;
		}
		usesBuffers = true;
		if (
			usesHttp ||
			n.questionDotToken ||
			callee.questionDotToken ||
			n.expression !== callee ||
			args.some((a) => ts.isSpreadElement(a)) ||
			((maker || binary) && !bufPlace(n))
		) {
			blockBuffer();
			return true;
		}
		const pad = (count: number): string => ', undefined'.repeat(Math.max(0, count - args.length));
		const walk = (list: readonly ts.Expression[]): void => {
			for (const a of list) {
				if (isBuf(a)) emitBuf(a);
				else visit(a);
			}
		};
		if (binary) {
			let call: ts.Node = n;
			while (ts.isParenthesizedExpression(call.parent)) call = call.parent;
			if (input.kind !== 'code' || args.length !== 2 || !ts.isAwaitExpression(call.parent)) {
				block(
					'this (this.helpers)',
					'`getBinaryDataBuffer` has a native form only as an awaited call with an item index and a name.',
				);
				return true;
			}
			if (hasThis(receiver) && !thisIsContext(n)) {
				block(
					'this (this.helpers)',
					'`this.helpers` in a function whose `this` can be another value has no native form.',
				);
				return true;
			}
			if (input.inlineBinary !== true) {
				block(
					'binary data of a stored file',
					'`getBinaryDataBuffer` needs the bytes of a file that the binary data store can hold. The runtime has no call that reads them.',
				);
				return true;
			}
			helpers.add('codeBinaryBytes');
			const o = seq;
			replace(n.getStart(sf), args[0].getStart(sf), `codeBinaryBytes(${P}in, `);
			closing(args[0].getEnd(), args[1].getStart(sf), ', ', o);
			closing(args[1].getEnd(), n.getEnd(), ')', o);
			visit(args[0]);
			visit(args[1]);
			return true;
		}
		if (statics) {
			if (name === 'from' && maker) {
				helpers.add('bufFrom');
				writeCall(n, 'bufFrom', [...args], pad(2));
				walk(args);
				return true;
			}
			if (name === 'concat' && maker) {
				const list = stripParens(args[0]);
				if (ts.isArrayLiteralExpression(list)) {
					helpers.add('bufConcat');
					writeCall(n, 'bufConcat', [args[0]]);
					walk(list.elements);
					return true;
				}
			}
			if (name === 'byteLength' && args.length >= 1 && args.length <= 2 && !isBuf(args[0])) {
				helpers.add('bufByteLength');
				writeCall(n, 'bufByteLength', [...args], pad(2));
				walk(args);
				return true;
			}
			if (
				name === 'isBuffer' &&
				args.length === 1 &&
				ts.isIdentifier(stripParens(args[0])) &&
				isBuf(args[0])
			) {
				replaceNode(n, 'true');
				return true;
			}
			blockBuffer();
			return true;
		}
		if (hashes) {
			helpers.add('hashUpdateBytes');
			writeCall(n, 'hashUpdateBytes', [receiver, args[0]]);
			visit(receiver);
			emitBuf(args[0]);
			return true;
		}
		if (name === 'digest') {
			helpers.add('hashDigestBytes');
			const o = seq;
			open(receiver.getStart(sf), 'hashDigestBytes(');
			closing(receiver.getEnd(), n.getEnd(), ')', o);
			visit(receiver);
			return true;
		}
		if (name === 'slice' || name === 'subarray') {
			helpers.add('bufSlice');
			writeCall(n, 'bufSlice', [receiver, ...args], pad(2));
			emitBuf(receiver);
			for (const a of args) visit(a);
			return true;
		}
		if (name === 'toString' && args.length <= 1) {
			helpers.add('bufText');
			writeCall(n, 'bufText', [receiver, ...args], pad(1));
			emitBuf(receiver);
			for (const a of args) visit(a);
			return true;
		}
		if (name === 'equals' && args.length === 1 && isBuf(args[0])) {
			helpers.add('bufEquals');
			writeCall(n, 'bufEquals', [receiver, args[0]]);
			emitBuf(receiver);
			emitBuf(args[0]);
			return true;
		}
		if (name === 'toJSON' && args.length === 0) {
			helpers.add('bufJson');
			writeCall(n, 'bufJson', [receiver]);
			emitBuf(receiver);
			return true;
		}
		blockBuffer();
		return true;
	};
	/** \`crypto.createHash('sha256')\` and \`crypto.createHmac('sha256', key)\`. True when it wrote the call. */
	const cryptoCall = (n: ts.CallExpression): boolean => {
		const kind = usesCrypto ? cryptoCallee(n.expression) : null;
		if (kind === null) return false;
		if (kind === 'timingSafeEqual') {
			const [a, b] = n.arguments;
			if (cryptoMisuse || usesHttp || n.arguments.length !== 2 || !isBuf(a) || !isBuf(b)) {
				block('require', '`timingSafeEqual` has a native form only for two Buffers.');
				return true;
			}
			usesBuffers = true;
			helpers.add('bufTimingEqual');
			writeCall(n, 'bufTimingEqual', [a, b]);
			emitBuf(a);
			emitBuf(b);
			return true;
		}
		const alg = literalText(n.arguments[0])?.toLowerCase() ?? null;
		if (
			cryptoMisuse ||
			alg === null ||
			!HASHES.has(alg) ||
			n.arguments.length !== (kind === 'createHash' ? 1 : 2)
		) {
			block('require', 'This use of the crypto module has no native form.');
			return true;
		}
		if (kind === 'createHash') {
			helpers.add('hashNew');
			replaceNode(n, `hashNew(${JSON.stringify(alg)})`);
			return true;
		}
		if (isBuf(n.arguments[1]) && !usesHttp) {
			usesBuffers = true;
			helpers.add('hmacNewBytes');
			replace(n.getStart(sf), n.arguments[1].getStart(sf), `hmacNewBytes(${JSON.stringify(alg)}, `);
			emitBuf(n.arguments[1]);
			return true;
		}
		helpers.add('hmacNew');
		replace(n.getStart(sf), n.arguments[1].getStart(sf), `hmacNew(${JSON.stringify(alg)}, `);
		visit(n.arguments[1]);
		return true;
	};
	/** \`hash.update(text)\` and \`hash.digest('hex')\` in code that makes hashes. True when it wrote the call. */
	const hashMethod = (
		n: ts.CallExpression,
		callee: ts.PropertyAccessExpression,
		name: string,
	): boolean => {
		if (!usesCrypto || (name !== 'update' && name !== 'digest')) return false;
		if (callee.questionDotToken) {
			block('optional chain', 'A method rewrite inside an optional chain has no native form.');
			return true;
		}
		if (name === 'update') {
			const encoding =
				n.arguments.length === 2 ? literalText(n.arguments[1])?.toLowerCase() : undefined;
			if (n.arguments.length !== 1 && encoding !== 'utf8' && encoding !== 'utf-8') {
				block('require', '`update` of a hash with this encoding has no native form.');
				return true;
			}
			helpers.add('hashUpdate');
			const o = seq;
			open(callee.expression.getStart(sf), 'hashUpdate(');
			closing(callee.expression.getEnd(), n.arguments[0].getStart(sf), ', ', o);
			closing(n.arguments[0].getEnd(), n.getEnd(), ')', o);
			visit(callee.expression);
			visit(n.arguments[0]);
			return true;
		}
		const encoding = n.arguments.length === 1 ? literalText(n.arguments[0]) : null;
		if (encoding !== 'hex' && encoding !== 'base64' && encoding !== 'base64url') {
			block('require', '`digest` of a hash as bytes has no native form.');
			return true;
		}
		helpers.add('hashDigest');
		const o = seq;
		open(callee.expression.getStart(sf), 'hashDigest(');
		closing(callee.expression.getEnd(), n.getEnd(), `, ${JSON.stringify(encoding)})`, o);
		visit(callee.expression);
		return true;
	};

	/**
	 * True when each error that the code can catch is an Error that the code made in its own
	 * realm: the code makes no requests, reads no other node by a pairing, and each \`throw\`
	 * gives a new Error or the error of a catch block. Then \`e instanceof Error\` is true.
	 */
	const ownErrors = ((): boolean => {
		if (
			usesHttp ||
			input.nodeCode ||
			/itemMatching|pairedItem|\$fromAI|\$evaluateExpression/.test(input.code)
		) {
			return false;
		}
		const ERRORS = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError']);
		let own = true;
		const scan = (x: ts.Node): void => {
			if (!own) return;
			if (ts.isThrowStatement(x)) {
				const v = stripParens(x.expression);
				const made =
					ts.isNewExpression(v) &&
					ts.isIdentifier(v.expression) &&
					ERRORS.has(v.expression.text) &&
					isFree(v.expression);
				const caught =
					ts.isIdentifier(v) &&
					(checker.getSymbolAtLocation(v)?.declarations ?? []).some(
						(d) => ts.isVariableDeclaration(d) && ts.isCatchClause(d.parent),
					);
				if (!made && !caught) own = false;
			}
			ts.forEachChild(x, scan);
		};
		scan(root);
		return own;
	})();

	/**
	 * \`await Promise.all(list)\` and \`await Promise.resolve(value)\` in code that makes no
	 * requests. No value of such code is a promise, and an async function runs to its end at
	 * its call. So the list is a copy of the list, and the value is the value. The call is not
	 * in a try block (v1 runs all callbacks before the error shows), and its argument has no
	 * \`await\` (v1 runs such callbacks in turns). True when it wrote the call.
	 */
	const promiseCall = (n: ts.CallExpression): boolean => {
		if (usesHttp || input.nodeCode || n.arguments.length !== 1) return false;
		const callee = stripParens(n.expression);
		if (
			!ts.isPropertyAccessExpression(callee) ||
			!ts.isIdentifier(callee.expression) ||
			callee.expression.text !== 'Promise' ||
			!isFree(callee.expression) ||
			(callee.name.text !== 'all' && callee.name.text !== 'resolve')
		) {
			return false;
		}
		let p: ts.Node = n.parent;
		while (ts.isParenthesizedExpression(p)) p = p.parent;
		if (!ts.isAwaitExpression(p) && !ts.isReturnStatement(p)) return false;
		for (let x: ts.Node = n; x !== root; x = x.parent) {
			if (ts.isTryStatement(x.parent) && x.parent.tryBlock === x) return false;
		}
		const arg = n.arguments[0];
		const hasAwait = (x: ts.Node): boolean =>
			ts.isAwaitExpression(x) || (ts.forEachChild(x, hasAwait) ?? false);
		if (ts.isSpreadElement(arg) || hasAwait(arg)) return false;
		const o = seq;
		const all = callee.name.text === 'all';
		if (all) helpers.add('promiseAll');
		replace(n.getStart(sf), arg.getStart(sf), all ? 'promiseAll(' : '(');
		closing(arg.getEnd(), n.getEnd(), ')', o);
		visit(arg);
		return true;
	};

	/**
	 * \`Math.max.apply(null, list)\` (also \`min\`) becomes \`mathMaxOf(applyList(list))\`, and
	 * \`String.fromCodePoint(a, b)\` becomes \`codePointText([a, b])\`. True when it wrote the call.
	 */
	const staticCall = (n: ts.CallExpression): boolean => {
		const callee = stripParens(n.expression);
		if (!ts.isPropertyAccessExpression(callee) || callee.questionDotToken) return false;
		const target = stripParens(callee.expression);
		const isStatic = (e: ts.Expression, object: string, names: string[]): boolean =>
			ts.isPropertyAccessExpression(e) &&
			ts.isIdentifier(e.expression) &&
			e.expression.text === object &&
			isFree(e.expression) &&
			names.includes(e.name.text);
		if (isStatic(callee, 'String', ['fromCodePoint'])) {
			helpers.add('codePointText');
			const o = seq;
			replace(n.getStart(sf), n.arguments.pos, 'codePointText([');
			closing(n.arguments.end, n.getEnd(), '])', o);
			for (const a of n.arguments) visit(a);
			return true;
		}
		if (
			callee.name.text === 'apply' &&
			isStatic(target, 'Math', ['max', 'min']) &&
			n.arguments.length === 2
		) {
			const self = stripParens(n.arguments[0]);
			const plain =
				self.kind === ts.SyntaxKind.NullKeyword ||
				(ts.isIdentifier(self) &&
					(self.text === 'undefined' || self.text === 'Math') &&
					isFree(self));
			if (!plain) return false;
			helpers.add('applyList');
			const list =
				ts.isPropertyAccessExpression(target) && target.name.text === 'max'
					? 'mathMaxOf'
					: 'mathMinOf';
			helpers.add(list);
			const o = seq;
			replace(n.getStart(sf), n.arguments[1].getStart(sf), `${list}(applyList(`);
			closing(n.arguments[1].getEnd(), n.getEnd(), '))', o);
			visit(n.arguments[1]);
			return true;
		}
		return false;
	};

	const visit = (n: ts.Node): void => {
		if (ts.isCallExpression(n) && (promiseCall(n) || staticCall(n))) return;
		if (cryptoDeclarations.has(n) && !cryptoMisuse) {
			replaceNode(n, '');
			return;
		}
		if (ts.isCallExpression(n) && cryptoCall(n)) return;
		// A constant for the request helper: its uses are requests, which need no such constant.
		if (requestDeclarations.has(n) && !requestNameMisuse) {
			replaceNode(n, '');
			return;
		}
		if (ts.isShorthandPropertyAssignment(n) && bufVars.size > 0) {
			const sym = checker.getShorthandAssignmentValueSymbol(n);
			if (sym !== undefined && bufVars.has(sym)) blockBuffer();
		}
		if (ts.isIdentifier(n) && bufVars.size > 0 && !isNameOf(n)) {
			const sym = checker.getSymbolAtLocation(n);
			const declares = ts.isVariableDeclaration(n.parent) && n.parent.name === n;
			if (sym !== undefined && bufVars.has(sym) && !declares) {
				usesBuffers = true;
				if (usesHttp || !bufPlace(n)) blockBuffer();
			}
		}
		const errName = errTextNodes.get(n);
		if (errName !== undefined) {
			// The error of a failed request is a plain object in v1: its text is another one.
			const helper = usesHttp ? 'errTextOf' : 'errText';
			helpers.add(helper);
			replaceNode(n, `${helper}(${errName})`);
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
			seq++;
		}
		// The traced form wraps this node after the walk (\`traceWraps\`): its calls go between the
		// rewrites of the nodes around it and the rewrites of the node itself.
		if (input.traced && ts.isExpression(n)) {
			lineSeq.set(n, seq);
			seq += 2;
		}
		if (ts.isTryStatement(n) && n.catchClause && readsError(n.catchClause)) {
			const plan = planCatch(n, checker, { dateVars, awaited, requests: usesHttp, ownErrors });
			if (typeof plan === 'string') {
				// Node code: the node compiler checks the error text against v1 (the verified list).
				if (!input.nodeCode)
					block(
						'catch reads the error',
						`The catch block reads the error, and the try block has ${plan}.`,
					);
			} else {
				plannedCatches.add(n.catchClause);
				const name = n.catchClause.variableDeclaration?.name.getText(sf) ?? 'e';
				for (const x of plan.errText) errTextNodes.set(x, name);
				for (const x of plan.isError) certain.set(x, true);
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
			// The compiler does not bind the name of a function expression inside it. The name goes
			// when the function does not use it and is the value of a declaration: there, V8 also
			// names the function after the variable, so the line of an error stays the same.
			const own = checker.getSymbolAtLocation(n.name);
			const fnName = n.name;
			const usesName = (x: ts.Node): boolean =>
				(ts.isIdentifier(x) && x !== fnName && checker.getSymbolAtLocation(x) === own) ||
				(ts.forEachChild(x, usesName) ?? false);
			let holder: ts.Node = n.parent;
			while (ts.isParenthesizedExpression(holder)) holder = holder.parent;
			if (
				own === undefined ||
				usesName(n) ||
				!ts.isVariableDeclaration(holder) ||
				!ts.isIdentifier(holder.name)
			) {
				block('named function expression', 'A named function expression has no native form.');
				return;
			}
			replaceNode(fnName, '');
		}
		if (isFunctionNode(n) && n !== root) {
			if (n.asteriskToken) block('generator', 'Generators have no native form.');
			if (ts.isMethodDeclaration(n)) {
				block('object method', 'Object literal methods have no native form.');
				return;
			}
			annotateParameters(n);
			const asyncMod = n.modifiers?.find((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
			// An async function of code that makes requests keeps `async`: its result type is a promise.
			if (!(asyncMod && keepsAsync)) annotateReturn(n);
			// No value in other native code is a promise, so an async function runs to its end at once.
			if (asyncMod && !keepsAsync) replace(asyncMod.getStart(sf), asyncMod.getEnd() + 1, '');
		}

		if (ts.isAwaitExpression(n) && !input.nodeCode) {
			const kind = awaited(n);
			if (kind === 'http') {
				const options = httpRequestOptions(n, isRequest, optionsConstant);
				if (requestNameMisuse) {
					block(
						'this.helpers.httpRequest',
						'A constant that holds `this`, the helpers or the request helper has another use.',
					);
					return;
				}
				if (typeof options !== 'string' && options !== null && !fullResponseFits(n, options)) {
					block(
						'this.helpers.httpRequest',
						'The full response of `this.helpers.httpRequest` has a native form only for reads of its `body` and `statusCode`.',
					);
					return;
				}
				if (hasThis(n.expression) && !thisIsContext(n)) {
					block(
						'this.helpers.httpRequest',
						'`this.helpers.httpRequest` in a function whose `this` can be another value has no native form.',
					);
					return;
				}
				if (typeof options === 'string' || options === null) {
					block(
						'this.helpers.httpRequest',
						`\`this.helpers.httpRequest\` with ${options ?? 'this call'} has no native form.`,
					);
					return;
				}
				// \`await this.helpers.httpRequest({ … })\` becomes \`await __wf_http({ … })\` (\`emit.ts\`).
				const call = stripParens(n.expression);
				if (ts.isCallExpression(call)) {
					replace(call.expression.getStart(sf), call.expression.getEnd(), HTTP);
				}
				// Options in a constant: the walk writes them at the declaration.
				const inline = ts.isCallExpression(call) && stripParens(call.arguments[0]) === options;
				if (inline) for (const p of options.properties) visit(p);
				return;
			}
			if (kind === null) {
				// The value is not a promise: \`await\` gives the value itself.
				const at = n.getStart(sf);
				replace(at, n.expression.getStart(sf), '');
			}
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
			const typedFunction =
				ts.isIdentifier(n.name) && typedDates ? localFunctionOf(n.name) : undefined;
			if (
				typedFunction !== undefined &&
				(dateFunctions.has(typedFunction) ||
					typedFunction.parameters.some((p) => dateParams.has(p)))
			) {
				// The constant keeps the type of its function, with the Date types.
			} else if (blockScoped && !loopHead && !n.type && !isDateStart(n.initializer)) {
				insert(n.name.getEnd(), ': Json', 0);
			} else if (blockScoped && isDateStart(n.initializer) && ts.isIdentifier(n.name)) {
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
			if (used && !plannedCatches.has(n) && !input.nodeCode)
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
			if (op === ts.SyntaxKind.InstanceOfKeyword) {
				// The task runner of v1 runs the code in its own realm. A Date that the code makes is
				// a Date of that realm, and a value of the input is JSON, which has no Date. Arrays
				// and objects of the input come from another realm, so those tests stay in the host.
				const right = stripParens(n.right);
				const left = stripParens(n.left);
				const known = certain.get(n);
				if (known !== undefined) {
					replaceNode(n, String(known));
					return;
				}
				const date = ts.isIdentifier(right) && right.text === 'Date' && isFree(right);
				if (date && ts.isIdentifier(left) && isDateValue(left)) {
					replaceNode(n, 'true');
					return;
				}
				if (date && !isDateValue(left) && isNotDate(left, 0)) {
					// The left side runs, for an error of its reads.
					const o = seq;
					open(n.getStart(sf), '((');
					closing(n.left.getEnd(), n.getEnd(), ') === 0 && false)', o);
					visit(n.left);
					return;
				}
				block('instanceof', '`instanceof` has no native form.');
			}
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
				const plainArgs = !n.arguments.some((x) => ts.isSpreadElement(x));
				if (bufferCall(n, callee)) return;
				if (
					name === 'call' &&
					n.arguments.length === 2 &&
					plainArgs &&
					!n.questionDotToken &&
					isPrototypeHasOwn(callee.expression)
				) {
					// \`Object.prototype.hasOwnProperty.call(x, k)\` becomes \`hasOwnOf(x, k)\`.
					const ownHelper = ownHelperFor(n.arguments[1]);
					helpers.add(ownHelper);
					replace(n.getStart(sf), n.arguments[0].getStart(sf), `${ownHelper}(`);
					for (const x of n.arguments) visit(x);
					return;
				}
				const made = stripParens(callee.expression);
				if (
					name === 'fill' &&
					n.arguments.length <= 1 &&
					plainArgs &&
					!ts.isOptionalChain(callee) &&
					(ts.isCallExpression(made) || ts.isNewExpression(made)) &&
					ts.isIdentifier(made.expression) &&
					made.expression.text === 'Array' &&
					isFree(made.expression) &&
					made.arguments?.length === 1 &&
					!ts.isSpreadElement(made.arguments[0])
				) {
					// \`Array(n).fill(v)\` becomes \`arrayFill(arrayOfLength(n), v)\`: the same order of evaluation.
					helpers.add('arrayOfLength');
					helpers.add('arrayFill');
					const o = seq;
					const size = made.arguments[0];
					replace(n.getStart(sf), size.getStart(sf), 'arrayFill(arrayOfLength(');
					if (n.arguments.length === 0) closing(size.getEnd(), n.getEnd(), '), undefined)', o);
					else {
						closing(size.getEnd(), n.arguments[0].getStart(sf), '), ', o);
						visit(n.arguments[0]);
					}
					visit(size);
					return;
				}
				if (
					(name === 'toLocaleLowerCase' || name === 'toLocaleUpperCase') &&
					n.arguments.length === 0 &&
					!ts.isOptionalChain(callee)
				) {
					// Without a locale, the case rules are those of the root locale, as in \`toLowerCase\`.
					toHelper(n, callee, 'localeCaseOf', name === 'toLocaleUpperCase' ? ', true' : ', false');
					visit(callee.expression);
					return;
				}
				if (MUTATING_METHODS.has(name)) noteMutation(callee.expression);
				if (DATE_READERS.has(name) && !isDateValue(callee.expression)) {
					const receiver = stripParens(callee.expression);
					const fromLuxon =
						ts.isCallExpression(receiver) &&
						ts.isPropertyAccessExpression(receiver.expression) &&
						receiver.expression.name.text === 'toJSDate';
					if (
						!input.nodeCode &&
						!input.expression &&
						!fromLuxon &&
						!inDeadDateBranch(n, receiver)
					) {
						// No value of the code is a Date here: JavaScript throws a TypeError.
						block(
							'Date: method of a value of unknown kind',
							`\`${name}\` is a Date method, and its receiver is no Date for certain.`,
						);
					}
					const o = seq;
					open(callee.expression.getStart(sf), 'new Date(');
					closing(callee.expression.getEnd(), callee.expression.getEnd(), ')', o);
				}
				const alias = own(METHOD_ALIASES, name);
				if (alias) replaceNode(callee.name, alias);
				const methodHelper =
					name === 'hasOwnProperty' ? ownHelperFor(n.arguments[0]) : own(METHOD_HELPERS, name);
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
				if (name === 'toString' && !isDateValue(callee.expression)) {
					toHelper(
						n,
						callee,
						n.arguments.length === 0 ? (usesLuxon ? 'luxToString' : 'toStringOf') : 'toStringRadix',
					);
				}
				if (hashMethod(n, callee, name)) return;
				if (luxMethod(n, callee, name)) return;
				if (localeMethod(n, callee, name)) return;
				if (hasIntl && (name === 'format' || name === 'formatToParts') && n.arguments.length <= 1) {
					toHelper(n, callee, 'intlFormat', name === 'formatToParts' ? ', true' : ', false');
					// JavaScript reads the time value of a Date here.
					for (const x of n.arguments) {
						if (isDateValue(x)) closing(x.getEnd(), x.getEnd(), '.getTime()', seq++);
					}
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
					const staticHelper =
						full === 'Object.hasOwn' ? ownHelperFor(n.arguments[1]) : own(STATIC_HELPERS, full);
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
						nondeterministicRandom = true;
						replaceNode(n, 'ctx.random()');
						return;
					}
					if (g === 'Date' && name === 'now') nondeterministic = true;
					if (g === 'Math') {
						// JavaScript reads the time value of a Date here.
						for (const a of n.arguments) {
							if (isDateValue(a)) closing(a.getEnd(), a.getEnd(), '.getTime()', seq++);
						}
					}
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
			if (entry?.split && readsParts) {
				// The helpers give the text of \`format\` of this Node.js, and not its parts.
				block(
					'Intl: formatToParts',
					`\`formatToParts\` of this \`Intl.${kind}\` has no native form on this Node.js.`,
				);
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
		if (input.expression?.globals.has(name)) return true;
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
				if (parent.arguments.length === 0 && input.itemsOfFirstOnly !== undefined) {
					// As v1: the input items, and only the first one when the node before runs once.
					replaceNode(parent, input.itemsOfFirstOnly ? `${ITEMS}.slice(0, 1)` : ITEMS);
					return false;
				}
				// \`$items(name, 0)\`: output 0 is the default, so it is \`$items(name)\`.
				const [first, second] = parent.arguments;
				const firstOutput =
					parent.arguments.length === 2 && ts.isNumericLiteral(second) && second.text === '0';
				const nodeName = firstOutput ? constText(first) : stringArgument(parent);
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
		// \`await Promise.all(list.map(async (x) => …))\` of code that makes requests: the compiler
		// accepts only this form, and the requests start in the order of the list, as in v1.
		const awaitedAll =
			usesHttp &&
			name === 'Promise' &&
			member &&
			parent.name.text === 'all' &&
			ts.isCallExpression(parent.parent) &&
			parent.parent.expression === parent &&
			ts.isAwaitExpression(parent.parent.parent);
		if (awaitedAll) return true;
		const host = own(HOST_GLOBALS, name);
		if (host) {
			block(host, `\`${name}\` has no native form.`);
			return false;
		}
		if (!SUBSET_GLOBALS.has(name) && !input.nodeCode?.globals.has(name)) {
			block(
				name.startsWith('$') ? name : `global ${name}`,
				`\`${name}\` is not defined for native code.`,
			);
			return false;
		}
		return true;
	};

	/**
	 * Adds the lines of the traced form.
	 *
	 * v1's task runner adds ` [line N]` to the message of an error. N comes from the stack of
	 * the error: the line of the innermost frame of a function with a name (a declaration, or
	 * a function that is the value of a variable, an assignment or a member), else the line
	 * in the code itself. A frame of a function without a name does not count: an error in a
	 * callback has the line of the call that ran the callback.
	 *
	 * So the code itself and each function with a name keep their line in a variable, and
	 * give it to an error that leaves them without a line (`codeAt`). A statement sets its
	 * line. In a statement of more than one line, each read of a member and each call sets
	 * its own line just before it runs: `__wf_m(line, value)` gives the value back. A new
	 * Error gets the line of `new`, as V8 makes the stack there. A callback has no lines.
	 */
	const lineValues = new Map<ts.Node, number>();
	const lineErrors = new Map<ts.Node, number>();
	/** Method checks of the traced form, for the receivers that have none from a catch plan. */
	const lineChecks = new Map<ts.Node, { method: string; text: string }>();
	/** The value of \`seq\` when the walk came to a node that the traced form wraps. */
	const lineSeq = new Map<ts.Node, number>();
	const traceLines = (body: ts.Block): void => {
		helpers.add('codeAt');
		const lineOf = (pos: number): number => sf.getLineAndCharacterOfPosition(pos).line;
		const through = (x: ts.Node): ts.Node => {
			let p = x.parent;
			while (ts.isParenthesizedExpression(p)) p = p.parent;
			return p;
		};
		const hasName = (fn: ts.Node): boolean => {
			if (ts.isFunctionDeclaration(fn)) return true;
			if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return false;
			if (ts.isFunctionExpression(fn) && fn.name) return true;
			const p = through(fn);
			return (
				(ts.isVariableDeclaration(p) && p.initializer !== undefined) ||
				(ts.isPropertyAssignment(p) && p.initializer !== undefined) ||
				(ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken)
			);
		};
		const PRELUDE = (line: number): string =>
			` let ${LINE}: number = ${line}; const ${MARK} = (${P}n: number, ${P}v: Json): Json => { ${LINE} = ${P}n; return ${P}v; }; const ${SET} = (${P}n: number): boolean => { ${LINE} = ${P}n; return true; }; try {`;
		const HANDLER = ` } catch (${P}e) { throw codeAt(${P}e, ${LINE}); }`;
		// The walk writes the calls around these values, so they nest with its other rewrites.
		const wrap = (x: ts.Expression, line: number): void => {
			// A global (\`JSON\`, \`Math\`) is not a value that the compiler takes in a call.
			if (x.kind === ts.SyntaxKind.ThisKeyword || (ts.isIdentifier(x) && isFree(x))) return;
			lineValues.set(x, line);
		};
		const ERRORS = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError']);
		/** The braces to close after a semicolon, by the place after it. */
		const closers = new Map<number, number>();
		/** The expressions of a statement of more than one line: the lines of its own places. */
		const expression = (x: ts.Node, lines: boolean): void => {
			if (isFunctionNode(x)) {
				func(x);
				return;
			}
			if (ts.isNewExpression(x) && ts.isIdentifier(x.expression) && ERRORS.has(x.expression.text)) {
				// V8 makes the stack of an error where the code makes the error.
				lineErrors.set(x, lineOf(x.getStart(sf)));
			}
			if (lines) {
				if (ts.isCallExpression(x) || ts.isNewExpression(x)) {
					const callee = stripParens(x.expression);
					const member = ts.isPropertyAccessExpression(callee) ? callee : undefined;
					// V8 gives a call the place of the name of the member, else the place after the callee.
					const line = member
						? lineOf(member.name.getStart(sf))
						: ts.isNewExpression(x)
							? lineOf(x.getStart(sf))
							: lineOf(callee.getEnd());
					const args = x.arguments ?? [];
					const last = args[args.length - 1];
					if (last !== undefined) wrap(ts.isSpreadElement(last) ? last.expression : last, line);
					else if (!member && !ts.isIdentifier(callee)) wrap(callee, line);
					if (member) wrap(member.expression, line);
				} else if (ts.isPropertyAccessExpression(x)) {
					const p = through(x);
					const called =
						(ts.isCallExpression(p) || ts.isNewExpression(p)) && stripParens(p.expression) === x;
					if (!called) wrap(x.expression, lineOf(x.name.getStart(sf)));
				} else if (ts.isElementAccessExpression(x)) {
					wrap(x.expression, lineOf(x.argumentExpression.getStart(sf)));
				}
			}
			ts.forEachChild(x, (c) => expression(c, lines));
		};
		const own = (e: ts.Expression | undefined, line: number): void => {
			if (e === undefined) return;
			const start = lineOf(e.getStart(sf));
			expression(e, start !== line || start !== lineOf(e.getEnd()));
		};
		const statement = (st: ts.Statement): void => {
			if (ts.isBlock(st)) {
				st.statements.forEach(statement);
				return;
			}
			if (ts.isFunctionDeclaration(st)) {
				func(st);
				return;
			}
			const line = lineOf(st.getStart(sf));
			const list = ts.isBlock(st.parent) || ts.isCaseOrDefaultClause(st.parent);
			if (list) insert(st.getStart(sf), `${LINE} = ${line}; `, -3_000_000);
			else {
				insert(st.getStart(sf), `{ ${LINE} = ${line}; `, -3_000_000);
				// The next statement can start right after the semicolon: the brace takes its place.
				if (text.charAt(st.getEnd() - 1) === ';') {
					closers.set(st.getEnd(), (closers.get(st.getEnd()) ?? 0) + 1);
				} else insert(st.getEnd(), ' }', 3_000_000);
			}
			/** The condition of a loop runs again after the body: it sets the line each time. */
			const again = (cond: ts.Expression | undefined): void => {
				if (cond === undefined) return;
				insert(cond.getStart(sf), `${SET}(${lineOf(cond.getStart(sf))}) && (`, -2_500_000);
				insert(cond.getEnd(), ')', 2_500_000);
				own(cond, line);
			};
			if (ts.isExpressionStatement(st)) own(st.expression, line);
			else if (ts.isVariableStatement(st)) {
				for (const d of st.declarationList.declarations) own(d.initializer, line);
			} else if (ts.isReturnStatement(st) || ts.isThrowStatement(st)) own(st.expression, line);
			else if (ts.isIfStatement(st)) {
				own(st.expression, line);
				statement(st.thenStatement);
				if (st.elseStatement) statement(st.elseStatement);
			} else if (ts.isWhileStatement(st) || ts.isDoStatement(st)) {
				again(st.expression);
				statement(st.statement);
			} else if (ts.isForStatement(st)) {
				if (st.initializer && ts.isVariableDeclarationList(st.initializer)) {
					for (const d of st.initializer.declarations) own(d.initializer, line);
				} else if (st.initializer) own(st.initializer, line);
				again(st.condition);
				own(st.incrementor, line);
				statement(st.statement);
			} else if (ts.isForOfStatement(st) || ts.isForInStatement(st)) {
				own(st.expression, line);
				statement(st.statement);
			} else if (ts.isSwitchStatement(st)) {
				own(st.expression, line);
				for (const clause of st.caseBlock.clauses) {
					if (ts.isCaseClause(clause)) own(clause.expression, line);
					clause.statements.forEach(statement);
				}
			} else if (ts.isTryStatement(st)) {
				statement(st.tryBlock);
				if (st.catchClause) {
					const name = st.catchClause.variableDeclaration?.name;
					// The error of this try block gets its line here: the code can throw it again later.
					if (name && ts.isIdentifier(name)) {
						insert(
							st.catchClause.block.getStart(sf) + 1,
							` codeAt(${name.text}, ${LINE});`,
							-900_000,
						);
					}
					statement(st.catchClause.block);
				}
				if (st.finallyBlock) statement(st.finallyBlock);
			} else if (ts.isLabeledStatement(st)) statement(st.statement);
		};
		/** A function: one with a name keeps its own line; a callback has no lines. */
		const func = (fn: ts.FunctionLikeDeclaration): void => {
			const fnBody = fn.body;
			if (fnBody === undefined) return;
			if (!hasName(fn)) {
				// Only the functions with a name inside it have lines.
				const find = (x: ts.Node): void => {
					if (isFunctionNode(x)) func(x);
					else ts.forEachChild(x, find);
				};
				ts.forEachChild(fnBody, find);
				return;
			}
			const line = lineOf(fnBody.getStart(sf));
			if (ts.isBlock(fnBody)) {
				insert(fnBody.getStart(sf) + 1, PRELUDE(line), -4_000_000);
				insert(fnBody.getEnd() - 1, HANDLER, 3_500_000);
				fnBody.statements.forEach(statement);
			} else {
				insert(fnBody.getStart(sf), `{${PRELUDE(line)} return `, -4_000_000);
				insert(fnBody.getEnd(), `;${HANDLER} }`, 3_500_000);
				own(fnBody, -1);
			}
		};
		// The code itself is the frame of v1's wrapper function.
		insert(WRAP_PREFIX.length, PRELUDE(1).trimStart() + ' ', -4_000_000);
		insert(text.length - WRAP_SUFFIX.length, `\n${HANDLER.trimStart()}`, 3_500_000);
		body.statements.forEach(statement);
		// Statements that end at the same semicolon close their braces there, in one edit.
		for (const [end, count] of closers) {
			edits.push({ start: end - 1, end, text: `;${' }'.repeat(count)}`, order: 3_000_000 });
		}
	};

	/**
	 * Writes the calls of the traced form around values: the method check (\`mcheck\`), the line
	 * of the read or call that follows the value (\`__wf_m\`), and the line of a new Error.
	 *
	 * A value can be inside text that the walk replaced as a whole (\`$input.first().json\`
	 * becomes one native expression). Then a call around the value has no place. The line goes
	 * before the smallest expression around it that the walk kept: \`(__wf_s(line) ? e :
	 * undefined)\` sets the line and then gives \`e\`. The method check has no such form: without
	 * it, the text of an error can differ, which \`errorTextGap\` records.
	 */
	const traceWraps = (): void => {
		const replaced = edits.filter((e) => e.end > e.start);
		const cut = (at: number): boolean => replaced.some((e) => e.start < at && at < e.end);
		const free = (x: ts.Node): boolean => !cut(x.getStart(sf)) && !cut(x.getEnd());
		const around = (x: ts.Node, seq0: number, level: number, before: string, after: string) => {
			// The space keeps a keyword before the value apart (\`return(x)\`).
			insert(x.getStart(sf), ` ${before}`, -2_000_000 + seq0 + level);
			insert(x.getEnd(), after, 1_000_000 - seq0 - level);
		};
		/** True when the code uses \`x\` as a place (a callee, a target), not as a value. */
		const isPlace = (x: ts.Node): boolean => {
			const p = x.parent;
			return (
				((ts.isCallExpression(p) || ts.isNewExpression(p)) && p.expression === x) ||
				(ts.isBinaryExpression(p) &&
					p.left === x &&
					p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
					p.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
				ts.isDeleteExpression(p) ||
				ts.isPrefixUnaryExpression(p) ||
				ts.isPostfixUnaryExpression(p) ||
				ts.isSpreadElement(x) ||
				ts.isTaggedTemplateExpression(p)
			);
		};
		const before = new Map<ts.Node, number>();
		for (const [n, line] of lineValues) {
			const seq0 = lineSeq.get(n);
			// A typed Date keeps its type only without a call around it.
			if (seq0 !== undefined && free(n)) {
				if (!(ts.isExpression(n) && isDateValue(n))) around(n, seq0, 0.5, `${MARK}(${line}, `, ')');
				continue;
			}
			// The walk replaced the text around this value: the line goes before a kept expression.
			let a: ts.Node = n.parent;
			while (
				a !== root &&
				!(ts.isExpression(a) && lineSeq.has(a) && free(a) && !isPlace(a) && !isDateValue(a))
			) {
				a = a.parent;
			}
			if (a === root || (before.has(a) && before.get(a) !== line)) {
				block('line of an error', 'A value of the traced form has no place for its line.');
				continue;
			}
			before.set(a, line);
		}
		for (const [a, line] of before) {
			around(a, lineSeq.get(a) ?? 0, -0.5, `(${SET}(${line}) ? `, ' : undefined)');
		}
		for (const [n, line] of lineErrors) {
			const seq0 = lineSeq.get(n);
			if (seq0 !== undefined && free(n)) around(n, seq0, 0.75, 'codeAt(', `, ${line})`);
		}
		for (const [n, check] of lineChecks) {
			if (methodChecks.has(n) || bufOk.has(n)) continue;
			const seq0 = lineSeq.get(n);
			if (seq0 === undefined || !free(n) || (ts.isExpression(n) && isDateValue(n))) {
				errorTextGap ??= 'a method call that the traced form cannot check';
				continue;
			}
			helpers.add('mcheck');
			around(
				n,
				seq0,
				0.25,
				'mcheck(',
				`, ${JSON.stringify(check.method)}, ${JSON.stringify(check.text)})`,
			);
		}
	};

	if (root.body) planRestOf(root.body);
	// The traced form checks the receiver of each method call, so a call of a value without
	// the method fails with V8's text. The plan also tells if every error has V8's text.
	let errorTextGap: string | null = null;
	if (!input.nodeCode && root.body) {
		const { plan, reason } = planBody(root.body, checker, {
			dateVars,
			awaited,
			requests: usesHttp,
		});
		errorTextGap = reason;
		if (input.traced) {
			for (const c of plan.checks) lineChecks.set(c.receiver, { method: c.method, text: c.text });
		}
	}
	if (input.traced && root.body) traceLines(root.body);
	if (root.body) for (const st of root.body.statements) visit(st);
	// V8's text of an error is certain only for the operations that \`catch-check.ts\` knows.
	if (usesBuffers && plannedCatches.size > 0) {
		block(
			'catch reads the error',
			'The catch block reads the error, and the code has Buffer values.',
		);
	}

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

	if (input.traced) traceWraps();

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
	const readOnly = provesReadOnly(root, checker, input.mode);
	// In v1, \`$input\`, \`$json\` and \`$items()\` give the input items through copies that
	// take a change only for themselves, and \`items\` and \`item\` give the items themselves. So a
	// change through the first is not seen through the second. Native code has one list:
	// code that uses both and can change an item stays in the host.
	if (!input.nodeCode && input.kind === 'code' && !readOnly && usesBothItemViews(root, checker)) {
		blockers.push({
			feature: 'items and $input in code that changes items',
			message:
				'The code uses `items` or `item` and also `$input`, `$json` or `$items()`, and it can change an item.',
		});
	}
	const translation = {
		body,
		nodes,
		helpers,
		mutates,
		usesHttp,
		repeatable: !usesHttp && !nondeterministicRandom && !/getWorkflowStaticData/.test(input.code),
		errorTextGap,
		readOnly,
		usesFirstJson,
		nondeterministic,
		usesCollections: usesCollections || usesLuxon,
		zones,
		usesAllNodes,
		allNodes: usesAllNodes ? (input.allNodes ?? []) : [],
		usesMatchProps,
		typedDates,
	};
	if (blockers.length > 0) return { ok: false, blockers, partial: translation };
	return { ok: true, translation };
}
