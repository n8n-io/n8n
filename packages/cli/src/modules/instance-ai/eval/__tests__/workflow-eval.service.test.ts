import type { InstanceAiEvalExecutionResult, EvalJudgeVerdict } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

jest.mock('../execution.service', () => ({ EvalExecutionService: jest.fn() }));
jest.mock('../judge.service', () => ({ EvalJudgeService: jest.fn() }));
jest.mock('../mock-data-storage.service', () => ({ MockDataStorageService: jest.fn() }));

import type { EvalExecutionService } from '../execution.service';
import type { EvalJudgeService } from '../judge.service';
import type { MockDataStorageService } from '../mock-data-storage.service';
import { WorkflowEvalService } from '../workflow-eval.service';

const mockExecResult: InstanceAiEvalExecutionResult = {
	executionId: 'exec-1',
	success: true,
	nodeResults: {},
	errors: [],
	hints: {
		globalContext: '',
		triggerContent: {},
		nodeHints: {},
		warnings: [],
		bypassPinData: {},
	},
};

const mockVerdict: EvalJudgeVerdict = {
	pass: true,
	reasoning: 'All good',
	failureCategory: null,
	rootCause: null,
};

describe('WorkflowEvalService', () => {
	const executionService = mock<EvalExecutionService>();
	const judgeService = mock<EvalJudgeService>();
	const storageService = mock<MockDataStorageService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const logger = mock<Logger>();
	const user = mock<User>();

	const service = new WorkflowEvalService(
		executionService,
		judgeService,
		storageService,
		workflowFinderService,
		logger,
	);

	beforeEach(() => {
		jest.clearAllMocks();
		executionService.executeWithLlmMock.mockResolvedValue(mockExecResult);
	});

	it('should execute without judge or storage when no options', async () => {
		const result = await service.executeAndEvaluate('wf-1', user);

		expect(executionService.executeWithLlmMock).toHaveBeenCalledWith('wf-1', user, {
			scenarioHints: undefined,
		});
		expect(judgeService.judge).not.toHaveBeenCalled();
		expect(storageService.persistAsPinData).not.toHaveBeenCalled();
		expect(result.execution).toBe(mockExecResult);
		expect(result.verification).toBeUndefined();
		expect(result.pinDataPersisted).toBeUndefined();
	});

	it('should call judge when successCriteria is provided', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-1',
			name: 'Test',
			nodes: [],
			connections: {},
			active: false,
		} as never);
		judgeService.judge.mockResolvedValue(mockVerdict);

		const result = await service.executeAndEvaluate('wf-1', user, {
			successCriteria: 'workflow should work',
		});

		expect(judgeService.judge).toHaveBeenCalledWith(
			mockExecResult,
			expect.objectContaining({ id: 'wf-1' }),
			'workflow should work',
			undefined,
		);
		expect(result.verification).toEqual(mockVerdict);
	});

	it('should not call judge when successCriteria is absent', async () => {
		const result = await service.executeAndEvaluate('wf-1', user, {
			scenarioHints: 'some hints',
		});

		expect(judgeService.judge).not.toHaveBeenCalled();
		expect(result.verification).toBeUndefined();
	});

	it('should call storage when persistMockData is true', async () => {
		storageService.persistAsPinData.mockResolvedValue(true);

		const result = await service.executeAndEvaluate('wf-1', user, {
			persistMockData: true,
		});

		expect(storageService.persistAsPinData).toHaveBeenCalledWith('wf-1', mockExecResult);
		expect(result.pinDataPersisted).toBe(true);
	});

	it('should handle storage failure gracefully', async () => {
		storageService.persistAsPinData.mockRejectedValue(new Error('DB error'));

		const result = await service.executeAndEvaluate('wf-1', user, {
			persistMockData: true,
		});

		expect(result.pinDataPersisted).toBe(false);
	});

	it('should return verification_gap when workflow not found for judge', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null as never);

		const result = await service.executeAndEvaluate('wf-1', user, {
			successCriteria: 'test',
		});

		expect(judgeService.judge).not.toHaveBeenCalled();
		expect(result.verification).toEqual(
			expect.objectContaining({
				pass: false,
				failureCategory: 'verification_gap',
			}),
		);
	});
});
