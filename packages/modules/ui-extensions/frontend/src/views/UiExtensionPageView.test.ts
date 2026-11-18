import type { UiExtensionPanelData } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { render } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import * as api from '../ui-extensions.api';
import { UI_EXTENSION_PAGE_VIEW } from '../ui-extensions.constants';
import { useSidePanelStore } from '../ui-extensions.store';
import { UI_EXTENSIONS_HOST_KEY, type UiExtensionsHost } from '../ui-extensions.types';
import UiExtensionPageView from './UiExtensionPageView.vue';

vi.mock('../ui-extensions.api');

const { showMessage } = vi.hoisted(() => ({ showMessage: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError: vi.fn() }),
}));

// The frame itself has its own tests. Here it records what the page gives it.
const frameProps = vi.hoisted(() => ({ last: null as Record<string, unknown> | null }));
vi.mock('../components/ViewFrame.vue', async () => {
	const { defineComponent, h } = await import('vue');
	return {
		default: defineComponent({
			props: ['view', 'pageContext', 'workflowAvailableInMcp', 'runtime', 'panelData', 'locale'],
			setup(props) {
				return () => {
					frameProps.last = { ...props };
					return h('div', { 'data-test-id': 'frame-stub' });
				};
			},
		}),
	};
});

const userPage = {
	id: 'p1',
	kind: 'page' as const,
	title: 'KPIs',
	source: 'export default {}',
	updatedAt: '2026-01-01T00:00:00.000Z',
};

const overviewData: UiExtensionPanelData = { state: 'ready', runs: null, services: null };

function createHost() {
	const useOverviewData = vi.fn((enabled: { value: boolean }) => ({
		data: ref({ ...overviewData, enabledWhenCalled: enabled.value }),
		refresh: vi.fn(),
	}));
	const host: UiExtensionsHost = {
		runtime: shallowRef({ js: '', css: '' }),
		locale: ref('de'),
		useOverviewData,
		open: vi.fn(),
		loadRuntime: vi.fn(),
	};
	return host;
}

async function renderPage(pageId: string, host: UiExtensionsHost | null = createHost()) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: 'Home', component: { template: '<div data-test-id="home" />' } },
			{
				path: '/extensions/pages/:pageId',
				name: UI_EXTENSION_PAGE_VIEW,
				component: UiExtensionPageView,
			},
		],
	});
	await router.push({ name: UI_EXTENSION_PAGE_VIEW, params: { pageId } });
	await router.isReady();
	const result = render(UiExtensionPageView, {
		global: {
			plugins: [router],
			provide: host ? { [UI_EXTENSIONS_HOST_KEY as symbol]: host } : {},
		},
	});
	return { ...result, router, host };
}

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
	frameProps.last = null;
	vi.mocked(api.fetchUiExtensionViews).mockReset().mockResolvedValue([userPage]);
});

describe('UiExtensionPageView', () => {
	it('renders a user page in the frame with the other context and no data', async () => {
		const { findByTestId, host } = await renderPage('p1');

		expect(await findByTestId('frame-stub')).toBeTruthy();
		expect(frameProps.last).toMatchObject({
			view: { id: 'p1', kind: 'page', builtin: false },
			pageContext: { page: 'other', routeName: UI_EXTENSION_PAGE_VIEW },
			workflowAvailableInMcp: false,
			locale: 'de',
		});
		expect(host?.loadRuntime).toHaveBeenCalledOnce();
		expect(host?.useOverviewData).toHaveBeenCalledOnce();
		// The data is turned off, so the user page gets nothing and the host fetches nothing.
		expect(frameProps.last?.panelData).toMatchObject({ enabledWhenCalled: false });
	});

	it('turns the overview data on for the built-in page only', async () => {
		const { findByTestId, host } = await renderPage('builtin:automation-dashboard');

		await findByTestId('frame-stub');
		const enabled = vi.mocked(host!.useOverviewData).mock.calls[0][0];
		expect(enabled.value).toBe(true);
		expect(frameProps.last).toMatchObject({
			view: { id: 'builtin:automation-dashboard', builtin: true },
		});
	});

	it('shows loading and does not redirect before the first fetch', async () => {
		const deferred = createDeferredPromise<Array<typeof userPage>>();
		vi.mocked(api.fetchUiExtensionViews).mockReturnValue(deferred.promise);
		const { getByTestId, router } = await renderPage('p1');

		expect(getByTestId('ui-extensions-page-loading')).toBeTruthy();
		expect(router.currentRoute.value.name).toBe(UI_EXTENSION_PAGE_VIEW);

		deferred.resolve([userPage]);
		await flushPromises();
		expect(router.currentRoute.value.name).toBe(UI_EXTENSION_PAGE_VIEW);
	});

	it('goes to the home route with a toast when the page does not exist', async () => {
		const { router } = await renderPage('missing');
		await flushPromises();

		expect(router.currentRoute.value.path).toBe('/');
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'This page was removed' }),
		);
	});

	it('leaves when another editor removes the open page', async () => {
		const { router, findByTestId } = await renderPage('p1');
		await findByTestId('frame-stub');

		vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([]);
		await useSidePanelStore().fetchViews();
		await flushPromises();

		expect(router.currentRoute.value.path).toBe('/');
		expect(showMessage).toHaveBeenCalledOnce();
	});

	it('shows an error without the host', async () => {
		const { getByText } = await renderPage('p1', null);

		expect(getByText("This page can't load here. Reload n8n to try again.")).toBeTruthy();
	});
});
