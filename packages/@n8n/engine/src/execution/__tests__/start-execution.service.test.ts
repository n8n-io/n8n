import { describe, expect, it, vi } from 'vitest';

import { AdmittanceRejectedError, type AdmittanceService } from '../../admittance';
import type { WorkflowGraph } from '../../graph';
import type { WorkQueue, WorkQueueMessage } from '../../queue';
import type { ExecutionStore } from '../execution-store';
import { StartExecutionService } from '../start-execution.service';

const sampleGraph: WorkflowGraph = {
	nodes: [{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} }],
	edges: [],
};

describe('StartExecutionService', () => {
	it('admits, persists a queued execution, publishes execution:enqueued, returns id', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const executionStore: ExecutionStore = {
			createExecution: vi.fn().mockResolvedValue({ id: 'exec-id-1' }),
		};
		const messages: WorkQueueMessage[] = [];
		const queue: WorkQueue = {
			publish: vi.fn().mockImplementation(
				// eslint-disable-next-line @typescript-eslint/require-await -- mock impl
				async (m: WorkQueueMessage) => {
					messages.push(m);
				},
			),
		};
		const service = new StartExecutionService(admittance, executionStore, queue);

		const result = await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			triggerPayload: { hello: 'world' },
		});

		expect(result.executionId).toBe('exec-id-1');
		expect(admittance.evaluate).toHaveBeenCalledWith({ workflowId: 'wf-1' });
		expect(executionStore.createExecution).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			status: 'queued',
			mode: 'production',
			graph: sampleGraph,
			triggerPayload: { hello: 'world' },
		});
		expect(messages).toEqual([{ type: 'execution:enqueued', executionId: 'exec-id-1' }]);
	});

	it('defaults mode to production and triggerPayload to null', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const executionStore: ExecutionStore = {
			createExecution: vi.fn().mockResolvedValue({ id: 'exec-id-1' }),
		};
		const queue: WorkQueue = { publish: vi.fn().mockResolvedValue(undefined) };
		const service = new StartExecutionService(admittance, executionStore, queue);

		await service.start({ workflowId: 'wf-1', graph: sampleGraph });

		expect(executionStore.createExecution).toHaveBeenCalledWith(
			expect.objectContaining({ mode: 'production', triggerPayload: null }),
		);
	});

	it('throws AdmittanceRejectedError without persisting or publishing when admittance rejects', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: false, reason: 'queue-full' }),
		};
		const executionStore: ExecutionStore = { createExecution: vi.fn() };
		const queue: WorkQueue = { publish: vi.fn() };
		const service = new StartExecutionService(admittance, executionStore, queue);

		await expect(service.start({ workflowId: 'wf-1', graph: sampleGraph })).rejects.toBeInstanceOf(
			AdmittanceRejectedError,
		);

		expect(executionStore.createExecution).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});
});
