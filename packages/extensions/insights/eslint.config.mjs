import { defineConfig, globalIgnores } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	globalIgnores(['src/shims.d.ts']),
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			// TODO: Remove these
			'import-x/order': 'warn',
			'import-x/no-default-export': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
		},
	},
	{
		files: ['src/backend/**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: ['./tsconfig.backend.json'],
			},
		},
	},
	{
		files: ['src/frontend/**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: ['./tsconfig.frontend.json'],
			},
		},
	},
);
