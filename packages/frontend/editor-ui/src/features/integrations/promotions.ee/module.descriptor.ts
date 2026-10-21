import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { RouterView } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';
import { PROMOTIONS_MODALS } from './modals';
import {
	PROMOTIONS_ENVIRONMENT_ADD_VIEW,
	PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
	PROMOTIONS_SETTINGS_VIEW,
} from './promotions.constants';

const SettingsView = async () => await import('./views/PromotionsSettingsView.vue');
const EnvironmentView = async () => await import('./views/PromotionEnvironmentView.vue');

const SETTINGS_SCOPES = [
	'gitConnection:list',
	'gitConnection:read',
	'gitConnection:create',
	'gitConnection:update',
	'gitConnection:delete',
] as const;

export const PromotionsModule = defineFrontendModule({
	id: 'promotions',
	name: 'Promotions',
	description: 'Promote workflow changes between environments',
	icon: 'upload',
	routes: [
		{
			path: 'promotions',
			component: RouterView,
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
			children: [
				{ path: '', name: PROMOTIONS_SETTINGS_VIEW, component: SettingsView },
				{
					path: 'add/:direction(apply|promote)',
					name: PROMOTIONS_ENVIRONMENT_ADD_VIEW,
					component: EnvironmentView,
					props: true,
				},
				{
					path: 'edit/:environmentId',
					name: PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
					component: EnvironmentView,
					props: true,
				},
			],
		},
	],
	modals: PROMOTIONS_MODALS,
});
