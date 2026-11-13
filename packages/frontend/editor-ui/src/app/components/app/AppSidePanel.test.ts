import { createTestingPinia } from '@pinia/testing';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { nextTick } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import AppSidePanel from './AppSidePanel.vue';

const pushConnect = vi.fn();
const pushDisconnect = vi.fn();

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn(() => ({ pushConnect, pushDisconnect })),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useRoute: () => ({ params: {}, query: {}, meta: {}, name: 'SettingsPersonalView' }),
}));

vi.mock('@n8n/ui-extension-runtime/runtime.iife.js?raw', () => ({ default: '/* runtime */' }));
vi.mock('@n8n/ui-extension-runtime/runtime.css?raw', () => ({ default: '/* css */' }));

const renderComponent = createComponentRenderer(AppSidePanel, {
	global: { stubs: { SidePanel: true } },
});

describe('AppSidePanel', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		pushConnect.mockClear();
		pushDisconnect.mockClear();
	});

	it('holds a push connection while it is mounted', () => {
		useSettingsStore().setSettings({ ...defaultSettings, pushBackend: 'websocket' });

		const { unmount } = renderComponent();

		expect(pushConnect).toHaveBeenCalledOnce();
		expect(pushDisconnect).not.toHaveBeenCalled();

		unmount();

		expect(pushDisconnect).toHaveBeenCalledOnce();
	});

	// The public settings before the login have no push backend. A connection opened then
	// uses the wrong client and never recovers.
	it('waits for the full settings before it opens the push connection', async () => {
		useSettingsStore().setSettings({ ...defaultSettings, pushBackend: undefined as never });

		renderComponent();
		expect(pushConnect).not.toHaveBeenCalled();

		useSettingsStore().setSettings({ ...defaultSettings, pushBackend: 'websocket' });
		await nextTick();
		expect(pushConnect).toHaveBeenCalledOnce();

		useSettingsStore().setSettings({ ...defaultSettings, pushBackend: 'sse' });
		await nextTick();
		expect(pushConnect).toHaveBeenCalledOnce();
	});

	it('does not disconnect a connection that it never opened', () => {
		useSettingsStore().setSettings({ ...defaultSettings, pushBackend: undefined as never });

		const { unmount } = renderComponent();
		unmount();

		expect(pushDisconnect).not.toHaveBeenCalled();
	});
});
