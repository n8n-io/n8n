import type { Repository } from '@n8n/typeorm';
import { describe, expect, it, vi } from 'vitest';

import type { AdmittanceService } from '../../admittance';
import type { WorkflowExecution } from '../../database';
import type { WorkflowGraph } from '../../graph';
import type { WorkQueue, WorkQueueMessage } from '../../queue';
import { AdmittanceRejectedError, StartExecutionService } from '../start-execution.service';

const sampleGraph: WorkflowGraph = {
	nodes: [{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} }],
	edges: [],
};

function makeRepo(): {
	repo: Repository<WorkflowExecution>;
	saved: Array<Partial<WorkflowExecution>>;
} {
	const saved: Array<Partial<WorkflowExecution>> = [];
	const repo = {
		create: vi.fn(
			(entity: Partial<WorkflowExecution>): Partial<WorkflowExecution> => ({
				id: 'exec-id-1',
				...entity,
			}),
		),
		// eslint-disable-next-line @typescript-eslint/require-await -- mock impl
		save: vi.fn(async (entity: WorkflowExecution): Promise<WorkflowExecution> => {
			saved.push(entity);
			return entity;
		}),
	} as unknown as Repository<WorkflowExecution>;
	return { repo, saved };
}

describe('StartExecutionService', () => {
	it('admits, persists an execution row, publishes execution_started, returns id', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const { repo, saved } = makeRepo();
		const messages: WorkQueueMessage[] = [];
		const queue: WorkQueue = {
			publish: vi.fn().mockImplementation(
				// eslint-disable-next-line @typescript-eslint/require-await -- mock impl
				async (m: WorkQueueMessage) => {
					messages.push(m);
				},
			),
		};
		const service = new StartExecutionService(admittance, repo, queue);

		const result = await service.start({
			workflowId: 'wf-1',
			graph: sampleGraph,
			triggerPayload: { hello: 'world' },
		});

		expect(result.executionId).toBe('exec-id-1');
		expect(admittance.evaluate).toHaveBeenCalledWith({ workflowId: 'wf-1' });
		expect(saved).toHaveLength(1);
		expect(saved[0]).toMatchObject({
			workflowId: 'wf-1',
			status: 'running',
			mode: 'production',
			graph: sampleGraph,
			triggerPayload: { hello: 'world' },
			finishedAt: null,
		});
		expect(messages).toEqual([{ type: 'execution:started', executionId: 'exec-id-1' }]);
	});

	it('defaults mode to production and triggerPayload to null', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: true }),
		};
		const { repo, saved } = makeRepo();
		const queue: WorkQueue = { publish: vi.fn().mockResolvedValue(undefined) };
		const service = new StartExecutionService(admittance, repo, queue);

		await service.start({ workflowId: 'wf-1', graph: sampleGraph });

		expect(saved[0]).toMatchObject({
			mode: 'production',
			triggerPayload: null,
		});
	});

	it('throws AdmittanceRejectedError without persisting or publishing when admittance rejects', async () => {
		const admittance: AdmittanceService = {
			evaluate: vi.fn().mockResolvedValue({ accept: false, reason: 'queue-full' }),
		};
		const { repo } = makeRepo();
		const queue: WorkQueue = { publish: vi.fn().mockResolvedValue(undefined) };
		const service = new StartExecutionService(admittance, repo, queue);

		await expect(service.start({ workflowId: 'wf-1', graph: sampleGraph })).rejects.toBeInstanceOf(
			AdmittanceRejectedError,
		);

		expect(repo.save).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});
});
