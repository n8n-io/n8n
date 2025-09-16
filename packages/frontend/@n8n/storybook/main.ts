import type { StorybookConfig } from '@storybook/vue3-vite';

export const sharedConfig: StorybookConfig = {
	stories: ['../src/**/*.stories.ts'],
	addons: [
		'storybook-dark-mode',
		'@storybook/addon-themes',
		'@storybook/addon-links',
		'@chromatic-com/storybook',
	],
	staticDirs: ['../public'],
	framework: {
		name: '@storybook/vue3-vite',
		options: {},
	},
	core: {
		disableTelemetry: true,
	},
};

export const sharedTags: string[] = ['autodocs'];
