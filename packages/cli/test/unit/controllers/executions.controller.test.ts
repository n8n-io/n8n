import { mock } from 'jest-mock-extended';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExecutionsController } from '@/executions/executions.controller';
import type { ExecutionRequest } from '@/executions/execution.types';
import type { ExecutionService } from '@/executions/execution.service';
import type { WorkflowSharingService } from '@/workflows/workflowSharing.service';

describe('ExecutionsController', () => {
	const executionService = mock<ExecutionService>();
	const workflowSharingService = mock<WorkflowSharingService>();

	const executionsController = new ExecutionsController(
		executionService,
		mock(),
		workflowSharingService,
		mock(),
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getMany', () => {
		it('if no status provided, should look for all active plus latest 20 finished executions', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
			executionService.findAllActive.mockResolvedValue([]);
			executionService.findLatestFinished.mockResolvedValue([]);

			const req = mock<ExecutionRequest.GetMany>({
				rangeQuery: { kind: 'range', workflowId: undefined, status: undefined },
			});

			await executionsController.getMany(req);

			expect(executionService.findAllActive).toHaveBeenCalled();
			expect(executionService.findLatestFinished).toHaveBeenCalledWith(20);
			expect(executionService.findRangeWithCount).not.toHaveBeenCalled();
		});

		it('if status provided as empty array, should look for all active plus latest 20 finished executions', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
			executionService.findAllActive.mockResolvedValue([]);
			executionService.findLatestFinished.mockResolvedValue([]);

			const req = mock<ExecutionRequest.GetMany>({
				rangeQuery: { kind: 'range', workflowId: undefined, status: [] },
			});

			await executionsController.getMany(req);

			expect(executionService.findAllActive).toHaveBeenCalled();
			expect(executionService.findLatestFinished).toHaveBeenCalledWith(20);
			expect(executionService.findRangeWithCount).not.toHaveBeenCalled();
		});

		it('if status provided, should look for a range of executions based on the query', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);

			const req = mock<ExecutionRequest.GetMany>({
				rangeQuery: { kind: 'range', workflowId: undefined, status: ['success'] },
			});

			await executionsController.getMany(req);

			expect(executionService.findAllActive).not.toHaveBeenCalled();
			expect(executionService.findLatestFinished).not.toHaveBeenCalled();
			expect(executionService.findRangeWithCount).toHaveBeenCalledWith(req.rangeQuery);
		});
	});

	describe('stop', () => {
		const executionId = '999';
		const req = mock<ExecutionRequest.Stop>({ params: { id: executionId } });

		it('should 404 when execution is inaccessible for user', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

			const promise = executionsController.stop(req);

			await expect(promise).rejects.toThrow(NotFoundError);
			expect(executionService.stop).not.toHaveBeenCalled();
		});

		it('should call ask for an execution to be stopped', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);

			await executionsController.stop(req);

			expect(executionService.stop).toHaveBeenCalledWith(executionId);
		});
	});
});
