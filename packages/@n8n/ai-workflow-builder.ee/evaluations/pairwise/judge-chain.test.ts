import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { evaluateWorkflowPairwise, type PairwiseEvaluationInput } from './judge-chain';
import type { SimpleWorkflow } from '../../src/types/workflow';
import * as baseEvaluator from '../chains/evaluators/base';

// Mock the base evaluator module
jest.mock('../chains/evaluators/base', () => ({
	createEvaluatorChain: jest.fn(),
	invokeEvaluatorChain: jest.fn(),
}));

describe('evaluateWorkflowPairwise', () => {
	const mockLlm = {
		bindTools: jest.fn(),
		withStructuredOutput: jest.fn(),
	} as unknown as BaseChatModel;

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

		(baseEvaluator.invokeEvaluatorChain as jest.Mock).mockResolvedValue(mockResult);

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
				userPrompt: expect.stringContaining('[DO]'),
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

		(baseEvaluator.invokeEvaluatorChain as jest.Mock).mockResolvedValue(mockResult);

		const result = await evaluateWorkflowPairwise(mockLlm, input);

		expect(result.primaryPass).toBe(false);
		expect(result.diagnosticScore).toBe(0.5);
	});

	it('should return diagnosticScore 0 when no rules evaluated', async () => {
		const mockResult = {
			violations: [],
			passes: [],
		};

		(baseEvaluator.invokeEvaluatorChain as jest.Mock).mockResolvedValue(mockResult);

		const result = await evaluateWorkflowPairwise(mockLlm, input);

		expect(result.primaryPass).toBe(true);
		expect(result.diagnosticScore).toBe(0);
	});
});
