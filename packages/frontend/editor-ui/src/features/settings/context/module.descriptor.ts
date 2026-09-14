import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { VIEWS } from '@/app/constants';

import { isContextPreferencesEnabled } from './context.utils';
import { CONTEXT_MODALS } from './modals';

/**
 * Carries the routes and the preference modal. The shell's modal catalogue is
 * ratcheted closed, so a modal registers through its own feature instead.
 *
 * The routes list no `custom` middleware on purpose: the module initializer would
 * then gate them on a backend module of this id being active, and preferences have
 * no backend module. The flag check runs in `beforeEnter` instead. There is no RBAC
 * gate either, because every user reaches these pages for their own preferences.
 *
 * The sidebar entry stays with the shell: the settings sidebar hides the pages of
 * a module whose backend counterpart is not active. Move it here once one exists.
 */
export const ContextModule: FrontendModuleDescription = {
	id: 'context',
	name: 'Context',
	description: 'Reusable preferences for the n8n assistant and connected AI tools',
	icon: 'brain',
	routes: [
		{
			path: 'context',
			name: VIEWS.SETTINGS_CONTEXT,
			component: async () => await import('./views/SettingsContextView.vue'),
			meta: {
				middleware: ['authenticated'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
			beforeEnter: () => isContextPreferencesEnabled() || { name: VIEWS.HOMEPAGE },
		},
		{
			path: 'context/preferences',
			name: VIEWS.SETTINGS_CONTEXT_PREFERENCES,
			component: async () => await import('./views/SettingsPreferencesView.vue'),
			meta: {
				middleware: ['authenticated'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
			beforeEnter: () => isContextPreferencesEnabled() || { name: VIEWS.HOMEPAGE },
		},
	],
	modals: CONTEXT_MODALS,
};
