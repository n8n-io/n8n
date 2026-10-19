import { VIEWS } from '@n8n/frontend-constants/views';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { EnterpriseEditionFeature } from '@/app/constants/enterprise';

import { LOG_STREAMING_MODALS } from './modals';

const SettingsLogStreamingView = async () => await import('./views/SettingsLogStreamingView.vue');
const LogStreamingPlaceholderView = async () =>
	await import('./views/LogStreamingPlaceholderView.vue');

// The backend module is inactive on an unlicensed instance. The placeholder shows the paywall.
// A licensed instance that turned the module off sees nothing.
//
// The page has no sidebar link of its own: the shell's Observability overview lists it, so
// the route nests under that overview and the old flat path redirects there.
export const LogStreamingModule = defineFrontendModule({
	id: 'log-streaming',
	name: 'Log streaming',
	description: 'Send n8n events to external destinations',
	icon: 'log-in',
	modals: LOG_STREAMING_MODALS,
	placeholderPage: {
		licenseFlag: EnterpriseEditionFeature.LogStreaming,
		component: LogStreamingPlaceholderView,
	},
	routes: [
		{
			path: 'log-streaming',
			name: VIEWS.LOG_STREAMING_SETTINGS,
			component: SettingsLogStreamingView,
			meta: {
				parentRouteName: VIEWS.OBSERVABILITY_SETTINGS_ROOT,
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
		{
			path: 'log-streaming',
			redirect: { name: VIEWS.LOG_STREAMING_SETTINGS },
			meta: {
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
});
