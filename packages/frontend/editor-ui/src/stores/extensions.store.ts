import { useToast } from '@/composables/useToast';
import { STORES } from '@/constants';
import n8n from '@/extensions-sdk';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type Extension = {
	id: string;
	name: string;
	displayName: string;
	description: string;
	author: string;
	version: string;
	category: string;
	enabled: boolean;
	tags?: string[];
	minSDVersion?: string;
	setup: {
		frontend?: string;
		backend?: string;
	};
	contributes: unknown;
	path: string;
	initialized?: boolean;
};

export const useExtensionsStore = defineStore(STORES.EXTENSIONS, () => {
	const extensions = ref<Extension[]>([]);

	const toast = useToast();

	const loadExtensions = () => {
		// Load all manifests from the extensions directory
		const manifestModules = import.meta.glob('../extensions/*/n8n.manifest.json', { eager: true });

		const loaded: Extension[] = [];
		for (const path in manifestModules) {
			const extension = manifestModules[path].default;
			loaded.push({
				...extension,
				path,
				enabled: true,
			});
		}
		extensions.value = loaded;
	};

	const getAllSettingsExtensions = () => {
		return extensions.value.filter((extension) => {
			const contributes = extension.contributes as { settingsPage?: unknown };
			return contributes.settingsPage !== undefined;
		});
	};

	const getExtensionById = (id: string) => {
		const extension = extensions.value.find((e) => e.id === id);
		return extension;
	};

	const getSettingsExtension = (id: string) => {
		const settingsExtensions = getAllSettingsExtensions();
		const settingsExtension = settingsExtensions.find((extension) => extension.id === id);
		if (!settingsExtension) {
			throw new Error(`Settings extension with id "${id}" not found`);
		}
		return settingsExtension;
	};

	const setupExtension = async (id: string) => {
		const extension = getExtensionById(id);
		if (!extension || !extension.enabled) {
			return;
		}
		if (!extension.setup.frontend) {
			toast.showError(
				new Error(`Extension "${extension.name}" does not have a frontend entry point`),
				'Error loading extension',
			);
			return;
		}

		const basePath = extension.path.replace('n8n.manifest.json', '');
		const mainPath = `${basePath}${extension.setup.frontend?.replace('./', '')}`;

		const extensionModule = await import(mainPath);
		const context = n8n;
		extensionModule.setup(context.n8n.extensionContext);
		extension.initialized = true;
	};

	return {
		extensions,
		loadExtensions,
		getAllSettingsExtensions,
		getSettingsExtension,
		setupExtension,
	};
});
