import type { StorybookConfig } from '@storybook/vue3-vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkGfm from 'remark-gfm';

function getAbsolutePath(value: string): string {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const configDirectory = dirname(fileURLToPath(import.meta.url));
const designSystemSource = resolve(configDirectory, '../../design-system/src');

const config: StorybookConfig = {
	stories: [
		/** Only design system stories allowed.
		 * If a component needs Storybook documentation because it is shared across multiple surfaces, it should be transfered to the design-system.
		 * This prevents sprawl, allows for better sharing, and makes it clear a component can be re-used elsewhere.
		 */
		`${designSystemSource}/**/*.stories.@(js|jsx|mjs|ts|tsx)`,
		`${designSystemSource}/**/*.mdx`,
	],
	addons: [
		getAbsolutePath('@chromatic-com/storybook'),
		getAbsolutePath('@storybook/addon-vitest'),
		getAbsolutePath('@storybook/addon-a11y'),
		{
			name: getAbsolutePath('@storybook/addon-docs'),
			options: {
				mdxPluginOptions: {
					mdxCompileOptions: {
						remarkPlugins: [remarkGfm],
					},
				},
			},
		},
		getAbsolutePath('storybook-addon-vue-mdx'),
	],
	framework: getAbsolutePath('@storybook/vue3-vite'),
	staticDirs: ['../../design-system/assets'],
	viteFinal(config) {
		config.server ??= {};
		config.server.watch = {
			...config.server.watch,
			usePolling: true,
			interval: 100,
		};

		return config;
	},
	core: {
		disableTelemetry: true,
	},
};
export default config;
