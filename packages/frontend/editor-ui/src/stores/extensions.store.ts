import { defineStore } from 'pinia';
import type { ExtensionManifest } from '@n8n/extension-sdk';
import type { FrontendExtensionContext } from '@n8n/extension-sdk/frontend';
import { STORES } from '@/constants';
import { Component, reactive } from 'vue';
import { ref, markRaw } from 'vue';
import InsightsExtensionManifest from '@n8n/n8n-extension-insights';

type ExtensionMetadata = {
	components: Record<string, Component>;
};

type ExtensionPoints = {
	views: {
		workflows: {
			header: Component[];
		};
	};
};

export const useExtensionsStore = defineStore(STORES.EXTENSIONS, () => {
	const extensionManifests = ref<ExtensionManifest[]>([InsightsExtensionManifest]);
	const extensionMetadata = reactive<Record<string, ExtensionMetadata>>({});
	const extensionPoints = reactive<ExtensionPoints>({
		views: {
			workflows: {
				header: [],
			},
		},
	});

	function createNamespaceString(manifest: ExtensionManifest) {
		return `${manifest.publisher}/${manifest.name}`;
	}

	function registerNamespace(ns: string) {
		if (!extensionMetadata[ns]) {
			extensionMetadata[ns] = {
				components: {},
			};
		}
	}

	function registerExtensionPoints(manifest: ExtensionManifest, context: FrontendExtensionContext) {
		const ns = createNamespaceString(manifest);

		if (manifest.extends.views.workflows.header) {
			const component: Component =
				extensionMetadata[ns].components[manifest.extends.views.workflows.header];
			extensionPoints.views.workflows.header.push(component);
		}
	}

	function createRegisterComponent(ns: string) {
		registerNamespace(ns);

		return (name: string, component: Component) => {
			extensionMetadata[ns].components[name] = markRaw(component);
		};
	}

	function createExtensionContext(manifest: ExtensionManifest): FrontendExtensionContext {
		const context: FrontendExtensionContext = {};
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
		extensionPoints,
		initialize,
	};
});
