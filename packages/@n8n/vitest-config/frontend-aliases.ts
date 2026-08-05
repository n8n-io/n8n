import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * The frontend consumes its workspace packages from source, not from `dist`, so that a
 * dev-server edit in `@n8n/stores` hot-reloads the editor without a rebuild. That mapping
 * used to be hand-written per consumer (a Vite alias array plus a tsconfig `paths` block,
 * each maintained separately) which is how the two drifted apart. This module derives it
 * from the filesystem instead, so one scan feeds every consumer.
 */

/** Feature module packages (L3). Scaffolded by `pnpm setup-frontend-module`. */
const FRONTEND_MODULE_ROOT = 'packages/frontend/modules';

/** Workspace directories whose packages are consumed from source. Scanned, not enumerated. */
const FRONTEND_PACKAGE_ROOTS = ['packages/frontend/@n8n', FRONTEND_MODULE_ROOT];

/**
 * Packages outside `packages/frontend` that the frontend still consumes from source.
 * Hand-listed because the scan deliberately owns `packages/frontend` only — every entry
 * here is a package that would move under `packages/frontend` in a tidier layout.
 */
const SHARED_SOURCE_PACKAGE_DIRS = [
	'packages/@n8n/api-types',
	'packages/@n8n/chat-hub',
	'packages/@n8n/constants',
	'packages/@n8n/telemetry',
	'packages/@n8n/utils',
];

export interface FrontendSourcePackage {
	/** Package name as declared in its package.json, e.g. `@n8n/stores`. */
	name: string;
	/** Absolute path to the package directory. */
	dir: string;
	/** Absolute path to the package's `src` directory. */
	srcDir: string;
	/**
	 * Absolute path to `src/index.ts`, when the package has a root entry. Packages without
	 * one (`@n8n/composables`, `@n8n/utils`, …) are subpath-only — they expose `./*` and no
	 * `.` in their `exports`, so a bare import of them does not resolve and must not be aliased.
	 */
	entry?: string;
	/** True for feature module packages under `packages/frontend/modules`. */
	isModule: boolean;
}

const readPackageJson = (dir: string): Record<string, unknown> | undefined => {
	const manifest = join(dir, 'package.json');
	if (!existsSync(manifest)) return undefined;
	return JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, unknown>;
};

const readPackage = (
	dir: string,
	isModule: boolean,
): FrontendSourcePackage | undefined => {
	const manifest = readPackageJson(dir);
	if (typeof manifest?.name !== 'string') return undefined;

	// No `src` means nothing to alias — `@n8n/storybook` is an app, not a source package.
	const srcDir = join(dir, 'src');
	if (!existsSync(srcDir)) return undefined;

	const entry = join(srcDir, 'index.ts');

	return {
		name: manifest.name,
		dir,
		srcDir,
		...(existsSync(entry) ? { entry } : {}),
		isModule,
	};
};

/**
 * Every workspace package the frontend consumes from source, sorted by name so generated
 * output is stable. Missing directories are skipped, not an error: `packages/frontend/modules`
 * does not exist until the first module lands.
 */
export const findFrontendSourcePackages = (repoRoot: string): FrontendSourcePackage[] => {
	const dirs = FRONTEND_PACKAGE_ROOTS.flatMap((root) => {
		const absoluteRoot = resolve(repoRoot, root);
		if (!existsSync(absoluteRoot)) return [];
		const isModule = root === FRONTEND_MODULE_ROOT;
		return readdirSync(absoluteRoot, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => ({ dir: join(absoluteRoot, entry.name), isModule }));
	}).concat(
		SHARED_SOURCE_PACKAGE_DIRS.map((dir) => ({
			dir: resolve(repoRoot, dir),
			isModule: false,
		})),
	);

	const packages = dirs
		.map(({ dir, isModule }) => readPackage(dir, isModule))
		.filter((pkg): pkg is FrontendSourcePackage => pkg !== undefined);

	return packages.sort((a, b) => a.name.localeCompare(b.name));
};

/** Names a package.json declares as a dependency, in any dependency field. */
const declaredDependencies = (dir: string): Set<string> => {
	const manifest = readPackageJson(dir);
	const fields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
	const names = fields.flatMap((field) =>
		Object.keys((manifest?.[field] as Record<string, string> | undefined) ?? {}),
	);
	return new Set(names);
};

/**
 * Restricting the mapping to declared dependencies is what keeps turbo's cache honest: turbo
 * hashes a package by its declared deps, so aliasing a package it does not declare means edits
 * to that package never invalidate the consumer. It also retires aliases on their own — an
 * alias for a package nobody depends on stops being emitted instead of rotting in place.
 */
const forConsumer = (
	packages: FrontendSourcePackage[],
	consumerDir?: string,
): FrontendSourcePackage[] => {
	if (!consumerDir) return packages;
	const declared = declaredDependencies(consumerDir);
	return packages.filter((pkg) => declared.has(pkg.name));
};

const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface FrontendAliasOptions {
	/** Absolute path to the repository root. */
	repoRoot: string;
	/** Absolute path to the consuming package, to restrict the mapping to its declared deps. */
	consumerDir?: string;
}

/**
 * Vite `resolve.alias` entries pointing every source-consumed package at its `src`.
 *
 * Each package gets a slash-delimited, anchored pair — `^@n8n/chat$` and `^@n8n/chat/(.+)$` —
 * rather than one open-ended `^@n8n/chat(.+)$`. The open form also matches `@n8n/chat-hub/x`,
 * so today's list only resolves chat-hub correctly because an earlier entry happens to shadow
 * it; anchoring makes resolution independent of array order.
 */
export const frontendSourceAliases = (
	options: FrontendAliasOptions,
): Array<{ find: RegExp; replacement: string }> =>
	forConsumer(findFrontendSourcePackages(options.repoRoot), options.consumerDir).flatMap((pkg) => {
		const name = escapeForRegExp(pkg.name);
		return [
			...(pkg.entry ? [{ find: new RegExp(`^${name}$`), replacement: pkg.entry }] : []),
			{ find: new RegExp(`^${name}/(.+)$`), replacement: `${pkg.srcDir}/$1` },
		];
	});

export interface FrontendPathsOptions extends FrontendAliasOptions {
	/** Absolute path to the directory the emitted paths are relative to (the tsconfig's own dir). */
	fromDir: string;
	/**
	 * Leave feature module packages out of the mapping. The shared module base sets this: a
	 * module's typecheck program should see the L0-L2 packages below it and no sibling module,
	 * so an accidental cross-module import fails to resolve rather than resolving silently.
	 */
	excludeModules?: boolean;
}

/**
 * The same mapping as a tsconfig `paths` block, relative to `fromDir`.
 *
 * Two explicit keys per package rather than the repo's terser `"@n8n/x*"`: the terse form also
 * matches sibling packages by prefix (`@n8n/chat*` swallows `@n8n/chat-hub`) and relies on
 * longest-prefix-wins to stay correct. `baseUrl` is deliberately absent — TypeScript 6 reports
 * it as deprecated (TS5101), and relative `paths` anchor to the file that declares them, which
 * is what lets one shared base serve packages at any depth.
 */
export const frontendSourcePaths = (options: FrontendPathsOptions): Record<string, string[]> => {
	const toPosix = (path: string) => relative(options.fromDir, path).split('\\').join('/');
	const packages = forConsumer(
		findFrontendSourcePackages(options.repoRoot),
		options.consumerDir,
	).filter((pkg) => !(options.excludeModules && pkg.isModule));

	const entries: Array<[string, string[]]> = packages.flatMap((pkg) => [
		...(pkg.entry ? [[pkg.name, [toPosix(pkg.entry)]] as [string, string[]]] : []),
		[`${pkg.name}/*`, [`${toPosix(pkg.srcDir)}/*`]] as [string, string[]],
	]);

	return Object.fromEntries(entries);
};
