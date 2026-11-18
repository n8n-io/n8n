import { createComponentRenderer } from '@/__tests__/render';
import RunDataTable from '@/features/ndv/runData/components/RunDataTable.vue';
import type { TableItem } from '@/features/ndv/runData/tableItems';
import { createTestingPinia } from '@pinia/testing';
import { cleanup, fireEvent, waitFor } from '@testing-library/vue';
import { getGridApi, type GridApi } from 'ag-grid-community';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: 'https://test.com' });
	return {
		useRouter: () => ({
			push,
			resolve,
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

const { trackOpeningRelatedExecution, resolveRelatedExecutionUrl } = vi.hoisted(() => ({
	trackOpeningRelatedExecution: vi.fn(),
	resolveRelatedExecutionUrl: vi.fn().mockReturnValue('https://test.com'),
}));

vi.mock('@/features/execution/executions/composables/useExecutionHelpers', () => ({
	useExecutionHelpers: () => ({
		trackOpeningRelatedExecution,
		resolveRelatedExecutionUrl,
	}),
}));

const SUB_EXECUTION = { subExecution: { executionId: '123', workflowId: '123abcd' } };

const toItems = (items: INodeExecutionData[], firstIndex = 0): TableItem[] =>
	items.map((item, offset) => ({ item, index: firstIndex + offset }));

const fromJson = (...jsons: IDataObject[]) => toItems(jsons.map((json) => ({ json })));

const renderComponent = createComponentRenderer(RunDataTable, {
	props: {
		node: {
			parameters: {
				keepOnlySet: false,
				values: {},
				options: {},
			},
			id: '820ea733-d8a6-4379-8e73-88a2347ea003',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [380, 1060],
			disabled: false,
		},
		columnTypes: {},
		sort: null,
		filters: [],
		distanceFromActive: 0,
		runIndex: 0,
		totalRuns: 0,
		mappingEnabled: false,
		hasDefaultHoverState: false,
		search: '',
		collapsingColumnName: null,
	},
	global: {
		plugins: [createTestingPinia()],
	},
});

const getApi = async (container: Element): Promise<GridApi> => {
	let api: GridApi | undefined;
	await waitFor(() => {
		const gridElement = container.querySelector('[grid-id]')?.parentElement;
		api = gridElement ? getGridApi(gridElement) : undefined;
		expect(container.querySelector('.ag-center-cols-container [row-index="0"]')).not.toBeNull();
	});
	if (!api) throw new Error('Grid API not found');
	return api;
};

const getCell = (container: Element, rowIndex: number, columnId: string) => {
	const cell = [
		...container.querySelectorAll(`.ag-center-cols-container [row-index="${rowIndex}"] .ag-cell`),
	].find((element) => element.getAttribute('col-id') === columnId);
	if (!cell) throw new Error(`Cell ${rowIndex}/${columnId} not found`);
	return cell;
};

const getRow = (container: Element, rowIndex: number) =>
	container.querySelector(`.ag-center-cols-container [row-index="${rowIndex}"]`);

describe('RunDataTable.vue', () => {
	beforeEach(cleanup);

	it('should show the empty item hint and a link to the sub-execution', async () => {
		const { container, findByText, getByTestId } = renderComponent({
			props: {
				items: toItems([{ json: {}, index: 0, pairedItem: { item: 0 }, metadata: SUB_EXECUTION }]),
			},
		});
		await getApi(container);

		expect(await findByText("This is an item, but it's empty.")).toBeInTheDocument();
		expect(getByTestId('debug-sub-execution').tagName).toBe('A');
		expect(getByTestId('debug-sub-execution').getAttribute('href')).toBe('https://test.com');
	});

	it('should show the keys and values of the items', async () => {
		const json = { firstName: 'John', lastName: 'Doe' };
		const { container, findByTestId, getAllByText } = renderComponent({
			props: { items: toItems([{ json, metadata: SUB_EXECUTION }]) },
		});
		await getApi(container);

		expect((await findByTestId('debug-sub-execution')).getAttribute('href')).toBe(
			'https://test.com',
		);
		for (const [key, value] of Object.entries(json)) {
			expect(getAllByText(key)).not.toHaveLength(0);
			expect(getAllByText(value)).not.toHaveLength(0);
		}
	});

	it('should show null and empty values', async () => {
		const cases = [
			{ key: 'emptyString', value: '', expected: 'empty' },
			{ key: 'emptyObject', value: {}, expected: '{empty object}' },
			{ key: 'null', value: null, expected: 'null' },
			{ key: 'nullArray', value: [null], expected: '0:null' },
			{ key: 'arrayWithNull', value: [1, 2, null, 'b'], expected: '2:null' },
			{ key: 'objectWithNull', value: { a: 1, b: null, c: 'boo' }, expected: 'b:null' },
		];
		const { container } = renderComponent({
			props: { items: fromJson(Object.fromEntries(cases.map((c) => [c.key, c.value]))) },
		});
		await getApi(container);

		for (const { key, expected } of cases) {
			await waitFor(() => expect(getCell(container, 0, key)).toHaveTextContent(expected));
			expect(getCell(container, 0, key).querySelector('.empty')).toBeInTheDocument();
		}
	});

	it('should not render `[null]` for a null value', async () => {
		const { container } = renderComponent({ props: { items: fromJson({ null: null }) } });
		await getApi(container);

		expect(container.textContent).not.toContain('[null]');
	});

	it('should collapse the other columns to one line when a collapsing column is set', async () => {
		const items = fromJson({ firstName: 'John', lastName: 'Doe' });
		const { container, rerender } = renderComponent({ props: { items } });
		const api = await getApi(container);
		expect(api.getColumn('lastName')?.getColDef().autoHeight).toBe(true);

		await rerender({ items, collapsingColumnName: 'firstName' });

		await waitFor(() =>
			expect(getCell(container, 0, 'lastName')).toHaveClass('n8n-run-data-collapsed-cell'),
		);
		expect(getCell(container, 0, 'firstName')).not.toHaveClass('n8n-run-data-collapsed-cell');
		expect(api.getColumn('lastName')?.getColDef().autoHeight).toBe(false);
		expect(api.getColumn('firstName')?.getColDef().autoHeight).toBe(true);
	});

	it('should report column collapsing from the header buttons', async () => {
		const { container, emitted, findAllByLabelText } = renderComponent({
			props: {
				items: fromJson({ firstName: 'John', lastName: 'Doe' }),
				collapsingColumnName: 'firstName',
			},
		});
		await getApi(container);
		const buttons = await findAllByLabelText('Collapse rows');
		expect(buttons).toHaveLength(2);

		await fireEvent.click(buttons[0]);
		await fireEvent.click(buttons[1]);

		expect(emitted('collapsingColumnChanged')).toEqual([[null], ['lastName']]);
		expect(emitted('update:sort')).toBeUndefined();
	});

	it('should mark nested keys as mappable with their name, expression and depth', async () => {
		const { container, findByText } = renderComponent({
			props: { items: fromJson({ user: { name: 'John' } }), mappingEnabled: true },
		});
		await getApi(container);

		const key = (await findByText('name')).closest('[data-target="mappable"]');
		expect(key).toHaveAttribute('data-name', 'name');
		expect(key).toHaveAttribute('data-depth', '1');
		expect(key?.getAttribute('data-value')).toContain('user.name');
	});

	it('should report the hovered item index and highlight its row', async () => {
		const items = toItems([{ json: { a: 1 } }, { json: { a: 2 } }], 10);
		const { container, emitted } = renderComponent({ props: { items } });
		await getApi(container);

		await fireEvent.mouseOver(getCell(container, 1, 'a'));

		await waitFor(() => expect(emitted('activeRowChanged')?.at(-1)).toEqual([11]));
		await waitFor(() => expect(getRow(container, 1)).toHaveClass('hovering-item'));
		expect(getRow(container, 0)).not.toHaveClass('hovering-item');

		await fireEvent.mouseOut(getCell(container, 1, 'a'));
		await waitFor(() => expect(emitted('activeRowChanged')?.at(-1)).toEqual([null]));
	});

	it('should report sort requests and show the sort from props', async () => {
		const items = fromJson({ age: 3 }, { age: 1 });
		const { container, emitted, findAllByTestId, rerender, queryByTestId } = renderComponent({
			props: { items, columnTypes: { age: 'number' } },
		});
		await getApi(container);

		const [header] = await findAllByTestId('data-grid-column-header');
		await fireEvent.click(header);

		expect(emitted('update:sort')).toEqual([[{ field: 'age', direction: 'asc' }]]);
		expect(queryByTestId('data-grid-column-header-sort')).not.toBeInTheDocument();

		await rerender({ items, sort: { field: 'age', direction: 'asc' } });
		await waitFor(() => expect(queryByTestId('data-grid-column-header-sort')).toBeInTheDocument());
	});

	it('should keep the columns of the run and of active filters when no item is shown', async () => {
		const { findAllByTestId, queryByText } = renderComponent({
			props: {
				items: [],
				columnTypes: { name: 'string', age: 'number' },
				filters: [{ field: 'removed', operator: 'equals', value: 'x' }],
			},
		});

		const headers = await findAllByTestId('data-grid-column-header');
		expect(headers.map((header) => header.textContent?.trim())).toEqual(['name', 'age', 'removed']);
		expect(queryByText("This is an item, but it's empty.")).not.toBeInTheDocument();
	});

	it('should warn when an item has more columns than the table shows', async () => {
		const json = Object.fromEntries(Array.from({ length: 41 }, (_, i) => [`col${i}`, i]));
		const { container, findByText } = renderComponent({ props: { items: fromJson(json) } });
		const api = await getApi(container);

		expect(await findByText(/columns/i)).toBeInTheDocument();
		expect(api.getColumns()?.filter((column) => column.getColId().startsWith('col'))).toHaveLength(
			40,
		);
	});
});
