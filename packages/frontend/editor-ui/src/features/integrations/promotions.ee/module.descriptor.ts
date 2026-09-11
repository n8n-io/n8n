import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { VIEWS } from '@/app/constants';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';
import { PROMOTIONS_MODALS } from './modals';
import { PROMOTIONS_SETTINGS_VIEW } from './promotions.constants';

const SettingsView = async () => await import('./views/PromotionsSettingsView.vue');

const SETTINGS_SCOPES = [
	'gitConnection:list',
	'gitConnection:read',
	'gitConnection:create',
	'gitConnection:update',
	'gitConnection:delete',
] as const;

export const PromotionsModule: FrontendModuleDescription = {
	id: 'promotions',
	name: 'Promotions',
	description: 'Promote workflow changes between environments',
	icon: 'upload',
	routes: [
		{
			path: 'promotions',
			name: PROMOTIONS_SETTINGS_VIEW,
			component: SettingsView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: {
					rbac: { scope: [...SETTINGS_SCOPES], options: { mode: 'allOf' } },
				},
				telemetry: {
					pageCategory: 'settings',
					getProperties: () => ({ feature: 'promotions' }),
				},
			},
			// Check the rollout flag here because module routes skip custom middleware.
			beforeEnter: () => usePromotionsEnabled().isEnabled.value || { name: VIEWS.HOMEPAGE },
		},
	],
	modals: PROMOTIONS_MODALS,
};
