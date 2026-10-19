import { createComponentRenderer } from '@/__tests__/render';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable, DataTableRow } from '@/features/core/dataTable/dataTable.types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { getGridApi } from 'ag-grid-community';

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

	afterEach(() => {
		vi.useRealTimers();
	});

	function setup() {
		const pinia = createTestingPinia();
		const store = useDataTableStore();
		vi.mocked(store.fetchDataTableDetails).mockResolvedValue(firstTable);
		vi.mocked(store.fetchDataTableContent).mockResolvedValue(firstRows);
		return { pinia, store };
	}

	it('shows the slow switch indicator after one second across schema and row requests', async () => {
		const { pinia, store } = setup();
		const { getByTestId, queryByTestId, rerender } = renderComponent({ pinia });
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});
		const displayedGrid = getByTestId('instance-ai-data-table-grid');
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		const details = createDeferredPromise<DataTable>();
		const rows = createDeferredPromise<Rows>();
		vi.mocked(store.fetchDataTableDetails).mockReturnValue(details.promise);
		vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);

		await rerender({ dataTableId: secondTable.id });
		await vi.advanceTimersByTimeAsync(600);
		details.resolve(secondTable);
		await flushPromises();
		await vi.advanceTimersByTimeAsync(399);
		expect(store.fetchDataTableContent).toHaveBeenCalledTimes(2);
		expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
		await vi.advanceTimersByTimeAsync(1);
		expect(getByTestId('data-table-loading')).toBeVisible();
		expect(displayedGrid).toHaveTextContent('Notebook');
		expect(displayedGrid).toHaveAttribute('inert');

		rows.resolve({ data: [{ id: 2, name: 'Pencil' }], count: 1 });
		await flushPromises();
		await vi.advanceTimersByTimeAsync(100);
		expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
		expect(displayedGrid).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-data-table-grid')).toHaveTextContent('Pencil');
	});

	it('restarts the delay for another tab and clears the indicator after an error', async () => {
		const { pinia, store } = setup();
		const { getByTestId, queryByTestId, rerender } = renderComponent({ pinia });
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		const earlierDetails = createDeferredPromise<DataTable>();
		const currentDetails = createDeferredPromise<DataTable>();
		vi.mocked(store.fetchDataTableDetails)
			.mockReturnValueOnce(earlierDetails.promise)
			.mockReturnValueOnce(currentDetails.promise);

		await rerender({ dataTableId: secondTable.id });
		await vi.advanceTimersByTimeAsync(999);
		await rerender({ dataTableId: 'table-3' });
		await vi.advanceTimersByTimeAsync(999);
		expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
		await vi.advanceTimersByTimeAsync(1);
		expect(getByTestId('data-table-loading')).toBeVisible();

		earlierDetails.resolve(secondTable);
		await flushPromises();
		expect(getByTestId('data-table-loading')).toBeVisible();
		currentDetails.reject(new Error('Request failed'));
		await flushPromises();
		expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-data-table-grid')).not.toBeInTheDocument();
	});

	it('does not show a delayed indicator after a fast switch finishes', async () => {
		const { pinia, store } = setup();
		const { getByTestId, queryByTestId, rerender } = renderComponent({ pinia });
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		vi.mocked(store.fetchDataTableDetails).mockResolvedValue(secondTable);

		await rerender({ dataTableId: secondTable.id });
		await vi.advanceTimersByTimeAsync(100);
		expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute(
			'data-table-id',
			secondTable.id,
		);
		expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
		await vi.advanceTimersByTimeAsync(1000);
		expect(queryByTestId('data-table-loading')).not.toBeInTheDocument();
	});

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

	it.each(['tab switch', 'refresh'])(
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
			} else {
				await rerender({ refreshKey: 1 });
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

	it.each(['agent', 'branch'])('keeps the grid and page when the %s lock changes', async (lock) => {
		const { pinia, store } = setup();
		const sourceControlStore = useSourceControlStore();
		vi.mocked(store.fetchDataTableContent).mockResolvedValue({ ...firstRows, count: 40 });
		const { getByTestId, queryByTestId } = renderComponent({ pinia });
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});
		const displayedGrid = getByTestId('instance-ai-data-table-grid');
		const gridApi = getGridApi(displayedGrid.querySelector('[grid-id]')?.parentElement)!;
		gridApi.applyColumnState({ state: [{ colId: 'name-column', width: 300 }] });
		const columnState = gridApi.getColumnState();
		vi.mocked(store.fetchDataTableContent).mockResolvedValue({
			data: [{ id: 21, name: 'Pencil' }],
			count: 40,
		});
		await fireEvent.click(getByTestId('pagination-next'));
		await waitFor(() => expect(displayedGrid).toHaveTextContent('Pencil'));

		for (const locked of [true, false]) {
			if (lock === 'agent') isAgentWorking.value = locked;
			else sourceControlStore.preferences.branchReadOnly = locked;
			await flushPromises();
			expect(getByTestId('instance-ai-data-table-grid')).toBe(displayedGrid);
			expect(gridApi.isDestroyed()).toBe(false);
			expect(gridApi.getColumnState()).toEqual(columnState);
			expect(displayedGrid).toHaveTextContent('Pencil');
			expect(getByTestId('pagination-next')).toBeDisabled();
			expect(queryByTestId('instance-ai-data-table-loading')).not.toBeInTheDocument();
			expect(store.fetchDataTableDetails).toHaveBeenCalledOnce();
			expect(store.fetchDataTableContent).toHaveBeenCalledTimes(2);
		}
	});

	it.each([false, true])(
		'updates editing controls in place from readOnly=%s',
		async (initialLock) => {
			const { pinia, store } = setup();
			vi.mocked(store.fetchDataTableDetails).mockResolvedValue({
				...firstTable,
				columns: [
					...firstTable.columns,
					{ id: 'stock-column', name: 'inStock', type: 'boolean', index: 1 },
				],
			});
			vi.mocked(store.fetchDataTableContent).mockResolvedValue({
				data: [{ id: 1, name: 'Notebook', inStock: true }],
				count: 1,
			});
			isAgentWorking.value = initialLock;
			const { getByTestId, getByRole } = renderComponent({ pinia });
			await waitFor(() => {
				expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
			});
			const displayedGrid = getByTestId('instance-ai-data-table-grid');
			const gridApi = getGridApi(displayedGrid.querySelector('[grid-id]')?.parentElement)!;
			const header = displayedGrid.querySelector('.ag-header-cell[col-id="name-column"]')!;
			const row = gridApi.getRowNode('1')!;

			for (const locked of [initialLock, !initialLock, initialLock]) {
				isAgentWorking.value = locked;
				await waitFor(() => expect(row.selectable).toBe(!locked));
				expect(gridApi.getGridOption('suppressMovableColumns')).toBe(locked);
				expect(getByTestId('instance-ai-data-table-grid')).toBe(displayedGrid);
				await fireEvent.mouseEnter(
					header.querySelector('[data-test-id="data-table-column-header"]')!,
				);
				const addRow = getByRole('button', { name: 'Add Row' });
				const addColumn = getByTestId('data-table-add-column-trigger-button');
				const menu = header.querySelector('button[aria-haspopup="menu"]');
				const checkbox = displayedGrid.querySelector(
					'.ag-row[row-id="1"] .ag-cell[col-id="stock-column"] input[type="checkbox"]',
				);
				if (locked) {
					expect(addRow).toBeDisabled();
					expect(addColumn).toBeDisabled();
					expect(checkbox).toBeDisabled();
					expect(menu).not.toBeVisible();
					expect(row.isSelected()).toBe(false);
				} else {
					expect(addRow).toBeEnabled();
					expect(addColumn).toBeEnabled();
					expect(checkbox).toBeEnabled();
					expect(menu).toBeVisible();
					expect(gridApi.getColumn('name-column')!.getColDef().suppressMovable).not.toBe(true);
					row.setSelected(true);
					expect(row.isSelected()).toBe(true);
				}
			}
			expect(row.data.name).toBe('Notebook');
			expect(store.updateRow).not.toHaveBeenCalled();
			expect(store.fetchDataTableDetails).toHaveBeenCalledOnce();
			expect(store.fetchDataTableContent).toHaveBeenCalledOnce();
		},
	);

	it('cancels an active cell edit on lock and permits editing after unlock', async () => {
		const { pinia, store } = setup();
		const { getByTestId } = renderComponent({ pinia });
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});
		const displayedGrid = getByTestId('instance-ai-data-table-grid');
		const gridApi = getGridApi(displayedGrid.querySelector('[grid-id]')?.parentElement)!;
		gridApi.startEditingCell({ rowIndex: 0, colKey: 'name-column' });
		expect(gridApi.getEditingCells()).toHaveLength(1);
		await fireEvent.update(displayedGrid.querySelector('textarea')!, 'Changed value');

		isAgentWorking.value = true;
		await waitFor(() => expect(gridApi.getEditingCells()).toHaveLength(0));
		expect(gridApi.getRowNode('1')!.data.name).toBe('Notebook');
		expect(store.updateRow).not.toHaveBeenCalled();
		gridApi.startEditingCell({ rowIndex: 0, colKey: 'name-column' });
		expect(gridApi.getEditingCells()).toHaveLength(0);

		isAgentWorking.value = false;
		await flushPromises();
		gridApi.startEditingCell({ rowIndex: 0, colKey: 'name-column' });
		expect(gridApi.getEditingCells()).toHaveLength(1);
		expect(store.fetchDataTableDetails).toHaveBeenCalledOnce();
		expect(store.fetchDataTableContent).toHaveBeenCalledOnce();
	});

	it('uses the current lock when a pending table becomes ready without restarting its requests', async () => {
		const { pinia, store } = setup();
		const details = createDeferredPromise<DataTable>();
		const rows = createDeferredPromise<Rows>();
		vi.mocked(store.fetchDataTableDetails).mockReturnValue(details.promise);
		vi.mocked(store.fetchDataTableContent).mockReturnValue(rows.promise);
		const { getByTestId, getByRole } = renderComponent({ pinia });

		isAgentWorking.value = true;
		await flushPromises();
		details.resolve(firstTable);
		await waitFor(() => expect(store.fetchDataTableContent).toHaveBeenCalledOnce());
		isAgentWorking.value = false;
		await flushPromises();
		rows.resolve(firstRows);
		await waitFor(() => {
			expect(getByTestId('instance-ai-data-table-grid')).toHaveAttribute('aria-hidden', 'false');
		});

		expect(getByRole('button', { name: 'Add Row' })).toBeEnabled();
		expect(store.fetchDataTableDetails).toHaveBeenCalledOnce();
		expect(store.fetchDataTableContent).toHaveBeenCalledOnce();
	});

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
