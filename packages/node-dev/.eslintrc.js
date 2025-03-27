const sharedOptions = require('@n8n/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n/eslint-config/base'],
	...sharedOptions(__dirname),
	ignorePatterns: [
		'templates/**', // TODO: remove this
	],
	rules: {
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
		'n8n-local-rules/no-plain-errors': 'off',
	},
};
