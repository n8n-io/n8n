import { mock, mockFn } from 'jest-mock-extended';
import config from '@/config';
import { ActiveExecutionsController } from '@/executions/activeExecutions.controller';
import type { ActiveExecutionsService } from '@/executions/activeExecutions.service';
import type { ExecutionRequest } from '@/executions/execution.request';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IExecutionBase } from '@/Interfaces';

describe('ActiveExecutionsController', () => {
	const getEnv = mockFn<(typeof config)['getEnv']>();
	config.getEnv = getEnv;

	let service = mock<ActiveExecutionsService>();

	beforeEach(() => jest.clearAllMocks());

	describe('getActiveExecutions', () => {
		const req = mock<ExecutionRequest.GetAllCurrent>({ query: { filter: '{}' } });

		it('should call getQueueModeExecutions in queue mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('queue');
			const controller = new ActiveExecutionsController(service);
			await controller.getActiveExecutions(req);
			expect(service.getQueueModeExecutions).toHaveBeenCalled();
			expect(service.getRegularModeExecutions).not.toHaveBeenCalled();
		});

		it('should call getRegularModeExecutions in regular mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');
			const controller = new ActiveExecutionsController(service);
			await controller.getActiveExecutions(req);
			expect(service.getQueueModeExecutions).not.toHaveBeenCalled();
			expect(service.getRegularModeExecutions).toHaveBeenCalled();
		});
	});

	describe('stopExecution', () => {
		const req = mock<ExecutionRequest.Stop>({ params: { id: '123' } });
		const execution = mock<IExecutionBase>();

		it('should 404 when execution is not found or inaccessible for user', async () => {
			service.findExecution.mockResolvedValue(undefined);
			const controller = new ActiveExecutionsController(service);
			await expect(controller.stopExecution(req)).rejects.toThrow(NotFoundError);
			expect(service.findExecution).toHaveBeenCalledWith(req.user, '123');
		});

		it('should call stopQueueModeExecution in queue mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('queue');
			service.findExecution.mockResolvedValue(execution);
			const controller = new ActiveExecutionsController(service);
			await controller.stopExecution(req);
			expect(service.stopQueueModeExecution).toHaveBeenCalled();
			expect(service.stopRegularModeExecution).not.toHaveBeenCalled();
		});

		it('should call stopRegularModeExecution in regular mode', async () => {
			getEnv.calledWith('executions.mode').mockReturnValue('regular');
			service.findExecution.mockResolvedValue(execution);
			const controller = new ActiveExecutionsController(service);
			await controller.stopExecution(req);
			expect(service.stopRegularModeExecution).toHaveBeenCalled();
			expect(service.stopQueueModeExecution).not.toHaveBeenCalled();
		});
	});
});
