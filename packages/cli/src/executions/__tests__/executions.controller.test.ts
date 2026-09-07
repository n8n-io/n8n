import { DeleteExecutionsDto } from '@n8n/api-types';
import type { AuthenticatedRequest, ExecutionSummaries, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NotImplementedError } from '@/errors/response-errors/not-implemented.error';
import type { ExecutionService } from '@/executions/execution.service';
import type { ExecutionRequest } from '@/executions/execution.types';
import { ExecutionsController } from '@/executions/executions.controller';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

const V2_EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';

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
		vi.clearAllMocks();
	});

	describe('getOne', () => {
		it('should 400 when the id is neither a positive integer nor a uuid', async () => {
			const req = mock<ExecutionRequest.GetOne>({ params: { id: 'test' } });

			await expect(executionsController.getOne(req)).rejects.toThrow(BadRequestError);
		});

		it('should pass an engine 2.0 id through to the service', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			const req = mock<ExecutionRequest.GetOne>({ params: { id: V2_EXECUTION_ID } });

			await executionsController.getOne(req);

			expect(executionService.findOne).toHaveBeenCalledWith(req, ['wf-1']);
		});
	});

	describe('update', () => {
		it('should 400 when the id is neither a positive integer nor a uuid', async () => {
			const req = mock<ExecutionRequest.Update>({ params: { id: 'test' } });

			await expect(executionsController.update(req)).rejects.toThrow(BadRequestError);
		});

		it('should 501 for an engine 2.0 id, which has no annotation store', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			const req = mock<ExecutionRequest.Update>({ params: { id: V2_EXECUTION_ID } });

			await expect(executionsController.update(req)).rejects.toThrow(NotImplementedError);
			expect(executionService.annotate).not.toHaveBeenCalled();
		});

		it('should 404 for an engine 2.0 id when no workflows are accessible', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
			const req = mock<ExecutionRequest.Update>({ params: { id: V2_EXECUTION_ID } });

			await expect(executionsController.update(req)).rejects.toThrow(NotFoundError);
			expect(executionService.annotate).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('should 404 when no workflows are accessible', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

			await expect(
				executionsController.delete(mock(), mock(), DeleteExecutionsDto.parse({ ids: ['1'] })),
			).rejects.toThrow(NotFoundError);

			expect(executionService.delete).not.toHaveBeenCalled();
		});

		it('should pass the user, payload and accessible workflow ids to the service', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			const user = mock<User>({ id: 'user-1' });
			const payload = DeleteExecutionsDto.parse({ deleteBefore: '2026-01-01T00:00:00.000Z' });

			await executionsController.delete(mock<AuthenticatedRequest>({ user }), mock(), payload);

			expect(executionService.delete).toHaveBeenCalledWith(user, payload, ['wf-1']);
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
					executionService.buildSharingOptions.mockResolvedValue({
						workflowRoles: [],
						projectRoles: [],
					});
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
					executionService.buildSharingOptions.mockResolvedValue({
						workflowRoles: [],
						projectRoles: [],
					});
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
				executionService.buildSharingOptions.mockResolvedValue({
					workflowRoles: [],
					projectRoles: [],
				});
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

	describe('getVersions', () => {
		const workflowId = 'workflow-123';
		const req = mock<ExecutionRequest.GetVersions>({ params: { workflowId } });

		it('should return empty array when workflow is not accessible', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['other-workflow']);

			const result = await executionsController.getVersions(req);

			expect(result).toEqual([]);
			expect(executionService.getExecutedVersions).not.toHaveBeenCalled();
		});

		it('should return empty array when user has no accessible workflows', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

			const result = await executionsController.getVersions(req);

			expect(result).toEqual([]);
			expect(executionService.getExecutedVersions).not.toHaveBeenCalled();
		});

		it('should delegate to execution service when workflow is accessible', async () => {
			const versions = [
				{ versionId: 'v1', name: 'Version 1', createdAt: new Date() },
				{ versionId: 'v2', name: null, createdAt: new Date() },
			];
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([workflowId]);
			executionService.getExecutedVersions.mockResolvedValue(versions);

			const result = await executionsController.getVersions(req);

			expect(result).toEqual(versions);
			expect(executionService.getExecutedVersions).toHaveBeenCalledWith(workflowId);
		});
	});

	describe('stopMany', () => {
		const req = mock<ExecutionRequest.StopMany>({ body: { filter: { status: ['waiting'] } } });

		it('should not call mock if no workflows are accessible', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

			await executionsController.stopMany(req);

			expect(executionService.stopMany).not.toHaveBeenCalled();
		});

		it('should call execution service with expected data when user has accessible workflows', async () => {
			const mockAccessibleWorkflowIds = ['1234', '999'];
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(mockAccessibleWorkflowIds);

			await executionsController.stopMany(req);

			expect(executionService.stopMany).toHaveBeenCalledWith(
				req.body.filter,
				mockAccessibleWorkflowIds,
			);
		});
	});
});
