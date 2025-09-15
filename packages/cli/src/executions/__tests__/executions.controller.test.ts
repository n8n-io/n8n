import type { ExecutionSummaries } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ExecutionService } from '@/executions/execution.service';
import type { ExecutionRequest } from '@/executions/execution.types';
import { ExecutionsController } from '@/executions/executions.controller';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

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
		const NO_EXECUTIONS = {
			count: 0,
			estimated: false,
			results: [],
			concurrentExecutionsCount: -1,
		};

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

		executionService.findRangeWithCount.mockResolvedValue(NO_EXECUTIONS);

		describe('if either status or range provided', () => {
			test.each(QUERIES_WITH_EITHER_STATUS_OR_RANGE)(
				'should fetch executions per query',
				async (rangeQuery) => {
					workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
					executionService.findLatestCurrentAndCompleted.mockResolvedValue(NO_EXECUTIONS);

					const req = mock<ExecutionRequest.GetMany>({ rangeQuery });

					await executionsController.getMany(req);

					expect(executionService.findLatestCurrentAndCompleted).not.toHaveBeenCalled();
					expect(executionService.findRangeWithCount).toHaveBeenCalledWith(rangeQuery);
					expect(executionService.getConcurrentExecutionsCount).toHaveBeenCalled();
				},
			);
		});

		describe('if neither status nor range provided', () => {
			test.each(QUERIES_NEITHER_STATUS_NOR_RANGE_PROVIDED)(
				'should fetch executions per query',
				async (rangeQuery) => {
					workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
					executionService.findLatestCurrentAndCompleted.mockResolvedValue(NO_EXECUTIONS);

					const req = mock<ExecutionRequest.GetMany>({ rangeQuery });

					await executionsController.getMany(req);

					expect(executionService.findLatestCurrentAndCompleted).toHaveBeenCalled();
					expect(executionService.findRangeWithCount).not.toHaveBeenCalled();
					expect(executionService.getConcurrentExecutionsCount).toHaveBeenCalled();
				},
			);
		});

		describe('if both status and range provided', () => {
			it('should fetch executions per query', async () => {
				workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['123']);
				executionService.findLatestCurrentAndCompleted.mockResolvedValue(NO_EXECUTIONS);

				const rangeQuery: ExecutionSummaries.RangeQuery = {
					kind: 'range',
					workflowId: undefined,
					status: ['success'],
					range: { lastId: '999', firstId: '111', limit: 5 },
				};

				const req = mock<ExecutionRequest.GetMany>({ rangeQuery });

				await executionsController.getMany(req);

				expect(executionService.findLatestCurrentAndCompleted).not.toHaveBeenCalled();
				expect(executionService.findRangeWithCount).toHaveBeenCalledWith(rangeQuery);
				expect(executionService.getConcurrentExecutionsCount).toHaveBeenCalled();
			});
		});
	});

	describe('stop', () => {
		const executionId = '999';
		const req = mock<ExecutionRequest.Stop>({ params: { id: executionId } });

		it('should throw expected NotFoundError when all workflows are inaccessible for user', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

			const promise = executionsController.stop(req);

			await expect(promise).rejects.toThrow(NotFoundError);
			expect(executionService.stop).not.toHaveBeenCalled();
		});

		it('should call execution service with expected data when user has accessible workflows', async () => {
			const mockAccessibleWorkflowIds = ['1234', '999'];
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(mockAccessibleWorkflowIds);

			await executionsController.stop(req);
			expect(executionService.stop).toHaveBeenCalledWith(req.params.id, mockAccessibleWorkflowIds);
		});
	});
});
