import type { Config } from 'stylelint';

export const baseConfig: Config = {
	extends: ['stylelint-config-standard-scss'],
	plugins: ['stylelint-scss'],
	rules: {
		// Allow CSS custom properties (CSS variables)
		'property-no-unknown': [
			true,
			{
				ignoreProperties: ['/^--/'],
			},
		],
		// Allow Vue.js specific selectors
		'selector-pseudo-element-no-unknown': [
			true,
			{
				ignorePseudoElements: ['v-deep', 'v-global', 'v-slotted'],
			},
		],
		// Allow Vue.js single file component syntax
		'no-empty-source': null,
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
	],
};

export default baseConfig;
