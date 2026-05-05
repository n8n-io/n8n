import type { TestCaseExecutionRepository, TestRun, TestRunRepository, User } from '@n8n/db';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { TestRunsController } from '@/evaluation.ee/test-runs.controller.ee';
import type { TestRunsRequest } from '@/evaluation.ee/test-runs.types.ee';
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
			canBeCancelled: jest.fn(),
			cancelTestRun: jest.fn(),
		} as unknown as jest.Mocked<TestRunnerService>;

		mockTelemetry = {
			track: jest.fn(),
		} as unknown as jest.Mocked<Telemetry>;

		testRunsController = new TestRunsController(
			mockTestRunRepository,
			mockWorkflowFinderService,
			mockTestCaseExecutionRepository,
			mockTestRunnerService,
			mockTelemetry,
		);

		mockUser = { id: 'user123' } as User;
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
				where: { id: mockTestRunId },
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
				where: { id: mockTestRunId },
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

		it('cancels a pending case via cancelIfNew and tracks telemetry', async () => {
			mockTestCaseExecutionRepository.cancelIfNew.mockResolvedValue(true);

			const result = await testRunsController.cancelCase(buildReq());

			expect(mockTestCaseExecutionRepository.cancelIfNew).toHaveBeenCalledWith(caseId);
			expect(mockTelemetry.track).toHaveBeenCalledWith('User cancelled a test case', {
				run_id: mockTestRunId,
				case_id: caseId,
			});
			expect(result).toEqual({ success: true });
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
	});
});
