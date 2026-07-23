import { describe, expect, it, vi } from 'vitest';

import { AdmittanceRejectedError, type AdmittanceService } from '../../admittance';
import type { WorkflowGraph } from '../../graph';
import { InMemoryWorkQueue, type OrchestrationMessage } from '../../queue';
import type { ExecutionStore } from '../execution-store';
import { StartExecutionService } from '../start-execution.service';

const sampleGraph: WorkflowGraph = {
	nodes: [{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} }],
	edges: [],
};

function makeStore(overrides: Partial<ExecutionStore> = {}): ExecutionStore {
	return {
		createExecution: vi.fn().mockResolvedValue({ id: 'exec-id-1' }),
		loadExecution: vi.fn(),
		transitionStatus: vi.fn().mockResolvedValue(true),
		failExecution: vi.fn().mockResolvedValue(true),
		...overrides,
	};
}

describe('StartExecutionService', () => {
	it('admits, persists a queued execution, publishes execution:enqueued, returns id', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const queue = new InMemoryWorkQueue<OrchestrationMessage>();
		const service = new StartExecutionService(admittance, store, queue);

		const result = await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			triggerPayload: { hello: 'world' },
		});

		expect(result.executionId).toBe('exec-id-1');
		expect(admittance.evaluate).toHaveBeenCalledWith({ workflowId: 'wf-1' });
		expect(store.createExecution).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			status: 'queued',
			mode: 'production',
			graph: sampleGraph,
			triggerPayload: { hello: 'world' },
		});
		expect(queue.messages).toEqual([{ type: 'execution:enqueued', executionId: 'exec-id-1' }]);
	});

	it('defaults mode to production and triggerPayload to null', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const store = makeStore();
		const queue = new InMemoryWorkQueue<OrchestrationMessage>();
		const service = new StartExecutionService(admittance, store, queue);

		await service.start({ workflowId: 'wf-1', graph: sampleGraph });

		expect(store.createExecution).toHaveBeenCalledWith(
			expect.objectContaining({ mode: 'production', triggerPayload: null }),
		);
	});

	it('throws AdmittanceRejectedError without persisting or publishing when admittance rejects', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: false, reason: 'queue-full' }),
		};
		const store = makeStore();
		const queue = new InMemoryWorkQueue<OrchestrationMessage>();
		const service = new StartExecutionService(admittance, store, queue);

		await expect(service.start({ workflowId: 'wf-1', graph: sampleGraph })).rejects.toBeInstanceOf(
			AdmittanceRejectedError,
		);

		expect(store.createExecution).not.toHaveBeenCalled();
		expect(queue.messages).toHaveLength(0);
	});
});
