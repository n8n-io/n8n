import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { UI_EXTENSION_PAGE_VIEW } from './ui-extensions.constants';

/**
 * Keep this file import-light: types and the SDK only. Views load lazily, and
 * stores are read inside handlers, never at module scope.
 */
export const UiExtensionsModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'ui-extensions',
	name: 'UI extensions',
	description: 'A side panel with views, and sidebar pages, that MCP clients create',
	icon: 'panel-right',

	routes: [
		{
			path: '/extensions/pages/:pageId',
			name: UI_EXTENSION_PAGE_VIEW,
			component: async () => await import('./views/UiExtensionPageView.vue'),
			meta: { layout: 'default', middleware: ['authenticated', 'custom'] },
		},
	],

	pushHandlers: {
		uiExtensionViewsChanged: async () => {
			const { useSidePanelStore } = await import('./ui-extensions.store');
			await useSidePanelStore().fetchViews();
		},
	},
});
