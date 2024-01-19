import { mock, mockFn } from 'jest-mock-extended';
import config from '@/config';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExecutionsController } from '@/executions/executions.controller';
import type { ExecutionRequest } from '@/executions/execution.types';
import type { IExecutionBase } from '@/Interfaces';
import type { ActiveExecutionService } from '@/executions/active-execution.service';
import { mockInstance } from '../../shared/mocking';
import { License } from '@/License';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';

mockInstance(License);

describe('ExecutionsController', () => {
	const getEnv = mockFn<(typeof config)['getEnv']>();
	config.getEnv = getEnv;

	const activeExecutionService = mock<ActiveExecutionService>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const executionsController = new ExecutionsController(
		mock(),
		mock(),
		mock(),
		activeExecutionService,
	);

	beforeEach(() => jest.clearAllMocks());

	describe('getActive()', () => {
		const req = mock<ExecutionRequest.GetManyActive>({ query: { filter: '{}' } });
		workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);

		it.only('should find many in queue mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('queue');

			await executionsController.getActive(req);

			expect(activeExecutionService.findManyInQueueMode).toHaveBeenCalled();
			expect(activeExecutionService.findManyInRegularMode).not.toHaveBeenCalled();
		});

		it('should find many in regular mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');

			await executionsController.getActive(req);

			expect(activeExecutionService.findManyInQueueMode).not.toHaveBeenCalled();
			expect(activeExecutionService.findManyInRegularMode).toHaveBeenCalled();
		});
	});

	describe('stop()', () => {
		const req = mock<ExecutionRequest.Stop>({ params: { id: '123' } });
		const execution = mock<IExecutionBase>();

		it('should 404 when execution is not found or inaccessible for user', async () => {
			activeExecutionService.findOne.mockResolvedValue(undefined);

			const promise = executionsController.stop(req);

			await expect(promise).rejects.toThrow(NotFoundError);
			expect(activeExecutionService.findOne).toHaveBeenCalledWith(req.user, '123');
		});

		it('should stop execution in queue mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('queue');
			activeExecutionService.findOne.mockResolvedValue(execution);

			await executionsController.stop(req);

			expect(activeExecutionService.stopOneInQueueMode).toHaveBeenCalled();
			expect(activeExecutionService.stopOneInRegularMode).not.toHaveBeenCalled();
		});

		it('should stop execution in regular mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');
			activeExecutionService.findOne.mockResolvedValue(execution);

			await executionsController.stop(req);
			expect(activeExecutionService.stopOneInRegularMode).toHaveBeenCalled();
			expect(activeExecutionService.stopOneInQueueMode).not.toHaveBeenCalled();
		});
	});
});
