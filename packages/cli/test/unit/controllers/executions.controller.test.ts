import { mock } from 'jest-mock-extended';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExecutionsController } from '@/executions/executions.controller';
import type { ExecutionRequest, ExecutionSummaries } from '@/executions/execution.types';
import type { ExecutionService } from '@/executions/execution.service';
import type { WorkflowSharingService } from '@/workflows/workflowSharing.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

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

	describe('getOne', () => {
		it('should 400 when execution is not a number', async () => {
			const req = mock<ExecutionRequest.GetOne>({ params: { id: 'test' } });

			await expect(executionsController.getOne(req)).rejects.toThrow(BadRequestError);
		});
	});

	describe('getMany', () => {
		const NO_EXECUTIONS = { count: 0, estimated: false, results: [] };

		const QUERIES_WITH_EITHER_STATUS_OR_RANGE: ExecutionSummaries.RangeQuery[] = [
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
			{
				kind: 'range',
				workflowId: undefined,
				status: ['waiting'],
				range: { lastId: undefined, firstId: undefined, limit: 20 },
			},
			{
				kind: 'range',
				workflowId: undefined,
				status: [],
				range: { lastId: '999', firstId: '111', limit: 20 },
			},
		];

		const QUERIES_NEITHER_STATUS_NOR_RANGE_PROVIDED: ExecutionSummaries.RangeQuery[] = [
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
		];

		describe('if either status or range provided', () => {
			test.each(QUERIES_WITH_EITHER_STATUS_OR_RANGE)(
				'should fetch executions per query',
				async (rangeQuery) => {
					workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
					executionService.findAllRunningAndLatest.mockResolvedValue(NO_EXECUTIONS);

					const req = mock<ExecutionRequest.GetMany>({ rangeQuery });

					await executionsController.getMany(req);

					expect(executionService.findAllRunningAndLatest).not.toHaveBeenCalled();
					expect(executionService.findRangeWithCount).toHaveBeenCalledWith(rangeQuery);
				},
			);
		});

		describe('if neither status nor range provided', () => {
			test.each(QUERIES_NEITHER_STATUS_NOR_RANGE_PROVIDED)(
				'should fetch executions per query',
				async (rangeQuery) => {
					workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
					executionService.findAllRunningAndLatest.mockResolvedValue(NO_EXECUTIONS);

					const req = mock<ExecutionRequest.GetMany>({ rangeQuery });

					await executionsController.getMany(req);

					expect(executionService.findAllRunningAndLatest).toHaveBeenCalled();
					expect(executionService.findRangeWithCount).not.toHaveBeenCalled();
				},
			);
		});

		describe('if both status and range provided', () => {
			it('should fetch executions per query', async () => {
				workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
				executionService.findAllRunningAndLatest.mockResolvedValue(NO_EXECUTIONS);

				const rangeQuery: ExecutionSummaries.RangeQuery = {
					kind: 'range',
					workflowId: undefined,
					status: ['success'],
					range: { lastId: '999', firstId: '111', limit: 5 },
				};

				const req = mock<ExecutionRequest.GetMany>({ rangeQuery });

				await executionsController.getMany(req);

				expect(executionService.findAllRunningAndLatest).not.toHaveBeenCalled();
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
