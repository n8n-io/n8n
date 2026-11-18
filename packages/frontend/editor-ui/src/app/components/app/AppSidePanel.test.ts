import { createTestingPinia } from '@pinia/testing';
import { UI_EXTENSIONS_HOST_KEY, type UiExtensionsHost } from '@n8n/frontend-module-ui-extensions';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { fireEvent } from '@testing-library/vue';
import { defineComponent, nextTick, ref, shallowRef } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import AppSidePanel from './AppSidePanel.vue';

const pushConnect = vi.fn();
const pushDisconnect = vi.fn();

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn(() => ({
		pushConnect,
		pushDisconnect,
		addEventListener: vi.fn(() => () => {}),
	})),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useRoute: () => ({ params: {}, query: {}, meta: {}, name: 'SettingsPersonalView' }),
}));

function createHost(): UiExtensionsHost {
	return {
		runtime: shallowRef(null),
		locale: ref('en'),
		useOverviewData: vi.fn(),
		open: vi.fn(),
		loadRuntime: vi.fn(),
	};
}

const renderComponent = createComponentRenderer(AppSidePanel, {
	global: { stubs: { SidePanel: true } },
});

/** Renders the shell with a panel that sends one `open` event, as the module does for a built-in view. */
async function openFromView(target: unknown, host: UiExtensionsHost) {
	const SidePanel = defineComponent({
		name: 'SidePanel',
		emits: ['open'],
		setup: () => ({ target }),
		template: '<button data-test-id="open" @click="$emit(\'open\', target)" />',
	});
	const { getByTestId } = createComponentRenderer(AppSidePanel, {
		global: { stubs: { SidePanel }, provide: { [UI_EXTENSIONS_HOST_KEY as symbol]: host } },
	})();
	await fireEvent.click(getByTestId('open'));
}

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

	it('loads the runtime through the host and passes its open requests on', async () => {
		const host = createHost();
		const target = { kind: 'workflow', workflowId: 'wf-1' };

		await openFromView(target, host);

		expect(host.loadRuntime).toHaveBeenCalledOnce();
		expect(host.open).toHaveBeenCalledExactlyOnceWith(target);
	});
});
