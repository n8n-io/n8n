import type {
	DataTable,
	DataTableExpressionProxy,
	DataTableRowReturn,
	IExecuteData,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	ListDataTableRowsOptions,
	NodeParameterValue,
	Workflow,
} from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { prefetchDataTableRows } from '../data-table-expressions';

const row = (id: number, extra: Record<string, unknown> = {}) =>
	({ id, createdAt: new Date(0), updatedAt: new Date(0), ...extra }) as DataTableRowReturn;

const table = { id: 'table-1', name: 'users', columns: [] } as unknown as DataTable;

describe('prefetchDataTableRows', () => {
	const runExecutionData = mock<IRunExecutionData>();
	const executeData = mock<IExecuteData>();

	type GetManyRows = ReturnType<DataTableExpressionProxy['rows']>['getManyRowsAndCount'];

	let getRows: MockedFunction<GetManyRows>;
	let service: DataTableExpressionProxy;

	beforeEach(() => {
		getRows = vi.fn<GetManyRows>().mockResolvedValue({ count: 0, data: [] });
		service = {
			tables: { getManyAndCount: async () => ({ count: 1, data: [table] }) },
			rows: () => ({ getManyRowsAndCount: getRows }),
		};
	});

	const run = async (
		parameters: INode['parameters'],
		items: INodeExecutionData[] = [{ json: {} }],
	) => {
		const node = mock<INode>({ name: 'Node', parameters });
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			'data-table': {
				dataTableProxyProvider: mock({ getDataTableExpressionProxy: async () => service }),
			},
			dataTableProjectId: 'project-1',
			dataTableExpressionRows: undefined,
			webhookWaitingBaseUrl: 'https://webhook.test',
			formWaitingBaseUrl: 'https://form.test',
		});
		// Resolves `={{ $json.<field> }}` against the item at `itemIndex`.
		const workflow = mock<Workflow>({
			expression: mock<Workflow['expression']>({
				resolveSimpleParameterValue: (
					value: unknown,
					_sibling: unknown,
					_run: unknown,
					_runIndex: number,
					itemIndex: number,
				) => {
					const field = /\$json\.(\w+)/.exec(String(value))?.[1];
					const resolved = field ? items[itemIndex]?.json[field] : undefined;
					return resolved as NodeParameterValue;
				},
			}),
		});

		await prefetchDataTableRows({
			workflow,
			node,
			additionalData,
			runExecutionData,
			runIndex: 0,
			connectionInputData: items,
			mode: 'manual',
			executeData,
		});

		return additionalData.dataTableExpressionRows?.Node;
	};

	it('does nothing when the node has no reference', async () => {
		expect(await run({ url: '={{ $json.id }}' })).toBeUndefined();
		expect(getRows).not.toHaveBeenCalled();
	});

	it('fetches the first and last row with one row each', async () => {
		getRows.mockImplementation(async (options: Partial<ListDataTableRowsOptions>) => ({
			count: 1,
			data: [row(options.sortBy?.[1] === 'ASC' ? 1 : 9)],
		}));

		const rows = await run({
			a: '={{ $datatable.users.first.email }}',
			b: '={{ $datatable.users.last.email }}',
		});

		expect(rows?.users.first?.id).toBe(1);
		expect(rows?.users.last?.id).toBe(9);
		expect(getRows).toHaveBeenCalledTimes(2);
	});

	it('runs one query for each distinct row key', async () => {
		getRows.mockImplementation(async (options: Partial<ListDataTableRowsOptions>) => {
			const id = Number(options.filter?.filters[0].value);
			return { count: 1, data: [row(id)] };
		});

		const rows = await run({ a: '={{ $datatable.users.row[$json.userId].plan }}' }, [
			{ json: { userId: 1 } },
			{ json: { userId: 2 } },
			{ json: { userId: 1 } },
		]);

		expect(getRows).toHaveBeenCalledTimes(2);
		expect(getRows.mock.calls[0][0]).toEqual({
			filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
			sortBy: ['id', 'ASC'],
			take: 1,
		});
		expect(rows?.users.row['1'].id).toBe(1);
		expect(rows?.users.row['2'].id).toBe(2);
	});

	it('leaves an id with no row absent', async () => {
		getRows.mockResolvedValue({ count: 0, data: [] });

		const rows = await run({ a: '={{ $datatable.users.row[$json.userId].plan }}' }, [
			{ json: { userId: 99 } },
		]);

		expect(rows?.users.row['99']).toBeUndefined();
	});

	it('treats a key the column rejects as a missing row', async () => {
		getRows.mockRejectedValue(new Error('does not match column type'));

		const rows = await run({ a: '={{ $datatable.users.row[$json.userId].plan }}' }, [
			{ json: { userId: 'not-an-id' } },
		]);

		expect(rows?.users.row).toEqual({});
	});

	it('stores a column lookup under the requested value', async () => {
		getRows.mockImplementation(async (options: Partial<ListDataTableRowsOptions>) => {
			const value = options.filter?.filters[0].value;
			return value === 'a@b.c'
				? { count: 1, data: [row(7, { email: value })] }
				: { count: 0, data: [] };
		});

		const rows = await run({ a: '={{ $datatable.users.by.email[$json.email].plan }}' }, [
			{ json: { email: 'a@b.c' } },
			{ json: { email: 'missing@b.c' } },
		]);

		expect(getRows.mock.calls[0][0].filter).toEqual({
			type: 'and',
			filters: [{ columnName: 'email', condition: 'eq', value: 'a@b.c' }],
		});
		expect(rows?.users.by.email['a@b.c'].id).toBe(7);
		expect(rows?.users.by.email['missing@b.c']).toBeUndefined();
	});

	it('skips a table the workflow project cannot reach', async () => {
		expect(await run({ a: '={{ $datatable.secrets.first.value }}' })).toEqual({});
		expect(getRows).not.toHaveBeenCalled();
	});

	it('does nothing when the data table module is disabled', async () => {
		const node = mock<INode>({ name: 'Node', parameters: { a: '={{ $datatable.users.first }}' } });
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			'data-table': undefined,
			dataTableExpressionRows: undefined,
		});

		await prefetchDataTableRows({
			workflow: mock<Workflow>(),
			node,
			additionalData,
			runExecutionData,
			runIndex: 0,
			connectionInputData: [],
			mode: 'manual',
			executeData,
		});

		expect(additionalData.dataTableExpressionRows).toBeUndefined();
	});
});
