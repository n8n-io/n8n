import { walkAst } from './ast-walk';

/**
 * Capture complete statements through the diagnostics in straight-line code.
 * Include functions only when their bodies contain no diagnostic and fit inside
 * the captured prefix. Other execution patterns need a dependency analysis.
 */
export async function getStaticCodePrefix(
	code: string,
	offsets: number[],
): Promise<string | undefined> {
	const { parseJs } = await import('./code-node/js.js');
	const ast = parseJs(code);
	if (!ast || offsets.length === 0) return undefined;
	const bindings: string[] = [];
	for (const statement of ast.body) {
		if (statement.type === 'VariableDeclaration' && statement.kind === 'const') {
			for (const declaration of statement.declarations) {
				if (declaration.id.type !== 'Identifier') return undefined;
				bindings.push(declaration.id.name);
			}
		} else if (statement.type !== 'ReturnStatement' && statement.type !== 'ExpressionStatement') {
			return undefined;
		}
	}
	let end = 0;
	for (const offset of offsets) {
		const statement = ast.body.find(
			(entry) => entry.range && entry.range[0] <= offset && offset < entry.range[1],
		);
		if (!statement?.range) return undefined;
		end = Math.max(end, statement.range[1]);
	}
	let deferred = false;
	walkAst(ast, (node) => {
		if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
			const range = node.range;
			if (
				!range ||
				range[1] > end ||
				node.async ||
				(node.type === 'FunctionExpression' && node.generator) ||
				offsets.some((offset) => range[0] <= offset && offset < range[1])
			) {
				deferred = true;
			}
		}
		if (
			node.type === 'ClassExpression' ||
			node.type === 'AwaitExpression' ||
			node.type === 'YieldExpression' ||
			(node.type === 'Identifier' && node.name === 'eval')
		)
			deferred = true;
	});
	if (deferred) return undefined;
	const referenced = new Set<string>();
	walkAst(ast, (node) => {
		if (node.type === 'Identifier' && node.range && node.range[1] <= end) referenced.add(node.name);
	});
	const statements = ast.body.filter((statement) => statement.range && statement.range[1] <= end);
	return JSON.stringify(
		[bindings.filter((name) => referenced.has(name)), statements],
		(key, value: unknown) => {
			if (['start', 'end', 'loc', 'range', 'raw'].includes(key)) return undefined;
			return typeof value === 'bigint' ? value.toString() : value;
		},
	);
}
