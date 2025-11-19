import { evaluateWorkflowPairwise } from '../chains/pairwise-evaluator';
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
	};

	const input = {
		evalCriteria: {
			dos: ['Do this'],
			donts: ["Don't do that"],
		},
		workflowJSON: {
			nodes: [],
			connections: {},
			name: 'Test Workflow', // Added name to satisfy SimpleWorkflow type
		} as any,
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

		const result = await evaluateWorkflowPairwise(mockLlm as any, input);

		expect(result).toEqual({
			...mockResult,
			score: 1,
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
				userPrompt: expect.stringContaining('- [DO] Do this'),
				generatedWorkflow: input.workflowJSON,
			}),
		);
	});

	it('should calculate score correctly with violations', async () => {
		const mockResult = {
			violations: [{ rule: "Don't do that", justification: 'Did it' }],
			passes: [{ rule: 'Do this', justification: 'Done' }],
		};

		(baseEvaluator.invokeEvaluatorChain as jest.Mock).mockResolvedValue(mockResult);

		const result = await evaluateWorkflowPairwise(mockLlm as any, input);

		expect(result.score).toBe(0.5);
	});
});
