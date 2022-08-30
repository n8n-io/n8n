const path = require('path');

/**
 * @type {import('@storybook/core-common').StorybookConfig}
 */
module.exports = {
	stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
	addons: [
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		'storybook-addon-designs',
		'storybook-addon-themes',
	],
	features: {
		postcss: false,
	},
	webpackFinal: async (config) => {
		config.module.rules.push({
			test: /\.scss$/,
			oneOf: [
				{
					resourceQuery: /module/,
					use: [
						'vue-style-loader',
						{
							loader: 'css-loader',
							options: {
								modules: {
									localIdentName: '[path][name]__[local]--[hash:base64:5]',
								},
							},
						},
						'sass-loader',
					],
					include: path.resolve(__dirname, '../'),
				},
				{
					use: ['vue-style-loader', 'css-loader', 'sass-loader'],
					include: path.resolve(__dirname, '../'),
				},
			],
		});

		config.resolve.alias = {
			...config.resolve.alias,
			"@/": path.resolve(__dirname, "../src/"),
		};

		return config;
	},
};
