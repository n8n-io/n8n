import { globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import { baseConfig } from './base.js';

const extraFileExtensions = ['.vue'];
const allGlobals = { NodeJS: true, ...globals.node, ...globals.browser };

export const frontendConfig = tseslint.config(
	globalIgnores(['**/*.js', '**/*.d.ts', 'vite.config.ts', '**/*.ts.snap']),
	baseConfig,
	{
		rules: {
			'no-console': 'warn',

			// A component file is PascalCase and a composable is `useThing.ts`, so
			// the kebab-case default from the base layer does not apply here.
			'unicorn/filename-case': 'off',

			'@typescript-eslint/no-use-before-define': 'warn',
			'@typescript-eslint/no-explicit-any': 'error',
			'n8n-local-rules/no-reka-ui-pagination': 'error',
		},
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: allGlobals,
			parser: tseslint.parser,
			parserOptions: { projectService: true, extraFileExtensions },
		},
	},
	{
		files: ['**/*.test.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts', '**/*.stories.ts'],
		rules: {
			// TODO: remove these
			'n8n-local-rules/no-internal-package-import': 'warn',
		},
	},
	{
		// Oxlint and Vize enforce the Vue rules (`@n8n/oxlint-config/vue`). ESLint
		// parses the SFC script so the type-aware rules still reach it.
		files: ['**/*.vue'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: allGlobals,
			parser: vueParser,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions,
			},
		},
		rules: {
			// TODO: remove these
			'n8n-local-rules/no-internal-package-import': 'warn',
		},
	},
	eslintConfigPrettier,
);
