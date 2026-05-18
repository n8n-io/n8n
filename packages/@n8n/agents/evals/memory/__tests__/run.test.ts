import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { InMemoryMemory } from '../../../src/runtime/memory-store';
import { runMemoryEvalScenario, runMemoryGoldenSuite, writeMemoryEvalArtifacts } from '../run';
import type {
	MemoryEvalMetric,
	MemoryEvalObservation,
	MemoryEvalRuntime,
	MemoryEvalScenario,
} from '../types';

const scope = { scopeKind: 'thread' as const, scopeId: 'thread:golden-fixture' };

function toEvalObservation(observation: {
	id: string;
	marker: MemoryEvalObservation['marker'];
	text: string;
	status: MemoryEvalObservation['status'];
	parentId: string | null;
	supersededBy: string | null;
	createdAt: Date;
}): MemoryEvalObservation {
	return {
		id: observation.id,
		marker: observation.marker,
		text: observation.text,
		status: observation.status,
		parentId: observation.parentId,
		supersededBy: observation.supersededBy,
		createdAt: observation.createdAt.toISOString(),
	};
}

function metricSummary(metric: MemoryEvalMetric) {
	const summary = {
		score: metric.score,
		numerator: metric.numerator,
		denominator: metric.denominator,
	};
	return metric.source ? { ...summary, source: metric.source } : summary;
}

describe('memory eval runner', () => {
	it('runs a deterministic in-memory scenario and writes score artifacts', async () => {
		const memory = new InMemoryMemory();
		let staleObservationId: string | undefined;

		const scenario: MemoryEvalScenario = {
			id: 'runner-fixture',
			name: 'Runner Fixture',
			description: 'Harness integration fixture using in-memory observation storage.',
			tags: ['test'],
			turns: [
				{ user: 'Initial tracker is Airtable.' },
				{ user: 'Correction: tracker is Atlas Billing Exceptions Pilot and channel is #atlas.' },
			],
			finalQuestions: [
				{
					id: 'current',
					prompt: 'What is the current tracker and channel?',
					expectedAnswerTerms: ['Atlas Billing Exceptions Pilot', '#atlas'],
					forbiddenAnswerTerms: ['Airtable'],
				},
			],
			oracle: {
				activeFacts: [
					'The tracker is Atlas Billing Exceptions Pilot.',
					'The launch channel is #atlas.',
				],
				staleFacts: ['The tracker is Airtable.'],
				forbiddenFacts: [],
				exactTerms: ['Atlas Billing Exceptions Pilot', '#atlas'],
				lifecycle: [{ text: 'The tracker is Airtable.', status: 'superseded' }],
			},
		};

		const runtime: MemoryEvalRuntime = {
			async runUserTurn(_input, context) {
				if (context.phase === 'conversation' && context.turnIndex === 0) {
					const [staleObservation] = await memory.appendObservationLogEntries([
						{
							...scope,
							marker: 'important',
							text: 'The tracker is Airtable.',
						},
					]);
					staleObservationId = staleObservation?.id;
				}

				if (
					context.phase === 'conversation' &&
					context.turnIndex === 1 &&
					staleObservationId !== undefined
				) {
					await memory.applyObservationLogReflection(scope, {
						drop: [],
						merge: [
							{
								supersedes: [staleObservationId],
								marker: 'critical',
								text: 'The tracker is Atlas Billing Exceptions Pilot.',
							},
						],
					});
					await memory.appendObservationLogEntries([
						{
							...scope,
							marker: 'important',
							text: 'The launch channel is #atlas.',
						},
					]);
				}

				if (context.phase === 'audit') {
					return 'The current tracker is Atlas Billing Exceptions Pilot and the channel is #atlas.';
				}

				return 'ack';
			},
			async flush() {},
			async readObservations() {
				const observations = await memory.getObservationLog(scope);
				return observations.map(toEvalObservation);
			},
		};

		const result = await runMemoryEvalScenario(scenario, { runtime });

		expect(result.observations).toHaveLength(3);
		expect(result.scorecard.metrics.activeFactRecall.score).toBe(1);
		expect(result.scorecard.metrics.lifecycleAccuracy.score).toBe(1);
		expect(result.scorecard.metrics.finalAnswerCorrectness.score).toBe(1);

		const outputDir = await mkdtemp(join(tmpdir(), 'om-golden-eval-'));
		await writeMemoryEvalArtifacts(
			{
				runId: 'test-run',
				startedAt: '2026-05-18T10:00:00.000Z',
				finishedAt: '2026-05-18T10:00:01.000Z',
				results: [result],
				scorecard: {
					overall: result.scorecard.overall,
					scenarios: [
						{
							scenarioId: result.scenario.id,
							overall: result.scorecard.overall,
							metrics: {
								activeFactRecall: metricSummary(result.scorecard.metrics.activeFactRecall),
								activeFactPrecision: metricSummary(result.scorecard.metrics.activeFactPrecision),
								staleFactSuppression: metricSummary(result.scorecard.metrics.staleFactSuppression),
								exactIdentifierRecall: metricSummary(
									result.scorecard.metrics.exactIdentifierRecall,
								),
								lifecycleAccuracy: metricSummary(result.scorecard.metrics.lifecycleAccuracy),
								contaminationRate: metricSummary(result.scorecard.metrics.contaminationRate),
								finalAnswerCorrectness: metricSummary(
									result.scorecard.metrics.finalAnswerCorrectness,
								),
								answerFaithfulness: metricSummary(result.scorecard.metrics.answerFaithfulness),
							},
							observationCounts: {
								total: result.observations.length,
								active: result.observations.filter((observation) => observation.status === 'active')
									.length,
								superseded: result.observations.filter(
									(observation) => observation.status === 'superseded',
								).length,
								dropped: result.observations.filter(
									(observation) => observation.status === 'dropped',
								).length,
							},
						},
					],
				},
			},
			outputDir,
		);

		await expect(readFile(join(outputDir, 'scorecard.json'), 'utf8')).resolves.toContain(
			'runner-fixture',
		);
		await expect(readFile(join(outputDir, 'observations.json'), 'utf8')).resolves.toContain(
			'Atlas Billing Exceptions Pilot',
		);
	});

	it('uses judge scores as the primary signal for fuzzy metrics', async () => {
		const memory = new InMemoryMemory();
		await memory.appendObservationLogEntries([
			{
				...scope,
				marker: 'critical',
				text: 'Atlas billing pilot customer is Brightline Dental.',
			},
		]);

		const scenario: MemoryEvalScenario = {
			id: 'judge-run-fixture',
			name: 'Judge Run Fixture',
			description: 'Harness fixture proving judge-backed fuzzy scoring.',
			tags: ['test'],
			turns: [],
			finalQuestions: [
				{
					id: 'customer',
					prompt: 'Who is the customer?',
					expectedAnswerTerms: ['Brightline Dental'],
				},
			],
			oracle: {
				activeFacts: ['The Atlas billing pilot customer is Brightline Dental.'],
				staleFacts: [],
				forbiddenFacts: [],
				exactTerms: ['Brightline Dental'],
			},
		};

		const runtime: MemoryEvalRuntime = {
			async runUserTurn(_input, context) {
				return await Promise.resolve(
					context.phase === 'audit' ? 'The customer is Brightline Dental.' : 'ack',
				);
			},
			async flush() {},
			async readObservations() {
				const observations = await memory.getObservationLog(scope);
				return observations.map(toEvalObservation);
			},
		};

		const result = await runMemoryEvalScenario(scenario, {
			runtime,
			judge: {
				async score() {
					return await Promise.resolve({
						activeFactRecall: {
							score: 5,
							matched: ['The Atlas billing pilot customer is Brightline Dental.'],
							missing: [],
							evidenceObservationIds: ['obs-1'],
							notes: ['Paraphrase matched.'],
						},
						activeFactPrecision: {
							score: 5,
							matched: ['obs-1'],
							missing: [],
							evidenceObservationIds: ['obs-1'],
							irrelevantObservationIds: [],
							notes: [],
						},
						lifecycleAccuracy: {
							score: 5,
							matched: [],
							missing: [],
							evidenceObservationIds: [],
							notes: [],
						},
						finalAnswerCorrectness: {
							score: 5,
							matched: ['customer'],
							missing: [],
							evidenceObservationIds: ['obs-1'],
							notes: [],
						},
						answerFaithfulness: {
							score: 5,
							matched: ['Brightline Dental'],
							missing: [],
							evidenceObservationIds: ['obs-1'],
							notes: [],
						},
						overall: 5,
						failures: [],
					});
				},
			},
		});

		expect(result.scorecard.metrics.activeFactRecall).toMatchObject({
			source: 'judge',
			score: 1,
			matched: ['The Atlas billing pilot customer is Brightline Dental.'],
		});
		expect(result.scorecard.metrics.exactIdentifierRecall.source).toBeUndefined();
		expect(result.scorecard.judge?.overall).toBe(5);
	});

	it('runs suite scenarios with bounded concurrency and preserves result order', async () => {
		let active = 0;
		let maxActive = 0;
		const scenarioIds = ['one', 'two', 'three'];
		const scenarios: MemoryEvalScenario[] = scenarioIds.map((id) => ({
			id,
			name: id,
			description: id,
			tags: ['test'],
			turns: [{ user: id }],
			finalQuestions: [],
			oracle: {
				activeFacts: [],
				staleFacts: [],
				forbiddenFacts: [],
				exactTerms: [],
			},
		}));

		const suite = await runMemoryGoldenSuite({
			scenarios,
			concurrency: 2,
			async createRuntime() {
				active += 1;
				maxActive = Math.max(maxActive, active);
				await Promise.resolve();

				return {
					runtime: {
						async runUserTurn() {
							return await Promise.resolve('ack');
						},
						async flush() {
							await Promise.resolve();
							active -= 1;
						},
						async readObservations() {
							return await Promise.resolve([]);
						},
					},
				};
			},
		});

		expect(maxActive).toBe(2);
		expect(suite.results.map((result) => result.scenario.id)).toEqual(scenarioIds);
	});
});
