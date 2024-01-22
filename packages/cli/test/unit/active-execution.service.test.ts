import { mock, mockFn } from 'jest-mock-extended';
import { ActiveExecutionService } from '@/executions/active-execution.service';
import config from '@/config';
import type { ExecutionRepository } from '@db/repositories/execution.repository';
import type { ActiveExecutions } from '@/ActiveExecutions';
import type { Job, Queue } from '@/Queue';
import type { IExecutionBase, IExecutionsCurrentSummary } from '@/Interfaces';
import type { WaitTracker } from '@/WaitTracker';

describe('ActiveExecutionsService', () => {
	const queue = mock<Queue>();
	const activeExecutions = mock<ActiveExecutions>();
	const executionRepository = mock<ExecutionRepository>();
	const waitTracker = mock<WaitTracker>();

	const jobIds = ['j1', 'j2'];
	const jobs = jobIds.map((executionId) => mock<Job>({ data: { executionId } }));

	const activeExecutionService = new ActiveExecutionService(
		mock(),
		queue,
		activeExecutions,
		executionRepository,
		waitTracker,
	);

	const getEnv = mockFn<(typeof config)['getEnv']>();
	config.getEnv = getEnv;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('stop()', () => {
		describe('in regular mode', () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');

			it('should call `ActiveExecutions.stopExecution()`', async () => {
				const execution = mock<IExecutionBase>({ id: '123' });

				await activeExecutionService.stop(execution);

				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
			});

			it('should call `WaitTracker.stopExecution()` if `ActiveExecutions.stopExecution()` found no execution', async () => {
				activeExecutions.stopExecution.mockResolvedValue(undefined);
				const execution = mock<IExecutionBase>({ id: '123' });

				await activeExecutionService.stop(execution);

				expect(waitTracker.stopExecution).toHaveBeenCalledWith(execution.id);
			});
		});

		describe('in queue mode', () => {
			it('should call `ActiveExecutions.stopExecution()`', async () => {
				const execution = mock<IExecutionBase>({ id: '123' });

				await activeExecutionService.stop(execution);

				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
			});

			it('should call `WaitTracker.stopExecution` if `ActiveExecutions.stopExecution()` found no execution', async () => {
				activeExecutions.stopExecution.mockResolvedValue(undefined);
				const execution = mock<IExecutionBase>({ id: '123' });

				await activeExecutionService.stop(execution);

				expect(waitTracker.stopExecution).toHaveBeenCalledWith(execution.id);
			});
		});
	});

	describe('findManyInQueueMode()', () => {
		it('should query for active jobs, waiting jobs, and in-memory executions', async () => {
			const sharedWorkflowIds = ['123'];
			const filter = {};
			const executionIds = ['e1', 'e2'];
			const summaries = executionIds.map((e) => mock<IExecutionsCurrentSummary>({ id: e }));

			activeExecutions.getActiveExecutions.mockReturnValue(summaries);
			queue.getJobs.mockResolvedValue(jobs);
			executionRepository.findMultipleExecutions.mockResolvedValue([]);
			executionRepository.getManyActive.mockResolvedValue([]);

			await activeExecutionService.findManyInQueueMode(filter, sharedWorkflowIds);

			expect(queue.getJobs).toHaveBeenCalledWith(['active', 'waiting']);

			expect(executionRepository.getManyActive).toHaveBeenCalledWith(
				jobIds.concat(executionIds),
				sharedWorkflowIds,
				filter,
			);
		});
	});

	describe('findManyInRegularMode()', () => {
		it('should return summaries of in-memory executions', async () => {
			const sharedWorkflowIds = ['123'];
			const filter = {};
			const executionIds = ['e1', 'e2'];
			const summaries = executionIds.map((e) =>
				mock<IExecutionsCurrentSummary>({ id: e, workflowId: '123', status: 'running' }),
			);

			activeExecutions.getActiveExecutions.mockReturnValue(summaries);

			const result = await activeExecutionService.findManyInRegularMode(filter, sharedWorkflowIds);

			expect(result).toEqual([
				expect.objectContaining({
					id: 'e1',
					workflowId: '123',
					status: 'running',
				}),
				expect.objectContaining({
					id: 'e2',
					workflowId: '123',
					status: 'running',
				}),
			]);
		});
	});
});
