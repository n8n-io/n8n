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
			files: [
				'./src/**/*.entity.ts',
				'./src/**/*.repository.ts',
				'./src/**/__tests__/**/*.ts',
				'./src/**/*.test.ts',
			],
			rules: {
				'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
			},
		},
	],
});
