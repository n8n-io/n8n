import { defineStore } from 'pinia';
import type { FrontendExtensionContext } from '@n8n/extension-sdk/frontend';
import { STORES } from '@/constants';
import type { Component } from 'vue';
import { ref, markRaw } from 'vue';
import InsightsExtensionManifest from '@n8n/n8n-extension-insights';

type ExtensionMetadata = {
	components: Record<string, Component>;
};

export const useExtensionsStore = defineStore(STORES.EXTENSIONS, () => {
	const extensionManifests = ref([InsightsExtensionManifest]);
	const extensionMetadata: Record<string, ExtensionMetadata> = {};

	function registerNamespace(ns: string) {
		if (!extensionMetadata[ns]) {
			extensionMetadata[ns] = {
				components: {},
			};
		}
	}

	function createRegisterComponent(ns: string) {
		registerNamespace(ns);

		return (name: string, component: Component) => {
			extensionMetadata[ns].components[name] = markRaw(component);
		};
	}

	function createExtensionContext(manifest: object): FrontendExtensionContext {
		const context = {};
		const ns = `${manifest.publisher}/${manifest.name}`;

		if (manifest.extends.views) {
			context.registerComponent = createRegisterComponent(ns);
		}

		return context;
	}

	async function initialize() {
		const loadedExtensions = await Promise.all(
			extensionManifests.value.map(
				async (extension) =>
					await import(`@${extension.publisher}/n8n-extension${extension.name}/frontend`),
			),
		);

		loadedExtensions.forEach(({ default: extensionModule }, index) => {
			const extensionManifest = extensionManifests.value[index];
			const extensionContext = createExtensionContext(extensionManifest);

			extensionModule.setup(extensionContext);
		});
	}

	return {
		extensions: extensionManifests,
		initialize,
	};
});
