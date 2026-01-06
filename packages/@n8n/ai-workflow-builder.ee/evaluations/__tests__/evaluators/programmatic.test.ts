/**
 * Tests for programmatic evaluator factory.
 *
 * These tests mock the underlying programmaticEvaluation function and verify
 * that the factory correctly wraps it and transforms the results.
 */

import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

// Store mock for programmaticEvaluation
const mockProgrammaticEvaluation = jest.fn();

// Mock the programmatic evaluation module
jest.mock('../../programmatic/programmatic-evaluation', () => ({
	programmaticEvaluation: (...args: unknown[]): unknown => mockProgrammaticEvaluation(...args),
}));

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

/** Helper to create mock evaluation result */
function createMockEvaluationResult(
	overrides: Partial<{
		overallScore: number;
		connections: { score: number; violations: Array<{ type: string; description: string }> };
		trigger: { score: number; violations: Array<{ type: string; description: string }> };
		agentPrompt: { score: number; violations: Array<{ type: string; description: string }> };
		tools: { score: number; violations: Array<{ type: string; description: string }> };
		fromAi: { score: number; violations: Array<{ type: string; description: string }> };
		similarity: { score: number; violations: Array<{ type: string; description: string }> } | null;
	}> = {},
) {
	return {
		overallScore: 0.85,
		connections: { score: 1.0, violations: [] },
		trigger: { score: 1.0, violations: [] },
		agentPrompt: { score: 0.9, violations: [] },
		tools: { score: 1.0, violations: [] },
		fromAi: { score: 0.8, violations: [] },
		similarity: null,
		...overrides,
	};
}

describe('Programmatic Evaluator', () => {
	const mockNodeTypes: INodeTypeDescription[] = [];

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createProgrammaticEvaluator()', () => {
		it('should create an evaluator with correct name', async () => {
			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			expect(evaluator.name).toBe('programmatic');
		});

		it('should call programmaticEvaluation with workflow and context', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(createMockEvaluationResult());

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const context = { prompt: 'Create a test workflow' };

			await evaluator.evaluate(workflow, context);

			expect(mockProgrammaticEvaluation).toHaveBeenCalledWith(
				{
					userPrompt: 'Create a test workflow',
					generatedWorkflow: workflow,
					referenceWorkflow: undefined,
				},
				mockNodeTypes,
			);
		});

		it('should pass reference workflow when provided in context', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(createMockEvaluationResult());

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');
			const context = { prompt: 'Test prompt', referenceWorkflow };

			await evaluator.evaluate(workflow, context);

			expect(mockProgrammaticEvaluation).toHaveBeenCalledWith(
				{
					userPrompt: 'Test prompt',
					generatedWorkflow: workflow,
					referenceWorkflow,
				},
				mockNodeTypes,
			);
		});

		it('should return feedback with overall score', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(
				createMockEvaluationResult({ overallScore: 0.92 }),
			);

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test' });

			const overallFeedback = feedback.find((f) => f.key === 'programmatic.overall');
			expect(overallFeedback).toEqual({
				key: 'programmatic.overall',
				score: 0.92,
			});
		});

		it('should return feedback for all check categories', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(createMockEvaluationResult());

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test' });

			const feedbackKeys = feedback.map((f) => f.key);
			expect(feedbackKeys).toContain('programmatic.overall');
			expect(feedbackKeys).toContain('programmatic.connections');
			expect(feedbackKeys).toContain('programmatic.trigger');
			expect(feedbackKeys).toContain('programmatic.agentPrompt');
			expect(feedbackKeys).toContain('programmatic.tools');
			expect(feedbackKeys).toContain('programmatic.fromAi');
		});

		it('should include violations in feedback comments', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(
				createMockEvaluationResult({
					connections: {
						score: 0.5,
						violations: [
							{ type: 'disconnected-node', description: 'Node A has no connections' },
							{ type: 'invalid-connection', description: 'Invalid edge between B and C' },
						],
					},
				}),
			);

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test' });

			const connectionsFeedback = feedback.find((f) => f.key === 'programmatic.connections');
			expect(connectionsFeedback?.comment).toContain(
				'[disconnected-node] Node A has no connections',
			);
			expect(connectionsFeedback?.comment).toContain(
				'[invalid-connection] Invalid edge between B and C',
			);
		});

		it('should not include comment when no violations', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(
				createMockEvaluationResult({
					trigger: { score: 1.0, violations: [] },
				}),
			);

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test' });

			const triggerFeedback = feedback.find((f) => f.key === 'programmatic.trigger');
			expect(triggerFeedback?.comment).toBeUndefined();
		});

		it('should include similarity feedback when reference workflow provided', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(
				createMockEvaluationResult({
					similarity: {
						score: 0.75,
						violations: [{ type: 'node-mismatch', description: 'Missing expected node' }],
					},
				}),
			);

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');
			const feedback = await evaluator.evaluate(workflow, {
				prompt: 'Test',
				referenceWorkflow,
			});

			const similarityFeedback = feedback.find((f) => f.key === 'programmatic.similarity');
			expect(similarityFeedback).toEqual({
				key: 'programmatic.similarity',
				score: 0.75,
				comment: '[node-mismatch] Missing expected node',
			});
		});

		it('should not include similarity feedback when result is null', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(
				createMockEvaluationResult({
					similarity: null,
				}),
			);

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test' });

			const similarityFeedback = feedback.find((f) => f.key === 'programmatic.similarity');
			expect(similarityFeedback).toBeUndefined();
		});

		it('should handle evaluation errors gracefully', async () => {
			mockProgrammaticEvaluation.mockRejectedValue(new Error('Evaluation failed'));

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();

			// Should throw - let the runner handle errors
			await expect(evaluator.evaluate(workflow, { prompt: 'Test' })).rejects.toThrow(
				'Evaluation failed',
			);
		});
	});
});
