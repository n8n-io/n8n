/**
 * Tests for default console lifecycle implementation.
 */

import type { SimpleWorkflow } from '@/types/workflow';

import type { EvaluationLifecycle, RunConfig, ExampleResult, RunSummary } from '../harness-types';

// Mock console methods
const mockConsole = {
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

// Store original console
const originalConsole = { ...console };

beforeEach(() => {
	jest.clearAllMocks();
	console.log = mockConsole.log;
	console.warn = mockConsole.warn;
	console.error = mockConsole.error;
});

afterEach(() => {
	console.log = originalConsole.log;
	console.warn = originalConsole.warn;
	console.error = originalConsole.error;
});

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

describe('Console Lifecycle', () => {
	describe('createConsoleLifecycle()', () => {
		it('should create a lifecycle with all hooks', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: false });

			expect(lifecycle.onStart).toBeDefined();
			expect(lifecycle.onExampleStart).toBeDefined();
			expect(lifecycle.onWorkflowGenerated).toBeDefined();
			expect(lifecycle.onEvaluatorComplete).toBeDefined();
			expect(lifecycle.onEvaluatorError).toBeDefined();
			expect(lifecycle.onExampleComplete).toBeDefined();
			expect(lifecycle.onEnd).toBeDefined();
		});

		it('should log experiment info on start with test cases array', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: false });

			const config: RunConfig = {
				mode: 'local',
				dataset: [{ prompt: 'Test' }],
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [],
			};

			lifecycle.onStart(config);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('local');
			expect(logOutput).toContain('Test cases');
		});

		it('should log dataset name for langsmith mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: false });

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'my-dataset-name',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [{ name: 'test-eval', evaluate: jest.fn() }],
			};

			lifecycle.onStart(config);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('langsmith');
			expect(logOutput).toContain('my-dataset-name');
		});

		it('should log example progress in verbose mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			lifecycle.onExampleStart(1, 10, 'Test prompt that is quite long and should be truncated');

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('[1/10]');
		});

		it('should not log example progress in non-verbose mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: false });

			lifecycle.onExampleStart(1, 10, 'Test prompt');

			// Should not log in non-verbose mode
			expect(mockConsole.log).not.toHaveBeenCalled();
		});

		it('should log workflow generation in verbose mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			const workflow = createMockWorkflow('My Workflow');
			lifecycle.onWorkflowGenerated(workflow, 1500);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('1.5');
		});

		it('should log evaluator completion in verbose mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			lifecycle.onEvaluatorComplete('llm-judge', [
				{ key: 'func', score: 0.8 },
				{ key: 'conn', score: 0.9 },
			]);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('llm-judge');
		});

		it('should not log evaluator completion in non-verbose mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: false });

			lifecycle.onEvaluatorComplete('llm-judge', [{ key: 'func', score: 0.8 }]);

			expect(mockConsole.log).not.toHaveBeenCalled();
		});

		it('should display critical metrics in verbose mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			lifecycle.onEvaluatorComplete('llm-judge', [
				{ key: 'llm-judge.functionality', score: 0.95 },
				{ key: 'llm-judge.connections', score: 0.8 },
				{ key: 'llm-judge.overallScore', score: 0.85 },
				{ key: 'other.metric', score: 0.5 },
			]);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('functionality');
			expect(logOutput).toContain('connections');
			expect(logOutput).toContain('overallScore');
		});

		it('should display violations in verbose mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			lifecycle.onEvaluatorComplete('llm-judge', [
				{ key: 'llm-judge.functionality', score: 0.5, comment: 'Missing trigger node' },
				{ key: 'llm-judge.connections', score: 0.3, comment: 'Disconnected node found' },
			]);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('Violations');
			expect(logOutput).toContain('Missing trigger node');
			expect(logOutput).toContain('Disconnected node found');
		});

		it('should limit violations display to 5 and show count', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			lifecycle.onEvaluatorComplete('llm-judge', [
				{ key: 'v1', score: 0.5, comment: 'Violation 1' },
				{ key: 'v2', score: 0.5, comment: 'Violation 2' },
				{ key: 'v3', score: 0.5, comment: 'Violation 3' },
				{ key: 'v4', score: 0.5, comment: 'Violation 4' },
				{ key: 'v5', score: 0.5, comment: 'Violation 5' },
				{ key: 'v6', score: 0.5, comment: 'Violation 6' },
				{ key: 'v7', score: 0.5, comment: 'Violation 7' },
			]);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('and 2 more');
		});

		it('should not display violations for error feedback', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			lifecycle.onEvaluatorComplete('llm-judge', [
				{ key: 'llm-judge.error', score: 0, comment: 'Evaluator crashed' },
			]);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).not.toContain('Violations');
		});

		it('should handle empty feedback array', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			lifecycle.onEvaluatorComplete('llm-judge', []);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('llm-judge');
			expect(logOutput).toContain('0%');
		});

		it('should log evaluator errors', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: false });

			lifecycle.onEvaluatorError('test-evaluator', new Error('Something went wrong'));

			expect(mockConsole.error).toHaveBeenCalled();
			const errorOutput = mockConsole.error.mock.calls.flat().join(' ');
			expect(errorOutput).toContain('test-evaluator');
			expect(errorOutput).toContain('Something went wrong');
		});

		it('should log example completion with pass/fail status', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			const passResult: ExampleResult = {
				index: 1,
				prompt: 'Test',
				status: 'pass',
				score: 0.9,
				feedback: [{ key: 'test', score: 0.9 }],
				durationMs: 2000,
			};

			const failResult: ExampleResult = {
				index: 2,
				prompt: 'Test',
				status: 'fail',
				score: 0.3,
				feedback: [{ key: 'test', score: 0.3 }],
				durationMs: 1500,
			};

			lifecycle.onExampleComplete(1, passResult);
			lifecycle.onExampleComplete(2, failResult);

			const allOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(allOutput).toContain('PASS');
			expect(allOutput).toContain('FAIL');
		});

		it('should log example completion with error status', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			const errorResult: ExampleResult = {
				index: 1,
				prompt: 'Test',
				status: 'error',
				score: 0,
				feedback: [],
				durationMs: 500,
				error: 'Generation failed',
			};

			lifecycle.onExampleComplete(1, errorResult);

			const allOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(allOutput).toContain('ERROR');
		});

		it('should not log example completion in non-verbose mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: false });

			const result: ExampleResult = {
				index: 1,
				prompt: 'Test',
				status: 'pass',
				score: 0.9,
				feedback: [{ key: 'test', score: 0.9 }],
				durationMs: 2000,
			};

			lifecycle.onExampleComplete(1, result);

			expect(mockConsole.log).not.toHaveBeenCalled();
		});

		it('should not log workflow generation in non-verbose mode', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: false });

			const workflow = createMockWorkflow('My Workflow');
			lifecycle.onWorkflowGenerated(workflow, 1500);

			expect(mockConsole.log).not.toHaveBeenCalled();
		});

		it('should use different colors for different score ranges', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: true });

			// High score (>= 0.9) - green
			lifecycle.onEvaluatorComplete('high', [{ key: 'test', score: 0.95 }]);

			// Medium score (>= 0.7, < 0.9) - yellow
			lifecycle.onEvaluatorComplete('medium', [{ key: 'test', score: 0.75 }]);

			// Low score (< 0.7) - red
			lifecycle.onEvaluatorComplete('low', [{ key: 'test', score: 0.5 }]);

			expect(mockConsole.log).toHaveBeenCalled();
			// The coloring is applied, tests verify that the function runs without error
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('high');
			expect(logOutput).toContain('medium');
			expect(logOutput).toContain('low');
		});

		it('should log summary with statistics on end', async () => {
			const { createConsoleLifecycle } = await import('../lifecycle');
			const lifecycle = createConsoleLifecycle({ verbose: false });

			const summary: RunSummary = {
				totalExamples: 10,
				passed: 7,
				failed: 2,
				errors: 1,
				averageScore: 0.85,
				totalDurationMs: 30000,
			};

			lifecycle.onEnd(summary);

			expect(mockConsole.log).toHaveBeenCalled();
			const logOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(logOutput).toContain('10');
			expect(logOutput).toContain('7');
			expect(logOutput).toContain('85%');
		});
	});

	describe('createQuietLifecycle()', () => {
		it('should create lifecycle with empty hooks', async () => {
			const { createQuietLifecycle } = await import('../lifecycle');
			const lifecycle = createQuietLifecycle();

			// Should have all hooks
			expect(lifecycle.onStart).toBeDefined();
			expect(lifecycle.onEnd).toBeDefined();

			// Hooks should be no-ops
			const config: RunConfig = {
				mode: 'local',
				dataset: [],
				generateWorkflow: jest.fn(),
				evaluators: [],
			};

			lifecycle.onStart(config);
			lifecycle.onExampleStart(1, 1, 'Test');
			lifecycle.onEnd({
				totalExamples: 1,
				passed: 1,
				failed: 0,
				errors: 0,
				averageScore: 1,
				totalDurationMs: 1000,
			});

			// Should not log anything
			expect(mockConsole.log).not.toHaveBeenCalled();
		});
	});

	describe('mergeLifecycles()', () => {
		it('should merge multiple lifecycles into one', async () => {
			const { mergeLifecycles } = await import('../lifecycle');

			const hook1 = jest.fn();
			const hook2 = jest.fn();

			const lifecycle1: Partial<EvaluationLifecycle> = {
				onStart: hook1,
			};

			const lifecycle2: Partial<EvaluationLifecycle> = {
				onStart: hook2,
			};

			const merged = mergeLifecycles(lifecycle1, lifecycle2);

			const config: RunConfig = {
				mode: 'local',
				dataset: [],
				generateWorkflow: jest.fn(),
				evaluators: [],
			};

			merged.onStart(config);

			expect(hook1).toHaveBeenCalledWith(config);
			expect(hook2).toHaveBeenCalledWith(config);
		});

		it('should handle undefined hooks gracefully', async () => {
			const { mergeLifecycles } = await import('../lifecycle');

			const hook = jest.fn();

			const lifecycle1: Partial<EvaluationLifecycle> = {
				onStart: hook,
			};

			const lifecycle2: Partial<EvaluationLifecycle> = {
				// No onStart
			};

			const merged = mergeLifecycles(lifecycle1, lifecycle2);

			const config: RunConfig = {
				mode: 'local',
				dataset: [],
				generateWorkflow: jest.fn(),
				evaluators: [],
			};

			merged.onStart(config);

			expect(hook).toHaveBeenCalledWith(config);
		});

		it('should handle undefined lifecycles in array', async () => {
			const { mergeLifecycles } = await import('../lifecycle');

			const hook = jest.fn();

			const lifecycle1: Partial<EvaluationLifecycle> = {
				onStart: hook,
			};

			const merged = mergeLifecycles(lifecycle1, undefined, undefined);

			const config: RunConfig = {
				mode: 'local',
				dataset: [],
				generateWorkflow: jest.fn(),
				evaluators: [],
			};

			merged.onStart(config);

			expect(hook).toHaveBeenCalledWith(config);
		});

		it('should merge onExampleStart hooks', async () => {
			const { mergeLifecycles } = await import('../lifecycle');

			const hook1 = jest.fn();
			const hook2 = jest.fn();

			const lifecycle1: Partial<EvaluationLifecycle> = { onExampleStart: hook1 };
			const lifecycle2: Partial<EvaluationLifecycle> = { onExampleStart: hook2 };

			const merged = mergeLifecycles(lifecycle1, lifecycle2);
			merged.onExampleStart(1, 10, 'Test prompt');

			expect(hook1).toHaveBeenCalledWith(1, 10, 'Test prompt');
			expect(hook2).toHaveBeenCalledWith(1, 10, 'Test prompt');
		});

		it('should merge onWorkflowGenerated hooks', async () => {
			const { mergeLifecycles } = await import('../lifecycle');

			const hook1 = jest.fn();
			const hook2 = jest.fn();

			const lifecycle1: Partial<EvaluationLifecycle> = { onWorkflowGenerated: hook1 };
			const lifecycle2: Partial<EvaluationLifecycle> = { onWorkflowGenerated: hook2 };

			const merged = mergeLifecycles(lifecycle1, lifecycle2);
			const workflow = createMockWorkflow();
			merged.onWorkflowGenerated(workflow, 1000);

			expect(hook1).toHaveBeenCalledWith(workflow, 1000);
			expect(hook2).toHaveBeenCalledWith(workflow, 1000);
		});

		it('should merge onEvaluatorComplete hooks', async () => {
			const { mergeLifecycles } = await import('../lifecycle');

			const hook1 = jest.fn();
			const hook2 = jest.fn();

			const lifecycle1: Partial<EvaluationLifecycle> = { onEvaluatorComplete: hook1 };
			const lifecycle2: Partial<EvaluationLifecycle> = { onEvaluatorComplete: hook2 };

			const merged = mergeLifecycles(lifecycle1, lifecycle2);
			const feedback = [{ key: 'test', score: 0.9 }];
			merged.onEvaluatorComplete('test-eval', feedback);

			expect(hook1).toHaveBeenCalledWith('test-eval', feedback);
			expect(hook2).toHaveBeenCalledWith('test-eval', feedback);
		});

		it('should merge onEvaluatorError hooks', async () => {
			const { mergeLifecycles } = await import('../lifecycle');

			const hook1 = jest.fn();
			const hook2 = jest.fn();

			const lifecycle1: Partial<EvaluationLifecycle> = { onEvaluatorError: hook1 };
			const lifecycle2: Partial<EvaluationLifecycle> = { onEvaluatorError: hook2 };

			const merged = mergeLifecycles(lifecycle1, lifecycle2);
			const error = new Error('Test error');
			merged.onEvaluatorError('test-eval', error);

			expect(hook1).toHaveBeenCalledWith('test-eval', error);
			expect(hook2).toHaveBeenCalledWith('test-eval', error);
		});

		it('should merge onExampleComplete hooks', async () => {
			const { mergeLifecycles } = await import('../lifecycle');

			const hook1 = jest.fn();
			const hook2 = jest.fn();

			const lifecycle1: Partial<EvaluationLifecycle> = { onExampleComplete: hook1 };
			const lifecycle2: Partial<EvaluationLifecycle> = { onExampleComplete: hook2 };

			const merged = mergeLifecycles(lifecycle1, lifecycle2);
			const result: ExampleResult = {
				index: 1,
				prompt: 'Test',
				status: 'pass',
				score: 1,
				feedback: [],
				durationMs: 1000,
			};
			merged.onExampleComplete(1, result);

			expect(hook1).toHaveBeenCalledWith(1, result);
			expect(hook2).toHaveBeenCalledWith(1, result);
		});

		it('should merge onEnd hooks', async () => {
			const { mergeLifecycles } = await import('../lifecycle');

			const hook1 = jest.fn();
			const hook2 = jest.fn();

			const lifecycle1: Partial<EvaluationLifecycle> = { onEnd: hook1 };
			const lifecycle2: Partial<EvaluationLifecycle> = { onEnd: hook2 };

			const merged = mergeLifecycles(lifecycle1, lifecycle2);
			const summary: RunSummary = {
				totalExamples: 10,
				passed: 8,
				failed: 1,
				errors: 1,
				averageScore: 0.85,
				totalDurationMs: 5000,
			};
			merged.onEnd(summary);

			expect(hook1).toHaveBeenCalledWith(summary);
			expect(hook2).toHaveBeenCalledWith(summary);
		});
	});
});
