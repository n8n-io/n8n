import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { GLOBAL_MEMBER_SCOPES, GLOBAL_OWNER_SCOPES, type Scope } from '@n8n/permissions';
import type { FrontendModuleSettings } from '@n8n/api-types';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';
import { InstanceAiModule } from '../module.descriptor';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_SETTINGS_VIEW } from '../constants';

vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => ref(true),
	useInstanceAiReady: () => ref(true),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

const stub = { render: () => null };

// Swap real lazy components for a stub so navigation doesn't pull the view tree.
function withStubbedComponents(route: RouteRecordRaw): RouteRecordRaw {
	const clone = { ...route } as Record<string, unknown>;
	if (clone.component) clone.component = stub;
	if (Array.isArray(clone.children)) {
		clone.children = (clone.children as RouteRecordRaw[]).map(withStubbedComponents);
	}
	return clone as unknown as RouteRecordRaw;
}

const moduleRoutes = (InstanceAiModule.routes ?? []).map(withStubbedComponents);

// Absolute-path routes register at the top level; relative ones nest under `/settings`.
function createTestRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/home', name: VIEWS.HOMEPAGE, component: stub },
			...moduleRoutes.filter((route) => route.path.startsWith('/')),
			{
				path: '/settings',
				component: stub,
				children: moduleRoutes.filter((route) => !route.path.startsWith('/')),
			},
		],
	});
}

function setGlobalScopes(scopes: Scope[]) {
	useRBACStore().globalScopes = [...scopes];
}

const instanceAiModuleSettings: NonNullable<FrontendModuleSettings['instance-ai']> = {
	enabled: true,
	localGatewayDisabled: false,
	browserUseEnabled: true,
	proxyEnabled: false,
	cloudManaged: false,
	sandboxEnabled: true,
	workflowBuilderAvailable: true,
	sandboxUnavailableReason: null,
	runDebugEnabled: false,
};

function setAssistantEnabled(enabled: boolean) {
	useSettingsStore().moduleSettings = { 'instance-ai': { ...instanceAiModuleSettings, enabled } };
}

let posthogStore: ReturnType<typeof mockedStore<typeof usePostHog>>;

function setOpenWorkflowInAssistantTreatment(isTreatment: boolean) {
	posthogStore.isVariantEnabled.mockReturnValue(isTreatment);
}

beforeEach(() => {
	vi.clearAllMocks();
	setActivePinia(createTestingPinia({ stubActions: false }));
	posthogStore = mockedStore(usePostHog);
	setOpenWorkflowInAssistantTreatment(false);
	setGlobalScopes(GLOBAL_OWNER_SCOPES);
	setAssistantEnabled(true);
});

describe('InstanceAiModule legacy route redirects', () => {
	it('redirects /instance-ai to the /assistant view', async () => {
		const router = createTestRouter();
		await router.push('/instance-ai');

		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_VIEW);
		expect(router.currentRoute.value.path).toBe('/assistant');
	});

	it('redirects /instance-ai/:threadId preserving thread id, query and hash', async () => {
		const router = createTestRouter();
		await router.push('/instance-ai/thread-1?foo=bar#section');

		const current = router.currentRoute.value;
		expect(current.name).toBe(INSTANCE_AI_THREAD_VIEW);
		expect(current.params).toEqual({ threadId: 'thread-1' });
		expect(current.query).toEqual({ foo: 'bar' });
		expect(current.hash).toBe('#section');
		expect(current.path).toBe('/assistant/thread-1');
	});

	it('redirects /settings/instance-ai to /settings/assistant', async () => {
		const router = createTestRouter();
		await router.push('/settings/instance-ai');

		expect(router.currentRoute.value.name).toBe(INSTANCE_AI_SETTINGS_VIEW);
		expect(router.currentRoute.value.path).toBe('/settings/assistant');
	});
});

describe('InstanceAiModule settings page access', () => {
	const isSettingsPageAvailable = () => InstanceAiModule.settingsPages?.[0]?.available;

	describe('a viewer who can manage Instance AI', () => {
		it('is offered the settings page', () => {
			expect(isSettingsPageAvailable()).toBe(true);
		});

		it('reaches the settings page', async () => {
			const router = createTestRouter();
			await router.push('/settings/assistant');

			expect(router.currentRoute.value.name).toBe(INSTANCE_AI_SETTINGS_VIEW);
		});
	});

	describe('a member, for whom the page renders no sections', () => {
		beforeEach(() => {
			setGlobalScopes(GLOBAL_MEMBER_SCOPES);
		});

		it('is not offered the settings page', () => {
			expect(isSettingsPageAvailable()).toBe(false);
		});

		it('is sent to the homepage instead of a page with only a header', async () => {
			const router = createTestRouter();
			await router.push('/settings/assistant');

			expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
		});

		it('is sent to the homepage from the legacy settings path too', async () => {
			const router = createTestRouter();
			await router.push('/settings/instance-ai');

			expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
		});
	});

	// Experiment cleanup: remove with openWorkflowInAssistant.
	describe('a member in the openWorkflowInAssistant treatment', () => {
		beforeEach(() => {
			setGlobalScopes(GLOBAL_MEMBER_SCOPES);
			setOpenWorkflowInAssistantTreatment(true);
		});

		it('is offered the settings page, which holds their default editor row', () => {
			expect(isSettingsPageAvailable()).toBe(true);
		});

		it('reaches the settings page', async () => {
			const router = createTestRouter();
			await router.push('/settings/assistant');

			expect(router.currentRoute.value.name).toBe(INSTANCE_AI_SETTINGS_VIEW);
		});

		describe('while the assistant is off, which hides the row', () => {
			beforeEach(() => {
				setAssistantEnabled(false);
			});

			it('is not offered the settings page', () => {
				expect(isSettingsPageAvailable()).toBe(false);
			});

			it('is sent to the homepage', async () => {
				const router = createTestRouter();
				await router.push('/settings/assistant');

				expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
			});
		});
	});
});
