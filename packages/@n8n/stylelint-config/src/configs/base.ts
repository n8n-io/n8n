import type { Config } from 'stylelint';

export const baseConfig: Config = {
	// TODO: Extending with standard config requires a lot of manual fixes but would be great to have
	// extends: 'stylelint-config-standard-scss',
	// Basic SCSS support with essential rules
	plugins: ['stylelint-scss'],
	rules: {
		'no-empty-source': true,

		// Basic syntax and consistency rules
		'color-hex-length': 'short',
		'comment-no-empty': true,
		// 'declaration-block-no-duplicate-properties': disabled due to vendor prefixes
		'no-duplicate-selectors': true,
		'no-invalid-double-slash-comments': true,

		// Quality rules (keep only the working ones)
		'length-zero-no-unit': true,
		// 'no-descending-specificity': disabled - too many existing issues (would require major refactoring) but this would be a must have
		'no-duplicate-at-import-rules': true,
		'shorthand-property-no-redundant-values': true,
		// 'declaration-block-no-shorthand-property-overrides': disabled - conflicts with intentional CSS patterns
		'at-rule-no-unknown': [
			true,
			{
				ignoreAtRules: [
					'tailwind',
					'apply',
					'variants',
					'responsive',
					'screen',
					'use',
					'forward',
					'include',
					'mixin',
					'function',
					'return',
					'if',
					'else',
					'for',
					'each',
					'while',
					'extend',
					'at-root',
					'warn',
					'error',
				],
			},
		],
		'at-rule-disallowed-list': [
			['import'],
			{
				message:
					'@import is deprecated! Use @use for local SCSS files. For third-party libraries that need scoping: use @use "sass:meta"; and @include meta.load-css("library") inside a CSS selector.',
			},
		],

		// SCSS specific rules
		'scss/dollar-variable-colon-space-after': 'always-single-line',
		'scss/dollar-variable-colon-space-before': 'never',
		'scss/dollar-variable-no-missing-interpolation': true,
		'scss/double-slash-comment-whitespace-inside': 'always',
		'scss/operator-no-unspaced': true,
		'scss/property-no-unknown': [
			true,
			{
				ignoreProperties: ['composes'],
			},
		],
		'scss/at-import-partial-extension-disallowed-list': ['scss'],
		// 'scss/selector-no-redundant-nesting-selector': disabled - would require manual fixes across many files
	},
	ignoreFiles: [
		'**/node_modules/**/*',
		'**/dist/**/*',
		'**/build/**/*',
		'**/.turbo/**/*',
		'**/coverage/**/*',
	],
	overrides: [
		{
			files: ['**/*.vue'],
			customSyntax: 'postcss-html',
		},
		{
			files: ['**/*.scss', '**/*.sass'],
			customSyntax: 'postcss-scss',
		},
	],
};

export default baseConfig;
