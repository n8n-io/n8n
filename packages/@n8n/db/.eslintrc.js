const sharedOptions = require('@n8n/eslint-config/shared');

/** @type {import('@types/eslint').ESLint.ConfigData} */
module.exports = {
	extends: ['@n8n/eslint-config/base'],
	...sharedOptions(__dirname),
	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
	},
	overrides: [
		{
			files: ['./src/migrations/**/*.ts'],
			rules: {
				'unicorn/filename-case': 'off',
			},
		},
	],
};
