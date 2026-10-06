import { VIEWS } from '@n8n/frontend-constants/views';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { LOG_STREAMING_MODALS } from './modals';

const SettingsLogStreamingView = async () => await import('./views/SettingsLogStreamingView.vue');

/**
 * The backend module is inactive on an unlicensed instance, but the page must still show
 * the paywall. So the route has no `custom` middleware (no module-active check), and the
 * sidebar item stays in the shell (`useSettingsItems.ts`).
 */
export const LogStreamingModule = defineFrontendModule({
	id: 'log-streaming',
	name: 'Log streaming',
	description: 'Send n8n events to external destinations',
	icon: 'log-in',
	modals: LOG_STREAMING_MODALS,
	routes: [
		{
			path: 'log-streaming',
			name: VIEWS.LOG_STREAMING_SETTINGS,
			component: SettingsLogStreamingView,
			meta: {
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: {
					rbac: {
						scope: 'logStreaming:manage',
					},
				},
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
});
