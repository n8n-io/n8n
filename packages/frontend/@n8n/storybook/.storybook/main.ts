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
		// story.to.design matches nested Vue components via DevTools metadata
		// that production Storybook builds strip.
		developmentModeForBuild: true,
	},
	async viteFinal(config) {
		// story.to.design matches nested Vue components via __file / DevTools
		// metadata. `storybook build` is Vite production unless we force
		// development compilation (the Storybook flag alone does not).
		config.mode = 'development';
		config.plugins = [
			...(config.plugins ?? []),
			{
				name: 'storybook-s2d-vue-devtools',
				config() {
					return {
						define: {
							__VUE_PROD_DEVTOOLS__: true,
						},
					};
				},
			},
		];
		config.server = {
			...config.server,
			// Vite blocks unknown Host headers; tunnel URLs need this or the
			// preview iframe 403s (ngrok / Cloudflare quick tunnels).
			allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.app', '.ngrok.io'],
		};
		return config;
	},
};
export default config;
