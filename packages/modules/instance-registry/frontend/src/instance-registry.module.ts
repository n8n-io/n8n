import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

/**
 * Keep this file import-light: types and the SDK only. Views load lazily
 * (`const View = async () => await import('./views/X.vue')`), and stores are
 * referenced inside route guards or handlers, never at module scope — a
 * top-level store import pulls the whole module in even when it is disabled.
 *
 * This module contributes no UI surface yet: it owns the cluster-info store the
 * About modal and the debug-info report read. The descriptor is what registers it
 * against the backend `instance-registry` module and gives a future settings page
 * somewhere to land.
 */
export const InstanceRegistryModule: FrontendModuleDescription = {
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'instance-registry',
	name: 'Instance Registry',
	description: 'Reports which instances are in this deployment and their health',
	icon: 'server',

	// --- Wired in the shell today. Uncomment what this module contributes. ---
	//
	// routes: [ /* RouteRecordRaw[]; components must be lazy */ ],
	// projectTabs: { overview: [], project: [], shared: [] },
	// resources: [ /* ResourceMetadata[]; feeds ResourcesListLayout */ ],
	// modals: [ /* ModalDefinition[]; rendered by DynamicModalLoader */ ],
	// settingsPages: [ /* IMenuItem[]; feeds SettingsSidebar */ ],

	// --- Typed by the SDK, NOT yet wired in the shell. Setting these does nothing. ---
	//
	// locales, pushHandlers, commands, shortcuts, banners, setup
	//
	// The SDK exports the types and (for some) a registry, but no shell host reads
	// them yet, so a value here is silently ignored at runtime. See CAT-3685.
};
