import { VIEWS } from '@n8n/frontend-constants/views';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { i18n } from '@n8n/i18n';
import { EnterpriseEditionFeature } from '@/app/constants/enterprise';
import { hasPermission } from '@/app/utils/rbac/permissions';

import { LOG_STREAMING_MODALS } from './modals';

const SettingsLogStreamingView = async () => await import('./views/SettingsLogStreamingView.vue');
const LogStreamingPlaceholderView = async () =>
	await import('./views/LogStreamingPlaceholderView.vue');

// The backend module is inactive on an unlicensed instance. The placeholder shows the paywall.
// A licensed instance that turned the module off sees nothing.
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
	settingsPages: [
		{
			id: 'settings-log-streaming',
			order: 170,
			icon: 'log-in',
			get label() {
				return i18n.baseText('settings.log-streaming');
			},
			position: 'top',
			route: { to: { name: VIEWS.LOG_STREAMING_SETTINGS } },
			get available() {
				return hasPermission(['rbac'], { rbac: { scope: 'logStreaming:manage' } });
			},
		},
	],
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
