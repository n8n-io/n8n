module.exports = {
	root: true,
	env: {
		node: true,
	},
	'extends': [
		'plugin:vue/essential',
		'@vue/typescript',
	],
	rules: {
		'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		'semi': [2, 'always'],
		'indent': ['error', 'tab', { "SwitchCase": 1 }],
		'comma-dangle': ['error', 'always-multiline'],
		'no-tabs': 0,
		'no-labels': 0,
	},
	parserOptions: {
		parser: '@typescript-eslint/parser',
	},
};
