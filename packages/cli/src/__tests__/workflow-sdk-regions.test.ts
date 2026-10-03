// Runs the workflows that `@n8n/workflow-sdk/next` regions compile to on the legacy engine, with
// the real nodes from n8n-nodes-base and the contract nodes that `set` and `when` emit, in both
// execution orders, and checks what comes out.
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import {
	contractStep,
	filter,
	forEach,
	loop,
	manual,
	merge,
	node,
	paginate,
	pollUntil,
	set,
	splitOut,
	steps,
	switchOn,
	validateLoopWiring,
	workflow,
	type Step,
} from '@n8n/workflow-sdk/next';
import { ExecutionLifecycleHooks, LazyPackageDirectoryLoader, WorkflowExecute } from 'n8n-core';
import type {
	IConnections,
	IDataObject,
	INode,
	INodeTypes,
	IRun,
	IWorkflowExecuteAdditionalData,
	IWorkflowSettings,
} from 'n8n-workflow';
import { createRunExecutionData, NodeHelpers, Workflow } from 'n8n-workflow';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { ContractNodeLoader } from '../node-contracts-registry';

const nodesBase = new LazyPackageDirectoryLoader(path.resolve(__dirname, '../../../nodes-base'));
const nodesBaseNext = new ContractNodeLoader([], [], async () => new Map());

const NEXT_PREFIX = '@n8n/nodes-base-next.';

const typeOf = (type: string) =>
	type.startsWith(NEXT_PREFIX)
		? nodesBaseNext.getNode(type.slice(NEXT_PREFIX.length)).type
		: nodesBase.getNode(type.replace(/^n8n-nodes-base\./, '')).type;

const nodeTypes: INodeTypes = {
	getByName: typeOf,
	getByNameAndVersion: (type, version) => NodeHelpers.getVersionedNodeType(typeOf(type), version),
	getKnownTypes: () => ({}),
};

beforeAll(async () => await Promise.all([nodesBase.loadAll(), nodesBaseNext.loadAll()]), 30_000);

type Built = ReturnType<ReturnType<typeof workflow>['toJSON']>;

type ExecutionOrder = NonNullable<IWorkflowSettings['executionOrder']>;

const toWorkflow = (executionOrder: ExecutionOrder, json: Built) =>
	new Workflow({
		id: 'regions',
		nodes: json.nodes as INode[],
		connections: json.connections as IConnections,
		nodeGroups: json.nodeGroups,
		nodeTypes,
		active: false,
		settings: { executionOrder },
	});

/** `Workflow.renameNode` on the saved workflow, then the workflow as n8n loads it again. */
function renamed(executionOrder: ExecutionOrder, json: Built, from: string, to: string) {
	const instance = toWorkflow(executionOrder, json);
	instance.renameNode(from, to);
	return new Workflow({
		id: 'regions',
		nodes: Object.values(instance.nodes),
		connections: instance.connectionsBySourceNode,
		nodeGroups: instance.nodeGroups,
		nodeTypes,
		active: false,
		settings: { executionOrder },
	});
}

const MAX_NODE_RUNS = 200;

/** Run `instance` with `items` as the trigger output. An endless loop stops at `MAX_NODE_RUNS`. */
async function runWorkflow(instance: Workflow, items: readonly object[]): Promise<IRun> {
	const hooks = new ExecutionLifecycleHooks('trigger', '1', mock());
	const done = createDeferredPromise<IRun>();
	hooks.addHandler('workflowExecuteAfter', (result) => done.resolve(result));
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		executionId: '1',
		webhookWaitingBaseUrl: 'http://localhost/waiting-webhook',
		formWaitingBaseUrl: 'http://localhost/waiting-form',
		hooks,
		currentNodeParameters: undefined,
		parentCallbackManager: undefined,
		ssrfBridge: undefined,
		encryptedRunnerIdentity: undefined,
	});
	const start = instance.getStartNode();
	if (!start) throw new Error('no start node');
	const data = createRunExecutionData({
		executionData: {
			waitingExecutionSource: null,
			nodeExecutionStack: [
				{
					node: start,
					data: { main: [items.map((json) => ({ json: json as IDataObject }))] },
					source: null,
				},
			],
		},
	});
	// In any mode but `manual` a trigger passes its input on.
	const running = new WorkflowExecute(additionalData, 'trigger', data).processRunExecutionData(
		instance,
	);
	const counted = { nodeRuns: 0 };
	hooks.addHandler('nodeExecuteBefore', () => {
		counted.nodeRuns += 1;
		if (counted.nodeRuns > MAX_NODE_RUNS) running.cancel();
	});
	await running;
	return await done.promise;
}

/** Run `json` with `items` as the trigger output. */
const execute = async (executionOrder: ExecutionOrder, json: Built, items: readonly object[]) =>
	await runWorkflow(toWorkflow(executionOrder, json), items);

/** Output 0 of each run of `name`. */
const runs = (result: IRun, name: string) =>
	(result.data.resultData.runData[name] ?? []).map((task) =>
		(task.data?.main[0] ?? []).map((item) => item.json),
	);

interface Order {
	id: string;
	total: number;
}

interface Customer {
	id: string;
	name: string;
	orders: Order[];
}

type Ticket =
	| { kind: 'bug'; id: string; severity: number }
	| { kind: 'feature'; id: string; votes: number }
	| { kind: 'chore'; id: string };

const source =
	<T>() =>
	<In, Ctx, const N extends string>(name: N): Step<In, Ctx, T, N> =>
		contractStep('n8n-nodes-base.noOp', { name });

const CUSTOMERS: Customer[] = [
	{
		id: 'c1',
		name: 'Ada',
		orders: [
			{ id: 'o1', total: 1 },
			{ id: 'o2', total: 2 },
			{ id: 'o3', total: 3 },
		],
	},
	{ id: 'c2', name: 'Bo', orders: [{ id: 'o4', total: 4 }] },
	{
		id: 'c3',
		name: 'Cy',
		orders: [
			{ id: 'o5', total: 5 },
			{ id: 'o6', total: 6 },
		],
	},
];

const nestedForEach = () =>
	workflow(
		'Orders',
		manual(),
		source<Customer>()('Customers'),
		forEach(
			{ name: 'Each customer', batchSize: 1 },
			steps(
				splitOut({ name: 'Orders', field: 'orders' }),
				forEach(
					{ name: 'Each order', batchSize: 2 },
					set({
						name: 'Line',
						fields: {
							order: (o) => o.id,
							total: (o) => o.total * 2,
							customer: (_o, $) => $('Each customer').name,
						},
					}),
				),
			),
		),
	).toJSON();

const LINES = [
	{ order: 'o1', total: 2, customer: 'Ada' },
	{ order: 'o2', total: 4, customer: 'Ada' },
	{ order: 'o3', total: 6, customer: 'Ada' },
	{ order: 'o4', total: 8, customer: 'Bo' },
	{ order: 'o5', total: 10, customer: 'Cy' },
	{ order: 'o6', total: 12, customer: 'Cy' },
];

/** Two Loop Over Items nodes wired by hand around the nodes of a flat workflow, with no reset. */
function handWiredLoops(): Built {
	const flat = workflow(
		'Orders',
		manual(),
		source<Customer>()('Customers'),
		splitOut({ name: 'Orders', field: 'orders' }),
		set({ name: 'Line', fields: { order: (o) => o.id } }),
	).toJSON();
	const loop = (name: string, batchSize: number) => ({
		id: name,
		name,
		type: 'n8n-nodes-base.splitInBatches',
		typeVersion: 3,
		position: [0, 0] as [number, number],
		parameters: { batchSize, options: {} },
	});
	const to = (node: string) => [{ node, type: 'main' as const, index: 0 }];
	return {
		...flat,
		nodes: [...flat.nodes, loop('Each customer', 1), loop('Each order', 2)],
		connections: {
			...flat.connections,
			Customers: { main: [to('Each customer')] },
			'Each customer': { main: [[], to('Orders')] },
			Orders: { main: [to('Each order')] },
			'Each order': { main: [to('Each customer'), to('Line')] },
			Line: { main: [to('Each order')] },
		},
	};
}

describe('workflow-sdk forEach regions on the legacy engine', () => {
	it('forEach nested in forEach processes every order once, per customer', async () => {
		const json = nestedForEach();
		expect(validateLoopWiring(json)).toEqual([]);

		const result = await execute('v1', json, CUSTOMERS);

		expect(result.status).toBe('success');
		expect(runs(result, 'Each customer').at(-1)).toEqual(LINES);
		// One run per batch of 2: Ada 2, Bo 1, Cy 1.
		expect(runs(result, 'Line')).toHaveLength(4);
		expect(runs(result, 'Each order')).toHaveLength(4);
	});

	it('forEach refuses execution order v0', async () => {
		await expect(execute('v0', nestedForEach(), CUSTOMERS)).rejects.toThrow(
			'Region "Each order" needs execution order v1',
		);
	});

	it('forEach goes on after a batch that the body drops, and emits once', async () => {
		const json = workflow(
			'Many orders',
			manual(),
			source<Customer>()('Customers'),
			forEach(
				{ name: 'Each', batchSize: 1 },
				filter({ name: 'Many orders', if: (c) => c.orders.length > 1 }),
			),
			set({ name: 'Report', fields: { id: (_c, $) => $('Customers').id } }),
		).toJSON();

		const result = await execute('v1', json, CUSTOMERS);

		expect(result.status).toBe('success');
		expect(runs(result, 'Many orders')).toHaveLength(3);
		expect(runs(result, 'Report')).toEqual([[{ id: 'c1' }, { id: 'c3' }]]);
	});

	it('forEach nested in forEach keeps working after a body node is renamed', async () => {
		const result = await runWorkflow(
			renamed('v1', nestedForEach(), 'Line', 'Make line'),
			CUSTOMERS,
		);

		expect(result.status).toBe('success');
		expect(runs(result, 'Each customer').at(-1)).toEqual(LINES);
		expect(runs(result, 'Make line')).toHaveLength(4);
	});

	it('forEach keeps working after its region is renamed', async () => {
		const result = await runWorkflow(
			renamed('v1', nestedForEach(), 'Each customer', 'Per customer'),
			CUSTOMERS,
		);

		expect(result.status).toBe('success');
		expect(runs(result, 'Per customer').at(-1)).toEqual(LINES);
	});

	it('an inner region emits to a member of the outer region on an exit output they share', async () => {
		const noOp = (name: string) => ({
			id: name,
			name,
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		});
		const to = (...nodes: string[]) => [
			nodes.map((node) => ({ node, type: 'main' as const, index: 0 })),
		];
		const json: Built = {
			name: 'Shared exit',
			nodes: [
				{ ...noOp('Start'), type: 'n8n-nodes-base.manualTrigger' },
				...['E', 'X', 'Y', 'After'].map(noOp),
			],
			connections: {
				Start: { main: to('E') },
				E: { main: to('X') },
				X: { main: to('Y', 'After') },
				Y: { main: to('After') },
			},
			nodeGroups: [
				{
					id: 'Outer',
					name: 'Outer',
					nodeIds: ['E', 'X', 'Y'],
					repeat: {
						kind: 'forEach',
						batchSize: 1,
						entry: 'E',
						exits: [
							{ node: 'X', output: 0 },
							{ node: 'Y', output: 0 },
						],
					},
				},
				{
					id: 'Inner',
					name: 'Inner',
					nodeIds: ['X'],
					repeat: { kind: 'forEach', batchSize: 1, entry: 'X', exits: [{ node: 'X', output: 0 }] },
				},
			],
		};

		const result = await execute('v1', json, [{ n: 1 }, { n: 2 }]);

		expect(result.status).toBe('success');
		expect(runs(result, 'Y')).toEqual([[{ n: 1 }], [{ n: 2 }]]);
		expect(runs(result, 'After')).toEqual([[{ n: 1 }, { n: 1 }, { n: 2 }, { n: 2 }]]);
	});
});

describe.each<ExecutionOrder>(['v0', 'v1'])(
	'workflow-sdk regions on the legacy engine (%s)',
	(order) => {
		const run = async (json: Built, items: readonly object[]) => await execute(order, json, items);

		it('nested Loop Over Items without the reset skips later customers (the legacy failure)', async () => {
			const json = handWiredLoops();
			expect(validateLoopWiring(json).map(({ code }) => code)).toEqual(['LOOP_NESTED_NO_RESET']);

			const result = await run(json, CUSTOMERS);
			const orders = (runs(result, 'Each customer').at(-1) ?? []).map((line) => line.order ?? null);
			// The inner loop re-reads its old items: Ada's orders repeat, later ones never run.
			expect(orders).toEqual([
				'o1',
				'o2',
				'o3',
				'o1',
				'o2',
				'o3',
				null,
				'o1',
				'o2',
				'o3',
				null,
				null,
				null,
			]);
		});

		const loopWorkflow = (maxIterations: number) =>
			workflow(
				'Count',
				manual(),
				set({ name: 'Init', fields: { n: 0, sum: 0 } }),
				loop(
					{
						name: 'Count',
						maxIterations,
						until: (out) => out.n >= 3,
						next: (out) => ({ n: out.n, sum: out.sum }),
					},
					set({ name: 'Add', fields: { n: (s) => s.n + 1, sum: (s) => s.sum + s.n + 1 } }),
				),
				set({ name: 'Result', fields: { sum: (out) => out.sum } }),
			).toJSON();

		it('loop runs until its exit condition and carries typed state', async () => {
			const result = await run(loopWorkflow(10), [{}]);

			expect(result.status).toBe('success');
			expect(runs(result, 'Add')).toEqual([
				[{ n: 1, sum: 1 }],
				[{ n: 2, sum: 3 }],
				[{ n: 3, sum: 6 }],
			]);
			expect(runs(result, 'Result')).toEqual([[{ sum: 6 }]]);
			expect(runs(result, 'Count limit')).toEqual([]);
		});

		it('loop fails the run at its pass limit', async () => {
			const result = await run(loopWorkflow(2), [{}]);

			expect(result.status).toBe('error');
			expect(result.data.resultData.error?.message).toBe(
				'Count stopped after 2 passes without meeting its exit condition',
			);
			expect(runs(result, 'Add')).toHaveLength(2);
			expect(runs(result, 'Result')).toEqual([]);
		});

		it('paginate emits each page and stops when next is null', async () => {
			const json = workflow(
				'Pages',
				manual(),
				set({ name: 'Start page', fields: { cursor: 0 } }),
				paginate(
					{
						name: 'Pages',
						maxPages: 10,
						next: (response) => (response.next === null ? null : { cursor: response.next }),
					},
					set({
						name: 'Fetch',
						fields: {
							rows: (p) => [p.cursor * 10, p.cursor * 10 + 1],
							next: (p) => (p.cursor < 2 ? p.cursor + 1 : null),
						},
					}),
				),
				splitOut({ name: 'Rows', field: 'rows' }),
			).toJSON();

			const result = await run(json, [{}]);

			expect(result.status).toBe('success');
			const pages = runs(result, 'Rows');
			// v1 runs the child more to the top left first. Here that is the next page.
			expect(order === 'v0' ? pages : [...pages].reverse()).toEqual([
				[{ rows: 0 }, { rows: 1 }],
				[{ rows: 10 }, { rows: 11 }],
				[{ rows: 20 }, { rows: 21 }],
			]);
		});

		it('pollUntil waits between attempts and emits the attempt that met the condition', async () => {
			const json = workflow(
				'Poll',
				manual(),
				set({ name: 'Job', fields: { job: 'j1' } }),
				pollUntil(
					{
						name: 'Poll',
						maxAttempts: 5,
						every: { amount: 0, unit: 'seconds' },
						until: (status) => status.done === true,
					},
					node({
						name: 'Status',
						type: 'n8n-nodes-base.set',
						version: 3.4,
						parameters: {
							mode: 'raw',
							jsonOutput: '={{ ({ job: $json.job, done: $json["Poll pass"] >= 2 }) }}',
						},
					}),
				),
			).toJSON();

			const result = await run(json, [{}]);

			expect(result.status).toBe('success');
			expect(runs(result, 'Status')).toHaveLength(3);
			expect(runs(result, 'Poll wait')).toHaveLength(2);
			expect(runs(result, 'Poll until').at(-1)).toEqual([{ job: 'j1', done: true }]);
		});

		it('switch routes each ticket to its case, then filter keeps narrowed items', async () => {
			const tickets = source<Ticket>();
			const routed = workflow(
				'Triage',
				manual(),
				tickets('Tickets'),
				switchOn(
					{ name: 'By kind', on: 'kind' },
					{
						bug: set({ name: 'Bug', fields: { id: (t) => t.id, score: (t) => t.severity * 10 } }),
						feature: set({ name: 'Feature', fields: { id: (t) => t.id, score: (t) => t.votes } }),
						chore: set({ name: 'Chore', fields: { id: (t) => t.id, score: 0 } }),
					},
				),
				set({ name: 'Scored', fields: { id: (s) => s.id, score: (s) => s.score } }),
			).toJSON();
			const input: Ticket[] = [
				{ kind: 'bug', id: 't1', severity: 3 },
				{ kind: 'feature', id: 't2', votes: 7 },
				{ kind: 'chore', id: 't3' },
				{ kind: 'bug', id: 't4', severity: 1 },
			];

			const result = await run(routed, input);

			expect(result.status).toBe('success');
			expect(runs(result, 'Bug')).toEqual([
				[
					{ id: 't1', score: 30 },
					{ id: 't4', score: 10 },
				],
			]);
			expect(runs(result, 'Scored').flat()).toEqual(
				expect.arrayContaining([
					{ id: 't1', score: 30 },
					{ id: 't2', score: 7 },
					{ id: 't3', score: 0 },
					{ id: 't4', score: 10 },
				]),
			);

			const filtered = workflow(
				'Bugs',
				manual(),
				tickets('Tickets'),
				filter({
					name: 'Bugs only',
					if: (t): t is Extract<Ticket, { kind: 'bug' }> => t.kind === 'bug',
				}),
				set({ name: 'Severity', fields: { severity: (bug) => bug.severity } }),
			).toJSON();
			expect(runs(await run(filtered, input), 'Severity')).toEqual([
				[{ severity: 3 }, { severity: 1 }],
			]);
		});

		it('merge joins two branches of the same items by a matching field', async () => {
			const json = workflow(
				'Join',
				manual(),
				source<Customer>()('Customers'),
				merge({ name: 'Join', join: { left: 'id', right: 'id' } }, [
					set({ name: 'Names', fields: { id: (c) => c.id, name: (c) => c.name } }),
					set({ name: 'Counts', fields: { id: (c) => c.id, count: (c) => c.orders.length } }),
				]),
			).toJSON();

			const result = await run(json, CUSTOMERS);

			expect(result.status).toBe('success');
			expect(runs(result, 'Join')).toEqual([
				[
					{ id: 'c1', name: 'Ada', count: 3 },
					{ id: 'c2', name: 'Bo', count: 1 },
					{ id: 'c3', name: 'Cy', count: 2 },
				],
			]);
		});
		it('switch sends unmatched items to its fallback', async () => {
			const json = workflow(
				'By name',
				manual(),
				source<Customer>()('Customers'),
				switchOn(
					{ name: 'By name', on: 'name' },
					{
						Ada: set({ name: 'Ada', fields: { id: (c) => c.id } }),
						fallback: set({ name: 'Rest', fields: { id: (c) => c.id } }),
					},
				),
			).toJSON();

			const result = await run(json, CUSTOMERS);

			expect(result.status).toBe('success');
			expect(runs(result, 'Ada')).toEqual([[{ id: 'c1' }]]);
			expect(runs(result, 'Rest')).toEqual([[{ id: 'c2' }, { id: 'c3' }]]);
		});

		it.each([
			[
				'append' as const,
				[{ name: 'Ada' }, { name: 'Bo' }, { name: 'Cy' }, { count: 3 }, { count: 1 }, { count: 2 }],
			],
			[
				'position' as const,
				[
					{ name: 'Ada', count: 3 },
					{ name: 'Bo', count: 1 },
					{ name: 'Cy', count: 2 },
				],
			],
		])('merge %s joins two branches of the same items', async (join, expected) => {
			const json = workflow(
				'Both',
				manual(),
				source<Customer>()('Customers'),
				merge({ name: 'Both', join }, [
					set({ name: 'Names', fields: { name: (c) => c.name } }),
					set({ name: 'Counts', fields: { count: (c) => c.orders.length } }),
				]),
			).toJSON();

			const result = await run(json, CUSTOMERS);

			expect(result.status).toBe('success');
			expect(runs(result, 'Both')).toEqual([expected]);
		});
	},
);
