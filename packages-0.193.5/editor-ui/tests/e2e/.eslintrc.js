module.exports = {
	plugins: [
		'cypress',
	],
	env: {
		mocha: true,
		'cypress/globals': true,
	},
	rules: {
		strict: 'off',
	},
};
