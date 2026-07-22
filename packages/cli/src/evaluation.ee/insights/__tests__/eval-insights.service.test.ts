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

	beforeEach(() => {
		collectionRepo = mock<EvaluationCollectionRepository>();
		evalConfigRepo = mock<EvaluationConfigRepository>();
		licenseState = mock<LicenseState>();
		telemetry = mock<Telemetry>();
		logger = mock<Logger>();

		licenseState.isAiAssistantLicensed.mockReturnValue(true);
		// No config metrics resolved by default → name-based scale fallback, which
		// keeps the existing metric fixtures (correctness/acc/fluency) scoring as before.
		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValue(null);

		service = new EvalInsightsService(
			collectionRepo,
			evalConfigRepo,
			licenseState,
			telemetry,
			logger,
		);
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
		it('returns the cached envelope unchanged on the second call within TTL', async () => {
			const cached: AiInsightsResponse = {
				generatedAt: '2026-04-01T10:00:00.000Z',
				modelUsed: DETERMINISTIC_MODEL_TAG,
				status: 'fallback',
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

			expect(result.status).toBe('fallback');
			expect(collectionRepo.updateInsightsCache).toHaveBeenCalledTimes(1);
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

		it('persists the generated envelope on the collection cache', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeRun({ id: 'tr-a', metrics: { acc: 0.9 } }),
					makeRun({ id: 'tr-b', metrics: { acc: 0.6 } }),
				],
			});

			const result = await service.generateInsights(user, 'wf-1', 'col-1');

			expect(collectionRepo.updateInsightsCache).toHaveBeenCalledWith('col-1', result);
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
