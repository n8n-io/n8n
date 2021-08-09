const path = require('path');

module.exports = {
	"stories": [
		"../src/**/*.stories.mdx",
		"../src/**/*.stories.@(js|jsx|ts|tsx)"
	],
	"addons": [
		"@storybook/addon-links",
		"@storybook/addon-essentials",
		'storybook-addon-designs',
		'storybook-addon-themes'
	],
	webpackFinal: async (config, {
		configType
	}) => {
		config.module.rules.push({
			test: /\.scss$/,
			oneOf: [{
					resourceQuery: /module/,
					use: [
						'vue-style-loader',
						{
							loader: 'css-loader',
							options: {
								modules: true
							}
						},
						'sass-loader',
					],
					include: path.resolve(__dirname, '../'),
				},
				{
					use: [
						'vue-style-loader',
						'css-loader',
						'sass-loader',
					],
					include: path.resolve(__dirname, '../'),
				}
			]
		});

		return config;
	},
}