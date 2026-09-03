import type { AiInsightsResponse } from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import type {
	EvaluationCollection,
	EvaluationCollectionRepository,
	EvaluationConfigRepository,
	TestRun,
	User,
} from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { Telemetry } from '@/telemetry';

import { DETERMINISTIC_MODEL_TAG, EvalInsightsService } from '../eval-insights.service';
import type { InsightsContextBuilder } from '../insights-context-builder';
import type { InsightsModelResolver } from '../insights-model-resolver';

// Stub the @n8n/agents SDK: the fluent builder is a no-op and `generate` is a
// controllable mock so tests drive the model's (in)valid structured output.
const { generateMock } = vi.hoisted(() => ({ generateMock: vi.fn() }));
vi.mock('@n8n/agents', () => ({
	Agent: class {
		model() {
			return this;
		}
		instructions() {
			return this;
		}
		structuredOutput() {
			return this;
		}
		async generate(...args: unknown[]) {
			return await generateMock(...args);
		}
	},
}));

const validPayload = {
	winner: { versionLabel: 'B', headline: 'B wins', body: 'B leads on correctness.' },
	regressions: [
		{
			versionLabel: 'A',
			metric: 'correctness',
			delta: -40,
			headline: 'A down',
			body: 'A regressed.',
		},
	],
	suggestedNext: { headline: 'Try C', body: 'Combine A and B.', hypothesis: 'C recovers the gap.' },
};

const user = mock<User>({ id: 'user-1' });

function makeCollection(over: Partial<EvaluationCollection> = {}): EvaluationCollection {
	return {
		id: 'col-1',
		name: 'My collection',
		description: null,
		workflowId: 'wf-1',
		evaluationConfigId: 'cfg-1',
		createdById: 'user-1',
		insightsCache: null,
		createdAt: new Date('2026-02-01T00:00:00Z'),
		updatedAt: new Date('2026-02-01T00:00:00Z'),
		...over,
	} as EvaluationCollection;
}

function makeRun(over: Partial<TestRun> = {}): TestRun {
	return {
		id: 'tr-1',
		status: 'completed',
		workflowId: 'wf-1',
		workflowVersionId: 'wfv-1',
		metrics: { accuracy: 0.9 },
		runAt: new Date('2026-03-01T00:00:00Z'),
		completedAt: new Date('2026-03-01T00:01:00Z'),
		createdAt: new Date('2026-03-01T00:00:00Z'),
		updatedAt: new Date('2026-03-01T00:01:00Z'),
		...over,
	} as TestRun;
}

describe('EvalInsightsService', () => {
	let service: EvalInsightsService;
	let collectionRepo: Mocked<EvaluationCollectionRepository>;
	let evalConfigRepo: Mocked<EvaluationConfigRepository>;
	let licenseState: Mocked<LicenseState>;
	let telemetry: Mocked<Telemetry>;
	let logger: Mocked<Logger>;
	let modelResolver: Mocked<InsightsModelResolver>;
	let contextBuilder: Mocked<InsightsContextBuilder>;

	beforeEach(() => {
		collectionRepo = mock<EvaluationCollectionRepository>();
		evalConfigRepo = mock<EvaluationConfigRepository>();
		licenseState = mock<LicenseState>();
		telemetry = mock<Telemetry>();
		logger = mock<Logger>();
		modelResolver = mock<InsightsModelResolver>();
		contextBuilder = mock<InsightsContextBuilder>();

		licenseState.isAiAssistantLicensed.mockReturnValue(true);
		// Default: no judge model configured → deterministic path. LLM-path tests
		// override this.
		modelResolver.resolve.mockResolvedValue(null);
		contextBuilder.build.mockResolvedValue({
			collectionName: 'My collection',
			baseVersionLabel: 'B',
			versions: [],
		});
		generateMock.mockReset();
		// No config metrics resolved by default → name-based scale fallback, which
		// keeps the existing metric fixtures scoring as before.
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValue(null);

		service = new EvalInsightsService(
			collectionRepo,
			evalConfigRepo,
			licenseState,
			telemetry,
			logger,
			modelResolver,
			contextBuilder,
		);
	});

	describe('LLM path', () => {
		const resolvedModel = {
			modelConfig: { id: 'anthropic/claude-sonnet-4-5', apiKey: 'sk-test' },
			modelId: 'anthropic/claude-sonnet-4-5',
		};

		function seedTwoScoredRuns() {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-a', metrics: { correctness: 5 } }),
					makeRun({ id: 'tr-b', metrics: { correctness: 2 } }),
				],
			});
		}

		it('returns the model payload and real model id when the agent succeeds', async () => {
			modelResolver.resolve.mockResolvedValueOnce(resolvedModel);
			// Context with A + B where A really scored below B on correctness, so
			// reconcile keeps the (real, non-base, data-supported) A regression.
			contextBuilder.build.mockResolvedValueOnce({
				collectionName: 'My collection',
				baseVersionLabel: 'B',
				versions: [
					{
						label: 'A',
						isBase: false,
						avgScorePercent: 40,
						metricScores: { correctness: 40 },
						workflowDiff: null,
						regressedCases: [],
					},
					{
						label: 'B',
						isBase: true,
						avgScorePercent: 100,
						metricScores: { correctness: 100 },
						workflowDiff: null,
						regressedCases: [],
					},
				],
			});
			generateMock.mockResolvedValueOnce({ structuredOutput: validPayload });
			seedTwoScoredRuns();

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.status).toBe('ok');
			expect(result.modelUsed).toBe('anthropic/claude-sonnet-4-5');
			expect(result.insights.winner).toEqual(validPayload.winner);
			expect(result.insights.suggestedNext).toEqual(validPayload.suggestedNext);
			// Regression kept, but `delta` overwritten from context (40 − 100 = −60).
			expect(result.insights.regressions).toEqual([
				{
					versionLabel: 'A',
					metric: 'correctness',
					delta: -60,
					headline: 'A down',
					body: 'A regressed.',
				},
			]);
			expect(generateMock).toHaveBeenCalledTimes(1);
			// A successful envelope is cached.
			expect(collectionRepo.updateInsightsCache).toHaveBeenCalledWith('col-1', result);
		});

		it('retries once with a stricter prompt when the first output is invalid', async () => {
			modelResolver.resolve.mockResolvedValueOnce(resolvedModel);
			generateMock
				.mockResolvedValueOnce({ structuredOutput: { not: 'valid' } })
				.mockResolvedValueOnce({ structuredOutput: validPayload });
			seedTwoScoredRuns();

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.status).toBe('ok');
			expect(generateMock).toHaveBeenCalledTimes(2);
		});

		it('falls back to deterministic when the output is invalid after the retry', async () => {
			modelResolver.resolve.mockResolvedValueOnce(resolvedModel);
			generateMock.mockResolvedValue({ structuredOutput: { not: 'valid' } });
			seedTwoScoredRuns();

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.status).toBe('fallback');
			expect(result.modelUsed).toBe(DETERMINISTIC_MODEL_TAG);
			expect(generateMock).toHaveBeenCalledTimes(2);
		});

		it('falls back to deterministic when the agent call throws', async () => {
			modelResolver.resolve.mockResolvedValueOnce(resolvedModel);
			generateMock.mockRejectedValue(new Error('network down'));
			seedTwoScoredRuns();

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.status).toBe('fallback');
			expect(result.modelUsed).toBe(DETERMINISTIC_MODEL_TAG);
		});

		it('dedupes regressions, drops unsupported ones, and overwrites delta from context', async () => {
			modelResolver.resolve.mockResolvedValueOnce(resolvedModel);
			// A scored below base B on correctness (a real regression) but above it
			// on helpfulness (not a regression).
			contextBuilder.build.mockResolvedValueOnce({
				collectionName: 'My collection',
				baseVersionLabel: 'B',
				versions: [
					{
						label: 'A',
						isBase: false,
						avgScorePercent: 65,
						metricScores: { correctness: 40, helpfulness: 90 },
						workflowDiff: null,
						regressedCases: [],
					},
					{
						label: 'B',
						isBase: true,
						avgScorePercent: 75,
						metricScores: { correctness: 100, helpfulness: 50 },
						workflowDiff: null,
						regressedCases: [],
					},
				],
			});
			// Model returns the correct winner (B) but a messy regression list: the
			// real A/correctness twice (with a bogus delta), a wrong-direction
			// A/helpfulness (A beat B), and one on an unknown version "D".
			generateMock.mockResolvedValueOnce({
				structuredOutput: {
					winner: { versionLabel: 'B', headline: 'B wins', body: 'B leads.' },
					regressions: [
						{ versionLabel: 'A', metric: 'correctness', delta: -5, headline: 'A down', body: '.' },
						{ versionLabel: 'A', metric: 'correctness', delta: -9, headline: 'dup', body: '.' },
						{ versionLabel: 'A', metric: 'helpfulness', delta: -40, headline: 'A down', body: '.' },
						{ versionLabel: 'D', metric: 'correctness', delta: -10, headline: 'D down', body: '.' },
					],
					suggestedNext: { headline: 'Next', body: '.', hypothesis: '.' },
				},
			});
			seedTwoScoredRuns();

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.status).toBe('ok');
			expect(result.insights.winner.versionLabel).toBe('B');
			// Only the first A/correctness survives (dedup); helpfulness is
			// wrong-direction and "D" is unknown. `delta` is overwritten with the
			// real gap (40 − 100 = −60), not the model's −5.
			expect(result.insights.regressions).toEqual([
				{ versionLabel: 'A', metric: 'correctness', delta: -60, headline: 'A down', body: '.' },
			]);
		});

		it('falls back when the model returns a winner label other than the base', async () => {
			modelResolver.resolve.mockResolvedValueOnce(resolvedModel);
			contextBuilder.build.mockResolvedValue({
				collectionName: 'My collection',
				baseVersionLabel: 'B',
				versions: [],
			});
			// Both the first attempt and the stricter retry return winner "A" ≠ base
			// "B" → treated as invalid → deterministic fallback (not relabeled).
			generateMock.mockResolvedValue({
				structuredOutput: {
					winner: { versionLabel: 'A', headline: 'A wins', body: 'A leads.' },
					regressions: [],
					suggestedNext: { headline: 'Next', body: '.', hypothesis: '.' },
				},
			});
			seedTwoScoredRuns();

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.status).toBe('fallback');
			expect(result.modelUsed).toBe(DETERMINISTIC_MODEL_TAG);
			expect(generateMock).toHaveBeenCalledTimes(2);
		});

		it('falls back to deterministic when no supported judge model is configured', async () => {
			// resolve → null (default). The agent must never be called.
			seedTwoScoredRuns();

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.status).toBe('fallback');
			expect(result.modelUsed).toBe(DETERMINISTIC_MODEL_TAG);
			expect(generateMock).not.toHaveBeenCalled();
		});
	});

	describe('license gating', () => {
		it('rejects with 403 when AI Assistant license is off', async () => {
			licenseState.isAiAssistantLicensed.mockReturnValueOnce(false);
			await expect(service.generateInsights(user, 'wf-1', 'col-1')).rejects.toThrow(ForbiddenError);
			expect(collectionRepo.getDetailByIdAndWorkflowId).not.toHaveBeenCalled();
		});
	});

	describe('collection lookup', () => {
		it('returns 404 when the collection does not exist on the workflow', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce(null);
			await expect(service.generateInsights(user, 'wf-1', 'col-missing')).rejects.toThrow(
				NotFoundError,
			);
		});

		it('requires at least 2 completed runs with metrics', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [makeRun({ id: 'tr-1' })],
			});
			await expect(service.generateInsights(user, 'wf-1', 'col-1')).rejects.toThrow(
				BadRequestError,
			);
		});

		it('ignores runs that are not completed when counting', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-1', status: 'completed' }),
					makeRun({ id: 'tr-2', status: 'running' }),
				],
			});
			await expect(service.generateInsights(user, 'wf-1', 'col-1')).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('cache', () => {
		it('returns a cached ok envelope unchanged on the second call within TTL', async () => {
			const cached: AiInsightsResponse = {
				generatedAt: '2026-04-01T10:00:00.000Z',
				modelUsed: 'claude-sonnet-4-6',
				status: 'ok',
				insights: {
					winner: {
						versionLabel: 'A',
						headline: 'A is the winner',
						body: 'cached body',
					},
					regressions: [],
					suggestedNext: {
						headline: 'cached',
						body: 'cached',
						hypothesis: 'cached',
					},
				},
			};
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection({ insightsCache: cached as never }),
				runs: [makeRun()],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result).toEqual(cached);
			// No regeneration → no telemetry, no cache write.
			expect(collectionRepo.updateInsightsCache).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('ignores a malformed cache and regenerates', async () => {
			const malformedCache = { not: 'the expected shape' };
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection({ insightsCache: malformedCache as never }),
				runs: [
					makeRun({ id: 'tr-a', metrics: { acc: 0.9 } }),
					makeRun({ id: 'tr-b', metrics: { acc: 0.5 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			// Regenerates → deterministic fallback (no judge model), which is not cached.
			expect(result.status).toBe('fallback');
			expect(collectionRepo.updateInsightsCache).not.toHaveBeenCalled();
		});

		it('ignores a cached fallback and re-attempts (so a transient error never sticks)', async () => {
			const cachedFallback: AiInsightsResponse = {
				generatedAt: '2026-04-01T10:00:00.000Z',
				modelUsed: DETERMINISTIC_MODEL_TAG,
				status: 'fallback',
				insights: {
					winner: { versionLabel: 'A', headline: 'stale', body: 'stale' },
					regressions: [],
					suggestedNext: { headline: 's', body: 's', hypothesis: 's' },
				},
			};
			modelResolver.resolve.mockResolvedValueOnce({
				modelConfig: { id: 'anthropic/claude-sonnet-4-5', apiKey: 'sk-test' },
				modelId: 'anthropic/claude-sonnet-4-5',
			});
			contextBuilder.build.mockResolvedValue({
				collectionName: 'My collection',
				baseVersionLabel: 'B',
				versions: [],
			});
			generateMock.mockResolvedValueOnce({ structuredOutput: validPayload });
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection({ insightsCache: cachedFallback as never }),
				runs: [
					makeRun({ id: 'tr-a', metrics: { correctness: 5 } }),
					makeRun({ id: 'tr-b', metrics: { correctness: 2 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			// The cached fallback was not served; the LLM ran and produced a fresh ok.
			expect(generateMock).toHaveBeenCalled();
			expect(result.status).toBe('ok');
		});

		it('bypasses the cache when forceRegenerate is true', async () => {
			const cached: AiInsightsResponse = {
				generatedAt: '2026-04-01T10:00:00.000Z',
				modelUsed: 'claude-sonnet-4-6',
				status: 'ok',
				insights: {
					winner: { versionLabel: 'A', headline: 'h', body: 'b' },
					regressions: [],
					suggestedNext: { headline: 'h', body: 'b', hypothesis: 'h' },
				},
			};
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection({ insightsCache: cached as never }),
				runs: [
					makeRun({ id: 'tr-a', metrics: { acc: 0.9 } }),
					makeRun({ id: 'tr-b', metrics: { acc: 0.5 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1', {
				forceRegenerate: true,
			});

			expect(result.status).toBe('fallback');
			expect(result.modelUsed).toBe(DETERMINISTIC_MODEL_TAG);
		});
	});

	describe('deterministic fallback', () => {
		it('flags the highest-scoring version as winner', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-a', metrics: { acc: 0.9, fluency: 0.85 } }),
					makeRun({ id: 'tr-b', metrics: { acc: 0.6, fluency: 0.5 } }),
					makeRun({ id: 'tr-c', metrics: { acc: 0.75, fluency: 0.7 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.insights.winner.versionLabel).toBe('A');
			expect(result.insights.winner.headline).toContain('A');
		});

		it('lists per-metric regressions on losing versions where delta exceeds the threshold', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-a', metrics: { accuracy: 0.9, fluency: 0.85 } }),
					// B loses 30pp on accuracy → regression; loses 5pp on fluency → ignored.
					makeRun({ id: 'tr-b', metrics: { accuracy: 0.6, fluency: 0.8 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			const accuracyRegression = result.insights.regressions.find(
				(r) => r.versionLabel === 'B' && r.metric === 'accuracy',
			);
			const fluencyRegression = result.insights.regressions.find(
				(r) => r.versionLabel === 'B' && r.metric === 'fluency',
			);
			expect(accuracyRegression).toBeDefined();
			expect(accuracyRegression?.delta).toBeLessThan(0);
			expect(fluencyRegression).toBeUndefined();
		});

		it('scores on normalized quality metrics, ignoring token/time operational metrics', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					// A wins on correctness (5/5) despite far more tokens/time; B is
					// worse on correctness (2/5). The winner + the only regression must
					// be about correctness — never completionTokens / executionTime.
					makeRun({
						id: 'tr-a',
						metrics: { correctness: 5, completionTokens: 1719, executionTime: 21368 },
					}),
					makeRun({
						id: 'tr-b',
						metrics: { correctness: 2, completionTokens: 540, executionTime: 11646 },
					}),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.insights.winner.versionLabel).toBe('A');
			// correctness 5/5 → 100%, counted as a single score metric
			expect(result.insights.winner.body).toContain('100%');
			expect(result.insights.winner.body).toContain('1 metric');
			const regressedMetrics = result.insights.regressions.map((r) => r.metric);
			expect(regressedMetrics).toContain('correctness');
			expect(regressedMetrics).not.toContain('completionTokens');
			expect(regressedMetrics).not.toContain('executionTime');
		});

		it('returns a "lock in baseline" recommendation when no regressions cross the threshold', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-a', metrics: { acc: 0.9 } }),
					makeRun({ id: 'tr-b', metrics: { acc: 0.85 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.insights.regressions).toEqual([]);
			expect(result.insights.suggestedNext.headline.toLowerCase()).toMatch(/lock in|baseline/);
		});

		it("preserves the run's original A/B/C label when a middle run is skipped", async () => {
			// `detail.runs` is ordered createdAt ASC and labels in the
			// insights envelope must align with that position. If a middle
			// run is still running / errored / missing metrics, later runs
			// must stay on their original labels — otherwise the FE sees
			// the winner attributed to the wrong version.
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-a', workflowVersionId: 'wfv-a', metrics: { acc: 0.6 } }),
					makeRun({
						id: 'tr-b',
						workflowVersionId: 'wfv-b',
						status: 'running',
						metrics: undefined,
					}),
					makeRun({ id: 'tr-c', workflowVersionId: 'wfv-c', metrics: { acc: 0.95 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			// Highest score is on the third run (workflowVersionId wfv-c),
			// which sits at index 2 → label "C". Before the fix this would
			// have come back as "B" because the running run was filtered
			// out and then C took B's index in the filtered array.
			expect(result.insights.winner.versionLabel).toBe('C');
			expect(result.insights.winner.headline).toContain('C');
			// Any regression on the only other scored run is attributed to
			// "A" (the first run, index 0), not "B" (the skipped one).
			for (const regression of result.insights.regressions) {
				expect(regression.versionLabel).toBe('A');
			}
		});

		it('scores custom-named 1–5 judge metrics via the config scale', async () => {
			// The bug: a 1–5 judge metric named anything but correctness/helpfulness
			// scored null → "no scored runs". Resolving the scale from the config
			// makes it a real score so the winner is picked on it.
			evalConfigRepo.findByIdAndWorkflowId.mockResolvedValue({
				metrics: [
					{
						id: 'm1',
						name: 'Markdown Formatting',
						type: 'llm_judge',
						config: {
							preset: 'correctness',
							provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							credentialId: 'cred-1',
							model: 'gpt-4o',
							outputType: 'numeric',
							inputs: { actualAnswer: 'a', expectedAnswer: 'b' },
						},
					},
				],
			} as never);
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-a', metrics: { 'Markdown Formatting': 5 } }),
					makeRun({ id: 'tr-b', metrics: { 'Markdown Formatting': 2 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.insights.winner.versionLabel).toBe('A');
			// 5/5 → 100%, not "no scored runs".
			expect(result.insights.winner.headline.toLowerCase()).not.toContain('no scored');
			expect(result.insights.winner.body).toContain('100%');
		});

		it('returns a neutral envelope when no runs produce numeric metrics', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [makeRun({ id: 'tr-a', metrics: {} }), makeRun({ id: 'tr-b', metrics: {} })],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(result.status).toBe('fallback');
			expect(result.insights.regressions).toEqual([]);
			expect(result.insights.winner.headline.toLowerCase()).toContain('no scored');
		});

		it('does not cache a deterministic fallback envelope', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-a', metrics: { acc: 0.9 } }),
					makeRun({ id: 'tr-b', metrics: { acc: 0.6 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			// Uncached so the next view re-attempts the LLM rather than sticking here.
			expect(result.status).toBe('fallback');
			expect(collectionRepo.updateInsightsCache).not.toHaveBeenCalled();
		});
	});

	describe('telemetry', () => {
		it('emits "Eval collection insights generated" with the expected properties', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-a', metrics: { acc: 0.9 } }),
					makeRun({ id: 'tr-b', metrics: { acc: 0.4 } }),
				],
			});

			await service.generateInsights(user, 'wf-1', 'col-1');

			expect(telemetry.track).toHaveBeenCalledWith(
				'Eval collection insights generated',
				expect.objectContaining({
					user_id: 'user-1',
					workflow_id: 'wf-1',
					collection_id: 'col-1',
					model_used: DETERMINISTIC_MODEL_TAG,
					status: 'fallback',
					regressions_found: expect.any(Number),
					duration_ms: expect.any(Number),
				}),
			);
		});
	});
});
