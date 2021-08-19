module.exports = {
	extends: [
		'../../.eslintrc.js',

		/**
		 * Config for recommended ruleset in @vue/cli-plugin-eslint
		 *
		 * https://github.com/vuejs/vue-cli/tree/dev/packages/@vue/cli-plugin-eslint
		 * https://eslint.vuejs.org/user-guide/#usage
		 * https://eslint.vuejs.org/rules/
		 */
		'plugin:vue/recommended',
	],

	parserOptions: {
		parser: '@typescript-eslint/parser',
		extraFileExtensions: ['.vue'],
		project: __dirname + '/tsconfig.json',
		sourceType: 'module',
	},

	rules: {},
};
