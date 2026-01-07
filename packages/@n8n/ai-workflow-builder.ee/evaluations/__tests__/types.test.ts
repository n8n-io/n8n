import { mock } from 'jest-mock-extended';
import type { Client } from 'langsmith/client';

import type { SimpleWorkflow } from '@/types/workflow';

import type {
	Feedback,
	Evaluator,
	TestCase,
	RunConfig,
	ExampleResult,
	RunSummary,
	EvaluationLifecycle,
} from '../harness-types';
import { createLogger } from '../utils/logger';

const mockLangsmithClient = () => mock<Client>();

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(overrides?: Partial<SimpleWorkflow>): SimpleWorkflow {
	return {
		name: 'Test Workflow',
		nodes: [],
		connections: {},
		...overrides,
	};
}

/**
 * Type-level tests for core interfaces.
 * These verify the shape of our types at compile time.
 */
describe('Core Types', () => {
	describe('Feedback', () => {
		it('should accept minimal feedback with evaluator, metric and score', () => {
			const feedback: Feedback = {
				evaluator: 'llm-judge',
				metric: 'functionality',
				score: 0.85,
				kind: 'metric',
			};
			expect(feedback.evaluator).toBe('llm-judge');
			expect(feedback.metric).toBe('functionality');
			expect(feedback.score).toBe(0.85);
			expect(feedback.comment).toBeUndefined();
		});

		it('should accept feedback with optional comment', () => {
			const feedback: Feedback = {
				evaluator: 'llm-judge',
				metric: 'connections',
				score: 1.0,
				kind: 'metric',
				comment: 'All connections are valid',
			};
			expect(feedback.comment).toBe('All connections are valid');
		});

		it('should accept scores between 0 and 1', () => {
			const zeroScore: Feedback = { evaluator: 'test', metric: 'score', score: 0, kind: 'score' };
			const oneScore: Feedback = { evaluator: 'test', metric: 'score', score: 1, kind: 'score' };
			const midScore: Feedback = { evaluator: 'test', metric: 'score', score: 0.5, kind: 'score' };

			expect(zeroScore.score).toBe(0);
			expect(oneScore.score).toBe(1);
			expect(midScore.score).toBe(0.5);
		});
	});

	describe('Evaluator', () => {
		it('should define evaluator with name and evaluate function', () => {
			const evaluator: Evaluator = {
				name: 'test-evaluator',
				evaluate: async (_workflow: SimpleWorkflow) => [
					{ evaluator: 'test-evaluator', metric: 'test', score: 1, kind: 'score' },
				],
			};

			expect(evaluator.name).toBe('test-evaluator');
			expect(typeof evaluator.evaluate).toBe('function');
		});

		it('should support evaluator with context type', () => {
			interface PairwiseContext {
				dos: string;
				donts: string;
			}

			const evaluator: Evaluator<PairwiseContext> = {
				name: 'pairwise',
				evaluate: async (_workflow: SimpleWorkflow, ctx: PairwiseContext) => [
					{
						evaluator: 'pairwise',
						metric: 'pairwise_primary',
						score: ctx.dos ? 1 : 0,
						kind: 'score',
					},
				],
			};

			expect(evaluator.name).toBe('pairwise');
		});

		it('should return array of Feedback from evaluate', async () => {
			const evaluator: Evaluator = {
				name: 'multi-feedback',
				evaluate: async () => [
					{ evaluator: 'multi-feedback', metric: 'score1', score: 0.8, kind: 'score' },
					{
						evaluator: 'multi-feedback',
						metric: 'score2',
						score: 0.9,
						kind: 'score',
						comment: 'Good',
					},
				],
			};

			const result = await evaluator.evaluate(createMockWorkflow(), { prompt: 'Test prompt' });

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(2);
		});
	});

	describe('TestCase', () => {
		it('should accept minimal test case with just prompt', () => {
			const testCase: TestCase = {
				prompt: 'Create a workflow that sends an email',
			};
			expect(testCase.prompt).toBeDefined();
		});

		it('should accept test case with id', () => {
			const testCase: TestCase = {
				prompt: 'Create a webhook workflow',
				id: 'test-001',
			};
			expect(testCase.id).toBe('test-001');
		});

		it('should accept test case with context for evaluators', () => {
			const testCase: TestCase = {
				prompt: 'Create a Slack notification workflow',
				context: {
					dos: 'Use Slack node',
					donts: 'Do not use HTTP node for Slack',
				},
			};
			expect(testCase.context).toBeDefined();
		});

		it('should accept test case with reference workflow for similarity', () => {
			const testCase: TestCase = {
				prompt: 'Create a Slack workflow',
				referenceWorkflow: createMockWorkflow({ name: 'Reference Workflow' }),
			};
			expect(testCase.referenceWorkflow).toBeDefined();
		});
	});

	describe('RunConfig', () => {
		it('should accept local mode config with test cases array', () => {
			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test prompt' }],
				generateWorkflow: async () => createMockWorkflow(),
				evaluators: [],
				logger: createLogger(false),
			};
			expect(config.mode).toBe('local');
		});

		it('should accept langsmith mode config with dataset name', () => {
			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'my-dataset',
				generateWorkflow: async () => createMockWorkflow(),
				evaluators: [],
				langsmithClient: mockLangsmithClient(),
				langsmithOptions: {
					experimentName: 'test-experiment',
					repetitions: 1,
					concurrency: 4,
				},
				logger: createLogger(false),
			};
			expect(config.mode).toBe('langsmith');
			expect(config.langsmithOptions.experimentName).toBe('test-experiment');
		});

		it('should accept optional outputDir', () => {
			const config: RunConfig = {
				mode: 'local',
				dataset: [],
				generateWorkflow: async () => createMockWorkflow(),
				evaluators: [],
				outputDir: '/path/to/output',
				logger: createLogger(false),
			};
			expect(config.outputDir).toBe('/path/to/output');
		});

		it('should accept optional global context', () => {
			const config: RunConfig = {
				mode: 'local',
				dataset: [],
				generateWorkflow: async () => createMockWorkflow(),
				evaluators: [],
				context: { dos: 'Global do' },
				logger: createLogger(false),
			};
			expect(config.context).toBeDefined();
		});

		it('should accept optional lifecycle hooks', () => {
			const config: RunConfig = {
				mode: 'local',
				dataset: [],
				generateWorkflow: async () => createMockWorkflow(),
				evaluators: [],
				lifecycle: {
					onStart: () => {},
				},
				logger: createLogger(false),
			};
			expect(config.lifecycle?.onStart).toBeDefined();
		});
	});

	describe('ExampleResult', () => {
		it('should capture result for a single test case', () => {
			const result: ExampleResult = {
				index: 1,
				prompt: 'Test prompt',
				status: 'pass',
				score: 0.9,
				feedback: [{ evaluator: 'llm-judge', metric: 'overallScore', score: 0.9, kind: 'score' }],
				durationMs: 1500,
			};

			expect(result.status).toBe('pass');
			expect(result.feedback).toHaveLength(1);
		});

		it('should capture error status with error message', () => {
			const result: ExampleResult = {
				index: 2,
				prompt: 'Failing test',
				status: 'error',
				score: 0,
				feedback: [],
				durationMs: 500,
				error: 'Generation failed',
			};

			expect(result.status).toBe('error');
			expect(result.error).toBe('Generation failed');
		});

		it('should include workflow when available', () => {
			const result: ExampleResult = {
				index: 1,
				prompt: 'Test',
				status: 'pass',
				score: 1,
				feedback: [],
				durationMs: 1000,
				workflow: createMockWorkflow(),
			};

			expect(result.workflow).toBeDefined();
		});
	});

	describe('RunSummary', () => {
		it('should summarize evaluation run', () => {
			const summary: RunSummary = {
				totalExamples: 10,
				passed: 8,
				failed: 1,
				errors: 1,
				averageScore: 0.85,
				totalDurationMs: 30000,
			};

			expect(summary.totalExamples).toBe(10);
			expect(summary.passed + summary.failed + summary.errors).toBe(10);
		});

		it('should include per-evaluator averages', () => {
			const summary: RunSummary = {
				totalExamples: 5,
				passed: 5,
				failed: 0,
				errors: 0,
				averageScore: 0.9,
				totalDurationMs: 10000,
				evaluatorAverages: {
					functionality: 0.95,
					connections: 0.85,
					programmatic: 1.0,
				},
			};

			expect(summary.evaluatorAverages?.functionality).toBe(0.95);
		});
	});

	describe('EvaluationLifecycle', () => {
		it('should define all lifecycle hooks', () => {
			const lifecycle: EvaluationLifecycle = {
				onStart: () => {},
				onExampleStart: () => {},
				onWorkflowGenerated: () => {},
				onEvaluatorComplete: () => {},
				onEvaluatorError: () => {},
				onExampleComplete: () => {},
				onEnd: () => {},
			};

			expect(typeof lifecycle.onStart).toBe('function');
			expect(typeof lifecycle.onExampleStart).toBe('function');
			expect(typeof lifecycle.onWorkflowGenerated).toBe('function');
			expect(typeof lifecycle.onEvaluatorComplete).toBe('function');
			expect(typeof lifecycle.onEvaluatorError).toBe('function');
			expect(typeof lifecycle.onExampleComplete).toBe('function');
			expect(typeof lifecycle.onEnd).toBe('function');
		});
	});
});
