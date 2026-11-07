import type { HttpRequestClient } from '@n8n/backend-network';
import { UnimplementedError } from '@n8n/engine';
import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import type { INode, Workflow } from 'n8n-workflow';
import { NodeOperationError, OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { DataTableCall, DataTableCallRequest } from '../engine-data-tables.contract';
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

const filter = {
	type: 'and' as const,
	filters: [{ columnName: 'joined', condition: 'gt' as const, value: new Date(when) }],
};
const wireFilter = {
	type: 'and',
	filters: [{ columnName: 'joined', condition: 'gt', value: when }],
};

describe('RemoteDataTableProxyProvider', () => {
	let http: HttpRequestClient;
	let signal: AbortSignal;
	let provider: RemoteDataTableProxyProvider;

	const respondWith = (statusCode: number, body: unknown) => {
		vi.mocked(http.request).mockResolvedValue({ statusCode, body, headers: {} });
	};

	const answerWith = (data: unknown) => respondWith(200, { data });

	const refuseWith = (error: {
		kind: 'node-operation' | 'user';
		message: string;
		description?: string;
	}) => respondWith(422, { error });

	/** The body of the nth request. */
	const sentRequest = (nth = 0): DataTableCallRequest =>
		vi.mocked(http.request).mock.calls[nth][0].body as DataTableCallRequest;

	/** The call of the nth request, without the envelope. */
	const sentCall = (nth = 0): DataTableCall => sentRequest(nth).call;

	const table = async () => await provider.getDataTableProxy(workflow, node, 'dt-1');

	beforeEach(() => {
		http = mock<HttpRequestClient>();
		signal = new AbortController().signal;
		provider = new RemoteDataTableProxyProvider(http, context, signal);
	});

	describe('transport', () => {
		it('posts the call for the execution and node to the control plane with the step signal', async () => {
			answerWith([]);

			await (await table()).getColumns();

			expect(http.request).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					url: '/internal/data-tables/call',
					method: 'POST',
					body: {
						execution: { executionId: 'exec-1', workflowId: 'wf-1' },
						consumer: { nodeType: 'n8n-nodes-base.dataTable' },
						call: { kind: 'getColumns', dataTableId: 'dt-1' },
					},
					json: true,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
					// So the action token reaches only the configured host.
					disableFollowRedirect: true,
					// So a stopped step stops waiting.
					abortSignal: signal,
				}),
			);
		});

		it.each([
			[302, undefined],
			[500, { message: 'secret row value' }],
		])('throws on a %s, naming the call and the status but not the body', async (status, body) => {
			respondWith(status, body);

			const error = await (await table()).getColumns().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(OperationalError);
			expect((error as Error).message).toBe(
				`Control plane refused data table call "getColumns" with ${status}`,
			);
		});

		it('trusts an error-shaped body only on the refusal status', async () => {
			respondWith(500, { error: { kind: 'user', message: 'not a refusal' } });

			const error = await (await table()).getColumns().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(OperationalError);
		});

		it('reports a result the schema does not accept as a transport failure', async () => {
			answerWith({ count: 'one', data: [] });

			const error = await (await table()).getManyRowsAndCount({}).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(OperationalError);
			expect((error as Error).message).toBe(
				'Control plane returned a malformed result for data table call "getManyRowsAndCount"',
			);
		});
	});

	describe('refusals', () => {
		it('raises a node operation error with the control plane text', async () => {
			refuseWith({
				kind: 'node-operation',
				message: "Data table with ID 'dt-1' could not be found in this project",
				description: 'Choose an existing data table in the node.',
			});

			const error = await (await table()).getColumns().catch((e: unknown) => e);

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

			const error = await (await table()).insertRows([{ nope: 1 }], 'all').catch((e: unknown) => e);

			expect(error).toBeInstanceOf(UserError);
			expect((error as UserError).message).toBe("unknown column name 'nope'");
		});
	});

	describe('aggregate proxy', () => {
		it('asks the control plane for the project once and ignores the v1 override', async () => {
			answerWith('project-1');

			const aggregate = await provider.getDataTableAggregateProxy(workflow, node, 'other-project');

			expect(aggregate.getProjectId()).toBe('project-1');
			expect(http.request).toHaveBeenCalledOnce();
			expect(sentRequest()).toEqual({
				execution: { executionId: 'exec-1', workflowId: 'wf-1' },
				consumer: { nodeType: 'n8n-nodes-base.dataTable' },
				call: { kind: 'getProjectId' },
			});
		});

		it('lists tables with the filter keys v1 honours and revives their timestamps', async () => {
			answerWith('project-1');
			const aggregate = await provider.getDataTableAggregateProxy(workflow, node);
			answerWith({
				count: 1,
				data: [
					{
						id: 'dt-1',
						name: 'people',
						columns: [],
						createdAt: when,
						updatedAt: when,
						projectId: 'project-1',
					},
				],
			});

			const result = await aggregate.getManyAndCount({
				filter: { name: 'people', projectId: 'other-project', owner: 'nobody' },
				take: 1,
			});

			expect(sentCall(1)).toEqual({
				kind: 'getManyAndCount',
				options: { filter: { name: 'people' }, take: 1 },
			});
			expect(result.count).toBe(1);
			expect(result.data[0].createdAt).toEqual(new Date(when));
		});

		it('refuses to delete every table of the project', async () => {
			answerWith('project-1');
			const aggregate = await provider.getDataTableAggregateProxy(workflow, node);

			await expect(aggregate.deleteDataTableAll()).rejects.toThrow(UnimplementedError);
			expect(http.request).toHaveBeenCalledOnce();
		});
	});

	describe('table proxy', () => {
		it('acquires without a round trip, because every operation checks the table', async () => {
			await table();

			expect(http.request).not.toHaveBeenCalled();
		});

		it('sends a date in a row or a filter as its ISO string', async () => {
			answerWith([]);

			await (await table()).updateRows({ filter, data: { joined: new Date(when) }, dryRun: true });

			expect(sentCall()).toEqual({
				kind: 'updateRows',
				dataTableId: 'dt-1',
				options: { filter: wireFilter, data: { joined: when }, dryRun: true },
			});
		});

		it('revives the row timestamps and leaves a date cell as its ISO string', async () => {
			answerWith({ count: 1, data: [wireRow] });

			const { data } = await (await table()).getManyRowsAndCount({});

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

			const result = await (await table()).insertRows([{ name: 'Ada' }], returnType);

			expect(result).toEqual(expected);
		});

		it.each(['upsertRow', 'deleteRows'] as const)(
			'%s returns the before and after rows of a dry run',
			async (operation) => {
				answerWith([
					{ ...wireRow, dryRunState: 'before' },
					{ id: null, createdAt: null, updatedAt: null, name: null, dryRunState: 'after' },
				]);

				const rows = await (await table())[operation]({
					filter,
					data: { name: 'Ada' },
					dryRun: true,
				});

				expect(rows).toHaveLength(2);
				expect(rows[1]).toMatchObject({ id: null, dryRunState: 'after' });
			},
		);
	});
});
