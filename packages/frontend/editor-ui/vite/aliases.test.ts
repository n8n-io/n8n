import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import type { Alias } from 'vite';
import { describe, expect, it } from 'vitest';

import { frontendAliases, modulePackages, sourcePackages } from '@n8n/frontend-vite-config';

import { editorUiAliases } from './aliases.mjs';

// vitest sets the cwd to the package root. Under jsdom, `import.meta.url` is not a file URL.
const editorUiDir = process.cwd();
const packagesDir = resolve(editorUiDir, '..', '..');
const repoRoot = resolve(packagesDir, '..');

const MODULE_TSCONFIG = join(repoRoot, 'packages', '@n8n', 'typescript-config');

/** A tsconfig file is JSONC. The frontend ones carry only whole-line `//` comments. */
const readTsconfig = (file: string) =>
	JSON.parse(
		readFileSync(file, 'utf8')
			.split('\n')
			.filter((line) => !line.trim().startsWith('//'))
			.join('\n'),
	) as { compilerOptions?: { paths?: Record<string, string[]> } };

/**
 * This function treats the short `"@n8n/x*"` form as the `"@n8n/x"` plus `"@n8n/x/*"` pair. That
 * holds for the directory each maps to, but not for how TypeScript resolves a bare specifier — see
 * `resolves the bare specifier of every entry package to src` below.
 */
const pathsByPackage = (file: string) => {
	const paths = readTsconfig(file).compilerOptions?.paths ?? {};
	const byPackage = new Map<string, string>();

	for (const [key, [target]] of Object.entries(paths)) {
		const name = key.replace(/\/?\*$/, '');
		if (!name.startsWith('@n8n/')) continue;

		const resolved = resolve(dirname(file), target.replace(/\/?\*$/, ''));
		byPackage.set(name, resolved.endsWith('.ts') ? dirname(resolved) : resolved);
	}

	return byPackage;
};

/**
 * This function copies the resolve plugin of vite. The first match wins. The function then calls
 * `String.replace`.
 *
 * If no pattern matches, node resolution takes the specifier. Node resolution finds the built
 * `dist` of the package.
 */
const resolveSpecifier = (specifier: string, aliases: Alias[]): string => {
	const matched = aliases.find(({ find }) =>
		typeof find === 'string'
			? specifier === find || specifier.startsWith(`${find}/`)
			: find.test(specifier),
	);

	if (!matched) return 'dist';

	const target = specifier.replace(matched.find, matched.replacement);

	// A directory target and its `index.ts` are the same module. Only the text is different.
	const asIndex = join(target, 'index.ts');
	return relative(repoRoot, existsSync(asIndex) ? asIndex : target);
};

describe('editor-ui vite aliases', () => {
	const aliases = editorUiAliases(editorUiDir, packagesDir);
	const editorUiPaths = pathsByPackage(join(editorUiDir, 'tsconfig.json'));

	// This is a real failure. For months, four packages used `src` for the typecheck and `dist`
	// for the build.
	it.each([...sourcePackages, ...modulePackages])(
		'resolves $name to the same src as tsconfig does',
		({ name, dir }) => {
			const srcDir = resolve(packagesDir, dir, 'src');
			const src = relative(repoRoot, srcDir);

			expect(resolveSpecifier(`${name}/probe`, aliases)).toBe(`${src}/probe`);
			expect(editorUiPaths.get(name)).toBe(srcDir);
		},
	);

	it('aliases every source package editor-ui typechecks from src', () => {
		const aliased = new Set([...sourcePackages, ...modulePackages].map(({ name }) => name));
		const pathed = [...editorUiPaths.keys()]
			// This is the browser stub of editor-ui. It is not a package that the frontend reads from
			// source.
			.filter((name) => name !== '@n8n/expression-runtime');

		expect(pathed.filter((name) => !aliased.has(name))).toEqual([]);
	});

	it('agrees with the shared module tsconfig base', () => {
		// If the two files disagree, the typecheck of a module uses a `src` that the editor never
		// bundles.
		const modulePaths = pathsByPackage(join(MODULE_TSCONFIG, 'tsconfig.frontend-module.json'));

		for (const [name, srcDir] of modulePaths) {
			expect({ name, srcDir }).toEqual({ name, srcDir: editorUiPaths.get(name) });
		}
	});

	/**
	 * The short `"@n8n/x*"` form maps a bare specifier to a directory, which TS declines. Node
	 * resolution then reads the `exports` of the package and returns its `dist`, while the bundle
	 * reads `src`. The fix is an explicit pair: `"@n8n/x": [".../src/index.ts"]` beside `"@n8n/x/*"`.
	 */
	it('resolves the bare specifier of every entry package to src', () => {
		// Each still resolves to `dist` for the typecheck while the bundle reads `src`. Give a package
		// the explicit pair and delete it here; expect new type errors, since `dist` declarations are
		// looser than the source they come from.
		const KNOWN_DIST_FALLBACK = new Set([
			'@n8n/api-types',
			'@n8n/chat',
			'@n8n/chat-hub',
			'@n8n/constants',
			'@n8n/i18n',
			'@n8n/rest-api-client',
			'@n8n/stores',
		]);

		const probe = join(editorUiDir, 'src', 'app', 'App.vue');
		const configPath = ts.findConfigFile(probe, ts.sys.fileExists);
		if (!configPath) throw new Error('no tsconfig.json above src/app/App.vue');
		const { options } = ts.parseJsonConfigFileContent(
			ts.readConfigFile(configPath, ts.sys.readFile).config,
			ts.sys,
			dirname(configPath),
			undefined,
			configPath,
		);

		const offenders = [...sourcePackages, ...modulePackages]
			.filter(({ entry = true }) => entry)
			.filter(({ name }) => !KNOWN_DIST_FALLBACK.has(name))
			.filter(({ name }) => {
				const resolved = ts.resolveModuleName(name, probe, options, ts.sys).resolvedModule;
				return !resolved || !resolved.resolvedFileName.includes('/src/');
			})
			.map(({ name }) => name);

		expect(offenders).toEqual([]);
	});

	it('resolves @n8n/tournament from source', () => {
		// `n8n-workflow` brings in this package. Nothing declares it, so it is not in
		// `sourcePackages`. Its `dist` is CJS. The dev server gives a parse error for a named export.
		// The build loses tree-shaking and adds approximately 397 kB.
		expect(resolveSpecifier('@n8n/tournament', aliases)).toBe(
			'packages/@n8n/tournament/src/index.ts',
		);
		expect(resolveSpecifier('@n8n/tournament/ast', aliases)).toBe(
			'packages/@n8n/tournament/src/ast',
		);
	});

	it('still applies the vendor rewrites the shared set drops', () => {
		const rewrite = (specifier: string) => {
			const matched = aliases.find(({ find }) =>
				typeof find === 'string' ? specifier === find : find.test(specifier),
			);
			return matched ? specifier.replace(matched.find, matched.replacement) : 'unmatched';
		};

		expect(rewrite('stream')).toBe('stream-browserify');
		expect(rewrite('lodash.camelCase')).toBe('lodash/camelCase');
	});

	it('shares only aliases that resolve to workspace source', () => {
		// Each `packages/modules/*/frontend` vitest run uses this set. The `node_modules` of a module
		// is not the `node_modules` of the shell. A rewrite to a bare specifier that only editor-ui
		// declares fails there.
		const shared = frontendAliases(packagesDir).map(({ replacement }) => replacement);

		expect(shared.filter((replacement) => !replacement.startsWith(packagesDir))).toEqual([]);
	});

	it('resolves a package and its subpaths independently of entry order', () => {
		// One open pattern `^@n8n/chat(.+)$` also matches `@n8n/chat-hub/…`.
		expect(resolveSpecifier('@n8n/chat-hub/api', aliases)).toBe('packages/@n8n/chat-hub/src/api');
		expect(resolveSpecifier('@n8n/chat-hub/api', [...aliases].reverse())).toBe(
			'packages/@n8n/chat-hub/src/api',
		);
	});
});
