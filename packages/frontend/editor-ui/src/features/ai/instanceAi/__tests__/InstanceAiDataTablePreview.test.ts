import { createComponentRenderer } from '@/__tests__/render';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable, DataTableRow } from '@/features/core/dataTable/dataTable.types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

import InstanceAiDataTablePreview from '../components/InstanceAiDataTablePreview.vue';

const isAgentWorking = ref(false);
vi.mock('../composables/useIsAgentWorking', () => ({
	useIsAgentWorking: () => isAgentWorking,
}));

const firstTable: DataTable = {
	id: 'table-1',
	name: 'Products',
	projectId: 'project-1',
	columns: [{ id: 'name-column', name: 'name', type: 'string', index: 0 }],
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
	sizeBytes: 0,
};
const secondTable: DataTable = { ...firstTable, id: 'table-2', name: 'Inventory' };
const firstRows = { data: [{ id: 1, name: 'Notebook' }], count: 1 };
type Rows = { data: DataTableRow[]; count: number };

const renderComponent = createComponentRenderer(InstanceAiDataTablePreview, {
	props: { dataTableId: firstTable.id, projectId: firstTable.projectId },
});

describe('InstanceAiDataTablePreview', () => {
	beforeEach(() => {
		isAgentWorking.value = false;
	});

	function setup() {
		const pinia = createTestingPinia();
		const store = useDataTableStore();
		vi.mocked(store.fetchDataTableDetails).mockResolvedValue(firstTable);
		vi.mocked(store.fetchDataTableContent).mockResolvedValue(firstRows);
		return { pinia, store };
	}

	it.each([firstRows, { data: [], count: 0 }])(
		'keeps the initial spinner until the grid is ready for $count rows',
		async (response) => {
			const { pinia, store } = setup();
			const rows = createDeferredPromise<Rows>();
			vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);
			const { getByTestId, queryByTestId } = renderComponent({ pinia });

			await waitFor(() => expect(store.fetchDataTableContent).toHaveBeenCalled());
			expect(getByTestId('instance-ai-data-table-loading')).toBeInTheDocument();
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'true');

			rows.resolve(response);
			await waitFor(() => {
				expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
			});
			expect(queryByTestId('instance-ai-data-table-loading')).not.toBeInTheDocument();
			expect(
				getByTestId('instance-ai-data-table-grid').querySelector('.ag-header-cell'),
			).toBeInTheDocument();
		},
	);

	it.each(['tab switch', 'refresh', 'editing lock'])(
		'keeps the displayed grid until its replacement is ready: %s',
		async (change) => {
			const { pinia, store } = setup();
			const { getAllByTestId, getByTestId, queryByTestId, rerender } = renderComponent({ pinia });
			await waitFor(() => {
				expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
			});
			const displayedGrid = getByTestId('instance-ai-data-table-grid');
			const details = createDeferredPromise<DataTable>();
			const rows = createDeferredPromise<Rows>();
			vi.mocked(store.fetchDataTableDetails).mockReturnValue(details.promise);
			vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);

			if (change === 'tab switch') {
				await rerender({ dataTableId: secondTable.id });
			} else if (change === 'refresh') {
				await rerender({ refreshKey: 1 });
			} else {
				isAgentWorking.value = true;
				await flushPromises();
			}

			expect(displayedGrid).toBeInTheDocument();
			expect(displayedGrid).toHaveAttribute('aria-hidden', 'false');
			expect(displayedGrid).toHaveAttribute('inert');
			expect(displayedGrid).toHaveTextContent('Notebook');
			expect(queryByTestId('instance-ai-data-table-loading')).not.toBeInTheDocument();

			details.resolve(change === 'tab switch' ? secondTable : firstTable);
			await waitFor(() => expect(store.fetchDataTableContent).toHaveBeenCalledTimes(2));
			const pendingGrid = getAllByTestId('instance-ai-data-table-grid')[1];
			expect(pendingGrid).toHaveAttribute('aria-hidden', 'true');
			expect(displayedGrid).toHaveAttribute('aria-hidden', 'false');

			rows.resolve({ data: [{ id: 2, name: 'Pencil' }], count: 1 });
			await waitFor(() => expect(pendingGrid).toHaveAttribute('aria-hidden', 'false'));
			expect(pendingGrid).toHaveTextContent('Pencil');
			expect(pendingGrid).not.toHaveAttribute('inert');
			expect(displayedGrid).not.toBeInTheDocument();
			expect(store.fetchDataTableContent).toHaveBeenCalledTimes(2);
		},
	);

	it('closes the open column popover when the agent locks the displayed grid', async () => {
		const { pinia, store } = setup();
		const user = userEvent.setup();
		const { getByTestId, queryByTestId } = renderComponent({ pinia });
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});
		await user.click(getByTestId('data-table-add-column-trigger-button'));
		await user.type(getByTestId('add-column-name-input'), 'description');
		const submitButton = getByTestId('data-table-add-column-submit-button');
		const details = createDeferredPromise<DataTable>();
		vi.mocked(store.fetchDataTableDetails).mockReturnValue(details.promise);

		isAgentWorking.value = true;
		await flushPromises();
		await fireEvent.click(submitButton);

		expect(store.addDataTableColumn).not.toHaveBeenCalled();
		expect(queryByTestId('add-column-popover-content')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-data-table-grid')).toHaveTextContent('Notebook');
	});

	it('closes the open column menu when the agent locks the displayed grid', async () => {
		const { pinia, store } = setup();
		const user = userEvent.setup();
		const { getByTestId, getByRole, queryByRole } = renderComponent({ pinia });
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});
		const header = getByTestId('instance-ai-data-table-grid').querySelector(
			'.ag-header-cell[col-id="name-column"]',
		)!;
		await fireEvent.mouseEnter(header.querySelector('[data-test-id="data-table-column-header"]')!);
		await user.click(header.querySelector('button[aria-haspopup="menu"]')!);
		expect(getByRole('menu')).toBeInTheDocument();
		const details = createDeferredPromise<DataTable>();
		vi.mocked(store.fetchDataTableDetails).mockReturnValue(details.promise);

		isAgentWorking.value = true;
		await waitFor(() => expect(queryByRole('menu')).not.toBeInTheDocument());

		expect(store.deleteDataTableColumn).not.toHaveBeenCalled();
		expect(getByTestId('instance-ai-data-table-grid')).toHaveTextContent('Notebook');
	});

	it('ignores an earlier details response after another tab is selected', async () => {
		const { pinia, store } = setup();
		const earlierDetails = createDeferredPromise<DataTable>();
		vi.mocked(store.fetchDataTableDetails).mockReturnValueOnce(earlierDetails.promise);
		const { getByTestId, rerender } = renderComponent({ pinia });

		vi.mocked(store.fetchDataTableDetails).mockResolvedValue(secondTable);
		await rerender({ dataTableId: secondTable.id });
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});
		earlierDetails.resolve(firstTable);
		await flushPromises();

		expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute(
			'data-table-id',
			secondTable.id,
		);
		expect(store.fetchDataTableContent).toHaveBeenCalledTimes(1);
	});

	it.each(['success', 'failure'])(
		'keeps the selected table when an earlier rows request finishes later: %s',
		async (result) => {
			const { pinia, store } = setup();
			const { getAllByTestId, getByTestId, rerender } = renderComponent({ pinia });
			await waitFor(() => {
				expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
			});

			const earlierRows = createDeferredPromise<Rows>();
			vi.mocked(store.fetchDataTableDetails).mockResolvedValueOnce(secondTable);
			vi.mocked(store.fetchDataTableContent).mockReturnValueOnce(earlierRows.promise);
			await rerender({ dataTableId: secondTable.id });
			await waitFor(() => expect(store.fetchDataTableContent).toHaveBeenCalledTimes(2));
			expect(getAllByTestId('instance-ai-data-table-grid')).toHaveLength(2);

			await rerender({ dataTableId: firstTable.id });
			await waitFor(() => expect(store.fetchDataTableContent).toHaveBeenCalledTimes(3));
			await waitFor(() => expect(getAllByTestId('instance-ai-data-table-grid')).toHaveLength(1));
			if (result === 'success') {
				earlierRows.resolve({ data: [{ id: 2, name: 'Pencil' }], count: 1 });
			} else {
				earlierRows.reject(new Error('Request failed'));
			}
			await flushPromises();

			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute(
				'data-table-id',
				firstTable.id,
			);
			expect(getByTestId('instance-ai-data-table-grid')).toHaveTextContent('Notebook');
		},
	);

	it.each(['initial load', 'tab switch'])(
		'shows an error when the rows request fails during %s',
		async (change) => {
			const { pinia, store } = setup();
			const rows = createDeferredPromise<Rows>();
			if (change === 'initial load') {
				vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);
			}
			const { getByTestId, queryByTestId, findByText, rerender } = renderComponent({ pinia });
			if (change === 'tab switch') {
				await waitFor(() => {
					expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute(
						'aria-hidden',
						'false',
					);
				});
				vi.mocked(store.fetchDataTableDetails).mockResolvedValue(secondTable);
				vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);
				await rerender({ dataTableId: secondTable.id });
			}
			await waitFor(() => {
				expect(store.fetchDataTableContent).toHaveBeenCalledTimes(change === 'tab switch' ? 2 : 1);
			});

			rows.reject(new Error('Request failed'));

			expect(await findByText('Could not load data table')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-data-table-grid')).not.toBeInTheDocument();
			expect(queryByTestId('instance-ai-data-table-loading')).not.toBeInTheDocument();
		},
	);

	it('shows an error when the selected table cannot be loaded', async () => {
		const { pinia, store } = setup();
		const { getByTestId, queryByTestId, findByText, rerender } = renderComponent({ pinia });
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});
		vi.mocked(store.fetchDataTableDetails).mockRejectedValue(new Error('Request failed'));
		await rerender({ dataTableId: secondTable.id });

		expect(await findByText('Could not load data table')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-data-table-grid')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-data-table-loading')).not.toBeInTheDocument();
	});
});
