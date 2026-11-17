// Prints the top-level declarations of TypeScript files with their line ranges, so that a reader finds a
// function in a large file without a search.
//
//   node scripts/outline.ts <file.ts> [name pattern] [--deep]
//   node scripts/outline.ts src/node-compile/specialise.ts request --deep     (--deep: also the functions inside functions)
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const args = process.argv.slice(2);
const deep = args.includes('--deep');
const [file, pattern] = args.filter((a) => a !== '--deep');
if (!file) {
	console.error('usage: node scripts/outline.ts <file.ts> [name pattern] [--deep]');
	process.exit(2);
}
const filter = pattern ? new RegExp(pattern, 'i') : undefined;
const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const lineOf = (pos: number) => source.getLineAndCharacterOfPosition(pos).line + 1;

function namesOf(statement: ts.Statement): Array<{ kind: string; name: string }> {
	if (ts.isFunctionDeclaration(statement) && statement.name) return [{ kind: 'function', name: statement.name.text }];
	if (ts.isClassDeclaration(statement) && statement.name) return [{ kind: 'class', name: statement.name.text }];
	if (ts.isInterfaceDeclaration(statement)) return [{ kind: 'interface', name: statement.name.text }];
	if (ts.isTypeAliasDeclaration(statement)) return [{ kind: 'type', name: statement.name.text }];
	if (ts.isEnumDeclaration(statement)) return [{ kind: 'enum', name: statement.name.text }];
	if (ts.isVariableStatement(statement)) {
		return statement.declarationList.declarations
			.filter((declaration) => ts.isIdentifier(declaration.name))
			.map((declaration) => ({ kind: 'const', name: declaration.name.getText(source) }));
	}
	return [];
}

for (const statement of source.statements) {
	const first = lineOf(statement.getStart(source));
	const last = lineOf(statement.end);
	for (const { kind, name } of namesOf(statement)) {
		if (filter && !filter.test(name)) continue;
		const exported = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
		console.log(`${String(first).padStart(6)}-${String(last).padEnd(6)} ${exported ? 'export ' : ''}${kind} ${name}`);
	}
}

function nested(node: ts.Node, depth: number): void {
	ts.forEachChild(node, (child) => {
		if (ts.isFunctionDeclaration(child) && child.name) {
			if (!filter || filter.test(child.name.text)) {
				const first = lineOf(child.getStart(source));
				console.log(`${String(first).padStart(6)}-${String(lineOf(child.end)).padEnd(6)} ${'  '.repeat(depth)}function ${child.name.text}`);
			}
			nested(child, depth + 1);
		} else nested(child, depth);
	});
}
if (deep) {
	console.log('functions inside functions:');
	for (const statement of source.statements) nested(statement, 1);
}
