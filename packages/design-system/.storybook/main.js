const path = require('path');
const { mergeConfig } = require('vite');

/**
 * @type {import('@storybook/core-common').StorybookConfig}
 */
module.exports = {
	framework: '@storybook/vue',
	core: {
		builder: '@storybook/builder-vite',
		disableTelemetry: true,
	},
	stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|ts)'],
	addons: [
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		{
			name: '@storybook/addon-postcss',
			options: {
				postcssLoaderOptions: {
					implementation: require('postcss'),
				},
			},
		},
		'storybook-addon-designs',
		'storybook-addon-themes',
	],
	viteFinal: async (config) =>
		mergeConfig(config, {
			resolve: {
				alias: {
					'@': path.resolve(__dirname, '../src'),
					'vue2-boring-avatars': require.resolve('vue2-boring-avatars'),
				},
			},
		}),
};
