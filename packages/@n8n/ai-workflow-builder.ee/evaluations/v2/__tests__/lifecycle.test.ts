/**
 * Tests for default console lifecycle implementation.
 */

import type { SimpleWorkflow } from '@/types/workflow';

import type { EvaluationLifecycle, RunConfig, ExampleResult, RunSummary } from '../types';

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

		it('should log experiment info on start', async () => {
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
				feedback: [{ key: 'test', score: 0.9 }],
				durationMs: 2000,
			};

			const failResult: ExampleResult = {
				index: 2,
				prompt: 'Test',
				status: 'fail',
				feedback: [{ key: 'test', score: 0.3 }],
				durationMs: 1500,
			};

			lifecycle.onExampleComplete(1, passResult);
			lifecycle.onExampleComplete(2, failResult);

			const allOutput = mockConsole.log.mock.calls.flat().join(' ');
			expect(allOutput).toContain('PASS');
			expect(allOutput).toContain('FAIL');
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
	});
});
