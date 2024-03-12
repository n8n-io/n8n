import { dirname, join } from 'path';
import type { StorybookConfig } from '@storybook/vue3-vite';

function getAbsolutePath(value: string): string {
	return dirname(require.resolve(join(value, 'package.json'))).toString();
}

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.ts'],
	addons: [
		'@storybook/addon-a11y',
		'@storybook/addon-essentials',
		'@storybook/addon-interactions',
		'@storybook/addon-links',
	].map((path) => getAbsolutePath(path)),
	staticDirs: ['../public'],
	framework: {
		name: getAbsolutePath('@storybook/vue3-vite') as '@storybook/vue3-vite',
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
