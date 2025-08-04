'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const test_runs_controller_ee_1 = require('@/evaluation.ee/test-runs.controller.ee');
const workflows_service_1 = require('@/public-api/v1/handlers/workflows/workflows.service');
jest.mock('@/public-api/v1/handlers/workflows/workflows.service');
jest.mock('@/evaluation.ee/test-runner/test-runner.service.ee');
describe('TestRunsController', () => {
	let testRunsController;
	let mockTestRunRepository;
	let mockWorkflowFinderService;
	let mockTestCaseExecutionRepository;
	let mockTestRunnerService;
	let mockInstanceSettings;
	let mockTelemetry;
	let mockGetSharedWorkflowIds;
	let mockUser;
	let mockWorkflowId;
	let mockTestRunId;
	beforeEach(() => {
		mockTestRunRepository = {
			findOne: jest.fn(),
			getMany: jest.fn(),
			delete: jest.fn(),
			createTestRun: jest.fn(),
		};
		mockWorkflowFinderService = {
			findWorkflowForUser: jest.fn(),
		};
		mockTestCaseExecutionRepository = {
			find: jest.fn(),
			markAllPendingAsCancelled: jest.fn(),
		};
		mockTestRunnerService = {
			runTest: jest.fn(),
			canBeCancelled: jest.fn(),
			cancelTestRun: jest.fn(),
		};
		mockInstanceSettings = {
			isMultiMain: false,
		};
		mockTelemetry = {
			track: jest.fn(),
		};
		mockGetSharedWorkflowIds = workflows_service_1.getSharedWorkflowIds;
		testRunsController = new test_runs_controller_ee_1.TestRunsController(
			mockTestRunRepository,
			mockWorkflowFinderService,
			mockTestCaseExecutionRepository,
			mockTestRunnerService,
			mockInstanceSettings,
			mockTelemetry,
		);
		mockUser = { id: 'user123' };
		mockWorkflowId = 'workflow123';
		mockTestRunId = 'testrun123';
		mockGetSharedWorkflowIds.mockResolvedValue([mockWorkflowId]);
		mockTestRunRepository.findOne.mockResolvedValue({
			id: mockTestRunId,
			status: 'running',
		});
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	describe('getTestRun', () => {
		it('should return test run when it exists and user has access', async () => {
			const mockTestRun = {
				id: mockTestRunId,
				status: 'running',
			};
			mockGetSharedWorkflowIds.mockResolvedValue([mockWorkflowId]);
			mockTestRunRepository.findOne.mockResolvedValue(mockTestRun);
			const result = await testRunsController.getTestRun(mockTestRunId, mockWorkflowId, mockUser);
			expect(mockGetSharedWorkflowIds).toHaveBeenCalledWith(mockUser, ['workflow:read']);
			expect(mockTestRunRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockTestRunId },
			});
			expect(result).toEqual(mockTestRun);
		});
		it('should throw NotFoundError when user has no access to workflow', async () => {
			mockGetSharedWorkflowIds.mockResolvedValue([]);
			await expect(
				testRunsController.getTestRun(mockTestRunId, mockWorkflowId, mockUser),
			).rejects.toThrow(not_found_error_1.NotFoundError);
			expect(mockGetSharedWorkflowIds).toHaveBeenCalledWith(mockUser, ['workflow:read']);
			expect(mockTestRunRepository.findOne).not.toHaveBeenCalled();
		});
		it('should throw NotFoundError when workflowId does not match any shared workflows', async () => {
			mockGetSharedWorkflowIds.mockResolvedValue(['different-workflow-id']);
			await expect(
				testRunsController.getTestRun(mockTestRunId, mockWorkflowId, mockUser),
			).rejects.toThrow(not_found_error_1.NotFoundError);
			expect(mockGetSharedWorkflowIds).toHaveBeenCalledWith(mockUser, ['workflow:read']);
			expect(mockTestRunRepository.findOne).not.toHaveBeenCalled();
		});
		it('should throw NotFoundError when test run does not exist', async () => {
			mockGetSharedWorkflowIds.mockResolvedValue([mockWorkflowId]);
			mockTestRunRepository.findOne.mockResolvedValue(null);
			await expect(
				testRunsController.getTestRun(mockTestRunId, mockWorkflowId, mockUser),
			).rejects.toThrow(not_found_error_1.NotFoundError);
			expect(mockGetSharedWorkflowIds).toHaveBeenCalledWith(mockUser, ['workflow:read']);
			expect(mockTestRunRepository.findOne).toHaveBeenCalledWith({
				where: { id: mockTestRunId },
			});
		});
	});
});
//# sourceMappingURL=test-runs.controller.ee.test.js.map
