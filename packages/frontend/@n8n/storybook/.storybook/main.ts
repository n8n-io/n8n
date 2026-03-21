import type { StorybookConfig } from '@storybook/vue3-vite';

import { dirname } from 'path';

import { fileURLToPath } from 'url';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
	stories: [
		'../../design-system/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
		'../../chat/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
		'../../../editor-ui/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
	],
	addons: [
		getAbsolutePath('@chromatic-com/storybook'),
		getAbsolutePath('@storybook/addon-vitest'),
		getAbsolutePath('@storybook/addon-a11y'),
		getAbsolutePath('@storybook/addon-docs'),
		getAbsolutePath('@storybook/addon-themes'),
	],
	framework: getAbsolutePath('@storybook/vue3-vite'),
	staticDirs: ['../../design-system/assets'],
	core: {
		disableTelemetry: true,
	},
};
export default config;
