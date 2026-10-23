import type { PromotionDirection } from '@n8n/api-types';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { RouterView, type RouteLocationNormalized, type RouteRecordRaw } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';
import {
	PROMOTION_PREVIEW_VIEWS,
	PROMOTIONS_ENVIRONMENT_ADD_VIEW,
	PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
	PROMOTIONS_SETTINGS_SCOPES,
	PROMOTIONS_SETTINGS_VIEW,
} from './promotions.constants';

const SettingsView = async () => await import('./views/PromotionsSettingsView.vue');
const EnvironmentView = async () => await import('./views/PromotionEnvironmentView.vue');
const PreviewView = async () => await import('./views/PromotionPreviewView.vue');

// Check the rollout flag here because module routes skip custom middleware.
const requirePromotionsEnabled = () =>
	usePromotionsEnabled().isEnabled.value || { name: VIEWS.HOMEPAGE };

/** A project page that shows the changes before the user promotes or applies them. */
const previewRoute = (direction: PromotionDirection): RouteRecordRaw => ({
	path: `promotions/${direction}`,
	name: PROMOTION_PREVIEW_VIEWS[direction],
	component: PreviewView,
	props: (route: RouteLocationNormalized) => ({
		projectId: String(route.params.projectId),
		direction,
	}),
	meta: {
		projectRoute: true,
		middleware: ['authenticated', 'custom'],
	},
	// Users who cannot promote or apply see no promotions UI, so a direct link leads home.
	// The rbac middleware needs project scopes, which these routes do not load.
	beforeEnter: () => {
		const scope = direction === 'promote' ? 'gitConnection:push' : 'gitConnection:pull';
		const allowed =
			usePromotionsEnabled().isEnabled.value &&
			useRBACStore().hasScope(['gitConnection:read', scope], {}, { mode: 'allOf' });
		return allowed || { name: VIEWS.HOMEPAGE };
	},
});

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
					rbac: { scope: [...PROMOTIONS_SETTINGS_SCOPES], options: { mode: 'allOf' } },
				},
				telemetry: {
					pageCategory: 'settings',
					getProperties: () => ({ feature: 'promotions' }),
				},
			},
			beforeEnter: requirePromotionsEnabled,
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
		previewRoute('promote'),
		previewRoute('apply'),
	],
});
