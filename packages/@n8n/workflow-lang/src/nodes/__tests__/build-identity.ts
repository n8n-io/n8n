/**
 * The identity of what a v1 recording and a verifier result depend on, as text made of
 * content hashes. No part is a path of this machine, a file time or a file size: two machines
 * with the same files and the same Node.js give the same identity, so a cache can be copied.
 *
 * The parts:
 * - `sharedIdentity`: the built code (`dist`) of each workspace package that the fallback host
 *   depends on, and the lock file for the packages that are not in the workspace.
 * - `nodeIdentity`: the built code of one node type: the files that its entry file requires,
 *   the credentials of its package and the indexes of the package.
 * - `declarationsKey`: the top-level declarations of a source file that a set of names needs,
 *   without comments and without types.
 * - `importClosure`: the source files that a script imports.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

export function digest(text: string | Buffer): string {
	return createHash('sha256').update(text).digest('hex');
}

const MAX_FILE_HASHES = 200_000;
const fileHashes = new Map<string, string>();

export const NO_FILE = 'none';

/** The hash of the content of a file, or `NO_FILE`. One process reads a file once. */
export function hashOfFile(path: string): string {
	const known = fileHashes.get(path);
	if (known !== undefined) return known;
	let hash = NO_FILE;
	try {
		if (statSync(path).isFile()) hash = digest(readFileSync(path));
	} catch {
		hash = NO_FILE;
	}
	if (fileHashes.size >= MAX_FILE_HASHES) fileHashes.clear();
	fileHashes.set(path, hash);
	return hash;
}

/** Forgets the hashes of this process: for a test that changes a file. */
export function forgetFileHashes(): void {
	fileHashes.clear();
	shared = undefined;
	nodeIdentities.clear();
	packageParts.clear();
}

const BUILT_FILE = /\.(js|cjs|mjs|json)$/;

/** The built files below a directory, as sorted paths from it. `node_modules` is no part. */
export function builtFiles(dir: string): string[] {
	const out: string[] = [];
	const walk = (at: string) => {
		let entries: string[];
		try {
			entries = readdirSync(at);
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry === 'node_modules') continue;
			const path = join(at, entry);
			let isDirectory = false;
			try {
				isDirectory = statSync(path).isDirectory();
			} catch {
				continue;
			}
			if (isDirectory) walk(path);
			else if (BUILT_FILE.test(entry)) out.push(relative(dir, path));
		}
	};
	walk(dir);
	return out.sort();
}

/** One line for each file: its path from `dir` and the hash of its content. */
export function hashOfFiles(dir: string, files: string[]): string {
	return digest(files.map((file) => `${file}:${hashOfFile(join(dir, file))}`).join('\n'));
}

export function hashOfTree(dir: string): string {
	return hashOfFiles(dir, builtFiles(dir));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function packageJson(dir: string): Record<string, unknown> | undefined {
	try {
		const parsed: unknown = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];

/**
 * The workspace packages that a package depends on, each with its real directory, found the
 * way Node.js finds them (`node_modules` of the package that asks). The start is a member.
 */
export function workspacePackages(startDir: string): Map<string, string> {
	const found = new Map<string, string>();
	const visit = (dir: string) => {
		let real: string;
		try {
			real = realpathSync(dir);
		} catch {
			return;
		}
		const pkg = packageJson(real);
		if (pkg === undefined || typeof pkg.name !== 'string' || found.has(pkg.name)) return;
		found.set(pkg.name, real);
		for (const field of DEPENDENCY_FIELDS) {
			const dependencies = pkg[field];
			if (!isRecord(dependencies)) continue;
			for (const [name, version] of Object.entries(dependencies)) {
				if (typeof version === 'string' && version.startsWith('workspace:'))
					visit(join(real, 'node_modules', name));
			}
		}
	};
	visit(startDir);
	return found;
}

function lockFileOf(dir: string): string | undefined {
	let at: string;
	try {
		at = realpathSync(dir);
	} catch {
		return undefined;
	}
	for (;;) {
		const file = join(at, 'pnpm-lock.yaml');
		if (existsSync(file)) return file;
		const up = dirname(at);
		if (up === at) return undefined;
		at = up;
	}
}

let shared: { host: string; apart: string; text: string } | undefined;

/**
 * The built code that each recording of a host depends on: the `dist` of each workspace
 * package in the dependencies of the host, and the lock file of the installed packages. The
 * host's own `dist` and the packages with a name in `apart` (the node packages) are no part:
 * the recorder does not load the first, and `nodeIdentity` covers a node package for each
 * node type.
 */
export function sharedIdentity(hostDir: string, apart: string[]): string {
	const apartText = apart.join('\n');
	if (shared?.host === hostDir && shared.apart === apartText) return shared.text;
	const left = new Set(apart);
	const hostName = packageJson(hostDir)?.name;
	if (typeof hostName === 'string') left.add(hostName);
	const lines: string[] = [];
	for (const [name, dir] of [...workspacePackages(hostDir)].sort(([a], [b]) => (a < b ? -1 : 1))) {
		if (left.has(name)) continue;
		lines.push(`${name}:${hashOfTree(join(dir, 'dist'))}`);
	}
	const lock = lockFileOf(join(hostDir, 'node_modules'));
	lines.push(`lock:${lock === undefined ? NO_FILE : hashOfFile(lock)}`);
	const text = digest(lines.join('\n'));
	shared = { host: hostDir, apart: apartText, text };
	return text;
}

const LITERAL_REQUIRE = /\brequire\(\s*(["'])([^"'\n]+)\1\s*\)/g;
const ANY_REQUIRE = /\brequire\(/g;
const ANY_IMPORT = /\bimport\(/g;
const LITERAL_IMPORT = /\bimport\(\s*(["'])([^"'\n]+)\1\s*\)/g;

function count(text: string, pattern: RegExp): number {
	return text.match(pattern)?.length ?? 0;
}

/**
 * The files of a package that a built CommonJS file (or each file of a list) loads, through
 * each `require` and `import()` with a literal path, to any depth. `open` is true when a file loads a path that this function
 * cannot name (a `require` of a value, a path that is not there, a path out of the package):
 * then the caller must take the whole package.
 */
export function requireClosure(
	entry: string | string[],
	packageDir: string,
): { files: string[]; open: boolean } {
	const seen = new Set<string>();
	let open = false;
	const queue = [entry].flat();
	const inside = (path: string) => !relative(packageDir, path).startsWith('..');
	const fileOf = (path: string): string | undefined => {
		for (const candidate of [path, `${path}.js`, `${path}.json`, join(path, 'index.js')]) {
			try {
				if (statSync(candidate).isFile()) return candidate;
			} catch {
				continue;
			}
		}
		return undefined;
	};
	while (queue.length > 0) {
		const file = queue.pop();
		if (file === undefined || seen.has(file)) continue;
		seen.add(file);
		if (!file.endsWith('.js')) continue;
		let text: string;
		try {
			text = readFileSync(file, 'utf8');
		} catch {
			open = true;
			continue;
		}
		const literal = [...text.matchAll(LITERAL_REQUIRE), ...text.matchAll(LITERAL_IMPORT)];
		if (literal.length !== count(text, ANY_REQUIRE) + count(text, ANY_IMPORT)) open = true;
		for (const [, , specifier] of literal) {
			if (!specifier.startsWith('.')) continue;
			const target = fileOf(resolve(dirname(file), specifier));
			if (target === undefined || !inside(target)) open = true;
			else queue.push(target);
		}
	}
	return { files: [...seen].map((file) => relative(packageDir, file)).sort(), open };
}

interface KnownEntry {
	sourcePath: string;
}

function knownNodes(packageDir: string): Record<string, KnownEntry | undefined> {
	try {
		const parsed: unknown = JSON.parse(
			readFileSync(join(packageDir, 'dist/known/nodes.json'), 'utf8'),
		);
		if (!isRecord(parsed)) return {};
		const out: Record<string, KnownEntry | undefined> = {};
		for (const [name, entry] of Object.entries(parsed)) {
			if (isRecord(entry) && typeof entry.sourcePath === 'string')
				out[name] = { sourcePath: entry.sourcePath };
		}
		return out;
	} catch {
		return {};
	}
}

const packageParts = new Map<string, string>();

/**
 * The parts of a node package that each of its nodes can use: the package file, the indexes,
 * and the credentials with each file that a credential loads (a credential can load code of a
 * node). When a credential loads a path that has no name, the part is the whole `dist`.
 */
export function packageIdentity(packageDir: string): string {
	const known = packageParts.get(packageDir);
	if (known !== undefined) return known;
	const credentialsDir = join(packageDir, 'dist/credentials');
	const credentials = requireClosure(
		builtFiles(credentialsDir).map((file) => join(credentialsDir, file)),
		packageDir,
	);
	const text = digest(
		[
			`package:${hashOfFile(join(packageDir, 'package.json'))}`,
			`known:${hashOfTree(join(packageDir, 'dist/known'))}`,
			credentials.open
				? `all:${hashOfTree(join(packageDir, 'dist'))}`
				: `credentials:${hashOfFiles(packageDir, credentials.files)}`,
		].join('\n'),
	);
	packageParts.set(packageDir, text);
	return text;
}

const MAX_NODE_IDENTITIES = 4096;
const nodeIdentities = new Map<string, string>();

/**
 * The built code of one node type of a package (`name` is the type without the package
 * prefix): the files that its entry loads, and the indexes and credentials of the package.
 * A tool form (`slackTool`) has the code of its node. When the entry is not known, or loads a
 * path that has no name, the identity is the whole `dist` of the package.
 */
export function nodeIdentity(packageDir: string, name: string): string {
	const key = `${packageDir}\n${name}`;
	const known = nodeIdentities.get(key);
	if (known !== undefined) return known;
	const index = knownNodes(packageDir);
	const entry = index[name] ?? (name.endsWith('Tool') ? index[name.slice(0, -4)] : undefined);
	const dist = join(packageDir, 'dist');
	let code: string;
	if (entry === undefined) code = `all:${hashOfTree(dist)}`;
	else {
		const closure = requireClosure(join(packageDir, entry.sourcePath), packageDir);
		code = closure.open
			? `all:${hashOfTree(dist)}`
			: `closure:${hashOfFiles(packageDir, closure.files)}`;
	}
	const text = digest(`${packageIdentity(packageDir)}\n${code}`);
	if (nodeIdentities.size >= MAX_NODE_IDENTITIES) nodeIdentities.clear();
	nodeIdentities.set(key, text);
	return text;
}

/**
 * The built code of node types, each with the prefix of its package (`n8n-nodes-base.slack`).
 * `packages` gives the directory of each prefix. A type of no known package takes each
 * package whole.
 */
export function nodeTypesIdentity(packages: Record<string, string>, types: string[]): string {
	return types
		.map((type) => {
			for (const [prefix, dir] of Object.entries(packages)) {
				if (type.startsWith(`${prefix}.`)) return nodeIdentity(dir, type.slice(prefix.length + 1));
			}
			return Object.values(packages)
				.map((dir) => hashOfTree(join(dir, 'dist')))
				.join(',');
		})
		.join('\n');
}

/** The Node.js of this process, its time zone and its locale: the parts that change what v1 code gives. */
export function processText(): string {
	const versions: Record<string, string | undefined> = process.versions;
	const fields = ['icu', 'cldr', 'tz', 'unicode', 'v8', 'ada'].map(
		(name) => `${name}=${versions[name] ?? '?'}`,
	);
	let zone = '?';
	let locale = '?';
	try {
		const resolved = new Intl.DateTimeFormat().resolvedOptions();
		zone = resolved.timeZone || '?';
		locale = resolved.locale || '?';
	} catch {
		zone = '?';
	}
	return [
		`node=${process.version}`,
		`platform=${process.platform}`,
		...fields,
		`TZ=${process.env.TZ ?? ''}`,
		`zone=${zone}`,
		`locale=${locale}`,
	].join(' ');
}

interface Declaration {
	text: string;
	references: Set<string>;
}

interface ImportedName {
	from: string;
	name: string | null;
}

interface FileParts {
	declarations: Map<string, Declaration[]>;
	effects: Declaration[];
	imports: Map<string, ImportedName>;
	source: ts.SourceFile;
}

function boundNames(name: ts.BindingName, into: string[]): void {
	if (ts.isIdentifier(name)) into.push(name.text);
	else
		for (const element of name.elements)
			if (!ts.isOmittedExpression(element)) boundNames(element.name, into);
}

const printer = ts.createPrinter({ removeComments: true });

function partsOfFile(file: string, text: string): FileParts {
	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const parts: FileParts = { declarations: new Map(), effects: [], imports: new Map(), source };
	const declarationOf = (statement: ts.Statement): Declaration => {
		const references = new Set<string>();
		const visit = (node: ts.Node) => {
			if (ts.isIdentifier(node)) references.add(node.text);
			ts.forEachChild(node, visit);
		};
		visit(statement);
		return { text: printer.printNode(ts.EmitHint.Unspecified, statement, source), references };
	};
	const declare = (name: string, declaration: Declaration) => {
		parts.declarations.set(name, [...(parts.declarations.get(name) ?? []), declaration]);
	};
	for (const statement of source.statements) {
		if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) continue;
		if (ts.isImportDeclaration(statement)) {
			const clause = statement.importClause;
			const from = ts.isStringLiteral(statement.moduleSpecifier)
				? statement.moduleSpecifier.text
				: '';
			if (clause === undefined) {
				parts.effects.push(declarationOf(statement));
				parts.imports.set(`import ${from}`, { from, name: null });
				continue;
			}
			if (clause.isTypeOnly) continue;
			if (clause.name) parts.imports.set(clause.name.text, { from, name: 'default' });
			const bindings = clause.namedBindings;
			if (bindings && ts.isNamespaceImport(bindings))
				parts.imports.set(bindings.name.text, { from, name: null });
			if (bindings && ts.isNamedImports(bindings)) {
				for (const element of bindings.elements) {
					if (element.isTypeOnly) continue;
					parts.imports.set(element.name.text, {
						from,
						name: (element.propertyName ?? element.name).text,
					});
				}
			}
			continue;
		}
		if (
			(ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
			statement.name
		) {
			declare(statement.name.text, declarationOf(statement));
			continue;
		}
		if (ts.isVariableStatement(statement)) {
			const names: string[] = [];
			for (const declaration of statement.declarationList.declarations)
				boundNames(declaration.name, names);
			const declaration = declarationOf(statement);
			for (const name of names) declare(name, declaration);
			continue;
		}
		parts.effects.push(declarationOf(statement));
	}
	return parts;
}

/** A name of a file that the key leaves out, when each use of the name is under a condition. */
export interface Cut {
	name: string;
	/** The text of the condition (of an `if` or of `a ? b : c`) that each use must be under. */
	under: string;
	/**
	 * Declarations (`const a = b;`) that the file must have once, with no other declaration of
	 * the same name, for the condition to mean what the caller thinks.
	 */
	needs?: string[];
}

/** True when the file has the statement once, and declares each name of it only there. */
function declaresOnce(source: ts.SourceFile, statement: string): boolean {
	const names: string[] = [];
	let found = 0;
	const find = (node: ts.Node) => {
		if (ts.isVariableStatement(node) && node.getText(source) === statement) {
			found++;
			for (const declaration of node.declarationList.declarations)
				boundNames(declaration.name, names);
		}
		ts.forEachChild(node, find);
	};
	find(source);
	if (found !== 1) return false;
	let declared = 0;
	const count = (node: ts.Node) => {
		if (
			(ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) &&
			ts.isIdentifier(node.name) &&
			names.includes(node.name.text)
		)
			declared++;
		ts.forEachChild(node, count);
	};
	count(source);
	return declared === names.length;
}

function cutHolds(parts: FileParts, cut: Cut): boolean {
	for (const needed of cut.needs ?? []) {
		if (!declaresOnce(parts.source, needed)) return false;
	}
	let uses = 0;
	let guarded = 0;
	const visit = (node: ts.Node, under: boolean) => {
		if (ts.isIdentifier(node) && node.text === cut.name) {
			const parent = node.parent;
			const declares =
				(ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent)) && parent.name === node;
			if (!declares) {
				uses++;
				if (under) guarded++;
			}
			return;
		}
		if (ts.isIfStatement(node) && node.expression.getText(parts.source) === cut.under) {
			visit(node.expression, under);
			visit(node.thenStatement, true);
			if (node.elseStatement) visit(node.elseStatement, under);
			return;
		}
		if (ts.isConditionalExpression(node) && node.condition.getText(parts.source) === cut.under) {
			visit(node.condition, under);
			visit(node.whenTrue, true);
			visit(node.whenFalse, under);
			return;
		}
		ts.forEachChild(node, (child) => visit(child, under));
	};
	visit(parts.source, false);
	return uses > 0 && uses === guarded;
}

/**
 * A hash of the top-level declarations of `file` that `roots` need, to any depth, with the
 * declarations of the files that they import by a relative path. A declaration needs each
 * name that its text has (a name of a member counts too: the key is then larger, never
 * smaller). Each statement that is not a declaration (a call at the top level) is a part with
 * what it needs. Comments, blank space, interfaces and type aliases are no part: they do not
 * run. A `Cut` that holds takes a name and what only that name needs out of the key.
 */
export function declarationsKey(file: string, roots: string[], cuts: Cut[] = []): string {
	const lines = new Set<string>();
	const files = new Map<string, FileParts>();
	const done = new Set<string>();
	const partsOf = (path: string): FileParts | undefined => {
		const known = files.get(path);
		if (known) return known;
		let text: string;
		try {
			text = readFileSync(path, 'utf8');
		} catch {
			lines.add(`${relative(dirname(file), path)}:${NO_FILE}`);
			return undefined;
		}
		const parts = partsOfFile(path, text);
		files.set(path, parts);
		const left = path === file ? cuts.filter((cut) => cutHolds(parts, cut)) : [];
		for (const cut of left) done.add(`${path}#${cut.name}`);
		for (const [at, effect] of parts.effects.entries()) {
			lines.add(`${relative(dirname(file), path)}#effect ${at}:${effect.text}`);
			for (const name of effect.references) need(path, name);
		}
		for (const [key, imported] of parts.imports) {
			if (key.startsWith('import ') && imported.from.startsWith('.'))
				needAll(resolve(dirname(path), imported.from));
		}
		return parts;
	};
	const needAll = (path: string) => {
		const parts = partsOf(path);
		for (const name of parts?.declarations.keys() ?? []) need(path, name);
	};
	const need = (path: string, name: string) => {
		const key = `${path}#${name}`;
		if (done.has(key)) return;
		done.add(key);
		const parts = partsOf(path);
		if (!parts) return;
		const imported = parts.imports.get(name);
		if (imported?.from.startsWith('.')) {
			const target = resolve(dirname(path), imported.from);
			if (imported.name === null || imported.name === 'default') needAll(target);
			else need(target, imported.name);
			return;
		}
		for (const declaration of parts.declarations.get(name) ?? []) {
			lines.add(`${relative(dirname(file), path)}#${name}:${declaration.text}`);
			for (const reference of declaration.references) need(path, reference);
		}
	};
	partsOf(file);
	for (const root of roots) need(file, root);
	return digest([...lines].sort().join('\n'));
}

const TS_FILE = /\.(ts|mts|cts)$/;

/** The relative paths that a source file imports when it runs: an import of types only is no member. */
function runtimeImports(file: string, text: string): string[] {
	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
	const out: string[] = [];
	for (const statement of source.statements) {
		if (
			(ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly !== true) ||
			(ts.isExportDeclaration(statement) && !statement.isTypeOnly)
		) {
			const from = statement.moduleSpecifier;
			if (from && ts.isStringLiteral(from)) out.push(from.text);
		}
	}
	if (!text.includes('import(')) return out;
	const visit = (node: ts.Node) => {
		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			const [from] = node.arguments;
			if (from && ts.isStringLiteralLike(from)) out.push(from.text);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return out;
}

/**
 * The source files that `entries` import, to any depth: each `import`, `export … from` and
 * `import()` with a relative path. `stop` names files whose own imports are not followed.
 * With `runtimeOnly`, an import of types only is not followed: it does not run. The result is
 * sorted; `missing` has each relative import that has no file.
 */
export function importClosure(
	entries: string[],
	stop: string[] = [],
	runtimeOnly = false,
): { files: string[]; missing: string[] } {
	const seen = new Set<string>();
	const missing = new Set<string>();
	const stopped = new Set(stop.map((file) => resolve(file)));
	const queue = entries.map((entry) => resolve(entry));
	while (queue.length > 0) {
		const file = queue.pop();
		if (file === undefined || seen.has(file)) continue;
		seen.add(file);
		if (stopped.has(file) || !TS_FILE.test(file)) continue;
		let text: string;
		try {
			text = readFileSync(file, 'utf8');
		} catch {
			missing.add(file);
			continue;
		}
		const all = ts.preProcessFile(text, true, true).importedFiles.map((entry) => entry.fileName);
		const relatives = all.filter((name) => name.startsWith('.'));
		const imports =
			runtimeOnly && relatives.length > 0
				? runtimeImports(file, text).filter((name) => name.startsWith('.'))
				: relatives;
		for (const name of imports) {
			const target = resolve(dirname(file), name);
			if (existsSync(target)) queue.push(target);
			else missing.add(target);
		}
	}
	return { files: [...seen].sort(), missing: [...missing].sort() };
}

/** A path from `root` with `/` between its parts: the same text on each machine. */
export function portablePath(root: string, path: string): string {
	return relative(root, path).split(sep).join('/');
}
