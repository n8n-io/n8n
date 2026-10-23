import { createComponentRenderer } from '@/__tests__/render';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable, DataTableRow } from '@/features/core/dataTable/dataTable.types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import DataTableTable from './DataTableTable.vue';

const dataTable: DataTable = {
	id: 'table-1',
	name: 'Products',
	projectId: 'project-1',
	columns: [{ id: 'name-column', name: 'name', type: 'string', index: 0 }],
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
	sizeBytes: 0,
};

const renderComponent = createComponentRenderer(DataTableTable, {
	props: { dataTable },
});

describe('DataTableTable loading', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows an indicator after one second while the first rows are pending', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		const pinia = createTestingPinia();
		const store = useDataTableStore();
		const rows = createDeferredPromise<{ data: DataTableRow[]; count: number }>();
		vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);
		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		await vi.advanceTimersByTimeAsync(999);
		expect(store.fetchDataTableContent).toHaveBeenCalledOnce();
		expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
		expect(queryByTestId('data-table-no-rows-overlay')).not.toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(1);
		expect(getByTestId('data-table-loading')).toHaveTextContent('Loading...');
		expect(getByTestId('data-table-grid')).toHaveAttribute('aria-busy', 'true');

		rows.resolve({ data: [], count: 0 });
		await flushPromises();
		expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
		expect(getByTestId('data-table-grid')).toHaveAttribute('aria-busy', 'false');
	});

	it.each(['success', 'failure'])(
		'clears the slow pagination indicator after %s',
		async (result) => {
			const pinia = createTestingPinia();
			const store = useDataTableStore();
			vi.mocked(store.fetchDataTableContent).mockResolvedValue({
				data: [{ id: 1, name: 'Notebook' }],
				count: 40,
			});
			const { getByTestId, queryByTestId } = renderComponent({ pinia });
			await waitFor(() => expect(getByTestId('data-table-grid')).toHaveTextContent('Notebook'));
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			const rows = createDeferredPromise<{ data: DataTableRow[]; count: number }>();
			vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);

			await fireEvent.click(getByTestId('pagination-next'));
			await vi.advanceTimersByTimeAsync(999);
			expect(store.fetchDataTableContent).toHaveBeenCalledTimes(2);
			expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
			expect(getByTestId('data-table-grid')).toHaveTextContent('Notebook');
			await vi.advanceTimersByTimeAsync(1);
			expect(getByTestId('data-table-loading')).toBeVisible();

			if (result === 'success') {
				rows.resolve({ data: [{ id: 21, name: 'Pencil' }], count: 40 });
			} else {
				rows.reject(new Error('Request failed'));
			}
			await flushPromises();
			expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
			expect(getByTestId('data-table-grid')).toHaveAttribute('aria-busy', 'false');
		},
	);

	it('does not show an empty state or loading pill while the first rows are pending', async () => {
		const pinia = createTestingPinia();
		const store = useDataTableStore();
		const rows = createDeferredPromise<{ data: DataTableRow[]; count: number }>();
		vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);

		const { container, queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('data-table-no-rows-overlay')).not.toBeInTheDocument();
		await waitFor(() => expect(store.fetchDataTableContent).toHaveBeenCalled());
		await flushPromises();

		expect(container.querySelector('.ag-header-cell[col-id="name-column"]')).toBeInTheDocument();
		expect(queryByTestId('data-table-no-rows-overlay')).not.toBeInTheDocument();
		expect(container.querySelector('.ag-overlay-loading-center')).not.toBeInTheDocument();

		rows.resolve({ data: [{ id: 1, name: 'Notebook' }], count: 1 });
		await waitFor(() => {
			expect(container.querySelector('.ag-row[row-id="1"]')).toHaveTextContent('Notebook');
		});
		expect(queryByTestId('data-table-no-rows-overlay')).not.toBeInTheDocument();
	});

	it('shows the empty state only after the first row request finishes', async () => {
		const pinia = createTestingPinia();
		const store = useDataTableStore();
		const rows = createDeferredPromise<{ data: DataTableRow[]; count: number }>();
		vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);

		const { container, queryByTestId, findByTestId, emitted } = renderComponent({ pinia });
		await waitFor(() => expect(store.fetchDataTableContent).toHaveBeenCalled());
		await flushPromises();
		expect(queryByTestId('data-table-no-rows-overlay')).not.toBeInTheDocument();

		rows.resolve({ data: [], count: 0 });

		expect(await findByTestId('data-table-no-rows-overlay')).toBeVisible();
		expect(container.querySelector('.ag-header-cell[col-id="name-column"]')).toBeInTheDocument();
		expect(container.querySelector('.ag-overlay-loading-center')).not.toBeInTheDocument();
		expect(emitted('ready')).toHaveLength(1);
	});

	it('does not signal readiness when the initial rows request fails', async () => {
		const pinia = createTestingPinia();
		const store = useDataTableStore();
		const rows = createDeferredPromise<{ data: DataTableRow[]; count: number }>();
		vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);
		const { emitted } = renderComponent({ pinia });
		await waitFor(() => expect(store.fetchDataTableContent).toHaveBeenCalled());

		rows.reject(new Error('Request failed'));
		await flushPromises();

		expect(emitted('ready')).toBeUndefined();
		expect(emitted('loadError')).toHaveLength(1);
	});
});
