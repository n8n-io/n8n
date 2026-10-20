import { VIEWS } from '@n8n/frontend-constants/views';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { SCIM_SETTINGS_VIEW } from './scim.constants';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// `pnpm turbo typecheck` is what checks this component for real.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const SettingsScimView = async () => await import('./views/SettingsScimView.vue');

/**
 * The route opens only while the backend opt-in is on. The backend evaluates
 * the opt-in once for the instance, so the frontend reads that result from the
 * module settings and never evaluates the flag for the current user. Without
 * the opt-in, the SCIM routes answer 404, so the page sends the user back to
 * the SSO settings instead.
 */
export function isScimUiAvailable(): boolean {
	const settingsStore = useSettingsStore();
	return Boolean(
		settingsStore.isModuleActive('scim') && settingsStore.moduleSettings.scim?.available,
	);
}

export const ScimModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'scim',
	name: 'SCIM provisioning',
	description: 'Lets an identity provider create, update and remove users through SCIM.',
	icon: 'user-check',

	routes: [
		{
			// A sub-page of the SSO settings. It has no sidebar item of its own.
			path: 'sso/scim',
			name: SCIM_SETTINGS_VIEW,
			component: SettingsScimView,
			beforeEnter() {
				return isScimUiAvailable() || { name: VIEWS.SSO_SETTINGS };
			},
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: {
					rbac: {
						scope: 'scim:manage',
					},
				},
				telemetry: {
					pageCategory: 'settings',
					getProperties() {
						return {
							feature: 'scim',
							opt_in_source: useSettingsStore().moduleSettings.scim?.optInSource ?? null,
						};
					},
				},
			},
		},
	],
});
