import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiView from '../InstanceAiView.vue';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { INSTANCE_AI_VIEW } from '../constants';

const TEST_INSTANCE_ID = 'test-instance-id';

const routerPush = vi.hoisted(() => vi.fn());
const routerHistoryState = vi.hoisted(() => ({ back: null as string | null }));
const telemetryTrack = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({ params: { threadId: 'thread-1' } }),
	useRouter: () => ({ push: routerPush, options: { history: { state: routerHistoryState } } }),
	onBeforeRouteLeave: vi.fn(),
	RouterView: { template: '<div data-test-id="router-view-stub" />' },
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('@n8n/composables/useDeviceSupport', () => ({
	useDeviceSupport: () => ({
		isCtrlKeyPressed: (event: KeyboardEvent) => event.ctrlKey || event.metaKey,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ instanceId: TEST_INSTANCE_ID }),
}));

const renderView = createComponentRenderer(InstanceAiView, {
	global: {
		stubs: {
			InstanceAiThreadList: { template: '<div data-test-id="thread-list-stub" />' },
			N8nResizeWrapper: { template: '<div><slot /></div>' },
		},
	},
});

describe('InstanceAiView', () => {
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		pinia = createTestingPinia();
		const settingsStore = useInstanceAiSettingsStore();
		settingsStore.refreshModuleSettings = vi.fn().mockResolvedValue(undefined);
		settingsStore.ensurePreferencesLoaded = vi.fn().mockResolvedValue(undefined);
		routerPush.mockClear();
		telemetryTrack.mockClear();
		routerHistoryState.back = null;
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
});
