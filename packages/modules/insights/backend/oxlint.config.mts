import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['coverage/**', 'dist/**'],
	rules: {
		'n8n-local-rules/misplaced-n8n-typeorm-import': 'error',
		'n8n-local-rules/no-guardrail-disable': [
			'error',
			{
				guarded: [
					{
						rule: 'misplaced-n8n-typeorm-import',
						message:
							'Keep TypeORM in the persistence layer. Put the query behind a use-case repository method.',
					},
				],
			},
		],
	},
	overrides: [
		{
			// The persistence boundary does not prescribe a folder layout. Prefer semantic
			// infixes. Keep exact entries only for existing entities that do not use one.
			files: [
				'./src/**/*.entity.ts',
				'./src/**/*.repository.ts',
				'./src/database/entities/insights-by-period.ts',
				'./src/database/entities/insights-metadata.ts',
				'./src/database/entities/insights-raw.ts',
				'./src/**/__tests__/**/*.ts',
				'./src/**/*.test.ts',
			],
			rules: {
				'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
			},
		},
	],
});
