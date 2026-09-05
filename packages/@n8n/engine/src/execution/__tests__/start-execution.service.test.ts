import { describe, expect, it, vi } from 'vitest';

import { AdmittanceRejectedError, type AdmittanceService } from '../../admittance';
import { GraphValidationError, type WorkflowGraph } from '../../graph';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import type { ExecutionStore } from '../execution-store';
import { StartExecutionService } from '../start-execution.service';

const sampleGraph: WorkflowGraph = {
	nodes: [{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} }],
	edges: [],
};

function makeQueue(): WorkQueue<OrchestrationMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

function makeStore(overrides: Partial<ExecutionStore> = {}): ExecutionStore {
	return {
		createExecution: vi.fn(),
		loadExecution: vi.fn(),
		transitionStatus: vi.fn().mockResolvedValue(true),
		finishExecution: vi.fn().mockResolvedValue(true),
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
			triggerOutputs: [[{ json: { hello: 'world' } }]],
			executionId: 'exec-id-1',
		});

		expect(result.executionId).toBe('exec-id-1');
		expect(admittance.evaluate).toHaveBeenCalledWith({ workflowId: 'wf-1' });
		expect(store.createExecution).toHaveBeenCalledWith({
			id: 'exec-id-1',
			workflowId: 'wf-1',
			status: 'queued',
			mode: 'production',
			graph: sampleGraph,
			triggerOutputs: [[{ json: { hello: 'world' } }]],
			context: {},
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
		const context = { userId: 'user-1', projectId: 'project-1', hostMode: 'webhook' };

		await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			executionId: 'exec-id-1',
			context,
		});

		expect(store.createExecution).toHaveBeenCalledWith(expect.objectContaining({ context }));
	});

	it('defaults mode to production, triggerOutputs to null and context to empty', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const queue = makeQueue();
		const service = new StartExecutionService(admittance, store, queue);

		await service.start({ workflowId: 'wf-1', graph: sampleGraph, executionId: 'exec-id-1' });

		expect(store.createExecution).toHaveBeenCalledWith(
			expect.objectContaining({ mode: 'production', triggerOutputs: null, context: {} }),
		);
	});

	it('passes the graph to the validator', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const validateGraph = vi.fn();
		const service = new StartExecutionService(admittance, makeStore(), makeQueue(), validateGraph);

		await service.start({ workflowId: 'wf-1', graph: sampleGraph, executionId: 'exec-id-1' });

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
			service.start({ workflowId: 'wf-1', graph: sampleGraph, executionId: 'exec-id-1' }),
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
			service.start({ workflowId: 'wf-1', graph: sampleGraph, executionId: 'exec-id-1' }),
		).rejects.toBeInstanceOf(AdmittanceRejectedError);

		expect(store.createExecution).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});
});
