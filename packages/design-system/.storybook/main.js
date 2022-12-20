const postcssConfig = require('../postcss.config');
const { mergeConfig } = require('vite');
const { resolve } = require('path');

/**
 * @type {import('@storybook/core-common').StorybookConfig}
 */
module.exports = {
	stories: [
		// '../src/**/*.stories.mdx',
		// '../src/**/*.stories.{ts,js}'
		// '../src/components/N8nActionBox/**/*.stories.{ts,js}',
		'../src/components/N8nButton/**/*.stories.{ts,js}',
		'../src/components/N8nIcon/**/*.stories.{ts,js}',
		'../src/components/N8nIconButton/**/*.stories.{ts,js}',
		'../src/components/N8nText/**/*.stories.{ts,js}',
		'../src/components/N8nTooltip/**/*.stories.{ts,js}',
	],
	addons: [
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		{
			name: '@storybook/addon-postcss',
			options: {
				postcssLoaderOptions: {
					...postcssConfig,
					implementation: require('postcss'),
				},
			},
		},
		// 'storybook-addon-designs',
		// 'storybook-addon-themes',
	],
	framework: '@storybook/vue3',
	core: {
		builder: '@storybook/builder-vite',
	},
	features: {
		// storyStoreV7: true
	},
	async viteFinal(config, { configType }) {
		// return the customized config
		return mergeConfig(config, {
			// customize the Vite config here
			resolve: {
				alias: [
					{
						find: /^@\//,
						replacement: `${resolve(__dirname, '..')}/src/`,
					},
				],
			},
		});
	},

	// webpackFinal: async (config) => {
	// 	config.module.rules.push({
	// 		test: /\.scss$/,
	// 		oneOf: [
	// 			{
	// 				resourceQuery: /module/,
	// 				use: [
	// 					'vue-style-loader',
	// 					{
	// 						loader: 'css-loader',
	// 						options: {
	// 							modules: {
	// 								localIdentName: '[path][name]__[local]--[hash:base64:5]',
	// 							},
	// 						},
	// 					},
	// 					'sass-loader',
	// 				],
	// 				include: path.resolve(__dirname, '../'),
	// 			},
	// 			{
	// 				use: ['vue-style-loader', 'css-loader', 'sass-loader'],
	// 				include: path.resolve(__dirname, '../'),
	// 			},
	// 		],
	// 	});
	//
	// 	config.resolve.alias = {
	// 		...config.resolve.alias,
	// 		'@/': path.resolve(__dirname, '../src/'),
	// 	};
	//
	// 	return config;
	// },
};
