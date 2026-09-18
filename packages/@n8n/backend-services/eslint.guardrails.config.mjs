import { defineConfig, globalIgnores } from 'eslint/config';
import { functionalGuardrailsConfig } from '@n8n/eslint-config/functional-guardrails';
import { localRulesPlugin } from '@n8n/eslint-config/plugin';
import packageConfig from './eslint.config.mjs';

const directivePluginConfigs = packageConfig.flatMap(({ plugins }) => {
	const externalPlugins = Object.fromEntries(
		Object.entries(plugins ?? {}).filter(([name]) => name !== 'n8n-local-rules'),
	);

	return Object.keys(externalPlugins).length === 0 ? [] : [{ plugins: externalPlugins }];
});

const dependencyRuleConfigs = packageConfig.flatMap(({ files, ignores, settings, rules }) => {
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
		'vitest.config.ts',
	]),
	{
		plugins: { 'n8n-local-rules': localRulesPlugin },
	},
	functionalGuardrailsConfig,
	...directivePluginConfigs,
	...dependencyRuleConfigs,
);
