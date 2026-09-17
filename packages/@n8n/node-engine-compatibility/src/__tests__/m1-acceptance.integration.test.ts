import { createDataSource } from '@n8n/engine';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
	branchyLoopWorkflow,
	chainedLoopsWorkflow,
	converter,
	loopWorkflow,
	mainTo,
	makeRunWorkflow,
	selfLoopWorkflow,
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
		const { execution, steps, byNode } = await runWorkflow(graph, [[{ json: { name: 'ada' } }]]);

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

		const { execution, steps, byNode } = await runWorkflow(graph, [[{ json: { seed: 's' } }]]);

		expect(steps).toHaveLength(4);
		for (const nodeId of ['trigger', 'node-a', 'node-b', 'node-c']) {
			expect(byNode(nodeId)?.status).toBe('completed');
		}
		const chained = expect.objectContaining({ c: 's-a-b-c', fromA: 's-a' }) as unknown;
		expect(byNode('node-c')?.outputs).toEqual([[expect.objectContaining({ json: chained })]]);
		expect(execution.status).toBe('completed');
	});

	it('runs a manual execution started with the default trigger payload', async () => {
		const graph = converter.convert(
			v1Workflow(
				[
					TRIGGER,
					setNode('node-a', 'A', [{ name: 'a', value: 'from-a', type: 'string' }]),
					setNode('node-b', 'B', [{ name: 'b', value: '={{ $json.a }}-b', type: 'string' }]),
				],
				{
					'When clicking Execute': mainTo('A'),
					A: mainTo('B'),
				},
			),
		);

		// what the control plane sends for a manual run with no trigger data
		const { execution, steps, byNode } = await runWorkflow(graph, [[{ json: {} }]], 'manual');

		expect(steps).toHaveLength(3);
		for (const nodeId of ['trigger', 'node-a', 'node-b']) {
			expect(byNode(nodeId)?.status).toBe('completed');
		}
		expect(byNode('node-b')?.outputs).toEqual([
			[expect.objectContaining({ json: { b: 'from-a-b' } })],
		]);
		expect(execution.mode).toBe('manual');
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

		const { execution, byNode } = await runWorkflow(graph, [
			[{ json: { orders: [{ n: 1 }, { n: 2 }, { n: 3 }] } }],
		]);

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
		const { set } = {
			set: (await runWorkflow(graph, [[{ json: { name: 'ada' } }]])).byNode('set-node'),
		};

		expect(set?.outputs).toEqual([
			[expect.objectContaining({ json: { byInput: 'ada!', byReference: 'ada?' } })],
		]);
	});

	it('emits one item per trigger payload item, with by-reference expressions still resolving', async () => {
		const graph = setWorkflow([
			{ name: 'byInput', value: '={{ $json.n }}', type: 'number' },
			{
				name: 'byReference',
				value: "={{ $('When clicking Execute').first().json.x }}",
				type: 'string',
			},
		]);
		const { byNode } = await runWorkflow(graph, [
			[
				{ json: { x: 'from-trigger', n: 1 } },
				{ json: { x: 'from-trigger', n: 2 } },
				{ json: { x: 'from-trigger', n: 3 } },
			],
		]);

		expect(byNode('set-node')?.outputs).toEqual([
			[
				expect.objectContaining({ json: { byInput: 1, byReference: 'from-trigger' } }),
				expect.objectContaining({ json: { byInput: 2, byReference: 'from-trigger' } }),
				expect.objectContaining({ json: { byInput: 3, byReference: 'from-trigger' } }),
			],
		]);
	});

	it('fails the execution when a node errors, leaving no orphan step rows', async () => {
		const graph = setWorkflow([
			{ name: 'boom', value: "={{ $('Ghost').first().json.x }}", type: 'string' },
		]);
		const { execution, steps, byNode } = await runWorkflow(graph, [[{ json: { name: 'ada' } }]]);

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

		const { execution, steps, byNode } = await runWorkflow(graph, [[]]);

		expect(byNode('node-a')?.status).toBe('failed');
		expect(byNode('node-b')).toBeUndefined();
		expect(steps).toHaveLength(2);
		expect(execution.status).toBe('failed');
	});

	it('reports the pass to an expression in the body, and accumulates each one', async () => {
		const graph = loopWorkflow(1, {
			id: 'body',
			name: 'Body',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			parameters: {
				mode: 'manual',
				assignments: {
					assignments: [{ id: '0', name: 'pass', value: '={{ $runIndex }}', type: 'string' }],
				},
				options: {},
			},
		});
		const { execution, steps } = await runWorkflow(graph, [
			[{ json: { n: 1 } }, { json: { n: 2 } }, { json: { n: 3 } }],
		]);

		const at = (nodeId: string, iteration: number) =>
			steps.find((step) => step.nodeId === nodeId && step.iteration === iteration);

		expect(execution.status).toBe('completed');
		expect(at('body', 0)?.outputs).toMatchObject([[{ json: { pass: '0' } }]]);
		expect(at('body', 2)?.outputs).toMatchObject([[{ json: { pass: '2' } }]]);

		expect(at('loop', 3)?.outputs).toMatchObject([
			[{ json: { pass: '0' } }, { json: { pass: '1' } }, { json: { pass: '2' } }],
			null,
		]);
	});

	it('ends the loop when the body sends nothing back', async () => {
		// splitting an empty field yields no items, so the body returns nothing
		const graph = loopWorkflow(1, {
			id: 'body',
			name: 'Body',
			type: 'n8n-nodes-base.splitOut',
			typeVersion: 1,
			parameters: { fieldToSplitOut: 'list', options: {} },
		});
		const { execution, steps } = await runWorkflow(graph, [
			[{ json: { list: [] } }, { json: { list: [] } }],
		]);

		const at = (nodeId: string, iteration: number) =>
			steps.find((step) => step.nodeId === nodeId && step.iteration === iteration);

		expect(execution.status).toBe('completed');
		expect(at('body', 0)?.status).toBe('completed');
		expect(at('loop', 1)?.status).toBe('skipped');
		expect(at('loop', 2)).toBeUndefined();
		expect(at('after', 0)?.status).toBe('skipped');
	});

	it('fails the whole execution when a body step fails mid-loop', async () => {
		// two destination names for one field, on the second pass only, which Split
		// Out rejects
		const graph = loopWorkflow(1, {
			id: 'body',
			name: 'Body',
			type: 'n8n-nodes-base.splitOut',
			typeVersion: 1,
			parameters: {
				fieldToSplitOut: 'list',
				options: { destinationFieldName: "={{ $runIndex === 1 ? 'a,b' : 'a' }}" },
			},
		});
		const { execution, steps } = await runWorkflow(graph, [
			[{ json: { list: [1] } }, { json: { list: [2] } }],
		]);

		const at = (nodeId: string, iteration: number) =>
			steps.find((step) => step.nodeId === nodeId && step.iteration === iteration);

		expect(execution.status).toBe('failed');
		expect(at('body', 0)?.status).toBe('completed');
		expect(at('body', 1)?.status).toBe('failed');
		expect(at('body', 1)?.error).not.toBeNull();
		expect(at('loop', 2)).toBeUndefined();
	});

	it('runs a self-loop, where the loop slot returns straight to the batch node', async () => {
		const graph = selfLoopWorkflow(1);
		const { execution, steps } = await runWorkflow(graph, [
			[{ json: { n: 1 } }, { json: { n: 2 } }],
		]);

		const at = (nodeId: string, iteration: number) =>
			steps.find((step) => step.nodeId === nodeId && step.iteration === iteration);

		expect(execution.status).toBe('completed');
		expect(at('loop', 0)?.outputs).toEqual([null, [{ json: { n: 1 } }]]);
		expect(at('loop', 1)?.outputs).toEqual([null, [{ json: { n: 2 } }]]);
		expect(at('loop', 2)?.status).toBe('completed');
		expect(at('after', 0)?.status).toBe('completed');
	});

	it('runs a body that branches and reconverges before returning', async () => {
		// only the join returns to the loop, so the whole fork settles within its own
		// pass before the next one is planned
		const graph = branchyLoopWorkflow(1);
		const { execution, steps } = await runWorkflow(graph, [
			[{ json: { n: 1 } }, { json: { n: 2 } }],
		]);

		const at = (nodeId: string, iteration: number) =>
			steps.find((step) => step.nodeId === nodeId && step.iteration === iteration);

		expect(execution.status).toBe('completed');

		for (const nodeId of ['fork', 'left', 'right', 'join']) {
			expect(at(nodeId, 0)?.status).toBe('completed');
			expect(at(nodeId, 1)?.status).toBe('completed');
			expect(at(nodeId, 2)).toBeUndefined();
		}

		expect(at('join', 0)?.outputs).toMatchObject([
			[{ json: { side: 'left' } }, { json: { side: 'right' } }],
		]);

		expect(at('loop', 2)?.outputs).toMatchObject([
			[
				{ json: { side: 'left' } },
				{ json: { side: 'right' } },
				{ json: { side: 'left' } },
				{ json: { side: 'right' } },
			],
			null,
		]);
	});

	it('feeds one loop from the done slot of another', async () => {
		// the second loop's entry edge reads the first loop's terminal step, not its
		// first. Reading iteration 0 would find a dead done slot and drop the items.
		const graph = chainedLoopsWorkflow(1);
		const { execution, steps } = await runWorkflow(graph, [
			[{ json: { n: 1 } }, { json: { n: 2 } }],
		]);

		const at = (nodeId: string, iteration: number) =>
			steps.find((step) => step.nodeId === nodeId && step.iteration === iteration);

		expect(execution.status).toBe('completed');

		expect(at('one', 2)?.outputs).toEqual([[{ json: { n: 1 } }, { json: { n: 2 } }], null]);

		expect(at('body-two', 0)?.status).toBe('completed');
		expect(at('body-two', 1)?.status).toBe('completed');
		expect(at('two', 2)?.outputs).toEqual([[{ json: { n: 1 } }, { json: { n: 2 } }], null]);
		expect(at('after', 0)?.status).toBe('completed');
	});

	// TODO(CAT-2874): slot-shaped IO and branching land as a PR series (#35672
	// first); If/Merge routing is asserted once input slots beyond 0 exist.
	it.todo('routes items through an If node and consolidates with Merge');

	it('executes a loop over a back-edge, one step per node per pass', async () => {
		const graph = loopWorkflow(1);
		const { execution, steps } = await runWorkflow(graph, [
			[{ json: { n: 1 } }, { json: { n: 2 } }, { json: { n: 3 } }],
		]);

		const at = (nodeId: string, iteration: number) =>
			steps.find((step) => step.nodeId === nodeId && step.iteration === iteration);

		expect(execution.status).toBe('completed');

		expect(steps).toHaveLength(9);
		expect(at('trigger', 0)?.status).toBe('completed');
		for (const iteration of [0, 1, 2, 3]) {
			expect(at('loop', iteration)?.status).toBe('completed');
		}
		for (const iteration of [0, 1, 2]) {
			expect(at('body', iteration)?.status).toBe('completed');
		}
		expect(at('after', 0)?.status).toBe('completed');

		// the terminal pass has no body step at all, which is what stops a finished
		// loop from cascading skips through its own body forever
		expect(at('body', 3)).toBeUndefined();

		expect(at('loop', 0)?.outputs).toEqual([null, [{ json: { n: 1 } }]]);
		expect(at('loop', 2)?.outputs).toEqual([null, [{ json: { n: 3 } }]]);

		// the last pass carries what the body returned across every pass
		expect(at('loop', 3)?.outputs).toEqual([
			[{ json: { n: 1 } }, { json: { n: 2 } }, { json: { n: 3 } }],
			null,
		]);
	});

	it('ends a loop at once when the trigger has no items', async () => {
		// pass 0 has nothing to slice, so it is terminal immediately, fires neither
		// slot, and the node after the loop settles skipped
		const graph = loopWorkflow(1);
		const { execution, steps } = await runWorkflow(graph, [[]]);

		const at = (nodeId: string, iteration: number) =>
			steps.find((step) => step.nodeId === nodeId && step.iteration === iteration);

		expect(execution.status).toBe('completed');
		expect(at('loop', 0)?.outputs).toEqual([null, null]);
		expect(at('body', 0)).toBeUndefined();
		expect(at('after', 0)?.status).toBe('skipped');
	});

	// No cancellation mechanism exists yet (discussed during CAT-2905, needs an
	// API to request it and a hard-stop story for in-flight steps).
	it.todo('stops cleanly on a cancel request mid-flight');
});
