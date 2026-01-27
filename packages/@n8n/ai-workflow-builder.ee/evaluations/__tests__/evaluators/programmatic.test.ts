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
		nodes: { score: number; violations: Array<{ type: string; description: string }> };
		trigger: { score: number; violations: Array<{ type: string; description: string }> };
		agentPrompt: { score: number; violations: Array<{ type: string; description: string }> };
		tools: { score: number; violations: Array<{ type: string; description: string }> };
		fromAi: { score: number; violations: Array<{ type: string; description: string }> };
		credentials: { score: number; violations: Array<{ type: string; description: string }> };
		similarity: { score: number; violations: Array<{ type: string; description: string }> } | null;
	}> = {},
) {
	return {
		overallScore: 0.85,
		connections: { score: 1.0, violations: [] },
		nodes: { score: 1.0, violations: [] },
		trigger: { score: 1.0, violations: [] },
		agentPrompt: { score: 0.9, violations: [] },
		tools: { score: 1.0, violations: [] },
		fromAi: { score: 0.8, violations: [] },
		credentials: { score: 1.0, violations: [] },
		similarity: null,
		...overrides,
	};
}

describe('Programmatic Evaluator', () => {
	const mockNodeTypes: INodeTypeDescription[] = [];
	type ProgrammaticFeedback = {
		evaluator: string;
		metric: string;
		score: number;
		comment?: string;
	};
	const findFeedback = (feedback: ProgrammaticFeedback[], metric: string) =>
		feedback.find((f) => f.evaluator === 'programmatic' && f.metric === metric);

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
					referenceWorkflows: undefined,
				},
				mockNodeTypes,
			);
		});

		it('should pass reference workflows when provided in context', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(createMockEvaluationResult());

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');
			const context = { prompt: 'Test prompt', referenceWorkflows: [referenceWorkflow] };

			await evaluator.evaluate(workflow, context);

			expect(mockProgrammaticEvaluation).toHaveBeenCalledWith(
				{
					userPrompt: 'Test prompt',
					generatedWorkflow: workflow,
					referenceWorkflows: [referenceWorkflow],
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

			const overallFeedback = findFeedback(feedback, 'overall');
			expect(overallFeedback).toEqual({
				evaluator: 'programmatic',
				metric: 'overall',
				score: 0.92,
				kind: 'score',
			});
		});

		it('should return feedback for all check categories', async () => {
			mockProgrammaticEvaluation.mockResolvedValue(createMockEvaluationResult());

			const { createProgrammaticEvaluator } = await import('../../evaluators/programmatic');
			const evaluator = createProgrammaticEvaluator(mockNodeTypes);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test' });

			const metrics = feedback.filter((f) => f.evaluator === 'programmatic').map((f) => f.metric);
			expect(metrics).toContain('overall');
			expect(metrics).toContain('connections');
			expect(metrics).toContain('trigger');
			expect(metrics).toContain('agentPrompt');
			expect(metrics).toContain('tools');
			expect(metrics).toContain('fromAi');
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

			const connectionsFeedback = findFeedback(feedback, 'connections');
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

			const triggerFeedback = findFeedback(feedback, 'trigger');
			expect(triggerFeedback?.comment).toBeUndefined();
		});

		it('should include similarity feedback when reference workflows provided', async () => {
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
				referenceWorkflows: [referenceWorkflow],
			});

			const similarityFeedback = findFeedback(feedback, 'similarity');
			expect(similarityFeedback).toEqual({
				evaluator: 'programmatic',
				metric: 'similarity',
				score: 0.75,
				kind: 'metric',
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

			const similarityFeedback = findFeedback(feedback, 'similarity');
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
