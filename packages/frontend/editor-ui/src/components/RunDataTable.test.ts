import { createComponentRenderer } from '@/__tests__/render';
import RunDataTable from '@/components/RunDataTable.vue';
import { createTestingPinia } from '@pinia/testing';
import { cleanup, fireEvent, waitFor, within } from '@testing-library/vue';
import type { INodeExecutionData } from 'n8n-workflow';
import { nextTick } from 'vue';

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

vi.mock('@/composables/useExecutionHelpers', () => ({
	useExecutionHelpers: () => ({
		trackOpeningRelatedExecution,
		resolveRelatedExecutionUrl,
	}),
}));

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
		distanceFromActive: 0,
		pageOffset: 0,
		runIndex: 0,
		totalRuns: 0,
		mappingEnabled: false,
		hasDefaultHoverState: false,
		search: '',
	},
	global: {
		plugins: [createTestingPinia()],
	},
});

describe('RunDataTable.vue', () => {
	beforeEach(cleanup);

	it('renders empty table correctly', () => {
		const emptyInputData: INodeExecutionData[] = [
			{
				json: {},
				index: 0,
				pairedItem: { item: 0 },
				metadata: { subExecution: { executionId: '123', workflowId: '123abcd' } },
			},
		];
		const emptyMessage = "This is an item, but it's empty.";

		const { getByTestId, getByText } = renderComponent({
			props: {
				inputData: emptyInputData,
			},
		});
		expect(getByText(emptyMessage)).toBeInTheDocument();
		// Sub-execution button should be link (ADO-3057)
		expect(getByTestId('debug-sub-execution')).toBeInTheDocument();
		expect(getByTestId('debug-sub-execution').tagName).toBe('A');
		expect(getByTestId('debug-sub-execution').getAttribute('href')).toBe('https://test.com');
	});

	it('renders table with items correctly', () => {
		const inputData = {
			json: { firstName: 'John', lastName: 'Doe' },
			index: 0,
			pairedItem: { item: 0 },
			metadata: { subExecution: { executionId: '123', workflowId: '123abcd' } },
		};
		const { getByTestId, getAllByText } = renderComponent({
			props: {
				inputData: [inputData],
			},
		});
		expect(getByTestId('debug-sub-execution')).toBeInTheDocument();
		expect(getByTestId('debug-sub-execution').tagName).toBe('A');
		expect(getByTestId('debug-sub-execution').getAttribute('href')).toBe('https://test.com');
		// All keys from the input data should be rendered
		Object.keys(inputData.json).forEach((key) => {
			expect(getAllByText(key)).not.toHaveLength(0);
		});
		// Also, all values from the input data should be rendered
		Object.values(inputData.json).forEach((value) => {
			expect(getAllByText(value)).not.toHaveLength(0);
		});
	});

	it('renders null values correctly', () => {
		function getFirstTableCellForColumn(container: HTMLElement, columnName: string) {
			const headers = within(container).getAllByRole('columnheader');
			const header = within(container).getByRole('columnheader', { name: columnName });
			const columnIndex = headers.indexOf(header);
			const firstRow = within(container).getAllByRole('row')[1];
			const cells = within(firstRow).getAllByRole('cell');
			const cell = cells[columnIndex];
			return cell;
		}

		const cases = [
			{ key: 'emptyString', value: '', expected: 'empty' },
			{ key: 'emptyObject', value: {}, expected: '{empty object}' },
			{ key: 'null', value: null, expected: 'null' },
			{ key: 'nullArray', value: [null], expected: '0:null' },
			{ key: 'arrayWithNull', value: [1, 2, null, 'b'], expected: '2:null' },
			{ key: 'objectWithNull', value: { a: 1, b: null, c: 'boo' }, expected: 'b:null' },
		];
		const inputData = [{ json: Object.fromEntries(cases.map((c) => [c.key, c.value])) }];
		const { container } = renderComponent({
			props: { inputData },
		});

		for (const { key: columnName, expected } of cases) {
			const cell = getFirstTableCellForColumn(container as HTMLElement, columnName);
			expect(cell).toHaveTextContent(expected);
			expect(cell.querySelector('.empty')).toBeInTheDocument();
		}
	});

	it('only renders `[null]` for empty arrays', () => {
		const inputData = { json: { null: null } }; // should not render "[null]"

		const { container } = renderComponent({
			props: { inputData: [inputData] },
		});
		const spans = container.textContent;

		expect(spans).not.toContain('[null]');
	});

	it('inserts col elements in DOM to specify column widths when collapsing column name is specified', async () => {
		const inputData = { json: { firstName: 'John', lastName: 'Doe' } };
		const rendered = renderComponent({
			props: {
				inputData: [inputData],
				collapsingColumnName: null,
			},
		});

		await nextTick();

		expect(rendered.container.querySelectorAll('col')).toHaveLength(0);

		await rendered.rerender({
			inputData: [inputData],
			collapsingColumnName: 'firstName',
		});

		await waitFor(() => expect(rendered.container.querySelectorAll('col')).toHaveLength(3)); // two data columns + one right margin column

		await rendered.rerender({
			inputData: [inputData],
			collapsingColumnName: null,
		});

		await waitFor(() => expect(rendered.container.querySelectorAll('col')).toHaveLength(0));
	});

	it('shows the button for column collapsing in the column header', async () => {
		const inputData = { json: { firstName: 'John', lastName: 'Doe' } };
		const rendered = renderComponent({
			props: {
				inputData: [inputData],
				collapsingColumnName: 'firstName',
			},
		});

		expect(rendered.getAllByLabelText('Collapse rows')).toHaveLength(2);

		await fireEvent.click(rendered.getAllByLabelText('Collapse rows')[0]);
		await fireEvent.click(rendered.getAllByLabelText('Collapse rows')[1]);
		expect(rendered.emitted('collapsingColumnChanged')).toEqual([[null], ['lastName']]);
	});
});
