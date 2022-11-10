/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	plugins: ['vue'],

	extends: ['plugin:vue/essential', '@vue/typescript', './base'],

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	parser: 'vue-eslint-parser',
	parserOptions: {
		parser: '@typescript-eslint/parser',
	},

	ignorePatterns: ['**/*.js', '**/*.d.ts', 'vite.config.ts'],

	rules: {
		'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		semi: [2, 'always'],
		indent: ['error', 'tab'],
		'comma-dangle': ['error', 'always-multiline'],
		'no-tabs': 0,
		'no-labels': 0,
	},
};
