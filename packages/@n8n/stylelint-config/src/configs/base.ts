import type { Config } from 'stylelint';

export const baseConfig: Config = {
	// Basic SCSS support with essential rules
	plugins: ['stylelint-scss'],
	rules: {
		// Allow Vue.js single file component syntax
		'no-empty-source': null,

		// Basic syntax and consistency rules
		'color-hex-length': 'short',
		'comment-no-empty': true,
		// 'declaration-block-no-duplicate-properties': disabled due to vendor prefixes
		'no-duplicate-selectors': true,
		'no-invalid-double-slash-comments': true,

		// SCSS specific rules
		'scss/dollar-variable-colon-space-after': 'always-single-line',
		'scss/dollar-variable-colon-space-before': 'never',
		'scss/dollar-variable-no-missing-interpolation': true,
		'scss/double-slash-comment-whitespace-inside': 'always',
		'scss/operator-no-unspaced': true,
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
