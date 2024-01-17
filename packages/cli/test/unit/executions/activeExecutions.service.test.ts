import { mock } from 'jest-mock-extended';
import { In, Not } from 'typeorm';
import type { User } from '@db/entities/User';
import type { ExecutionRepository } from '@db/repositories/execution.repository';
import type { ActiveExecutions } from '@/ActiveExecutions';
import { ActiveExecutionsService } from '@/executions/activeExecutions.service';
import type { WorkflowSharingService } from '@/workflows/workflowSharing.service';
import type { Job, Queue } from '@/Queue';

describe('ActiveExecutionsService', () => {
	const user = mock<User>();
	const queue = mock<Queue>();
	const activeExecutions = mock<ActiveExecutions>();
	const executionRepository = mock<ExecutionRepository>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const service = new ActiveExecutionsService(
		mock(),
		queue,
		activeExecutions,
		executionRepository,
		mock(),
		workflowSharingService,
	);

	beforeEach(() => jest.clearAllMocks());

	describe('getQueueModeExecutions', () => {
		it('should return a list of currently running queue mode executions when there are active and waiting jobs in the queue', async () => {
			const jobs = [{ executionId: '1' }, { executionId: '2' }, { executionId: '3' }].map(
				({ executionId }, index) => {
					return {
						id: index,
						data: { executionId, loadStaticData: false },
					} as Job;
				},
			);
			queue.getJobs.mockResolvedValue(jobs);
			activeExecutions.getActiveExecutions.mockReturnValue([]);
			workflowSharingService.getSharedWorkflowIds.calledWith(user).mockResolvedValue(['w1', 'w2']);
			executionRepository.findMultipleExecutions.mockResolvedValue([]);

			const result = await service.getQueueModeExecutions(user, {});

			expect(result).toEqual([]);
			expect(queue.getJobs).toHaveBeenCalledWith(['active', 'waiting']);
			expect(workflowSharingService.getSharedWorkflowIds).toHaveBeenCalledWith(user);
			expect(executionRepository.findMultipleExecutions).toHaveBeenCalledWith({
				select: ['id', 'workflowId', 'mode', 'retryOf', 'startedAt', 'stoppedAt', 'status'],
				order: { id: 'DESC' },
				where: {
					id: In(['1', '2', '3']),
					status: Not(In(['finished', 'stopped', 'failed', 'crashed'])),
					workflowId: In(['w1', 'w2']),
				},
			});
		});
	});
});
