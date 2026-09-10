import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import PageTree from '@/features/apps/components/PageTree.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAppsStore } from '@/features/apps/apps.store';
import type { Page } from '@/features/apps/apps.types';

const confirmAndDeletePage = vi.fn();
vi.mock('@/features/apps/useAppDeletion', () => ({
	useAppDeletion: () => ({ confirmAndDeletePage }),
}));

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

const renderComponent = createComponentRenderer(PageTree, {
	pinia: createTestingPinia(),
	props: { projectId: 'p1', appId: 'app1' },
});

describe('PageTree', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		appsStore = mockedStore(useAppsStore);
		appsStore.pages = [
			page('index', ''),
			page('reports', 'reports'),
			page('weekly', 'weekly', 'reports'),
		];
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the tree with indented sub-pages and their counts', () => {
		const { getAllByTestId } = renderComponent();

		const rows = getAllByTestId('page-tree-row');
		expect(rows.map((row) => row.getAttribute('data-depth'))).toEqual(['0', '0', '1']);
		expect(rows[1].textContent).toContain('/reports');
		expect(rows[1].textContent).toContain('1 sub-page');
	});

	it('emits open for the clicked page', async () => {
		const { getAllByTestId, emitted } = renderComponent();

		await userEvent.click(getAllByTestId('page-tree-open')[1]);

		expect(emitted('open')).toEqual([['reports']]);
	});

	it('creates a root page from the inline row on Enter', async () => {
		appsStore.createPage.mockResolvedValue(page('about', 'about'));
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('app-page-add-root'));
		await userEvent.type(getByTestId('page-tree-route-input'), 'about{Enter}');

		await waitFor(() =>
			expect(appsStore.createPage).toHaveBeenCalledWith('p1', 'app1', 'about', undefined),
		);
	});

	it('creates a sub-page under the row whose + was clicked, on blur', async () => {
		appsStore.createPage.mockResolvedValue(page('leads', 'leads', 'reports'));
		const { getAllByTestId, getByTestId, getAllByTestId: rowsOf } = renderComponent();

		await userEvent.click(getAllByTestId('page-tree-add-child')[0]);
		expect(rowsOf('page-tree-row')[2].getAttribute('data-depth')).toBe('1');
		await userEvent.type(getByTestId('page-tree-route-input'), 'leads');
		await userEvent.tab();

		await waitFor(() =>
			expect(appsStore.createPage).toHaveBeenCalledWith('p1', 'app1', 'leads', 'reports'),
		);
	});

	it('does not offer a sub-page on the index page', () => {
		const { getAllByTestId } = renderComponent();

		expect(getAllByTestId('page-tree-add-child')).toHaveLength(2);
	});

	it('drops the draft row on Escape and on blur without input', async () => {
		const { getByTestId, queryByTestId } = renderComponent();

		await userEvent.click(getByTestId('app-page-add-root'));
		await userEvent.keyboard('{Escape}');
		expect(queryByTestId('page-tree-route-input')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('app-page-add-root'));
		await userEvent.tab();
		expect(queryByTestId('page-tree-route-input')).not.toBeInTheDocument();
		expect(appsStore.createPage).not.toHaveBeenCalled();
	});

	it('renames a page inline', async () => {
		appsStore.updatePage.mockResolvedValue(page('reports', 'stats'));
		const { getAllByTestId, getByTestId } = renderComponent();

		await userEvent.click(getAllByTestId('page-tree-rename')[1]);
		const input = getByTestId('page-tree-route-input');
		expect(input).toHaveValue('reports');
		await userEvent.clear(input);
		await userEvent.type(input, 'stats{Enter}');

		await waitFor(() =>
			expect(appsStore.updatePage).toHaveBeenCalledWith('p1', 'app1', 'reports', {
				route: 'stats',
			}),
		);
	});

	it('asks for confirmation before deleting', async () => {
		const { getAllByTestId } = renderComponent();

		await userEvent.click(getAllByTestId('page-tree-delete')[1]);

		expect(confirmAndDeletePage).toHaveBeenCalledWith('p1', 'app1', 'reports');
	});
});
