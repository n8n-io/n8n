import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { VIEWS } from '@n8n/frontend-constants/views';

import { API_KEY_CREATE_OR_EDIT_MODAL_KEY } from './apiKeys.constants';

/**
 * Keep this file import-light: types, the SDK and constants only. Views and modals
 * load lazily, and no store is read at module scope.
 */
const SettingsApiView = async () => await import('./views/SettingsApiView.vue');
const ApiKeyCreateOrEditModal = async () =>
	await import('./components/ApiKeyCreateOrEditModal.vue');

export const ApiKeysModule = defineFrontendModule({
	// No backend module has this id: API keys are a service in `packages/cli`. So
	// `settingsStore.isModuleActive('api-keys')` is always false, by design. Do not use a
	// surface that the shell hides for an inactive module:
	// - The route has no `'custom'` middleware, so the module availability check never runs.
	// - There is no `settingsPages` entry. The shell keeps the "n8n API" sidebar link in
	//   `useSettingsItems.ts`, gated on `settingsStore.isPublicApiEnabled`.
	// `api-keys.module.test.ts` and the shell's `moduleInitializer.test.ts` guard both.
	id: 'api-keys',
	name: 'API keys',
	description: 'Create and manage the API keys of the n8n public API',
	icon: 'plug',
	routes: [
		{
			path: 'api',
			name: VIEWS.API_SETTINGS,
			component: SettingsApiView,
			meta: {
				middleware: ['authenticated'],
				telemetry: {
					pageCategory: 'settings',
					getProperties() {
						return {
							feature: 'api',
						};
					},
				},
			},
		},
	],
	modals: [
		{
			key: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
			component: ApiKeyCreateOrEditModal,
			initialState: {
				open: false,
				data: {
					activeId: null,
					mode: '',
				},
			},
		},
	],
});
