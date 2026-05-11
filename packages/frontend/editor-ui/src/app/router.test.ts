import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import router, { routes } from '@/app/router';
import { VIEWS } from '@/app/constants';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { RESOURCE_CENTER_EXPERIMENT } from '@/app/constants/experiments';
import { setupServer } from '@/__tests__/server';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useRBACStore } from '@/app/stores/rbac.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { Scope } from '@n8n/permissions';
import type { RouteRecordName } from 'vue-router';
import * as init from '@/app/init';

const App = {
	template: '<div />',
};
const renderComponent = createComponentRenderer(App);

let settingsStore: ReturnType<typeof useSettingsStore>;

describe('router', () => {
	let server: ReturnType<typeof setupServer>;
	const initializeAuthenticatedFeaturesSpy = vi.spyOn(init, 'initializeAuthenticatedFeatures');

	beforeAll(async () => {
		server = setupServer();

		const pinia = createPinia();
		setActivePinia(pinia);

		renderComponent({ pinia });
	});

	beforeEach(() => {
		settingsStore = useSettingsStore();
		const usersStore = useUsersStore();
		initializeAuthenticatedFeaturesSpy.mockImplementation(async () => {
			await usersStore.initialize();
		});
	});

	afterAll(() => {
		server.shutdown();
		vi.restoreAllMocks();
	});

	test.each([
		['/', VIEWS.WORKFLOWS],
		['/workflows', VIEWS.WORKFLOWS],
		// /workflow and /workflow/new now redirect to VIEWS.WORKFLOW with a generated ID
		['/workflow', VIEWS.WORKFLOW],
		['/workflow/new', VIEWS.WORKFLOW],
		['/workflow/R9JFXwkUCL1jZBuw', VIEWS.WORKFLOW],
		['/workflow/R9JFXwkUCL1jZBuw/myNodeId', VIEWS.WORKFLOW],
		['/workflow/R9JFXwkUCL1jZBuw/398-1ewq213', VIEWS.WORKFLOW],
		['/workflow/R9JFXwkUCL1jZBuw/executions/29021', VIEWS.EXECUTION_PREVIEW],
		['/workflows/templates/R9JFXwkUCL1jZBuw', VIEWS.TEMPLATE_IMPORT],
		['/workflows/demo', VIEWS.DEMO],
	])(
		'should resolve %s to %s',
		async (path, name) => {
			await router.push(path);
			expect(initializeAuthenticatedFeaturesSpy).toHaveBeenCalled();
			expect(router.currentRoute.value.name).toBe(name);
		},
		20000,
	);

	test.each([['/workflow/R9JFXwkUCL1jZBuw/debug/29021', VIEWS.WORKFLOWS]])(
		'should redirect %s to %s if user does not have permissions',
		async (path, name) => {
			await router.push(path);
			expect(initializeAuthenticatedFeaturesSpy).toHaveBeenCalled();
			expect(router.currentRoute.value.name).toBe(name);
		},
		20000,
	);

	test.each([['/workflow/R9JFXwkUCL1jZBuw/debug/29021', VIEWS.EXECUTION_DEBUG]])(
		'should resolve %s to %s if user has permissions',
		async (path, name) => {
			const settingsStore = useSettingsStore();

			settingsStore.settings.enterprise.debugInEditor = true;

			await router.push(path);
			expect(initializeAuthenticatedFeaturesSpy).toHaveBeenCalled();
			expect(router.currentRoute.value.name).toBe(name);
		},
		20000,
	);

	test.each([
		['/workflow/8IFYawZ9dKqJu8sT/history', VIEWS.WORKFLOW_HISTORY],
		['/workflow/8IFYawZ9dKqJu8sT/history/6513ed960252b846f3792f0c', VIEWS.WORKFLOW_HISTORY],
	])(
		'should resolve %s to %s (available to all users)',
		async (path, name) => {
			await router.push(path);
			expect(initializeAuthenticatedFeaturesSpy).toHaveBeenCalled();
			expect(router.currentRoute.value.name).toBe(name);
		},
		20000,
	);

	test.each<[string, RouteRecordName, Scope[]]>([
		['/settings/users', VIEWS.WORKFLOWS, []],
		['/settings/users', VIEWS.USERS_SETTINGS, ['user:create', 'user:update']],
		['/settings/environments', VIEWS.WORKFLOWS, []],
		['/settings/environments', VIEWS.SOURCE_CONTROL, ['sourceControl:manage']],
		['/settings/external-secrets', VIEWS.WORKFLOWS, []],
		[
			'/settings/external-secrets',
			VIEWS.EXTERNAL_SECRETS_SETTINGS,
			['externalSecretsProvider:list', 'externalSecretsProvider:update'],
		],
		['/settings/sso', VIEWS.WORKFLOWS, []],
		['/settings/sso', VIEWS.SSO_SETTINGS, ['saml:manage']],
		['/settings/log-streaming', VIEWS.WORKFLOWS, []],
		['/settings/log-streaming', VIEWS.LOG_STREAMING_SETTINGS, ['logStreaming:manage']],
		['/settings/community-nodes', VIEWS.WORKFLOWS, []],
		[
			'/settings/community-nodes',
			VIEWS.COMMUNITY_NODES,
			['communityPackage:list', 'communityPackage:update'],
		],
		['/settings/ldap', VIEWS.WORKFLOWS, []],
		['/settings/ldap', VIEWS.LDAP_SETTINGS, ['ldap:manage']],
		['/settings/security', VIEWS.WORKFLOWS, []],
		['/settings/security', VIEWS.SECURITY_SETTINGS, ['securitySettings:manage']],
	])(
		'should resolve %s to %s with %s user permissions',
		async (path, name, scopes) => {
			const rbacStore = useRBACStore();

			settingsStore.settings.communityNodesEnabled = true;
			rbacStore.setGlobalScopes(scopes);

			await router.push(path);
			expect(initializeAuthenticatedFeaturesSpy).toHaveBeenCalled();
			expect(router.currentRoute.value.name).toBe(name);
		},
		20000,
	);

	test.each<[string, RouteRecordName, Scope[]]>([
		['/settings/resolvers', VIEWS.WORKFLOWS, []],
		[
			'/settings/resolvers',
			VIEWS.WORKFLOWS,
			['credentialResolver:read', 'credentialResolver:list'],
		],
		[
			'/settings/resolvers',
			VIEWS.RESOLVERS,
			[
				'credentialResolver:read',
				'credentialResolver:list',
				'credentialResolver:create',
				'credentialResolver:update',
				'credentialResolver:delete',
			],
		],
	])(
		'should resolve %s to %s with %s user permissions (resolvers)',
		async (path, name, scopes) => {
			const rbacStore = useRBACStore();

			settingsStore.settings.activeModules = ['dynamic-credentials'];
			settingsStore.settings.envFeatureFlags = {
				N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
			} as typeof settingsStore.settings.envFeatureFlags;
			rbacStore.setGlobalScopes(scopes);

			await router.push(path);
			expect(initializeAuthenticatedFeaturesSpy).toHaveBeenCalled();
			expect(router.currentRoute.value.name).toBe(name);
		},
		20000,
	);

	test.each([
		[VIEWS.PERSONAL_SETTINGS, true],
		[VIEWS.USAGE, false],
	])('should redirect Settings to %s', async (name, hideUsagePage) => {
		settingsStore.settings.hideUsagePage = hideUsagePage;
		await router.push('/settings');
		expect(router.currentRoute.value.name).toBe(name);
	});

	describe('resource center route guard', () => {
		beforeEach(async () => {
			// Reset to a neutral route so each test's push('/resource-center')
			// triggers the guard instead of being dropped as a duplicate navigation.
			await router.push('/workflows');
		});

		afterEach(() => {
			const posthog = usePostHog();
			delete posthog.overrides[RESOURCE_CENTER_EXPERIMENT.name];
		});

		test('allows enrolled users to reach the resource center view', async () => {
			const posthog = usePostHog();
			posthog.overrides[RESOURCE_CENTER_EXPERIMENT.name] = RESOURCE_CENTER_EXPERIMENT.variant;

			await router.push('/resource-center');
			expect(router.currentRoute.value.name).toBe(VIEWS.RESOURCE_CENTER);
		});

		test('redirects control users away from the resource center view', async () => {
			const posthog = usePostHog();
			posthog.overrides[RESOURCE_CENTER_EXPERIMENT.name] = RESOURCE_CENTER_EXPERIMENT.control;

			await router.push('/resource-center');
			expect(router.currentRoute.value.name).toBe(VIEWS.WORKFLOWS);
		});

		test('redirects users with no flag away from the resource center view', async () => {
			await router.push('/resource-center');
			expect(router.currentRoute.value.name).toBe(VIEWS.WORKFLOWS);
		});

		test('waits for delayed flag hydration before allowing enrolled users through', async () => {
			const posthog = usePostHog();
			const hasPendingFeatureFlagsSpy = vi
				.spyOn(posthog, 'hasPendingFeatureFlags')
				.mockReturnValue(true);
			const waitForFeatureFlagsSpy = vi
				.spyOn(posthog, 'waitForFeatureFlags')
				.mockImplementation(async () => {
					posthog.overrides[RESOURCE_CENTER_EXPERIMENT.name] = RESOURCE_CENTER_EXPERIMENT.variant;
					return null;
				});

			try {
				await router.push('/resource-center');

				expect(waitForFeatureFlagsSpy).toHaveBeenCalledTimes(1);
				expect(router.currentRoute.value.name).toBe(VIEWS.RESOURCE_CENTER);
			} finally {
				waitForFeatureFlagsSpy.mockRestore();
				hasPendingFeatureFlagsSpy.mockRestore();
			}
		});
	});

	describe('root / redirect', () => {
		// The instance-ai route is registered dynamically by its module, so we can't
		// drive this through `router.push('/')` in the unit test environment.
		// Drive the `/` route's beforeEnter directly with a captured `next` instead.
		const instanceAiModuleSettings = {
			enabled: true,
			localGatewayDisabled: false,
			proxyEnabled: false,
			cloudManaged: false,
		};

		const runRootRedirect = () => {
			const rootRoute = routes.find((r) => r.path === '/');
			const beforeEnter = rootRoute?.beforeEnter;
			if (typeof beforeEnter !== 'function') {
				throw new Error('Expected `/` route to define a beforeEnter guard');
			}
			let nextArg: unknown;
			const next = ((arg?: unknown) => {
				nextArg = arg;
			}) as Parameters<typeof beforeEnter>[2];
			beforeEnter.call(
				undefined,
				{} as Parameters<typeof beforeEnter>[0],
				{} as Parameters<typeof beforeEnter>[1],
				next,
			);
			return nextArg;
		};

		beforeEach(() => {
			settingsStore.settings.activeModules = [];
			settingsStore.moduleSettings = {};
			useRBACStore().setGlobalScopes([]);
		});

		test('redirects to /instance-ai when module is active, enabled, and user has instanceAi:message', () => {
			settingsStore.settings.activeModules = ['instance-ai'];
			settingsStore.moduleSettings = { 'instance-ai': { ...instanceAiModuleSettings } };
			useRBACStore().setGlobalScopes(['instanceAi:message']);

			expect(runRootRedirect()).toEqual({ name: INSTANCE_AI_VIEW });
		});

		test('falls back to /home/workflows when admin has disabled the module', () => {
			settingsStore.settings.activeModules = ['instance-ai'];
			settingsStore.moduleSettings = {
				'instance-ai': { ...instanceAiModuleSettings, enabled: false },
			};
			useRBACStore().setGlobalScopes(['instanceAi:message']);

			expect(runRootRedirect()).toBe('/home/workflows');
		});

		test('falls back to /home/workflows when user lacks instanceAi:message scope', () => {
			settingsStore.settings.activeModules = ['instance-ai'];
			settingsStore.moduleSettings = { 'instance-ai': { ...instanceAiModuleSettings } };
			useRBACStore().setGlobalScopes([]);

			expect(runRootRedirect()).toBe('/home/workflows');
		});

		test('falls back to /home/workflows when the module is not active', () => {
			useRBACStore().setGlobalScopes(['instanceAi:message']);

			expect(runRootRedirect()).toBe('/home/workflows');
		});
	});

	test('should set props: true for PROJECT_ROLE_SETTINGS route', () => {
		const settingsRoute = routes.find((route) => route.path === '/settings');
		const projectRolesRoute = settingsRoute?.children?.find(
			(child) => child.path === 'project-roles',
		);
		const editRoleRoute = projectRolesRoute?.children?.find(
			(child) => child.name === VIEWS.PROJECT_ROLE_SETTINGS,
		);
		expect(editRoleRoute?.props).toBe(true);
		expect(editRoleRoute?.path).toBe('edit/:roleSlug');
	});
});
