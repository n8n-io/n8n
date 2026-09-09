import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { modulePackages } from '@n8n/frontend-vite-config';
import { ESLint } from 'eslint';

import { moduleEntryPattern } from '../../eslint/module-entry-patterns.mjs';

/**
 * A module package is reachable only at the entries its own `exports` map declares. The Vite
 * aliases and the `paths` in `tsconfig.json` stop a deeper path from resolving;
 * `no-restricted-imports` gives the message that names the entry to use instead.
 *
 * This lints real text, because the patterns carry negations (`!<name>/<entry>`) and only
 * gitignore semantics make them allow the declared entries again. A pattern list read as data
 * cannot show that: the same list with the negations dropped would still look right, and every
 * import of a module would then be an error.
 *
 * `extractionRatchet.test.ts` holds the other half: that no flat-config block drops the patterns.
 */
const RULE = '@typescript-eslint/no-restricted-imports';

// An existing file in the TS program, so type-aware rules have a program to attach the text to.
// The content comes from each test; only the path is read from here.
const PROBE = 'src/app/modules.manifest.ts';

const packagesDir = resolve(process.cwd(), '..', '..');

/** The specifiers the `exports` map of a module package declares. */
const declaredEntries = ({ name, dir }: { name: string; dir: string }) => {
	const { exports } = JSON.parse(readFileSync(join(packagesDir, dir, 'package.json'), 'utf8')) as {
		exports: Record<string, string>;
	};

	return Object.keys(exports).map((subpath) =>
		subpath === '.' ? name : `${name}/${subpath.replace(/^\.\//, '')}`,
	);
};

describe('module entry ratchet', () => {
	let eslint: ESLint;

	beforeAll(() => {
		eslint = new ESLint({ cwd: process.cwd() });
	});

	const restrictions = async (source: string, instance = eslint) => {
		const [result] = await instance.lintText(source, { filePath: PROBE });
		return result.messages.filter((message) => message.ruleId === RULE);
	};

	it.each(modulePackages)(
		'allows every declared entry of $name',
		async (module) => {
			const entries = declaredEntries(module);
			const source = entries
				.map((entry, index) => `import * as entry${index} from '${entry}';\n`)
				.join('');

			expect(entries.length).toBeGreaterThan(0);
			expect(await restrictions(source)).toEqual([]);
		},
		60000,
	);

	it.each(modulePackages)(
		'refuses a path $name does not declare',
		async (module) => {
			const source = `import { probe } from '${module.name}/internal/probe';\n`;
			const [message, ...rest] = await restrictions(source);

			expect(rest).toEqual([]);
			expect(message?.message).toBeDefined();

			// The message has to name the way in, or it only says no.
			for (const entry of declaredEntries(module)) {
				expect(message.message).toContain(entry);
			}
		},
		60000,
	);

	it('refuses a component of a module, which is the import the aliases used to resolve', async () => {
		const source =
			"import Dashboard from '@n8n/frontend-module-insights/components/InsightsDashboard.vue';\n";

		expect(await restrictions(source)).toHaveLength(1);
	}, 60000);

	describe('a module that declares "./*"', () => {
		// The documented opt-out back into a wildcard. No module in the tree declares it, so the
		// pattern comes from the same builder the config uses, fed to ESLint through
		// `overrideConfig`. Without the two-segment case below, `!<name>/*` looked correct: a
		// gitignore `*` stops at a `/`, while the `exports` key, the Vite alias and the tsconfig
		// `paths` entry all match across one.
		const WILDCARD = '@n8n/frontend-module-wildcard-probe';
		const NARROW = '@n8n/frontend-module-narrow-probe';

		const withPattern = (manifest: { name: string; exports: Record<string, string> }) =>
			new ESLint({
				cwd: process.cwd(),
				overrideConfig: {
					rules: { [RULE]: ['error', { patterns: [moduleEntryPattern(manifest)] }] },
				},
			});

		it.each([
			['the bare name', ''],
			['one segment', '/one'],
			['two segments', '/one/two'],
			['three segments', '/one/two/three'],
		])(
			'allows %s under the wildcard key',
			async (_label, subpath) => {
				const instance = withPattern({
					name: WILDCARD,
					exports: { '.': './src/index.ts', './*': './src/*' },
				});

				expect(await restrictions(`import '${WILDCARD}${subpath}';\n`, instance)).toEqual([]);
			},
			60000,
		);

		it.each(['/one', '/one/two'])(
			'still refuses %s under a narrow key',
			async (subpath) => {
				// The control. A module that declares one subpath does not get the wildcard by
				// accident, at either depth.
				const instance = withPattern({
					name: NARROW,
					exports: { '.': './src/index.ts', './narrow.module': './src/narrow.module.ts' },
				});

				expect(await restrictions(`import '${NARROW}${subpath}';\n`, instance)).toHaveLength(1);
			},
			60000,
		);

		it('allows the entry a narrow key declares', async () => {
			const instance = withPattern({
				name: NARROW,
				exports: { '.': './src/index.ts', './narrow.module': './src/narrow.module.ts' },
			});

			expect(await restrictions(`import '${NARROW}/narrow.module';\n`, instance)).toEqual([]);
		}, 60000);
	});
});
