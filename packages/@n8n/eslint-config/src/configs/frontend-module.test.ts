import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import { frontendModuleConfig } from './frontend-module.js';

/**
 * The patterns of the boundary read with gitignore semantics, where `*` stops at a `/` and a rule
 * that matches a parent path wins over a later `!` on a child. A subpath therefore needs its own
 * ban line and its own negation line. These cases hold that behaviour.
 */
const SELF = '@n8n/frontend-module-otel';

const moduleDir = mkdtempSync(join(tmpdir(), 'frontend-module-config-'));
writeFileSync(join(moduleDir, 'package.json'), JSON.stringify({ name: SELF }));

/** The boundary rule options, taken from the config the module packages use. */
const options = frontendModuleConfig(moduleDir)
	.map((entry) => entry.rules?.['@typescript-eslint/no-restricted-imports'])
	.find((rule) => rule !== undefined);

const linter = new Linter({ configType: 'flat' });

const lint = (specifier: string) =>
	linter.verify(`import { thing } from '${specifier}';`, {
		plugins: { '@typescript-eslint': typescriptPlugin as never },
		languageOptions: { parser: tsParser as never },
		rules: { '@typescript-eslint/no-restricted-imports': options as never },
	});

describe('frontendModuleConfig', () => {
	test.each([
		['a sibling module', '@n8n/frontend-module-insights'],
		['a subpath of a sibling module', '@n8n/frontend-module-insights/insights.module'],
		['a deep subpath of a sibling module', '@n8n/frontend-module-insights/components/Chart.vue'],
		['the shell alias', '@/app/stores/ui.store'],
		['the shell alias at the root', '@/Interface'],
	])('rejects %s', (_name, specifier) => {
		const [message] = lint(specifier);

		expect(message?.ruleId).toBe('@typescript-eslint/no-restricted-imports');
		expect(message?.severity).toBe(2);
	});

	test.each([
		['the SDK', '@n8n/frontend-module-sdk'],
		['a subpath of the SDK', '@n8n/frontend-module-sdk/types/descriptor'],
		['the package itself', SELF],
		['a subpath of the package itself', `${SELF}/otel.module`],
		['an L2 package', '@n8n/stores'],
		['a relative path', './otel.store'],
	])('accepts %s', (_name, specifier) => {
		expect(lint(specifier)).toEqual([]);
	});
});
