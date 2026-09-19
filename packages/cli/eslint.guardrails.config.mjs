import { defineConfig, globalIgnores } from 'eslint/config';
import { functionalGuardrailsConfig } from '@n8n/eslint-config/functional-guardrails';
import { localRulesPlugin } from '@n8n/eslint-config/plugin';
import cliConfig from './eslint.config.mjs';

const directivePluginConfigs = cliConfig.flatMap(({ plugins }) => {
	const externalPlugins = Object.fromEntries(
		Object.entries(plugins ?? {}).filter(([name]) => name !== 'n8n-local-rules'),
	);

	return Object.keys(externalPlugins).length === 0 ? [] : [{ plugins: externalPlugins }];
});

const dependencyRuleConfigs = cliConfig.flatMap(({ files, ignores, settings, rules }) => {
	const rule = rules?.['import-x/no-extraneous-dependencies'];
	if (!rule) return [];

	return [
		{
			...(files ? { files } : {}),
			...(ignores ? { ignores } : {}),
			...(settings ? { settings } : {}),
			rules: { 'import-x/no-extraneous-dependencies': rule },
		},
	];
});

export default defineConfig(
	globalIgnores([
		'dist/**',
		'coverage/**',
		'eslint.config.mjs',
		'eslint.guardrails.config.mjs',
		'oxlint.config.mts',
		'scripts/**/*.mjs',
		'vitest.*.ts',
	]),
	{
		plugins: { 'n8n-local-rules': localRulesPlugin },
	},
	functionalGuardrailsConfig,
	{
		// Shrink-only ratchet: the two import paths that upsert a whole credential row,
		// including `type`. There is no sealed credential import method yet. NEVER add to
		// this list — the override is per file, so a second write here goes unreported.
		files: [
			'./src/commands/import/credentials.ts',
			'./src/modules/source-control.ee/source-control-import.service.ee.ts',
		],
		rules: { 'n8n-local-rules/no-unsealed-credentials-entity-write': 'off' },
	},
	...directivePluginConfigs,
	...dependencyRuleConfigs,
);
