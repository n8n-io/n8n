import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import router from '@/router';
import { VIEWS } from '@/constants';
import { setupServer } from '@/__tests__/server';
import { useSettingsStore } from '@/stores/settings.store';
import { useRBACStore } from '@/stores/rbac.store';
import type { Scope } from '@n8n/permissions';
import type { RouteRecordName } from 'vue-router';
import * as init from '@/init';

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
		initializeAuthenticatedFeaturesSpy.mockImplementation(async () => await Promise.resolve());
	});

	afterAll(() => {
		server.shutdown();
		vi.restoreAllMocks();
	});

	test.each([
		['/', VIEWS.WORKFLOWS],
		['/workflows', VIEWS.WORKFLOWS],
		['/workflow', VIEWS.NEW_WORKFLOW],
		['/workflow/new', VIEWS.NEW_WORKFLOW],
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
		10000,
	);

	test.each([
		['/workflow/R9JFXwkUCL1jZBuw/debug/29021', VIEWS.WORKFLOWS],
		['/workflow/8IFYawZ9dKqJu8sT/history', VIEWS.WORKFLOWS],
		['/workflow/8IFYawZ9dKqJu8sT/history/6513ed960252b846f3792f0c', VIEWS.WORKFLOWS],
	])(
		'should redirect %s to %s if user does not have permissions',
		async (path, name) => {
			await router.push(path);
			expect(initializeAuthenticatedFeaturesSpy).toHaveBeenCalled();
			expect(router.currentRoute.value.name).toBe(name);
		},
		10000,
	);

	test.each([
		['/workflow/R9JFXwkUCL1jZBuw/debug/29021', VIEWS.EXECUTION_DEBUG],
		['/workflow/8IFYawZ9dKqJu8sT/history', VIEWS.WORKFLOW_HISTORY],
		['/workflow/8IFYawZ9dKqJu8sT/history/6513ed960252b846f3792f0c', VIEWS.WORKFLOW_HISTORY],
	])(
		'should resolve %s to %s if user has permissions',
		async (path, name) => {
			const settingsStore = useSettingsStore();

			settingsStore.settings.enterprise.debugInEditor = true;
			settingsStore.settings.enterprise.workflowHistory = true;

			await router.push(path);
			expect(initializeAuthenticatedFeaturesSpy).toHaveBeenCalled();
			expect(router.currentRoute.value.name).toBe(name);
		},
		10000,
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
		10000,
	);

	test.each([
		[VIEWS.PERSONAL_SETTINGS, true],
		[VIEWS.USAGE, false],
	])('should redirect Settings to %s', async (name, hideUsagePage) => {
		settingsStore.settings.hideUsagePage = hideUsagePage;
		await router.push('/settings');
		expect(router.currentRoute.value.name).toBe(name);
	});
});
