import ts from 'typescript';

const f = ts.factory;

interface Binding {
	spec: string;
	kind: 'star' | 'default';
}

function requireOf(e: ts.Expression | undefined): Binding | undefined {
	if (!e || !ts.isCallExpression(e) || !ts.isIdentifier(e.expression)) return undefined;
	const [first] = e.arguments;
	if (e.expression.text === 'require') {
		return first && ts.isStringLiteral(first) ? { spec: first.text, kind: 'star' } : undefined;
	}
	const inner = requireOf(first);
	if (!inner) return undefined;
	if (e.expression.text === '__importDefault') return { spec: inner.spec, kind: 'default' };
	return e.expression.text === '__importStar' ? inner : undefined;
}

function isExports(e: ts.Expression): e is ts.PropertyAccessExpression {
	return (
		ts.isPropertyAccessExpression(e) &&
		ts.isIdentifier(e.expression) &&
		e.expression.text === 'exports'
	);
}

export function isCommonJs(text: string): boolean {
	return /\brequire\(|\bexports\.|\bmodule\.exports\b/.test(text);
}

export function commonJsToModule(text: string, isLocal: (spec: string) => boolean): string {
	const sf = ts.createSourceFile('module.js', text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
	const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
	const bindings = new Map<string, Binding>();
	for (const st of sf.statements) {
		if (!ts.isVariableStatement(st)) continue;
		for (const d of st.declarationList.declarations) {
			const binding = ts.isIdentifier(d.name) ? requireOf(d.initializer) : undefined;
			if (binding && ts.isIdentifier(d.name)) bindings.set(d.name.text, binding);
		}
	}

	const named = new Map<string, Set<string>>();
	const defaults = new Map<string, string>();
	const visit = (n: ts.Node): ts.Node => {
		if (ts.isCallExpression(n) && ts.isParenthesizedExpression(n.expression)) {
			const inner = n.expression.expression;
			if (
				ts.isBinaryExpression(inner) &&
				inner.operatorToken.kind === ts.SyntaxKind.CommaToken &&
				ts.isNumericLiteral(inner.left)
			) {
				return f.updateCallExpression(
					n,
					ts.visitNode(inner.right, visit) as ts.Expression,
					undefined,
					ts.visitNodes(n.arguments, visit) as ts.NodeArray<ts.Expression>,
				);
			}
		}
		if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression)) {
			const binding = bindings.get(n.expression.text);
			if (binding && !isLocal(binding.spec)) {
				if (n.name.text === 'default' && binding.kind === 'default') {
					const name = `${n.expression.text}default`;
					defaults.set(name, binding.spec);
					return f.createIdentifier(name);
				}
				const names = named.get(binding.spec) ?? new Set<string>();
				names.add(n.name.text);
				named.set(binding.spec, names);
				return f.createIdentifier(n.name.text);
			}

			if (n.expression.text === 'exports') return f.createIdentifier(n.name.text);
		}
		return ts.visitEachChild(n, visit, undefined);
	};
	const print = (n: ts.Node) =>
		printer.printNode(ts.EmitHint.Unspecified, ts.visitNode(n, visit), sf);

	const out: string[] = [];
	for (const st of sf.statements) {
		if (ts.isVariableStatement(st)) {
			const kept: ts.VariableDeclaration[] = [];
			for (const d of st.declarationList.declarations) {
				const binding = ts.isIdentifier(d.name) ? bindings.get(d.name.text) : undefined;

				const helper = ts.isIdentifier(d.name) && d.name.text.startsWith('__');
				if (binding && ts.isIdentifier(d.name)) {
					if (isLocal(binding.spec))
						out.push(`import * as ${d.name.text} from ${JSON.stringify(binding.spec)};`);
				} else if (!helper) kept.push(d);
			}
			if (kept.length > 0) {
				out.push(
					print(
						f.updateVariableStatement(
							st,
							st.modifiers,
							f.updateVariableDeclarationList(st.declarationList, kept),
						),
					),
				);
			}
			continue;
		}
		if (ts.isExpressionStatement(st)) {
			const e = st.expression;
			if (ts.isStringLiteral(e)) continue;
			if (
				ts.isBinaryExpression(e) &&
				e.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				isExports(e.left)
			) {
				const name = e.left.name.text;
				const star = requireOf(e.right);
				if (star) out.push(`export * as ${name} from ${JSON.stringify(star.spec)};`);
				else if (ts.isIdentifier(e.right) && e.right.text === name) continue;
				else if (
					ts.isVoidExpression(e.right) ||
					(ts.isBinaryExpression(e.right) && isExports(e.right.left))
				)
					continue;
				else out.push(`export const ${name} = ${print(e.right)};`);
				continue;
			}
			if (
				ts.isCallExpression(e) &&
				ts.isIdentifier(e.expression) &&
				e.expression.text === '__exportStar'
			) {
				const from = requireOf(e.arguments[0]);
				if (from) out.push(`export * from ${JSON.stringify(from.spec)};`);
				continue;
			}

			if (
				ts.isCallExpression(e) &&
				e.expression.getText(sf) === 'Object.defineProperty' &&
				e.arguments.length === 3
			) {
				const [target, key, descriptor] = e.arguments;
				if (ts.isIdentifier(target) && target.text === 'exports' && ts.isStringLiteral(key)) {
					const result = /return (\w+)\.(\w+);/.exec(descriptor.getText(sf));
					const binding = result ? bindings.get(result[1]) : undefined;
					if (result && binding && isLocal(binding.spec)) {
						out.push(
							`export { ${result[2]} as ${key.text} } from ${JSON.stringify(binding.spec)};`,
						);
					}
					continue;
				}
			}
		}
		out.push(print(st));
	}
	const imports: string[] = [];
	for (const [spec, names] of named)
		imports.push(`import { ${[...names].join(', ')} } from ${JSON.stringify(spec)};`);
	for (const [name, spec] of defaults) imports.push(`import ${name} from ${JSON.stringify(spec)};`);
	return [...imports, ...out].join('\n');
}
