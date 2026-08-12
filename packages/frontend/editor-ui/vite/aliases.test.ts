import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type { Alias } from 'vite';
import { describe, expect, it } from 'vitest';

import { frontendAliases, modulePackages, sourcePackages } from '@n8n/frontend-vite-config';

import { editorUiAliases } from './aliases.mjs';

// vitest runs with the package root as cwd; `import.meta.url` is not a file URL under jsdom.
const editorUiDir = process.cwd();
const packagesDir = resolve(editorUiDir, '..', '..');
const repoRoot = resolve(packagesDir, '..');

const MODULE_TSCONFIG = join(repoRoot, 'packages', '@n8n', 'typescript-config');

/** tsconfigs are JSONC. The frontend ones only ever carry whole-line `//` comments. */
const readTsconfig = (file: string) =>
	JSON.parse(
		readFileSync(file, 'utf8')
			.split('\n')
			.filter((line) => !line.trim().startsWith('//'))
			.join('\n'),
	) as { compilerOptions?: { paths?: Record<string, string[]> } };

/**
 * Reduce a tsconfig `paths` block to one absolute src directory per package, so the terse
 * `"@n8n/x*"` form and the explicit `"@n8n/x"` + `"@n8n/x/*"` pair compare equal.
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
 * Vite picks the first matching entry and rewrites with `String.replace`, so a faithful check has
 * to model both — see `matches$1`/`alias$1` in vite's resolve plugin. An unmatched specifier falls
 * through to node resolution, which lands on the package's built `dist`.
 */
const resolveSpecifier = (specifier: string, aliases: Alias[]): string => {
	const matched = aliases.find(({ find }) =>
		typeof find === 'string'
			? specifier === find || specifier.startsWith(`${find}/`)
			: find.test(specifier),
	);

	if (!matched) return 'dist';

	const target = specifier.replace(matched.find, matched.replacement);

	// A directory target and its `index.ts` are the same module; only the spelling differs.
	const asIndex = join(target, 'index.ts');
	return relative(repoRoot, existsSync(asIndex) ? asIndex : target);
};

describe('editor-ui vite aliases', () => {
	const aliases = editorUiAliases(editorUiDir, packagesDir);
	const editorUiPaths = pathsByPackage(join(editorUiDir, 'tsconfig.json'));

	// Both lists are hand-maintained, and drifting apart is not a hypothetical: four packages
	// spent months typechecked from `src` while the bundle was built from their `dist`. Adding a
	// package to one list and not the other has to fail here.
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
		// The direction that actually bit: a tsconfig path added without the matching alias.
		const aliased = new Set([...sourcePackages, ...modulePackages].map(({ name }) => name));
		const pathed = [...editorUiPaths.keys()]
			// editor-ui's own browser stub, not a package consumed from source.
			.filter((name) => name !== '@n8n/expression-runtime');

		expect(pathed.filter((name) => !aliased.has(name))).toEqual([]);
	});

	it('agrees with the shared module tsconfig base', () => {
		// Module packages extend that base, so a package pointed at a different src there would
		// typecheck modules against something the editor never bundles.
		const modulePaths = pathsByPackage(join(MODULE_TSCONFIG, 'tsconfig.frontend-module.json'));

		for (const [name, srcDir] of modulePaths) {
			expect({ name, srcDir }).toEqual({ name, srcDir: editorUiPaths.get(name) });
		}
	});

	it('resolves @n8n/tournament from source', () => {
		// Reached transitively via `n8n-workflow`, so it is not a declared dependency and is not in
		// `sourcePackages`. Its dist is CJS: on `dist` the dev server fails to parse a named export
		// out of it and the build loses ~397 kB to defeated tree-shaking.
		expect(resolveSpecifier('@n8n/tournament', aliases)).toBe(
			'packages/@n8n/tournament/src/index.ts',
		);
		expect(resolveSpecifier('@n8n/tournament/ast', aliases)).toBe(
			'packages/@n8n/tournament/src/ast',
		);
	});

	it('still applies the vendor rewrites the shared set drops', () => {
		// They moved after the source and module aliases; nothing above matches a `lodash.*` or a
		// `stream` specifier, so the shell keeps rewriting both. Only editor-ui declares the targets.
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
		// `frontendAliases` is spread into every `packages/modules/*/frontend` vitest config, and a
		// module's `node_modules` is not the shell's. An entry rewriting to a bare specifier only
		// editor-ui declares — `stream` → `stream-browserify`, `lodash.camelCase` → `lodash/camelCase`
		// — makes the module fail to resolve it, reporting the original specifier rather than the
		// alias. Those belong in `vendorAliases`, which only the shell composes.
		const shared = frontendAliases(packagesDir).map(({ replacement }) => replacement);

		expect(shared.filter((replacement) => !replacement.startsWith(packagesDir))).toEqual([]);
	});

	it('resolves a package and its subpaths independently of entry order', () => {
		// An open-ended `^@n8n/chat(.+)$` also matches `@n8n/chat-hub/…`, so a list carrying both
		// only resolves correctly while the more specific entry happens to come first.
		expect(resolveSpecifier('@n8n/chat-hub/api', aliases)).toBe('packages/@n8n/chat-hub/src/api');
		expect(resolveSpecifier('@n8n/chat-hub/api', [...aliases].reverse())).toBe(
			'packages/@n8n/chat-hub/src/api',
		);
	});
});
