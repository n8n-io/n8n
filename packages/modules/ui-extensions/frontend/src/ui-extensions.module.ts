import { defineFrontendModule } from '@n8n/frontend-module-sdk';

/**
 * Keep this file import-light: types and the SDK only. Views load lazily, and
 * stores are read inside handlers, never at module scope.
 */
export const UiExtensionsModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'ui-extensions',
	name: 'UI extensions',
	description: 'A side panel with views that MCP clients create',
	icon: 'panel-right',

	pushHandlers: {
		uiExtensionViewsChanged: async () => {
			const { useSidePanelStore } = await import('./ui-extensions.store');
			await useSidePanelStore().fetchViews();
		},
	},
});
