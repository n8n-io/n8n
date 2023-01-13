// import ElementPlus from 'element-plus';
import type { InjectionKey, Plugin } from 'vue';

export interface PluginConfig {
	components: Record<string, any>;
}

export interface Prototype {}

export const defaultOptions: PluginConfig = {
	components: {},
};

export function createPrototype(options: PluginConfig): Prototype {
	return {};
}

export const N8nKey = Symbol('N8n') as InjectionKey<Prototype>;

export const N8nDesignSystem: Plugin = {
	install(app, options: Partial<PluginConfig> = {}) {
		const extendedOptions: PluginConfig = {
			...defaultOptions,
			...options,
		};

		/**
		 * Register element-plus
		 */

		// app.use(ElementPlus);

		/**
		 * Register components provided through options globally
		 */

		for (const componentIndex in extendedOptions.components) {
			app.component(
				extendedOptions.components[componentIndex].name,
				extendedOptions.components[componentIndex]
			);
		}

		/**
		 * Add $n8n global property
		 */

		const prototype: Prototype = createPrototype(extendedOptions);

		if (app.config.globalProperties) {
			app.config.globalProperties.$n8n = prototype;
			app.provide(N8nKey, prototype);
		}
	},
};
