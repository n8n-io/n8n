import { describe, expect, it, vi } from 'vitest';

import { AdmittanceRejectedError, type AdmittanceService } from '../../admittance';
import { GraphValidationError, type WorkflowGraph } from '../../graph';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import type { ExecutionStore } from '../execution-store';
import type { WorkflowDocument } from '../execution.types';
import { StartExecutionService } from '../start-execution.service';

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

describe('StartExecutionService', () => {
	it('admits, persists a queued execution under the caller-minted id, publishes execution:enqueued', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const queue = makeQueue();
		const service = new StartExecutionService(admittance, store, queue);

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
		});
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'execution:enqueued',
			executionId: 'exec-id-1',
		});
	});

	it('stores the caller context as given', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const service = new StartExecutionService(admittance, store, makeQueue());
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
		const service = new StartExecutionService(admittance, store, makeQueue());

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
		const service = new StartExecutionService(admittance, store, queue);

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
		const service = new StartExecutionService(admittance, makeStore(), makeQueue(), validateGraph);

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
		const service = new StartExecutionService(admittance, store, queue, validateGraph);

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
		const service = new StartExecutionService(admittance, store, queue);

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
			const service = new StartExecutionService(admittance, store, makeQueue());
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
			const service = new StartExecutionService(admittance, store, makeQueue());

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
			const service = new StartExecutionService(admittance, store, queue);

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
			const service = new StartExecutionService(admittance, store, makeQueue());

			await expect(
				service.start({ ...base, graph: loopGraph, seededSteps: { [nodeId]: [[]] } }),
			).rejects.toThrow(/inside the loop of loop/);
			expect(store.createExecution).not.toHaveBeenCalled();
		});
	});
});
