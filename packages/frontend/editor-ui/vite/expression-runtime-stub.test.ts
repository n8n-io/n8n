import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// vitest sets the cwd to the package root. Under jsdom, `import.meta.url` is not a file URL.
const editorUiDir = process.cwd();
const workflowSrcDir = resolve(editorUiDir, '..', '..', 'workflow', 'src');
const STUB_FILE = join(editorUiDir, 'vite', 'expression-runtime-stub.ts');

const parse = (file: string) =>
	ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);

const isRuntimeSpecifier = (node: ts.Node | undefined) =>
	node !== undefined && ts.isStringLiteral(node) && node.text === '@n8n/expression-runtime';

/** True for `await import('@n8n/expression-runtime')`. */
const isDynamicRuntimeImport = (node: ts.Node | undefined) =>
	node !== undefined &&
	ts.isAwaitExpression(node) &&
	ts.isCallExpression(node.expression) &&
	node.expression.expression.kind === ts.SyntaxKind.ImportKeyword &&
	isRuntimeSpecifier(node.expression.arguments[0]);

/** Every node under `root`, depth first. */
function descendants(root: ts.Node): ts.Node[] {
	const nodes: ts.Node[] = [];
	const visit = (node: ts.Node) => {
		nodes.push(node);
		ts.forEachChild(node, visit);
	};
	visit(root);
	return nodes;
}

/**
 * The names that `file` reads from `await import('@n8n/expression-runtime')`, either by
 * destructuring or as `runtime.Name` on the variable that holds the module.
 */
function runtimeDynamicImports(file: string): string[] {
	const nodes = descendants(parse(file));
	const declarations = nodes
		.filter(ts.isVariableDeclaration)
		.filter((declaration) => isDynamicRuntimeImport(declaration.initializer));
	const moduleVariables = new Set(
		declarations.flatMap((declaration) =>
			ts.isIdentifier(declaration.name) ? [declaration.name.text] : [],
		),
	);
	const destructured = declarations.flatMap((declaration) =>
		ts.isObjectBindingPattern(declaration.name)
			? declaration.name.elements.map((element) => {
					const key = element.propertyName ?? element.name;
					return ts.isIdentifier(key) ? key.text : '';
				})
			: [],
	);
	const propertyReads = nodes
		.filter(ts.isPropertyAccessExpression)
		.filter(
			(access) => ts.isIdentifier(access.expression) && moduleVariables.has(access.expression.text),
		)
		.map((access) => access.name.text);
	return [...destructured, ...propertyReads];
}

/** The names that `file` imports as values from `@n8n/expression-runtime`. Type imports are left out. */
function runtimeValueImports(file: string): string[] {
	return parse(file)
		.statements.filter(ts.isImportDeclaration)
		.filter(
			(statement) =>
				ts.isStringLiteral(statement.moduleSpecifier) &&
				statement.moduleSpecifier.text === '@n8n/expression-runtime' &&
				!statement.importClause?.isTypeOnly,
		)
		.flatMap((statement) => {
			const bindings = statement.importClause?.namedBindings;
			return bindings && ts.isNamedImports(bindings) ? [...bindings.elements] : [];
		})
		.filter((element) => !element.isTypeOnly)
		.map((element) => (element.propertyName ?? element.name).text);
}

/** The names that `file` exports as values. Type exports are left out. */
function valueExports(file: string): string[] {
	return parse(file).statements.flatMap((statement) => {
		if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
			const clause = statement.exportClause;
			return clause && ts.isNamedExports(clause)
				? clause.elements.filter((element) => !element.isTypeOnly).map((e) => e.name.text)
				: [];
		}
		if (ts.isClassDeclaration(statement) && statement.name) {
			return [statement.name.text];
		}
		return [];
	});
}

describe('expression-runtime browser stub', () => {
	it('exports every value that n8n-workflow imports from @n8n/expression-runtime', () => {
		const sourceFiles = readdirSync(workflowSrcDir, { recursive: true, encoding: 'utf8' })
			.filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
			.map((file) => join(workflowSrcDir, file));
		const imported = [
			...new Set(
				sourceFiles.flatMap((file) => [
					...runtimeValueImports(file),
					...runtimeDynamicImports(file),
				]),
			),
		];

		expect(imported).toEqual(
			expect.arrayContaining(['HostCallError', 'QuickJsBridge', 'ExpressionEvaluator']),
		);
		expect(valueExports(STUB_FILE)).toEqual(expect.arrayContaining(imported));
	});
});
