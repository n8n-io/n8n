import { createDataSource } from '@n8n/engine';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
	converter,
	mainTo,
	makeRunWorkflow,
	setNode,
	setWorkflow,
	TRIGGER,
} from './acceptance-fixtures';
import { v1Workflow } from './fixtures';

describe('M1 acceptance (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: ReturnType<typeof createDataSource>;

	beforeAll(async () => {
		container = await new PostgreSqlContainer('postgres:18-alpine').start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	const runWorkflow = makeRunWorkflow(() => dataSource);

	it('runs a single v1 node (Set) workflow to completion with correct rows', async () => {
		const graph = setWorkflow([{ name: 'greeting', value: 'hello', type: 'string' }]);
		const { execution, steps, byNode } = await runWorkflow(graph, { name: 'ada' });

		expect(steps).toHaveLength(2);
		expect(byNode('trigger')?.status).toBe('completed');
		expect(byNode('set-node')?.status).toBe('completed');
		expect(byNode('set-node')?.error).toBeNull();
		expect(byNode('set-node')?.outputs).toEqual([
			[expect.objectContaining({ json: { greeting: 'hello' } })],
		]);
		expect(execution.status).toBe('completed');
		expect(execution.finishedAt).toBeInstanceOf(Date);
	});

	it('runs a multi-step linear pipeline of 3 nodes, feeding each output forward', async () => {
		const graph = converter.convert(
			v1Workflow(
				[
					TRIGGER,
					setNode('node-a', 'A', [{ name: 'a', value: '={{ $json.seed }}-a', type: 'string' }]),
					setNode('node-b', 'B', [{ name: 'b', value: '={{ $json.a }}-b', type: 'string' }]),
					setNode('node-c', 'C', [
						{ name: 'c', value: '={{ $json.b }}-c', type: 'string' },
						{ name: 'fromA', value: "={{ $('A').first().json.a }}", type: 'string' },
					]),
				],
				{
					'When clicking Execute': mainTo('A'),
					A: mainTo('B'),
					B: mainTo('C'),
				},
			),
		);

		const { execution, steps, byNode } = await runWorkflow(graph, { seed: 's' });

		expect(steps).toHaveLength(4);
		for (const nodeId of ['trigger', 'node-a', 'node-b', 'node-c']) {
			expect(byNode(nodeId)?.status).toBe('completed');
		}
		const chained = expect.objectContaining({ c: 's-a-b-c', fromA: 's-a' }) as unknown;
		expect(byNode('node-c')?.outputs).toEqual([[expect.objectContaining({ json: chained })]]);
		expect(execution.status).toBe('completed');
	});

	it('processes an n-item input into an n-item output, serially and in order', async () => {
		const graph = converter.convert(
			v1Workflow(
				[
					TRIGGER,
					{
						id: 'split',
						name: 'Split Out',
						type: 'n8n-nodes-base.splitOut',
						typeVersion: 1,
						parameters: { fieldToSplitOut: 'orders', options: {} },
					},
					setNode('mark', 'Mark', [{ name: 'marked', value: '={{ $json.n }}!', type: 'string' }]),
				],
				{
					'When clicking Execute': mainTo('Split Out'),
					'Split Out': mainTo('Mark'),
				},
			),
		);

		const { execution, byNode } = await runWorkflow(graph, {
			orders: [{ n: 1 }, { n: 2 }, { n: 3 }],
		});

		expect(byNode('mark')?.outputs).toEqual([
			[
				expect.objectContaining({ json: { marked: '1!' } }),
				expect.objectContaining({ json: { marked: '2!' } }),
				expect.objectContaining({ json: { marked: '3!' } }),
			],
		]);
		expect(execution.status).toBe('completed');
	});

	it('resolves expressions against upstream data, by reference and by input', async () => {
		const graph = setWorkflow([
			{ name: 'byInput', value: '={{ $json.name }}!', type: 'string' },
			{
				name: 'byReference',
				value: "={{ $('When clicking Execute').first().json.name }}?",
				type: 'string',
			},
		]);
		const { set } = { set: (await runWorkflow(graph, { name: 'ada' })).byNode('set-node') };

		expect(set?.outputs).toEqual([
			[expect.objectContaining({ json: { byInput: 'ada!', byReference: 'ada?' } })],
		]);
	});

	it('fails the execution when a node errors, leaving no orphan step rows', async () => {
		const graph = setWorkflow([
			{ name: 'boom', value: "={{ $('Ghost').first().json.x }}", type: 'string' },
		]);
		const { execution, steps, byNode } = await runWorkflow(graph, { name: 'ada' });

		expect(steps).toHaveLength(2);
		expect(byNode('set-node')?.status).toBe('failed');
		expect(byNode('set-node')?.outputs).toBeNull();
		expect(byNode('set-node')?.error).toMatchObject({
			name: 'NodeOperationError',
			message: "Referenced node doesn't exist",
		});
		expect(execution.status).toBe('failed');
		expect(execution.finishedAt).toBeInstanceOf(Date);
	});

	it('fails the execution mid-pipeline and plans nothing downstream of the failure', async () => {
		const graph = converter.convert(
			v1Workflow(
				[
					TRIGGER,
					setNode('node-a', 'A', [
						{ name: 'boom', value: "={{ $('Ghost').first().json.x }}", type: 'string' },
					]),
					setNode('node-b', 'B', [{ name: 'b', value: 'never', type: 'string' }]),
				],
				{
					'When clicking Execute': mainTo('A'),
					A: mainTo('B'),
				},
			),
		);

		const { execution, steps, byNode } = await runWorkflow(graph, {});

		expect(byNode('node-a')?.status).toBe('failed');
		expect(byNode('node-b')).toBeUndefined();
		expect(steps).toHaveLength(2);
		expect(execution.status).toBe('failed');
	});

	// TODO(CAT-2874): slot-shaped IO and branching land as a PR series (#35672
	// first); If/Merge routing is asserted once input slots beyond 0 exist.
	it.todo('routes items through an If node and consolidates with Merge');

	// TODO(CAT-2875): loop iteration, back-edge graphs are rejected at the start
	// boundary until then.
	it.todo('executes a fixed-count loop via a back-edge');

	// No cancellation mechanism exists yet (discussed during CAT-2905, needs an
	// API to request it and a hard-stop story for in-flight steps).
	it.todo('stops cleanly on a cancel request mid-flight');
});
