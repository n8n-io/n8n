import type { Logger } from '@n8n/backend-common';
import type { TestCaseExecutionRepository, TestRun, TestRunRepository, User } from '@n8n/db';
import type express from 'express';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { TestRunsController } from '@/evaluation.ee/test-runs.controller.ee';
import type { TestRunsRequest } from '@/evaluation.ee/test-runs.types.ee';
import type { PostHogClient } from '@/posthog';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

jest.mock('@/evaluation.ee/test-runner/test-runner.service.ee');

describe('TestRunsController', () => {
	let testRunsController: TestRunsController;
	let mockTestRunRepository: jest.Mocked<TestRunRepository>;
	let mockWorkflowFinderService: jest.Mocked<WorkflowFinderService>;
	let mockTestCaseExecutionRepository: jest.Mocked<TestCaseExecutionRepository>;
	let mockTestRunnerService: jest.Mocked<TestRunnerService>;
	let mockTelemetry: jest.Mocked<Telemetry>;
	let mockPostHogClient: jest.Mocked<PostHogClient>;
	let mockLogger: jest.Mocked<Logger>;
	let mockUser: User;
	let mockWorkflowId: string;
	let mockTestRunId: string;

	beforeEach(() => {
		mockTestRunRepository = {
			findOne: jest.fn(),
			getMany: jest.fn(),
			delete: jest.fn(),
			createTestRun: jest.fn(),
		} as unknown as jest.Mocked<TestRunRepository>;

		mockWorkflowFinderService = {
			findWorkflowForUser: jest.fn(),
		} as unknown as jest.Mocked<WorkflowFinderService>;

		mockTestCaseExecutionRepository = {
			find: jest.fn(),
			markAllPendingAsCancelled: jest.fn(),
			cancelIfNew: jest.fn(),
		} as unknown as jest.Mocked<TestCaseExecutionRepository>;

		mockTestRunnerService = {
			runTest: jest.fn(),
			// `startTestRun` returns the new run row and a `finished` promise;
			// resolve `finished` immediately so tests that don't care about
			// the detached execution don't dangle on an unresolved promise.
			startTestRun: jest.fn().mockResolvedValue({
				testRun: { id: 'testrun123' },
				finished: Promise.resolve(),
			}),
			canBeCancelled: jest.fn(),
			cancelTestRun: jest.fn(),
		} as unknown as jest.Mocked<TestRunnerService>;

		mockTelemetry = {
			track: jest.fn(),
		} as unknown as jest.Mocked<Telemetry>;

		mockPostHogClient = {
			getFeatureFlags: jest.fn().mockResolvedValue({}),
		} as unknown as jest.Mocked<PostHogClient>;

		mockLogger = {
			warn: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		testRunsController = new TestRunsController(
			mockTestRunRepository,
			mockWorkflowFinderService,
			mockTestCaseExecutionRepository,
			mockTestRunnerService,
			mockTelemetry,
			mockPostHogClient,
			mockLogger,
		);

		mockUser = { id: 'user123', createdAt: new Date('2024-01-01T00:00:00Z') } as User;
		mockWorkflowId = 'workflow123';
		mockTestRunId = 'testrun123';

		// Default: user has access to the workflow
		mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue({ id: mockWorkflowId } as any);
		mockTestRunRepository.findOne.mockResolvedValue({
			id: mockTestRunId,
			status: 'running',
		} as TestRun);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getMany', () => {
		it('should return test runs when user has access to the workflow', async () => {
			const mockResult = [{ id: 'run1' }];
			mockTestRunRepository.getMany.mockResolvedValue(mockResult as any);

			const req = {
				params: { workflowId: mockWorkflowId },
				user: mockUser,
				listQueryOptions: {},
			} as unknown as TestRunsRequest.GetMany;

			const result = await testRunsController.getMany(req);

			expect(mockWorkflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				mockWorkflowId,
				mockUser,
				['workflow:read'],
			);
			expect(mockTestRunRepository.getMany).toHaveBeenCalledWith(mockWorkflowId, {});
			expect(result).toEqual(mockResult);
		});

		it('should throw NotFoundError when user has no access to workflow', async () => {
			mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			const req = {
				params: { workflowId: mockWorkflowId },
				user: mockUser,
				listQueryOptions: {},
			} as unknown as TestRunsRequest.GetMany;

			await expect(testRunsController.getMany(req)).rejects.toThrow(NotFoundError);
			expect(mockTestRunRepository.getMany).not.toHaveBeenCalled();
		});
	});

	describe('getTestRun', () => {
		it('should return test run when it exists and user has access', async () => {
			const mockTestRun = {
				id: mockTestRunId,
				status: 'running',
			} as TestRun;
			mockTestRunRepository.findOne.mockResolvedValue(mockTestRun);

			const result = await (testRunsController as any).getTestRun(
				mockTestRunId,
				mockWorkflowId,
				mockUser,
			);

			expect(mockWorkflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				mockWorkflowId,
				mockUser,
				['workflow:read'],
			);
			expect(mockTestRunRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockTestRunId, workflow: { id: mockWorkflowId } },
			});
			expect(result).toEqual(mockTestRun);
		});

		it('should throw NotFoundError when user has no access to workflow', async () => {
			mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(
				(testRunsController as any).getTestRun(mockTestRunId, mockWorkflowId, mockUser),
			).rejects.toThrow(NotFoundError);
			expect(mockTestRunRepository.findOne).not.toHaveBeenCalled();
		});

		it('should throw NotFoundError when test run does not exist', async () => {
			mockTestRunRepository.findOne.mockResolvedValue(null);

			await expect(
				(testRunsController as any).getTestRun(mockTestRunId, mockWorkflowId, mockUser),
			).rejects.toThrow(NotFoundError);
			expect(mockWorkflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				mockWorkflowId,
				mockUser,
				['workflow:read'],
			);
			expect(mockTestRunRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockTestRunId, workflow: { id: mockWorkflowId } },
			});
		});
	});

	describe('cancelCase', () => {
		const caseId = 'case-1';

		const buildReq = () =>
			({
				params: { workflowId: mockWorkflowId, id: mockTestRunId, caseId },
				user: mockUser,
			}) as TestRunsRequest.CancelCase;

		it('cancels a pending case via cancelIfNew (scoped to run) and tracks telemetry', async () => {
			mockTestCaseExecutionRepository.cancelIfNew.mockResolvedValue(true);

			const result = await testRunsController.cancelCase(buildReq());

			expect(mockTestCaseExecutionRepository.cancelIfNew).toHaveBeenCalledWith(
				mockTestRunId,
				caseId,
			);
			expect(mockTelemetry.track).toHaveBeenCalledWith('User cancelled a test case', {
				run_id: mockTestRunId,
				case_id: caseId,
			});
			expect(result).toEqual({ success: true });
		});

		it('requires workflow:execute (not just workflow:read) so a read-only user cannot cancel', async () => {
			// Cancelling mutates execution state, so the access check must run
			// against the stronger `workflow:execute` scope. A user with only
			// `workflow:read` would have `findWorkflowForUser` resolve to null
			// for that scope set, surfacing as a 404 (same response shape as
			// missing runs — existence isn't leaked).
			mockTestCaseExecutionRepository.cancelIfNew.mockResolvedValue(true);

			await testRunsController.cancelCase(buildReq());

			expect(mockWorkflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				mockWorkflowId,
				mockUser,
				['workflow:execute'],
			);
		});

		it('returns NotFoundError without mutating state when read-only user lacks execute scope', async () => {
			mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(testRunsController.cancelCase(buildReq())).rejects.toThrow(NotFoundError);
			expect(mockTestCaseExecutionRepository.cancelIfNew).not.toHaveBeenCalled();
			expect(mockTelemetry.track).not.toHaveBeenCalled();
		});

		it('throws ConflictError when the case is no longer pending', async () => {
			mockTestCaseExecutionRepository.cancelIfNew.mockResolvedValue(false);

			await expect(testRunsController.cancelCase(buildReq())).rejects.toThrow(ConflictError);
			expect(mockTelemetry.track).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the workflow is not accessible', async () => {
			mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(testRunsController.cancelCase(buildReq())).rejects.toThrow(NotFoundError);
			expect(mockTestCaseExecutionRepository.cancelIfNew).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the run id belongs to a different workflow', async () => {
			// User has access to the route's workflow but supplies a run id from
			// another workflow. The scoped lookup returns null and we surface a
			// 404 — the cancel must never reach `cancelIfNew`.
			mockTestRunRepository.findOne.mockResolvedValue(null);

			await expect(testRunsController.cancelCase(buildReq())).rejects.toThrow(NotFoundError);
			expect(mockTestRunRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockTestRunId, workflow: { id: mockWorkflowId } },
			});
			expect(mockTestCaseExecutionRepository.cancelIfNew).not.toHaveBeenCalled();
			expect(mockTelemetry.track).not.toHaveBeenCalled();
		});
	});

	describe('create', () => {
		const buildCreateRequest = () =>
			({
				params: { workflowId: mockWorkflowId },
				user: mockUser,
			}) as unknown as TestRunsRequest.Create;

		const mockResponse = () => {
			const res = { status: jest.fn(), json: jest.fn() } as unknown as express.Response;
			(res.status as jest.Mock).mockReturnValue(res);
			(res.json as jest.Mock).mockReturnValue(res);
			return res;
		};

		it('flag-on user with concurrency=5 → service called with concurrency=5 and flagEnabledForUser=true', async () => {
			mockPostHogClient.getFeatureFlags.mockResolvedValue({ '080_eval_parallel_execution': true });

			await testRunsController.create(
				buildCreateRequest(),
				mockResponse() as any,
				{ concurrency: 5 } as any,
			);

			expect(mockPostHogClient.getFeatureFlags).toHaveBeenCalledWith(mockUser);
			expect(mockTestRunnerService.startTestRun).toHaveBeenCalledWith(
				mockUser,
				mockWorkflowId,
				5,
				true,
			);
		});

		it('flag-off user with concurrency=5 → service called with concurrency=1 and flagEnabledForUser=false (cohort wall)', async () => {
			mockPostHogClient.getFeatureFlags.mockResolvedValue({});

			await testRunsController.create(
				buildCreateRequest(),
				mockResponse() as any,
				{ concurrency: 5 } as any,
			);

			expect(mockTestRunnerService.startTestRun).toHaveBeenCalledWith(
				mockUser,
				mockWorkflowId,
				1,
				false,
			);
		});

		it('flag-on user with no concurrency body → service called with concurrency=1', async () => {
			mockPostHogClient.getFeatureFlags.mockResolvedValue({ '080_eval_parallel_execution': true });

			await testRunsController.create(buildCreateRequest(), mockResponse() as any, {} as any);

			expect(mockTestRunnerService.startTestRun).toHaveBeenCalledWith(
				mockUser,
				mockWorkflowId,
				1,
				true,
			);
		});

		it('flag-off user with no concurrency body → service called with concurrency=1', async () => {
			mockPostHogClient.getFeatureFlags.mockResolvedValue({});

			await testRunsController.create(buildCreateRequest(), mockResponse() as any, {} as any);

			expect(mockTestRunnerService.startTestRun).toHaveBeenCalledWith(
				mockUser,
				mockWorkflowId,
				1,
				false,
			);
		});

		it('always returns 202 success with the new testRunId regardless of flag state (no flag-id leak)', async () => {
			mockPostHogClient.getFeatureFlags.mockResolvedValue({});

			const res = mockResponse();
			await testRunsController.create(buildCreateRequest(), res as any, { concurrency: 7 } as any);

			expect(res.status).toHaveBeenCalledWith(202);
			// Surfacing the new run id lets the FE route to the detail view
			// without polling — guards against the race where the previous
			// fire-and-forget create returned before `createTestRun` had
			// committed and the FE refetch picked up no new row.
			expect(res.json).toHaveBeenCalledWith({ success: true, testRunId: 'testrun123' });
		});

		it('resolves the feature flag exactly once per request', async () => {
			mockPostHogClient.getFeatureFlags.mockResolvedValue({ '080_eval_parallel_execution': true });

			await testRunsController.create(
				buildCreateRequest(),
				mockResponse() as any,
				{ concurrency: 3 } as any,
			);

			expect(mockPostHogClient.getFeatureFlags).toHaveBeenCalledTimes(1);
		});

		it('fails open to sequential when PostHog throws (rollout gate is non-critical)', async () => {
			mockPostHogClient.getFeatureFlags.mockRejectedValue(new Error('posthog timeout'));

			const res = mockResponse();
			await testRunsController.create(buildCreateRequest(), res as any, { concurrency: 5 } as any);

			expect(mockTestRunnerService.startTestRun).toHaveBeenCalledWith(
				mockUser,
				mockWorkflowId,
				1,
				false,
			);
			expect(res.status).toHaveBeenCalledWith(202);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Failed to resolve eval parallel-execution flag'),
				expect.any(Object),
			);
		});
	});
});
