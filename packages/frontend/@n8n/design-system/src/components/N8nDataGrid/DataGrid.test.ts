import { fireEvent, waitFor } from '@testing-library/vue';
import { getGridApi, type GridApi } from 'ag-grid-community';
import type { MockInstance } from 'vitest';
import { ref } from 'vue';

import { createComponentRenderer } from '../../__tests__/render';
import N8nDataGrid from './DataGrid.vue';
import type { DataGridColumn } from './DataGrid.types';

type Row = { id: string; name: string | null; age: number | null };

const columns: Array<DataGridColumn<Row>> = [
	{ id: 'name-id', field: 'name', label: 'Name', type: 'string' },
	{ id: 'age-id', field: 'age', label: 'Age', type: 'number' },
];

const createRows = (count: number): Row[] =>
	Array.from({ length: count }, (_, index) => ({
		id: String(index + 1),
		name: `Name ${index + 1}`,
		age: count - index,
	}));

const renderComponent = createComponentRenderer(N8nDataGrid);

const render = (props: Record<string, unknown> = {}) =>
	renderComponent({ props: { rows: createRows(3), columns, rowKey: 'id', ...props } });

const getApi = async (container: Element): Promise<GridApi<Row>> => {
	let api: GridApi<Row> | undefined;
	await waitFor(() => {
		const gridElement = container.querySelector('[grid-id]')?.parentElement;
		api = gridElement ? getGridApi(gridElement) : undefined;
		expect(api?.getColumns()?.length).toBeGreaterThan(0);
		expect(container.querySelector('[data-test-id="data-grid-column-header"]')).not.toBeNull();
	});
	if (!api) throw new Error('Grid API not found');
	return api;
};

const getDisplayedNames = (api: GridApi<Row>) => {
	const names: unknown[] = [];
	api.forEachNodeAfterFilterAndSort((node) => {
		if (node.displayed) names.push(node.data?.name);
	});
	return names;
};

const getHeader = (container: Element, label: string) => {
	const header = Array.from(
		container.querySelectorAll('[data-test-id="data-grid-column-header"]'),
	).find((element) => element.textContent?.includes(label));
	if (!header) throw new Error(`Header ${label} not found`);
	return header;
};

describe('N8nDataGrid', () => {
	let warn: MockInstance<typeof console.warn>;

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn');
	});

	afterEach(() => {
		warn.mockRestore();
	});

	it('should render rows without Vue warnings in client mode', async () => {
		const { container, getByText } = render();
		await getApi(container);

		await waitFor(() => expect(getByText('Name 1')).toBeInTheDocument());
		const propWarnings = warn.mock.calls.filter(([message]) =>
			/Missing required prop|Invalid prop/.test(String(message)),
		);
		expect(propWarnings).toEqual([]);
	});

	it('should show null and empty values', async () => {
		const { container, getAllByTestId } = render({
			rows: [
				{ id: '1', name: null, age: 1 },
				{ id: '2', name: '', age: 2 },
			],
		});
		await getApi(container);

		await waitFor(() => {
			const labels = getAllByTestId('data-grid-special-value').map((el) => el.textContent);
			expect(labels).toEqual(expect.arrayContaining(['Null', 'Empty']));
		});
	});

	it('should show the empty state when there are no rows', async () => {
		const { container, findByTestId } = render({ rows: [] });
		await getApi(container);

		expect(await findByTestId('data-grid-no-rows')).toHaveTextContent('No rows');
	});

	describe('sort', () => {
		it('should sort rows in client mode and report the sort', async () => {
			const onSort = vi.fn();
			const { container } = render({ 'onUpdate:sort': onSort });
			const api = await getApi(container);

			await fireEvent.click(getHeader(container, 'Age'));

			await waitFor(() => expect(onSort).toHaveBeenCalledWith({ field: 'age', direction: 'asc' }));
			await waitFor(() => expect(getDisplayedNames(api)).toEqual(['Name 3', 'Name 2', 'Name 1']));
		});

		it('should keep the row order and sort state in server mode until the parent updates it', async () => {
			const onSort = vi.fn();
			const { container, rerender, queryByTestId } = render({
				sortMode: 'server',
				sort: null,
				'onUpdate:sort': onSort,
			});
			const api = await getApi(container);

			await fireEvent.click(getHeader(container, 'Age'));

			await waitFor(() => expect(onSort).toHaveBeenCalledWith({ field: 'age', direction: 'asc' }));
			expect(getDisplayedNames(api)).toEqual(['Name 1', 'Name 2', 'Name 3']);
			expect(queryByTestId('data-grid-column-header-sort')).not.toBeInTheDocument();

			await rerender({ sort: { field: 'age', direction: 'asc' } });

			await waitFor(() =>
				expect(queryByTestId('data-grid-column-header-sort')).toBeInTheDocument(),
			);
			expect(getDisplayedNames(api)).toEqual(['Name 1', 'Name 2', 'Name 3']);
		});
	});

	describe('filters', () => {
		it('should filter rows in client mode and report the filters', async () => {
			const onFilters = vi.fn();
			const { container } = render({ 'onUpdate:filters': onFilters });
			const api = await getApi(container);

			await api.setColumnFilterModel('age-id', {
				filterType: 'number',
				type: 'greaterThan',
				filter: 1,
			});
			api.onFilterChanged('columnFilter');

			await waitFor(() =>
				expect(onFilters).toHaveBeenCalledWith([
					{ field: 'age', operator: 'greaterThan', value: 1 },
				]),
			);
			expect(getDisplayedNames(api)).toEqual(['Name 1', 'Name 2']);
		});

		it('should not filter rows in server mode and revert until the parent updates the filters', async () => {
			const onFilters = vi.fn();
			const { container } = render({
				filterMode: 'server',
				filters: [],
				'onUpdate:filters': onFilters,
			});
			const api = await getApi(container);

			await api.setColumnFilterModel('age-id', {
				filterType: 'number',
				type: 'greaterThan',
				filter: 1,
			});
			api.onFilterChanged('columnFilter');

			await waitFor(() =>
				expect(onFilters).toHaveBeenCalledWith([
					{ field: 'age', operator: 'greaterThan', value: 1 },
				]),
			);
			expect(getDisplayedNames(api)).toEqual(['Name 1', 'Name 2', 'Name 3']);
			await waitFor(() => expect(api.getFilterModel()).toEqual({}));
		});

		it('should apply filters from props', async () => {
			const { container } = render({
				filters: [{ field: 'name', operator: 'contains', value: '2' }],
			});
			const api = await getApi(container);

			await waitFor(() => expect(getDisplayedNames(api)).toEqual(['Name 2']));
		});
	});

	describe('pagination', () => {
		it('should page rows in client mode', async () => {
			const onPage = vi.fn();
			const { container, getByTestId } = render({
				rows: createRows(25),
				itemsPerPage: 10,
				'onUpdate:page': onPage,
			});
			const api = await getApi(container);
			await waitFor(() => expect(api.paginationGetTotalPages()).toBe(3));

			await fireEvent.click(getByTestId('pagination-next'));

			await waitFor(() => expect(onPage).toHaveBeenCalledWith(2));
			expect(api.paginationGetCurrentPage()).toBe(1);
		});

		it('should show all rows and report page changes in server mode', async () => {
			const onPage = vi.fn();
			const { container, getByTestId } = render({
				rows: createRows(10),
				paginationMode: 'server',
				page: 1,
				itemsPerPage: 10,
				total: 40,
				'onUpdate:page': onPage,
				'onUpdate:itemsPerPage': vi.fn(),
			});
			const api = await getApi(container);

			expect(getByTestId('pagination-total')).toHaveTextContent('40');
			await fireEvent.click(getByTestId('pagination-next'));

			await waitFor(() => expect(onPage).toHaveBeenCalledWith(2));
			expect(api.paginationGetTotalPages()).toBe(1);
		});

		it('should not show page controls without pagination', () => {
			const { queryByTestId } = render({ paginationMode: 'none' });

			expect(queryByTestId('data-grid-pagination')).not.toBeInTheDocument();
		});
	});

	describe('editing', () => {
		it('should not allow edits outside of edit mode', async () => {
			const { container } = render();
			const api = await getApi(container);
			const node = api.getRowNode('1');

			expect(node && api.getColumn('name-id')?.isCellEditable(node)).toBe(false);
		});

		it('should respect the editable rule of a column', async () => {
			const { container } = render({
				editable: true,
				columns: [{ ...columns[0], editable: (row: Row) => row.id !== '1' }, columns[1]],
			});
			const api = await getApi(container);
			const column = api.getColumn('name-id');

			expect(column?.isCellEditable(api.getRowNode('1')!)).toBe(false);
			expect(column?.isCellEditable(api.getRowNode('2')!)).toBe(true);
		});

		it('should emit an edit and keep the rows unchanged', async () => {
			const rows = createRows(3);
			const { container, emitted } = render({ editable: true, rows });
			const api = await getApi(container);

			api.getRowNode('1')?.setDataValue('name-id', 'Changed');

			await waitFor(() =>
				expect(emitted('cellEdit')).toEqual([
					[{ rowKey: '1', field: 'name', oldValue: 'Name 1', newValue: 'Changed' }],
				]),
			);
			expect(rows[0].name).toBe('Name 1');
		});

		it('should not emit an edit that does not change the value', async () => {
			const { container, emitted } = render({
				editable: true,
				rows: [{ id: '1', name: null, age: 1 }],
			});
			const api = await getApi(container);

			api.getRowNode('1')?.setDataValue('age-id', 1);
			api.getRowNode('1')?.setDataValue('name-id', '');
			api.getRowNode('1')?.setDataValue('age-id', 2);

			await waitFor(() => expect(emitted('cellEdit')).toHaveLength(1));
			expect(emitted('cellEdit')?.[0]).toEqual([
				{ rowKey: '1', field: 'age', oldValue: 1, newValue: 2 },
			]);
		});

		it('should undo an accepted edit and skip a rejected one', async () => {
			const rows = createRows(2);
			const { container, emitted, rerender } = render({ editable: true, rows });
			const api = await getApi(container);

			api.getRowNode('1')?.setDataValue('name-id', 'Accepted');
			await waitFor(() => expect(emitted('cellEdit')).toHaveLength(1));
			await rerender({ rows: [{ ...rows[0], name: 'Accepted' }, rows[1]] });
			api.getRowNode('2')?.setDataValue('name-id', 'Rejected');
			await waitFor(() => expect(emitted('cellEdit')).toHaveLength(2));

			api.setFocusedCell(0, 'name-id');
			const cell = container.querySelector('[row-index="0"] [col-id="name-id"]');
			if (!cell) throw new Error('Cell not found');
			await fireEvent.keyDown(cell, { key: 'z', ctrlKey: true });

			await waitFor(() =>
				expect(emitted('cellEdit')?.at(-1)).toEqual([
					{ rowKey: '1', field: 'name', oldValue: 'Accepted', newValue: 'Name 1' },
				]),
			);
		});
	});

	describe('selection', () => {
		it('should report selected rows and emit delete-selected on Delete in edit mode', async () => {
			const onSelection = vi.fn();
			const { container, emitted } = render({
				editable: true,
				selectable: true,
				'onUpdate:selectedKeys': onSelection,
			});
			const api = await getApi(container);

			api.getRowNode('2')?.setSelected(true, false, 'checkboxSelected');
			await waitFor(() => expect(onSelection).toHaveBeenLastCalledWith(['2']));

			api.setFocusedCell(0, 'name-id');
			const cell = container.querySelector('[row-index="0"] [col-id="name-id"]');
			if (!cell) throw new Error('Cell not found');
			await fireEvent.keyDown(cell, { key: 'Delete' });

			await waitFor(() => expect(emitted('deleteSelected')).toEqual([[['2']]]));
		});

		it('should apply selected keys from props', async () => {
			const { container } = render({ selectable: true, selectedKeys: ['3'] });
			const api = await getApi(container);

			await waitFor(() =>
				expect(api.getSelectedNodes().map((node) => node.data?.id)).toEqual(['3']),
			);
		});
	});

	describe('columns', () => {
		it('should follow the order of the columns prop', async () => {
			const { container, rerender } = render({ columnsEditable: true });
			const api = await getApi(container);

			await rerender({ columns: [columns[1], columns[0]] });

			await waitFor(() =>
				expect(api.getAllDisplayedColumns().map((column) => column.getColId())).toEqual([
					'age-id',
					'name-id',
				]),
			);
		});

		it('should emit column actions only in column edit mode', async () => {
			const { container, queryByTestId, rerender } = render({
				columns: [{ ...columns[0], actions: [{ id: 'delete', label: 'Delete column' }] }],
			});
			await getApi(container);

			await fireEvent.mouseEnter(getHeader(container, 'Name'));
			expect(queryByTestId('data-grid-column-header-actions')).not.toBeVisible();

			await rerender({ columnsEditable: true });
			await fireEvent.mouseEnter(getHeader(container, 'Name'));
			expect(queryByTestId('data-grid-column-header-actions')).toBeVisible();
		});
	});

	describe('slots', () => {
		it('should render the cell slot for the rows that the column selects', async () => {
			const { container, findByText, queryByText } = renderComponent({
				props: {
					rows: createRows(2),
					columns: [{ ...columns[0], cellSlot: (row: Row) => row.id === '2' }],
					rowKey: 'id',
				},
				slots: { cell: '<template #cell="{ row }">Custom {{ row.id }}</template>' },
			});
			await getApi(container);

			expect(await findByText('Custom 2')).toBeInTheDocument();
			expect(queryByText('Custom 1')).not.toBeInTheDocument();
		});

		it('should render the header-append slot and the footer-row slot in the first column', async () => {
			const { container, findByText, findByTestId } = renderComponent({
				props: { rows: createRows(1), columns, rowKey: 'id' },
				slots: { 'header-append': 'Add column', 'footer-row': 'Add row' },
			});
			await getApi(container);

			expect(await findByText('Add column')).toBeInTheDocument();
			const footer = await findByTestId('data-grid-footer-row');
			expect(footer).toHaveTextContent('Add row');
			expect(footer.closest('.ag-floating-bottom')).not.toBeNull();
			expect(footer.closest('[col-id]')?.getAttribute('col-id')).toBe('name-id');
		});
	});

	describe('header slot', () => {
		it('should render the header slot as the label of the columns that ask for it', async () => {
			const { container, findByText, getByText } = renderComponent({
				props: {
					rows: createRows(1),
					columns: [{ ...columns[0], headerSlot: true }, columns[1]],
					rowKey: 'id',
				},
				slots: { header: '<template #header="{ column }">Custom {{ column.label }}</template>' },
			});
			await getApi(container);

			expect(await findByText('Custom Name')).toBeInTheDocument();
			expect(getByText('Age')).toBeInTheDocument();
		});
	});

	describe('rows', () => {
		it('should let a column grow the row to fit its content', async () => {
			const { container } = render({ columns: [{ ...columns[0], autoHeight: true }, columns[1]] });
			const api = await getApi(container);

			expect(api.getColumn('name-id')?.getColDef()).toMatchObject({
				autoHeight: true,
				wrapText: true,
			});
			expect(api.getColumn('age-id')?.getColDef().autoHeight).toBeFalsy();
		});

		it('should apply row classes and update them when their state changes', async () => {
			const highlighted = ref('1');
			const { container } = render({
				rowClassRules: { 'is-highlighted': (row: Row) => row.id === highlighted.value },
			});
			await getApi(container);
			const rowElement = (rowIndex: number) =>
				container.querySelector(`.ag-center-cols-container [row-index="${rowIndex}"]`);

			await waitFor(() => expect(rowElement(0)).toHaveClass('is-highlighted'));
			expect(rowElement(1)).not.toHaveClass('is-highlighted');

			highlighted.value = '2';

			await waitFor(() => expect(rowElement(1)).toHaveClass('is-highlighted'));
			expect(rowElement(0)).not.toHaveClass('is-highlighted');
		});

		it('should report the hovered cell and when the pointer leaves it', async () => {
			const { container, emitted } = render();
			await getApi(container);
			const cell = container.querySelector('[row-index="1"] [col-id="age-id"]');
			if (!cell) throw new Error('Cell not found');

			await fireEvent.mouseOver(cell);
			await waitFor(() =>
				expect(emitted('cellHover')?.at(-1)).toEqual([{ rowKey: '2', columnId: 'age-id' }]),
			);

			await fireEvent.mouseOut(cell);
			await waitFor(() => expect(emitted('cellHover')?.at(-1)).toEqual([null]));
		});

		it('should report the row when the pointer is on a column that the grid adds', async () => {
			const { container, emitted } = renderComponent({
				props: { rows: createRows(2), columns, rowKey: 'id' },
				slots: { 'header-append': '+' },
			});
			await getApi(container);
			const cell = container.querySelector('[row-index="0"] [col-id="__n8n_data_grid_append__"]');
			if (!cell) throw new Error('Cell not found');

			await fireEvent.mouseOver(cell);

			await waitFor(() =>
				expect(emitted('cellHover')?.at(-1)).toEqual([{ rowKey: '1', columnId: null }]),
			);
		});
	});
});
