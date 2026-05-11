/**
 * Tests for LLM-as-judge evaluator factory.
 *
 * These tests mock the underlying evaluateWorkflow function and verify
 * that the factory correctly wraps it and transforms the results.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

// Store original module
const mockEvaluateWorkflow = jest.fn();

// Mock the evaluateWorkflow function
jest.mock('../../evaluators/llm-judge/workflow-evaluator', () => ({
	evaluateWorkflow: (...args: unknown[]): unknown => mockEvaluateWorkflow(...args),
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
		bestPractices: { score: 0.82, violations: [] },
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
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'llm-judge', metric: 'functionality' }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'llm-judge', metric: 'connections' }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'llm-judge', metric: 'expressions' }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'llm-judge', metric: 'nodeConfiguration' }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'llm-judge', metric: 'efficiency' }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'llm-judge', metric: 'dataFlow' }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'llm-judge', metric: 'maintainability' }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'llm-judge', metric: 'bestPractices' }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'llm-judge', metric: 'overallScore' }),
			);
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

			const funcFeedback = feedback.find(
				(f) => f.evaluator === 'llm-judge' && f.metric === 'functionality',
			);
			expect(funcFeedback?.comment).toContain('Missing HTTP node');
		});

		it('should include bestPractices violations in comments', async () => {
			mockEvaluateWorkflow.mockResolvedValue(
				createMockEvalResult({
					bestPractices: {
						score: 0.4,
						violations: [
							{ type: 'major', description: 'Missing rate limiting', pointsDeducted: 0.2 },
						],
					},
				}),
			);

			const { createLLMJudgeEvaluator } = await import('../../evaluators/llm-judge');
			const evaluator = createLLMJudgeEvaluator(mockLlm, mockNodeTypes);

			const feedback = await evaluator.evaluate(createMockWorkflow(), { prompt: 'Test' });
			const bpFeedback = feedback.find(
				(f) => f.evaluator === 'llm-judge' && f.metric === 'bestPractices',
			);

			expect(bpFeedback?.comment).toContain('Missing rate limiting');
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
