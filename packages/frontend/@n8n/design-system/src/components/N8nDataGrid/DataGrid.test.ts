import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { getGridApi, type GridApi } from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import type { MockInstance } from 'vitest';
import type { Component } from 'vue';

import { createComponentRenderer } from '../../__tests__/render';
import { N8nPlugin } from '../../plugin';
import N8nPagination from '../N8nPagination';
import N8nDataGrid from './DataGrid.vue';
import type { DataGridColumn, DataGridExposed } from './DataGrid.types';

const { copySpy } = vi.hoisted(() => ({ copySpy: vi.fn() }));

vi.mock('@n8n/composables/useClipboard', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/composables/useClipboard')>();
	return {
		useClipboard: (...args: Parameters<typeof actual.useClipboard>) => ({
			...actual.useClipboard(...args),
			copy: copySpy,
		}),
	};
});

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

const mountedWrappers: VueWrapper[] = [];

const mountGrid = (props: Record<string, unknown> = {}) => {
	const wrapper = mount(N8nDataGrid, {
		props: { rows: createRows(3), columns, rowKey: 'id', ...props } as never,
		global: { plugins: [N8nPlugin] },
		attachTo: document.body,
	});
	mountedWrappers.push(wrapper);
	return wrapper;
};

const emitGridEvent = (wrapper: VueWrapper, event: string, payload: unknown) =>
	wrapper.findComponent(AgGridVue as Component).vm.$emit(event, payload);

const exposed = (wrapper: VueWrapper) => wrapper.vm as unknown as DataGridExposed;

const getCellElement = (container: Element, rowIndex: number, columnId: string) => {
	const cell = [
		...container.querySelectorAll(`.ag-center-cols-container [row-index="${rowIndex}"] .ag-cell`),
	].find((element) => element.getAttribute('col-id') === columnId);
	if (!cell) throw new Error(`Cell ${rowIndex}/${columnId} not found`);
	return cell;
};

const pasteText = (text: string) => {
	const event = new Event('paste', { bubbles: true });
	Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
	document.dispatchEvent(event);
};

describe('N8nDataGrid', () => {
	let warn: MockInstance<typeof console.warn>;

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn');
	});

	afterEach(() => {
		warn.mockRestore();
		mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
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

	describe('focusCell', () => {
		it('should focus a cell and start editing it', async () => {
			const wrapper = mountGrid({ editable: true });
			const api = await getApi(wrapper.element);

			exposed(wrapper).focusCell('2', 'age', { edit: true });

			await waitFor(() =>
				expect([api.getFocusedCell()?.rowIndex, api.getFocusedCell()?.column.getColId()]).toEqual([
					1,
					'age-id',
				]),
			);
			expect(api.getEditingCells()).toEqual([
				expect.objectContaining({ colId: 'age-id', rowIndex: 1 }),
			]);
		});

		it('should use the first editable column without a field', async () => {
			const wrapper = mountGrid({
				editable: true,
				columns: [{ ...columns[0], editable: false }, columns[1]],
			});
			const api = await getApi(wrapper.element);

			exposed(wrapper).focusCell('1');

			await waitFor(() => expect(api.getFocusedCell()?.column.getColId()).toBe('age-id'));
			expect(api.getEditingCells()).toEqual([]);
		});

		it('should go to the page of the row in client pagination', async () => {
			const wrapper = mountGrid({ rows: createRows(25), itemsPerPage: 10 });
			const api = await getApi(wrapper.element);

			exposed(wrapper).focusCell('23', 'name');

			await waitFor(() => expect(api.paginationGetCurrentPage()).toBe(2));
		});
	});

	describe('clipboard', () => {
		it('should paste text into the focused cell as a value of the column type', async () => {
			const wrapper = mountGrid({ editable: true });
			const api = await getApi(wrapper.element);
			api.setFocusedCell(0, 'age-id');

			pasteText('42');

			expect(wrapper.emitted('cellEdit')).toEqual([
				[{ rowKey: '1', field: 'age', oldValue: 3, newValue: 42 }],
			]);
		});

		it('should ignore pasted text that does not fit the column type', async () => {
			const wrapper = mountGrid({ editable: true });
			const api = await getApi(wrapper.element);
			api.setFocusedCell(0, 'age-id');

			pasteText('not a number');

			expect(wrapper.emitted('cellEdit')).toBeUndefined();
		});

		it('should not paste outside of edit mode', async () => {
			const wrapper = mountGrid();
			const api = await getApi(wrapper.element);
			api.setFocusedCell(0, 'name-id');

			pasteText('Changed');

			expect(wrapper.emitted('cellEdit')).toBeUndefined();
		});

		it('should copy the value of the focused cell', async () => {
			const { container } = render();
			const api = await getApi(container);
			api.setFocusedCell(1, 'age-id');

			await fireEvent.keyDown(getCellElement(container, 1, 'age-id'), { key: 'c', ctrlKey: true });

			await waitFor(() => expect(copySpy).toHaveBeenCalledWith('2'));
		});
	});

	describe('keyboard', () => {
		it('should clear the selection on Escape', async () => {
			const onSelection = vi.fn();
			const { container } = render({
				selectable: true,
				selectedKeys: ['1'],
				'onUpdate:selectedKeys': onSelection,
			});
			const api = await getApi(container);
			api.setFocusedCell(0, 'name-id');

			await fireEvent.keyDown(getCellElement(container, 0, 'name-id'), { key: 'Escape' });

			await waitFor(() => expect(onSelection).toHaveBeenLastCalledWith([]));
		});

		it('should ignore shortcuts while a cell is in edit mode', async () => {
			const { container, emitted } = render({
				editable: true,
				selectable: true,
				selectedKeys: ['1'],
			});
			const api = await getApi(container);
			api.startEditingCell({ rowIndex: 0, colKey: 'age-id' });
			await waitFor(() => expect(api.getEditingCells()).toHaveLength(1));

			await fireEvent.keyDown(getCellElement(container, 0, 'age-id'), { key: 'Delete' });

			expect(emitted('deleteSelected')).toBeUndefined();
		});

		it('should start editing when the focused cell is clicked again', async () => {
			const { container } = render({ editable: true });
			const api = await getApi(container);
			const cell = getCellElement(container, 0, 'age-id');

			await fireEvent.click(cell);
			await waitFor(() => expect(api.getEditingCells()).toHaveLength(0));
			await fireEvent.click(cell);

			await waitFor(() => expect(api.getEditingCells()).toHaveLength(1));
		});

		it('should stop editing when edit mode turns off', async () => {
			const { container, rerender } = render({ editable: true });
			const api = await getApi(container);
			api.startEditingCell({ rowIndex: 0, colKey: 'age-id' });
			await waitFor(() => expect(api.getEditingCells()).toHaveLength(1));

			await rerender({ editable: false });

			await waitFor(() => expect(api.getEditingCells()).toHaveLength(0));
		});
	});

	describe('grid events', () => {
		it('should report a column drop with its index in the columns prop and keep the order of the prop', async () => {
			const wrapper = mountGrid({ columnsEditable: true });
			const api = await getApi(wrapper.element);
			api.moveColumns(['age-id'], 0);

			emitGridEvent(wrapper, 'column-moved', {
				api,
				finished: true,
				source: 'uiColumnMoved',
				column: api.getColumn('age-id'),
			});

			expect(wrapper.emitted('columnMove')).toEqual([[{ columnId: 'age-id', toIndex: 0 }]]);
			await waitFor(() =>
				expect(api.getAllDisplayedColumns().map((column) => column.getColId())).toEqual([
					'name-id',
					'age-id',
				]),
			);
		});

		it('should ignore column moves that do not come from the user', async () => {
			const wrapper = mountGrid({ columnsEditable: true });
			const api = await getApi(wrapper.element);

			emitGridEvent(wrapper, 'column-moved', {
				api,
				finished: true,
				source: 'api',
				column: api.getColumn('age-id'),
			});

			expect(wrapper.emitted('columnMove')).toBeUndefined();
		});

		it('should report a sort that AG Grid applies from the keyboard and keep the sort of the props in server mode', async () => {
			const onSort = vi.fn();
			const wrapper = mountGrid({ sortMode: 'server', sort: null, 'onUpdate:sort': onSort });
			const api = await getApi(wrapper.element);
			api.applyColumnState({ state: [{ colId: 'age-id', sort: 'desc' }] });

			emitGridEvent(wrapper, 'sort-changed', { api, source: 'uiColumnSorted' });

			expect(onSort).toHaveBeenCalledWith({ field: 'age', direction: 'desc' });
			expect(api.getColumnState().find((state) => state.colId === 'age-id')?.sort).toBeNull();
		});
	});

	describe('client pagination', () => {
		it('should change the page size and go to the first page', async () => {
			const onItemsPerPage = vi.fn();
			const wrapper = mountGrid({
				rows: createRows(45),
				page: 2,
				itemsPerPage: 10,
				'onUpdate:itemsPerPage': onItemsPerPage,
			});
			const api = await getApi(wrapper.element);
			await waitFor(() => expect(api.paginationGetCurrentPage()).toBe(1));

			wrapper.findComponent(N8nPagination).vm.$emit('update:itemsPerPage', 20);
			await flushPromises();

			expect(onItemsPerPage).toHaveBeenCalledWith(20);
			await waitFor(() => expect(api.paginationGetPageSize()).toBe(20));
			expect(api.paginationGetCurrentPage()).toBe(0);
		});

		it('should follow page changes from props', async () => {
			const { container, rerender } = render({ rows: createRows(45), itemsPerPage: 10 });
			const api = await getApi(container);

			await rerender({ page: 3 });

			await waitFor(() => expect(api.paginationGetCurrentPage()).toBe(2));
		});
	});

	describe('props after mount', () => {
		it('should apply new sort, filters and selected keys from props', async () => {
			const { container, rerender } = render({ selectable: true });
			const api = await getApi(container);

			await rerender({
				sort: { field: 'name', direction: 'desc' },
				filters: [{ field: 'age', operator: 'lessThan', value: 3 }],
				selectedKeys: ['2'],
			});

			await waitFor(() => expect(getDisplayedNames(api)).toEqual(['Name 3', 'Name 2']));
			await waitFor(() =>
				expect(api.getSelectedNodes().map((node) => node.data?.id)).toEqual(['2']),
			);
		});
	});

	describe('cell editors', () => {
		it('should edit text in a large text editor that starts empty for null', async () => {
			const { container } = render({ editable: true, rows: [{ id: '1', name: null, age: 1 }] });
			const api = await getApi(container);
			const colDef = api.getColumn('name-id')?.getColDef();

			expect(colDef).toMatchObject({ cellEditor: 'agLargeTextCellEditor', cellEditorPopup: true });
			const editorParams = colDef?.cellEditorParams as (params: { value: unknown }) => {
				value: unknown;
			};
			expect(editorParams({ value: null }).value).toBe('');
		});

		it('should edit dates in a popup date editor', async () => {
			const { container } = render({
				columns: [{ id: 'at-id', field: 'at', label: 'At', type: 'date' }],
				rows: [{ id: '1', at: '2026-01-01T00:00:00Z' }],
			});
			const api = await getApi(container);

			expect(api.getColumn('at-id')?.getColDef()).toMatchObject({ cellEditorPopup: true });
			expect(api.getColumn('at-id')?.getColDef().cellEditor).toBeTypeOf('object');
		});
	});

	describe('column header', () => {
		const renameableColumns = [{ ...columns[0], renameable: true }, columns[1]];

		it('should report a renamed column label', async () => {
			const { container, emitted, findByTestId } = render({
				columns: renameableColumns,
				columnsEditable: true,
			});
			await getApi(container);

			await userEvent.click(await findByTestId('inline-edit-preview'));
			const input = await findByTestId('inline-edit-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'Full name');
			await userEvent.keyboard('{Enter}');

			expect(emitted('columnRename')).toEqual([[{ columnId: 'name-id', label: 'Full name' }]]);
			expect(emitted('update:sort')).toBeUndefined();
		});

		it('should sort when the label of a renameable column is clicked outside column edit mode', async () => {
			const onSort = vi.fn();
			const { container } = render({ columns: renameableColumns, 'onUpdate:sort': onSort });
			await getApi(container);

			await fireEvent.click(
				within(getHeader(container, 'Name') as HTMLElement).getByTestId(
					'data-grid-column-header-text',
				),
			);

			await waitFor(() => expect(onSort).toHaveBeenCalledWith({ field: 'name', direction: 'asc' }));
		});

		it('should not report an empty or unchanged label', async () => {
			const { container, emitted, findByTestId } = render({
				columns: renameableColumns,
				columnsEditable: true,
			});
			await getApi(container);

			await userEvent.click(await findByTestId('inline-edit-preview'));
			await userEvent.clear(await findByTestId('inline-edit-input'));
			await userEvent.keyboard('{Enter}');

			expect(emitted('columnRename')).toBeUndefined();
		});

		it('should report a selected column action', async () => {
			const { container, emitted, findByTestId } = render({
				columns: [{ ...columns[0], actions: [{ id: 'delete', label: 'Delete column' }] }],
				columnsEditable: true,
			});
			await getApi(container);

			const actions = await findByTestId('data-grid-column-header-actions');
			await userEvent.click(actions.querySelector('button') ?? actions);
			await userEvent.click(await findByTestId('data-grid-column-header-actions-item-delete'));

			expect(emitted('columnAction')).toEqual([[{ columnId: 'name-id', actionId: 'delete' }]]);
		});

		it('should close the open column menu when column edit mode turns off', async () => {
			const { container, findByTestId, queryByTestId, rerender } = render({
				columns: [{ ...columns[0], actions: [{ id: 'delete', label: 'Delete column' }] }],
				columnsEditable: true,
			});
			await getApi(container);
			const actions = await findByTestId('data-grid-column-header-actions');
			await userEvent.click(actions.querySelector('button') ?? actions);
			await findByTestId('data-grid-column-header-actions-item-delete');

			await rerender({ columnsEditable: false });

			await waitFor(() =>
				expect(
					queryByTestId('data-grid-column-header-actions-item-delete'),
				).not.toBeInTheDocument(),
			);
		});

		it('should open the filter of the column from the filter button', async () => {
			const { container } = render();
			await getApi(container);
			const header = getHeader(container, 'Name');

			await fireEvent.mouseEnter(header);
			await fireEvent.click(
				within(header as HTMLElement).getByTestId('data-grid-column-header-filter-button'),
			);

			await waitFor(() => expect(container.querySelector('.ag-filter')).not.toBeNull());
		});
	});
});
