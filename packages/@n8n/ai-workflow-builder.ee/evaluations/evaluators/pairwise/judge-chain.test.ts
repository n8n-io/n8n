import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';

import type { SimpleWorkflow } from '@/types/workflow';

import { evaluateWorkflowPairwise, type PairwiseEvaluationInput } from './judge-chain';
import * as baseEvaluator from '../llm-judge/evaluators/base';

// Mock the base evaluator module
jest.mock('../llm-judge/evaluators/base', () => ({
	createEvaluatorChain: jest.fn(),
	invokeEvaluatorChain: jest.fn(),
}));

describe('evaluateWorkflowPairwise', () => {
	const mockLlm = mock<BaseChatModel>();

	const mockWorkflow: SimpleWorkflow = {
		nodes: [],
		connections: {},
		name: 'Test Workflow',
	};

	const input: PairwiseEvaluationInput = {
		evalCriteria: {
			dos: 'Do this',
			donts: "Don't do that",
		},
		workflowJSON: mockWorkflow,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return structured result from invokeEvaluatorChain', async () => {
		const mockResult = {
			violations: [],
			passes: [
				{ rule: 'Do this', justification: 'Done' },
				{ rule: "Don't do that", justification: 'Not done' },
			],
		};

		jest.mocked(baseEvaluator.invokeEvaluatorChain).mockResolvedValue(mockResult);

		const result = await evaluateWorkflowPairwise(mockLlm, input);

		expect(result).toEqual({
			...mockResult,
			primaryPass: true,
			diagnosticScore: 1,
		});
		expect(baseEvaluator.createEvaluatorChain).toHaveBeenCalledWith(
			mockLlm,
			expect.anything(), // schema
			expect.stringContaining('expert n8n workflow auditor'), // system prompt
			expect.stringContaining('<task_context>'), // human template
		);
		expect(baseEvaluator.invokeEvaluatorChain).toHaveBeenCalledWith(
			undefined, // The chain (undefined because createEvaluatorChain mock returns undefined)
			expect.objectContaining({
				userPrompt: expect.stringContaining('<do>'),
				generatedWorkflow: input.workflowJSON,
			}),
			undefined, // config parameter (not passed in this test)
		);
	});

	it('should calculate diagnosticScore correctly with violations', async () => {
		const mockResult = {
			violations: [{ rule: "Don't do that", justification: 'Did it' }],
			passes: [{ rule: 'Do this', justification: 'Done' }],
		};

		jest.mocked(baseEvaluator.invokeEvaluatorChain).mockResolvedValue(mockResult);

		const result = await evaluateWorkflowPairwise(mockLlm, input);

		expect(result.primaryPass).toBe(false);
		expect(result.diagnosticScore).toBe(0.5);
	});

	it('should return diagnosticScore 0 when no rules evaluated', async () => {
		const mockResult = {
			violations: [],
			passes: [],
		};

		jest.mocked(baseEvaluator.invokeEvaluatorChain).mockResolvedValue(mockResult);

		const result = await evaluateWorkflowPairwise(mockLlm, input);

		expect(result.primaryPass).toBe(true);
		expect(result.diagnosticScore).toBe(0);
	});
});
