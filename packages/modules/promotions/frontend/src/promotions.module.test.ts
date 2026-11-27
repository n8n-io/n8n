import { VIEWS } from '@n8n/frontend-constants/views';
import {
	capabilities,
	capabilityRegistry,
	type EnvironmentsSettings,
	type ProjectContext,
	type ProjectPermissions,
} from '@n8n/frontend-module-sdk';
import type { Project } from '@n8n/rest-api-client';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import { PromotionsModule } from './promotions.module';
import {
	PROMOTION_INSTANCE_APPLY_VIEW,
	PROMOTION_PREVIEW_VIEWS,
	PROMOTIONS_SETTINGS_SCOPES,
	PROMOTIONS_SETTINGS_VIEW,
} from './promotions.constants';

const stub = { render: () => null };

// Avoid loading the views during route tests.
const moduleRoutes = (PromotionsModule.routes ?? []).map(
	(route) =>
		({
			...route,
			component: stub,
			children: route.children?.map((child) => ({ ...child, component: stub })),
		}) as RouteRecordRaw,
);
const settingsRoutes = moduleRoutes.filter((route) => !route.meta?.projectRoute);
const projectRoutes = moduleRoutes.filter((route) => route.meta?.projectRoute);

const createTestRouter = () =>
	createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/home', name: VIEWS.HOMEPAGE, component: stub },
			{
				path: '/settings',
				component: stub,
				children: [
					{ path: 'environments', name: VIEWS.SOURCE_CONTROL, component: stub },
					...settingsRoutes,
				],
			},
			{ path: '/projects/:projectId', component: stub, children: projectRoutes },
		],
	});

const setup = ({
	activeModules = ['promotions'],
	environmentsVersion = 'v2',
	scopes = ['promotions:promote', 'promotions:apply'] as Scope[],
	projectScopes = {} as Record<string, Scope[]>,
	openProject = null as Pick<Project, 'id' | 'scopes'> | null,
}: {
	activeModules?: string[];
	environmentsVersion?: 'v1' | 'v2';
	scopes?: Scope[];
	projectScopes?: Record<string, Scope[]>;
	openProject?: Pick<Project, 'id' | 'scopes'> | null;
} = {}) => {
	createTestingPinia({ stubActions: false });

	capabilityRegistry.provide(
		capabilities.environmentsSettings,
		mock<EnvironmentsSettings>({
			isPromotionsEnabled: () =>
				activeModules.includes('promotions') && environmentsVersion === 'v2',
		}),
	);
	capabilityRegistry.provide(
		capabilities.projectContext,
		mock<ProjectContext>({ currentProject: () => openProject as Project | null }),
	);
	// As in the app: the instance scopes plus the scopes of the role in that project.
	capabilityRegistry.provide(
		capabilities.projectPermissions,
		mock<ProjectPermissions>({
			scopesFor: (projectId) => [...scopes, ...(projectScopes[projectId] ?? [])],
		}),
	);
	useRBACStore().setGlobalScopes(scopes);
};

afterEach(() => {
	capabilityRegistry.clear();
});

describe('PromotionsModule settings link', () => {
	const link = () => PromotionsModule.settingsPages?.find(({ id }) => id === 'settings-promotions');

	it('is available when promotions are enabled and the user can read the setup', () => {
		setup({ scopes: ['promotions:readProviders', 'promotions:readEnvironments'] });

		expect(link()?.available).toBe(true);
	});

	it.each([
		['the instance uses v1', { environmentsVersion: 'v1' as const }],
		['the user lacks a settings scope', { scopes: PROMOTIONS_SETTINGS_SCOPES.slice(1) }],
	])('is not available when %s', (_, options) => {
		setup({ scopes: [...PROMOTIONS_SETTINGS_SCOPES], ...options });

		expect(link()?.available).toBe(false);
	});
});

describe('PromotionsModule settings route', () => {
	it('opens settings when promotions are enabled', async () => {
		setup();
		const router = createTestRouter();

		await router.push('/settings/promotions');

		expect(router.currentRoute.value.name).toBe(PROMOTIONS_SETTINGS_VIEW);
	});

	it.each([
		['the promotions module is inactive', { activeModules: [] }],
		['the instance uses v1', { environmentsVersion: 'v1' as const }],
	])('redirects to the v1 settings when %s', async (_, options) => {
		setup(options);
		const router = createTestRouter();

		await router.push('/settings/promotions');

		expect(router.currentRoute.value.name).toBe(VIEWS.SOURCE_CONTROL);
	});
});

describe('PromotionsModule preview routes', () => {
	it('opens the whole-instance Apply preview with the apply and environment read scopes', async () => {
		setup({ scopes: ['promotions:apply'] });
		const router = createTestRouter();

		// The page lists the instance environments, so the apply scope alone leads home.
		await router.push('/promotions/apply');
		expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);

		useRBACStore().setGlobalScopes(['promotions:apply', 'promotions:readEnvironments']);
		await router.push('/promotions/apply');
		expect(router.currentRoute.value.name).toBe(PROMOTION_INSTANCE_APPLY_VIEW);
	});

	it.each(['promote', 'apply'] as const)(
		'opens the %s preview of a project for a user with only that direction scope',
		async (direction) => {
			setup({ scopes: [`promotions:${direction}`] });
			const router = createTestRouter();

			await router.push(`/projects/p1/promotions/${direction}`);

			const route = router.currentRoute.value;
			expect(route.name).toBe(PROMOTION_PREVIEW_VIEWS[direction]);
			const props = route.matched.at(-1)?.props.default;
			expect(typeof props === 'function' ? props(route) : props).toEqual({
				projectId: 'p1',
				direction,
			});
		},
	);

	it('opens the promote preview only for projects where the role can promote', async () => {
		// The project list loaded before an admin let the role of p3 promote. The open p3 knows it.
		setup({
			scopes: [],
			projectScopes: { p1: ['promotions:promote'] },
			openProject: { id: 'p3', scopes: ['promotions:promote'] },
		});
		const router = createTestRouter();

		await router.push('/projects/p2/promotions/promote');
		expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);

		await router.push('/projects/p1/promotions/promote');
		expect(router.currentRoute.value.name).toBe(PROMOTION_PREVIEW_VIEWS.promote);

		await router.push('/home');
		await router.push('/projects/p3/promotions/promote');
		expect(router.currentRoute.value.name).toBe(PROMOTION_PREVIEW_VIEWS.promote);
	});

	it('leads users who cannot apply changes home', async () => {
		setup({ scopes: ['promotions:promote'] });
		const router = createTestRouter();

		await router.push('/projects/p1/promotions/apply');

		expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
	});

	it('redirects to home when the promotions module is inactive', async () => {
		setup({ activeModules: [] });
		const router = createTestRouter();

		await router.push('/projects/p1/promotions/promote');

		expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
	});
});
