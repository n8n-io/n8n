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

export type ExtensionSetupMethod = 'directImport' | 'shadowRealm' | 'iframe';

export const useExtensionsStore = defineStore(STORES.EXTENSIONS, () => {
	const extensions = ref<Extension[]>([]);

	const setupMethod = ref<ExtensionSetupMethod>('directImport');

	const toast = useToast();

	const loadExtensions = () => {
		// Load all manifests from the extensions directory
		const manifestModules = import.meta.glob('../../public/extensions/*/n8n.manifest.json', {
			eager: true,
		});

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

	/**
	 * Option A: Load the extension using a direct import
	 * This is the simplest way to load an extension, but it is not sandboxed.
	 * This means that the extension has access to the global scope and can modify it.
	 * @param id
	 * @returns
	 */
	const setupExtensionUsingDirectImport = async (id: string) => {
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

		// Import the extension module
		const extensionModule = await import(mainPath);
		const context = n8n;
		extensionModule.setup(context.n8n.extensionContext);
		extension.initialized = true;
	};

	/**
	 * Option B: Load the extension in an isolated iframe
	 * This is a more secure way to load an extension, but it is more complex.
	 * The extension is loaded in a sandboxed iframe, which means it does not have access to the global scope.
	 * The extension can only communicate with the parent window using postMessage.
	 * @param id
	 * @returns
	 */
	const setupExtensionUsingIframe = async (id: string) => {
		const extension = getExtensionById(id);
		if (!extension || !extension.enabled) return;

		if (!extension.setup.frontend) {
			toast.showError(
				new Error(`Extension "${extension.name}" does not have a frontend entry point`),
				'Error loading extension',
			);
			return;
		}

		const basePath = extension.path.replace('n8n.manifest.json', '');
		// const mainPath = `${basePath}${extension.setup.frontend?.replace('./', '')}`;
		const relativePath = `${basePath}${extension.setup.frontend?.replace('./', '')}`;
		// const mainPath = new URL(relativePath, window.location.origin).href;

		console.log(`Loading extension ${id} from ${mainPath}`);

		try {
			// Fetch the extension code directly from the main application
			const response = await fetch(mainPath);
			if (!response.ok) {
				throw new Error(`Failed to fetch extension code: ${response.statusText}`);
			}
			const extensionCode = await response.text();
			console.log(`Extension code for ${id} fetched successfully`, extensionCode);
		} catch (error) {
			toast.showError(error, 'Error loading extension');
			return;
		}

		extension.initialized = true;
	};

	const setupExtension = async (id: string) => {
		switch (setupMethod.value) {
			case 'directImport':
				await setupExtensionUsingDirectImport(id);
				break;
			case 'iframe':
				await setupExtensionUsingIframe(id);
				break;
		}
	};

	return {
		extensions,
		loadExtensions,
		getAllSettingsExtensions,
		getSettingsExtension,
		setupExtension,
		setupMethod,
	};
});
