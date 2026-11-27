import { VIEWS } from '@n8n/frontend-constants/views';
import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import {
	createMemoryHistory,
	createRouter,
	RouterView,
	type RouteRecordNormalized,
	type RouteRecordRaw,
	type Router,
} from 'vue-router';

import { RolesModule } from './roles.module';

// Read through the contract type, so that the optional fields resolve.
const rolesModule: FrontendModuleDescription = RolesModule;
const moduleRoutes = rolesModule.routes ?? [];

/** Adds the module routes below a stub `/settings`, as `registerModuleRoutes` in the shell does. */
function createSettingsRouter(): Router {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: RouterView },
			{ path: '/settings', name: VIEWS.SETTINGS, component: RouterView },
		],
	});
	for (const route of moduleRoutes) {
		router.addRoute(VIEWS.SETTINGS, route);
	}
	return router;
}

const findRoute = (router: Router, name: string): RouteRecordNormalized => {
	const record = router.getRoutes().find((route) => route.name === name);
	if (!record) throw new Error(`No route named ${name}`);
	return record;
};

async function loadView(record: RouteRecordNormalized) {
	const loader = record.components?.default as () => Promise<{ default: unknown }>;
	return (await loader()).default;
}

describe('RolesModule', () => {
	it('has the id roles', () => {
		expect(RolesModule.id).toBe('roles');
	});

	// No backend module `roles` exists, so `isModuleActive('roles')` is always false. A
	// `'custom'` middleware or a settings page would hide every roles page.
	it('does not gate a route on the module state', () => {
		const middleware = (routes: RouteRecordRaw[]): string[] =>
			routes.flatMap((route) => [
				...((route.meta?.middleware as string[] | undefined) ?? []),
				...middleware(route.children ?? []),
			]);

		expect(middleware(moduleRoutes)).not.toContain('custom');
		expect(rolesModule.settingsPages).toBeUndefined();
		expect(rolesModule.placeholderPage).toBeUndefined();
	});

	it('puts every top-level route below the settings page', () => {
		for (const route of RolesModule.routes) {
			expect(route.meta.telemetry.pageCategory).toBe('settings');
		}
	});

	describe('routes', () => {
		let router: Router;

		beforeEach(async () => {
			router = createSettingsRouter();
			await router.push('/');
		});

		it.each([
			[VIEWS.ROLES_SETTINGS, {}, '/settings/roles'],
			[VIEWS.PROJECT_ROLE_VIEW, { roleSlug: 'a' }, '/settings/project-roles/view/a'],
			[VIEWS.INSTANCE_NEW_ROLE, {}, '/settings/instance-roles/new'],
			[VIEWS.INSTANCE_ROLE_SETTINGS, { roleSlug: 'a' }, '/settings/instance-roles/edit/a'],
			[VIEWS.INSTANCE_ROLE_VIEW, { roleSlug: 'a' }, '/settings/instance-roles/view/a'],
			[VIEWS.PROJECT_ROLES_SETTINGS, {}, '/settings/project-roles'],
			[VIEWS.PROJECT_NEW_ROLE, {}, '/settings/project-roles/new'],
			[VIEWS.PROJECT_ROLE_SETTINGS, { roleSlug: 'a' }, '/settings/project-roles/edit/a'],
		])('resolves %s to its URL', (name, params, path) => {
			expect(router.resolve({ name, params }).path).toBe(path);
		});

		it.each([
			[VIEWS.PROJECT_ROLE_VIEW],
			[VIEWS.INSTANCE_ROLE_SETTINGS],
			[VIEWS.INSTANCE_ROLE_VIEW],
			[VIEWS.PROJECT_ROLE_SETTINGS],
		])('passes the route params of %s as props', (name) => {
			expect(findRoute(router, name).props.default).toBe(true);
		});

		it.each([
			['/settings/instance-roles', 'instance'],
			['/settings/project-roles', 'project'],
		])(
			'redirects %s to the %s tab of the roles page',
			async (path, tab) => {
				await router.push(path);

				expect(router.currentRoute.value.name).toBe(VIEWS.ROLES_SETTINGS);
				expect(router.currentRoute.value.query.tab).toBe(tab);
			},
			// The first navigation loads the roles page cold, which can take over 10 seconds in CI.
			30_000,
		);

		const RolesView = async () => (await import('./RolesView.vue')).default;
		const InstanceRoleView = async () => (await import('./instance/InstanceRoleView.vue')).default;
		const ProjectRoleView = async () => (await import('./project/ProjectRoleView.vue')).default;

		it.each([
			[VIEWS.ROLES_SETTINGS, RolesView],
			[VIEWS.PROJECT_ROLE_VIEW, ProjectRoleView],
			[VIEWS.INSTANCE_NEW_ROLE, InstanceRoleView],
			[VIEWS.INSTANCE_ROLE_SETTINGS, InstanceRoleView],
			[VIEWS.INSTANCE_ROLE_VIEW, InstanceRoleView],
			[VIEWS.PROJECT_NEW_ROLE, ProjectRoleView],
			[VIEWS.PROJECT_ROLE_SETTINGS, ProjectRoleView],
		])('loads the view of %s lazily', async (name, expected) => {
			expect(await loadView(findRoute(router, name))).toBe(await expected());
		});

		it('keeps the access checks of the routes', () => {
			expect(findRoute(router, VIEWS.ROLES_SETTINGS).meta).toMatchObject({
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: { rbac: { scope: ['role:manage', 'role:manageProject'] } },
			});
			expect(findRoute(router, VIEWS.PROJECT_ROLE_VIEW).meta).toMatchObject({
				middleware: ['authenticated', 'enterprise'],
				middlewareOptions: { enterprise: { feature: 'customRoles' } },
			});
			// A child record inherits the meta of its parent: vue-router merges `matched`.
			expect(router.resolve({ name: VIEWS.INSTANCE_NEW_ROLE }).meta).toMatchObject({
				middleware: ['authenticated', 'enterprise', 'rbac'],
				middlewareOptions: {
					enterprise: { feature: 'customRoles' },
					rbac: { scope: ['role:manage'] },
				},
			});
			expect(router.resolve({ name: VIEWS.PROJECT_NEW_ROLE }).meta).toMatchObject({
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: { rbac: { scope: ['role:manage', 'role:manageProject'] } },
			});
		});
	});
});
