/* eslint-disable no-console */
import type { Router } from 'vue-router';
import { markRaw } from 'vue';
import { i18nInstance } from '@n8n/i18n';
import { extensionPointRegistry } from './registry';
import { EXTENSIONS, type ExtensionDefinition } from './registry.generated';
import * as modalRegistry from '@/app/moduleInitializer/modalRegistry';

interface LoadedExtension {
	definition: ExtensionDefinition;
	module: unknown;
	active: boolean;
}

/**
 * Convert extension name to i18n namespace key
 * @example '@n8n/ce-hello-world' -> 'extension.helloWorld'
 */
function extensionNameToNamespace(extensionName: string): string {
	const withoutPrefix = extensionName.replace(/^@n8n\/ce-/, '');
	const camelCase = withoutPrefix.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
	return `ce.${camelCase}`;
}

class ExtensionLoader {
	private loadedExtensions = new Map<string, LoadedExtension>();

	private router: Router | null = null;

	/**
	 * Phase 1: Register routes (before router installation)
	 * Does not access stores or call shouldLoad - just registers routes
	 */
	registerRoutes(router: Router): void {
		this.router = router;
		console.debug(`🔌 Registering routes for ${EXTENSIONS.length} extension(s)...`);

		for (const extensionDef of EXTENSIONS) {
			try {
				// Access the statically loaded extension module
				const extension = extensionDef.module.default;

				// Register routes if extension exports them
				if (extension?.routes && this.router) {
					for (const route of extension.routes) {
						// Add extension metadata to route
						const enhancedRoute = {
							...route,
							meta: {
								...route.meta,
								extensionName: extensionDef.name,
							},
						};
						this.router.addRoute(enhancedRoute);
						console.debug(`  → Registered route: ${String(route.path || route.name)}`);
					}
				}
			} catch (error) {
				console.error(`✗ Failed to register routes for extension: ${extensionDef.name}`, error);
			}
		}

		console.debug('🔌 Route registration complete');
	}

	/**
	 * Phase 2: Activate extensions (after pinia/stores are ready)
	 * Calls shouldLoad, registers extension points, calls onActivate
	 */
	async activateAll(): Promise<void> {
		console.debug(`🔌 Activating ${EXTENSIONS.length} extension(s)...`);

		for (const extensionDef of EXTENSIONS) {
			try {
				await this.activate(extensionDef);
			} catch (error) {
				console.error(`✗ Failed to activate extension: ${extensionDef.name}`, error);
			}
		}

		const activeCount = Array.from(this.loadedExtensions.values()).filter((p) => p.active).length;

		console.debug(`🔌 ${activeCount}/${EXTENSIONS.length} extension(s) active`);
	}

	/**
	 * Activate a single extension (Phase 2)
	 * Checks shouldLoad, registers extension points, calls onActivate
	 */
	private async activate(extensionDef: ExtensionDefinition): Promise<void> {
		if (!(await this.shouldLoad(extensionDef))) {
			console.debug(`⊘ Extension ${extensionDef.name} load condition not met, skipping`);
			return;
		}

		const extension = extensionDef.module.default;

		// Register extension points
		if (extension.extends) {
			for (const [extensionPointName, config] of Object.entries(extension.extends)) {
				const isBindingConfig =
					typeof config === 'object' && config !== null && 'component' in config;
				const component = isBindingConfig ? config.component : config;
				const priority = isBindingConfig ? (config.priority ?? 0) : 0;

				if (component) {
					extensionPointRegistry.register(extensionPointName, {
						extensionName: extensionDef.name,
						component: markRaw(component),
						priority,
					});
					console.debug(`  → Registered at ${extensionPointName}`);
				}
			}
		}

		// Register modals if extension exports them
		if (extension?.modals && Array.isArray(extension.modals)) {
			for (const modalDef of extension.modals) {
				try {
					// Namespace modal key with extension name to avoid conflicts
					const namespacedKey = `${extensionDef.name}.${modalDef.key}`;
					modalRegistry.register({
						...modalDef,
						key: namespacedKey,
					});
					console.debug(`  → Registered modal: ${namespacedKey}`);
				} catch (error) {
					console.error(`  ! Error registering modal ${modalDef.key}:`, error);
				}
			}
		}

		// Register translations if extension exports them
		if (extension?.locales && typeof extension.locales === 'object') {
			const namespace = extensionNameToNamespace(extensionDef.name);

			for (const [locale, translations] of Object.entries(extension.locales)) {
				try {
					const parts = namespace.split('.');
					const namespacedTranslations = parts.reduceRight(
						(acc, part) => ({ [part]: acc }),
						translations,
					);

					i18nInstance.global.mergeLocaleMessage(locale, namespacedTranslations);
					console.debug(`  → Registered ${locale} translations under: ${namespace}`);
				} catch (error) {
					console.error(`  ! Error registering ${locale} translations:`, error);
				}
			}
		}

		// Call onActivate lifecycle hook if it exists
		if (extension?.onActivate) {
			try {
				await extension.onActivate();
				console.debug(`  → Called onActivate for ${extensionDef.name}`);
			} catch (error) {
				console.error(`  ! Error in onActivate for ${extensionDef.name}:`, error);
			}
		}

		// Store loaded extension
		this.loadedExtensions.set(extensionDef.name, {
			definition: extensionDef,
			module: extension,
			active: true,
		});

		console.debug(`✓ Activated extension: ${extensionDef.name}`);
	}

	private async shouldLoad(extensionDef: ExtensionDefinition): Promise<boolean> {
		try {
			// Check if extension module exports a shouldLoad function
			if (extensionDef.shouldLoad) {
				const result = await extensionDef.shouldLoad();
				console.debug(`Extension ${extensionDef.name} shouldLoad:`, result);
				return result;
			}

			// No shouldLoad function = always load
			return true;
		} catch (error) {
			console.error(`Error evaluating load condition for ${extensionDef.name}:`, error);
			return false;
		}
	}

	/**
	 * Reload extensions
	 */
	async reload(): Promise<void> {
		console.debug('🔄 Reloading extensions...');

		extensionPointRegistry.clear();
		this.loadedExtensions.clear();
		await this.activateAll();
	}

	/**
	 * Get extension state
	 */
	getState(extensionName: string): LoadedExtension | undefined {
		return this.loadedExtensions.get(extensionName);
	}

	/**
	 * Get all active extensions
	 */
	getActiveExtensions(): LoadedExtension[] {
		return Array.from(this.loadedExtensions.values()).filter((p) => p.active);
	}
}

let loaderInstance: ExtensionLoader | null = null;

export function registerExtensionRoutes(router: Router): void {
	loaderInstance ??= new ExtensionLoader();
	loaderInstance.registerRoutes(router);
}

export async function activateExtensions(): Promise<void> {
	if (!loaderInstance) {
		throw new Error('ExtensionLoader not initialized. Call registerExtensionRoutes first.');
	}

	await loaderInstance.activateAll();
}

export function getExtensionLoader(): ExtensionLoader | null {
	return loaderInstance;
}
