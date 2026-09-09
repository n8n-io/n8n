import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { modulePackages } from '@n8n/frontend-vite-config';
import { ESLint } from 'eslint';

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

	const restrictions = async (source: string) => {
		const [result] = await eslint.lintText(source, { filePath: PROBE });
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
});
