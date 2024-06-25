import { mock, mockFn } from 'jest-mock-extended';
import config from '@/config';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExecutionsController } from '@/executions/executions.controller';
import { License } from '@/License';
import { mockInstance } from '../../shared/mocking';
import type { IExecutionBase } from '@/Interfaces';
import type { ActiveExecutionService } from '@/executions/active-execution.service';
import type { ExecutionRequest } from '@/executions/execution.types';
import type { WorkflowSharingService } from '@/workflows/workflowSharing.service';

describe('ExecutionsController', () => {
	const getEnv = mockFn<(typeof config)['getEnv']>();
	config.getEnv = getEnv;

	mockInstance(License);
	const activeExecutionService = mock<ActiveExecutionService>();
	const workflowSharingService = mock<WorkflowSharingService>();

	const req = mock<ExecutionRequest.GetManyActive>({ query: { filter: '{}' } });

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getActive()', () => {
		workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);

		it('should call `ActiveExecutionService.findManyInQueueMode()`', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('queue');

			await new ExecutionsController(
				mock(),
				mock(),
				workflowSharingService,
				activeExecutionService,
				mock(),
			).getActive(req);

			expect(activeExecutionService.findManyInQueueMode).toHaveBeenCalled();
			expect(activeExecutionService.findManyInRegularMode).not.toHaveBeenCalled();
		});

		it('should call `ActiveExecutionService.findManyInRegularMode()`', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');

			await new ExecutionsController(
				mock(),
				mock(),
				workflowSharingService,
				activeExecutionService,
				mock(),
			).getActive(req);

			expect(activeExecutionService.findManyInQueueMode).not.toHaveBeenCalled();
			expect(activeExecutionService.findManyInRegularMode).toHaveBeenCalled();
		});
	});

	describe('stop()', () => {
		const req = mock<ExecutionRequest.Stop>({ params: { id: '999' } });
		const execution = mock<IExecutionBase>();

		it('should 404 when execution is not found or inaccessible for user', async () => {
			activeExecutionService.findOne.mockResolvedValue(undefined);

			const promise = new ExecutionsController(
				mock(),
				mock(),
				workflowSharingService,
				activeExecutionService,
				mock(),
			).stop(req);

			await expect(promise).rejects.toThrow(NotFoundError);
			expect(activeExecutionService.findOne).toHaveBeenCalledWith('999', ['123']);
		});

		it('should call `ActiveExecutionService.stop()`', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');
			activeExecutionService.findOne.mockResolvedValue(execution);

			await new ExecutionsController(
				mock(),
				mock(),
				workflowSharingService,
				activeExecutionService,
				mock(),
			).stop(req);

			expect(activeExecutionService.stop).toHaveBeenCalled();
		});
	});
});
