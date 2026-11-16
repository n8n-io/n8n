import { createTestingPinia } from '@pinia/testing';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { fireEvent } from '@testing-library/vue';
import { defineComponent, nextTick } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';

import AppSidePanel from './AppSidePanel.vue';

const pushConnect = vi.fn();
const pushDisconnect = vi.fn();
const push = vi.fn();

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
	useRouter: () => ({ push }),
}));

vi.mock('@n8n/ui-extension-runtime/runtime.iife.js?raw', () => ({ default: '/* runtime */' }));
vi.mock('@n8n/ui-extension-runtime/runtime.css?raw', () => ({ default: '/* css */' }));

const renderComponent = createComponentRenderer(AppSidePanel, {
	global: { stubs: { SidePanel: true } },
});

/** Renders the shell with a panel that sends one `open` event, as the module does for a built-in view. */
async function openFromView(target: unknown) {
	const SidePanel = defineComponent({
		name: 'SidePanel',
		emits: ['open'],
		setup: () => ({ target }),
		template: '<button data-test-id="open" @click="$emit(\'open\', target)" />',
	});
	const { getByTestId } = createComponentRenderer(AppSidePanel, {
		global: { stubs: { SidePanel } },
	})();
	await fireEvent.click(getByTestId('open'));
}

describe('AppSidePanel', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		pushConnect.mockClear();
		pushDisconnect.mockClear();
		push.mockClear();
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

	it('opens a run in the executions view', async () => {
		await openFromView({ kind: 'execution', workflowId: 'wf-1', executionId: '7' });

		expect(push).toHaveBeenCalledWith({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { workflowId: 'wf-1', executionId: '7' },
		});
	});

	it('opens an http(s) URL in a new tab without access to the editor', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);

		await openFromView({ kind: 'url', url: 'https://example.slack.com/archives/C123' });

		expect(open).toHaveBeenCalledWith(
			'https://example.slack.com/archives/C123',
			'_blank',
			'noopener,noreferrer',
		);
		open.mockRestore();
	});

	it('does not open a URL that is not http(s)', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);

		await openFromView({ kind: 'url', url: 'javascript:alert(1)' });

		expect(open).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
		open.mockRestore();
	});
});
