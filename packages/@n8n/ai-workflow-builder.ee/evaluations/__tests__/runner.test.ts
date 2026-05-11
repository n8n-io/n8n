import type { SimpleWorkflow } from '@/types/workflow';

import type {
	Evaluator,
	TestCase,
	Feedback,
	RunConfig,
	EvaluationLifecycle,
	ExampleResult,
} from '../harness/harness-types';
import { createLogger } from '../harness/logger';

const silentLogger = createLogger(false);

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

/** Helper to create a simple evaluator */
function createMockEvaluator(
	name: string,
	feedback: Feedback[] = [{ evaluator: name, metric: 'score', score: 1, kind: 'score' }],
): Evaluator {
	return {
		name,
		evaluate: jest.fn().mockResolvedValue(feedback),
	};
}

/** Helper to create a failing evaluator */
function createFailingEvaluator(name: string, error: Error): Evaluator {
	return {
		name,
		evaluate: jest.fn().mockRejectedValue(error),
	};
}

describe('Runner - Local Mode', () => {
	describe('runEvaluation()', () => {
		it('should process all test cases sequentially', async () => {
			const testCases: TestCase[] = [
				{ prompt: 'Create workflow A' },
				{ prompt: 'Create workflow B' },
				{ prompt: 'Create workflow C' },
			];

			const generateWorkflow = jest.fn().mockResolvedValue(createMockWorkflow());
			const evaluator = createMockEvaluator('test');

			const config: RunConfig = {
				mode: 'local',
				dataset: testCases,
				generateWorkflow,
				evaluators: [evaluator],
				logger: silentLogger,
			};

			// Import dynamically to avoid circular deps in test setup
			const { runEvaluation } = await import('../harness/runner');
			const summary = await runEvaluation(config);

			expect(generateWorkflow).toHaveBeenCalledTimes(3);
			expect(evaluator.evaluate).toHaveBeenCalledTimes(3);
			expect(summary.totalExamples).toBe(3);
		});

		it('should run all evaluators in parallel for each example', async () => {
			const evaluator1 = createMockEvaluator('eval1', [
				{ evaluator: 'eval1', metric: 'score', score: 0.8, kind: 'score' },
			]);
			const evaluator2 = createMockEvaluator('eval2', [
				{ evaluator: 'eval2', metric: 'score', score: 0.9, kind: 'score' },
			]);
			const evaluator3 = createMockEvaluator('eval3', [
				{ evaluator: 'eval3', metric: 'score', score: 1.0, kind: 'score' },
			]);

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator1, evaluator2, evaluator3],
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			const summary = await runEvaluation(config);

			// All evaluators should be called
			expect(evaluator1.evaluate).toHaveBeenCalledTimes(1);
			expect(evaluator2.evaluate).toHaveBeenCalledTimes(1);
			expect(evaluator3.evaluate).toHaveBeenCalledTimes(1);

			// Average score should be (0.8 + 0.9 + 1.0) / 3 = 0.9
			expect(summary.averageScore).toBeCloseTo(0.9, 2);
		});

		it('should skip and continue when evaluator throws error', async () => {
			const goodEvaluator = createMockEvaluator('good', [
				{ evaluator: 'good', metric: 'score', score: 1.0, kind: 'score' },
			]);
			const badEvaluator = createFailingEvaluator('bad', new Error('Evaluator crashed'));

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [goodEvaluator, badEvaluator],
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			const summary = await runEvaluation(config);

			// Should complete despite error
			expect(summary.totalExamples).toBe(1);
			// Good evaluator should still run
			expect(goodEvaluator.evaluate).toHaveBeenCalled();
		});

		it('should skip and continue when workflow generation fails', async () => {
			const generateWorkflow = jest
				.fn()
				.mockResolvedValueOnce(createMockWorkflow())
				.mockRejectedValueOnce(new Error('Generation failed'))
				.mockResolvedValueOnce(createMockWorkflow());

			const evaluator = createMockEvaluator('test');

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test 1' }, { prompt: 'Test 2' }, { prompt: 'Test 3' }],
				generateWorkflow,
				evaluators: [evaluator],
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			const summary = await runEvaluation(config);

			expect(summary.totalExamples).toBe(3);
			expect(summary.errors).toBe(1);
			expect(summary.passed + summary.failed).toBe(2);
		});

		it('should pass context from test case to evaluators', async () => {
			const evaluate: Evaluator['evaluate'] = async (_workflow, ctx) => {
				expect(ctx.dos).toBe('Use Slack');
				expect(ctx.donts).toBe('No HTTP');
				return [{ evaluator: 'contextual', metric: 'score', score: 1, kind: 'score' }];
			};

			const evaluator: Evaluator = {
				name: 'contextual',
				evaluate: jest.fn(evaluate),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [
					{
						prompt: 'Test',
						context: { dos: 'Use Slack', donts: 'No HTTP' },
					},
				],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator],
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			await runEvaluation(config);

			expect(evaluator.evaluate).toHaveBeenCalled();
		});

		it('should merge global context with test case context', async () => {
			const evaluate: Evaluator['evaluate'] = async (_workflow, ctx) => {
				expect(ctx.dos).toBe('Use Slack');
				expect(ctx.donts).toBe('No HTTP');
				return [{ evaluator: 'merged', metric: 'score', score: 1, kind: 'score' }];
			};

			const evaluator: Evaluator = {
				name: 'merged',
				evaluate: jest.fn(evaluate),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test', context: { donts: 'No HTTP' } }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator],
				context: { dos: 'Use Slack' },
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			await runEvaluation(config);

			expect(evaluator.evaluate).toHaveBeenCalled();
		});

		it('should calculate pass/fail status based on threshold', async () => {
			const highScoreEvaluator = createMockEvaluator('high', [
				{ evaluator: 'high', metric: 'score', score: 0.9, kind: 'score' },
			]);
			const lowScoreEvaluator = createMockEvaluator('low', [
				{ evaluator: 'low', metric: 'score', score: 0.3, kind: 'score' },
			]);

			// High score should pass (>= 0.7 threshold)
			const config1: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [highScoreEvaluator],
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			const summary1 = await runEvaluation(config1);
			expect(summary1.passed).toBe(1);

			// Low score should fail
			const config2: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [lowScoreEvaluator],
				logger: silentLogger,
			};

			const summary2 = await runEvaluation(config2);
			expect(summary2.failed).toBe(1);
		});

		it('should aggregate feedback from all evaluators', async () => {
			const evaluator1 = createMockEvaluator('e1', [
				{ evaluator: 'e1', metric: 'func', score: 0.8, kind: 'metric' },
				{ evaluator: 'e1', metric: 'conn', score: 0.9, kind: 'metric' },
			]);
			const evaluator2 = createMockEvaluator('e2', [
				{ evaluator: 'e2', metric: 'overall', score: 0.85, kind: 'score' },
			]);

			const collected: ExampleResult[] = [];
			const lifecycle: Partial<EvaluationLifecycle> = {
				onExampleComplete: (_index, result) => collected.push(result),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator1, evaluator2],
				lifecycle,
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			await runEvaluation(config);

			expect(collected).toHaveLength(1);
			expect(collected[0].feedback).toHaveLength(3); // 2 from e1 + 1 from e2
		});
	});

	describe('Lifecycle Hooks', () => {
		it('should call onStart at beginning of run', async () => {
			const lifecycle: Partial<EvaluationLifecycle> = {
				onStart: jest.fn(),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [],
				lifecycle,
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			await runEvaluation(config);

			expect(lifecycle.onStart).toHaveBeenCalledWith(config);
		});

		it('should call onExampleStart before each example', async () => {
			const lifecycle: Partial<EvaluationLifecycle> = {
				onExampleStart: jest.fn(),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test 1' }, { prompt: 'Test 2' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [],
				lifecycle,
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			await runEvaluation(config);

			expect(lifecycle.onExampleStart).toHaveBeenCalledTimes(2);
			expect(lifecycle.onExampleStart).toHaveBeenNthCalledWith(1, 1, 2, 'Test 1');
			expect(lifecycle.onExampleStart).toHaveBeenNthCalledWith(2, 2, 2, 'Test 2');
		});

		it('should call onWorkflowGenerated after generation', async () => {
			const workflow = createMockWorkflow('Generated');
			const lifecycle: Partial<EvaluationLifecycle> = {
				onWorkflowGenerated: jest.fn(),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(workflow),
				evaluators: [],
				lifecycle,
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			await runEvaluation(config);

			expect(lifecycle.onWorkflowGenerated).toHaveBeenCalledWith(
				workflow,
				expect.any(Number), // durationMs
			);
		});

		it('should call onEvaluatorComplete after each evaluator', async () => {
			const lifecycle: Partial<EvaluationLifecycle> = {
				onEvaluatorComplete: jest.fn(),
			};

			const feedback1: Feedback[] = [
				{ evaluator: 'eval1', metric: 'score', score: 0.8, kind: 'score' },
			];
			const feedback2: Feedback[] = [
				{ evaluator: 'eval2', metric: 'score', score: 0.9, kind: 'score' },
			];

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [
					createMockEvaluator('eval1', feedback1),
					createMockEvaluator('eval2', feedback2),
				],
				lifecycle,
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			await runEvaluation(config);

			expect(lifecycle.onEvaluatorComplete).toHaveBeenCalledTimes(2);
			expect(lifecycle.onEvaluatorComplete).toHaveBeenCalledWith('eval1', feedback1);
			expect(lifecycle.onEvaluatorComplete).toHaveBeenCalledWith('eval2', feedback2);
		});

		it('should call onEvaluatorError when evaluator fails', async () => {
			const error = new Error('Evaluator crashed');
			const lifecycle: Partial<EvaluationLifecycle> = {
				onEvaluatorError: jest.fn(),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [createFailingEvaluator('failing', error)],
				lifecycle,
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			await runEvaluation(config);

			expect(lifecycle.onEvaluatorError).toHaveBeenCalledWith('failing', error);
		});

		it('should call onExampleComplete after each example', async () => {
			const lifecycle: Partial<EvaluationLifecycle> = {
				onExampleComplete: jest.fn(),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [createMockEvaluator('test')],
				lifecycle,
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			await runEvaluation(config);

			expect(lifecycle.onExampleComplete).toHaveBeenCalledWith(
				1,
				expect.objectContaining({
					index: 1,
					prompt: 'Test',
					status: 'pass',
				}),
			);
		});

		it('should call onEnd with summary at end of run', async () => {
			const lifecycle: Partial<EvaluationLifecycle> = {
				onEnd: jest.fn(),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [createMockEvaluator('test')],
				lifecycle,
				logger: silentLogger,
			};

			const { runEvaluation } = await import('../harness/runner');
			const summary = await runEvaluation(config);

			expect(lifecycle.onEnd).toHaveBeenCalledWith(summary);
		});
	});
});
