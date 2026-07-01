import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiView from '../InstanceAiView.vue';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { INSTANCE_AI_VIEW } from '../constants';

const routerPush = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({ params: { threadId: 'thread-1' } }),
	useRouter: () => ({ push: routerPush }),
	onBeforeRouteLeave: vi.fn(),
	RouterView: { template: '<div data-test-id="router-view-stub" />' },
}));

vi.mock('@n8n/composables/useDeviceSupport', () => ({
	useDeviceSupport: () => ({
		isCtrlKeyPressed: (event: KeyboardEvent) => event.ctrlKey || event.metaKey,
	}),
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
	beforeEach(() => {
		const pinia = createTestingPinia();
		const settingsStore = useInstanceAiSettingsStore();
		settingsStore.refreshModuleSettings = vi.fn().mockResolvedValue(undefined);
		settingsStore.ensurePreferencesLoaded = vi.fn().mockResolvedValue(undefined);
		routerPush.mockClear();

		renderView({ pinia });
	});

	it('opens a new thread with Ctrl/Cmd+Shift+O', () => {
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
});
