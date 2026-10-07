import { defineConfig } from 'oxlint';
import { baseConfig } from './base.js';
import { vueConfig } from './vue.js';

/**
 * oxlint translation of `@n8n/eslint-config/frontend`.
 *
 * oxlint does not pass `ignorePatterns` or `options` through `extends`. A
 * package config spreads `frontendConfig.ignorePatterns` and sets
 * `options: { typeAware: true }` itself.
 */
export const frontendConfig = defineConfig({
	extends: [baseConfig, vueConfig],
	env: { browser: true, node: true },
	ignorePatterns: [
		'**/*.js',
		'**/*.d.ts',
		'**/*.ts.snap',
		'vite.config.*',
		'vitest.config.*',
		'oxlint.config.mts',
		'vize.config.ts',
	],
	rules: {
		// A component file is PascalCase and a composable is `useThing.ts`, so
		// the kebab-case default from the base layer does not apply here.
		'unicorn/filename-case': 'off',
		// The base layer leaves this to ESLint because the oxlint fixer breaks
		// `emitDecoratorMetadata`. No frontend package uses decorators.
		'typescript/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
		'n8n-local-rules/no-reka-ui-pagination': 'error',
		// The ESLint frontend layer ended with eslint-config-prettier, which turns
		// this rule off. Prettier owns the formatting of these files.
		'@stylistic/member-delimiter-style': 'off',
	},
	overrides: [
		{
			// oxlint sees only the script block, so an import used only in the
			// template reads as unused.
			files: ['**/*.vue'],
			rules: { 'unused-imports/no-unused-imports': 'off' },
		},
		{
			files: [
				'**/*.vue',
				'**/*.test.ts',
				'**/test/**/*.ts',
				'**/__tests__/**/*.ts',
				'**/*.stories.ts',
			],
			rules: {
				// TODO: remove this
				'n8n-local-rules/no-internal-package-import': 'warn',
			},
		},
	],
});

export default frontendConfig;
