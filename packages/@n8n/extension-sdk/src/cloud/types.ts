import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

/**
 * Modal definition for extension
 * Extensions export an array of these to register modals
 */
export interface CloudExtensionModalDefinition {
	/**
	 * Unique key for this modal within the extension
	 * Will be namespaced automatically as: {extensionName}.{key}
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
		[key: string]: unknown;
	};
}

/**
 * Extension point binding configuration
 * Can be a Vue component directly or an object with component and priority
 */
export type CloudExtensionPointBinding =
	| Component
	| {
			component: Component;
			priority?: number;
	  };

/**
 * Complete extension definition structure
 * Use the defineCloudExtension() helper to create type-safe extension definitions
 */
export interface CloudExtension {
	/**
	 * Unique name for this extension (required)
	 * Should be scoped to your organization, e.g. '@n8n/ce-my-extension'
	 */
	name: string;

	/**
	 * Version of this extension following semver (required)
	 */
	version: string;

	/**
	 * Human-readable display name for this extension
	 */
	displayName?: string;

	/**
	 * Description of what this extension does
	 */
	description?: string;

	/**
	 * Extension point bindings
	 * Maps extension point IDs to Vue components or binding configurations
	 * Components should be wrapped with markRaw() to prevent reactivity
	 *
	 * @example
	 * ```typescript
	 * extends: {
	 *   'views.projects.header.button': markRaw(MyComponent),
	 *   'views.workflows.sidebar': { component: markRaw(SidebarComponent), priority: 100 }
	 * }
	 * ```
	 */
	extends?: Record<string, CloudExtensionPointBinding>;

	/**
	 * Control when the extension should load
	 * Return true to load the extension, false to skip it
	 * This is called early in the application lifecycle
	 */
	shouldLoad?: () => Promise<boolean>;

	/**
	 * Called when the extension is activated (after shouldLoad returns true)
	 * Use this to set up event listeners, register experiment tracking, etc.
	 */
	onActivate?: () => Promise<void> | void;

	/**
	 * Vue Router routes to register for this extension
	 * Routes are registered during Phase 1 (before store initialization)
	 */
	routes?: RouteRecordRaw[];

	/**
	 * Modal definitions to register for this extension
	 * Modals are registered during Phase 2 (after activation)
	 */
	modals?: CloudExtensionModalDefinition[];

	/**
	 * Localized translations for this extension
	 * Keys are locale codes (en, de, es, etc.)
	 * Values are translation objects that will be namespaced under the extension name
	 *
	 * @example
	 * ```typescript
	 * locales: {
	 *   en: { greeting: 'Hello', settings: { title: 'Settings' } },
	 *   de: { greeting: 'Hallo', settings: { title: 'Einstellungen' } }
	 * }
	 * // Access in components: t('extension.helloWorld.greeting')
	 * ```
	 */
	locales?: Record<string, Record<string, unknown>>;
}
