import type { StorybookConfig } from '@storybook/vue3-vite';
import { dirname, join } from 'path';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

function getAbsolutePath(value: string): string {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

/** Docs packages that only this package installs. React must be the one that the docs use. */
const DOCS_PACKAGES =
	/^(storybook-addon-vue-mdx|@storybook\/addon-docs|@mdx-js\/react|react)(\/|$)/;

/**
 * An MDX file outside this package imports the docs packages that only this package installs,
 * so they resolve from here.
 */
function resolveDocsPackagesFromHere(): Plugin {
	const importer = join(dirname(fileURLToPath(import.meta.url)), 'main.ts');
	return {
		name: 'n8n:resolve-docs-packages',
		enforce: 'pre',
		async resolveId(source, from, options) {
			if (!from?.includes('/editor-ui/') || !DOCS_PACKAGES.test(source)) return null;
			return await this.resolve(source, importer, { ...options, skipSelf: true });
		},
	};
}
const config: StorybookConfig = {
	stories: [
		/** Only design system stories allowed.
		 * If a component needs Storybook documentation because it is shared across multiple surfaces, it should be transfered to the design-system.
		 * This prevents sprawl, allows for better sharing, and makes it clear a component can be re-used elsewhere.
		 */
		'../../design-system/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
		'../../design-system/src/**/*.mdx',
		// Prototype: design review of the skill review dialogs. Remove before the feature ships.
		'../../../editor-ui/src/features/settings/context/stories/*.stories.ts',
		'../../../editor-ui/src/features/settings/context/stories/*.mdx',
		// Prototype: the node diff as fields. Remove before the feature ships.
		'../../../editor-ui/src/features/workflows/workflowDiff/stories/*.stories.ts',
	],
	addons: [
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
	viteFinal(viteConfig) {
		viteConfig.plugins = [...(viteConfig.plugins ?? []), resolveDocsPackagesFromHere()];
		return viteConfig;
	},
	core: {
		disableTelemetry: true,
	},
	features: {
		sidebarOnboardingChecklist: false,
	},
};
export default config;
