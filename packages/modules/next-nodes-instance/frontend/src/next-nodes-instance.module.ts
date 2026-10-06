import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import type { RouteRecordRaw } from 'vue-router';

import { canOpenNodesSettings, isNextNodesEnabled } from './next-nodes-instance.access';
import {
	HTTP_ACTION_EDIT_VIEW,
	HTTP_ACTION_VIEW,
	NODES_SETTINGS_VIEW,
} from './next-nodes-instance.constants';

const NodesSettingsView = async () => await import('./views/NodesSettingsView.vue');
const HttpActionView = async () => await import('./views/HttpActionView.vue');

// The return type gives the literals their context: the shell types the route meta.
const settingsRoute = (
	path: string,
	name: string,
	component: typeof NodesSettingsView,
): RouteRecordRaw => ({
	path,
	name,
	component,
	meta: {
		layout: 'settings',
		middleware: ['authenticated', 'rbac', 'custom'],
		middlewareOptions: {
			rbac: {
				scope: name === NODES_SETTINGS_VIEW ? 'nodeDefinition:list' : 'nodeDefinition:create',
			},
		},
		telemetry: { pageCategory: 'settings' },
	},
	beforeEnter: () => isNextNodesEnabled() || '/',
});

export const NextNodesInstanceModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'next-nodes-instance',
	name: 'Nodes',
	description: 'Actions that this instance publishes, such as declarative HTTP actions',
	icon: 'box',
	routes: [
		settingsRoute('nodes', NODES_SETTINGS_VIEW, NodesSettingsView),
		settingsRoute('nodes/new', HTTP_ACTION_VIEW, HttpActionView),
		settingsRoute('nodes/:actionId/edit', HTTP_ACTION_EDIT_VIEW, HttpActionView),
	],
	settingsPages: [
		{
			id: 'settings-nodes',
			icon: 'box',
			get label() {
				return useI18n().baseText('settings.nodes');
			},
			position: 'top',
			route: { to: { name: NODES_SETTINGS_VIEW } },
			get available() {
				return canOpenNodesSettings();
			},
		},
	],
});
