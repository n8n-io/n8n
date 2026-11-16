import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	overrides: [
		{
			files: ['./src/**/*.ts'],
			excludeFiles: ['./src/**/__tests__/**'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						paths: [
							{
								name: 'n8n-workflow',
								allowTypeImports: true,
								message:
									'n8n-workflow is a dev dependency of this package. Use type imports only. See AGENTS.md.',
							},
						],
					},
				],
			},
		},
	],
});
