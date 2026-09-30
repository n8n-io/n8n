import { createComponentRenderer } from '@/__tests__/render';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable, DataTableRow } from '@/features/core/dataTable/dataTable.types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
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
