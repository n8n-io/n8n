import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { VIEWS } from '@/app/constants';

import { isContextPreferencesEnabledOnceEvaluated } from './context.utils';

/**
 * No `custom` middleware: the initializer would gate the routes on a backend module,
 * which preferences do not have. The flag check runs in `beforeEnter`. The sidebar
 * entry stays with the shell, which hides module pages without a backend module.
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
			beforeEnter: async () =>
				(await isContextPreferencesEnabledOnceEvaluated()) || { name: VIEWS.HOMEPAGE },
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
			beforeEnter: async () =>
				(await isContextPreferencesEnabledOnceEvaluated()) || { name: VIEWS.HOMEPAGE },
		},
	],
};
