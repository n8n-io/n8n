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
	const extensionPoints = {
		views: {
			workflows: {
				header: [],
			},
		},
	};

	function createNamespaceString(manifest) {
		return `${manifest.publisher}/${manifest.name}`;
	}

	function registerNamespace(ns: string) {
		if (!extensionMetadata[ns]) {
			extensionMetadata[ns] = {
				components: {},
			};
		}
	}

	function registerExtensionPoints(manifest: object, context: FrontendExtensionContext) {
		const ns = createNamespaceString(manifest);

		if (manifest.extends.views.workflows.header) {
			extensionPoints.views.workflows.header.push(
				extensionMetadata[ns].components[manifest.extends.views.workflows.header],
			);
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
		const ns = createNamespaceString(manifest);

		if (manifest.extends.views) {
			context.registerComponent = createRegisterComponent(ns);
		}

		return context;
	}

	async function initialize() {
		const loadedExtensions = await Promise.all(
			extensionManifests.value.map(
				async (extension) =>
					await import(
						`../../node_modules/@${extension.publisher}/n8n-extension-${extension.name}/dist/frontend/index.js`
					),
			),
		);

		loadedExtensions.forEach(({ default: extensionModule }, index) => {
			const extensionManifest = extensionManifests.value[index];
			const extensionContext = createExtensionContext(extensionManifest);

			extensionModule.setup(extensionContext);

			registerExtensionPoints(extensionManifest, extensionContext);
		});
	}

	return {
		extensionManifests,
		extensionMetadata,
		initialize,
	};
});
