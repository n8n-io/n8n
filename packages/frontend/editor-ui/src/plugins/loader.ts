/* eslint-disable no-console */
import type { App } from 'vue';
import type { Router } from 'vue-router';
import { markRaw } from 'vue';
import { i18nInstance } from '@n8n/i18n';
import { extensionPointRegistry } from './extension-points/registry';
import { PLUGINS, type PluginDefinition } from './registry.generated';
import * as modalRegistry from '@/moduleInitializer/modalRegistry';

interface LoadedPlugin {
	definition: PluginDefinition;
	module: any;
	active: boolean;
}

/**
 * Convert plugin name to i18n namespace key
 * @example '@n8n/plugin-hello-world' -> 'plugin.helloWorld'
 */
function pluginNameToNamespace(pluginName: string): string {
	const withoutPrefix = pluginName.replace(/^@n8n\/plugin-/, '');
	const camelCase = withoutPrefix.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
	return `plugin.${camelCase}`;
}

class PluginLoader {
	private loadedPlugins = new Map<string, LoadedPlugin>();

	private router: Router | null = null;

	/**
	 * Phase 1: Register routes (before router installation)
	 * Does not access stores or call shouldLoad - just registers routes
	 */
	registerRoutes(router: Router): void {
		this.router = router;
		console.log(`🔌 Registering routes for ${PLUGINS.length} plugin(s)...`);

		for (const pluginDef of PLUGINS) {
			try {
				// Access the statically loaded plugin module
				const plugin = pluginDef.module.default;

				// Register routes if plugin exports them
				if (plugin?.routes && this.router) {
					for (const route of plugin.routes) {
						// Add plugin metadata to route
						const enhancedRoute = {
							...route,
							meta: {
								...route.meta,
								pluginName: pluginDef.name,
							},
						};
						this.router.addRoute(enhancedRoute);
						console.debug(`  → Registered route: ${String(route.path || route.name)}`);
					}
				}
			} catch (error) {
				console.error(`✗ Failed to register routes for plugin: ${pluginDef.name}`, error);
			}
		}

		console.log('🔌 Route registration complete');
	}

	/**
	 * Phase 2: Activate plugins (after pinia/stores are ready)
	 * Calls shouldLoad, registers extension points, calls onActivate
	 */
	async activateAll(app: App): Promise<void> {
		console.log(`🔌 Activating ${PLUGINS.length} plugin(s)...`);

		for (const pluginDef of PLUGINS) {
			try {
				await this.activate(pluginDef, app);
			} catch (error) {
				console.error(`✗ Failed to activate plugin: ${pluginDef.name}`, error);
			}
		}

		const activeCount = Array.from(this.loadedPlugins.values()).filter((p) => p.active).length;

		console.log(`🔌 ${activeCount}/${PLUGINS.length} plugin(s) active`);
	}

	/**
	 * Activate a single plugin (Phase 2)
	 * Checks shouldLoad, registers extension points, calls onActivate
	 */
	private async activate(pluginDef: PluginDefinition, _app: App): Promise<void> {
		if (!(await this.shouldLoad(pluginDef))) {
			console.debug(`⊘ Plugin ${pluginDef.name} load condition not met, skipping`);
			return;
		}

		const plugin = pluginDef.module.default;

		if (pluginDef.manifest.extends) {
			for (const [extensionPointName, config] of Object.entries(pluginDef.manifest.extends)) {
				const componentName = typeof config === 'string' ? config : config.component;
				const priority = typeof config === 'object' ? (config.priority ?? 0) : 0;

				const component = plugin.components?.[componentName];

				if (component) {
					extensionPointRegistry.register(extensionPointName, {
						pluginName: pluginDef.name,
						component: markRaw(component),
						priority,
					});
					console.debug(`  → Registered at ${extensionPointName}`);
				} else {
					console.warn(`  ! Component ${componentName} not found in plugin ${pluginDef.name}`);
				}
			}
		}

		// Register modals if plugin exports them
		if (plugin?.modals && Array.isArray(plugin.modals)) {
			for (const modalDef of plugin.modals) {
				try {
					// Namespace modal key with plugin name to avoid conflicts
					const namespacedKey = `${pluginDef.name}.${modalDef.key}`;
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

		// Register translations if plugin exports them
		if (plugin?.locales && typeof plugin.locales === 'object') {
			const namespace = pluginNameToNamespace(pluginDef.name);

			for (const [locale, translations] of Object.entries(plugin.locales)) {
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
		if (plugin?.onActivate) {
			try {
				await plugin.onActivate();
				console.debug(`  → Called onActivate for ${pluginDef.name}`);
			} catch (error) {
				console.error(`  ! Error in onActivate for ${pluginDef.name}:`, error);
			}
		}

		// Store loaded plugin
		this.loadedPlugins.set(pluginDef.name, {
			definition: pluginDef,
			module: plugin,
			active: true,
		});

		console.log(`✓ Activated plugin: ${pluginDef.name} [${pluginDef.manifest.category}]`);
	}

	private async shouldLoad(pluginDef: PluginDefinition): Promise<boolean> {
		try {
			// Check if plugin module exports a shouldLoad function
			if (pluginDef.shouldLoad) {
				const result = await pluginDef.shouldLoad();
				console.debug(`Plugin ${pluginDef.name} shouldLoad:`, result);
				return result;
			}

			// No shouldLoad function = always load
			return true;
		} catch (error) {
			console.error(`Error evaluating load condition for ${pluginDef.name}:`, error);
			return false;
		}
	}

	/**
	 * Reload plugins
	 */
	async reload(app: App): Promise<void> {
		console.log('🔄 Reloading plugins...');

		extensionPointRegistry.clear();
		this.loadedPlugins.clear();
		await this.activateAll(app);
	}

	/**
	 * Get plugin state
	 */
	getState(pluginName: string): LoadedPlugin | undefined {
		return this.loadedPlugins.get(pluginName);
	}

	/**
	 * Get all active plugins
	 */
	getActivePlugins(): LoadedPlugin[] {
		return Array.from(this.loadedPlugins.values()).filter((p) => p.active);
	}
}

let loaderInstance: PluginLoader | null = null;

export function registerPluginRoutes(router: Router): void {
	loaderInstance ??= new PluginLoader();
	loaderInstance.registerRoutes(router);
}

export async function activatePlugins(app: App): Promise<void> {
	if (!loaderInstance) {
		throw new Error('PluginLoader not initialized. Call registerPluginRoutes first.');
	}

	await loaderInstance.activateAll(app);
}

export function getPluginLoader(): PluginLoader | null {
	return loaderInstance;
}
