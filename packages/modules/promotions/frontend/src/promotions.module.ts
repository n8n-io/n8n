import type { PromotionDirection } from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import { capabilities, capabilityRegistry, defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { RouterView, type RouteLocationNormalized, type RouteRecordRaw } from 'vue-router';

import {
	PROMOTION_INSTANCE_APPLY_VIEW,
	PROMOTION_PREVIEW_VIEWS,
	PROMOTIONS_ENVIRONMENT_ADD_VIEW,
	PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
	PROMOTIONS_SETTINGS_SCOPES,
	PROMOTIONS_SETTINGS_VIEW,
} from './promotions.constants';

const SettingsView = async () => await import('./views/PromotionsSettingsView.vue');
const EnvironmentView = async () => await import('./views/PromotionEnvironmentView.vue');
const PreviewView = async () => await import('./views/PromotionPreviewView.vue');

const isPromotionsEnabled = () =>
	capabilityRegistry.use(capabilities.environmentsSettings).isPromotionsEnabled();

// Module routes skip custom middleware, so the gate runs here.
const requirePromotionsEnabled = () => isPromotionsEnabled() || { name: VIEWS.SOURCE_CONTROL };

// The scopes of the role in the project, which also hold the scopes of the instance role. The open
// project loads its scopes again, as for the badges. The project list loads once per session.
const projectScopes = (projectId: string) => {
	const openProject = capabilityRegistry.use(capabilities.projectContext).currentProject();
	return openProject?.id === projectId
		? openProject.scopes
		: capabilityRegistry.use(capabilities.projectPermissions).scopesFor(projectId);
};

// Users who cannot promote or apply see no promotions UI, so a direct link leads home.
// Apply from a project role ships with LIGO-1476. Until then only the instance role counts.
const requireOperationScope =
	(direction: PromotionDirection, otherScopes: Scope[] = []) =>
	(to: RouteLocationNormalized) => {
		const required: Scope[] = [
			direction === 'promote' ? 'promotions:promote' : 'promotions:apply',
			...otherScopes,
		];
		let canOperate: boolean;
		if (direction === 'promote') {
			const scopes = projectScopes(String(to.params.projectId));
			canOperate = required.every((scope) => scopes.includes(scope));
		} else {
			canOperate = useRBACStore().hasScope(required, {}, { mode: 'allOf' });
		}
		return (isPromotionsEnabled() && canOperate) || { name: VIEWS.HOMEPAGE };
	};

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
	beforeEnter: requireOperationScope(direction),
});

/** The same page for the Apply of the whole instance. Users open it from the settings page. */
const instanceApplyRoute: RouteRecordRaw = {
	path: '/promotions/apply',
	name: PROMOTION_INSTANCE_APPLY_VIEW,
	component: PreviewView,
	props: { direction: 'apply' },
	meta: { middleware: ['authenticated', 'custom'] },
	// Unlike a project preview, this page lists the instance environments.
	beforeEnter: requireOperationScope('apply', ['promotions:readEnvironments']),
};

export const PromotionsModule = defineFrontendModule({
	id: 'promotions',
	name: 'Promotions',
	description: 'Promote workflow changes between environments',
	icon: 'upload',
	settingsPages: [
		{
			id: 'settings-promotions',
			order: 20,
			section: 'operations',
			icon: 'git-branch',
			get label() {
				return useI18n().baseText('settings.promotions.title');
			},
			position: 'top',
			route: { to: { name: PROMOTIONS_SETTINGS_VIEW } },
			preview: true,
			// The same checks as the settings route.
			get available() {
				return (
					isPromotionsEnabled() &&
					useRBACStore().hasScope([...PROMOTIONS_SETTINGS_SCOPES], {}, { mode: 'allOf' })
				);
			},
		},
	],
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
		instanceApplyRoute,
	],
});
