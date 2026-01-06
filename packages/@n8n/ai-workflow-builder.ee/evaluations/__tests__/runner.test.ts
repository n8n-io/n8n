import type { SimpleWorkflow } from '@/types/workflow';

import type {
	Evaluator,
	TestCase,
	Feedback,
	RunConfig,
	EvaluationLifecycle,
	EvaluationContext,
} from '../harness-types';

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
			};

			// Import dynamically to avoid circular deps in test setup
			const { runEvaluation } = await import('../runner');
			const summary = await runEvaluation(config);

			expect(generateWorkflow).toHaveBeenCalledTimes(3);
			expect(evaluator.evaluate).toHaveBeenCalledTimes(3);
			expect(summary.totalExamples).toBe(3);
		});

		it('should run all evaluators in parallel for each example', async () => {
			const evaluator1 = createMockEvaluator('eval1', [{ key: 'e1', score: 0.8 }]);
			const evaluator2 = createMockEvaluator('eval2', [{ key: 'e2', score: 0.9 }]);
			const evaluator3 = createMockEvaluator('eval3', [{ key: 'e3', score: 1.0 }]);

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator1, evaluator2, evaluator3],
			};

			const { runEvaluation } = await import('../runner');
			const summary = await runEvaluation(config);

			// All evaluators should be called
			expect(evaluator1.evaluate).toHaveBeenCalledTimes(1);
			expect(evaluator2.evaluate).toHaveBeenCalledTimes(1);
			expect(evaluator3.evaluate).toHaveBeenCalledTimes(1);

			// Average score should be (0.8 + 0.9 + 1.0) / 3 = 0.9
			expect(summary.averageScore).toBeCloseTo(0.9, 2);
		});

		it('should skip and continue when evaluator throws error', async () => {
			const goodEvaluator = createMockEvaluator('good', [{ key: 'good', score: 1.0 }]);
			const badEvaluator = createFailingEvaluator('bad', new Error('Evaluator crashed'));

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [goodEvaluator, badEvaluator],
			};

			const { runEvaluation } = await import('../runner');
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
			};

			const { runEvaluation } = await import('../runner');
			const summary = await runEvaluation(config);

			expect(summary.totalExamples).toBe(3);
			expect(summary.errors).toBe(1);
			expect(summary.passed + summary.failed).toBe(2);
		});

		it('should pass context from test case to evaluators', async () => {
			const evaluator: Evaluator = {
				name: 'contextual',
				evaluate: jest
					.fn()
					.mockImplementation((_workflow: SimpleWorkflow, ctx: EvaluationContext) => {
						expect(ctx.dos).toBe('Use Slack');
						expect(ctx.donts).toBe('No HTTP');
						return [{ key: 'contextual.score', score: 1 }];
					}),
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
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			expect(evaluator.evaluate).toHaveBeenCalled();
		});

		it('should merge global context with test case context', async () => {
			const evaluator: Evaluator = {
				name: 'merged',
				evaluate: jest
					.fn()
					.mockImplementation((_workflow: SimpleWorkflow, ctx: EvaluationContext) => {
						expect(ctx.dos).toBe('Use Slack');
						expect(ctx.donts).toBe('No HTTP');
						return [{ key: 'merged.score', score: 1 }];
					}),
			};

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test', context: { donts: 'No HTTP' } }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator],
				context: { dos: 'Use Slack' },
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			expect(evaluator.evaluate).toHaveBeenCalled();
		});

		it('should calculate pass/fail status based on threshold', async () => {
			const highScoreEvaluator = createMockEvaluator('high', [{ key: 'high', score: 0.9 }]);
			const lowScoreEvaluator = createMockEvaluator('low', [{ key: 'low', score: 0.3 }]);

			// High score should pass (>= 0.7 threshold)
			const config1: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [highScoreEvaluator],
			};

			const { runEvaluation } = await import('../runner');
			const summary1 = await runEvaluation(config1);
			expect(summary1.passed).toBe(1);

			// Low score should fail
			const config2: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [lowScoreEvaluator],
			};

			const summary2 = await runEvaluation(config2);
			expect(summary2.failed).toBe(1);
		});

		it('should aggregate feedback from all evaluators', async () => {
			const evaluator1 = createMockEvaluator('e1', [
				{ key: 'func', score: 0.8 },
				{ key: 'conn', score: 0.9 },
			]);
			const evaluator2 = createMockEvaluator('e2', [{ key: 'overall', score: 0.85 }]);

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator1, evaluator2],
			};

			const { runEvaluation, getLastResults } = await import('../runner');
			await runEvaluation(config);

			const results = getLastResults();
			expect(results).toHaveLength(1);
			expect(results[0].feedback).toHaveLength(3); // 2 from e1 + 1 from e2
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
			};

			const { runEvaluation } = await import('../runner');
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
			};

			const { runEvaluation } = await import('../runner');
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
			};

			const { runEvaluation } = await import('../runner');
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

			const feedback1: Feedback[] = [{ key: 'e1', score: 0.8 }];
			const feedback2: Feedback[] = [{ key: 'e2', score: 0.9 }];

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [
					createMockEvaluator('eval1', feedback1),
					createMockEvaluator('eval2', feedback2),
				],
				lifecycle,
			};

			const { runEvaluation } = await import('../runner');
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
			};

			const { runEvaluation } = await import('../runner');
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
			};

			const { runEvaluation } = await import('../runner');
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
			};

			const { runEvaluation } = await import('../runner');
			const summary = await runEvaluation(config);

			expect(lifecycle.onEnd).toHaveBeenCalledWith(summary);
		});
	});
});
