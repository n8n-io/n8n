/**
 * The Date subset (spec section 4.5).
 *
 * The subset has no classes, so a Date is a number at run time: the time
 * value in ms since the epoch, or NaN. The compiler uses the type checker to
 * find the expressions of type `Date`:
 *
 * - `new Date(...)` and Date methods become library calls (CALLN).
 * - A Date that goes into an untyped or JSON place (an object or array
 *   literal, `JSON.stringify`, a ctx call, the return value of `run`, an
 *   `unknown` variable) becomes `Date.json(d)`, which is `d.toJSON()`.
 * - A Date in a string place (template, `+`, `String(d)`) becomes
 *   `Date.text(d)`, which is `d.toString()`.
 *
 * A number cannot act as an object with identity. The rules below reject the
 * uses where a number and a Date object give different results (WL013).
 */
import ts from 'typescript';

import {
	ctxCallMethod,
	findNodeDefinition,
	findWorkflowDefinition,
	isFunctionLike,
	isPromiseAll,
	skipOuter,
} from './analysis.ts';
import { LIB_FILE, SDK_FILE } from './program.ts';

export const DATE_CODE = 'WL013';

export const DATE_STATICS: ReadonlySet<string> = new Set(['now', 'UTC', 'parse', 'zoneOffset']);

const GETTERS = [
	'getTime',
	'valueOf',
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
];

const FORMATTERS = [
	'toISOString',
	'toJSON',
	'toString',
	'toUTCString',
	'toGMTString',
	'toDateString',
	'toTimeString',
];

export const LOCALE_METHODS: ReadonlySet<string> = new Set([
	'toLocaleString',
	'toLocaleDateString',
	'toLocaleTimeString',
]);

export const DATE_SETTERS: ReadonlySet<string> = new Set([
	'setTime',
	'setMilliseconds',
	'setUTCMilliseconds',
	'setSeconds',
	'setUTCSeconds',
	'setMinutes',
	'setUTCMinutes',
	'setHours',
	'setUTCHours',
	'setDate',
	'setUTCDate',
	'setMonth',
	'setUTCMonth',
	'setFullYear',
	'setUTCFullYear',
]);

export const DATE_METHODS: ReadonlySet<string> = new Set([
	...GETTERS,
	...FORMATTERS,
	...LOCALE_METHODS,
	...DATE_SETTERS,
]);

/** CALLN names of the Date subset (spec section 4.3). */
export const DATE_FUNCTIONS: ReadonlySet<string> = new Set([
	'Date.fromValue',
	'Date.fromParts',
	'Date.UTC',
	'Date.parse',
	'Date.json',
	'Date.text',
	...[...DATE_METHODS].map((m) => `Date.prototype.${m}`),
]);

// ------------------------------------------------------------------ types

function isDateType(type: ts.Type): boolean {
	const s = type.getSymbol();
	return (
		s !== undefined &&
		s.name === 'Date' &&
		(s.declarations ?? []).some((d) => d.getSourceFile().fileName === LIB_FILE)
	);
}

/**
 * `date`: Date. `maybe`: Date with null or undefined. `mixed`: Date with
 * other types, which the subset rejects. `none`: no Date at the top level.
 */
export type DateKind = 'none' | 'date' | 'maybe' | 'mixed';

const NULLISH = ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void;

export function dateKindOf(type: ts.Type): DateKind {
	if (type.flags & ts.TypeFlags.Any) return 'none';
	if (type.isUnion()) {
		let date = false;
		let other = false;
		let nullish = false;
		for (const t of type.types) {
			if (t.flags & NULLISH) nullish = true;
			else if (isDateType(t)) date = true;
			else other = true;
		}
		if (!date) return 'none';
		if (other) return 'mixed';
		return nullish ? 'maybe' : 'date';
	}
	return isDateType(type) ? 'date' : 'none';
}

const dateFiles = new WeakMap<ts.SourceFile, boolean>();

/**
 * True when the file names `Date`. Only the Date constructor makes Date
 * values, so a file without it has none. This gate saves a type query for
 * each expression, which is most of the compile time.
 */
export function mayHaveDates(sf: ts.SourceFile): boolean {
	let v = dateFiles.get(sf);
	if (v === undefined) {
		v = /\bDate\b/.test(sf.text);
		dateFiles.set(sf, v);
	}
	return v;
}

const K = ts.SyntaxKind;
const NEVER_DATE = new Set<ts.SyntaxKind>([
	K.ObjectLiteralExpression,
	K.ArrayLiteralExpression,
	K.ArrowFunction,
	K.FunctionExpression,
	K.ClassExpression,
	K.StringLiteral,
	K.NumericLiteral,
	K.BigIntLiteral,
	K.NoSubstitutionTemplateLiteral,
	K.TemplateExpression,
	K.TaggedTemplateExpression,
	K.RegularExpressionLiteral,
	K.TrueKeyword,
	K.FalseKeyword,
	K.NullKeyword,
	K.TypeOfExpression,
	K.VoidExpression,
	K.DeleteExpression,
	K.PrefixUnaryExpression,
	K.PostfixUnaryExpression,
]);
/** Binary operators whose result is a value of the left or right operand. */
const PASS_THROUGH = new Set<ts.SyntaxKind>([
	K.BarBarToken,
	K.AmpersandAmpersandToken,
	K.QuestionQuestionToken,
	K.EqualsToken,
	K.BarBarEqualsToken,
	K.AmpersandAmpersandEqualsToken,
	K.QuestionQuestionEqualsToken,
	K.CommaToken,
]);

/**
 * True when the syntax alone shows the value is not a Date. The type query
 * re-checks the whole subtree of an expression, so this test saves most of
 * the compile time on large object literals and functions.
 */
export function cannotBeDate(node: ts.Node): boolean {
	if (NEVER_DATE.has(node.kind)) return true;
	return ts.isBinaryExpression(node) && !PASS_THROUGH.has(node.operatorToken.kind);
}

export function dateKind(checker: ts.TypeChecker, node: ts.Node): DateKind {
	if (cannotBeDate(node) || !mayHaveDates(node.getSourceFile())) return 'none';
	return dateKindOf(checker.getTypeAtLocation(node));
}

/** True when the expression is a Date (perhaps null or undefined) at run time. */
export function isDateish(checker: ts.TypeChecker, node: ts.Node): boolean {
	const k = dateKind(checker, node);
	return k === 'date' || k === 'maybe';
}

function isDateishType(type: ts.Type | undefined): boolean {
	if (!type) return false;
	const k = dateKindOf(type);
	return k === 'date' || k === 'maybe';
}

/** True for an array (or tuple) type that holds Dates, at any depth. */
export function arrayHoldsDates(checker: ts.TypeChecker, type: ts.Type, depth = 0): boolean {
	if (depth > 8) return false;
	const parts = type.isUnion() ? type.types : [type];
	for (const t of parts) {
		if (!(checker.isArrayType(t) || checker.isTupleType(t))) continue;
		const ref = t as ts.TypeReference;
		for (const arg of checker.getTypeArguments(ref)) {
			if (dateKindOf(arg) !== 'none' || arrayHoldsDates(checker, arg, depth + 1)) return true;
		}
	}
	return false;
}

function isGlobalDate(checker: ts.TypeChecker, node: ts.Node): boolean {
	if (!ts.isIdentifier(node) || node.text !== 'Date') return false;
	const s = checker.getSymbolAtLocation(node);
	return (s?.declarations ?? []).every((d) => d.getSourceFile().fileName === LIB_FILE);
}

/** `new Date(...)`. */
export function isDateConstructor(checker: ts.TypeChecker, node: ts.Node): boolean {
	return ts.isNewExpression(node) && isGlobalDate(checker, skipOuter(node.expression));
}

/** `Date.now`, `Date.UTC` or `Date.parse` as a callee: the static name. */
export function dateStatic(checker: ts.TypeChecker, callee: ts.Expression): string | null {
	const c = skipOuter(callee);
	if (!ts.isPropertyAccessExpression(c) || !isGlobalDate(checker, c.expression)) return null;
	return c.name.text;
}

/** The Date method of a call `d.m(...)`, or null. */
export function dateMethodCall(checker: ts.TypeChecker, call: ts.CallExpression): string | null {
	const callee = skipOuter(call.expression);
	if (!ts.isPropertyAccessExpression(callee)) return null;
	if (!DATE_METHODS.has(callee.name.text)) return null;
	return isDateish(checker, callee.expression) ? callee.name.text : null;
}

/** True when `id` is the receiver of a Date setter call: `id.setHours(...)`. */
export function isDateSetterReceiver(checker: ts.TypeChecker, id: ts.Node): boolean {
	let node = id;
	while (ts.isParenthesizedExpression(node.parent) || ts.isNonNullExpression(node.parent)) {
		node = node.parent;
	}
	const pa = node.parent;
	return (
		ts.isPropertyAccessExpression(pa) &&
		pa.expression === node &&
		DATE_SETTERS.has(pa.name.text) &&
		ts.isCallExpression(pa.parent) &&
		pa.parent.expression === pa &&
		isDateish(checker, node)
	);
}

/** True when a call calls a function that workflow code declares. */
/**
 * True when the local function that `call` calls only reads its parameter at
 * the place of `arg` with Date getters and formatters, outside nested
 * functions. Then a copy of the Date gives what the shared object gives.
 */
function readsDateOnly(checker: ts.TypeChecker, call: ts.CallExpression, arg: ts.Node): boolean {
	const index = call.arguments.indexOf(arg as ts.Expression);
	if (index < 0) return false;
	const callee = skipOuter(call.expression);
	if (!ts.isIdentifier(callee)) return false;
	const decls = checker.getSymbolAtLocation(callee)?.declarations ?? [];
	if (decls.length !== 1) return false;
	const d = decls[0];
	const fn = ts.isFunctionDeclaration(d)
		? d
		: ts.isVariableDeclaration(d) &&
				d.initializer &&
				(ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) &&
				ts.isVariableDeclarationList(d.parent) &&
				(d.parent.flags & ts.NodeFlags.Const) !== 0
			? d.initializer
			: null;
	const param = fn?.parameters[index];
	if (!fn?.body || !param || !ts.isIdentifier(param.name) || param.dotDotDotToken) return false;
	const sym = checker.getSymbolAtLocation(param.name);
	const readers = new Set([...GETTERS, ...FORMATTERS, ...LOCALE_METHODS]);
	let ok = true;
	const visit = (n: ts.Node, nested: boolean): void => {
		if (!ok) return;
		if (ts.isIdentifier(n) && n !== param.name && checker.getSymbolAtLocation(n) === sym) {
			const pa = n.parent;
			// A getter call, or `new Date(d)`, which makes a copy.
			ok =
				!nested &&
				((ts.isPropertyAccessExpression(pa) &&
					pa.expression === n &&
					readers.has(pa.name.text) &&
					ts.isCallExpression(pa.parent) &&
					pa.parent.expression === pa) ||
					(ts.isNewExpression(pa) &&
						ts.isIdentifier(pa.expression) &&
						pa.expression.text === 'Date' &&
						pa.arguments?.length === 1));
			return;
		}
		const inner = nested || ts.isFunctionLike(n);
		ts.forEachChild(n, (c) => visit(c, inner));
	};
	ts.forEachChild(fn.body, (c) => visit(c, false));
	return ok;
}

function isUserCall(checker: ts.TypeChecker, call: ts.CallExpression): boolean {
	const callee = skipOuter(call.expression);
	const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
	const sym = checker.getSymbolAtLocation(nameNode);
	const decls = sym?.declarations ?? [];
	return (
		decls.length > 0 &&
		decls.every((d) => {
			const f = d.getSourceFile().fileName;
			return !f.endsWith('.d.ts') && f !== SDK_FILE;
		})
	);
}

function globalCallName(checker: ts.TypeChecker, call: ts.CallExpression): string | null {
	const callee = skipOuter(call.expression);
	const isGlobal = (id: ts.Identifier) =>
		(checker.getSymbolAtLocation(id)?.declarations ?? []).every(
			(d) => d.getSourceFile().fileName === LIB_FILE,
		);
	if (ts.isIdentifier(callee)) return isGlobal(callee) ? callee.text : null;
	if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
		return isGlobal(callee.expression) ? `${callee.expression.text}.${callee.name.text}` : null;
	}
	return null;
}

// --------------------------------------------------------------- positions

/** What the compiler does with a Date-typed expression at its position. */
export type DateUse =
	| { kind: 'raw' }
	| { kind: 'json' }
	| { kind: 'text' }
	| { kind: 'reject'; message: string; suggestion: string };

const RAW: DateUse = { kind: 'raw' };
const JSON_USE: DateUse = { kind: 'json' };
const TEXT: DateUse = { kind: 'text' };

function reject(message: string, suggestion: string): DateUse {
	return { kind: 'reject', message, suggestion };
}

const CONDITION = reject(
	'A Date in a condition is always true in JavaScript, but a Date is a number here.',
	'Compare with null: d != null, or test d.getTime().',
);

function isNullishLiteral(e: ts.Expression): boolean {
	const s = skipOuter(e);
	return s.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(s) && s.text === 'undefined');
}

const runCache = new WeakMap<ts.SourceFile, ts.Node | null>();

/** True when `fn` is the `run` function of a workflow or a library node. */
function isRunFunction(fn: ts.Node): boolean {
	const sf = fn.getSourceFile();
	let run = runCache.get(sf);
	if (run === undefined) {
		run = findWorkflowDefinition(sf)?.run ?? findNodeDefinition(sf)?.run ?? null;
		runCache.set(sf, run);
	}
	return run === fn;
}

function containingFunction(node: ts.Node): ts.FunctionLikeDeclaration | null {
	let p: ts.Node | undefined = node.parent;
	while (p) {
		if (isFunctionLike(p)) return p;
		p = p.parent;
	}
	return null;
}

/** The use of a value that a function returns: by its position and return type. */
function returnUse(checker: ts.TypeChecker, fn: ts.FunctionLikeDeclaration | null): DateUse {
	if (!fn || isRunFunction(fn)) return JSON_USE;
	const call = fn.parent;
	if (ts.isCallExpression(call) && call.arguments.includes(fn as ts.Expression)) {
		// A callback: the library stores what it returns in an array.
		const callee = skipOuter(call.expression);
		if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'reduce') {
			return reject(
				'A Date accumulator of reduce is not supported.',
				'Reduce over d.getTime() values and make a Date at the end.',
			);
		}
		return JSON_USE;
	}
	if (fn.type) {
		let declared = checker.getTypeFromTypeNode(fn.type);
		if (fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
			declared = checker.getAwaitedType(declared) ?? declared;
		}
		return isDateishType(declared) ? RAW : JSON_USE;
	}
	return RAW;
}

/**
 * Decides what happens to the Date-typed expression `node` at its position.
 * `raw` keeps the number. A transparent parent (parentheses, `?:`, `??`)
 * passes the value on, so the parent decides.
 */
export function dateUse(checker: ts.TypeChecker, node: ts.Expression): DateUse {
	const p = node.parent;
	if (ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p)) return RAW;
	if (ts.isAsExpression(p) || ts.isSatisfiesExpression(p) || ts.isTypeAssertionExpression(p)) {
		return isDateish(checker, p)
			? RAW
			: reject('A Date cannot change its type with `as`.', 'Use d.toISOString() or d.getTime().');
	}
	if (ts.isConditionalExpression(p)) return p.condition === node ? CONDITION : RAW;
	if (ts.isTemplateSpan(p)) return TEXT;
	if (ts.isPropertyAccessExpression(p) && p.expression === node) {
		const call = p.parent;
		if (ts.isCallExpression(call) && call.expression === p && DATE_METHODS.has(p.name.text)) {
			return RAW;
		}
		if (DATE_METHODS.has(p.name.text)) {
			return reject('A Date method can only be called.', `Wrap it: () => d.${p.name.text}()`);
		}
		return reject(
			`\`${p.name.text}\` is not a Date method of the workflow library.`,
			'Call a Date method from spec section 4.5, for example d.getTime().',
		);
	}
	if (ts.isElementAccessExpression(p)) {
		return reject('A Date cannot be indexed or used as a key.', 'Use d.toISOString() as the key.');
	}
	if (ts.isPrefixUnaryExpression(p)) {
		if (p.operator === ts.SyntaxKind.ExclamationToken) return CONDITION;
		return RAW;
	}
	if (ts.isTypeOfExpression(p)) {
		return reject(
			'`typeof` of a Date is "object" in JavaScript, but a Date is a number here.',
			'Remove the typeof check.',
		);
	}
	if (ts.isVoidExpression(p) || ts.isExpressionStatement(p)) return RAW;
	if (ts.isBinaryExpression(p)) return binaryUse(checker, p, node);
	if (ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p)) return CONDITION;
	if (ts.isForStatement(p)) return p.condition === node ? CONDITION : RAW;
	if (ts.isSwitchStatement(p) || ts.isCaseClause(p)) {
		return reject(
			'`switch` compares Date objects by identity in JavaScript.',
			'Switch on d.getTime().',
		);
	}
	if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) return JSON_USE;
	if (ts.isArrayLiteralExpression(p)) return JSON_USE;
	if (ts.isSpreadElement(p) || ts.isSpreadAssignment(p)) {
		return reject('A Date cannot be spread.', 'Use d.getTime() or d.toISOString().');
	}
	if (ts.isReturnStatement(p)) return returnUse(checker, containingFunction(p));
	if (ts.isArrowFunction(p) && p.body === node) return returnUse(checker, p);
	if (ts.isThrowStatement(p)) return JSON_USE;
	if (ts.isVariableDeclaration(p)) {
		if (!ts.isIdentifier(p.name)) {
			return reject('A Date cannot be destructured.', 'Call its methods instead.');
		}
		if (p.type && !isDateishType(checker.getTypeFromTypeNode(p.type))) return JSON_USE;
		return RAW;
	}
	if (ts.isParameter(p)) {
		return p.type && !isDateishType(checker.getTypeFromTypeNode(p.type)) ? JSON_USE : RAW;
	}
	if (ts.isNewExpression(p)) {
		if (isDateConstructor(checker, p)) return RAW;
		return TEXT; // new Error(d): the message is String(d).
	}
	if (ts.isCallExpression(p)) return callArgumentUse(checker, p, node);
	if (ts.isAwaitExpression(p)) return RAW;
	return reject('This use of a Date is not supported.', 'Use d.getTime() or d.toISOString().');
}

function binaryUse(checker: ts.TypeChecker, p: ts.BinaryExpression, node: ts.Expression): DateUse {
	const op = p.operatorToken.kind;
	const isLeft = p.left === node;
	const other = isLeft ? p.right : p.left;
	switch (op) {
		case ts.SyntaxKind.QuestionQuestionToken:
			return RAW;
		case ts.SyntaxKind.AmpersandAmpersandToken:
		case ts.SyntaxKind.BarBarToken:
			return isLeft ? CONDITION : RAW;
		case ts.SyntaxKind.CommaToken:
			return RAW;
		case ts.SyntaxKind.PlusToken:
		case ts.SyntaxKind.PlusEqualsToken:
			// JavaScript converts a Date in `+` with its toString form.
			return TEXT;
		case ts.SyntaxKind.EqualsEqualsEqualsToken:
		case ts.SyntaxKind.ExclamationEqualsEqualsToken:
		case ts.SyntaxKind.EqualsEqualsToken:
		case ts.SyntaxKind.ExclamationEqualsToken:
			if (isNullishLiteral(other)) return RAW;
			return reject(
				'JavaScript compares Date objects by identity, but a Date is a number here.',
				'Compare d1.getTime() === d2.getTime().',
			);
		case ts.SyntaxKind.LessThanToken:
		case ts.SyntaxKind.LessThanEqualsToken:
		case ts.SyntaxKind.GreaterThanToken:
		case ts.SyntaxKind.GreaterThanEqualsToken:
		case ts.SyntaxKind.MinusToken:
		case ts.SyntaxKind.AsteriskToken:
		case ts.SyntaxKind.SlashToken:
		case ts.SyntaxKind.PercentToken:
			return RAW;
		case ts.SyntaxKind.EqualsToken: {
			if (isLeft) return RAW;
			const target = skipOuter(p.left);
			if (ts.isIdentifier(target)) return isDateish(checker, target) ? RAW : JSON_USE;
			// A store into an object or array.
			return JSON_USE;
		}
		case ts.SyntaxKind.InKeyword:
		case ts.SyntaxKind.InstanceOfKeyword:
		default:
			return reject(
				`The operator ${ts.tokenToString(op) ?? '?'} is not supported on a Date.`,
				'Use d.getTime().',
			);
	}
}

function callArgumentUse(
	checker: ts.TypeChecker,
	call: ts.CallExpression,
	node: ts.Expression,
): DateUse {
	if (call.expression === node) {
		return reject('A Date cannot be called.', 'Call a Date method.');
	}
	if (ctxCallMethod(checker, call)) return JSON_USE;
	if (isPromiseAll(call)) return JSON_USE;
	const global = globalCallName(checker, call);
	if (global !== null) {
		if (global === 'JSON.stringify') return call.arguments[0] === node ? JSON_USE : RAW;
		if (
			global === 'String' ||
			global === 'Error' ||
			global === 'TypeError' ||
			global === 'RangeError'
		)
			return TEXT;
		if (global === 'Number') return RAW;
		return reject(
			`A Date cannot be passed to \`${global}\`.`,
			'Pass d.getTime() or d.toISOString().',
		);
	}
	if (isUserCall(checker, call)) {
		return isDateishType(checker.getContextualType(node)) ? RAW : JSON_USE;
	}
	const callee = skipOuter(call.expression);
	if (ts.isPropertyAccessExpression(callee)) {
		const name = callee.name.text;
		if (name === 'push' || name === 'unshift' || name === 'concat') return JSON_USE;
		if (name === 'reduce') {
			return reject(
				'A Date accumulator of reduce is not supported.',
				'Reduce over d.getTime() values and make a Date at the end.',
			);
		}
		return reject(
			`A Date cannot be passed to \`${name}\`.`,
			'Pass d.getTime() or d.toISOString().',
		);
	}
	return isDateishType(checker.getContextualType(node)) ? RAW : JSON_USE;
}

// ---------------------------------------------------------------- checks

type Report = (node: ts.Node, code: string, message: string, suggestion: string) => void;

/** True when `node` is a function that a library or prelude method calls. */
function isLibraryCallback(checker: ts.TypeChecker, fn: ts.Node): boolean {
	const call = fn.parent;
	if (!ts.isCallExpression(call) || !call.arguments.includes(fn as ts.Expression)) return false;
	if (isPromiseAll(call)) return false;
	if (
		call.parent &&
		ts.isCallExpression(call.parent) &&
		isPromiseAll(call.parent) &&
		call.parent.arguments[0] === call
	) {
		return true; // Promise.all(arr.map(async (x) => ...))
	}
	return !isUserCall(checker, call);
}

/**
 * Checks the Date rules on one source file. The rules make sure that each
 * Date-typed value is a number at run time and that no JavaScript object
 * identity is lost.
 */
export function checkDates(checker: ts.TypeChecker, sf: ts.SourceFile, report: Report): void {
	if (!mayHaveDates(sf)) return;
	const r = (node: ts.Node, message: string, suggestion: string) =>
		report(node, DATE_CODE, message, suggestion);
	const mutated = new Map<ts.Symbol, ts.Identifier[]>();

	const visit = (node: ts.Node): void => {
		if (ts.isTypeNode(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
			return;
		if (ts.isIdentifier(node) && isGlobalDate(checker, node)) checkDateGlobal(node);
		if (ts.isCallExpression(node)) checkCall(node);
		if (ts.isNewExpression(node) && isDateConstructor(checker, node)) {
			if ((node.arguments?.length ?? 0) > 7)
				r(node, '`new Date` takes at most 7 arguments.', 'Remove the extra arguments.');
		}
		if (ts.isBindingElement(node) && isDateish(checker, node)) {
			r(
				node,
				'A Date read from an object or array is not a Date at run time.',
				'Store d.getTime() and use new Date(ms).',
			);
		}
		if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer)) {
			for (const d of node.initializer.declarations) {
				if (isDateish(checker, d.name)) {
					r(
						d,
						'A Date read from an array is not a Date at run time.',
						'Store d.getTime() values and use new Date(ms).',
					);
				}
			}
		}
		if (
			ts.isParameter(node) &&
			isDateish(checker, node) &&
			isLibraryCallback(checker, node.parent)
		) {
			r(
				node,
				'A Date read from an array is not a Date at run time.',
				'Store d.getTime() values and use new Date(ms).',
			);
		}
		if (ts.isExpression(node) && !ts.isOmittedExpression(node)) checkExpression(node);
		ts.forEachChild(node, visit);
	};

	const checkDateGlobal = (id: ts.Identifier) => {
		const p = id.parent;
		if (ts.isNewExpression(p) && p.expression === id) return;
		if (
			ts.isPropertyAccessExpression(p) &&
			p.expression === id &&
			DATE_STATICS.has(p.name.text) &&
			ts.isCallExpression(p.parent) &&
			p.parent.expression === p
		) {
			return;
		}
		r(
			id,
			'`Date` can only be used as new Date(...), Date.now(), Date.UTC(...) or Date.parse(s).',
			'new Date(ms)',
		);
	};

	const checkCall = (call: ts.CallExpression) => {
		const method = dateMethodCall(checker, call);
		if (!method) return;
		if (LOCALE_METHODS.has(method)) {
			const [locale, ...rest] = call.arguments;
			const ok =
				rest.length === 0 &&
				(locale === undefined ||
					(ts.isStringLiteralLike(skipOuter(locale)) &&
						(skipOuter(locale) as ts.StringLiteralLike).text === 'en-US'));
			if (!ok) {
				r(
					call,
					`\`${method}\` is supported only with no arguments or 'en-US'.`,
					`d.${method}('en-US')`,
				);
			}
		}
		if (DATE_SETTERS.has(method)) {
			const callee = skipOuter(call.expression);
			const recv = ts.isPropertyAccessExpression(callee) ? skipOuter(callee.expression) : callee;
			const sym = ts.isIdentifier(recv) ? checker.getSymbolAtLocation(recv) : undefined;
			const decl = sym?.valueDeclaration;
			if (!sym || !decl || !ts.isVariableDeclaration(decl) || !ts.isIdentifier(decl.name)) {
				r(
					call,
					`\`${method}\` can change only a Date in a local variable.`,
					'Copy it first: const c = new Date(d.getTime()); c.setHours(0);',
				);
				return;
			}
			const list = mutated.get(sym) ?? [];
			list.push(recv as ts.Identifier);
			mutated.set(sym, list);
		}
	};

	const checkExpression = (e: ts.Expression) => {
		// An array literal is never a Date, but it can hold Dates that turn into text.
		if (ts.isArrayLiteralExpression(e) ? !isTextual(e) : cannotBeDate(e)) return;
		const type = checker.getTypeAtLocation(e);
		if (type.flags & ts.TypeFlags.Any) {
			if (isDateishType(checker.getContextualType(e)) && !isDeclarationName(e)) {
				r(e, 'A value of type any is used as a Date.', 'Use new Date(value).');
			}
			return;
		}
		const kind = dateKindOf(type);
		if (kind === 'none') {
			checkArrayText(e, type);
			return;
		}
		if (isDeclarationName(e)) return;
		if (kind === 'mixed') {
			r(
				e,
				'A value that can be a Date or another type is not supported.',
				'Keep Dates in their own variables.',
			);
			return;
		}
		const s = skipOuter(e);
		if (s !== e) {
			// The inner expression has its own checks.
		} else if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) {
			r(
				e,
				'A Date read from an object or array is not a Date at run time.',
				'Store d.getTime() and use new Date(ms).',
			);
			return;
		} else if (ts.isCallExpression(e) && !isUserCall(checker, e)) {
			r(
				e,
				'A Date read from an array is not a Date at run time.',
				'Store d.getTime() values and use new Date(ms).',
			);
			return;
		}
		const use = dateUse(checker, e);
		if (use.kind === 'reject') r(e, use.message, use.suggestion);
	};

	/** True when the parent turns the value into text: a template, `+`, `join` or `String`. */
	const isTextual = (e: ts.Expression): boolean => {
		const p = e.parent;
		return (
			ts.isTemplateSpan(p) ||
			(ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken) ||
			(ts.isPropertyAccessExpression(p) &&
				p.expression === e &&
				['join', 'toString', 'includes', 'indexOf'].includes(p.name.text)) ||
			(ts.isCallExpression(p) && globalCallName(checker, p) === 'String')
		);
	};

	/** `arr.join()`, `String(arr)` and templates turn Dates in arrays into toString text. */
	const checkArrayText = (e: ts.Expression, type: ts.Type) => {
		if (!arrayHoldsDates(checker, type)) return;
		if (isTextual(e)) {
			r(
				e,
				'Dates in an array are ISO strings at run time, so text and search results differ from JavaScript.',
				'Map the Dates to strings first: dates.map((d) => d.toISOString()).',
			);
		}
	};

	ts.forEachChild(sf, visit);

	for (const [sym, receivers] of mutated) checkMutated(sym, receivers);

	function checkMutated(sym: ts.Symbol, receivers: ts.Identifier[]) {
		const decl = sym.valueDeclaration;
		if (!decl || !ts.isVariableDeclaration(decl)) return;
		const fresh = (e: ts.Expression | undefined) =>
			e !== undefined && isDateConstructor(checker, skipOuter(e));
		if (!fresh(decl.initializer)) {
			r(
				decl,
				'A Date that a setter changes must start as new Date(...).',
				'const d = new Date(other.getTime());',
			);
		}
		const scope = decl.parent.parent.parent ?? sf;
		const visitRefs = (n: ts.Node): void => {
			if (ts.isIdentifier(n) && n !== decl.name && checker.getSymbolAtLocation(n) === sym) {
				checkMutatedRef(n, fresh);
			}
			if (
				ts.isShorthandPropertyAssignment(n) &&
				checker.getShorthandAssignmentValueSymbol(n) === sym
			) {
				if (!consumedNow(n.parent)) {
					r(
						n,
						'A Date that a setter changes cannot be stored in an object: JavaScript shares the object.',
						`${n.name.text}: ${n.name.text}.toISOString()`,
					);
				}
			}
			ts.forEachChild(n, visitRefs);
		};
		if (receivers.length > 0) visitRefs(scope);
	}

	function checkMutatedRef(id: ts.Identifier, fresh: (e: ts.Expression | undefined) => boolean) {
		if (ts.isShorthandPropertyAssignment(id.parent)) return;
		let node: ts.Expression = id;
		// Climb through the parents that pass the value on.
		for (;;) {
			const p = node.parent;
			if (
				ts.isParenthesizedExpression(p) ||
				ts.isNonNullExpression(p) ||
				(ts.isConditionalExpression(p) && p.condition !== node) ||
				(ts.isBinaryExpression(p) &&
					(p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
						(p.operatorToken.kind === ts.SyntaxKind.CommaToken && p.right === node) ||
						((p.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
							p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) &&
							p.right === node)))
			) {
				node = p;
				continue;
			}
			break;
		}
		const p = node.parent;
		if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
			if (p.left === node) {
				if (!fresh(p.right)) {
					r(
						p,
						'A Date that a setter changes can take only new Date(...).',
						`${id.text} = new Date(other.getTime())`,
					);
				}
				return;
			}
			r(
				p,
				'A Date that a setter changes cannot be copied: JavaScript shares the object.',
				`new Date(${id.text}.getTime())`,
			);
			return;
		}
		if (
			ts.isVariableDeclaration(p) ||
			ts.isReturnStatement(p) ||
			(ts.isArrowFunction(p) && p.body === node)
		) {
			const use = ts.isVariableDeclaration(p) ? RAW : returnUse(checker, containingFunction(node));
			if (use.kind === 'raw') {
				r(
					node,
					'A Date that a setter changes cannot be copied: JavaScript shares the object.',
					`new Date(${id.text}.getTime())`,
				);
			}
			return;
		}
		if (
			ts.isCallExpression(p) &&
			p.expression !== node &&
			isUserCall(checker, p) &&
			!readsDateOnly(checker, p, node)
		) {
			r(
				node,
				'A Date that a setter changes cannot be passed to a function: JavaScript shares the object.',
				`new Date(${id.text}.getTime())`,
			);
			return;
		}
		if ((ts.isPropertyAssignment(p) && p.initializer === node) || ts.isArrayLiteralExpression(p)) {
			const literal = ts.isPropertyAssignment(p) ? p.parent : p;
			if (!consumedNow(literal)) {
				r(
					node,
					'A Date that a setter changes cannot be stored in an object or array: JavaScript shares the object.',
					`${id.text}.toISOString()`,
				);
			}
		}
	}

	/** True when a literal is copied at once: a ctx call argument, JSON.stringify, or the result of run. */
	function consumedNow(literal: ts.Node): boolean {
		let n: ts.Node = literal;
		for (;;) {
			const p = n.parent;
			if (ts.isPropertyAssignment(p) && p.initializer === n) n = p.parent;
			else if (ts.isArrayLiteralExpression(p) || ts.isParenthesizedExpression(p)) n = p;
			else break;
		}
		const p = n.parent;
		if (ts.isCallExpression(p) && p.arguments.includes(n as ts.Expression)) {
			return ctxCallMethod(checker, p) !== null || globalCallName(checker, p) === 'JSON.stringify';
		}
		if (ts.isReturnStatement(p)) {
			const fn = containingFunction(p);
			return fn !== null && isRunFunction(fn);
		}
		return false;
	}
}

function isDeclarationName(e: ts.Expression): boolean {
	const p = e.parent;
	if (!ts.isIdentifier(e)) return false;
	return (
		((ts.isVariableDeclaration(p) ||
			ts.isParameter(p) ||
			ts.isFunctionDeclaration(p) ||
			ts.isBindingElement(p)) &&
			p.name === e) ||
		(ts.isPropertyAccessExpression(p) && p.name === e) ||
		(ts.isPropertyAssignment(p) && p.name === e)
	);
}
