import ts from 'typescript';

import { isPromiseAll, promiseAllMap, skipOuter } from '../compiler/analysis.ts';

const ERROR_NAMES = new Set(['Error', 'TypeError', 'RangeError']);

function rt(name: string, args: ts.Expression[]): ts.CallExpression {
	const f = ts.factory;
	return f.createCallExpression(
		f.createPropertyAccessExpression(f.createIdentifier('__rt'), name),
		undefined,
		args,
	);
}

/**
 * Rewrites workflow code so that plain JavaScript matches the runtime:
 *
 * - Each try block tells the runtime when it starts and ends, so an effect
 *   failure knows whether a try region is active in its fibre.
 * - `Promise.all` runs its branches as fibres of the reference scheduler.
 * - `new Error(m)` makes a plain `{ name, message }` object.
 * - `new Date()` and `Date.now()` read the batch clock, and the locale
 *   methods of Date use 'en-US' (spec section 4.5).
 * - `localeCompare` uses the CLDR root collation ('und'), as the runtime does.
 * - `RegExp.exec` (spec section 4.6) calls `regex-lib.ts`.
 */
const LOCALE_METHODS = new Set(['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString']);

/** Rewrites the Date forms that depend on the clock or the host locale. */
function dateRewrite(
	node: ts.Node,
	visit: (n: ts.Node) => ts.Node,
	context: ts.TransformationContext,
): ts.Node | null {
	const f = ts.factory;
	if (
		ts.isNewExpression(node) &&
		ts.isIdentifier(skipOuter(node.expression)) &&
		skipOuter(node.expression).getText() === 'Date' &&
		(node.arguments?.length ?? 0) === 0
	) {
		return f.createNewExpression(f.createIdentifier('Date'), undefined, [rt('now', [])]);
	}
	if (!ts.isCallExpression(node)) return null;
	const callee = skipOuter(node.expression);
	if (!ts.isPropertyAccessExpression(callee)) return null;
	if (
		ts.isIdentifier(callee.expression) &&
		((callee.expression.text === 'RegExp' && callee.name.text === 'exec') ||
			(callee.expression.text === 'Date' && callee.name.text === 'zoneOffset') ||
			callee.expression.text === 'XML' ||
			callee.expression.text === 'Ascii' ||
			callee.expression.text === 'Base64')
	) {
		const args = node.arguments.map((a) => {
			const v = ts.visitNode(a, visit);
			return v && ts.isExpression(v) ? v : a;
		});
		if (callee.expression.text === 'Base64') {
			return rt(callee.name.text === 'encodeUtf8' ? 'base64Utf8' : 'base64Unknown', args);
		}
		if (callee.expression.text === 'Ascii') {
			const asciiName = { is: 'asciiIs', isPrintable: 'asciiIsPrintable' };
			return rt(Reflect.get(asciiName, callee.name.text) ?? 'asciiUnknown', args);
		}
		if (callee.expression.text === 'XML') {
			const xmlName = { parse: 'xmlParse', snippet: 'xmlSnippet', content: 'xmlContent' };
			return rt(Reflect.get(xmlName, callee.name.text) ?? 'xmlUnknown', args);
		}
		return rt(callee.name.text === 'exec' ? 'regexExec' : 'zoneOffset', args);
	}
	if (
		ts.isIdentifier(callee.expression) &&
		callee.expression.text === 'Date' &&
		callee.name.text === 'now'
	) {
		return rt('now', []);
	}
	if (callee.name.text === 'localeCompare' && node.arguments.length <= 1) {
		// The runtime compares by the CLDR root collation, whatever the locale of the host.
		const visited = ts.visitEachChild(node, visit, context);
		return f.updateCallExpression(visited, visited.expression, visited.typeArguments, [
			visited.arguments[0] ?? f.createIdentifier('undefined'),
			f.createStringLiteral('und'),
		]);
	}
	if (LOCALE_METHODS.has(callee.name.text) && node.arguments.length === 0) {
		const visited = ts.visitEachChild(node, visit, context);
		return f.updateCallExpression(visited, visited.expression, visited.typeArguments, [
			f.createStringLiteral('en-US'),
		]);
	}
	return null;
}

export const referenceTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
	const f = ts.factory;
	const visit = (node: ts.Node): ts.Node => {
		if (ts.isTryStatement(node)) {
			const updated = ts.visitEachChild(node, visit, context);
			const tryBlock = f.createBlock(
				[
					f.createExpressionStatement(rt('enter', [])),
					f.createTryStatement(
						updated.tryBlock,
						undefined,
						f.createBlock([f.createExpressionStatement(rt('leave', []))], true),
					),
				],
				true,
			);
			return f.updateTryStatement(updated, tryBlock, updated.catchClause, updated.finallyBlock);
		}
		if (isPromiseAll(node)) {
			const arg = node.arguments[0];
			const map = promiseAllMap(node);
			if (arg && ts.isArrayLiteralExpression(arg)) {
				const thunks = arg.elements.map((el) => {
					const visited = ts.visitNode(el, visit);
					const body = visited && ts.isExpression(visited) ? visited : el;
					return f.createArrowFunction(undefined, undefined, [], undefined, undefined, body);
				});
				return rt('all', [f.createArrayLiteralExpression(thunks)]);
			}
			if (map) {
				const arr = ts.visitNode(map.array, visit);
				const mapper = ts.visitNode(map.mapper, visit);
				if (arr && mapper && ts.isExpression(arr) && ts.isExpression(mapper))
					return rt('allMap', [arr, mapper]);
			}
		}
		const date = dateRewrite(node, visit, context);
		if (date) return date;
		if (
			(ts.isNewExpression(node) || ts.isCallExpression(node)) &&
			ts.isIdentifier(skipOuter(node.expression))
		) {
			const name = skipOuter(node.expression).getText();
			if (ERROR_NAMES.has(name)) {
				const args = (node.arguments ?? []).map((a) => {
					const v = ts.visitNode(a, visit);
					return v && ts.isExpression(v) ? v : a;
				});
				return rt('error', [f.createStringLiteral(name), ...args]);
			}
		}
		return ts.visitEachChild(node, visit, context);
	};
	return (sf) => {
		const out = ts.visitNode(sf, visit);
		return out && ts.isSourceFile(out) ? out : sf;
	};
};

/** Transpiles a workflow or library file to CommonJS for the reference runner. */
export function transpileForReference(source: string, fileName: string): string {
	const out = ts.transpileModule(source, {
		fileName,
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.CommonJS,
			esModuleInterop: false,
		},
		transformers: { before: [referenceTransformer] },
		reportDiagnostics: false,
	});
	return out.outputText;
}
