/**
 * Reports the JSDoc coverage of the public surface and fails when a part has no JSDoc. The
 * surface is every export of each `exports` entry of this package and of the
 * `@n8n/workflow-sdk/next` entry, plus the fields of the exported types: interface and type
 * literal members (also inline option objects of exported functions), public class members,
 * and the members of an exported object such as `t`. A part counts as documented when its hover
 * shows a summary line. `--list` prints every part that has no JSDoc.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

// TypeScript 7 has no compiler API. The repository root keeps TypeScript 6 for such tools.
import ts from '../../../../node_modules/typescript/lib/typescript.js';

export interface SurfacePart {
	readonly name: string;
	/** `<path from the repository root>:<line>` of the declaration. */
	readonly at: string;
	readonly documented: boolean;
	/** Declared in another package, e.g. a re-export of `@n8n/utils`. Its JSDoc lives there. */
	readonly external?: boolean;
}

export interface EntryCoverage {
	/** The import specifier, e.g. `@n8n/node-sdk/credentials`. */
	readonly entry: string;
	readonly exports: readonly SurfacePart[];
	readonly fields: readonly SurfacePart[];
}

const PACKAGES_DIR = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(PACKAGES_DIR, '..', '..');

export interface PackageEntries {
	readonly dir: string;
	readonly name: string;
	/** The field walk follows type references into this directory only. */
	readonly followRoot: string;
	/** Subpath (`.`, `./host`, …) to source file. */
	readonly entries: ReadonlyArray<readonly [string, string]>;
}

const isEntry = (value: unknown): value is { types: string } =>
	typeof value === 'object' &&
	value !== null &&
	'types' in value &&
	typeof value.types === 'string';

/** Maps each `exports` entry to its source: `./dist/x.d.ts` comes from `src/x.ts`. */
export const packageEntries = (
	dir: string,
	followRoot: string,
	only?: readonly string[],
): PackageEntries => {
	const manifest: { name: string; exports: Record<string, unknown> } = JSON.parse(
		readFileSync(path.join(dir, 'package.json'), 'utf8'),
	);
	const entries = Object.entries(manifest.exports)
		.filter(([subpath]) => !only || only.includes(subpath))
		.flatMap(
			([subpath, target]): Array<readonly [string, string]> =>
				isEntry(target)
					? [
							[
								subpath,
								path.join(
									dir,
									target.types.replace(/^\.\/dist\//, 'src/').replace(/\.d\.ts$/, '.ts'),
								),
							],
						]
					: [],
		);
	return { dir, name: manifest.name, followRoot: path.join(dir, followRoot), entries };
};

const SURFACE: readonly PackageEntries[] = [
	packageEntries(path.join(PACKAGES_DIR, 'node-sdk'), 'src'),
	// The legacy builder under `src/workflow-builder` is not part of the `next` surface.
	packageEntries(path.join(PACKAGES_DIR, 'workflow-sdk'), 'src/next', ['./next']),
];

const programOf = ({ dir, entries }: PackageEntries): ts.Program => {
	const configPath = path.join(dir, 'tsconfig.json');
	const config = ts.readConfigFile(configPath, (file) => ts.sys.readFile(file));
	const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dir, undefined, configPath);
	return ts.createProgram(
		entries.map(([, file]) => file),
		{ ...parsed.options, noEmit: true, incremental: false },
	);
};

const docOf = (symbol: ts.Symbol, checker: ts.TypeChecker): string =>
	ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();

const resolved = (symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol =>
	symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

/** The hover of `t.str` shows the docs of `str` when the object names it (`{ str }`, `{ is: isX }`). */
const hoverDocOf = (symbol: ts.Symbol, checker: ts.TypeChecker): string => {
	const own = docOf(symbol, checker);
	if (own) return own;
	const declaration = symbol.valueDeclaration;
	const target =
		declaration && ts.isShorthandPropertyAssignment(declaration)
			? checker.getShorthandAssignmentValueSymbol(declaration)
			: declaration &&
					ts.isPropertyAssignment(declaration) &&
					ts.isIdentifier(declaration.initializer)
				? checker.getSymbolAtLocation(declaration.initializer)
				: undefined;
	return target ? docOf(resolved(target, checker), checker) : '';
};

const atOf = (node: ts.Node): string => {
	const source = node.getSourceFile();
	const { line } = source.getLineAndCharacterOfPosition(node.getStart());
	return `${path.relative(REPO_ROOT, source.fileName)}:${line + 1}`;
};

const isOwnSource = (node: ts.Node): boolean =>
	!node.getSourceFile().fileName.includes('/node_modules/') &&
	!node.getSourceFile().isDeclarationFile;

const isPublicMember = (member: ts.ClassElement): boolean =>
	!ts.isConstructorDeclaration(member) &&
	!ts.isClassStaticBlockDeclaration(member) &&
	!ts.isSemicolonClassElement(member) &&
	!(member.name && ts.isPrivateIdentifier(member.name)) &&
	!(ts.getCombinedModifierFlags(member) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected));

/** Nodes of a declaration that a hover can reach: types and signatures, not function bodies. */
const typeRootsOf = (declaration: ts.Declaration): readonly ts.Node[] => {
	if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration))
		return [declaration];
	if (ts.isFunctionDeclaration(declaration)) return signatureNodesOf(declaration);
	if (ts.isVariableDeclaration(declaration)) {
		const { type, initializer } = declaration;
		const fn =
			initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
				? signatureNodesOf(initializer)
				: [];
		return [...(type ? [type] : []), ...fn];
	}
	return [];
};

const signatureNodesOf = (fn: ts.SignatureDeclarationBase): readonly ts.Node[] => [
	...(fn.typeParameters ?? []),
	...fn.parameters,
	...(fn.type ? [fn.type] : []),
];

/** `readonly url?: never` only makes the branches of a union exclusive. It is not a field. */
const isField = (node: ts.Node): node is ts.PropertySignature | ts.MethodSignature =>
	(ts.isPropertySignature(node) && node.type?.kind !== ts.SyntaxKind.NeverKeyword) ||
	ts.isMethodSignature(node);

/** What the field walk of one entry shares: the checker, where it may follow, what it saw. */
interface Walk {
	readonly checker: ts.TypeChecker;
	/** The walk follows type references into declarations under this directory. */
	readonly followRoot: string;
	readonly seen: Set<ts.Node>;
}

const partOfNode = (node: ts.NamedDeclaration, walk: Walk, owner: string): SurfacePart => {
	const symbol = node.name ? walk.checker.getSymbolAtLocation(node.name) : undefined;
	const name = node.name ? node.name.getText() : '?';
	return {
		name: `${owner}.${name}`,
		at: atOf(node),
		documented: symbol ? hoverDocOf(symbol, walk.checker) !== '' : false,
	};
};

const isFollowed = (node: ts.Node, walk: Walk): boolean =>
	isOwnSource(node) && node.getSourceFile().fileName.startsWith(walk.followRoot);

/** The declarations behind a type reference, e.g. the non-exported interface an option type extends. */
const referencedOf = (
	node: ts.Node,
	walk: Walk,
): ReadonlyArray<ts.InterfaceDeclaration | ts.TypeAliasDeclaration> => {
	const name = ts.isTypeReferenceNode(node)
		? node.typeName
		: ts.isExpressionWithTypeArguments(node)
			? node.expression
			: undefined;
	const symbol = name && walk.checker.getSymbolAtLocation(name);
	return symbol
		? (resolved(symbol, walk.checker).declarations ?? []).filter(
				(declaration): declaration is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
					(ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) &&
					isFollowed(declaration, walk),
			)
		: [];
};

/** The fields under `root`, and the fields of the local types that `root` names. */
const fieldsBelow = (root: ts.Node, owner: string, walk: Walk): SurfacePart[] => {
	const found: SurfacePart[] = [];
	const visit = (node: ts.Node, nodeOwner: string): void => {
		if (isField(node)) found.push(partOfNode(node, walk, nodeOwner));
		referencedOf(node, walk)
			.filter((declaration) => !walk.seen.has(declaration))
			.forEach((declaration) => {
				walk.seen.add(declaration);
				visit(declaration, declaration.name.getText());
			});
		// The `extends` side of a conditional type is a pattern, not a field a user writes.
		ts.forEachChild(node, (child) => {
			if (!(ts.isConditionalTypeNode(node) && child === node.extendsType)) visit(child, nodeOwner);
		});
	};
	visit(root, owner);
	return found;
};

/** The declarations that a member of an exported object stands for: `{ str }`, `{ is: isX }`, or inline. */
const memberTargetsOf = (property: ts.Symbol, walk: Walk): readonly ts.Declaration[] => {
	const declaration = property.valueDeclaration;
	if (!declaration) return [];
	if (ts.isShorthandPropertyAssignment(declaration)) {
		const value = walk.checker.getShorthandAssignmentValueSymbol(declaration);
		return value ? (resolved(value, walk.checker).declarations ?? []) : [];
	}
	if (ts.isPropertyAssignment(declaration)) {
		const { initializer } = declaration;
		if (ts.isIdentifier(initializer)) {
			const value = walk.checker.getSymbolAtLocation(initializer);
			return value ? (resolved(value, walk.checker).declarations ?? []) : [];
		}
		return ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)
			? [initializer]
			: [];
	}
	return [];
};

const signatureRootsOf = (declaration: ts.Declaration): readonly ts.Node[] =>
	ts.isArrowFunction(declaration) || ts.isFunctionExpression(declaration)
		? signatureNodesOf(declaration)
		: typeRootsOf(declaration);

const fieldsOf = (exported: ts.Symbol, name: string, walk: Walk): SurfacePart[] => {
	const { checker } = walk;
	const own = (exported.declarations ?? []).filter(isOwnSource);
	// A hover shows the overloads. The implementation signature is not in the `.d.ts`.
	const overloaded = own.some(
		(declaration) => ts.isFunctionDeclaration(declaration) && !declaration.body,
	);
	const declarations = own.filter(
		(declaration) => !(overloaded && ts.isFunctionDeclaration(declaration) && declaration.body),
	);
	declarations.forEach((declaration) => walk.seen.add(declaration));
	const typeFields = declarations
		.flatMap(typeRootsOf)
		.flatMap((root) => fieldsBelow(root, name, walk));
	const classFields = declarations
		.filter(ts.isClassDeclaration)
		.flatMap((declaration) => declaration.members.filter(isPublicMember))
		.map((member) => partOfNode(member, walk, name));
	const objectFields = declarations
		.filter(ts.isVariableDeclaration)
		.filter(
			(declaration) =>
				!declaration.type &&
				declaration.initializer !== undefined &&
				ts.isObjectLiteralExpression(declaration.initializer),
		)
		.flatMap(() => checker.getPropertiesOfType(checker.getTypeOfSymbol(exported)))
		.flatMap((property) => {
			const declaration = property.valueDeclaration;
			if (!declaration || !isOwnSource(declaration)) return [];
			const member = `${name}.${property.name}`;
			return [
				{ name: member, at: atOf(declaration), documented: hoverDocOf(property, checker) !== '' },
				...memberTargetsOf(property, walk)
					.filter((target) => isFollowed(target, walk))
					.flatMap(signatureRootsOf)
					.flatMap((root) => fieldsBelow(root, member, walk)),
			];
		});
	return [...typeFields, ...classFields, ...objectFields];
};

const unique = (parts: readonly SurfacePart[]): SurfacePart[] => [
	...new Map(parts.map((part) => [`${part.at} ${part.name}`, part])).values(),
];

const entryCoverage = (
	program: ts.Program,
	entry: string,
	file: string,
	followRoot: string,
): EntryCoverage => {
	const checker = program.getTypeChecker();
	const source = program.getSourceFile(file);
	const module = source && checker.getSymbolAtLocation(source);
	if (!module) throw new Error(`No module for ${entry} at ${file}`);
	const exported = checker
		.getExportsOfModule(module)
		.map((symbol) => ({ name: symbol.name, symbol: resolved(symbol, checker) }))
		.sort((a, b) => a.name.localeCompare(b.name));
	return {
		entry,
		exports: exported.map(({ name, symbol }) => {
			const declaration = symbol.declarations?.[0];
			return {
				name,
				at: declaration ? atOf(declaration) : '?',
				documented: docOf(symbol, checker) !== '',
				...(declaration && !isOwnSource(declaration) ? { external: true } : {}),
			};
		}),
		fields: unique(
			exported.flatMap(({ name, symbol }) =>
				fieldsOf(symbol, name, { checker, followRoot, seen: new Set() }),
			),
		),
	};
};

export const jsdocCoverage = (surfaces: readonly PackageEntries[] = SURFACE): EntryCoverage[] =>
	surfaces.flatMap((surface) => {
		const program = programOf(surface);
		return surface.entries.map(([subpath, file]) =>
			entryCoverage(program, path.posix.join(surface.name, subpath), file, surface.followRoot),
		);
	});

const ratio = (parts: readonly SurfacePart[]): string =>
	`${parts.filter((part) => part.documented).length}/${parts.length}`;

if (require.main === module) {
	const coverage = jsdocCoverage();
	const rows = coverage.map(
		({ entry, exports, fields }) => `| \`${entry}\` | ${ratio(exports)} | ${ratio(fields)} |`,
	);
	const allExports = unique(coverage.flatMap((entry) => entry.exports));
	const allFields = unique(coverage.flatMap((entry) => entry.fields));
	const missing = [...allExports, ...allFields].filter(
		(part) => !part.documented && !part.external,
	);
	const external = allExports.filter((part) => !part.documented && part.external);
	console.log(
		[
			'| Entry | Exports | Fields |',
			'|---|---|---|',
			...rows,
			`| all (unique) | ${ratio(allExports)} | ${ratio(allFields)} |`,
		].join('\n'),
	);
	if (process.argv.includes('--list'))
		missing.forEach((part) => console.log(`${part.at} ${part.name}`));
	external.forEach((part) =>
		console.log(
			`Not checked: ${part.name} comes from ${part.at} without JSDoc in its build output.`,
		),
	);
	if (missing.length > 0) {
		console.error(`${missing.length} parts of the public surface have no JSDoc. Run with --list.`);
		process.exitCode = 1;
	}
}
