import type { StorybookConfig } from '@storybook/vue3-vite';

export const sharedConfig: StorybookConfig = {
	stories: ['../src/**/*.stories.ts'],
	addons: [
		'@chromatic-com/storybook',
		'@storybook/addon-a11y',
		'@storybook/addon-essentials',
		'@storybook/addon-interactions',
		'@storybook/addon-links',
		'@storybook/addon-themes',
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
