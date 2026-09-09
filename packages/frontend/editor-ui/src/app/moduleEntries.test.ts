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

	describe('every shape an exports key can take', () => {
		// No module in the tree declares a wildcard or a nested key, so each shape comes from the
		// same builder the config uses, fed to ESLint through `overrideConfig`. Both gitignore
		// adjustments in `negations` look unnecessary until this runs: `!<name>/*` refuses the
		// second segment under a `"./*"` key, and `!<name>/views/**` alone refuses every path
		// under a `"./views/*"` key, because `<name>/**` excludes the parent directory.
		const NAME = '@n8n/frontend-module-shape-probe';

		const withKey = (key: string, target: string) =>
			new ESLint({
				cwd: process.cwd(),
				overrideConfig: {
					rules: {
						[RULE]: [
							'error',
							{
								patterns: [
									moduleEntryPattern({
										name: NAME,
										exports: { '.': './src/index.ts', [key]: target },
									}),
								],
							},
						],
					},
				},
			});

		const verdicts = async (key: string, target: string, subpaths: string[]) => {
			const instance = withKey(key, target);
			const refused: string[] = [];

			for (const subpath of subpaths) {
				const hits = await restrictions(`import '${NAME}${subpath}';\n`, instance);
				if (hits.length > 0) refused.push(subpath);
			}

			return refused;
		};

		it('allows any depth under a "./*" key, and nothing else is left to refuse', async () => {
			expect(await verdicts('./*', './src/*', ['', '/one', '/one/two', '/one/two/three'])).toEqual(
				[],
			);
		}, 60000);

		it('allows any depth under a nested "./views/*" key', async () => {
			// The case a `!<name>/views/**` negation alone refused at every depth.
			expect(
				await verdicts('./views/*', './src/views/*', [
					'',
					'/views/One',
					'/views/One.vue',
					'/views/deep/Two',
				]),
			).toEqual([]);
		}, 60000);

		it('refuses what a nested key does not declare', async () => {
			// The ancestor directory is unexcluded with a trailing slash, so the bare
			// `<name>/views` stays refused. No `exports` key declares it, and nothing resolves it.
			expect(
				await verdicts('./views/*', './src/views/*', [
					'/views',
					'/internal',
					'/internal/deep',
					'/other/One',
				]),
			).toEqual(['/views', '/internal', '/internal/deep', '/other/One']);
		}, 60000);

		it('allows two levels of nesting under a "./views/deep/*" key', async () => {
			expect(
				await verdicts('./views/deep/*', './src/views/deep/*', [
					'/views/deep/Two',
					'/views/deep/a/b',
				]),
			).toEqual([]);
		}, 60000);

		it('refuses every depth a flat key does not declare', async () => {
			// The control. A module that declares one flat subpath does not get a wildcard by
			// accident, and the declared entry itself still passes.
			expect(
				await verdicts('./narrow.module', './src/narrow.module.ts', [
					'',
					'/narrow.module',
					'/one',
					'/one/two',
				]),
			).toEqual(['/one', '/one/two']);
		}, 60000);
	});
});
