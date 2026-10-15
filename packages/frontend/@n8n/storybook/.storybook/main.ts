import type { StorybookConfig } from '@storybook/vue3-vite';
import { dirname } from 'path';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'url';

function getAbsolutePath(value: string): string {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
	stories: [
		/** Only design system stories allowed.
		 * If a component needs Storybook documentation because it is shared across multiple surfaces, it should be transfered to the design-system.
		 * This prevents sprawl, allows for better sharing, and makes it clear a component can be re-used elsewhere.
		 */
		'../../design-system/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
		'../../design-system/src/**/*.mdx',
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
		getAbsolutePath('@storybook/addon-themes'),
	],
	framework: {
		name: getAbsolutePath('@storybook/vue3-vite'),
		options: {
			docgen: 'vue-docgen-api',
		},
	},
	staticDirs: ['../../design-system/assets'],
	core: {
		disableTelemetry: true,
	},
	features: {
		sidebarOnboardingChecklist: false,
	},
};
export default config;
