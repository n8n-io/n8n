import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

import {
	RUNTIME_CREDENTIALS_MANAGE_SCOPE,
	RUNTIME_CREDENTIALS_MODULE_ID,
	RUNTIME_CREDENTIALS_SETTINGS_VIEW,
} from './runtime-credentials.constants';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// `pnpm turbo typecheck` is what checks this component for real.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const RuntimeCredentialsSettingsView = async () =>
	await import('./RuntimeCredentialsSettingsView.vue');

/** Keep this file import-light: stores are read only inside getters, after login. */
export const RuntimeCredentialsModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: RUNTIME_CREDENTIALS_MODULE_ID,
	name: 'Runtime Credentials',
	description: 'Lets admins choose which trigger values credentials can use at runtime',
	icon: 'key-round',
	routes: [
		{
			path: 'runtime-credentials',
			name: RUNTIME_CREDENTIALS_SETTINGS_VIEW,
			component: RuntimeCredentialsSettingsView,
			// The module is always active, so `custom` does not see the feature flag.
			beforeEnter: () =>
				useSettingsStore().moduleSettings[RUNTIME_CREDENTIALS_MODULE_ID]?.enabled === true || '/',
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: {
					rbac: { scope: RUNTIME_CREDENTIALS_MANAGE_SCOPE },
				},
				telemetry: { pageCategory: 'settings' },
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-runtime-credentials',
			section: 'security',
			icon: 'key-round',
			get label() {
				return useI18n().baseText('settings.runtimeCredentials.title');
			},
			position: 'top',
			route: { to: { name: RUNTIME_CREDENTIALS_SETTINGS_VIEW } },
			get available() {
				// The module is always active, so the feature flag is in the module settings.
				return (
					useSettingsStore().moduleSettings[RUNTIME_CREDENTIALS_MODULE_ID]?.enabled === true &&
					useRBACStore().hasScope(RUNTIME_CREDENTIALS_MANAGE_SCOPE)
				);
			},
		},
	],
});
