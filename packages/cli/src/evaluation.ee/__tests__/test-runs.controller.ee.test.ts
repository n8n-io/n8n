import type { Mock, Mocked } from 'vitest';
import type { TestCaseExecutionRepository, TestRun, TestRunRepository, User } from '@n8n/db';
import type express from 'express';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { TestRunsController } from '@/evaluation.ee/test-runs.controller.ee';
import type { TestRunsRequest } from '@/evaluation.ee/test-runs.types.ee';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

vi.mock('@/evaluation.ee/test-runner/test-runner.service.ee');

describe('TestRunsController', () => {
	let testRunsController: TestRunsController;
	let mockTestRunRepository: Mocked<TestRunRepository>;
	let mockWorkflowFinderService: Mocked<WorkflowFinderService>;
	let mockTestCaseExecutionRepository: Mocked<TestCaseExecutionRepository>;
	let mockTestRunnerService: Mocked<TestRunnerService>;
	let mockTelemetry: Mocked<Telemetry>;
	let mockUser: User;
	let mockWorkflowId: string;
	let mockTestRunId: string;

	beforeEach(() => {
		mockTestRunRepository = {
			findOne: vi.fn(),
			getMany: vi.fn(),
			delete: vi.fn(),
			createTestRun: vi.fn(),
		} as unknown as Mocked<TestRunRepository>;

		mockWorkflowFinderService = {
			findWorkflowForUser: vi.fn(),
		} as unknown as Mocked<WorkflowFinderService>;

		mockTestCaseExecutionRepository = {
			find: vi.fn(),
			markAllPendingAsCancelled: vi.fn(),
			cancelIfNew: vi.fn(),
		} as unknown as Mocked<TestCaseExecutionRepository>;

		mockTestRunnerService = {
			runTest: vi.fn(),
			// `startTestRun` returns the new run row and a `finished` promise;
			// resolve `finished` immediately so tests that don't care about
			// the detached execution don't dangle on an unresolved promise.
			startTestRun: vi.fn().mockResolvedValue({
				testRun: { id: 'testrun123' },
				finished: Promise.resolve(),
			}),
			canBeCancelled: vi.fn(),
			cancelTestRun: vi.fn(),
		} as unknown as Mocked<TestRunnerService>;

		mockTelemetry = {
			track: vi.fn(),
		} as unknown as Mocked<Telemetry>;

		testRunsController = new TestRunsController(
			mockTestRunRepository,
			mockWorkflowFinderService,
			mockTestCaseExecutionRepository,
			mockTestRunnerService,
			mockTelemetry,
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
		vi.clearAllMocks();
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

	describe('delete', () => {
		const buildReq = () =>
			({
				params: { workflowId: mockWorkflowId, id: mockTestRunId },
				user: mockUser,
			}) as TestRunsRequest.Delete;

		it('deletes a test run', async () => {
			const result = await testRunsController.delete(buildReq());

			expect(mockTestRunRepository.delete).toHaveBeenCalledWith({ id: mockTestRunId });

			expect(result).toEqual({ success: true });
		});

		it('requires workflow:execute so a read-only user cannot delete', async () => {
			const result = await testRunsController.delete(buildReq());

			expect(mockWorkflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				mockWorkflowId,
				mockUser,
				['workflow:execute'],
			);

			expect(result).toEqual({ success: true });
		});

		it('returns NotFoundError without mutating state when read-only user lacks execute scope', async () => {
			mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(testRunsController.delete(buildReq())).rejects.toThrow(NotFoundError);
			expect(mockTestRunRepository.delete).not.toHaveBeenCalled();
			expect(mockTelemetry.track).not.toHaveBeenCalled();
		});
	});

	describe('cancel', () => {
		const buildReq = () =>
			({
				params: { workflowId: mockWorkflowId, id: mockTestRunId },
				user: mockUser,
			}) as TestRunsRequest.Cancel;

		const mockResponse = () => {
			const res = { status: vi.fn(), json: vi.fn() } as unknown as express.Response;
			(res.status as Mock).mockReturnValue(res);
			(res.json as Mock).mockReturnValue(res);
			return res;
		};

		it('cancels a running test run and returns 202', async () => {
			mockTestRunnerService.canBeCancelled.mockReturnValue(false);

			const res = mockResponse();
			await testRunsController.cancel(buildReq(), res as any);

			expect(mockTestRunnerService.cancelTestRun).toHaveBeenCalledWith(mockTestRunId);
			expect(res.status).toHaveBeenCalledWith(202);
			expect(res.json).toHaveBeenCalledWith({ success: true });
		});

		it('requires workflow:execute (not just workflow:read) so a read-only user cannot cancel', async () => {
			mockTestRunnerService.canBeCancelled.mockReturnValue(false);

			await testRunsController.cancel(buildReq(), mockResponse() as any);

			expect(mockWorkflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				mockWorkflowId,
				mockUser,
				['workflow:execute'],
			);
		});

		it('returns NotFoundError without mutating state when read-only user lacks execute scope', async () => {
			mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(testRunsController.cancel(buildReq(), mockResponse() as any)).rejects.toThrow(
				NotFoundError,
			);
			expect(mockTestRunnerService.cancelTestRun).not.toHaveBeenCalled();
		});

		it('throws ConflictError when the test run is not cancellable', async () => {
			mockTestRunnerService.canBeCancelled.mockReturnValue(true);

			await expect(testRunsController.cancel(buildReq(), mockResponse() as any)).rejects.toThrow(
				ConflictError,
			);
			expect(mockTestRunnerService.cancelTestRun).not.toHaveBeenCalled();
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
			const res = { status: vi.fn(), json: vi.fn() } as unknown as express.Response;
			(res.status as Mock).mockReturnValue(res);
			(res.json as Mock).mockReturnValue(res);
			return res;
		};

		it('forwards the requested concurrency to the service unchanged', async () => {
			await testRunsController.create(
				buildCreateRequest(),
				mockResponse() as any,
				{ concurrency: 5 } as any,
			);

			expect(mockTestRunnerService.startTestRun).toHaveBeenCalledWith(
				mockUser,
				mockWorkflowId,
				5,
				undefined,
			);
		});

		it('omitted concurrency body → service called with concurrency=1 (sequential default)', async () => {
			await testRunsController.create(buildCreateRequest(), mockResponse() as any, {} as any);

			expect(mockTestRunnerService.startTestRun).toHaveBeenCalledWith(
				mockUser,
				mockWorkflowId,
				1,
				undefined,
			);
		});

		it('forwards evaluationConfigId from the request body to the service', async () => {
			await testRunsController.create(
				buildCreateRequest(),
				mockResponse() as any,
				{
					evaluationConfigId: 'config-1',
				} as any,
			);

			expect(mockTestRunnerService.startTestRun).toHaveBeenCalledWith(mockUser, mockWorkflowId, 1, {
				evaluationConfigId: 'config-1',
				compileFromConfig: false,
			});
		});

		it('forwards compileFromConfig when set', async () => {
			await testRunsController.create(
				buildCreateRequest(),
				mockResponse() as any,
				{
					evaluationConfigId: 'config-1',
					compileFromConfig: true,
				} as any,
			);

			expect(mockTestRunnerService.startTestRun).toHaveBeenCalledWith(mockUser, mockWorkflowId, 1, {
				evaluationConfigId: 'config-1',
				compileFromConfig: true,
			});
		});

		it('returns 202 with the new testRunId', async () => {
			const res = mockResponse();
			await testRunsController.create(buildCreateRequest(), res as any, { concurrency: 7 } as any);

			expect(res.status).toHaveBeenCalledWith(202);
			// Surfacing the new run id lets the FE route to the detail view
			// without polling — guards against the race where the previous
			// fire-and-forget create returned before `createTestRun` had
			// committed and the FE refetch picked up no new row.
			expect(res.json).toHaveBeenCalledWith({ success: true, testRunId: 'testrun123' });
		});

		it('requires workflow:execute so a read-only user cannot start a test run', async () => {
			await testRunsController.create(buildCreateRequest(), mockResponse() as any, {} as any);

			expect(mockWorkflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				mockWorkflowId,
				mockUser,
				['workflow:execute'],
			);
		});

		it('returns NotFoundError without starting execution when user has read but not execute scope', async () => {
			mockWorkflowFinderService.findWorkflowForUser.mockImplementation(
				async (_workflowId, _user, scopes) => {
					if (scopes.includes('workflow:execute')) return null;
					return { id: mockWorkflowId } as any;
				},
			);

			await expect(
				testRunsController.create(buildCreateRequest(), mockResponse() as any, {} as any),
			).rejects.toThrow(NotFoundError);

			expect(mockTestRunnerService.startTestRun).not.toHaveBeenCalled();
		});
	});
});
