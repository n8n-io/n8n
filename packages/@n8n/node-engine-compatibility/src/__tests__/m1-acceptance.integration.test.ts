import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { IPairedItemData, IRunData, ITaskData } from 'n8n-workflow';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
	acceptanceRuntime,
	branchyLoopWorkflow,
	chainedLoopsV1Workflow,
	chainedLoopsWorkflow,
	converter,
	loopNode,
	loopWorkflow,
	mainTo,
	makeRunWorkflow,
	selfLoopWorkflow,
	setNode,
	setWorkflow,
	splitOutNode,
	TRIGGER,
} from './acceptance-fixtures';
import { v1Workflow } from './fixtures';
import { toV1RunExecutionData } from '../v1-execution-read';

describe('M1 acceptance (integration)', () => {
	let container: StartedPostgreSqlContainer;
	const engine = acceptanceRuntime();

	beforeAll(async () => {
		container = await new PostgreSqlContainer('postgres:18-alpine').start();
		await engine.start(container.getConnectionUri());
	}, 120_000);

	afterAll(async () => {
		await engine.stop();
		if (container) await container.stop();
	});

	const runWorkflow = makeRunWorkflow(() => engine);

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

	it('runs a node once on the items of both edges into its input, with paired items intact', async () => {
		// trigger -> A and B, which both feed C's only input; C -> D
		const graph = converter.convert(
			v1Workflow(
				[
					TRIGGER,
					setNode('node-a', 'A', [{ name: 'via', value: 'A', type: 'string' }]),
					setNode('node-b', 'B', [{ name: 'via', value: 'B', type: 'string' }]),
					setNode('node-c', 'C', [
						{ name: 'via', value: '={{ $json.via }}', type: 'string' },
						{
							name: 'origin',
							value: "={{ $('When clicking Execute').item.json.n }}",
							type: 'number',
						},
					]),
					setNode('node-d', 'D', [
						{ name: 'via', value: '={{ $json.via }}', type: 'string' },
						{
							name: 'origin',
							value: "={{ $('When clicking Execute').item.json.n }}",
							type: 'number',
						},
					]),
				],
				{
					[TRIGGER.name]: {
						main: [
							[
								{ node: 'A', type: 'main', index: 0 },
								{ node: 'B', type: 'main', index: 0 },
							],
						],
					},
					A: mainTo('C'),
					B: mainTo('C'),
					C: mainTo('D'),
				},
			),
		);
		const { execution, steps, byNode } = await runWorkflow(graph, [
			[{ json: { n: 1 } }, { json: { n: 2 } }],
		]);

		expect(execution.status).toBe('completed');
		expect(steps.filter((step) => step.nodeId === 'node-c')).toHaveLength(1);

		// A's items first, then B's, and each item resolves the trigger item behind it,
		// inside C through its input link and in D through C's output link.
		const jsonOf = (nodeId: string) => {
			const [items] = byNode(nodeId)?.outputs ?? [];
			return (items as Array<{ json: unknown }>).map(({ json }) => json);
		};
		const expected = [
			{ via: 'A', origin: 1 },
			{ via: 'A', origin: 2 },
			{ via: 'B', origin: 1 },
			{ via: 'B', origin: 2 },
		];
		expect(jsonOf('node-c')).toEqual(expected);
		expect(jsonOf('node-d')).toEqual(expected);

		// Every item of C names the edge it came from, so a later node can walk to it.
		expect(byNode('node-c')?.outputs?.[0]).toMatchObject([
			{ pairedItem: { item: 0, sourceOverwrite: { previousNode: 'A', previousNodeOutput: 0 } } },
			{ pairedItem: { item: 1, sourceOverwrite: { previousNode: 'A', previousNodeOutput: 0 } } },
			{ pairedItem: { item: 0, sourceOverwrite: { previousNode: 'B', previousNodeOutput: 0 } } },
			{ pairedItem: { item: 1, sourceOverwrite: { previousNode: 'B', previousNodeOutput: 0 } } },
		]);
	});

	//                   ┌──────┐  done  ┌───────┐
	// ┌───────┐         │      ├───────►│ After │
	// │trigger├────────►│ Loop │        └───────┘
	// └───────┘         │      ├─┐ loop
	//                   └──▲───┘ │   ┌───┐    ┌───┐    ┌───┐
	//                      │     └──►│ X ├───►│ Y ├───►│ C ├──┐
	//                      │         └───┘    └───┘    └───┘  │
	//                      └──────────────────────────────────┘
	// Loop hands out one item per pass. C reads the X item two hops back, so
	// the run data of Y has to name its pass too. After reads the done item
	// behind its own, which Loop emitted on its last pass.
	it('resolves paired items inside a loop body and after the loop against the pass that fed them', async () => {
		const graph = converter.convert(
			v1Workflow(
				[
					TRIGGER,
					{
						id: 'loop',
						name: 'Loop',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						parameters: { batchSize: 1 },
					},
					setNode('x', 'X', [{ name: 'n', value: '={{ $json.n }}', type: 'number' }]),
					{ id: 'y', name: 'Y', type: 'n8n-nodes-base.noOp', typeVersion: 1 },
					setNode('c', 'C', [{ name: 'got', value: "={{ $('X').item.json.n }}", type: 'number' }]),
					setNode('after', 'After', [
						{ name: 'done', value: "={{ $('Loop').item.json.got }}", type: 'number' },
					]),
				],
				{
					'When clicking Execute': mainTo('Loop'),
					Loop: {
						main: [
							[{ node: 'After', type: 'main' as const, index: 0 }],
							[{ node: 'X', type: 'main' as const, index: 0 }],
						],
					},
					X: mainTo('Y'),
					Y: mainTo('C'),
					C: mainTo('Loop'),
				},
			),
		);
		const { execution, steps } = await runWorkflow(graph, [
			[{ json: { n: 1 } }, { json: { n: 2 } }, { json: { n: 3 } }],
		]);

		expect(execution.status).toBe('completed');
		const gotPerPass = steps
			.filter((step) => step.nodeId === 'c')
			.sort((a, b) => a.iteration - b.iteration)
			.map((step) => {
				const [items] = step.outputs ?? [];
				return (items as Array<{ json: { got: number } }>)[0].json.got;
			});
		expect(gotPerPass).toEqual([1, 2, 3]);

		const [afterItems] = steps.find((step) => step.nodeId === 'after')?.outputs ?? [];
		expect((afterItems as Array<{ json: { done: number } }>).map(({ json }) => json.done)).toEqual([
			1, 2, 3,
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

		expect(at('one', 2)?.outputs).toEqual([
			[
				{ json: { n: 1 }, pairedItem: { item: 0 } },
				{ json: { n: 2 }, pairedItem: { item: 0 } },
			],
			null,
		]);

		expect(at('body-two', 0)?.status).toBe('completed');
		expect(at('body-two', 1)?.status).toBe('completed');
		expect(at('two', 2)?.outputs).toEqual([
			[
				{ json: { n: 1 }, pairedItem: { item: 0 } },
				{ json: { n: 2 }, pairedItem: { item: 0 } },
			],
			null,
		]);
		expect(at('after', 0)?.status).toBe('completed');
	});

	// ┌───────┐    ┌─────┐  loop  ┌─────────┐
	// │trigger├───►│     ├───────►│ BodyOne │
	// └───────┘    │ One │        └────┬────┘
	//              │     │◄────────────┘
	//              └──┬──┘
	//                 │ done
	//              ┌──▼──┐  loop  ┌─────────┐
	//              │     ├───────►│ BodyTwo │
	//              │ Two │        └────┬────┘
	//              │     │◄────────────┘
	//              └──┬──┘
	//                 │ done
	//             ┌───▼───┐
	//             │ After │
	//             └───────┘
	// BodyTwo reads the One item behind its own. One emitted it on its last pass,
	// so a step inside loop Two needs that pass of One in its run data. Each body
	// runs once, so every item keeps its position through both loops.
	it('resolves a paired item into an earlier loop from the body of a later one', async () => {
		const workflow = chainedLoopsV1Workflow(2);
		workflow.nodes = workflow.nodes.map((node) =>
			node.id === 'body-two'
				? {
						...node,
						...setNode('body-two', 'BodyTwo', [
							{ name: 'n', value: "={{ $('One').item.json.n }}", type: 'number' },
						]),
					}
				: node,
		);
		const { execution, steps } = await runWorkflow(converter.convert(workflow), [
			[{ json: { n: 1 } }, { json: { n: 2 } }],
		]);

		expect(execution.status).toBe('completed');
		const [bodyTwoItems] = steps.find((step) => step.nodeId === 'body-two')?.outputs ?? [];
		expect((bodyTwoItems as Array<{ json: { n: number } }>).map(({ json }) => json.n)).toEqual([
			1, 2,
		]);
	});

	// The cases below walk the links the way the data proxy does, from each item
	// of a node back to the Split Out item it came from, on the run data the
	// execution view reports. They read the view over HTTP, so the data plane
	// has to report what the loop node states.
	describe('links through a loop node, read from the execution view', () => {
		const reads = (name: string, value: string) =>
			setNode(name.toLowerCase(), name, [{ name: 'got', value, type: 'number' }]);
		const SPLIT_OUT_ITEM = "={{ $('Split Out').item.json.list }}";
		const fanOut = (done: string, loop: string) => ({
			main: [
				[{ node: done, type: 'main' as const, index: 0 }],
				[{ node: loop, type: 'main' as const, index: 0 }],
			],
		});

		/** `field` of the Split Out item each item of `node` links back to, per run. */
		function splitOutValues(runData: IRunData, node: string, field = 'list'): unknown[][] {
			return (runData[node] ?? []).map((task, run) =>
				(task.data?.main[0] ?? []).map((_, index) => {
					let at = { node, run, slot: 0, index };
					while (at.node !== 'Split Out') {
						const item = runData[at.node][at.run].data?.main[at.slot]?.[at.index];
						const link = item?.pairedItem as IPairedItemData | undefined;
						if (link === undefined) return `no link at ${at.node}/${at.run}/${at.slot}/${at.index}`;
						const address =
							link.sourceOverwrite ?? runData[at.node][at.run].source[link.input ?? 0];
						if (!address) return `no source at ${at.node}/${at.run}`;
						at = {
							node: address.previousNode,
							run: address.previousNodeRun ?? 0,
							slot: address.previousNodeOutput ?? 0,
							index: link.item,
						};
					}
					return runData['Split Out'][at.run].data?.main[at.slot]?.[at.index]?.json[field];
				}),
			);
		}

		/** `got` of each item of `node`, per run: what the data proxy resolved while the node ran. */
		const gotValues = (runData: IRunData, node: string) =>
			(runData[node] ?? []).map((task) => (task.data?.main[0] ?? []).map(({ json }) => json.got));

		/**
		 * Each link of `slot` as Node/Pass/Slot/Item, resolved as the data proxy resolves
		 * it: the item's own address if it has one, else the source of the run.
		 */
		const linksOf = (run: ITaskData, slot: number) =>
			(run.data?.main[slot] ?? []).map(({ pairedItem }) => {
				const link = pairedItem as IPairedItemData;
				const address = link.sourceOverwrite ?? run.source[link.input ?? 0];
				return `${address?.previousNode}/${address?.previousNodeRun ?? 0}/${address?.previousNodeOutput ?? 0}/${link.item}`;
			});

		async function runAndRead(
			nodes: Parameters<typeof v1Workflow>[0],
			connections: Parameters<typeof v1Workflow>[1],
			list: number[],
		) {
			const graph = converter.convert(
				v1Workflow([TRIGGER, splitOutNode('split-out', 'Split Out', 'list'), ...nodes], {
					'When clicking Execute': mainTo('Split Out'),
					...connections,
				}),
			);
			const { execution, view } = await runWorkflow(graph, [[{ json: { list } }]]);
			expect(execution.status).toBe('completed');
			return toV1RunExecutionData(graph, view.steps ?? []).resultData.runData;
		}

		//                         ┌──────┐  done  ┌───────┐
		// ┌───────┐  ┌─────────┐  │      ├───────►│ After │
		// │trigger├─►│Split Out├─►│ Loop │        └───────┘
		// └───────┘  └─────────┘  │      ├─┐ loop
		//                         └──▲───┘ │   ┌───┐
		//                            │     └──►│ C ├──┐
		//                            │         └───┘  │
		//                            └────────────────┘
		// Split Out makes five items from one, so each of them links to input item 0.
		// Loop hands out two items per pass. C and After read the Split Out item behind
		// their own, so the walk needs the link the loop node puts on each item it hands
		// out and on each done item.
		it('links a batch of two, with a shorter last batch', async () => {
			const runData = await runAndRead(
				[loopNode('loop', 'Loop', 2), reads('C', SPLIT_OUT_ITEM), reads('After', SPLIT_OUT_ITEM)],
				{ 'Split Out': mainTo('Loop'), Loop: fanOut('After', 'C'), C: mainTo('Loop') },
				[1, 2, 3, 4, 5],
			);

			expect(splitOutValues(runData, 'C')).toEqual([[1, 2], [3, 4], [5]]);
			expect(splitOutValues(runData, 'After')).toEqual([[1, 2, 3, 4, 5]]);
			expect(gotValues(runData, 'C')).toEqual([[1, 2], [3, 4], [5]]);
			expect(gotValues(runData, 'After')).toEqual([[1, 2, 3, 4, 5]]);

			const [pass0, pass1, pass2, lastPass] = runData.Loop;
			expect([
				linksOf(pass0, 1),
				linksOf(pass1, 1),
				linksOf(pass2, 1),
				linksOf(lastPass, 0),
			]).toEqual([
				['Split Out/0/0/0', 'Split Out/0/0/1'],
				['Split Out/0/0/2', 'Split Out/0/0/3'],
				['Split Out/0/0/4'],
				['C/0/0/0', 'C/0/0/1', 'C/1/0/0', 'C/1/0/1', 'C/2/0/0'],
			]);
		});

		it('links through a loop slot that returns straight to the loop node', async () => {
			const runData = await runAndRead(
				[loopNode('loop', 'Loop', 2), reads('After', SPLIT_OUT_ITEM)],
				{ 'Split Out': mainTo('Loop'), Loop: fanOut('After', 'Loop') },
				[1, 2, 3],
			);

			expect(splitOutValues(runData, 'After')).toEqual([[1, 2, 3]]);
			expect(gotValues(runData, 'After')).toEqual([[1, 2, 3]]);
		});

		it('links through two loops in a row', async () => {
			const runData = await runAndRead(
				[
					loopNode('one', 'One', 2),
					reads('B1', SPLIT_OUT_ITEM),
					loopNode('two', 'Two', 1),
					reads('B2', SPLIT_OUT_ITEM),
					reads('After', SPLIT_OUT_ITEM),
				],
				{
					'Split Out': mainTo('One'),
					One: fanOut('Two', 'B1'),
					B1: mainTo('One'),
					Two: fanOut('After', 'B2'),
					B2: mainTo('Two'),
				},
				[1, 2, 3],
			);

			expect(splitOutValues(runData, 'B1')).toEqual([[1, 2], [3]]);
			expect(splitOutValues(runData, 'B2')).toEqual([[1], [2], [3]]);
			expect(splitOutValues(runData, 'After')).toEqual([[1, 2, 3]]);
			expect(gotValues(runData, 'B1')).toEqual([[1, 2], [3]]);
			expect(gotValues(runData, 'B2')).toEqual([[1], [2], [3]]);
			expect(gotValues(runData, 'After')).toEqual([[1, 2, 3]]);
		});
	});

	// TODO(CAT-2874): slot-shaped IO and branching land as a PR series (#35672
	// first); If/Merge routing is asserted once input slots beyond 0 exist.
	it.todo('routes items through an If node and consolidates with Merge');

	it('runs a Merge with an empty first input on the items of its second input only', async () => {
		const graph = converter.convert(
			v1Workflow(
				[
					TRIGGER,
					splitOutNode('split-out-1', 'SplitOut1', 'list'),
					splitOutNode('split-out-2', 'SplitOut2', 'n'),
					{
						id: 'merge',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3,
						parameters: {},
					},
				],
				{
					'When clicking Execute': mainTo('SplitOut1'),
					SplitOut1: {
						main: [
							[
								{ node: 'SplitOut2', type: 'main' as const, index: 0 },
								{ node: 'Merge', type: 'main' as const, index: 1 },
							],
						],
					},
					SplitOut2: { main: [[{ node: 'Merge', type: 'main' as const, index: 0 }]] },
				},
			),
		);

		const { execution, byNode } = await runWorkflow(graph, [[{ json: { list: [0] } }]]);

		expect(execution.status).toBe('completed');
		expect(byNode('split-out-2')?.outputs).toEqual([null]);
		expect(byNode('merge')?.outputs).toEqual([[expect.objectContaining({ json: { list: 0 } })]]);
	});

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
			[
				{ json: { n: 1 }, pairedItem: { item: 0 } },
				{ json: { n: 2 }, pairedItem: { item: 0 } },
				{ json: { n: 3 }, pairedItem: { item: 0 } },
			],
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
