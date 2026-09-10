import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import AppPreview from '@/features/apps/components/AppPreview.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App, Page } from '@/features/apps/apps.types';

const app: App = {
	id: 'app1',
	name: 'My app',
	namespace: 'my-app',
	theme: null,
	auth: 'public',
	projectId: 'p1',
	activeVersionId: null,
	publishedAt: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
};

const page = (id: string, route: string, parentPageId: string | null = null): Page => ({
	id,
	appId: 'app1',
	parentPageId,
	route,
	content: [],
	layout: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
});

const renderComponent = createComponentRenderer(AppPreview, { pinia: createTestingPinia() });

describe('AppPreview', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		appsStore = mockedStore(useAppsStore);
		appsStore.pages = [
			page('home', ''),
			page('clients', 'clients'),
			page('client', ':id', 'clients'),
		];
		appsStore.fetchPreview.mockResolvedValue({ html: '<html></html>', errors: {} });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('fetches the preview of the selected page on mount', async () => {
		renderComponent({ props: { projectId: 'p1', appId: 'app1', pageId: 'home', app } });

		await waitFor(() =>
			expect(appsStore.fetchPreview).toHaveBeenCalledWith('p1', 'app1', 'home', {
				path: '',
				params: {},
			}),
		);
	});

	it('offers an input per dynamic segment and refetches with the typed value', async () => {
		const { getByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'client', app },
		});

		await userEvent.type(getByTestId('app-preview-param-input'), '42');

		await waitFor(() =>
			expect(appsStore.fetchPreview).toHaveBeenLastCalledWith('p1', 'app1', 'client', {
				path: 'clients/:id',
				params: { id: '42' },
			}),
		);
	});

	it('narrows the frame in mobile mode', async () => {
		const { getByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});
		await waitFor(() => expect(getByTestId('app-preview-iframe')).toBeInTheDocument());

		await userEvent.click(getByTestId('app-preview-device-mobile'));

		expect(getByTestId('app-preview-iframe').style.width).toBe('390px');
	});

	it('lists the render errors above the frame and hides the list when there are none', async () => {
		appsStore.fetchPreview.mockResolvedValue({
			html: '<html></html>',
			errors: { menu: 'boom' },
		});
		const { getByTestId, queryByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});

		await waitFor(() =>
			expect(getByTestId('app-preview-render-errors').textContent).toContain('Block menu: boom'),
		);
		expect(getByTestId('app-preview-iframe')).toBeInTheDocument();

		appsStore.fetchPreview.mockResolvedValue({ html: '<html></html>', errors: {} });
		await userEvent.click(getByTestId('app-preview-refresh'));

		await waitFor(() => expect(queryByTestId('app-preview-render-errors')).toBeNull());
	});

	it('refetches on refresh', async () => {
		const { getByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});
		await waitFor(() => expect(appsStore.fetchPreview).toHaveBeenCalledTimes(1));

		await userEvent.click(getByTestId('app-preview-refresh'));

		await waitFor(() => expect(appsStore.fetchPreview).toHaveBeenCalledTimes(2));
	});
});
