import { mock } from 'jest-mock-extended';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExecutionsController } from '@/executions/executions.controller';
import type { ExecutionRequest, ExecutionSummaries } from '@/executions/execution.types';
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
		const NO_EXECUTIONS = { count: 0, estimated: false, results: [] };

		const NO_STATUS_OR_NO_RANGE_QUERIES: ExecutionSummaries.RangeQuery[] = [
			{
				kind: 'range',
				workflowId: undefined,
				status: undefined,
				range: { lastId: undefined, firstId: undefined, limit: 20 },
			},
			{
				kind: 'range',
				workflowId: undefined,
				status: [],
				range: { lastId: undefined, firstId: undefined, limit: 20 },
			},
			{
				kind: 'range',
				workflowId: undefined,
				status: ['waiting'],
				range: { lastId: undefined, firstId: undefined, limit: 20 },
			},
			{
				kind: 'range',
				workflowId: undefined,
				status: undefined,
				range: { lastId: '999', firstId: '111', limit: 20 },
			},
			{
				kind: 'range',
				workflowId: undefined,
				status: [],
				range: { lastId: '999', firstId: '111', limit: 20 },
			},
		];

		describe('if no status or no range provided', () => {
			test.each(NO_STATUS_OR_NO_RANGE_QUERIES)(
				'should fetch all active + latest finished executions per query',
				async (rangeQuery) => {
					workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
					executionService.findAllActiveAndLatestFinished.mockResolvedValue(NO_EXECUTIONS);

					const req = mock<ExecutionRequest.GetMany>({ rangeQuery });

					await executionsController.getMany(req);

					expect(executionService.findAllActiveAndLatestFinished).toHaveBeenCalledWith(rangeQuery);
					expect(executionService.findRangeWithCount).not.toHaveBeenCalled();
				},
			);
		});

		describe('if both status and range provided', () => {
			it('should fetch executions per query', async () => {
				workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
				executionService.findAllActiveAndLatestFinished.mockResolvedValue(NO_EXECUTIONS);

				const rangeQuery: ExecutionSummaries.RangeQuery = {
					kind: 'range',
					workflowId: undefined,
					status: ['success'],
					range: { lastId: '999', firstId: '111', limit: 5 },
				};

				const req = mock<ExecutionRequest.GetMany>({ rangeQuery });

				await executionsController.getMany(req);

				expect(executionService.findAllActiveAndLatestFinished).not.toHaveBeenCalled();
				expect(executionService.findRangeWithCount).toHaveBeenCalledWith(rangeQuery);
			});
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
