import { WaitTracker } from '@/WaitTracker';
import { mock } from 'jest-mock-extended';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { IExecutionResponse } from '@/Interfaces';

jest.useFakeTimers();

describe('WaitTracker', () => {
	const executionRepository = mock<ExecutionRepository>();

	const execution = mock<IExecutionResponse>({
		id: '123',
		waitTill: new Date(Date.now() + 1000),
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor()', () => {
		it('should query DB for waiting executions', async () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([execution]);

			new WaitTracker(mock(), executionRepository, mock());

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});

		it('if no executions to start, should do nothing', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			new WaitTracker(mock(), executionRepository, mock());

			expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
		});

		describe('if execution to start', () => {
			it('if not enough time passed, should not start execution', async () => {
				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				const waitTracker = new WaitTracker(mock(), executionRepository, mock());

				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				await waitTracker.getWaitingExecutions();

				const startExecutionSpy = jest.spyOn(waitTracker, 'startExecution');

				jest.advanceTimersByTime(100);

				expect(startExecutionSpy).not.toHaveBeenCalled();
			});

			it('if enough time passed, should start execution', async () => {
				executionRepository.getWaitingExecutions.mockResolvedValue([]);
				const waitTracker = new WaitTracker(mock(), executionRepository, mock());

				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				await waitTracker.getWaitingExecutions();

				const startExecutionSpy = jest.spyOn(waitTracker, 'startExecution');

				jest.advanceTimersByTime(2_000);

				expect(startExecutionSpy).toHaveBeenCalledWith(execution.id);
			});
		});
	});

	describe('startExecution()', () => {
		it('should query for execution to start', async () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);
			const waitTracker = new WaitTracker(mock(), executionRepository, mock());

			executionRepository.findSingleExecution.mockResolvedValue(execution);
			waitTracker.startExecution(execution.id);
			jest.advanceTimersByTime(5);

			expect(executionRepository.findSingleExecution).toHaveBeenCalledWith(execution.id, {
				includeData: true,
				unflattenData: true,
			});
		});
	});
});
