import { WaitTracker } from '@/WaitTracker';
import { mock } from 'jest-mock-extended';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { IExecutionResponse } from '@/Interfaces';
import { OrchestrationService } from '@/services/orchestration.service';
import type { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';

jest.useFakeTimers();

describe('WaitTracker', () => {
	const executionRepository = mock<ExecutionRepository>();
	const multiMainSetup = mock<MultiMainSetup>();
	const orchestrationService = new OrchestrationService(mock(), mock(), multiMainSetup);

	const execution = mock<IExecutionResponse>({
		id: '123',
		waitTill: new Date(Date.now() + 1000),
	});

	let waitTracker: WaitTracker;
	beforeEach(() => {
		waitTracker = new WaitTracker(
			mock(),
			executionRepository,
			mock(),
			mock(),
			orchestrationService,
		);
		multiMainSetup.on.mockReturnThis();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('init()', () => {
		it('should query DB for waiting executions', async () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([execution]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});

		it('if no executions to start, should do nothing', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
		});

		describe('if execution to start', () => {
			it('if not enough time passed, should not start execution', async () => {
				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				waitTracker.init();

				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				await waitTracker.getWaitingExecutions();

				const startExecutionSpy = jest.spyOn(waitTracker, 'startExecution');

				jest.advanceTimersByTime(100);

				expect(startExecutionSpy).not.toHaveBeenCalled();
			});

			it('if enough time passed, should start execution', async () => {
				executionRepository.getWaitingExecutions.mockResolvedValue([]);
				waitTracker.init();

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
			waitTracker.init();

			executionRepository.findSingleExecution.mockResolvedValue(execution);
			waitTracker.startExecution(execution.id);
			jest.advanceTimersByTime(5);

			expect(executionRepository.findSingleExecution).toHaveBeenCalledWith(execution.id, {
				includeData: true,
				unflattenData: true,
			});
		});
	});

	describe('single-main setup', () => {
		it('should start tracking', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});
	});

	describe('multi-main setup', () => {
		it('should start tracking if leader', () => {
			jest.spyOn(orchestrationService, 'isLeader', 'get').mockReturnValue(true);
			jest.spyOn(orchestrationService, 'isSingleMainSetup', 'get').mockReturnValue(false);

			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});

		it('should not start tracking if follower', () => {
			jest.spyOn(orchestrationService, 'isLeader', 'get').mockReturnValue(false);
			jest.spyOn(orchestrationService, 'isSingleMainSetup', 'get').mockReturnValue(false);

			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).not.toHaveBeenCalled();
		});
	});
});
