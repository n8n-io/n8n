import { createPinia, setActivePinia } from 'pinia';
import { Response } from 'miragejs';
import { createComponentRenderer } from '@/__tests__/render';
import router, { routes } from '@/app/router';
import { VIEWS } from '@/app/constants';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { RESOURCE_CENTER_EXPERIMENT } from '@/app/constants/experiments';
import { setupServer } from '@/__tests__/server';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { get } from '@n8n/rest-api-client';
import { useSessionExpiryStore } from '@/app/stores/sessionExpiry.store';
import type { Scope } from '@n8n/permissions';
import type { RouteRecordName } from 'vue-router';
import type { MockInstance } from 'vitest';
import * as init from '@/app/init';
import { middleware } from '@/app/utils/rbac/middleware';

const App = {
	template: '<div />',
};
const renderComponent = createComponentRenderer(App);

let settingsStore: ReturnType<typeof useSettingsStore>;

describe('router', () => {
	let server: ReturnType<typeof setupServer>;
	// `restoreMocks` restores this spy before each test, so it is re-created in beforeEach.
	let initializeAuthenticatedFeaturesSpy: MockInstance;

	beforeAll(async () => {
		server = setupServer();

		const pinia = createPinia();
		setActivePinia(pinia);

		renderComponent({ pinia });
	});

	beforeEach(async () => {
		settingsStore = useSettingsStore();
		settingsStore.settings.aiGateway = undefined;
		const usersStore = useUsersStore();
		initializeAuthenticatedFeaturesSpy = vi
			.spyOn(init, 'initializeAuthenticatedFeatures')
			.mockImplementation(async () => {
				await usersStore.initialize();
			});
		// Reset to a neutral route (an id no test targets) so each test's push is a
		// real navigation that triggers the guard. `restoreMocks` clears call history
		// per test, so a duplicate navigation (e.g. the '/' → '/workflows' redirect
		// leaving us at '/workflows') would otherwise record zero calls and fail the
		// toHaveBeenCalled assertion.
		await router.replace('/workflow/router-test-reset');
		initializeAuthenticatedFeaturesSpy.mockClear();
	}, 20000);

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

	test.each<[string, RouteRecordName, boolean, boolean]>([
		['/settings/ai', VIEWS.WORKFLOWS, false, false],
		['/settings/ai', VIEWS.AI_SETTINGS, true, false],
		// The page also governs AI Builder data sharing, so the Builder alone must reach it.
		['/settings/ai', VIEWS.AI_SETTINGS, false, true],
	])(
		'should resolve %s to %s when assistant is %s and builder is %s',
		async (path, name, assistantEnabled, builderEnabled) => {
			const rbacStore = useRBACStore();
			rbacStore.setGlobalScopes(['aiAssistant:manage']);

			settingsStore.settings.aiAssistant = { enabled: assistantEnabled, setup: assistantEnabled };
			settingsStore.settings.aiBuilder = { enabled: builderEnabled, setup: builderEnabled };

			await router.push(path);
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

	const gitConnectionScopes: Scope[] = [
		'gitConnection:list',
		'gitConnection:read',
		'gitConnection:create',
		'gitConnection:update',
		'gitConnection:delete',
	];

	test.each<[string, RouteRecordName, Scope[], boolean, boolean]>([
		['/settings/git-connections', VIEWS.WORKFLOWS, [], true, true],
		['/settings/git-connections', VIEWS.WORKFLOWS, ['gitConnection:list'], true, true],
		['/settings/git-connections', VIEWS.GIT_CONNECTIONS_SETTINGS, gitConnectionScopes, true, true],
		['/settings/git-connections', VIEWS.WORKFLOWS, gitConnectionScopes, false, true],
		['/settings/git-connections', VIEWS.WORKFLOWS, gitConnectionScopes, true, false],
	])(
		'should resolve %s to %s with %s permissions, module active %s and flag on %s (git connections)',
		async (path, name, scopes, isModuleActive, isFlagOn) => {
			const rbacStore = useRBACStore();

			settingsStore.settings.activeModules = isModuleActive ? ['git-connections'] : [];
			settingsStore.settings.envFeatureFlags = {
				N8N_ENV_FEAT_PROMOTIONS: isFlagOn ? 'true' : 'false',
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

	test('should block Gateway credits settings for Cloud UBB', async () => {
		settingsStore.settings.aiGateway = { enabled: true, budget: 0, cloudUbbEnabled: true };

		await router.push('/settings/gateway-credits');

		expect(router.currentRoute.value.name).toBe(VIEWS.WORKFLOWS);
	});

	test('should redirect the old n8n-connect settings path to Gateway credits settings', async () => {
		settingsStore.settings.aiGateway = { enabled: true, budget: 0, cloudUbbEnabled: false };

		await router.push('/settings/n8n-connect');

		expect(router.currentRoute.value.name).toBe(VIEWS.AI_GATEWAY_SETTINGS);
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
			setupCompleted: true,
			localGatewayDisabled: false,
			browserUseEnabled: true,
			proxyEnabled: false,
			cloudManaged: false,
			sandboxEnabled: true,
			workflowBuilderAvailable: true,
			sandboxUnavailableReason: null,
			runDebugEnabled: false,
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

	describe('roles settings', () => {
		beforeEach(async () => {
			useRBACStore().setGlobalScopes(['role:manage']);
			// Reset to a neutral route so each push re-triggers the guard.
			await router.push('/workflows');
		});

		test('redirects /settings/project-roles to the Roles shell (project tab)', async () => {
			await router.push('/settings/project-roles');

			expect(router.currentRoute.value.name).toBe(VIEWS.ROLES_SETTINGS);
			expect(router.currentRoute.value.query.tab).toBe('project');
		});

		test('redirects /settings/instance-roles to the Roles shell (instance tab)', async () => {
			await router.push('/settings/instance-roles');

			expect(router.currentRoute.value.name).toBe(VIEWS.ROLES_SETTINGS);
			expect(router.currentRoute.value.query.tab).toBe('instance');
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

	// Kept last and self-contained: it logs the shared `currentUser` out for real
	// and flips session-expiry store state that every other test in this file
	// implicitly relies on staying logged in, so it restores both in its own
	// `afterEach` rather than depending on file/test order.
	describe('session-expiry redirect (registered on rest-api-client, see router.ts)', () => {
		afterEach(async () => {
			useSessionExpiryStore().handled = false;
			useNotificationsStore().setNotificationsSuppressed(false);
			window.preventNodeViewBeforeUnload = undefined;
			await useUsersStore().initialize();
			await router.replace('/workflow/router-test-reset');
		});

		// The actual `window.location.href` assignment isn't asserted on here: jsdom doesn't
		// implement real navigation, and swapping out `window.location` to spy on it breaks the
		// (also real, jsdom-hosted) HTTP request this test drives, since the mocked object lacks
		// the properties the request layer needs to resolve a relative baseURL. Asserting on
		// `router.resolve` (the same call the redirect makes to build its href) and on
		// `preventNodeViewBeforeUnload` (set immediately before the redirect) verifies the same
		// behavior without touching the real `window.location`.
		test('reloads to sign-in when a REST call to the app backend comes back 401', async () => {
			const rootStore = useRootStore();
			server.get('/rest/__test_401__', () => new Response(401, {}, { message: 'Unauthorized' }));
			const resolveSpy = vi.spyOn(router, 'resolve');

			await expect(get(rootStore.restApiContext.baseUrl, '/__test_401__')).rejects.toThrow();

			await vi.waitFor(() => {
				expect(window.preventNodeViewBeforeUnload).toBe(true);
			});

			expect(resolveSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					name: VIEWS.SIGNIN,
					query: expect.objectContaining({ sessionExpired: 'true' }),
				}),
			);
		});
	});

	describe('error thrown during authenticated-features init', () => {
		afterEach(async () => {
			await router.replace('/workflow/router-test-reset');
		});

		test('still settles the navigation and runs the normal permission checks, instead of leaving it unresolved', async () => {
			// The mock skips real authentication, so the guard redirects to sign-in.
			initializeAuthenticatedFeaturesSpy.mockRejectedValue(new Error('CAT-4040: boom'));

			await expect(router.push('/workflows')).resolves.toBeUndefined();
			expect(router.currentRoute.value.name).toBe(VIEWS.SIGNIN);
		}, 20000);
	});

	describe('error thrown from a route middleware', () => {
		afterEach(async () => {
			await router.replace('/workflow/router-test-reset');
		});

		test("redirects to sign-in instead of authorizing the route the check didn't complete for", async () => {
			vi.spyOn(middleware, 'authenticated').mockImplementation(() => {
				throw new Error('boom');
			});

			await expect(router.push('/workflows')).resolves.toBeUndefined();
			expect(router.currentRoute.value.name).toBe(VIEWS.SIGNIN);
		}, 20000);
	});
});
