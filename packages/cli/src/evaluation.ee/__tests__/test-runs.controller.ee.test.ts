import type { TestCaseExecutionRepository, TestRun, TestRunRepository, User } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { TestRunsController } from '@/evaluation.ee/test-runs.controller.ee';
import { getSharedWorkflowIds } from '@/public-api/v1/handlers/workflows/workflows.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

// Mock dependencies
jest.mock('@/public-api/v1/handlers/workflows/workflows.service');
jest.mock('@/evaluation.ee/test-runner/test-runner.service.ee');

describe('TestRunsController', () => {
	let testRunsController: TestRunsController;
	let mockTestRunRepository: jest.Mocked<TestRunRepository>;
	let mockWorkflowFinderService: jest.Mocked<WorkflowFinderService>;
	let mockTestCaseExecutionRepository: jest.Mocked<TestCaseExecutionRepository>;
	let mockTestRunnerService: jest.Mocked<TestRunnerService>;
	let mockInstanceSettings: jest.Mocked<InstanceSettings>;
	let mockTelemetry: jest.Mocked<Telemetry>;
	let mockGetSharedWorkflowIds: jest.MockedFunction<typeof getSharedWorkflowIds>;
	let mockUser: User;
	let mockWorkflowId: string;
	let mockTestRunId: string;

	beforeEach(() => {
		// Setup mocks
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
		} as unknown as jest.Mocked<TestCaseExecutionRepository>;

		mockTestRunnerService = {
			runTest: jest.fn(),
			canBeCancelled: jest.fn(),
			cancelTestRun: jest.fn(),
		} as unknown as jest.Mocked<TestRunnerService>;

		mockInstanceSettings = {
			isMultiMain: false,
		} as unknown as jest.Mocked<InstanceSettings>;

		mockTelemetry = {
			track: jest.fn(),
		} as unknown as jest.Mocked<Telemetry>;

		mockGetSharedWorkflowIds = getSharedWorkflowIds as jest.MockedFunction<
			typeof getSharedWorkflowIds
		>;

		// Create test instance
		testRunsController = new TestRunsController(
			mockTestRunRepository,
			mockWorkflowFinderService,
			mockTestCaseExecutionRepository,
			mockTestRunnerService,
			mockInstanceSettings,
			mockTelemetry,
		);

		// Common test data
		mockUser = { id: 'user123' } as User;
		mockWorkflowId = 'workflow123';
		mockTestRunId = 'testrun123';

		// Default mock behavior
		mockGetSharedWorkflowIds.mockResolvedValue([mockWorkflowId]);
		mockTestRunRepository.findOne.mockResolvedValue({
			id: mockTestRunId,
			status: 'running',
		} as TestRun);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getTestRun', () => {
		it('should return test run when it exists and user has access', async () => {
			// Arrange
			const mockTestRun = {
				id: mockTestRunId,
				status: 'running',
			} as TestRun;
			mockGetSharedWorkflowIds.mockResolvedValue([mockWorkflowId]);
			mockTestRunRepository.findOne.mockResolvedValue(mockTestRun);

			// Act
			const result = await (testRunsController as any).getTestRun(
				mockTestRunId,
				mockWorkflowId,
				mockUser,
			);

			// Assert
			expect(mockGetSharedWorkflowIds).toHaveBeenCalledWith(mockUser, ['workflow:read']);
			expect(mockTestRunRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockTestRunId },
			});
			expect(result).toEqual(mockTestRun);
		});

		it('should throw NotFoundError when user has no access to workflow', async () => {
			// Arrange
			mockGetSharedWorkflowIds.mockResolvedValue([]); // No access to any workflow

			// Act & Assert
			await expect(
				(testRunsController as any).getTestRun(mockTestRunId, mockWorkflowId, mockUser),
			).rejects.toThrow(NotFoundError);
			expect(mockGetSharedWorkflowIds).toHaveBeenCalledWith(mockUser, ['workflow:read']);
			expect(mockTestRunRepository.findOne).not.toHaveBeenCalled();
		});

		it('should throw NotFoundError when workflowId does not match any shared workflows', async () => {
			// Arrange
			mockGetSharedWorkflowIds.mockResolvedValue(['different-workflow-id']);

			// Act & Assert
			await expect(
				(testRunsController as any).getTestRun(mockTestRunId, mockWorkflowId, mockUser),
			).rejects.toThrow(NotFoundError);
			expect(mockGetSharedWorkflowIds).toHaveBeenCalledWith(mockUser, ['workflow:read']);
			expect(mockTestRunRepository.findOne).not.toHaveBeenCalled();
		});

		it('should throw NotFoundError when test run does not exist', async () => {
			// Arrange
			mockGetSharedWorkflowIds.mockResolvedValue([mockWorkflowId]);
			mockTestRunRepository.findOne.mockResolvedValue(null); // Test run not found

			// Act & Assert
			await expect(
				(testRunsController as any).getTestRun(mockTestRunId, mockWorkflowId, mockUser),
			).rejects.toThrow(NotFoundError);
			expect(mockGetSharedWorkflowIds).toHaveBeenCalledWith(mockUser, ['workflow:read']);
			expect(mockTestRunRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockTestRunId },
			});
		});
	});
});
