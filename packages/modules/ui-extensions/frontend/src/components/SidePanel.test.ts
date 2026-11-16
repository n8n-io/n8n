import type { UiExtensionPageContext } from '@n8n/api-types';
import { fireEvent, render } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import * as api from '../ui-extensions.api';
import { useSidePanelStore } from '../ui-extensions.store';
import SidePanel from './SidePanel.vue';

vi.mock('../ui-extensions.api');

const pageContext: UiExtensionPageContext = { page: 'other', routeName: 'SettingsPersonalView' };

const panelData = { state: 'loading', runs: null, services: null } as const;

function renderPanel(props: Record<string, unknown> = {}) {
	return render(SidePanel, {
		props: {
			pageContext,
			workflowAvailableInMcp: false,
			runtime: { js: '', css: '' },
			panelData,
			locale: 'en',
			...props,
		},
	});
}

beforeEach(() => {
	localStorage.clear();
	vi.mocked(api.fetchUiExtensionViews).mockReset().mockResolvedValue([]);
});

describe('SidePanel', () => {
	it('shows only the toggle while closed', () => {
		const { getByTestId, queryByTestId } = renderPanel();

		expect(getByTestId('ui-extensions-side-panel-toggle')).toBeTruthy();
		expect(queryByTestId('ui-extensions-side-panel-content')).toBeNull();
	});

	it('opens with one tab per view and the active view in a frame', async () => {
		vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([
			{ id: 'view-1', title: 'Stats', source: 'x', updatedAt: '2026-01-01T00:00:00.000Z' },
		]);
		const { getByTestId, findByTestId, getByText } = renderPanel();
		await flushPromises();

		await fireEvent.click(getByTestId('ui-extensions-side-panel-toggle'));

		expect(await findByTestId('ui-extensions-side-panel-content')).toBeTruthy();
		expect(getByText('Recent runs')).toBeTruthy();
		expect(getByText('Service data')).toBeTruthy();
		expect(getByText('Stats')).toBeTruthy();
		expect(getByTestId('ui-extensions-view-frame').getAttribute('title')).toBe('Recent runs');
	});

	it('loads the views on mount and again when the window gets focus', async () => {
		renderPanel();
		await flushPromises();
		expect(api.fetchUiExtensionViews).toHaveBeenCalledTimes(1);

		window.dispatchEvent(new Event('focus'));
		await flushPromises();

		expect(api.fetchUiExtensionViews).toHaveBeenCalledTimes(2);
	});

	it('stops listening for focus after unmount', async () => {
		const { unmount } = renderPanel();
		await flushPromises();
		unmount();

		window.dispatchEvent(new Event('focus'));
		await flushPromises();

		expect(api.fetchUiExtensionViews).toHaveBeenCalledTimes(1);
	});

	it('shows no frame until the runtime is loaded', async () => {
		useSidePanelStore().isOpen = true;
		const { queryByTestId, findByTestId } = renderPanel({ runtime: null });

		expect(await findByTestId('ui-extensions-side-panel-content')).toBeTruthy();
		expect(queryByTestId('ui-extensions-view-frame')).toBeNull();
	});

	it('asks for data only while it is open on a built-in view that shows it', async () => {
		vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([
			{ id: 'view-1', title: 'Stats', source: 'x', updatedAt: '2026-01-01T00:00:00.000Z' },
		]);
		const { emitted, getByTestId } = renderPanel();
		await flushPromises();
		const store = useSidePanelStore();
		const dataEnabled = () => emitted<[boolean]>('update:dataEnabled')?.at(-1)?.[0] ?? false;

		expect(dataEnabled()).toBe(false);

		await fireEvent.click(getByTestId('ui-extensions-side-panel-toggle'));
		expect(dataEnabled()).toBe(true);

		store.activeViewId = 'builtin:service-data';
		await flushPromises();
		expect(dataEnabled()).toBe(true);

		// The game shows no run data, so the editor stops fetching it.
		store.activeViewId = 'builtin:arcade';
		await flushPromises();
		expect(dataEnabled()).toBe(false);

		store.activeViewId = 'builtin:service-data';
		await flushPromises();
		expect(dataEnabled()).toBe(true);

		store.activeViewId = 'view-1';
		await flushPromises();
		expect(dataEnabled()).toBe(false);

		store.activeViewId = 'builtin:recent-runs';
		await flushPromises();
		expect(dataEnabled()).toBe(true);

		await fireEvent.click(getByTestId('ui-extensions-side-panel-toggle'));
		expect(dataEnabled()).toBe(false);
	});
});
