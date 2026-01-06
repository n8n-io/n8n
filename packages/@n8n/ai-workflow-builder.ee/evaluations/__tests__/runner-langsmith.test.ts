/**
 * Tests for LangSmith mode runner.
 *
 * These tests mock the LangSmith evaluate() function to verify:
 * - Target function does all work (generation + evaluation)
 * - Evaluator just extracts pre-computed feedback
 * - Proper trace propagation
 */

import type { SimpleWorkflow } from '@/types/workflow';

import type { Evaluator, Feedback, RunConfig } from '../harness-types';

// Mock langsmith/evaluation
jest.mock('langsmith/evaluation', () => ({
	evaluate: jest.fn(),
}));

// Mock langsmith/traceable
jest.mock('langsmith/traceable', () => ({
	traceable: jest.fn(
		<T extends (...args: unknown[]) => unknown>(fn: T, _options: unknown): T => fn,
	),
}));

// Mock core/environment module (dynamically imported in runner.ts)
jest.mock('../core/environment', () => ({
	setupTestEnvironment: jest.fn().mockResolvedValue({
		lsClient: {
			readDataset: jest.fn().mockResolvedValue({ id: 'test-dataset-id' }),
			listExamples: jest.fn().mockReturnValue([]),
			awaitPendingTraceBatches: jest.fn().mockResolvedValue(undefined),
		},
		traceFilters: {
			resetStats: jest.fn(),
			logStats: jest.fn(),
		},
	}),
}));

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

/** Helper to create a simple evaluator */
function createMockEvaluator(
	name: string,
	feedback: Feedback[] = [{ key: name, score: 1 }],
): Evaluator {
	return {
		name,
		evaluate: jest.fn().mockResolvedValue(feedback),
	};
}

describe('Runner - LangSmith Mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('runEvaluation() with LangSmith', () => {
		it('should call langsmith evaluate() with correct options', async () => {
			const { evaluate } = await import('langsmith/evaluation');
			const mockEvaluate = evaluate as jest.Mock;
			mockEvaluate.mockResolvedValue(undefined);

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'my-dataset',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [createMockEvaluator('test')],
				langsmithOptions: {
					experimentName: 'test-experiment',
					repetitions: 2,
					concurrency: 4,
				},
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			expect(mockEvaluate).toHaveBeenCalledWith(
				expect.any(Function), // target function
				expect.objectContaining({
					data: 'my-dataset',
					experimentPrefix: 'test-experiment',
					numRepetitions: 2,
					maxConcurrency: 4,
				}),
			);
		});

		it('should create target function that generates workflow and runs evaluators', async () => {
			const { evaluate } = await import('langsmith/evaluation');
			const mockEvaluate = evaluate as jest.Mock;

			let capturedTarget: (inputs: { prompt: string }) => Promise<unknown>;
			mockEvaluate.mockImplementation(async (target, _options) => {
				capturedTarget = target;
				return undefined;
			});

			const workflow = createMockWorkflow('Generated');
			const generateWorkflow = jest.fn().mockResolvedValue(workflow);
			const evaluator = createMockEvaluator('test', [{ key: 'test', score: 0.9 }]);

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'test-dataset',
				generateWorkflow,
				evaluators: [evaluator],
				langsmithOptions: {
					experimentName: 'test',
					repetitions: 1,
					concurrency: 1,
				},
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			// Execute the captured target function
			const result = await capturedTarget!({ prompt: 'Create a workflow' });

			// Should have generated workflow
			expect(generateWorkflow).toHaveBeenCalledWith('Create a workflow');

			// Should have run evaluator (context may be empty object when no context provided)
			expect(evaluator.evaluate).toHaveBeenCalledWith(workflow, expect.anything());

			// Should return workflow and pre-computed feedback
			expect(result).toEqual({
				workflow,
				prompt: 'Create a workflow',
				feedback: [{ key: 'test', score: 0.9 }],
			});
		});

		it('should aggregate feedback from multiple evaluators in target', async () => {
			const { evaluate } = await import('langsmith/evaluation');
			const mockEvaluate = evaluate as jest.Mock;

			let capturedTarget: (inputs: { prompt: string }) => Promise<unknown>;
			mockEvaluate.mockImplementation(async (target, _options) => {
				capturedTarget = target;
				return undefined;
			});

			const evaluator1 = createMockEvaluator('e1', [{ key: 'e1', score: 0.8 }]);
			const evaluator2 = createMockEvaluator('e2', [
				{ key: 'e2a', score: 0.9 },
				{ key: 'e2b', score: 1.0 },
			]);

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'test-dataset',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator1, evaluator2],
				langsmithOptions: {
					experimentName: 'test',
					repetitions: 1,
					concurrency: 1,
				},
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			const result = (await capturedTarget!({ prompt: 'Test' })) as {
				feedback: Feedback[];
			};

			// Should have all feedback aggregated
			expect(result.feedback).toHaveLength(3);
			expect(result.feedback).toContainEqual({ key: 'e1', score: 0.8 });
			expect(result.feedback).toContainEqual({ key: 'e2a', score: 0.9 });
			expect(result.feedback).toContainEqual({ key: 'e2b', score: 1.0 });
		});

		it('should handle evaluator errors gracefully in target', async () => {
			const { evaluate } = await import('langsmith/evaluation');
			const mockEvaluate = evaluate as jest.Mock;

			let capturedTarget: (inputs: { prompt: string }) => Promise<unknown>;
			mockEvaluate.mockImplementation(async (target, _options) => {
				capturedTarget = target;
				return undefined;
			});

			const goodEvaluator = createMockEvaluator('good', [{ key: 'good', score: 1 }]);
			const badEvaluator: Evaluator = {
				name: 'bad',
				evaluate: jest.fn().mockRejectedValue(new Error('Evaluator crashed')),
			};

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'test-dataset',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [goodEvaluator, badEvaluator],
				langsmithOptions: {
					experimentName: 'test',
					repetitions: 1,
					concurrency: 1,
				},
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			// Target should not throw, should return error as feedback
			const result = (await capturedTarget!({ prompt: 'Test' })) as {
				feedback: Feedback[];
			};

			expect(result.feedback).toContainEqual({ key: 'good', score: 1 });
			expect(result.feedback).toContainEqual({
				key: 'bad.error',
				score: 0,
				comment: 'Evaluator crashed',
			});
		});

		it('should create evaluator that extracts pre-computed feedback', async () => {
			const { evaluate } = await import('langsmith/evaluation');
			const mockEvaluate = evaluate as jest.Mock;

			let capturedEvaluators: Array<(run: { outputs: unknown }) => unknown>;
			mockEvaluate.mockImplementation(
				async (
					_target: unknown,
					options: { evaluators: Array<(run: { outputs: unknown }) => unknown> },
				) => {
					capturedEvaluators = options.evaluators;
					return undefined;
				},
			);

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'test-dataset',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [createMockEvaluator('test')],
				langsmithOptions: {
					experimentName: 'test',
					repetitions: 1,
					concurrency: 1,
				},
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			// Should have single evaluator that extracts feedback
			expect(capturedEvaluators!).toHaveLength(1);

			const lsEvaluator = capturedEvaluators![0];
			const mockRun = {
				outputs: {
					feedback: [
						{ key: 'test', score: 0.9 },
						{ key: 'other', score: 0.8 },
					],
				},
			};

			const extracted = await lsEvaluator(mockRun);
			expect(extracted).toEqual([
				{ key: 'test', score: 0.9 },
				{ key: 'other', score: 0.8 },
			]);
		});

		it('should handle missing feedback in outputs', async () => {
			const { evaluate } = await import('langsmith/evaluation');
			const mockEvaluate = evaluate as jest.Mock;

			let capturedEvaluators: Array<(run: { outputs: unknown }) => unknown>;
			mockEvaluate.mockImplementation(
				async (
					_target: unknown,
					options: { evaluators: Array<(run: { outputs: unknown }) => unknown> },
				) => {
					capturedEvaluators = options.evaluators;
					return undefined;
				},
			);

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'test-dataset',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [],
				langsmithOptions: {
					experimentName: 'test',
					repetitions: 1,
					concurrency: 1,
				},
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			const lsEvaluator = capturedEvaluators![0];

			// No feedback in outputs
			const mockRun = { outputs: {} };
			const extracted = await lsEvaluator(mockRun);

			expect(extracted).toEqual([
				{
					key: 'evaluationError',
					score: 0,
					comment: 'No feedback found in target output',
				},
			]);
		});

		it('should pass dataset-level context to evaluators', async () => {
			const { evaluate } = await import('langsmith/evaluation');
			const mockEvaluate = evaluate as jest.Mock;

			let capturedTarget: (inputs: { prompt: string; evals?: unknown }) => Promise<unknown>;
			mockEvaluate.mockImplementation(async (target, _options) => {
				capturedTarget = target;
				return undefined;
			});

			const evaluator: Evaluator<{ dos: string }> = {
				name: 'contextual',
				evaluate: jest
					.fn()
					.mockImplementation((_workflow: SimpleWorkflow, ctx: { dos: string } | undefined) => {
						return [{ key: 'contextual', score: ctx?.dos ? 1 : 0 }];
					}),
			};

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'test-dataset',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator as Evaluator<unknown>],
				langsmithOptions: {
					experimentName: 'test',
					repetitions: 1,
					concurrency: 1,
				},
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			// Simulate LangSmith passing dataset row with evals
			const result = (await capturedTarget!({
				prompt: 'Test',
				evals: { dos: 'Use Slack', donts: 'No HTTP' },
			})) as { feedback: Feedback[] };

			// Evaluator should have received context from dataset
			expect(evaluator.evaluate).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ dos: 'Use Slack', donts: 'No HTTP' }),
			);
			expect(result.feedback).toContainEqual({ key: 'contextual', score: 1 });
		});
	});
});
