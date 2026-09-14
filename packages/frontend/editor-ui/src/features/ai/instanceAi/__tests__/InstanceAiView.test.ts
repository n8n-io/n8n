import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiView from '../InstanceAiView.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '../constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

const TEST_INSTANCE_ID = 'test-instance-id';

const routerPush = vi.hoisted(() => vi.fn());
const routerReplace = vi.hoisted(() => vi.fn());
const routerHistoryState = vi.hoisted(() => ({ back: null as string | null }));
const routeState = vi.hoisted(() => ({ name: '', params: { threadId: 'thread-1' } }));
const telemetryTrack = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => routeState,
	useRouter: () => ({
		push: routerPush,
		replace: routerReplace,
		options: { history: { state: routerHistoryState } },
	}),
	onBeforeRouteLeave: vi.fn(),
	RouterView: { template: '<div data-test-id="router-view-stub" />' },
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('@n8n/composables/useDeviceSupport', () => ({
	useDeviceSupport: () => ({
		isCtrlKeyPressed: (event: KeyboardEvent) => event.ctrlKey || event.metaKey,
	}),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(false),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ instanceId: TEST_INSTANCE_ID }),
}));

const InstanceAiThreadListStub = {
	emits: ['collapse', 'deleted'],
	template: `<div data-test-id="thread-list-stub">
		<button data-test-id="thread-list-delete-active" @click="$emit('deleted', true)" />
		<button data-test-id="thread-list-delete-inactive" @click="$emit('deleted', false)" />
	</div>`,
};

const renderView = createComponentRenderer(InstanceAiView, {
	global: {
		stubs: {
			InstanceAiThreadList: InstanceAiThreadListStub,
			InstanceAiOnboardingView: {
				emits: ['completed'],
				template: '<button data-test-id="onboarding-view-stub" @click="$emit(\'completed\')" />',
			},
			N8nResizeWrapper: { template: '<div><slot /></div>' },
		},
	},
});

describe('InstanceAiView', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		pinia = createTestingPinia();
		const settingsStore = useInstanceAiSettingsStore();
		settingsStore.refreshModuleSettings = vi.fn().mockResolvedValue(undefined);
		settingsStore.ensurePreferencesLoaded = vi.fn().mockResolvedValue(undefined);
		store = mockedStore(useInstanceAiStore);
		store.threads = [
			{ id: 'thread-1', title: 'First', createdAt: '2026-04-01', updatedAt: '2026-04-01' },
			{ id: 'thread-2', title: 'Second', createdAt: '2026-04-02', updatedAt: '2026-04-02' },
		] as typeof store.threads;
		vi.mocked(hasPermission).mockReturnValue(false);
		routerPush.mockClear();
		routerReplace.mockClear();
		telemetryTrack.mockClear();
		routerHistoryState.back = null;
		routeState.name = INSTANCE_AI_VIEW;
		sessionStorage.clear();
	});

	it('pushes to the next thread when the deleted thread was active', async () => {
		sessionStorage.setItem('instanceAi.sidebarCollapsed', 'false');
		const { getByTestId } = renderView({ pinia });
		// Production calls store.deleteThread, which removes thread-1, before emitting.
		store.threads = store.threads.filter((thread) => thread.id !== 'thread-1');
		await fireEvent.click(getByTestId('thread-list-delete-active'));
		expect(routerPush).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-2' },
		});
	});

	it('pushes to the empty view when the active thread was deleted and none remain', async () => {
		sessionStorage.setItem('instanceAi.sidebarCollapsed', 'false');
		store.threads = [];
		const { getByTestId } = renderView({ pinia });
		await fireEvent.click(getByTestId('thread-list-delete-active'));
		expect(routerPush).toHaveBeenCalledWith({ name: INSTANCE_AI_VIEW });
	});

	it('does not navigate when a non-active thread is deleted', async () => {
		sessionStorage.setItem('instanceAi.sidebarCollapsed', 'false');
		const { getByTestId } = renderView({ pinia });
		await fireEvent.click(getByTestId('thread-list-delete-inactive'));
		expect(routerPush).not.toHaveBeenCalled();
	});

	it('keeps the tab title off the workflow previewed inside a thread', () => {
		const { unmount } = renderView({ pinia });
		const { set, setDocumentTitle } = useDocumentTitle();
		set('My conversation');

		setDocumentTitle('Previewed workflow', 'IDLE');
		expect(document.title).toBe('My conversation - n8n');

		// Leaving the feature hands the tab title back to the workflow editor
		unmount();
		setDocumentTitle('Previewed workflow', 'IDLE');
		expect(document.title).toBe('▶️ Previewed workflow - n8n');
	});

	it('opens a new thread with Ctrl/Cmd+Shift+O', () => {
		renderView({ pinia });

		document.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'o',
				ctrlKey: true,
				shiftKey: true,
				bubbles: true,
				cancelable: true,
			}),
		);

		expect(routerPush).toHaveBeenCalledWith({ name: INSTANCE_AI_VIEW, force: true });
	});

	it('tracks "User viewed AI assistant" with the previous in-app route on mount', () => {
		routerHistoryState.back = '/workflow/abc123';

		renderView({ pinia });

		expect(telemetryTrack).toHaveBeenCalledWith('User viewed AI assistant', {
			instance_id: TEST_INSTANCE_ID,
			source_url: '/workflow/abc123',
		});
	});

	it('tracks "User viewed AI assistant" with a null source on direct visits', () => {
		routerHistoryState.back = null;

		renderView({ pinia });

		expect(telemetryTrack).toHaveBeenCalledWith('User viewed AI assistant', {
			instance_id: TEST_INSTANCE_ID,
			source_url: null,
		});
	});

	it('shows onboarding to self-managed admins and returns to chat after completion', async () => {
		vi.mocked(hasPermission).mockReturnValue(true);
		useSettingsStore().moduleSettings = {
			'instance-ai': {
				enabled: true,
				localGatewayDisabled: false,
				browserUseEnabled: true,
				proxyEnabled: false,
				cloudManaged: false,
				setupCompleted: false,
				sandboxEnabled: false,
				workflowBuilderAvailable: false,
				sandboxUnavailableReason: null,
				runDebugEnabled: false,
			},
		};
		routeState.name = 'InstanceAiThread';

		const { findByTestId, getByTestId, queryByTestId } = renderView({ pinia });

		expect(await findByTestId('onboarding-view-stub')).toBeVisible();
		expect(routerReplace).toHaveBeenCalledWith({ name: INSTANCE_AI_VIEW });
		expect(queryByTestId('router-view-stub')).toBeNull();

		await fireEvent.click(getByTestId('onboarding-view-stub'));
		expect(getByTestId('router-view-stub')).toBeVisible();
		expect(sessionStorage.getItem('instanceAi.onboarding.completionPending')).toBe('false');
	});

	it('ignores a stale onboarding session after setup completes in Settings', () => {
		vi.mocked(hasPermission).mockReturnValue(true);
		sessionStorage.setItem('instanceAi.onboarding.completionPending', 'true');
		useSettingsStore().moduleSettings = {
			'instance-ai': {
				enabled: true,
				localGatewayDisabled: false,
				browserUseEnabled: true,
				proxyEnabled: false,
				cloudManaged: false,
				setupCompleted: true,
				sandboxEnabled: true,
				workflowBuilderAvailable: true,
				sandboxUnavailableReason: null,
				runDebugEnabled: false,
			},
		};

		const { getByTestId, queryByTestId } = renderView({ pinia });

		expect(queryByTestId('onboarding-view-stub')).toBeNull();
		expect(getByTestId('router-view-stub')).toBeVisible();
		expect(sessionStorage.getItem('instanceAi.onboarding.completionPending')).toBe('false');
	});

	it('keeps the active wizard open when its final save completes setup', async () => {
		vi.mocked(hasPermission).mockReturnValue(true);
		const appSettingsStore = useSettingsStore();
		appSettingsStore.moduleSettings = {
			'instance-ai': {
				enabled: true,
				localGatewayDisabled: false,
				browserUseEnabled: true,
				proxyEnabled: false,
				cloudManaged: false,
				setupCompleted: false,
				sandboxEnabled: true,
				workflowBuilderAvailable: true,
				sandboxUnavailableReason: null,
				runDebugEnabled: false,
			},
		};
		const { getByTestId, queryByTestId } = renderView({ pinia });

		appSettingsStore.moduleSettings = {
			'instance-ai': { ...appSettingsStore.moduleSettings['instance-ai']!, setupCompleted: true },
		};

		await waitFor(() => expect(getByTestId('onboarding-view-stub')).toBeVisible());
		expect(queryByTestId('router-view-stub')).toBeNull();
	});
});
