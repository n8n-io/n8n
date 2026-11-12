import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDataSource, createStores } from '../../database';
import { generateId } from '../../database/generate-id';
import type { GraphEdge, GraphNode, WorkflowGraph } from '../../graph';
import {
	LifecycleEventPublisherFactory,
	type LifecycleEvent,
	type LifecycleEventPublisher,
} from '../../lifecycle-events';
import type { OrchestrationMessage, StepMessage, WorkQueue } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { stepKeyId, type StepSlots } from '../execution.types';
import { StepSettledHandler } from '../step-settled-handler';

/** Records what is published and never dispatches it, so each test picks the delivery order. */
class RecordingQueue<T> implements WorkQueue<T> {
	published: T[] = [];

	async publish(message: T) {
		this.published.push(message);
	}

	start() {}

	async stop() {}
}

class RecordingPublisher implements LifecycleEventPublisher {
	events: LifecycleEvent[] = [];

	publish(event: LifecycleEvent) {
		this.events.push(event);
	}

	async stop() {}
}

const items: StepSlots = [[{ json: {} }]];

const trigger: GraphNode = { id: 'trigger', name: 'trigger', type: 'trigger' };
const node = (id: string): GraphNode => ({ id, name: id, type: 'v1-node' });
const batch = (id: string): GraphNode => ({
	id,
	name: id,
	type: 'batch',
	config: { batchSize: 1 },
});
const edge = (from: string, to: string, outputIndex = 0, inputIndex = 0): GraphEdge => ({
	from,
	to,
	outputIndex,
	inputIndex,
});
const backEdge = (from: string, to: string): GraphEdge => ({ ...edge(from, to), isBackEdge: true });

type Run = Awaited<ReturnType<typeof setup>>;

/**
 * Starts an execution whose trigger has completed and whose `queued` nodes
 * wait at iteration 0. Steps then move only when the test says so: `complete`
 * is a step worker committing an outcome, and `settle` is the orchestration
 * worker consuming that step's `step:settled` event.
 */
async function setup(dataSource: DataSource, graph: WorkflowGraph, queued: string[]) {
	const { executionStore, stepStore } = createStores(dataSource);
	const stepQueue = new RecordingQueue<StepMessage>();
	const publisher = new RecordingPublisher();
	const handler = new StepSettledHandler(
		executionStore,
		stepStore,
		stepQueue,
		new RecordingQueue<OrchestrationMessage>(),
		new LifecycleEventPublisherFactory(publisher),
		noopExecutionResponseSender,
	);
	const executionId = generateId();

	await executionStore.createExecution({
		id: executionId,
		workflowId: 'wf-completion-race',
		status: 'running',
		mode: 'production',
		graph: { ...graph, seeded: [] },
		workflow: {},
		triggerOutputs: null,
		callerContext: { hostMode: 'trigger' },
		responseExpectation: { kind: 'none' },
		parent: null,
		lifecycleEventSubscription: { kind: 'all' },
	});
	await stepStore.createSteps(executionId, [
		{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: items },
		...queued.map((nodeId) => ({ nodeId, iteration: 0, status: 'queued' as const })),
	]);

	async function stepId(nodeId: string, iteration: number) {
		const key = { nodeId, iteration };
		const step = (await stepStore.loadStepsByKeys(executionId, [key]))[stepKeyId(key)];
		expect(step, `no step for ${nodeId}@${iteration}`).toBeDefined();
		return step.id;
	}

	return {
		stepQueue,
		async complete(nodeId: string, { iteration = 0, outputs = items } = {}) {
			const id = await stepId(nodeId, iteration);
			expect(await stepStore.claimStep(id)).not.toBeNull();
			expect(await stepStore.completeStep(id, outputs)).toBe(true);
		},
		async settle(nodeId: string, iteration = 0) {
			const id = await stepId(nodeId, iteration);
			await handler.handle({ type: 'step:settled', executionId, stepId: id });
		},
		status: async () => await executionStore.loadExecutionStatus(executionId),
		endEvents: () =>
			publisher.events.filter(
				(event) => event.type === 'execution:completed' || event.type === 'execution:failed',
			),
		unsettled: async () =>
			(await stepStore.loadAllSteps(executionId))
				.filter((step) => step.status === 'queued' || step.status === 'running')
				.map((step) => step.nodeId),
	};
}

/**
 * CET-317: an execution may only finish once every step it owes has settled.
 * Until a successor is planned it has no row, so a check that only looks for
 * queued or running rows can see an empty execution while another
 * `step:settled` event is still waiting to plan more work.
 *
 * These tests drive `StepSettledHandler` against real Postgres and deliver
 * `step:settled` events in those racy orders.
 */
describe('execution completion under racy step:settled delivery (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;

	beforeAll(async () => {
		container = await new PostgreSqlContainer(postgresVersions.primary).start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	type RaceCase = {
		title: string;
		graph: WorkflowGraph;
		queued: string[];
		/** Ends at the point where no step is queued or running, but work is still owed. */
		race: (run: Run) => Promise<void>;
		/** Delivers what was held back and runs the rest of the graph to the end. */
		finish: (run: Run) => Promise<void>;
	};

	const raceCases: RaceCase[] = [
		{
			/**
			 * trigger ─► a
			 *    └─────► b ─► y
			 */
			title: 'a terminal step settles before its sibling has planned its successor',
			graph: {
				nodes: [trigger, node('a'), node('b'), node('y')],
				edges: [edge('trigger', 'a'), edge('trigger', 'b'), edge('b', 'y')],
			},
			queued: ['a', 'b'],
			race: async (run) => {
				await run.complete('b');
				await run.complete('a');
				await run.settle('a');
			},
			finish: async (run) => {
				await run.settle('b');
				await run.complete('y');
				await run.settle('y');
			},
		},
		{
			/**
			 * trigger ─► a ─► m
			 *    ├─────► b ──┘
			 *    └─────► c
			 */
			title: 'a terminal step settles while a fan-in still waits on its second input',
			graph: {
				nodes: [trigger, node('a'), node('b'), node('c'), node('m')],
				edges: [
					edge('trigger', 'a'),
					edge('trigger', 'b'),
					edge('trigger', 'c'),
					edge('a', 'm'),
					edge('b', 'm'),
				],
			},
			queued: ['a', 'b', 'c'],
			race: async (run) => {
				await run.complete('a');
				await run.settle('a');
				await run.complete('b');
				await run.complete('c');
				await run.settle('c');
			},
			finish: async (run) => {
				await run.settle('b');
				await run.complete('m');
				await run.settle('m');
			},
		},
		{
			/**
			 * trigger ─► if ─[0]─► x
			 *             └─[1]─► z ─► w
			 */
			title: 'a terminal step settles while a skip cascade is still in flight',
			graph: {
				nodes: [trigger, node('if'), node('x'), node('z'), node('w')],
				edges: [edge('trigger', 'if'), edge('if', 'x'), edge('if', 'z', 1), edge('z', 'w')],
			},
			queued: ['if'],
			race: async (run) => {
				await run.complete('if', { outputs: [...items, null] });
				// queues x and skips z
				await run.settle('if');
				await run.complete('x');
				await run.settle('x');
			},
			finish: async (run) => {
				// skips w, which settles on creation and ends the run
				await run.settle('z');
			},
		},
		{
			/**
			 * trigger ─► B ─[0]─► d
			 *    │       │ ▲
			 *    │      [1] └─(back)─┐
			 *    │       └──► x ─────┘
			 *    └─────► t
			 *
			 * Between two passes of the loop no step is queued or running, and the
			 * next pass of B is not planned until x's `step:settled` event is handled.
			 */
			title: 'a terminal step settles between two passes of a loop',
			graph: {
				nodes: [trigger, batch('B'), node('x'), node('d'), node('t')],
				edges: [
					edge('trigger', 'B'),
					edge('trigger', 't'),
					edge('B', 'x', 1),
					backEdge('x', 'B'),
					edge('B', 'd', 0),
				],
			},
			queued: ['B', 't'],
			race: async (run) => {
				await run.complete('B', { outputs: [null, ...items] });
				await run.settle('B');
				await run.complete('x');
				await run.complete('t');
				await run.settle('t');
			},
			finish: async (run) => {
				// plans the second pass of B
				await run.settle('x');
				await run.complete('B', { iteration: 1, outputs: [...items, null] });
				await run.settle('B', 1);
				await run.complete('d');
				await run.settle('d');
			},
		},
	];

	it.each(raceCases)(
		'stays running when $title, and completes once the rest has run',
		async ({ graph, queued, race, finish }) => {
			const run = await setup(dataSource, graph, queued);

			await race(run);

			expect(await run.unsettled()).toEqual([]);
			expect(await run.status()).toBe('running');
			expect(run.endEvents()).toEqual([]);

			await finish(run);

			expect(await run.status()).toBe('completed');
			expect(run.endEvents().map((event) => event.type)).toEqual(['execution:completed']);
		},
	);

	/**
	 * trigger ─► a
	 *    └─────► b ─► y
	 */
	const forkGraph: WorkflowGraph = {
		nodes: [trigger, node('a'), node('b'), node('y')],
		edges: [edge('trigger', 'a'), edge('trigger', 'b'), edge('b', 'y')],
	};

	it('neither plans a successor twice nor finishes early when every step:settled is delivered twice', async () => {
		const run = await setup(dataSource, forkGraph, ['a', 'b']);
		await run.complete('a');
		await run.complete('b');

		await run.settle('a');
		await run.settle('a');
		await run.settle('b');
		await run.settle('b');

		expect(run.stepQueue.published).toHaveLength(1);
		expect(await run.status()).toBe('running');
		expect(run.endEvents()).toEqual([]);

		await run.complete('y');
		await run.settle('y');
		await run.settle('y');

		expect(await run.status()).toBe('completed');
		expect(run.endEvents().map((event) => event.type)).toEqual(['execution:completed']);
	});

	it('stays running when a terminal step and its sibling settle concurrently', async () => {
		for (let round = 0; round < 5; round++) {
			const run = await setup(dataSource, forkGraph, ['a', 'b']);
			await run.complete('a');
			await run.complete('b');

			await Promise.all([run.settle('a'), run.settle('b')]);

			expect(await run.status()).toBe('running');
			expect(run.stepQueue.published).toHaveLength(1);
			expect(run.endEvents()).toEqual([]);
		}
	});

	it.each([
		{
			/**
			 * trigger ─► a ─► j
			 *    └─────► b ──┘   (both into input 0)
			 */
			shape: 'both predecessors feed one input',
			joinEdges: [edge('a', 'j'), edge('b', 'j')],
		},
		{
			/**
			 * trigger ─► a ─[in 0]─► j
			 *    └─────► b ─[in 1]──┘
			 */
			shape: 'each predecessor feeds its own input',
			joinEdges: [edge('a', 'j', 0, 0), edge('b', 'j', 0, 1)],
		},
	])(
		'plans a join once and completes once when its two predecessors settle concurrently ($shape)',
		async ({ joinEdges }) => {
			const graph: WorkflowGraph = {
				nodes: [trigger, node('a'), node('b'), node('j')],
				edges: [edge('trigger', 'a'), edge('trigger', 'b'), ...joinEdges],
			};

			for (let round = 0; round < 25; round++) {
				const run = await setup(dataSource, graph, ['a', 'b']);
				await run.complete('a');
				await run.complete('b');

				await Promise.all([run.settle('a'), run.settle('b')]);

				expect(run.stepQueue.published).toHaveLength(1);
				expect(await run.status()).toBe('running');
				expect(run.endEvents()).toEqual([]);

				await run.complete('j');
				await Promise.all([run.settle('j'), run.settle('j')]);

				expect(await run.status()).toBe('completed');
				expect(run.endEvents().map((event) => event.type)).toEqual(['execution:completed']);
			}
		},
	);

	it('announces the end once when the last two steps settle concurrently', async () => {
		/**
		 * trigger ─► a
		 *    └─────► b
		 */
		const graph = {
			nodes: [trigger, node('a'), node('b')],
			edges: [edge('trigger', 'a'), edge('trigger', 'b')],
		};

		for (let round = 0; round < 5; round++) {
			const run = await setup(dataSource, graph, ['a', 'b']);
			await run.complete('a');
			await run.complete('b');

			await Promise.all([run.settle('a'), run.settle('b')]);

			expect(await run.status()).toBe('completed');
			expect(run.endEvents().map((event) => event.type)).toEqual(['execution:completed']);
		}
	});
});
