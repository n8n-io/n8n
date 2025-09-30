import type { App, Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

export type FrontendExtensionContext = {
	app: App;
	defineRoutes: (routes: RouteRecordRaw[]) => void;
	registerComponent: (name: string, component: Component) => void;
};

export type FrontendExtensionSetupFn = (context: FrontendExtensionContext) => void;

export type FrontendExtension = {
	setup: FrontendExtensionSetupFn;
};

/**
 * Modal definition for plugins
 * Plugins export an array of these to register modals
 */
export interface PluginModalDefinition {
	/**
	 * Unique key for this modal within the plugin
	 * Will be namespaced automatically as: {pluginName}.{key}
	 */
	key: string;
	/**
	 * Vue component to render for this modal
	 * Can be a component or async component factory
	 */
	component: Component | (() => Promise<Component>);
	/**
	 * Initial state for the modal (optional)
	 */
	initialState?: {
		open: boolean;
		[key: string]: any;
	};
}

/**
 * Complete plugin definition structure
 * Use the definePlugin() helper to create type-safe plugin definitions
 */
export interface FrontendPlugin {
	/**
	 * Control when the plugin should load
	 * Return true to load the plugin, false to skip it
	 * This is called early in the application lifecycle
	 */
	shouldLoad?: () => Promise<boolean>;

	/**
	 * Called when the plugin is activated (after shouldLoad returns true)
	 * Use this to set up event listeners, register experiment tracking, etc.
	 */
	onActivate?: () => Promise<void> | void;

	/**
	 * Vue Router routes to register for this plugin
	 * Routes are registered during Phase 1 (before store initialization)
	 */
	routes?: RouteRecordRaw[];

	/**
	 * Modal definitions to register for this plugin
	 * Modals are registered during Phase 2 (after activation)
	 */
	modals?: PluginModalDefinition[];

	/**
	 * Vue components to make available at extension points
	 * These are the actual component implementations referenced in the manifest
	 */
	components?: Record<string, Component>;

	/**
	 * Localized translations for this plugin
	 * Keys are locale codes (en, de, es, etc.)
	 * Values are translation objects that will be namespaced under the plugin name
	 *
	 * @example
	 * ```typescript
	 * locales: {
	 *   en: { greeting: 'Hello', settings: { title: 'Settings' } },
	 *   de: { greeting: 'Hallo', settings: { title: 'Einstellungen' } }
	 * }
	 * // Access in components: t('plugin.helloWorld.greeting')
	 * ```
	 */
	locales?: Record<string, Record<string, any>>;
}
