import type { ExecutionSummaries } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ExecutionService } from '@/executions/execution.service';
import type { ExecutionRequest } from '@/executions/execution.types';
import { ExecutionsController } from '@/executions/executions.controller';
import type { License } from '@/license';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

describe('ExecutionsController', () => {
	const executionService = mock<ExecutionService>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const license = mock<License>();

	const executionsController = new ExecutionsController(
		executionService,
		mock(),
		workflowSharingService,
		license,
		mock(),
	);

	beforeEach(() => {
		jest.clearAllMocks();
		license.isAdvancedExecutionFiltersEnabled.mockReturnValue(true);
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

		describe('metadata filtering when advanced filters are not licensed', () => {
			beforeEach(() => {
				license.isAdvancedExecutionFiltersEnabled.mockReturnValue(false);
				executionService.buildSharingOptions.mockResolvedValue({
					workflowRoles: [],
					projectRoles: [],
				});
				executionService.findLatestCurrentAndCompleted.mockResolvedValue(NO_EXECUTIONS);
			});

			// Build a plain request whose `rangeQuery.metadata` is a real array — the
			// auto-mocking proxy from `jest-mock-extended` wraps nested arrays into
			// mock-property bags, so we hand-construct just enough of the request
			// shape and cast through `unknown` to honor the controller's expectations.
			const makeReq = (
				metadata: ExecutionSummaries.RangeQuery['metadata'],
			): ExecutionRequest.GetMany =>
				({
					rangeQuery: {
						kind: 'range',
						workflowId: undefined,
						status: undefined,
						range: { lastId: undefined, firstId: undefined, limit: 20 },
						metadata,
					} satisfies ExecutionSummaries.RangeQuery,
					user: mock(),
				}) as unknown as ExecutionRequest.GetMany;

			it('keeps caller.* metadata filters (Hub UX) and drops user-defined keys', async () => {
				const req = makeReq([
					{ key: 'caller.sessionId', value: 'romeo-mcp', exactMatch: true },
					{ key: 'customField', value: 'foo', exactMatch: true },
				]);

				await executionsController.getMany(req);

				const callArg = executionService.findLatestCurrentAndCompleted.mock.calls[0][0];
				expect(callArg.metadata).toEqual([
					{ key: 'caller.sessionId', value: 'romeo-mcp', exactMatch: true },
				]);
			});

			it('drops metadata entirely when only user-defined keys are present', async () => {
				const req = makeReq([{ key: 'customField', value: 'foo', exactMatch: true }]);

				await executionsController.getMany(req);

				const callArg = executionService.findLatestCurrentAndCompleted.mock.calls[0][0];
				expect(callArg.metadata).toBeUndefined();
			});
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
