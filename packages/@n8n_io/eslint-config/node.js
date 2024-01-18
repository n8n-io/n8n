/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['./base'],

	env: {
		es6: true,
		node: true,
	},

	rules: {
		/**
		 * https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/return-await.md
		 */
		'@typescript-eslint/return-await': ['error', 'always'],
	},
};
