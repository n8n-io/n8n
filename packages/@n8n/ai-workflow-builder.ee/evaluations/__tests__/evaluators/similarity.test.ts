/**
 * Tests for similarity evaluator factory.
 *
 * These tests mock the underlying workflow similarity functions and verify
 * that the factory correctly wraps them and transforms the results.
 */

import type { SimpleWorkflow } from '@/types/workflow';

// Store mocks for similarity functions
const mockEvaluateWorkflowSimilarity = jest.fn();
const mockEvaluateWorkflowSimilarityMultiple = jest.fn();

// Mock the workflow similarity module
jest.mock('../../programmatic/evaluators/workflow-similarity', () => ({
	evaluateWorkflowSimilarity: (...args: unknown[]): unknown =>
		mockEvaluateWorkflowSimilarity(...args),
	evaluateWorkflowSimilarityMultiple: (...args: unknown[]): unknown =>
		mockEvaluateWorkflowSimilarityMultiple(...args),
}));

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

/** Helper to create mock similarity result */
function createMockSimilarityResult(
	overrides: Partial<{
		violations: Array<{ name: string; type: string; description: string; pointsDeducted: number }>;
		score: number;
	}> = {},
) {
	return {
		violations: [],
		score: 0.85,
		...overrides,
	};
}

describe('Similarity Evaluator', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	type SimilarityFeedback = { evaluator: string; metric: string; score: number; comment?: string };
	const findFeedback = (feedback: SimilarityFeedback[], metric: string) =>
		feedback.find((f) => f.evaluator === 'similarity' && f.metric === metric);

	describe('createSimilarityEvaluator()', () => {
		it('should create an evaluator with correct name', async () => {
			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator();

			expect(evaluator.name).toBe('similarity');
		});

		it('should return error feedback when no reference workflow provided', async () => {
			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator();

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test prompt' });

			expect(mockEvaluateWorkflowSimilarity).not.toHaveBeenCalled();
			expect(mockEvaluateWorkflowSimilarityMultiple).not.toHaveBeenCalled();

			expect(feedback).toContainEqual({
				evaluator: 'similarity',
				metric: 'error',
				score: 0,
				kind: 'score',
				comment: 'No reference workflow provided for comparison',
			});
		});

		it('should call evaluateWorkflowSimilarity with single reference workflow', async () => {
			mockEvaluateWorkflowSimilarity.mockResolvedValue(createMockSimilarityResult());

			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator({ preset: 'strict' });

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');

			await evaluator.evaluate(workflow, {
				prompt: 'Test prompt',
				referenceWorkflows: [referenceWorkflow],
			});

			expect(mockEvaluateWorkflowSimilarity).toHaveBeenCalledWith(
				workflow,
				referenceWorkflow,
				'strict',
				undefined,
			);
		});

		it('should call evaluateWorkflowSimilarityMultiple with multiple reference workflows', async () => {
			mockEvaluateWorkflowSimilarityMultiple.mockResolvedValue(createMockSimilarityResult());

			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator({ preset: 'lenient' });

			const workflow = createMockWorkflow();
			const referenceWorkflows = [
				createMockWorkflow('Reference 1'),
				createMockWorkflow('Reference 2'),
			];

			await evaluator.evaluate(workflow, { prompt: 'Test prompt', referenceWorkflows });

			expect(mockEvaluateWorkflowSimilarityMultiple).toHaveBeenCalledWith(
				workflow,
				referenceWorkflows,
				'lenient',
				undefined,
			);
		});

		it('should use default preset when not specified', async () => {
			mockEvaluateWorkflowSimilarity.mockResolvedValue(createMockSimilarityResult());

			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator();

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');

			await evaluator.evaluate(workflow, {
				prompt: 'Test prompt',
				referenceWorkflows: [referenceWorkflow],
			});

			expect(mockEvaluateWorkflowSimilarity).toHaveBeenCalledWith(
				workflow,
				referenceWorkflow,
				'standard',
				undefined,
			);
		});

		it('should return feedback with similarity score', async () => {
			mockEvaluateWorkflowSimilarity.mockResolvedValue(createMockSimilarityResult({ score: 0.92 }));

			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator();

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');

			const feedback = await evaluator.evaluate(workflow, {
				prompt: 'Test prompt',
				referenceWorkflows: [referenceWorkflow],
			});

			const scoreFeedback = findFeedback(feedback, 'score');
			expect(scoreFeedback?.score).toBe(0.92);
		});

		it('should include violations in score feedback comment', async () => {
			mockEvaluateWorkflowSimilarity.mockResolvedValue(
				createMockSimilarityResult({
					score: 0.7,
					violations: [
						{
							name: 'workflow-similarity-node-delete',
							type: 'major',
							description: 'Missing Slack node',
							pointsDeducted: 10,
						},
					],
				}),
			);

			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator();

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');

			const feedback = await evaluator.evaluate(workflow, {
				prompt: 'Test prompt',
				referenceWorkflows: [referenceWorkflow],
			});

			const scoreFeedback = findFeedback(feedback, 'score');
			expect(scoreFeedback?.comment).toContain('[major] Missing Slack node');
		});

		it('should return feedback for each violation type', async () => {
			mockEvaluateWorkflowSimilarity.mockResolvedValue(
				createMockSimilarityResult({
					violations: [
						{
							name: 'workflow-similarity-node-delete',
							type: 'major',
							description: 'Missing node A',
							pointsDeducted: 10,
						},
						{
							name: 'workflow-similarity-node-delete',
							type: 'major',
							description: 'Missing node B',
							pointsDeducted: 10,
						},
						{
							name: 'workflow-similarity-edge-insert',
							type: 'minor',
							description: 'Extra connection',
							pointsDeducted: 5,
						},
					],
				}),
			);

			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator();

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');

			const feedback = await evaluator.evaluate(workflow, {
				prompt: 'Test prompt',
				referenceWorkflows: [referenceWorkflow],
			});

			const nodeDeleteFeedback = findFeedback(feedback, 'node-delete');
			expect(nodeDeleteFeedback).toBeDefined();
			expect(nodeDeleteFeedback?.comment).toContain('2 node-delete');

			const edgeInsertFeedback = findFeedback(feedback, 'edge-insert');
			expect(edgeInsertFeedback).toBeDefined();
			expect(edgeInsertFeedback?.comment).toContain('1 edge-insert');
		});

		it('should handle evaluation errors gracefully', async () => {
			mockEvaluateWorkflowSimilarity.mockRejectedValue(new Error('uvx command not found'));

			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator();

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');

			const feedback = await evaluator.evaluate(workflow, {
				prompt: 'Test prompt',
				referenceWorkflows: [referenceWorkflow],
			});

			const errorFeedback = findFeedback(feedback, 'error');
			expect(errorFeedback).toEqual({
				evaluator: 'similarity',
				metric: 'error',
				score: 0,
				kind: 'score',
				comment: 'uvx command not found',
			});
		});

		it('should pass custom config path when provided', async () => {
			mockEvaluateWorkflowSimilarity.mockResolvedValue(createMockSimilarityResult());

			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator({
				preset: 'standard',
				customConfigPath: '/path/to/config.json',
			});

			const workflow = createMockWorkflow();
			const referenceWorkflow = createMockWorkflow('Reference');

			await evaluator.evaluate(workflow, {
				prompt: 'Test prompt',
				referenceWorkflows: [referenceWorkflow],
			});

			expect(mockEvaluateWorkflowSimilarity).toHaveBeenCalledWith(
				workflow,
				referenceWorkflow,
				'standard',
				'/path/to/config.json',
			);
		});

		it('should use evaluateWorkflowSimilarityMultiple when referenceWorkflows has multiple items', async () => {
			mockEvaluateWorkflowSimilarityMultiple.mockResolvedValue(createMockSimilarityResult());

			const { createSimilarityEvaluator } = await import('../../evaluators/similarity');
			const evaluator = createSimilarityEvaluator();

			const workflow = createMockWorkflow();
			const referenceWorkflows = [
				createMockWorkflow('Reference 1'),
				createMockWorkflow('Reference 2'),
			];

			await evaluator.evaluate(workflow, {
				prompt: 'Test prompt',
				referenceWorkflows,
			});

			expect(mockEvaluateWorkflowSimilarityMultiple).toHaveBeenCalled();
			expect(mockEvaluateWorkflowSimilarity).not.toHaveBeenCalled();
		});
	});
});
