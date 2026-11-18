import type { UiExtensionPageContext } from '@n8n/api-types';
import { fireEvent, render } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import * as api from '../ui-extensions.api';
import { useSidePanelStore } from '../ui-extensions.store';
import SidePanel from './SidePanel.vue';

vi.mock('../ui-extensions.api');

const { confirm, showMessage, showError } = vi.hoisted(() => ({
	confirm: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	useMessage: () => ({ confirm }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage, showError }) }));

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
	vi.clearAllMocks();
	vi.mocked(api.fetchUiExtensionViews).mockReset().mockResolvedValue([]);
	vi.mocked(api.deleteUiExtensionView).mockReset().mockResolvedValue();
});

describe('SidePanel', () => {
	it('shows only the toggle while closed', () => {
		const { getByTestId, queryByTestId } = renderPanel();

		expect(getByTestId('ui-extensions-side-panel-toggle')).toBeTruthy();
		expect(queryByTestId('ui-extensions-side-panel-content')).toBeNull();
	});

	it('opens with one tab per view and the active view in a frame', async () => {
		vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([
			{
				id: 'view-1',
				kind: 'view',
				title: 'Stats',
				source: 'x',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
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
			{
				id: 'view-1',
				kind: 'view',
				title: 'Stats',
				source: 'x',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
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

	it('shows no visible title, and names the panel for screen readers', async () => {
		useSidePanelStore().isOpen = true;
		const { queryByText, findByRole, getByTestId } = renderPanel();

		expect(await findByRole('region', { name: 'Side panel' })).toBeTruthy();
		expect(queryByText('Side panel')).toBeNull();
		expect(getByTestId('ui-extensions-side-panel-tab-row')).toContainElement(
			getByTestId('ui-extensions-side-panel-tabs'),
		);
	});

	describe('removing a view', () => {
		const userView = {
			id: 'view-1',
			kind: 'view' as const,
			title: 'Stats',
			source: 'x',
			updatedAt: '2026-01-01T00:00:00.000Z',
		};

		async function renderOpen() {
			vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([userView]);
			useSidePanelStore().isOpen = true;
			const result = renderPanel();
			await flushPromises();
			return result;
		}

		it('shows a remove button on a user tab only', async () => {
			const { getAllByTestId, getByRole } = await renderOpen();

			expect(getAllByTestId('tab-close-button')).toHaveLength(1);
			expect(getByRole('button', { name: 'Remove Stats' })).toBeTruthy();
		});

		it('removes the view after the user confirms', async () => {
			confirm.mockResolvedValue('confirm');
			const { getByRole } = await renderOpen();
			vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([]);

			await fireEvent.click(getByRole('button', { name: 'Remove Stats' }));
			await flushPromises();

			expect(confirm).toHaveBeenCalledWith(
				expect.stringContaining('"Stats"'),
				'Remove view?',
				expect.objectContaining({ confirmButtonText: 'Remove', type: 'warning' }),
			);
			expect(api.deleteUiExtensionView).toHaveBeenCalledWith(expect.anything(), 'view-1');
			expect(useSidePanelStore().views.map((view) => view.id)).not.toContain('view-1');
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('keeps the view when the user cancels', async () => {
			confirm.mockResolvedValue('cancel');
			const { getByRole } = await renderOpen();

			await fireEvent.click(getByRole('button', { name: 'Remove Stats' }));
			await flushPromises();

			expect(confirm).toHaveBeenCalledOnce();
			expect(api.deleteUiExtensionView).not.toHaveBeenCalled();
			expect(useSidePanelStore().views.map((view) => view.id)).toContain('view-1');
		});

		it('keeps the view and shows an error when the removal fails', async () => {
			confirm.mockResolvedValue('confirm');
			vi.mocked(api.deleteUiExtensionView).mockRejectedValue(new Error('offline'));
			const { getByRole } = await renderOpen();

			await fireEvent.click(getByRole('button', { name: 'Remove Stats' }));
			await flushPromises();

			expect(showError).toHaveBeenCalledWith(expect.any(Error), "Couldn't remove the view");
			expect(showMessage).not.toHaveBeenCalled();
			expect(useSidePanelStore().views.map((view) => view.id)).toContain('view-1');
		});
	});
});
