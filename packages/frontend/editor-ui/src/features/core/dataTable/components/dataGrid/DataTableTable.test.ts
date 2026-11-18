import { createComponentRenderer } from '@/__tests__/render';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { getGridApi, type GridApi } from 'ag-grid-community';

import DataTableTable from './DataTableTable.vue';

const dataTable: DataTable = {
	id: 'table-1',
	name: 'Products',
	projectId: 'project-1',
	columns: [
		{ id: 'price-column', name: 'price', type: 'number', index: 1 },
		{ id: 'name-column', name: 'name', type: 'string', index: 0 },
	],
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
	sizeBytes: 0,
};

const renderComponent = createComponentRenderer(DataTableTable, {
	props: { dataTable },
});

const setup = () => {
	const pinia = createTestingPinia();
	const store = useDataTableStore();
	vi.mocked(store.fetchDataTableContent).mockResolvedValue({
		data: [
			{ id: 1, name: 'Notebook', price: 3 },
			{ id: 2, name: 'Pencil', price: 1 },
		],
		count: 2,
	});
	return { pinia, store };
};

const getApi = async (container: Element): Promise<GridApi> => {
	let api: GridApi | undefined;
	await waitFor(() => {
		const gridElement = container.querySelector('[grid-id]')?.parentElement;
		api = gridElement ? getGridApi(gridElement) : undefined;
		expect(api?.getRowNode('1')).toBeDefined();
	});
	if (!api) throw new Error('Grid API not found');
	return api;
};

describe('DataTableTable', () => {
	it('should show the id, the user columns by index and the system columns', async () => {
		const { pinia } = setup();
		const { container } = renderComponent({ pinia });
		const api = await getApi(container);

		expect(api.getAllDisplayedColumns().map((column) => column.getColId())).toEqual([
			'ag-Grid-SelectionColumn',
			'id',
			'name-column',
			'price-column',
			'createdAt',
			'updatedAt',
			'__n8n_data_grid_append__',
		]);
	});

	it('should fetch rows sorted by id when no column is sorted', async () => {
		const { pinia, store } = setup();
		renderComponent({ pinia });

		await waitFor(() =>
			expect(store.fetchDataTableContent).toHaveBeenCalledWith(
				'table-1',
				'project-1',
				1,
				20,
				'id:asc',
				undefined,
				undefined,
			),
		);
	});

	it('should show the add row button and the add column button', async () => {
		const { pinia } = setup();
		const { container, getByTestId, findByRole } = renderComponent({ pinia });
		await getApi(container);

		expect(await findByRole('button', { name: 'Add Row' })).toBeEnabled();
		expect(getByTestId('data-table-add-column-trigger-button')).toBeEnabled();
	});

	it('should fetch the first page again when the search changes', async () => {
		const { pinia, store } = setup();
		const { container, rerender } = renderComponent({ pinia });
		await getApi(container);
		vi.mocked(store.fetchDataTableContent).mockClear();

		await rerender({ dataTable, search: 'pen' });

		await waitFor(() =>
			expect(store.fetchDataTableContent).toHaveBeenCalledWith(
				'table-1',
				'project-1',
				1,
				20,
				'id:asc',
				undefined,
				'pen',
			),
		);
	});

	it('should allow cell edits, row selection and column moves when nothing is read-only', async () => {
		const { pinia } = setup();
		const { container } = renderComponent({ pinia });
		const api = await getApi(container);
		const row = api.getRowNode('1')!;

		expect(api.getColumn('name-column')?.isCellEditable(row)).toBe(true);
		expect(row.selectable).toBe(true);
		expect(api.getGridOption('suppressMovableColumns')).toBe(false);
	});

	it('should lock cells, row selection and columns when read-only', async () => {
		const { pinia } = setup();
		const { container, findByRole, getByTestId } = renderComponent({
			pinia,
			props: { dataTable, readOnly: true },
		});
		const api = await getApi(container);
		const row = api.getRowNode('1')!;

		expect(api.getColumn('name-column')?.isCellEditable(row)).toBe(false);
		expect(row.selectable).toBe(false);
		expect(api.getColumn('ag-Grid-SelectionColumn')).toBeDefined();
		expect(api.getGridOption('suppressMovableColumns')).toBe(true);
		expect(await findByRole('button', { name: 'Add Row' })).toBeDisabled();
		expect(getByTestId('data-table-add-column-trigger-button')).toBeDisabled();
	});

	it('should keep rows editable and lock columns when only the schema is read-only', async () => {
		const { pinia } = setup();
		const { container, findByRole, getByTestId } = renderComponent({
			pinia,
			props: { dataTable, schemaReadOnly: true },
		});
		const api = await getApi(container);
		const row = api.getRowNode('1')!;

		expect(api.getColumn('name-column')?.isCellEditable(row)).toBe(true);
		expect(row.selectable).toBe(true);
		expect(api.getGridOption('suppressMovableColumns')).toBe(true);
		expect(await findByRole('button', { name: 'Add Row' })).toBeEnabled();
		expect(getByTestId('data-table-add-column-trigger-button')).toBeDisabled();
	});

	it('should save a cell edit', async () => {
		const { pinia, store } = setup();
		const { container } = renderComponent({ pinia });
		const api = await getApi(container);

		api.getRowNode('1')?.setDataValue('name-column', 'Notepad');

		await waitFor(() =>
			expect(store.updateRow).toHaveBeenCalledWith('table-1', 'project-1', 1, { name: 'Notepad' }),
		);
		await waitFor(() => expect(api.getRowNode('1')?.data.name).toBe('Notepad'));
	});
});
