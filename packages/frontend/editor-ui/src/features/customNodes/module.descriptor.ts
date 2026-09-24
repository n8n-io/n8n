import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	CUSTOM_NODE_VERSIONS_MODAL_KEY,
	CUSTOM_NODE_WIZARD_MODAL_KEY,
	CUSTOM_NODES_SETTINGS_VIEW,
} from './customNodes.constants';

const SettingsCustomNodesView = async () => await import('./views/SettingsCustomNodesView.vue');

/**
 * Custom Nodes & Custom Operations mockup. Active whenever the backend module
 * `custom-nodes` is running (always, on this branch).
 * The sidebar entry is added in `useSettingsItems` so it sits next to
 * Community Nodes.
 */
export const CustomNodesModule: FrontendModuleDescription = {
	id: 'custom-nodes',
	name: 'Custom Nodes',
	description: 'Turn HTTP requests into reusable custom nodes and operations',
	icon: 'blocks',
	routes: [
		{
			path: 'custom-nodes',
			name: CUSTOM_NODES_SETTINGS_VIEW,
			component: SettingsCustomNodesView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				middlewareOptions: {
					custom: () => useSettingsStore().isCustomNodesMockupEnabled,
				},
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	modals: [
		{
			key: CUSTOM_NODE_WIZARD_MODAL_KEY,
			component: async () => await import('./components/CustomNodeWizardModal.vue'),
			initialState: { open: false },
		},
		{
			key: CUSTOM_NODE_VERSIONS_MODAL_KEY,
			component: async () => await import('./components/CustomNodeVersionsModal.vue'),
			initialState: { open: false },
		},
	],
};
