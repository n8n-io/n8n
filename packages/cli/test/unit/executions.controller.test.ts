import { mock, mockFn } from 'jest-mock-extended';
import config from '@/config';

import type { ExecutionRequest } from '@/executions/execution.request';
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
		const req = mock<ExecutionRequest.GetAllCurrent>({ query: { filter: '{}' } });

		it('should call getQueueModeExecutions in queue mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('queue');
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await controller.getCurrentExecutions(req);
			expect(activeExecutionService.getQueueModeExecutions).toHaveBeenCalled();
			expect(activeExecutionService.getRegularModeExecutions).not.toHaveBeenCalled();
		});

		it('should call getRegularModeExecutions in regular mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await controller.getCurrentExecutions(req);
			expect(activeExecutionService.getQueueModeExecutions).not.toHaveBeenCalled();
			expect(activeExecutionService.getRegularModeExecutions).toHaveBeenCalled();
		});
	});

	describe('stopExecution', () => {
		const req = mock<ExecutionRequest.Stop>({ params: { id: '123' } });
		const execution = mock<IExecutionBase>();

		it('should 404 when execution is not found or inaccessible for user', async () => {
			activeExecutionService.findExecution.mockResolvedValue(undefined);
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await expect(controller.stopExecution(req)).rejects.toThrow(NotFoundError);
			expect(activeExecutionService.findExecution).toHaveBeenCalledWith(req.user, '123');
		});

		it('should call stopQueueModeExecution in queue mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('queue');
			activeExecutionService.findExecution.mockResolvedValue(execution);
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await controller.stopExecution(req);
			expect(activeExecutionService.stopQueueModeExecution).toHaveBeenCalled();
			expect(activeExecutionService.stopRegularModeExecution).not.toHaveBeenCalled();
		});

		it('should call stopRegularModeExecution in regular mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');
			activeExecutionService.findExecution.mockResolvedValue(execution);
			const controller = new ExecutionsController(mock(), mock(), mock(), activeExecutionService);
			await controller.stopExecution(req);
			expect(activeExecutionService.stopRegularModeExecution).toHaveBeenCalled();
			expect(activeExecutionService.stopQueueModeExecution).not.toHaveBeenCalled();
		});
	});
});
