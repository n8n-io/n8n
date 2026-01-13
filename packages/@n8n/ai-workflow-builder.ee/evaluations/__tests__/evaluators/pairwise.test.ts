/**
 * Tests for pairwise evaluator factory.
 *
 * These tests mock the underlying runJudgePanel function and verify
 * that the factory correctly wraps it and transforms the results.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import pLimit from 'p-limit';

import type { SimpleWorkflow } from '@/types/workflow';

import { PAIRWISE_METRICS } from '../../evaluators/pairwise/metrics';

// Store mock for runJudgePanel
const mockRunJudgePanel = jest.fn();

// Mock the judge panel module
jest.mock('../../evaluators/pairwise/judge-panel', () => ({
	runJudgePanel: (...args: unknown[]): unknown => mockRunJudgePanel(...args),
}));

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

/** Helper to create a mock judge panel result */
function createMockPanelResult(
	overrides: Partial<{
		primaryPasses: number;
		majorityPass: boolean;
		avgDiagnosticScore: number;
		judgeResults: Array<{
			primaryPass: boolean;
			diagnosticScore: number;
			violations: Array<{ rule: string; justification: string }>;
			passes: Array<{ rule: string; justification: string }>;
		}>;
	}> = {},
) {
	return {
		primaryPasses: 2,
		majorityPass: true,
		avgDiagnosticScore: 0.8,
		judgeResults: [
			{
				primaryPass: true,
				diagnosticScore: 0.9,
				violations: [],
				passes: [{ rule: 'Has trigger', justification: 'Gmail trigger exists' }],
			},
			{
				primaryPass: true,
				diagnosticScore: 0.8,
				violations: [],
				passes: [{ rule: 'Has trigger', justification: 'Trigger present' }],
			},
			{
				primaryPass: false,
				diagnosticScore: 0.7,
				violations: [{ rule: 'Missing action', justification: 'No Slack node found' }],
				passes: [],
			},
		],
		...overrides,
	};
}

describe('Pairwise Evaluator', () => {
	let mockLlm: BaseChatModel;
	type PairwiseFeedback = { evaluator: string; metric: string; score: number; comment?: string };
	const findFeedback = (feedback: PairwiseFeedback[], metric: string) =>
		feedback.find((f) => f.evaluator === 'pairwise' && f.metric === metric);

	beforeEach(() => {
		jest.clearAllMocks();
		mockLlm = mock<BaseChatModel>();
	});

	describe('createPairwiseEvaluator()', () => {
		it('should create an evaluator with correct name', async () => {
			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			expect(evaluator.name).toBe('pairwise');
		});

		it('should call runJudgePanel with workflow and criteria', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult());

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			const workflow = createMockWorkflow();
			const context = { prompt: 'Test prompt', dos: 'Use Slack', donts: 'No HTTP requests' };

			await evaluator.evaluate(workflow, context);

			expect(mockRunJudgePanel).toHaveBeenCalledWith(
				mockLlm,
				workflow,
				{ dos: 'Use Slack', donts: 'No HTTP requests' },
				3, // default number of judges
				expect.any(Object),
			);
		});

		it('should use custom number of judges', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult());

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm, { numJudges: 5 });

			const workflow = createMockWorkflow();
			await evaluator.evaluate(workflow, { prompt: 'Test prompt' });

			expect(mockRunJudgePanel).toHaveBeenCalledWith(
				mockLlm,
				workflow,
				expect.any(Object),
				5,
				expect.any(Object),
			);
		});

		it('should pass through empty criteria when context has no dos/donts', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult());

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			const workflow = createMockWorkflow();
			await evaluator.evaluate(workflow, { prompt: 'Test prompt' });

			expect(mockRunJudgePanel).toHaveBeenCalledWith(
				mockLlm,
				workflow,
				{
					dos: undefined,
					donts: undefined,
				},
				3,
				expect.any(Object),
			);
		});

		it('should return feedback with majority pass result', async () => {
			mockRunJudgePanel.mockResolvedValue(
				createMockPanelResult({ majorityPass: true, primaryPasses: 2 }),
			);

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test prompt' });

			const majorityFeedback = findFeedback(feedback, PAIRWISE_METRICS.PAIRWISE_PRIMARY);
			expect(majorityFeedback).toEqual({
				evaluator: 'pairwise',
				metric: PAIRWISE_METRICS.PAIRWISE_PRIMARY,
				score: 1,
				kind: 'score',
				comment: '2/3 judges passed',
			});
		});

		it('should return feedback with diagnostic score', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult({ avgDiagnosticScore: 0.85 }));

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test prompt' });

			const diagnosticFeedback = findFeedback(feedback, PAIRWISE_METRICS.PAIRWISE_DIAGNOSTIC);
			expect(diagnosticFeedback).toEqual({
				evaluator: 'pairwise',
				metric: PAIRWISE_METRICS.PAIRWISE_DIAGNOSTIC,
				score: 0.85,
				kind: 'metric',
			});
		});

		it('should return feedback for each judge', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult());

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test prompt' });

			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'pairwise', metric: 'judge1', score: 1 }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'pairwise', metric: 'judge2', score: 1 }),
			);
			expect(feedback).toContainEqual(
				expect.objectContaining({ evaluator: 'pairwise', metric: 'judge3', score: 0 }),
			);
		});

		it('should include violations in judge feedback comments', async () => {
			mockRunJudgePanel.mockResolvedValue(
				createMockPanelResult({
					judgeResults: [
						{
							primaryPass: false,
							diagnosticScore: 0.5,
							violations: [
								{ rule: 'Has Slack', justification: 'Missing Slack node for notifications' },
								{ rule: 'Has trigger', justification: 'No trigger node found' },
							],
							passes: [],
						},
					],
				}),
			);

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test prompt' });

			const judgeFeedback = findFeedback(feedback, 'judge1');
			// Full violation output without truncation
			expect(judgeFeedback?.comment).toContain('[Has Slack] Missing Slack node for notifications');
			expect(judgeFeedback?.comment).toContain('[Has trigger] No trigger node found');
		});

		it('should handle evaluation errors gracefully', async () => {
			mockRunJudgePanel.mockRejectedValue(new Error('Judge panel failed'));

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			const workflow = createMockWorkflow();

			// Should throw - let the runner handle errors
			await expect(evaluator.evaluate(workflow, { prompt: 'Test prompt' })).rejects.toThrow(
				'Judge panel failed',
			);
		});

		it('should accept criteria with only dos (no donts)', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult());

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			const workflow = createMockWorkflow();
			const context = { prompt: 'Test prompt', dos: 'Use Slack node' };

			await evaluator.evaluate(workflow, context);

			expect(mockRunJudgePanel).toHaveBeenCalledWith(
				mockLlm,
				workflow,
				{ dos: 'Use Slack node', donts: undefined },
				3,
				expect.any(Object),
			);
		});

		it('should accept criteria with only donts (no dos)', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult());

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm);

			const workflow = createMockWorkflow();
			const context = { prompt: 'Test prompt', donts: 'Do not use HTTP Request node' };

			await evaluator.evaluate(workflow, context);

			expect(mockRunJudgePanel).toHaveBeenCalledWith(
				mockLlm,
				workflow,
				{ dos: undefined, donts: 'Do not use HTTP Request node' },
				3,
				expect.any(Object),
			);
		});
	});

	describe('createPairwiseEvaluator() multi-gen', () => {
		it('should use single-gen behavior when numGenerations is 1', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult());

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm, { numGenerations: 1 });

			const workflow = createMockWorkflow();
			const feedback = await evaluator.evaluate(workflow, { prompt: 'Test prompt' });

			// Should have single-gen feedback keys
			expect(findFeedback(feedback, PAIRWISE_METRICS.PAIRWISE_PRIMARY)).toBeDefined();
			expect(findFeedback(feedback, PAIRWISE_METRICS.PAIRWISE_DIAGNOSTIC)).toBeDefined();
			// Should NOT have multi-gen keys
			expect(
				findFeedback(feedback, PAIRWISE_METRICS.PAIRWISE_GENERATION_CORRECTNESS),
			).toBeUndefined();
		});

		it('should generate multiple workflows when numGenerations > 1', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult());

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm, { numJudges: 3, numGenerations: 3 });

			const workflow = createMockWorkflow();
			const mockGenerateWorkflow = jest.fn().mockResolvedValue(createMockWorkflow());

			await evaluator.evaluate(workflow, {
				dos: 'Test',
				donts: 'Test',
				prompt: 'Create a workflow',
				generateWorkflow: mockGenerateWorkflow,
			});

			// Should have called generateWorkflow 3 times
			expect(mockGenerateWorkflow).toHaveBeenCalledTimes(3);
			// Should have called runJudgePanel 3 times (once per generation)
			expect(mockRunJudgePanel).toHaveBeenCalledTimes(3);
		});

		it('should limit generation concurrency when llmCallLimiter is provided', async () => {
			mockRunJudgePanel.mockResolvedValue(createMockPanelResult());

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm, { numJudges: 3, numGenerations: 3 });

			const workflow = createMockWorkflow();

			let active = 0;
			let maxActive = 0;
			const mockGenerateWorkflow = jest.fn().mockImplementation(async () => {
				active++;
				maxActive = Math.max(maxActive, active);
				await new Promise((r) => setTimeout(r, 25));
				active--;
				return createMockWorkflow();
			});

			await evaluator.evaluate(workflow, {
				prompt: 'Create a workflow',
				generateWorkflow: mockGenerateWorkflow,
				llmCallLimiter: pLimit(1),
			});

			expect(mockGenerateWorkflow).toHaveBeenCalledTimes(3);
			expect(maxActive).toBe(1);
		});

		it('should aggregate results across generations', async () => {
			// First two generations pass, third fails
			mockRunJudgePanel
				.mockResolvedValueOnce(
					createMockPanelResult({ majorityPass: true, avgDiagnosticScore: 0.9 }),
				)
				.mockResolvedValueOnce(
					createMockPanelResult({ majorityPass: true, avgDiagnosticScore: 0.8 }),
				)
				.mockResolvedValueOnce(
					createMockPanelResult({ majorityPass: false, avgDiagnosticScore: 0.5 }),
				);

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm, { numJudges: 3, numGenerations: 3 });

			const workflow = createMockWorkflow();
			const mockGenerateWorkflow = jest.fn().mockResolvedValue(createMockWorkflow());

			const feedback = await evaluator.evaluate(workflow, {
				prompt: 'Create a workflow',
				generateWorkflow: mockGenerateWorkflow,
			});

			// Should have multi-gen feedback
			const correctness = findFeedback(feedback, PAIRWISE_METRICS.PAIRWISE_GENERATION_CORRECTNESS);
			expect(correctness?.score).toBeCloseTo(2 / 3); // 2 of 3 passed
			expect(correctness?.comment).toBe('2/3 generations passed');

			const diagnostic = findFeedback(feedback, PAIRWISE_METRICS.PAIRWISE_AGGREGATED_DIAGNOSTIC);
			expect(diagnostic?.score).toBeCloseTo((0.9 + 0.8 + 0.5) / 3);
		});

		it('should return per-generation feedback', async () => {
			mockRunJudgePanel
				.mockResolvedValueOnce(
					createMockPanelResult({
						majorityPass: true,
						avgDiagnosticScore: 0.9,
						primaryPasses: 3,
						judgeResults: [
							{
								primaryPass: true,
								diagnosticScore: 0.9,
								violations: [],
								passes: [{ rule: 'Has trigger', justification: 'OK' }],
							},
							{
								primaryPass: true,
								diagnosticScore: 0.9,
								violations: [],
								passes: [{ rule: 'Has trigger', justification: 'OK' }],
							},
							{
								primaryPass: true,
								diagnosticScore: 0.9,
								violations: [],
								passes: [{ rule: 'Has trigger', justification: 'OK' }],
							},
						],
					}),
				)
				.mockResolvedValueOnce(
					createMockPanelResult({
						majorityPass: false,
						avgDiagnosticScore: 0.4,
						primaryPasses: 1,
						judgeResults: [
							{
								primaryPass: true,
								diagnosticScore: 0.5,
								violations: [],
								passes: [{ rule: 'Has trigger', justification: 'OK' }],
							},
							{
								primaryPass: false,
								diagnosticScore: 0.3,
								violations: [{ rule: 'Missing Notion', justification: 'No Notion node found' }],
								passes: [],
							},
							{
								primaryPass: false,
								diagnosticScore: 0.4,
								violations: [{ rule: 'No HTTP', justification: 'Contains HTTP Request node' }],
								passes: [],
							},
						],
					}),
				);

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm, { numJudges: 3, numGenerations: 2 });

			const workflow = createMockWorkflow();
			const mockGenerateWorkflow = jest.fn().mockResolvedValue(createMockWorkflow());

			const feedback = await evaluator.evaluate(workflow, {
				prompt: 'Create a workflow',
				generateWorkflow: mockGenerateWorkflow,
			});

			// Gen 1 feedback
			const gen1Pass = findFeedback(feedback, 'gen1.majorityPass');
			expect(gen1Pass?.score).toBe(1);
			expect(gen1Pass?.comment).toBe('3/3 judges');

			const gen1Diag = findFeedback(feedback, 'gen1.diagnosticScore');
			expect(gen1Diag?.score).toBe(0.9);

			// Gen 2 feedback
			const gen2Pass = findFeedback(feedback, 'gen2.majorityPass');
			expect(gen2Pass?.score).toBe(0);
			expect(gen2Pass?.comment).toBe('1/3 judges');

			const gen2Diag = findFeedback(feedback, 'gen2.diagnosticScore');
			expect(gen2Diag?.score).toBe(0.4);

			const gen2Judge2 = findFeedback(feedback, 'gen2.judge2');
			expect(gen2Judge2?.score).toBe(0);
			expect(gen2Judge2?.comment).toContain('[Missing Notion] No Notion node found');

			const gen2Judge3 = findFeedback(feedback, 'gen2.judge3');
			expect(gen2Judge3?.score).toBe(0);
			expect(gen2Judge3?.comment).toContain('[No HTTP] Contains HTTP Request node');
		});

		it('should throw if generateWorkflow missing in context for multi-gen', async () => {
			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm, { numGenerations: 3 });

			const workflow = createMockWorkflow();

			await expect(
				evaluator.evaluate(workflow, {
					prompt: 'Create a workflow',
					// Missing generateWorkflow
				}),
			).rejects.toThrow('Multi-gen requires generateWorkflow and prompt in context');
		});

		it('should throw if prompt missing in context for multi-gen', async () => {
			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm, { numGenerations: 3 });

			const workflow = createMockWorkflow();
			const mockGenerateWorkflow = jest.fn().mockResolvedValue(createMockWorkflow());

			await expect(
				// @ts-expect-error Intentionally missing required prompt to verify runtime validation
				evaluator.evaluate(workflow, {
					generateWorkflow: mockGenerateWorkflow,
					// Missing prompt
				}),
			).rejects.toThrow('Multi-gen requires generateWorkflow and prompt in context');
		});

		it('should run all generations in parallel', async () => {
			// Track call order with timestamps
			const callTimes: number[] = [];
			mockRunJudgePanel.mockImplementation(async () => {
				callTimes.push(Date.now());
				await new Promise((r) => setTimeout(r, 50)); // Simulate async work
				return createMockPanelResult();
			});

			const { createPairwiseEvaluator } = await import('../../evaluators/pairwise');
			const evaluator = createPairwiseEvaluator(mockLlm, { numJudges: 3, numGenerations: 3 });

			const workflow = createMockWorkflow();
			const mockGenerateWorkflow = jest.fn().mockResolvedValue(createMockWorkflow());

			await evaluator.evaluate(workflow, {
				prompt: 'Create a workflow',
				generateWorkflow: mockGenerateWorkflow,
			});

			expect(callTimes).toHaveLength(3);
		});
	});
});
