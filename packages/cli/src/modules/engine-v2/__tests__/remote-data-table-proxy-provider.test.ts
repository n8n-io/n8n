import { UnimplementedError } from '@n8n/engine';
import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import type { INode, Workflow } from 'n8n-workflow';
import { NodeOperationError, OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineDataTablesClient } from '../engine-data-tables-client';
import type { DataTableCall } from '../engine-data-tables.contract';
import { RemoteDataTableProxyProvider } from '../remote-data-table-proxy-provider';

const context: AdditionalDataContext = {
	executionId: 'exec-1',
	workflowId: 'wf-1',
	mode: 'manual',
	userId: 'user-1',
	projectId: 'project-1',
};

const node: INode = {
	id: 'node-1',
	name: 'Data Table',
	type: 'n8n-nodes-base.dataTable',
	typeVersion: 1.1,
	position: [0, 0],
	parameters: {},
};

const workflow = mock<Workflow>();

const when = '2026-10-27T10:00:00.000Z';

/** A row as the control plane serialises it: every date an ISO string. */
const wireRow = { id: 1, createdAt: when, updatedAt: when, name: 'Ada', joined: when };

const column = { id: 'col-1', name: 'name', type: 'string', index: 0, dataTableId: 'dt-1' };

const filter = {
	type: 'and' as const,
	filters: [{ columnName: 'joined', condition: 'gt' as const, value: new Date(when) }],
};
const wireFilter = {
	type: 'and',
	filters: [{ columnName: 'joined', condition: 'gt', value: when }],
};

describe('RemoteDataTableProxyProvider', () => {
	let client: EngineDataTablesClient;
	let signal: AbortSignal;
	let provider: RemoteDataTableProxyProvider;

	const answerWith = (data: unknown) => {
		vi.mocked(client.call).mockResolvedValue({ data });
	};

	const refuseWith = (error: {
		kind: 'node-operation' | 'user';
		message: string;
		description?: string;
	}) => {
		vi.mocked(client.call).mockResolvedValue({ error });
	};

	/** The call the client was asked to send, without the envelope. */
	const sentCall = (nth = 0): DataTableCall => vi.mocked(client.call).mock.calls[nth][0].call;

	beforeEach(() => {
		client = mock<EngineDataTablesClient>();
		signal = new AbortController().signal;
		provider = new RemoteDataTableProxyProvider(client, context, signal);
	});

	describe('aggregate proxy', () => {
		it('resolves the project from the control plane once, so getProjectId is synchronous', async () => {
			answerWith('project-1');

			const aggregate = await provider.getDataTableAggregateProxy(workflow, node);

			expect(aggregate.getProjectId()).toBe('project-1');
			expect(client.call).toHaveBeenCalledExactlyOnceWith(
				{
					execution: { executionId: 'exec-1', workflowId: 'wf-1' },
					consumer: { nodeType: 'n8n-nodes-base.dataTable' },
					call: { kind: 'getProjectId' },
				},
				signal,
			);
		});

		it('does not send the v1 project override, because the control plane decides', async () => {
			answerWith('project-1');

			await provider.getDataTableAggregateProxy(workflow, node, 'other-project');

			expect(vi.mocked(client.call).mock.calls[0][0]).not.toHaveProperty('projectId');
		});

		it('lists tables with the given options and revives their timestamps', async () => {
			answerWith('project-1');
			const aggregate = await provider.getDataTableAggregateProxy(workflow, node);
			answerWith({
				count: 1,
				data: [
					{
						id: 'dt-1',
						name: 'people',
						columns: [column],
						createdAt: when,
						updatedAt: when,
						projectId: 'project-1',
					},
				],
			});

			const result = await aggregate.getManyAndCount({ filter: { name: 'people' }, take: 1 });

			expect(sentCall(1)).toEqual({
				kind: 'getManyAndCount',
				options: { filter: { name: 'people' }, take: 1 },
			});
			expect(result.count).toBe(1);
			expect(result.data[0]).toMatchObject({ id: 'dt-1', columns: [column] });
			expect(result.data[0].createdAt).toEqual(new Date(when));
		});

		it('creates a table', async () => {
			answerWith('project-1');
			const aggregate = await provider.getDataTableAggregateProxy(workflow, node);
			answerWith({
				id: 'dt-1',
				name: 'people',
				columns: [],
				createdAt: when,
				updatedAt: when,
				projectId: 'project-1',
			});

			const table = await aggregate.createDataTable({ name: 'people', columns: [] });

			expect(sentCall(1)).toEqual({
				kind: 'createDataTable',
				options: { name: 'people', columns: [] },
			});
			expect(table.id).toBe('dt-1');
		});

		it('refuses to delete every table of the project', async () => {
			answerWith('project-1');
			const aggregate = await provider.getDataTableAggregateProxy(workflow, node);

			await expect(aggregate.deleteDataTableAll()).rejects.toThrow(UnimplementedError);
			expect(client.call).toHaveBeenCalledOnce();
		});
	});

	describe('table proxy', () => {
		it('acquires without a round trip, because every operation checks the table', async () => {
			await provider.getDataTableProxy(workflow, node, 'dt-1');

			expect(client.call).not.toHaveBeenCalled();
		});

		it('names the execution and the node on every call', async () => {
			answerWith([column]);
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			await table.getColumns();

			expect(client.call).toHaveBeenCalledExactlyOnceWith(
				{
					execution: { executionId: 'exec-1', workflowId: 'wf-1' },
					consumer: { nodeType: 'n8n-nodes-base.dataTable' },
					call: { kind: 'getColumns', dataTableId: 'dt-1' },
				},
				signal,
			);
		});

		it.each<
			[
				string,
				(
					table: Awaited<ReturnType<RemoteDataTableProxyProvider['getDataTableProxy']>>,
				) => Promise<unknown>,
				DataTableCall,
				unknown,
			]
		>([
			[
				'updateDataTable',
				async (t) => await t.updateDataTable({ name: 'renamed' }),
				{ kind: 'updateDataTable', dataTableId: 'dt-1', options: { name: 'renamed' } },
				true,
			],
			[
				'deleteDataTable',
				async (t) => await t.deleteDataTable(),
				{ kind: 'deleteDataTable', dataTableId: 'dt-1' },
				true,
			],
			[
				'addColumn',
				async (t) => await t.addColumn({ name: 'name', type: 'string' }),
				{ kind: 'addColumn', dataTableId: 'dt-1', options: { name: 'name', type: 'string' } },
				column,
			],
			[
				'moveColumn',
				async (t) => await t.moveColumn('col-1', { targetIndex: 2 }),
				{ kind: 'moveColumn', dataTableId: 'dt-1', columnId: 'col-1', options: { targetIndex: 2 } },
				true,
			],
			[
				'deleteColumn',
				async (t) => await t.deleteColumn('col-1'),
				{ kind: 'deleteColumn', dataTableId: 'dt-1', columnId: 'col-1' },
				true,
			],
			[
				'clearRows',
				async (t) => await t.clearRows(),
				{ kind: 'clearRows', dataTableId: 'dt-1' },
				{ deletedCount: 3 },
			],
		])('%s sends its call and returns the result', async (_label, run, call, data) => {
			answerWith(data);
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			await expect(run(table)).resolves.toEqual(data);
			expect(sentCall()).toEqual(call);
		});

		it('sends a date in a filter as its ISO string', async () => {
			answerWith({ count: 0, data: [] });
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			await table.getManyRowsAndCount({ filter, sortBy: ['joined', 'DESC'], take: 10, skip: 0 });

			expect(sentCall()).toEqual({
				kind: 'getManyRowsAndCount',
				dataTableId: 'dt-1',
				options: { filter: wireFilter, sortBy: ['joined', 'DESC'], take: 10, skip: 0 },
			});
		});

		it('sends a date in a row as its ISO string', async () => {
			answerWith({ success: true, insertedRows: 1 });
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			await table.insertRows([{ name: 'Ada', joined: new Date(when) }], 'count');

			expect(sentCall()).toEqual({
				kind: 'insertRows',
				dataTableId: 'dt-1',
				rows: [{ name: 'Ada', joined: when }],
				returnType: 'count',
			});
		});

		it('revives the row timestamps and leaves a date cell as its ISO string', async () => {
			answerWith({ count: 1, data: [wireRow] });
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			const { data } = await table.getManyRowsAndCount({});

			expect(data[0].createdAt).toEqual(new Date(when));
			expect(data[0].updatedAt).toEqual(new Date(when));
			expect(data[0]).toMatchObject({ id: 1, name: 'Ada', joined: when });
		});

		it.each([
			// The rows of `all` come back with their timestamps revived.
			['all', [wireRow], [{ ...wireRow, createdAt: new Date(when), updatedAt: new Date(when) }]],
			['id', [{ id: 1 }], [{ id: 1 }]],
			['count', { success: true, insertedRows: 1 }, { success: true, insertedRows: 1 }],
		] as const)('insertRows returns the %s result', async (returnType, data, expected) => {
			answerWith(data);
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			const result = await table.insertRows([{ name: 'Ada' }], returnType);

			expect(result).toEqual(expected);
		});

		it('sends update and upsert with their filter, data and dry run flag', async () => {
			answerWith([]);
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			await table.updateRows({ filter, data: { joined: new Date(when) }, dryRun: true });
			await table.upsertRow({ filter, data: { name: 'Ada' } });

			expect(sentCall(0)).toEqual({
				kind: 'updateRows',
				dataTableId: 'dt-1',
				options: { filter: wireFilter, data: { joined: when }, dryRun: true },
			});
			expect(sentCall(1)).toEqual({
				kind: 'upsertRow',
				dataTableId: 'dt-1',
				options: { filter: wireFilter, data: { name: 'Ada' }, dryRun: undefined },
			});
		});

		it('returns the before and after rows of a dry run', async () => {
			answerWith([
				{ ...wireRow, dryRunState: 'before' },
				{ id: null, createdAt: null, updatedAt: null, name: 'Ada', dryRunState: 'after' },
			]);
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			const rows = await table.upsertRow({ filter, data: { name: 'Ada' }, dryRun: true });

			expect(rows).toHaveLength(2);
			expect(rows[1]).toMatchObject({ id: null, dryRunState: 'after' });
		});

		it('sends deleteRows with its filter and returns the deleted rows', async () => {
			answerWith([wireRow]);
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			const rows = await table.deleteRows({ filter });

			expect(sentCall()).toEqual({
				kind: 'deleteRows',
				dataTableId: 'dt-1',
				options: { filter: wireFilter, dryRun: undefined },
			});
			expect(rows[0].id).toBe(1);
		});
	});

	describe('refusals', () => {
		it('raises a node operation error with the control plane text', async () => {
			refuseWith({
				kind: 'node-operation',
				message: "Data table with ID 'dt-1' could not be found in this project",
				description: 'Choose an existing data table in the node.',
			});
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			const error = await table.getColumns().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeOperationError);
			expect((error as NodeOperationError).message).toBe(
				"Data table with ID 'dt-1' could not be found in this project",
			);
			expect((error as NodeOperationError).description).toBe(
				'Choose an existing data table in the node.',
			);
			expect((error as NodeOperationError).node).toBe(node);
		});

		it('raises a user error with the service message', async () => {
			refuseWith({ kind: 'user', message: "unknown column name 'nope'" });
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			const error = await table.insertRows([{ nope: 1 }], 'all').catch((e: unknown) => e);

			expect(error).toBeInstanceOf(UserError);
			expect((error as UserError).message).toBe("unknown column name 'nope'");
		});

		it('reports a result the schema does not accept as a transport failure', async () => {
			answerWith({ count: 'one', data: [] });
			const table = await provider.getDataTableProxy(workflow, node, 'dt-1');

			const error = await table.getManyRowsAndCount({}).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(OperationalError);
			expect((error as Error).message).toBe(
				'Control plane returned a malformed result for data table call "getManyRowsAndCount"',
			);
		});
	});
});
