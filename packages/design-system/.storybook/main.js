const { mergeConfig } = require('vite');
const { resolve } = require('path');

module.exports = {
	stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
	addons: [
		'@storybook/addon-styling',
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		// Disabled until this is actually used rather otherwise its a blank tab
		// '@storybook/addon-interactions',
		'@storybook/addon-a11y',
		'storybook-dark-mode',
	],
	staticDirs: ['../public'],
	framework: {
		name: '@storybook/vue3-vite',
		options: {},
	},
	disableTelemetry: true,
	async viteFinal(config, { configType }) {
		// return the customized config
		return mergeConfig(config, {
			// customize the Vite config here
			resolve: {
				alias: [
					{
						find: /^@n8n-design-system\//,
						replacement: `${resolve(__dirname, '..')}/src/`,
					},
				],
			},
			define: { 'process.env': {} },
		});
	},
	docs: {
		autodocs: true,
	},
};
