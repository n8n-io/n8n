import ts from 'typescript';

import { PRELUDE_METHODS } from './opcodes.ts';
import { promiseAllMap, skipOuter } from './analysis.ts';

/**
 * Finds the property paths that the workflow reads from the trigger, such
 * as `body.items[].sku`. The analysis follows `const` aliases, destructuring,
 * `for...of` and array callbacks. It is a best effort: it can miss reads
 * through other aliases.
 */
export function triggerPaths(checker: ts.TypeChecker, run: ts.FunctionLikeDeclaration): string[] {
	const symbolPath = new Map<ts.Symbol, string>();
	const found = new Set<string>();
	const triggerParam = run.parameters[1];
	if (!triggerParam || !run.body) return [];

	const bindName = (name: ts.BindingName, path: string) => {
		if (ts.isIdentifier(name)) {
			const s = checker.getSymbolAtLocation(name);
			if (s) symbolPath.set(s, path);
			return;
		}
		if (ts.isObjectBindingPattern(name)) {
			for (const el of name.elements) {
				if (el.dotDotDotToken) continue;
				const key = el.propertyName ?? el.name;
				if (ts.isIdentifier(key) || ts.isStringLiteral(key)) {
					const p = join(path, key.text);
					found.add(p);
					bindName(el.name, p);
				}
			}
			return;
		}
		for (const el of name.elements) {
			if (ts.isOmittedExpression(el) || el.dotDotDotToken) continue;
			bindName(el.name, `${path}[]`);
		}
	};
	bindName(triggerParam.name, '');

	const pathOf = (expr: ts.Expression): string | null => {
		const e = skipOuter(expr);
		if (ts.isIdentifier(e)) {
			const s = checker.getSymbolAtLocation(e);
			return s ? (symbolPath.get(s) ?? null) : null;
		}
		if (ts.isPropertyAccessExpression(e)) {
			const base = pathOf(e.expression);
			if (base === null) return null;
			if (e.name.text === 'length' && base.length > 0) return null;
			return join(base, e.name.text);
		}
		if (ts.isElementAccessExpression(e)) {
			const base = pathOf(e.expression);
			if (base === null) return null;
			const arg = skipOuter(e.argumentExpression);
			if (ts.isStringLiteral(arg)) return join(base, arg.text);
			return `${base}[]`;
		}
		return null;
	};

	const visit = (node: ts.Node) => {
		if (ts.isVariableDeclaration(node) && node.initializer) {
			const p = pathOf(node.initializer);
			if (p !== null) bindName(node.name, p);
		}
		if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer)) {
			const p = pathOf(node.expression);
			if (p !== null) bindName(node.initializer.declarations[0].name, `${p}[]`);
		}
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
			const method = node.expression.name.text;
			const mapper = node.arguments[0];
			if (
				PRELUDE_METHODS.has(method) &&
				mapper &&
				(ts.isArrowFunction(mapper) || ts.isFunctionExpression(mapper))
			) {
				const p = pathOf(node.expression.expression);
				const param = mapper.parameters[method === 'reduce' ? 1 : 0];
				if (p !== null && param) bindName(param.name, `${p}[]`);
			}
		}
		if (ts.isCallExpression(node)) {
			const m = promiseAllMap(node);
			if (m) {
				const p = pathOf(m.array);
				const param = m.mapper.parameters[0];
				if (p !== null && param) bindName(param.name, `${p}[]`);
			}
		}
		if (
			(ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
			!isInnerAccess(node)
		) {
			const p = pathOf(node);
			if (p !== null && p !== '') found.add(p);
		}
		ts.forEachChild(node, visit);
	};
	visit(run.body);

	// Keep only leaf paths: drop a path when a longer path extends it.
	const all = [...found].sort();
	return all.filter(
		(p) => !all.some((q) => q !== p && (q.startsWith(`${p}.`) || q.startsWith(`${p}[]`))),
	);
}

function join(base: string, key: string): string {
	return base === '' ? key : `${base}.${key}`;
}

/** True when the access is the object of a longer access. */
function isInnerAccess(node: ts.Node): boolean {
	let child = node;
	let p = node.parent;
	while (
		p &&
		(ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p) || ts.isAsExpression(p))
	) {
		child = p;
		p = p.parent;
	}
	return (
		p !== undefined &&
		(ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) &&
		p.expression === child
	);
}
