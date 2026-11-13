import ts from 'typescript';

import type { EffectKindName } from './opcodes.ts';
import { SDK_FILE } from './program.ts';

export type CtxMethod =
	| EffectKindName
	| 'now'
	| 'random'
	| 'trace'
	| 'execution'
	| 'vars'
	| 'staticData'
	| 'polled';

/** ctx calls that are glue: they do not suspend and are not steps. */
export const GLUE_CTX_METHODS: ReadonlySet<string> = new Set([
	'now',
	'random',
	'trace',
	'execution',
	'vars',
	'staticData',
	'polled',
]);

const CTX_METHODS: ReadonlySet<string> = new Set([
	'node',
	'http',
	'code',
	'wait',
	'approval',
	'respond',
	'service',
	'now',
	'random',
	'trace',
	'execution',
	'vars',
	'staticData',
	'polled',
]);

export function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
	return (
		ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isMethodDeclaration(node)
	);
}

export function isAsyncFunction(node: ts.Node): boolean {
	return isFunctionLike(node) && (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Async) !== 0;
}

/** True when the type is `Ctx` or `NodeCtx` of the SDK. */
export function isCtxType(type: ts.Type): boolean {
	const symbol = type.getSymbol() ?? type.aliasSymbol;
	if (!symbol) return false;
	if (symbol.name !== 'Ctx' && symbol.name !== 'NodeCtx') return false;
	return (symbol.declarations ?? []).some((d) => d.getSourceFile().fileName === SDK_FILE);
}

export function isCtxExpression(checker: ts.TypeChecker, expr: ts.Expression): boolean {
	return isCtxType(checker.getTypeAtLocation(expr));
}

export function isCtxSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): boolean {
	const decl = symbol.valueDeclaration;
	if (!decl) return false;
	return isCtxType(checker.getTypeOfSymbolAtLocation(symbol, decl));
}

/** Returns the ctx method when `call` is `ctx.<method>(...)`. */
export function ctxCallMethod(checker: ts.TypeChecker, call: ts.Node): CtxMethod | null {
	if (!ts.isCallExpression(call)) return null;
	const callee = call.expression;
	if (!ts.isPropertyAccessExpression(callee)) return null;
	const method = callee.name.text;
	if (!CTX_METHODS.has(method)) return null;
	if (!isCtxExpression(checker, callee.expression)) return null;
	switch (method) {
		case 'node':
		case 'http':
		case 'code':
		case 'wait':
		case 'approval':
		case 'respond':
		case 'service':
		case 'now':
		case 'random':
		case 'trace':
		case 'execution':
		case 'vars':
		case 'staticData':
		case 'polled':
			return method;
		default:
			return null;
	}
}

export function isEffectCall(checker: ts.TypeChecker, node: ts.Node): node is ts.CallExpression {
	const m = ctxCallMethod(checker, node);
	return m !== null && !GLUE_CTX_METHODS.has(m);
}

/** True for `Promise.all(...)`. */
export function isPromiseAll(
	node: ts.Node,
): node is ts.CallExpression & { readonly promiseAll: true } {
	return (
		ts.isCallExpression(node) &&
		ts.isPropertyAccessExpression(node.expression) &&
		ts.isIdentifier(node.expression.expression) &&
		node.expression.expression.text === 'Promise' &&
		node.expression.name.text === 'all'
	);
}

/** For `Promise.all(arr.map(async (x) => ...))`, returns the array and the mapper. */
export function promiseAllMap(
	call: ts.CallExpression,
): { array: ts.Expression; mapper: ts.ArrowFunction | ts.FunctionExpression } | null {
	const arg = call.arguments[0];
	if (!arg || !ts.isCallExpression(arg)) return null;
	if (!ts.isPropertyAccessExpression(arg.expression) || arg.expression.name.text !== 'map') {
		return null;
	}
	const mapper = arg.arguments[0];
	if (!mapper || (!ts.isArrowFunction(mapper) && !ts.isFunctionExpression(mapper))) return null;
	if (!isAsyncFunction(mapper)) return null;
	return { array: arg.expression.expression, mapper };
}

/** Returns the declaration of the function that `call` calls, when it is a local function. */
export function calledFunction(
	checker: ts.TypeChecker,
	call: ts.CallExpression,
): ts.FunctionLikeDeclaration | null {
	if (!ts.isIdentifier(call.expression)) return null;
	const symbol = checker.getSymbolAtLocation(call.expression);
	const decl = symbol?.valueDeclaration;
	if (!decl) return null;
	if (ts.isFunctionDeclaration(decl)) return decl;
	if (ts.isVariableDeclaration(decl) && decl.initializer) {
		const init = skipOuter(decl.initializer);
		if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return init;
	}
	return null;
}

export function isAsyncCall(checker: ts.TypeChecker, node: ts.Node): node is ts.CallExpression {
	if (!ts.isCallExpression(node)) return false;
	const fn = calledFunction(checker, node);
	return fn !== null && isAsyncFunction(fn);
}

/** Skips parentheses and type-only wrappers (`as`, `!`, `satisfies`). */
export function skipOuter(expr: ts.Expression): ts.Expression {
	let e = expr;
	for (;;) {
		if (ts.isParenthesizedExpression(e)) e = e.expression;
		else if (ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression(e)) {
			e = e.expression;
		} else if (ts.isTypeAssertionExpression(e)) e = e.expression;
		else return e;
	}
}

export function getProperty(
	obj: ts.ObjectLiteralExpression,
	name: string,
): ts.PropertyAssignment | undefined {
	for (const p of obj.properties) {
		if (ts.isPropertyAssignment(p) && propertyName(p.name) === name) return p;
	}
	return undefined;
}

export function propertyName(name: ts.PropertyName): string | null {
	if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
		return name.text;
	}
	if (ts.isPrivateIdentifier(name)) return null;
	if (ts.isComputedPropertyName(name)) {
		const e = name.expression;
		if (ts.isStringLiteral(e) || ts.isNumericLiteral(e)) return e.text;
	}
	return null;
}

export function stringLiteralValue(expr: ts.Expression | undefined): string | null {
	if (!expr) return null;
	const e = skipOuter(expr);
	if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
	return null;
}

export function literalNumber(expr: ts.Expression | undefined): number | null {
	if (!expr) return null;
	const e = skipOuter(expr);
	if (ts.isNumericLiteral(e)) return Number(e.text);
	return null;
}

export function literalBoolean(expr: ts.Expression | undefined): boolean | null {
	if (!expr) return null;
	const e = skipOuter(expr);
	if (e.kind === ts.SyntaxKind.TrueKeyword) return true;
	if (e.kind === ts.SyntaxKind.FalseKeyword) return false;
	return null;
}

/** Finds `export default workflow({...})` and its `run` function. */
export function findWorkflowDefinition(sf: ts.SourceFile): {
	call: ts.CallExpression;
	options: ts.ObjectLiteralExpression;
	run: ts.FunctionLikeDeclaration;
} | null {
	return findDefaultDefinition(sf, 'workflow');
}

/** Finds `export default defineNode({...})` and its `run` function. */
export function findNodeDefinition(sf: ts.SourceFile): {
	call: ts.CallExpression;
	options: ts.ObjectLiteralExpression;
	run: ts.FunctionLikeDeclaration;
} | null {
	return findDefaultDefinition(sf, 'defineNode');
}

function findDefaultDefinition(sf: ts.SourceFile, callee: string) {
	for (const st of sf.statements) {
		if (!ts.isExportAssignment(st)) continue;
		const call = skipOuter(st.expression);
		if (!ts.isCallExpression(call)) continue;
		if (!ts.isIdentifier(call.expression) || call.expression.text !== callee) continue;
		const options = call.arguments[0];
		if (!options || !ts.isObjectLiteralExpression(options)) return null;
		for (const p of options.properties) {
			if (ts.isMethodDeclaration(p) && propertyName(p.name) === 'run') {
				return { call, options, run: p };
			}
			if (ts.isPropertyAssignment(p) && propertyName(p.name) === 'run') {
				const init = skipOuter(p.initializer);
				if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
					return { call, options, run: init };
				}
			}
		}
		return null;
	}
	return null;
}

/** Text of the node with whitespace collapsed, for canvas parameters. */
export function sourceText(node: ts.Node): string {
	return node.getText().replace(/\s+/g, ' ');
}
