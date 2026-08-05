import {
	findFrontendSourcePackages,
	frontendSourcePaths,
} from '@n8n/vitest-config/frontend-aliases';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { Alias } from 'vite';
import { describe, expect, it } from 'vitest';

import { editorUiAliases } from './aliases.mjs';

// vitest runs with the package root as cwd; `import.meta.url` is not a file URL under jsdom.
const editorUiDir = process.cwd();
const packagesDir = resolve(editorUiDir, '..', '..');
const repoRoot = resolve(packagesDir, '..');

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

const manifest = JSON.parse(readFileSync(join(editorUiDir, 'package.json'), 'utf8')) as {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};
const declared = new Set([
	...Object.keys(manifest.dependencies ?? {}),
	...Object.keys(manifest.devDependencies ?? {}),
]);

const sourcePackages = findFrontendSourcePackages(repoRoot).filter(({ name }) =>
	declared.has(name),
);

describe('editor-ui vite aliases', () => {
	const aliases = editorUiAliases(editorUiDir, packagesDir);

	it.each(sourcePackages)(
		'resolves $name from source, not from its dist',
		({ name, srcDir, entry }) => {
			const src = relative(repoRoot, srcDir);

			// Subpath and bare imports are separate resolution classes; a list can cover one and
			// silently leave the other on `dist`, which is how vue-tsc and the bundle came to
			// disagree on four packages. `entry`-less packages expose no `.` and so have no bare form.
			expect(resolveSpecifier(`${name}/probe`, aliases)).toBe(`${src}/probe`);
			if (entry) expect(resolveSpecifier(name, aliases)).toBe(relative(repoRoot, entry));
		},
	);

	it('resolves a package and its subpaths independently of entry order', () => {
		// An open-ended `^@n8n/chat(.+)$` also matches `@n8n/chat-hub/…`, so a list carrying both
		// only resolves correctly while the more specific entry happens to come first.
		expect(resolveSpecifier('@n8n/chat-hub/api', aliases)).toBe('packages/@n8n/chat-hub/src/api');
		expect(resolveSpecifier('@n8n/chat-hub/api', [...aliases].reverse())).toBe(
			'packages/@n8n/chat-hub/src/api',
		);
	});

	it('resolves @n8n/tournament from source', () => {
		// Reached transitively via `n8n-workflow`, so it is not a declared dependency and the
		// generated mapping does not cover it. Its dist is CJS: on `dist` the dev server fails to
		// parse a named export out of it and the build loses ~397 kB to defeated tree-shaking.
		expect(resolveSpecifier('@n8n/tournament', aliases)).toBe(
			'packages/@n8n/tournament/src/index.ts',
		);
		expect(resolveSpecifier('@n8n/tournament/ast', aliases)).toBe(
			'packages/@n8n/tournament/src/ast',
		);
	});

	it('keeps feature modules out of the shared module tsconfig base', () => {
		// The base is what module packages extend. A `paths` entry for another module would hand
		// every module a typechecked path into every other module's src.
		const paths = frontendSourcePaths({
			repoRoot,
			fromDir: join(repoRoot, 'packages', '@n8n', 'typescript-config'),
		});

		const moduleRoot = join('packages', 'frontend', 'modules');
		const leaked = Object.entries(paths).filter(([, [target]]) =>
			relative(
				repoRoot,
				join(repoRoot, 'packages', '@n8n', 'typescript-config', target),
			).startsWith(moduleRoot),
		);

		expect(leaked).toEqual([]);
	});
});
