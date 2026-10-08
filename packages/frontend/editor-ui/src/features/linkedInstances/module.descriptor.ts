import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';

import {
	LINKED_INSTANCES_MODULE_ID,
	LINKED_INSTANCES_SCOPE,
	LINKED_INSTANCES_SETTINGS_VIEW,
} from './linkedInstances.constants';

const SettingsLinkedInstancesView = async () =>
	await import('./views/SettingsLinkedInstancesView.vue');

/**
 * The `custom` middleware hides the route while the backend module is off, and the shell
 * drops the sidebar item then. Both also require the scope of the backend routes.
 */
export const LinkedInstancesModule = defineFrontendModule({
	id: LINKED_INSTANCES_MODULE_ID,
	name: 'Linked instances',
	description: 'Link other n8n instances so chats and workflows can run there',
	icon: 'link',
	routes: [
		{
			path: 'linked-instances',
			name: LINKED_INSTANCES_SETTINGS_VIEW,
			component: SettingsLinkedInstancesView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: {
					rbac: {
						scope: LINKED_INSTANCES_SCOPE,
					},
				},
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-linked-instances',
			icon: 'link',
			get label() {
				return useI18n().baseText('settings.linkedInstances');
			},
			position: 'top',
			route: { to: { name: LINKED_INSTANCES_SETTINGS_VIEW } },
			get available() {
				return useRBACStore().hasScope(LINKED_INSTANCES_SCOPE);
			},
		},
	],
});
