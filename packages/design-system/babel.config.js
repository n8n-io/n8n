module.exports = {
	presets: ['@vue/cli-plugin-babel/preset'],
	plugins: [
		['@babel/plugin-proposal-private-property-in-object', { loose: true }],
	],
};
