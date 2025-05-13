import { defineStore } from 'pinia';
import type { ModuleManifest } from '@n8n/sdk';
import type { FrontendModuleContext } from '@n8n/sdk/frontend';
import { STORES } from '@/constants';
import type { Component } from 'vue';
import { ref, reactive, markRaw } from 'vue';
import { useRootStore } from '@/stores/root.store';
import { getModules } from '@/api/modules';

type ModuleMetadata = {
	components: Record<string, Component>;
};

type ModuleExtensionPoints = {
	views: {
		workflows: {
			header: Component[];
		};
	};
};

export const useModulesStore = defineStore(STORES.MODULES, () => {
	const rootStore = useRootStore();

	const manifests = ref<ModuleManifest[]>([]);
	const metadata = reactive<Record<string, ModuleMetadata>>({});
	const extensionPoints = reactive<ModuleExtensionPoints>({
		views: {
			workflows: {
				header: [],
			},
		},
	});

	function createNamespaceString(manifest: ModuleManifest) {
		return `${manifest.publisher}/${manifest.name}`;
	}

	function registerNamespace(ns: string) {
		if (!metadata[ns]) {
			metadata[ns] = {
				components: {},
			};
		}
	}

	function registerExtensionPoints(manifest: ModuleManifest) {
		const ns = createNamespaceString(manifest);

		if (manifest.extends?.views.workflows.header) {
			const component: Component = metadata[ns].components[manifest.extends.views.workflows.header];
			extensionPoints.views.workflows.header.push(component);
		}
	}

	function createRegisterComponent(ns: string) {
		registerNamespace(ns);

		return (name: string, component: Component) => {
			metadata[ns].components[name] = markRaw(component);
		};
	}

	function createModuleContext(manifest: ModuleManifest): FrontendModuleContext {
		const context: FrontendModuleContext = {};
		const ns = createNamespaceString(manifest);

		if (manifest.extends?.views) {
			context.registerComponent = createRegisterComponent(ns);
		}

		return context;
	}

	async function initialize() {
		await fetchModules();

		const loadedModules = await Promise.all(manifests.value.map(injectModuleScript));

		loadedModules.forEach((moduleManifest, index) => {
			const moduleContext = createModuleContext(moduleManifest);
			const moduleObject = window.n8nFrontendModules[index];

			moduleObject.setup(moduleContext);

			registerExtensionPoints(moduleManifest);
		});
	}

	async function injectModuleScript(manifest: ModuleManifest) {
		const source = `http://localhost:5678/rest/modules/${manifest.name}/frontend.js`;
		await injectScript(source);
		return manifest;
	}

	/**
	 * Injects a script into the DOM and waits for it to load.
	 */
	async function injectScript(source: string) {
		return await new Promise((resolve) => {
			// Create a script element and append it as the last child in body
			const script = document.createElement('script');
			script.type = 'text/javascript';
			script.async = true;
			script.src = source;
			script.onload = () => resolve();

			document.body.appendChild(script);
		});
	}

	async function fetchModules() {
		const modules = await getModules(rootStore.restApiContext);

		modules.forEach((extension) => {
			if (!manifests.value.some((e) => e.name === extension.name)) {
				manifests.value.push(extension);
			}
		});
	}

	return {
		manifests,
		metadata,
		extensionPoints,
		initialize,
	};
});
