import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createChecker } from 'vue-component-meta';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'component-manifest.json');
const hook = process.argv.includes('--staged');
const prefix = 'packages/frontend/@n8n/design-system/';

/** Do not mix staged source with unstaged source. Deleted inputs count too. */
if (hook) {
	const staged = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { cwd: root, encoding: 'utf8' }).split('\0');
	if (!staged.some((file) => file.startsWith(prefix))) process.exit(0);
	const dirty = execFileSync('git', ['diff', '--name-only', '-z', '--', '.'], { cwd: root, encoding: 'utf8' });
	const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', '.'], { cwd: root, encoding: 'utf8' });
	if (dirty || untracked) throw new Error('Stage all design-system changes before commit. Manifest generation does not support partial staging.');
}

if (process.argv.includes('--guard')) process.exit(0);

const checker = createChecker(resolve(root, 'tsconfig.json'), { schema: false });
const components = {};
const types = {};
const registeredTypes = new Set();
const seen = new Set();

/** Keep dependency declarations out of the published component API. */
function isLocalDeclaration(node) {
	const path = relative(root, node.getSourceFile().fileName);
	return !isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`) && !path.split(sep).includes('node_modules');
}

/** Keep local named declarations and their local dependencies available to documentation. */
function registerType(symbol, typeChecker, name = symbol?.name) {
	if (!symbol || !name) return;
	if (symbol.flags & ts.SymbolFlags.Alias) symbol = typeChecker.getAliasedSymbol(symbol);
	const declarations = symbol.declarations?.filter((node) => isLocalDeclaration(node) && (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node)));
	if (!declarations?.length) return;
	const key = `${name}:${declarations[0].getSourceFile().fileName}:${declarations[0].pos}`;
	if (registeredTypes.has(key)) return;
	registeredTypes.add(key);
	const definitions = declarations.map((node) => ({ definition: node.getText(), source: relative(root, node.getSourceFile().fileName) }));
	const entry = { definition: definitions.map((item) => item.definition).join('\n'), source: definitions[0].source };
	if (!Object.hasOwn(types, name)) types[name] = entry;
	else if (types[name].source !== entry.source) {
		/** Retain both declarations when separate modules use the same name. */
		types[`${entry.source}#${name}`] = entry;
	}
	for (const declaration of declarations) collectTypeReferences(declaration, typeChecker);
}

/** Resolve imported aliases through the compiler, not through name matching. */
function collectTypeReferences(node, typeChecker) {
	if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node)) {
		const reference = ts.isTypeReferenceNode(node) ? node.typeName : node.expression;
		registerType(typeChecker.getSymbolAtLocation(reference), typeChecker, reference.getText());
	}
	ts.forEachChild(node, (child) => collectTypeReferences(child, typeChecker));
}

/** Prefer the original property annotation to an expanded compiler union. */
function propType(prop) {
	const program = checker.getProgram();
	const typeChecker = program?.getTypeChecker();
	const type = prop.getTypeObject();
	if (!typeChecker) return prop.type;
	registerType(type.aliasSymbol ?? type.getSymbol(), typeChecker);
	for (const declaration of prop.declarations) {
		const source = program.getSourceFile(declaration.file);
		if (!source) continue;
		const original = declaration.file.endsWith('.vue')
			? readFileSync(declaration.file, 'utf8').slice(...declaration.range)
			: null;
		let annotation;
		function findProperty(node) {
			if (ts.isPropertySignature(node) && node.name.getText().replace(/^['"]|['"]$/g, '') === prop.name && (original ? original.includes(node.getText()) : node.getStart() >= declaration.range[0] && node.getEnd() <= declaration.range[1])) annotation = node.type;
			ts.forEachChild(node, findProperty);
		}
		findProperty(source);
		if (annotation) {
			collectTypeReferences(annotation, typeChecker);
			return annotation.getText();
		}
	}
	return typeChecker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
}

/** Follow local barrels without importing component runtime code. */
function visit(file, aliases = null) {
	const key = file + JSON.stringify(aliases);
	if (seen.has(key)) return;
	seen.add(key);
	let text = readFileSync(file, 'utf8');
	for (const match of text.matchAll(/import\s+(\w+)\s+from\s+(['"])([^'"]+\.vue)\2/g)) {
		if (text.includes(`export default ${match[1]}`)) text += `\nexport { default as default } from '${match[3]}';`;
	}
	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
	for (const statement of source.statements) {
		if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
		const specifier = statement.moduleSpecifier.text;
		if (!specifier.startsWith('.')) continue;
		const target = resolve(dirname(file), specifier);
		if (specifier.endsWith('.vue') && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
			for (const entry of statement.exportClause.elements) {
				if (entry.isTypeOnly || entry.propertyName?.text !== 'default') continue;
				const meta = checker.getComponentMeta(target, entry.propertyName?.text ?? 'default');
				const name = aliases ? aliases[entry.name.text] : entry.name.text;
				if (!name) continue;
				components[name] = {
					source: relative(root, target),
					props: meta.props.filter((prop) => !prop.global).map((prop) => ({ name: prop.name, type: propType(prop), required: prop.required, default: prop.default ?? null, description: prop.description })),
					emits: meta.events.map((event) => ({ name: event.name, type: event.signature, description: event.description })),
					slots: meta.slots.map((slot) => ({ name: slot.name, type: slot.type, description: slot.description })),
				};
			}
		} else if (!statement.isTypeOnly) {
			const resolved = ts.resolveModuleName(specifier, file, { moduleResolution: ts.ModuleResolutionKind.Bundler }, ts.sys).resolvedModule;
			if (resolved && !resolved.resolvedFileName.endsWith('.d.ts')) {
				const nextAliases = statement.exportClause && ts.isNamedExports(statement.exportClause)
					? Object.fromEntries(statement.exportClause.elements.map((entry) => [entry.propertyName?.text ?? entry.name.text, aliases ? aliases[entry.name.text] : entry.name.text]))
					: aliases;
				visit(resolved.resolvedFileName, nextAliases);
			}
		}
	}
}

visit(resolve(root, 'src/index.ts'));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
for (const component of Object.values(components)) {
	for (const group of ['props', 'emits', 'slots']) component[group].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
const manifest = { schemaVersion: 1, source: { repository: 'n8n-io/n8n', packageVersion: packageJson.version }, types: Object.fromEntries(Object.entries(types).sort(([a], [b]) => a.localeCompare(b))), components: Object.fromEntries(Object.entries(components).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) };
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
if (hook) execFileSync('git', ['add', '--', output], { cwd: root });
console.info(`Wrote ${Object.keys(components).length} components to ${output}`);
