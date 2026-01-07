/**
 * Tests for LangSmith mode runner.
 *
 * These tests mock the LangSmith evaluate() function to verify:
 * - Target function does all work (generation + evaluation)
 * - Evaluator just extracts pre-computed feedback
 * - Dataset context extraction is respected
 * - Filters trigger dataset example preloading
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import type { Client } from 'langsmith/client';
import { evaluate as langsmithEvaluate } from 'langsmith/evaluation';
import type { Dataset, Example } from 'langsmith/schemas';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

import { setupTestEnvironment, type TestEnvironment } from '../core/environment';
import type { TraceFilters } from '../core/trace-filters';
import type { Evaluator, Feedback, RunConfig } from '../harness-types';

jest.mock('langsmith/evaluation', () => ({
	evaluate: jest.fn(),
}));

jest.mock('langsmith/traceable', () => ({
	traceable: jest.fn(
		<T extends (...args: unknown[]) => unknown>(fn: T, _options: unknown): T => fn,
	),
}));

// Mock core/environment module (dynamically imported in runner.ts)
jest.mock('../core/environment', () => ({
	setupTestEnvironment: jest.fn(),
}));

function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

function createMockEvaluator(
	name: string,
	feedback: Feedback[] = [{ evaluator: name, metric: 'score', score: 1 }],
): Evaluator {
	return {
		name,
		evaluate: jest.fn().mockResolvedValue(feedback),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCallable(value: unknown): value is (...args: unknown[]) => unknown {
	return typeof value === 'function';
}

type LangsmithTargetOutput = {
	workflow: SimpleWorkflow;
	prompt: string;
	feedback: Feedback[];
};

function isSimpleWorkflow(value: unknown): value is SimpleWorkflow {
	return isRecord(value) && Array.isArray(value.nodes) && isRecord(value.connections);
}

function isFeedback(value: unknown): value is Feedback {
	return (
		isRecord(value) &&
		typeof value.evaluator === 'string' &&
		typeof value.metric === 'string' &&
		typeof value.score === 'number'
	);
}

function isLangsmithTargetOutput(value: unknown): value is LangsmithTargetOutput {
	return (
		isRecord(value) &&
		isSimpleWorkflow(value.workflow) &&
		typeof value.prompt === 'string' &&
		Array.isArray(value.feedback) &&
		value.feedback.every(isFeedback)
	);
}

async function callLangsmithTarget(target: unknown, inputs: unknown): Promise<unknown> {
	if (isCallable(target)) return await target(inputs);
	if (isRecord(target) && isCallable(target.invoke)) return await target.invoke(inputs);
	throw new Error('Expected LangSmith target to be callable');
}

function createMockTraceFilters(): TraceFilters {
	return {
		filterInputs: (inputs) => inputs,
		filterOutputs: (outputs) => outputs,
		resetStats: jest.fn(),
		logStats: jest.fn(),
	};
}

function createMockLangsmithClient() {
	const lsClient = mock<Client>();
	lsClient.readDataset.mockResolvedValue(mock<Dataset>({ id: 'test-dataset-id' }));
	lsClient.listExamples.mockReturnValue((async function* () {})());
	lsClient.awaitPendingTraceBatches.mockResolvedValue(undefined);
	return lsClient;
}

function createMockEnvironment(overrides: Partial<TestEnvironment> = {}): TestEnvironment {
	const parsedNodeTypes: INodeTypeDescription[] = [];
	const llm = mock<BaseChatModel>();
	const lsClient = createMockLangsmithClient();
	const traceFilters = createMockTraceFilters();

	return {
		parsedNodeTypes,
		llm,
		lsClient,
		traceFilters,
		...overrides,
	};
}

describe('Runner - LangSmith Mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(setupTestEnvironment).mockResolvedValue(createMockEnvironment());
	});

	describe('runEvaluation() with LangSmith', () => {
		it('should call langsmith evaluate() with correct options', async () => {
			const mockEvaluate = jest.mocked(langsmithEvaluate);

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

			expect(mockEvaluate).toHaveBeenCalledTimes(1);
			const [_target, options] = mockEvaluate.mock.calls[0];
			expect(options).toEqual(
				expect.objectContaining({
					data: 'my-dataset',
					experimentPrefix: 'test-experiment',
					numRepetitions: 2,
					maxConcurrency: 4,
				}),
			);
		});

		it('should create target function that generates workflow and runs evaluators', async () => {
			const mockEvaluate = jest.mocked(langsmithEvaluate);

			const workflow = createMockWorkflow('Generated');
			const generateWorkflow = jest.fn().mockResolvedValue(workflow);
			const evaluator = createMockEvaluator('test', [
				{ evaluator: 'test', metric: 'score', score: 0.9 },
			]);

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

			expect(mockEvaluate).toHaveBeenCalledTimes(1);
			const [target] = mockEvaluate.mock.calls[0];

			const result = await callLangsmithTarget(target, { prompt: 'Create a workflow' });
			expect(isLangsmithTargetOutput(result)).toBe(true);
			if (!isLangsmithTargetOutput(result)) throw new Error('Expected LangSmith target output');

			expect(generateWorkflow).toHaveBeenCalledWith('Create a workflow');
			expect(evaluator.evaluate).toHaveBeenCalledWith(
				workflow,
				expect.objectContaining({ prompt: 'Create a workflow' }),
			);
			expect(result).toEqual({
				workflow,
				prompt: 'Create a workflow',
				feedback: [{ evaluator: 'test', metric: 'score', score: 0.9 }],
			});
		});

		it('should aggregate feedback from multiple evaluators in target', async () => {
			const mockEvaluate = jest.mocked(langsmithEvaluate);

			const evaluator1 = createMockEvaluator('e1', [
				{ evaluator: 'e1', metric: 'score', score: 0.8 },
			]);
			const evaluator2 = createMockEvaluator('e2', [
				{ evaluator: 'e2', metric: 'a', score: 0.9 },
				{ evaluator: 'e2', metric: 'b', score: 1.0 },
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

			expect(mockEvaluate).toHaveBeenCalledTimes(1);
			const [target] = mockEvaluate.mock.calls[0];
			const result = await callLangsmithTarget(target, { prompt: 'Test' });
			expect(isLangsmithTargetOutput(result)).toBe(true);
			if (!isLangsmithTargetOutput(result)) throw new Error('Expected LangSmith target output');

			expect(result.feedback).toHaveLength(3);
			expect(result.feedback).toContainEqual({ evaluator: 'e1', metric: 'score', score: 0.8 });
			expect(result.feedback).toContainEqual({ evaluator: 'e2', metric: 'a', score: 0.9 });
			expect(result.feedback).toContainEqual({ evaluator: 'e2', metric: 'b', score: 1.0 });
		});

		it('should handle evaluator errors gracefully in target', async () => {
			const mockEvaluate = jest.mocked(langsmithEvaluate);

			const goodEvaluator = createMockEvaluator('good', [
				{ evaluator: 'good', metric: 'score', score: 1 },
			]);
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

			expect(mockEvaluate).toHaveBeenCalledTimes(1);
			const [target] = mockEvaluate.mock.calls[0];

			const result = await callLangsmithTarget(target, { prompt: 'Test' });
			expect(isLangsmithTargetOutput(result)).toBe(true);
			if (!isLangsmithTargetOutput(result)) throw new Error('Expected LangSmith target output');

			expect(result.feedback).toContainEqual({ evaluator: 'good', metric: 'score', score: 1 });
			expect(result.feedback).toContainEqual({
				evaluator: 'bad',
				metric: 'error',
				score: 0,
				kind: 'score',
				comment: 'Evaluator crashed',
			});
		});

		it('should create evaluator that extracts pre-computed feedback', async () => {
			const mockEvaluate = jest.mocked(langsmithEvaluate);

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

			expect(mockEvaluate).toHaveBeenCalledTimes(1);
			const [_target, options] = mockEvaluate.mock.calls[0];

			expect(Array.isArray(options.evaluators)).toBe(true);
			if (!Array.isArray(options.evaluators))
				throw new Error('Expected LangSmith evaluators array');
			expect(options.evaluators).toHaveLength(1);

			const evaluatorFn = options.evaluators[0];
			expect(isCallable(evaluatorFn)).toBe(true);
			if (!isCallable(evaluatorFn)) throw new Error('Expected evaluator function');

			const extracted = await evaluatorFn({
				outputs: {
					feedback: [
						{ evaluator: 'test', metric: 'score', score: 0.9 },
						{ evaluator: 'other', metric: 'trigger', score: 0.8 },
					],
				},
			});

			expect(extracted).toEqual([
				{ key: 'score', score: 0.9 },
				{ key: 'trigger', score: 0.8 },
			]);
		});

		it('should keep programmatic prefixes but not llm-judge root metric prefixes', async () => {
			const mockEvaluate = jest.mocked(langsmithEvaluate);

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

			expect(mockEvaluate).toHaveBeenCalledTimes(1);
			const [_target, options] = mockEvaluate.mock.calls[0];
			expect(Array.isArray(options.evaluators)).toBe(true);
			if (!Array.isArray(options.evaluators))
				throw new Error('Expected LangSmith evaluators array');

			const evaluatorFn = options.evaluators[0];
			expect(isCallable(evaluatorFn)).toBe(true);
			if (!isCallable(evaluatorFn)) throw new Error('Expected evaluator function');

			const extracted = await evaluatorFn({
				outputs: {
					feedback: [
						{ evaluator: 'llm-judge', metric: 'functionality', score: 0.9 },
						{ evaluator: 'programmatic', metric: 'trigger', score: 0.8 },
						{ evaluator: 'llm-judge', metric: 'maintainability.nodeNamingQuality', score: 0.7 },
					],
				},
			});

			expect(extracted).toEqual([
				{ key: 'functionality', score: 0.9 },
				{ key: 'programmatic.trigger', score: 0.8 },
				{ key: 'llm-judge.maintainability.nodeNamingQuality', score: 0.7 },
			]);
		});

		it('should handle missing feedback in outputs', async () => {
			const mockEvaluate = jest.mocked(langsmithEvaluate);

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

			expect(mockEvaluate).toHaveBeenCalledTimes(1);
			const [_target, options] = mockEvaluate.mock.calls[0];

			expect(Array.isArray(options.evaluators)).toBe(true);
			if (!Array.isArray(options.evaluators))
				throw new Error('Expected LangSmith evaluators array');
			const evaluatorFn = options.evaluators[0];
			expect(isCallable(evaluatorFn)).toBe(true);
			if (!isCallable(evaluatorFn)) throw new Error('Expected evaluator function');

			const extracted = await evaluatorFn({ outputs: {} });
			expect(extracted).toEqual([
				{
					key: 'evaluationError',
					score: 0,
					comment: 'No feedback found in target output',
				},
			]);
		});

		it('should pass dataset-level context to evaluators', async () => {
			const mockEvaluate = jest.mocked(langsmithEvaluate);

			const evaluateContextual: Evaluator['evaluate'] = async (_workflow, ctx) => [
				{ evaluator: 'contextual', metric: 'score', score: ctx.dos ? 1 : 0 },
			];

			const evaluator: Evaluator = {
				name: 'contextual',
				evaluate: jest.fn(evaluateContextual),
			};

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'test-dataset',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [evaluator],
				langsmithOptions: {
					experimentName: 'test',
					repetitions: 1,
					concurrency: 1,
				},
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			expect(mockEvaluate).toHaveBeenCalledTimes(1);
			const [target] = mockEvaluate.mock.calls[0];

			const result = await callLangsmithTarget(target, {
				prompt: 'Test',
				evals: { dos: 'Use Slack', donts: 'No HTTP' },
			});
			expect(isLangsmithTargetOutput(result)).toBe(true);
			if (!isLangsmithTargetOutput(result)) throw new Error('Expected LangSmith target output');

			expect(evaluator.evaluate).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ dos: 'Use Slack', donts: 'No HTTP' }),
			);
			expect(result.feedback).toContainEqual({
				evaluator: 'contextual',
				metric: 'score',
				score: 1,
			});
		});

		it('should pre-load and filter examples when filters are provided', async () => {
			const mockEvaluate = jest.mocked(langsmithEvaluate);
			const mockSetup = jest.mocked(setupTestEnvironment);

			const examples: Example[] = [
				mock<Example>({
					id: 'e1',
					inputs: { prompt: 'One', evals: { dos: 'Use Slack', donts: 'No HTTP' } },
					metadata: { notion_id: 'n1', categories: ['data_transformation'] },
				}),
				mock<Example>({
					id: 'e2',
					inputs: { prompt: 'Two', evals: { dos: 'Use Gmail', donts: 'No Slack' } },
					metadata: { notion_id: 'n2', categories: ['other'] },
				}),
			];

			const lsClient = createMockLangsmithClient();
			lsClient.listExamples.mockReturnValue(
				(async function* () {
					for (const ex of examples) yield ex;
				})(),
			);
			mockSetup.mockResolvedValueOnce(createMockEnvironment({ lsClient }));

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'test-dataset',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [createMockEvaluator('test')],
				langsmithOptions: {
					experimentName: 'test',
					repetitions: 1,
					concurrency: 1,
					filters: { notionId: 'n1', technique: 'data_transformation', doSearch: 'slack' },
				},
			};

			const { runEvaluation } = await import('../runner');
			await runEvaluation(config);

			expect(mockEvaluate).toHaveBeenCalledTimes(1);
			const [_target, options] = mockEvaluate.mock.calls[0];
			const data: unknown = options.data;
			expect(Array.isArray(data)).toBe(true);
			if (!Array.isArray(data)) throw new Error('Expected `evaluate()` to receive example array');

			const ids = data
				.filter((e): e is { id: string } => isRecord(e) && typeof e.id === 'string')
				.map((e) => e.id);
			expect(ids).toEqual(['e1']);
		});

		it('should throw when filters match no examples', async () => {
			const mockSetup = jest.mocked(setupTestEnvironment);

			const lsClient = createMockLangsmithClient();
			lsClient.listExamples.mockReturnValue(
				(async function* () {
					yield mock<Example>({
						id: 'e1',
						inputs: { prompt: 'One', evals: { dos: 'Use Slack', donts: 'No HTTP' } },
						metadata: { notion_id: 'n1', categories: ['data_transformation'] },
					});
				})(),
			);
			mockSetup.mockResolvedValueOnce(createMockEnvironment({ lsClient }));

			const config: RunConfig = {
				mode: 'langsmith',
				dataset: 'test-dataset',
				generateWorkflow: jest.fn().mockResolvedValue(createMockWorkflow()),
				evaluators: [createMockEvaluator('test')],
				langsmithOptions: {
					experimentName: 'test',
					repetitions: 1,
					concurrency: 1,
					filters: { notionId: 'does-not-exist' },
				},
			};

			const { runEvaluation } = await import('../runner');
			await expect(runEvaluation(config)).rejects.toThrow('No examples matched filters');
		});
	});
});
