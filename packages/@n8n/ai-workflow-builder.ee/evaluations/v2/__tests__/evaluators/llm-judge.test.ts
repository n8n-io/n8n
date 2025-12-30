/**
 * Tests for LLM-as-judge evaluator factory.
 *
 * These tests mock the underlying evaluateWorkflow function and verify
 * that the factory correctly wraps it and transforms the results.
 */

import { mock } from 'jest-mock-extended';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

// Store original module
const mockEvaluateWorkflow = jest.fn();

// Mock the evaluateWorkflow function from chains
// Path from test file to chains module: evaluations/v2/__tests__/evaluators -> evaluations/chains
jest.mock('../../../chains/workflow-evaluator', () => ({
	evaluateWorkflow: (...args: unknown[]) => mockEvaluateWorkflow(...args),
}));

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

/** Helper to create a mock evaluation result */
function createMockEvalResult(overrides: Record<string, unknown> = {}) {
	return {
		functionality: { score: 0.9, violations: [] },
		connections: { score: 1.0, violations: [] },
		expressions: { score: 0.8, violations: [] },
		nodeConfiguration: { score: 0.85, violations: [] },
		efficiency: {
			score: 0.95,
			violations: [],
			redundancyScore: 1,
			pathOptimization: 0.9,
			nodeCountEfficiency: 0.95,
		},
		dataFlow: { score: 0.9, violations: [] },
		maintainability: {
			score: 0.88,
			violations: [],
			nodeNamingQuality: 0.9,
			workflowOrganization: 0.85,
			modularity: 0.9,
		},
		overallScore: 0.9,
		summary: 'Good workflow',
		...overrides,
	};
}

describe('LLM-Judge Evaluator', () => {
	let mockLlm: BaseChatModel;
	let mockNodeTypes: INodeTypeDescription[];

	beforeEach(() => {
		jest.clearAllMocks();
		mockLlm = mock<BaseChatModel>();
		mockNodeTypes = [];
	});

	describe('createLLMJudgeEvaluator()', () => {
		it('should create an evaluator with correct name', async () => {
			const { createLLMJudgeEvaluator } = await import('../../evaluators/llm-judge');
			const evaluator = createLLMJudgeEvaluator(mockLlm, mockNodeTypes);

			expect(evaluator.name).toBe('llm-judge');
		});

		it('should call evaluateWorkflow with workflow and prompt', async () => {
			mockEvaluateWorkflow.mockResolvedValue(createMockEvalResult());

			const { createLLMJudgeEvaluator } = await import('../../evaluators/llm-judge');
			const evaluator = createLLMJudgeEvaluator(mockLlm, mockNodeTypes);

			const workflow = createMockWorkflow();
			const context = { prompt: 'Create a test workflow' };

			await evaluator.evaluate(workflow, context);

			expect(mockEvaluateWorkflow).toHaveBeenCalledWith(mockLlm, {
				userPrompt: 'Create a test workflow',
				generatedWorkflow: workflow,
			});
		});

		it('should return feedback array with all category scores', async () => {
			mockEvaluateWorkflow.mockResolvedValue(createMockEvalResult());

			const { createLLMJudgeEvaluator } = await import('../../evaluators/llm-judge');
			const evaluator = createLLMJudgeEvaluator(mockLlm, mockNodeTypes);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test' });

			// Should have feedback for each category
			expect(feedback).toContainEqual(expect.objectContaining({ key: 'functionality' }));
			expect(feedback).toContainEqual(expect.objectContaining({ key: 'connections' }));
			expect(feedback).toContainEqual(expect.objectContaining({ key: 'expressions' }));
			expect(feedback).toContainEqual(expect.objectContaining({ key: 'nodeConfiguration' }));
			expect(feedback).toContainEqual(expect.objectContaining({ key: 'efficiency' }));
			expect(feedback).toContainEqual(expect.objectContaining({ key: 'dataFlow' }));
			expect(feedback).toContainEqual(expect.objectContaining({ key: 'maintainability' }));
			expect(feedback).toContainEqual(expect.objectContaining({ key: 'overallScore' }));
		});

		it('should include violations in feedback comments', async () => {
			mockEvaluateWorkflow.mockResolvedValue(
				createMockEvalResult({
					functionality: {
						score: 0.5,
						violations: [
							{ type: 'critical', description: 'Missing HTTP node', pointsDeducted: 0.3 },
							{ type: 'major', description: 'Incorrect branching', pointsDeducted: 0.2 },
						],
					},
				}),
			);

			const { createLLMJudgeEvaluator } = await import('../../evaluators/llm-judge');
			const evaluator = createLLMJudgeEvaluator(mockLlm, mockNodeTypes);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test' });

			const funcFeedback = feedback.find((f) => f.key === 'functionality');
			expect(funcFeedback?.comment).toContain('Missing HTTP node');
		});

		it('should handle evaluation errors gracefully', async () => {
			mockEvaluateWorkflow.mockRejectedValue(new Error('LLM API error'));

			const { createLLMJudgeEvaluator } = await import('../../evaluators/llm-judge');
			const evaluator = createLLMJudgeEvaluator(mockLlm, mockNodeTypes);

			const workflow = createMockWorkflow();

			// Should throw - let the runner handle errors
			await expect(evaluator.evaluate(workflow, { prompt: 'Test' })).rejects.toThrow(
				'LLM API error',
			);
		});
	});
});
