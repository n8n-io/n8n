import { createTestingPinia } from '@pinia/testing';

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
		const { unmount } = renderComponent();

		expect(pushConnect).toHaveBeenCalledOnce();
		expect(pushDisconnect).not.toHaveBeenCalled();

		unmount();

		expect(pushDisconnect).toHaveBeenCalledOnce();
	});
});
