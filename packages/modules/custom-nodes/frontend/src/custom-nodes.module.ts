import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	CUSTOM_NODE_CREATE_SCOPE,
	CUSTOM_NODES_MODULE_ID,
	CUSTOM_NODES_SETTINGS_VIEW,
} from './custom-nodes.constants';

const SettingsCustomNodesView = async () => await import('./views/SettingsCustomNodesView.vue');

/**
 * Keep this file import-light: types and the SDK only. Views load lazily, and stores are
 * referenced inside route guards or handlers, never at module scope.
 */
export const CustomNodesModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: CUSTOM_NODES_MODULE_ID,
	name: 'Custom Nodes',
	description: 'Create custom nodes and actions that call an HTTP API',
	icon: 'blocks',
	routes: [
		{
			path: 'custom-nodes',
			name: CUSTOM_NODES_SETTINGS_VIEW,
			component: SettingsCustomNodesView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: {
					rbac: { scope: CUSTOM_NODE_CREATE_SCOPE },
					custom: () => Boolean(useSettingsStore().isModuleActive(CUSTOM_NODES_MODULE_ID)),
				},
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-custom-nodes',
			order: 30,
			section: 'integrations',
			icon: 'blocks',
			get label() {
				return useI18n().baseText('customNodes.settings.title');
			},
			position: 'top',
			route: { to: { name: CUSTOM_NODES_SETTINGS_VIEW } },
			get available() {
				return (
					useSettingsStore().isModuleActive(CUSTOM_NODES_MODULE_ID) &&
					useRBACStore().hasScope(CUSTOM_NODE_CREATE_SCOPE)
				);
			},
		},
	],
});
