import { describe, expect, it, vi } from 'vitest';

import { AdmittanceRejectedError, type AdmittanceService } from '../../admittance';
import { GraphValidationError, type WorkflowGraph } from '../../graph';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import {
	ExecutionNotFoundError,
	type ExecutionRecord,
	type ExecutionStore,
} from '../execution-store';
import type { ExecutionStatus, StepStatus, WorkflowDocument } from '../execution.types';
import { StartExecutionService, type InvalidParentLinkReason } from '../start-execution.service';
import { StepNotFoundError, type StepRecord, type StepStore } from '../step-store';

const sampleGraph: WorkflowGraph = {
	nodes: [{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} }],
	edges: [],
};

const sampleWorkflow: WorkflowDocument = {
	id: 'wf-1',
	name: 'Sample',
	nodes: [{ name: 'Manual Trigger' }],
	connections: {},
};

function makeQueue(): WorkQueue<OrchestrationMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

function makeStore(overrides: Partial<ExecutionStore> = {}): ExecutionStore {
	return {
		createExecution: vi.fn(),
		loadExecution: vi.fn(),
		transitionStatus: vi.fn().mockResolvedValue(true),
		finishExecution: vi.fn().mockResolvedValue(null),
		cancelExecution: vi.fn().mockResolvedValue(null),
		loadSeededOutputs: vi.fn().mockResolvedValue(new Map()),
		refreshLiveStatus: vi.fn(),
		...overrides,
	};
}

/** Only `loadStep` is reachable from a start, and only for a parent link. */
function makeStepStore(loadStep = vi.fn()): StepStore {
	return { loadStep } as unknown as StepStore;
}

/** A parent execution and a step of it, in the state that starts a sub-execution. */
function parentRows(executionStatus: ExecutionStatus, stepStatus: StepStatus) {
	const execution = { id: 'exec-parent', status: executionStatus } as ExecutionRecord;
	const step = { id: 'step-1', executionId: 'exec-parent', status: stepStatus } as StepRecord;
	return {
		store: makeStore({ loadExecution: vi.fn().mockResolvedValue(execution) }),
		stepStore: makeStepStore(vi.fn().mockResolvedValue(step)),
	};
}

describe('StartExecutionService', () => {
	it('admits, persists a queued execution under the caller-minted id, publishes execution:enqueued', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const queue = makeQueue();
		const service = new StartExecutionService(admittance, store, makeStepStore(), queue);

		const result = await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			workflow: sampleWorkflow,
			triggerOutputs: [[{ json: { hello: 'world' } }]],
			executionId: 'exec-id-1',
			callerContext: { hostMode: 'trigger' },
		});

		expect(result.executionId).toBe('exec-id-1');
		expect(admittance.evaluate).toHaveBeenCalledWith({ workflowId: 'wf-1' });
		expect(store.createExecution).toHaveBeenCalledWith({
			id: 'exec-id-1',
			workflowId: 'wf-1',
			status: 'queued',
			mode: 'production',
			graph: { ...sampleGraph, seeded: [] },
			workflow: sampleWorkflow,
			triggerOutputs: [[{ json: { hello: 'world' } }]],
			callerContext: { hostMode: 'trigger' },
			responseExpectation: { kind: 'none' },
			parent: null,
		});
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'execution:enqueued',
			executionId: 'exec-id-1',
		});
	});

	describe('parent link', () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const base = {
			workflowId: 'wf-1',
			graph: sampleGraph,
			workflow: sampleWorkflow,
			executionId: 'exec-id-1',
			callerContext: { hostMode: 'trigger' as const },
		};

		it.each([
			{ name: 'a waiting step that awaits it', awaited: true, stepStatus: 'waiting' as const },
			{ name: 'a running step that does not', awaited: false, stepStatus: 'running' as const },
		])('stores the link to $name', async ({ awaited, stepStatus }) => {
			const { store, stepStore } = parentRows('running', stepStatus);
			const service = new StartExecutionService(admittance, store, stepStore, makeQueue());
			const parent = { executionId: 'exec-parent', stepId: 'step-1', awaited };

			await service.start({ ...base, parent });

			expect(store.loadExecution).toHaveBeenCalledWith('exec-parent');
			expect(stepStore.loadStep).toHaveBeenCalledWith('step-1');
			expect(store.createExecution).toHaveBeenCalledWith(expect.objectContaining({ parent }));
		});

		it.each([
			{
				name: 'the parent execution has ended',
				executionStatus: 'completed',
				stepStatus: 'waiting',
				reason: 'execution-ended',
			},
			{
				name: 'the parent execution has not started',
				executionStatus: 'queued',
				stepStatus: 'waiting',
				reason: 'execution-ended',
			},
			{
				name: 'an awaiting step is not waiting',
				executionStatus: 'running',
				stepStatus: 'running',
				reason: 'step-not-waiting',
			},
			{
				name: 'a non-awaiting step has already settled',
				executionStatus: 'running',
				stepStatus: 'completed',
				awaited: false,
				reason: 'step-not-running',
			},
		] as Array<{
			name: string;
			executionStatus: ExecutionStatus;
			stepStatus: StepStatus;
			awaited?: boolean;
			reason: InvalidParentLinkReason;
		}>)(
			'rejects the link without persisting when $name',
			async ({ executionStatus, stepStatus, awaited = true, reason }) => {
				const { store, stepStore } = parentRows(executionStatus, stepStatus);
				const queue = makeQueue();
				const service = new StartExecutionService(admittance, store, stepStore, queue);

				await expect(
					service.start({
						...base,
						parent: { executionId: 'exec-parent', stepId: 'step-1', awaited },
					}),
				).rejects.toMatchObject({ name: 'InvalidParentLinkError', reason });
				expect(store.createExecution).not.toHaveBeenCalled();
				expect(queue.publish).not.toHaveBeenCalled();
			},
		);

		it('rejects a step of another execution', async () => {
			const { store } = parentRows('running', 'waiting');
			const stepStore = makeStepStore(
				vi.fn().mockResolvedValue({ id: 'step-1', executionId: 'exec-other', status: 'waiting' }),
			);
			const service = new StartExecutionService(admittance, store, stepStore, makeQueue());

			await expect(
				service.start({
					...base,
					parent: { executionId: 'exec-parent', stepId: 'step-1', awaited: true },
				}),
			).rejects.toMatchObject({ reason: 'step-of-another-execution' });
		});

		it.each([
			{
				name: 'parent execution',
				error: new ExecutionNotFoundError('exec-parent'),
				reason: 'execution-not-found',
			},
			{ name: 'parent step', error: new StepNotFoundError('step-1'), reason: 'step-not-found' },
		])('rejects the link when the $name does not exist', async ({ error, reason }) => {
			const { store, stepStore } = parentRows('running', 'waiting');
			if (error instanceof ExecutionNotFoundError) {
				vi.mocked(store.loadExecution).mockRejectedValue(error);
			} else {
				vi.mocked(stepStore.loadStep).mockRejectedValue(error);
			}
			const service = new StartExecutionService(admittance, store, stepStore, makeQueue());

			await expect(
				service.start({
					...base,
					parent: { executionId: 'exec-parent', stepId: 'step-1', awaited: true },
				}),
			).rejects.toMatchObject({ name: 'InvalidParentLinkError', reason });
			expect(store.createExecution).not.toHaveBeenCalled();
		});
	});

	it('records no parent for a top-level execution', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const service = new StartExecutionService(admittance, store, makeStepStore(), makeQueue());

		await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			workflow: sampleWorkflow,
			executionId: 'exec-id-1',
			callerContext: { hostMode: 'trigger' },
		});

		expect(store.createExecution).toHaveBeenCalledWith(expect.objectContaining({ parent: null }));
	});

	it('stores the caller context as given', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const service = new StartExecutionService(admittance, store, makeStepStore(), makeQueue());
		const callerContext = { userId: 'user-1', projectId: 'project-1', hostMode: 'webhook' };

		await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			workflow: sampleWorkflow,
			executionId: 'exec-id-1',
			callerContext,
		});

		expect(store.createExecution).toHaveBeenCalledWith(expect.objectContaining({ callerContext }));
	});

	it('stores the response expectation as given', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const service = new StartExecutionService(admittance, store, makeStepStore(), makeQueue());

		await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			workflow: sampleWorkflow,
			executionId: 'exec-id-1',
			callerContext: { hostMode: 'webhook' },
			responseExpectation: { kind: 'runEnd' },
		});

		expect(store.createExecution).toHaveBeenCalledWith(
			expect.objectContaining({ responseExpectation: { kind: 'runEnd' } }),
		);
	});

	it('defaults mode to production, triggerOutputs to null and the expectation to none', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const queue = makeQueue();
		const service = new StartExecutionService(admittance, store, makeStepStore(), queue);

		await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			workflow: sampleWorkflow,
			executionId: 'exec-id-1',
			callerContext: { hostMode: 'trigger' },
		});

		expect(store.createExecution).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'production',
				triggerOutputs: null,
				responseExpectation: { kind: 'none' },
			}),
		);
	});

	it('passes the graph to the validator', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const validateGraph = vi.fn();
		const service = new StartExecutionService(
			admittance,
			makeStore(),
			makeStepStore(),
			makeQueue(),
			validateGraph,
		);

		await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			workflow: sampleWorkflow,
			executionId: 'exec-id-1',
			callerContext: { hostMode: 'trigger' },
		});

		expect(validateGraph).toHaveBeenCalledExactlyOnceWith(sampleGraph);
	});

	it('aborts without persisting or publishing when the validator rejects the graph', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const queue = makeQueue();
		const rejection = new GraphValidationError('nope');
		const validateGraph = vi.fn().mockImplementation(() => {
			throw rejection;
		});
		const service = new StartExecutionService(
			admittance,
			store,
			makeStepStore(),
			queue,
			validateGraph,
		);

		await expect(
			service.start({
				workflowId: 'wf-1',
				graph: sampleGraph,
				workflow: sampleWorkflow,
				executionId: 'exec-id-1',
				callerContext: { hostMode: 'trigger' },
			}),
		).rejects.toBe(rejection);

		expect(store.createExecution).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('throws AdmittanceRejectedError without persisting or publishing when admittance rejects', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: false, reason: 'queue-full' }),
		};
		const store = makeStore();
		const queue = makeQueue();
		const service = new StartExecutionService(admittance, store, makeStepStore(), queue);

		await expect(
			service.start({
				workflowId: 'wf-1',
				graph: sampleGraph,
				workflow: sampleWorkflow,
				executionId: 'exec-id-1',
				callerContext: { hostMode: 'trigger' },
			}),
		).rejects.toBeInstanceOf(AdmittanceRejectedError);

		expect(store.createExecution).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	describe('seeded steps', () => {
		// `island` is in the graph but the trigger does not reach it.
		const graph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} },
				{ id: 'a', name: 'A', type: 'v1-node', config: {} },
				{ id: 'b', name: 'B', type: 'v1-node', config: {} },
				{ id: 'island', name: 'Island', type: 'v1-node', config: {} },
			],
			edges: [
				{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 },
			],
		};
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const base = {
			workflowId: 'wf-1',
			graph,
			workflow: sampleWorkflow,
			executionId: 'exec-id-1',
			callerContext: { hostMode: 'manual' },
		};

		it('persists the seeded steps with the execution', async () => {
			const store = makeStore();
			const service = new StartExecutionService(admittance, store, makeStepStore(), makeQueue());
			const seededSteps = { a: [[[{ json: { from: 'earlier' } }]]] };

			await service.start({ ...base, seededSteps });

			// Stored beside the row, with the node marked in the graph so a
			// settlement knows to record it rather than run it.
			expect(store.createExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					graph: { ...graph, seeded: ['a'] },
				}),
			);
			expect(store.createExecution).toHaveBeenCalledWith(expect.objectContaining({ seededSteps }));
		});

		it('rejects a node outside any loop seeded with more than one pass', async () => {
			const store = makeStore();
			const service = new StartExecutionService(admittance, store, makeStepStore(), makeQueue());

			await expect(service.start({ ...base, seededSteps: { a: [[], []] } })).rejects.toThrow(
				/seeded with 2 passes/,
			);
			expect(store.createExecution).not.toHaveBeenCalled();
		});

		it.each([
			{ name: 'a node that is not in the graph', nodeId: 'ghost' },
			{ name: 'a node the trigger does not reach', nodeId: 'island' },
			{ name: 'the trigger', nodeId: 'trigger' },
		])('rejects seeding $name without persisting or publishing', async ({ nodeId }) => {
			const store = makeStore();
			const queue = makeQueue();
			const service = new StartExecutionService(admittance, store, makeStepStore(), queue);

			await expect(service.start({ ...base, seededSteps: { [nodeId]: [[]] } })).rejects.toThrow(
				GraphValidationError,
			);
			expect(store.createExecution).not.toHaveBeenCalled();
			expect(queue.publish).not.toHaveBeenCalled();
		});

		it.each([
			{ name: 'a loop member', nodeId: 'x' },
			{ name: 'the batch node of a loop', nodeId: 'loop' },
		])('rejects seeding $name', async ({ nodeId }) => {
			// trigger -> loop(batch) -> x -> loop (back-edge); loop's done slot -> d
			const loopGraph: WorkflowGraph = {
				nodes: [
					{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} },
					{ id: 'loop', name: 'Loop', type: 'batch', config: { batchSize: 1 } },
					{ id: 'x', name: 'X', type: 'v1-node', config: {} },
					{ id: 'd', name: 'D', type: 'v1-node', config: {} },
				],
				edges: [
					{ from: 'trigger', to: 'loop', outputIndex: 0, inputIndex: 0 },
					{ from: 'loop', to: 'x', outputIndex: 1, inputIndex: 0 },
					{ from: 'x', to: 'loop', outputIndex: 0, inputIndex: 0, isBackEdge: true },
					{ from: 'loop', to: 'd', outputIndex: 0, inputIndex: 0 },
				],
			};
			const store = makeStore();
			const service = new StartExecutionService(admittance, store, makeStepStore(), makeQueue());

			await expect(
				service.start({ ...base, graph: loopGraph, seededSteps: { [nodeId]: [[]] } }),
			).rejects.toThrow(/inside the loop of loop/);
			expect(store.createExecution).not.toHaveBeenCalled();
		});
	});
});
