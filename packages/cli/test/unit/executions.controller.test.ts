import { mock, mockFn } from 'jest-mock-extended';
import config from '@/config';

import type { ExecutionRequest } from '@/executions/execution.types';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IExecutionBase } from '@/Interfaces';
import { ExecutionsController } from '@/executions/executions.controller';
import type { ActiveExecutionService } from '@/executions/active-execution.service';

describe('ExecutionsController', () => {
	const getEnv = mockFn<(typeof config)['getEnv']>();
	config.getEnv = getEnv;

	let activeExecutionService = mock<ActiveExecutionService>();

	beforeEach(() => jest.clearAllMocks());

	describe('getActiveExecutions', () => {
		const req = mock<ExecutionRequest.GetAllActive>({ query: { filter: '{}' } });

		it('should call getQueueModeExecutions in queue mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('queue');
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await controller.getActive(req);
			expect(activeExecutionService.findManyInQueueMode).toHaveBeenCalled();
			expect(activeExecutionService.findManyInRegularMode).not.toHaveBeenCalled();
		});

		it('should call getRegularModeExecutions in regular mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await controller.getActive(req);
			expect(activeExecutionService.findManyInQueueMode).not.toHaveBeenCalled();
			expect(activeExecutionService.findManyInRegularMode).toHaveBeenCalled();
		});
	});

	describe('stopExecution', () => {
		const req = mock<ExecutionRequest.Stop>({ params: { id: '123' } });
		const execution = mock<IExecutionBase>();

		it('should 404 when execution is not found or inaccessible for user', async () => {
			activeExecutionService.findOne.mockResolvedValue(undefined);
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await expect(controller.stop(req)).rejects.toThrow(NotFoundError);
			expect(activeExecutionService.findOne).toHaveBeenCalledWith(req.user, '123');
		});

		it('should call stopQueueModeExecution in queue mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('queue');
			activeExecutionService.findOne.mockResolvedValue(execution);
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await controller.stop(req);
			expect(activeExecutionService.stopExecutionInQueueMode).toHaveBeenCalled();
			expect(activeExecutionService.stopExecutionInRegularMode).not.toHaveBeenCalled();
		});

		it('should call stopRegularModeExecution in regular mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');
			activeExecutionService.findOne.mockResolvedValue(execution);
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await controller.stop(req);
			expect(activeExecutionService.stopExecutionInRegularMode).toHaveBeenCalled();
			expect(activeExecutionService.stopExecutionInQueueMode).not.toHaveBeenCalled();
		});
	});
});
