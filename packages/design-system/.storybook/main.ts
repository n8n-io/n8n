import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
	addons: [
		'@storybook/addon-styling',
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		'@storybook/addon-a11y',
		'storybook-dark-mode',
	],
	staticDirs: ['../public'],
	framework: {
		name: '@storybook/vue3-vite',
		options: {},
	},
	core: {
		disableTelemetry: true,
	},
	docs: {
		autodocs: true,
	},
};

export default config;
