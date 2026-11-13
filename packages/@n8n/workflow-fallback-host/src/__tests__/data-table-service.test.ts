/**
 * Data tables of a step that has a service channel (`data-table.ts`): every
 * call of the Data Table node goes to n8n as a `dataTable` service call, and
 * the answer comes back as n8n's proxy types. Without a channel, the host uses
 * the file store, and only when WF_FALLBACK_DATA_TABLES_DIR is set.
 */
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { IDataTableProjectService, INode, Workflow } from 'n8n-workflow';

import { ServiceDataTableProvider } from '../data-table';
import { NodeStepRunner, parseNodeStepArgs } from '../node-step';
import type { JsonObject, JsonValue } from '../protocol';
import type { ServiceChannel } from '../service-calls';
import { ServiceCallError, withServiceChannel } from '../service-calls';

type Answer = JsonValue | ((args: unknown) => JsonValue);

interface Call {
	service: string;
	op: string;
	args: unknown;
}

/** A channel that answers the ops by name and records each call, as a step's channel does. */
function fakeChannel(answers: Record<string, Answer>) {
	const calls: Call[] = [];
	const channel: ServiceChannel = {
		call: async (service, op, args) => {
			calls.push({ service, op, args });
			const answer = answers[op];
			if (answer === undefined) throw new ServiceCallError(`The test has no answer for "${op}"`);
			return typeof answer === 'function' ? answer(args) : answer;
		},
	};
	return { channel, calls };
}

/** The provider reads neither the workflow nor the node. */
const workflow = {} as Workflow;
const node = {} as INode;

const provider = new ServiceDataTableProvider();

const tableJson: JsonValue = {
	id: 'dt1',
	name: 'people',
	// The list query does not select `dataTableId` on a column.
	columns: [{ id: 'c1', name: 'name', type: 'string', index: 0 }],
	createdAt: '2024-05-06T07:08:09.000Z',
	updatedAt: '2024-05-07T07:08:09.000Z',
	projectId: 'project-1',
};

const columnJson: JsonValue = {
	id: 'c1',
	name: 'name',
	type: 'string',
	index: 0,
	dataTableId: 'dt1',
};

const rowJson: JsonValue = {
	id: 2,
	createdAt: '2024-05-06T07:08:09.000Z',
	updatedAt: '2024-05-06T07:08:09.000Z',
	name: 'Bob',
	city: 'Paris',
};

const dryRunRowJson: JsonValue = {
	id: 2,
	createdAt: '2024-05-06T07:08:09.000Z',
	updatedAt: '2024-05-06T07:08:09.000Z',
	name: 'Bob',
	dryRunState: 'before',
};

const when = new Date('2024-05-06T07:08:09.000Z');
const filter = {
	type: 'and' as const,
	filters: [{ columnName: 'when', condition: 'gte' as const, value: when }],
};
const wireFilter = {
	type: 'and',
	filters: [{ columnName: 'when', condition: 'gte', value: '2024-05-06T07:08:09.000Z' }],
};

const rowAnswer: JsonValue = {
	id: 2,
	createdAt: '2024-05-06T07:08:09.000Z',
	updatedAt: '2024-05-06T07:08:09.000Z',
	name: 'Bob',
};

/** Each method of one table's service, with the op and args that n8n's contract expects. */
const tableCases: Array<{
	name: string;
	call: (proxy: IDataTableProjectService) => Promise<unknown>;
	op: string;
	args: unknown;
	answer: JsonValue;
	expected: unknown;
}> = [
	{
		name: 'updateDataTable',
		call: async (proxy) => await proxy.updateDataTable({ name: 'people 2' }),
		op: 'updateDataTable',
		args: { dataTableId: 'dt1', options: { name: 'people 2' } },
		answer: true,
		expected: true,
	},
	{
		name: 'deleteDataTable',
		call: async (proxy) => await proxy.deleteDataTable(),
		op: 'deleteDataTable',
		args: { dataTableId: 'dt1' },
		answer: true,
		expected: true,
	},
	{
		name: 'getColumns',
		call: async (proxy) => await proxy.getColumns(),
		op: 'getColumns',
		args: { dataTableId: 'dt1' },
		answer: [columnJson],
		expected: [{ id: 'c1', name: 'name', type: 'string', index: 0, dataTableId: 'dt1' }],
	},
	{
		name: 'addColumn',
		call: async (proxy) => await proxy.addColumn({ name: 'city', type: 'string' }),
		op: 'addColumn',
		args: { dataTableId: 'dt1', options: { name: 'city', type: 'string' } },
		answer: { ...(columnJson as JsonObject), id: 'c2', name: 'city', index: 1 },
		expected: { id: 'c2', name: 'city', type: 'string', index: 1, dataTableId: 'dt1' },
	},
	{
		name: 'moveColumn',
		call: async (proxy) => await proxy.moveColumn('c1', { targetIndex: 2 }),
		op: 'moveColumn',
		args: { dataTableId: 'dt1', columnId: 'c1', options: { targetIndex: 2 } },
		answer: true,
		expected: true,
	},
	{
		name: 'deleteColumn',
		call: async (proxy) => await proxy.deleteColumn('c1'),
		op: 'deleteColumn',
		args: { dataTableId: 'dt1', columnId: 'c1' },
		answer: true,
		expected: true,
	},
	{
		name: 'getManyRowsAndCount',
		call: async (proxy) =>
			await proxy.getManyRowsAndCount({ filter, sortBy: ['when', 'ASC'], take: 5, skip: 10 }),
		op: 'getManyRowsAndCount',
		// A Date goes as its ISO text; n8n gives a date filter value its Date back.
		args: {
			dataTableId: 'dt1',
			options: { filter: wireFilter, sortBy: ['when', 'ASC'], take: 5, skip: 10 },
		},
		answer: { count: 1, data: [rowJson] },
		expected: {
			count: 1,
			data: [
				{
					id: 2,
					createdAt: new Date('2024-05-06T07:08:09.000Z'),
					updatedAt: new Date('2024-05-06T07:08:09.000Z'),
					name: 'Bob',
					city: 'Paris',
				},
			],
		},
	},
	{
		name: 'insertRows',
		call: async (proxy) => await proxy.insertRows([{ name: 'Cy', when }], 'all'),
		op: 'insertRows',
		args: {
			dataTableId: 'dt1',
			rows: [{ name: 'Cy', when: '2024-05-06T07:08:09.000Z' }],
			returnType: 'all',
		},
		answer: [rowJson],
		expected: [
			{
				id: 2,
				createdAt: new Date('2024-05-06T07:08:09.000Z'),
				updatedAt: new Date('2024-05-06T07:08:09.000Z'),
				name: 'Bob',
				city: 'Paris',
			},
		],
	},
	{
		name: 'insertRows with a count',
		call: async (proxy) => await proxy.insertRows([{ name: 'Cy' }], 'count'),
		op: 'insertRows',
		args: { dataTableId: 'dt1', rows: [{ name: 'Cy' }], returnType: 'count' },
		answer: { success: true, insertedRows: 1 },
		expected: { success: true, insertedRows: 1 },
	},
	{
		name: 'updateRows',
		call: async (proxy) => await proxy.updateRows({ filter, data: { name: 'Cy' }, dryRun: true }),
		op: 'updateRows',
		args: {
			dataTableId: 'dt1',
			options: { filter: wireFilter, data: { name: 'Cy' }, dryRun: true },
		},
		answer: [dryRunRowJson],
		expected: [
			{
				id: 2,
				createdAt: new Date('2024-05-06T07:08:09.000Z'),
				updatedAt: new Date('2024-05-06T07:08:09.000Z'),
				name: 'Bob',
				dryRunState: 'before',
			},
		],
	},
	{
		name: 'upsertRow',
		call: async (proxy) => await proxy.upsertRow({ filter, data: { name: 'Cy' } }),
		op: 'upsertRow',
		args: {
			dataTableId: 'dt1',
			options: { filter: wireFilter, data: { name: 'Cy' } },
		},
		answer: [rowAnswer],
		expected: [
			{
				id: 2,
				createdAt: new Date('2024-05-06T07:08:09.000Z'),
				updatedAt: new Date('2024-05-06T07:08:09.000Z'),
				name: 'Bob',
			},
		],
	},
	{
		name: 'deleteRows',
		call: async (proxy) => await proxy.deleteRows({ filter }),
		op: 'deleteRows',
		args: { dataTableId: 'dt1', options: { filter: wireFilter } },
		answer: [rowAnswer],
		expected: [
			{
				id: 2,
				createdAt: new Date('2024-05-06T07:08:09.000Z'),
				updatedAt: new Date('2024-05-06T07:08:09.000Z'),
				name: 'Bob',
			},
		],
	},
	{
		name: 'clearRows',
		call: async (proxy) => await proxy.clearRows(),
		op: 'clearRows',
		args: { dataTableId: 'dt1' },
		answer: { deletedCount: 3 },
		expected: { deletedCount: 3 },
	},
];

describe('ServiceDataTableProvider of one table', () => {
	it.each(tableCases)('sends "$name" with the args of the contract', async (testCase) => {
		const { channel, calls } = fakeChannel({ [testCase.op]: testCase.answer });
		const proxy = await withServiceChannel(
			channel,
			async () => await provider.getDataTableProxy(workflow, node, 'dt1'),
		);
		const result = await withServiceChannel(channel, async () => await testCase.call(proxy));

		// n8n resolves the project of the workflow itself, so a table call names only its table.
		expect(calls).toEqual([{ service: 'dataTable', op: testCase.op, args: testCase.args }]);
		expect(result).toEqual(testCase.expected);
	});

	it('throws the message that n8n sent for a refused call', async () => {
		const refused = 'Data table with id "dt1" not found';
		const { channel } = fakeChannel({
			deleteDataTable: () => {
				throw new ServiceCallError(refused);
			},
		});
		const proxy = await withServiceChannel(
			channel,
			async () => await provider.getDataTableProxy(workflow, node, 'dt1'),
		);
		await expect(
			withServiceChannel(channel, async () => await proxy.deleteDataTable()),
		).rejects.toThrow(refused);
	});
});

describe('ServiceDataTableProvider of the project', () => {
	it('takes the project id of n8n and revives the dates of a table', async () => {
		const { channel, calls } = fakeChannel({
			getProjectId: 'project-1',
			getManyAndCount: { count: 1, data: [tableJson] },
		});
		const aggregate = await withServiceChannel(
			channel,
			async () => await provider.getDataTableAggregateProxy(workflow, node),
		);
		expect(aggregate.getProjectId()).toBe('project-1');

		// v1 ignores a project filter, and n8n pins the project, so it does not go on the wire.
		const page = await withServiceChannel(
			channel,
			async () =>
				await aggregate.getManyAndCount({
					filter: { name: 'people', projectId: 'another' },
					sortBy: 'name:asc',
					take: 1,
					skip: 0,
				}),
		);

		expect(calls).toEqual([
			{ service: 'dataTable', op: 'getProjectId', args: {} },
			{
				service: 'dataTable',
				op: 'getManyAndCount',
				args: { options: { filter: { name: 'people' }, sortBy: 'name:asc', take: 1, skip: 0 } },
			},
		]);
		expect(page.count).toBe(1);
		expect(page.data[0].createdAt).toEqual(new Date('2024-05-06T07:08:09.000Z'));
		expect(page.data[0].updatedAt).toEqual(new Date('2024-05-07T07:08:09.000Z'));
		// The list query does not select the column's table id; the table gives it.
		expect(page.data[0].columns).toEqual([
			{ id: 'c1', name: 'name', type: 'string', index: 0, dataTableId: 'dt1' },
		]);
	});

	it('creates a table with the options of the node', async () => {
		const { channel, calls } = fakeChannel({
			getProjectId: 'project-1',
			createDataTable: tableJson,
		});
		const aggregate = await withServiceChannel(
			channel,
			async () => await provider.getDataTableAggregateProxy(workflow, node),
		);
		const created = await withServiceChannel(
			channel,
			async () =>
				await aggregate.createDataTable({
					name: 'people',
					columns: [{ name: 'name', type: 'string', index: 0 }],
				}),
		);

		expect(calls.at(-1)).toEqual({
			service: 'dataTable',
			op: 'createDataTable',
			args: { options: { name: 'people', columns: [{ name: 'name', type: 'string', index: 0 }] } },
		});
		expect(created.id).toBe('dt1');
		expect(created.projectId).toBe('project-1');
		expect(created.createdAt).toBeInstanceOf(Date);
	});

	it('refuses to delete every table of the project', async () => {
		const { channel } = fakeChannel({ getProjectId: 'project-1' });
		const aggregate = await withServiceChannel(
			channel,
			async () => await provider.getDataTableAggregateProxy(workflow, node),
		);
		await expect(aggregate.deleteDataTableAll()).rejects.toThrow(
			'The fallback host cannot delete every data table of a project',
		);
	});
});

describe('the Data Table node on a step with a service channel', () => {
	const tables = mkdtempSync(join(tmpdir(), 'wf-data-tables-channel-'));
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

	const createTable = parseNodeStepArgs({
		name: 'Create',
		type: 'n8n-nodes-base.dataTable',
		typeVersion: 1,
		parameters: {
			resource: 'table',
			operation: 'create',
			tableName: 'people',
			columns: { column: [{ name: 'name', type: 'string' }] },
			options: { createIfNotExists: true },
		},
		items: [{}],
	});

	const getRows = parseNodeStepArgs({
		name: 'Get',
		type: 'n8n-nodes-base.dataTable',
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'get',
			dataTableId: { __rl: true, mode: 'id', value: 'dt1' },
			filters: { conditions: [{ keyName: 'city', condition: 'eq', keyValue: 'Paris' }] },
		},
		items: [{}],
	});

	beforeAll(() => {
		process.env.WF_FALLBACK_DATA_TABLES_DIR = tables;
	});

	afterAll(() => {
		delete process.env.WF_FALLBACK_DATA_TABLES_DIR;
		rmSync(tables, { recursive: true, force: true });
	});

	it('creates a table in n8n, not in the file store', async () => {
		const { channel, calls } = fakeChannel({
			getProjectId: 'project-1',
			getManyAndCount: { count: 0, data: [] },
			createDataTable: tableJson,
		});
		const out = await withServiceChannel(
			channel,
			async () => await runner.run(createTable, { step: 'Create', key: 'k1' }),
		);

		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({ id: 'dt1', name: 'people' });
		expect(calls.map((call) => call.op)).toEqual([
			'getProjectId',
			'getManyAndCount',
			'createDataTable',
		]);
		// The file store of the test bed is not used when the step has a channel.
		expect(readdirSync(tables)).toEqual([]);
	});

	it('gets the rows of n8n', async () => {
		const { channel, calls } = fakeChannel({
			getProjectId: 'project-1',
			getColumns: [{ ...(columnJson as JsonObject), name: 'city' }],
			getManyRowsAndCount: { count: 1, data: [rowJson] },
		});
		const out = await withServiceChannel(
			channel,
			async () => await runner.run(getRows, { step: 'Get', key: 'k2' }),
		);

		expect(out).toEqual([
			{
				id: 2,
				name: 'Bob',
				city: 'Paris',
				createdAt: '2024-05-06T07:08:09.000Z',
				updatedAt: '2024-05-06T07:08:09.000Z',
			},
		]);
		expect(calls.map((call) => call.op)).toEqual(['getColumns', 'getManyRowsAndCount']);
		expect(readdirSync(tables)).toEqual([]);
	});
});

describe('the Data Table node on a step without a service channel', () => {
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

	const getRows = parseNodeStepArgs({
		name: 'Get',
		type: 'n8n-nodes-base.dataTable',
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'get',
			dataTableId: { __rl: true, mode: 'id', value: 'dt1' },
		},
		items: [{}],
	});

	it('has no data-table service without WF_FALLBACK_DATA_TABLES_DIR', async () => {
		delete process.env.WF_FALLBACK_DATA_TABLES_DIR;
		await expect(runner.run(getRows, { step: 'Get', key: 'k3' })).rejects.toThrow(
			'module is disabled',
		);
	});
});
