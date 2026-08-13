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

/** Normalised so the terse `"@n8n/x*"` form and the explicit `"@n8n/x"` + `"@n8n/x/*"` pair compare equal. */
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
 * Mirrors vite's resolve plugin: first match wins, rewrite via `String.replace`. An unmatched
 * specifier falls through to node resolution, which lands on the package's built `dist`.
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

	// Not hypothetical: four packages spent months typechecked from `src` while built from `dist`.
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
			// editor-ui's own browser stub, not a package consumed from source.
			.filter((name) => name !== '@n8n/expression-runtime');

		expect(pathed.filter((name) => !aliased.has(name))).toEqual([]);
	});

	it('agrees with the shared module tsconfig base', () => {
		// Disagreement typechecks modules against a src the editor never bundles.
		const modulePaths = pathsByPackage(join(MODULE_TSCONFIG, 'tsconfig.frontend-module.json'));

		for (const [name, srcDir] of modulePaths) {
			expect({ name, srcDir }).toEqual({ name, srcDir: editorUiPaths.get(name) });
		}
	});

	it('resolves @n8n/tournament from source', () => {
		// Transitive via `n8n-workflow`, so not a declared dependency and not in `sourcePackages`.
		// Its dist is CJS: named-export parse failure in dev, ~397 kB of defeated tree-shaking.
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
		// Every `packages/modules/*/frontend` vitest spreads this set, and a module's `node_modules`
		// is not the shell's — a rewrite to a bare specifier only editor-ui declares breaks there.
		const shared = frontendAliases(packagesDir).map(({ replacement }) => replacement);

		expect(shared.filter((replacement) => !replacement.startsWith(packagesDir))).toEqual([]);
	});

	it('resolves a package and its subpaths independently of entry order', () => {
		// An open-ended `^@n8n/chat(.+)$` would also match `@n8n/chat-hub/…`.
		expect(resolveSpecifier('@n8n/chat-hub/api', aliases)).toBe('packages/@n8n/chat-hub/src/api');
		expect(resolveSpecifier('@n8n/chat-hub/api', [...aliases].reverse())).toBe(
			'packages/@n8n/chat-hub/src/api',
		);
	});
});
