import type { Plugin } from 'vue';

interface PluginConfig {
	components: Record<string, any>;
}

const defaultOptions: PluginConfig = {
	components: {},
};

export const N8nDesignSystem: Plugin = {
	install(app, options: Partial<PluginConfig> = {}) {
		const extendedOptions: PluginConfig = {
			...defaultOptions,
			...options,
		};

		/**
		 * Register components provided through options globally
		 */

		for (const componentIndex in extendedOptions.components) {
			// eslint-disable-line guard-for-in
			app.component(
				extendedOptions.components[componentIndex].name,
				extendedOptions.components[componentIndex]
			);
		}
	},
};
