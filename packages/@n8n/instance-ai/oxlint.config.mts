import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

const LAZY_RUNTIME_IMPORT_MESSAGE =
	'Use an existing lazy loader, or add one near first use. Static runtime imports of this dependency undo the idle-memory guardrail.';

const restrictedLazyRuntimeImports = [
	'@daytona/sdk',
	'csv-parse/sync',
	'linkedom',
	'pdf-parse',
	'psl',
	'turndown',
].map((name) => ({
	name,
	message: LAZY_RUNTIME_IMPORT_MESSAGE,
}));

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: [
		'scripts/**/*.cjs',
		'skills/**/*.mjs',
		'.data/**',
		'evaluations/.data/**',
		'evaluations/.output/**',
		'.output/**',
		'evaluations/cli/pairwise.ts',
	],
	overrides: [
		{
			files: ['src/**/*.ts'],
			rules: {
				'n8n-local-rules/no-static-runtime-import': [
					'error',
					{ paths: restrictedLazyRuntimeImports },
				],
			},
		},
		{
			files: ['src/**/__tests__/**/*.ts'],
			rules: { 'n8n-local-rules/no-static-runtime-import': 'off' },
		},
		{
			files: ['src/tools/__tests__/**/*.test.ts'],
			rules: {
				'typescript/no-unsafe-assignment': 'off',
				'typescript/no-unsafe-member-access': 'off',
				'typescript/no-unsafe-argument': 'off',
			},
		},
		{
			files: ['evaluations/**/*.ts'],
			jsPlugins: ['@n8n/oxlint-config/import-x-alias'],
			rules: {
				'import-x-alias/no-extraneous-dependencies': ['error', { devDependencies: true }],
			},
		},
		{
			files: ['evaluations/computer-use/report-html.ts'],
			rules: {
				'typescript/no-unsafe-assignment': 'off',
				'typescript/no-unsafe-member-access': 'off',
				'typescript/no-unsafe-argument': 'off',
				'typescript/no-unsafe-call': 'off',
			},
		},
		{
			files: ['assets/workflow-diagnostics.mts'],
			rules: {
				'import-x-alias/no-extraneous-dependencies': 'off',
			},
		},
		{
			files: ['evaluations/clients/n8n-client.ts'],
			rules: {
				'n8n-local-rules/no-uncentralized-http': 'off',
			},
		},
	],
});
