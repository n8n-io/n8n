import {
	findFrontendSourcePackages,
	frontendSourceAliases as generatedSourceAliases,
} from '@n8n/vitest-config/frontend-aliases';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { Alias } from 'vite';
import { describe, expect, it } from 'vitest';

import { frontendSourceAliases as handWrittenSourceAliases } from './aliases.mjs';

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

/**
 * Packages the hand-written list aliases but the scan does not produce, so switching over drops
 * them: `@n8n/tournament` is not a declared dependency of editor-ui and has no importers, and
 * `packages/frontend/@n8n/api-requests` does not exist at all.
 */
const RETIRED_PACKAGES = ['@n8n/tournament', '@n8n/api-requests'];

/** One bare and one subpath specifier per package — the two resolution classes an alias covers. */
const specifiers = [
	...findFrontendSourcePackages(repoRoot).map(({ name }) => name),
	...RETIRED_PACKAGES,
]
	.flatMap((name) => [name, `${name}/probe`])
	.sort();

describe('editor-ui vite aliases', () => {
	it('matches the generated frontend source mapping, except where that mapping is wider', () => {
		const handWritten = handWrittenSourceAliases(packagesDir);
		const generated = generatedSourceAliases({ repoRoot, consumerDir: editorUiDir });

		const deltas = Object.fromEntries(
			specifiers
				.map((specifier) => ({
					specifier,
					before: resolveSpecifier(specifier, handWritten),
					after: resolveSpecifier(specifier, generated),
				}))
				.filter(({ before, after }) => before !== after)
				.map(({ specifier, before, after }) => [specifier, { before, after }]),
		);

		// Every entry below is a specifier the hand-written list resolves from `dist` while
		// editor-ui's tsconfig already types it from `src` — the divergence the generated mapping
		// closes. Landing that is a separate commit, so it is spelled out here rather than assumed.
		expect(deltas).toEqual({
			'@n8n/api-requests/probe': {
				before: 'packages/frontend/@n8n/api-requests/src/probe',
				after: 'dist',
			},
			'@n8n/api-types': { before: 'dist', after: 'packages/@n8n/api-types/src/index.ts' },
			'@n8n/api-types/probe': { before: 'dist', after: 'packages/@n8n/api-types/src/probe' },
			'@n8n/chat': { before: 'dist', after: 'packages/frontend/@n8n/chat/src/index.ts' },
			'@n8n/constants': { before: 'dist', after: 'packages/@n8n/constants/src/index.ts' },
			'@n8n/frontend-constants/probe': {
				before: 'dist',
				after: 'packages/frontend/@n8n/frontend-constants/src/probe',
			},
			'@n8n/frontend-module-sdk/probe': {
				before: 'dist',
				after: 'packages/frontend/@n8n/frontend-module-sdk/src/probe',
			},
			'@n8n/frontend-utils/probe': {
				before: 'dist',
				after: 'packages/frontend/@n8n/frontend-utils/src/probe',
			},
			'@n8n/rest-api-client': {
				before: 'dist',
				after: 'packages/frontend/@n8n/rest-api-client/src/index.ts',
			},
			'@n8n/rest-api-client/probe': {
				before: 'dist',
				after: 'packages/frontend/@n8n/rest-api-client/src/probe',
			},
			'@n8n/stores': { before: 'dist', after: 'packages/frontend/@n8n/stores/src/index.ts' },
			'@n8n/tournament': { before: 'packages/@n8n/tournament/src/index.ts', after: 'dist' },
			'@n8n/tournament/probe': { before: 'packages/@n8n/tournament/src/probe', after: 'dist' },
		});
	});

	it('resolves a package and its subpaths independently of entry order', () => {
		// `^@n8n/chat(.+)$` also matches `@n8n/chat-hub/…`; the hand-written list is only correct
		// because an earlier entry happens to shadow it. The generated pairs are slash-anchored.
		const generated = generatedSourceAliases({ repoRoot, consumerDir: editorUiDir });

		expect(resolveSpecifier('@n8n/chat-hub/api', generated)).toBe('packages/@n8n/chat-hub/src/api');
		expect(resolveSpecifier('@n8n/chat-hub/api', [...generated].reverse())).toBe(
			'packages/@n8n/chat-hub/src/api',
		);
	});
});
