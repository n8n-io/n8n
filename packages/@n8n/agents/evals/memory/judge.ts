import type {
	MemoryEvalFinalAnswer,
	MemoryEvalJudge,
	MemoryEvalJudgeMetric,
	MemoryEvalJudgeScore,
	MemoryEvalMetric,
	MemoryEvalMetricName,
	MemoryEvalObservation,
	MemoryEvalScenario,
	MemoryEvalScorecard,
} from './types';

export type MemoryJudgeModel = (prompt: string) => Promise<string>;

interface BuildMemoryJudgePromptInput {
	scenario: MemoryEvalScenario;
	observations: MemoryEvalObservation[];
	finalAnswers: MemoryEvalFinalAnswer[];
	scorecard: MemoryEvalScorecard;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readRubricScore(record: Record<string, unknown>, key: keyof MemoryEvalJudgeScore): number {
	const value = record[key];
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 5) {
		throw new Error(`Judge response field "${String(key)}" must be a number from 0 to 5.`);
	}
	return value;
}

function readStringArray(record: Record<string, unknown>, key: string, required = true): string[] {
	const value = record[key];
	if (value === undefined && !required) return [];
	if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
		throw new Error(`Judge response field "${key}" must be an array of strings.`);
	}
	return value;
}

function readJudgeMetric(record: Record<string, unknown>, key: string): MemoryEvalJudgeMetric {
	const value = record[key];
	if (!isRecord(value)) {
		throw new Error(`Judge response field "${key}" must be an object.`);
	}

	const score = value.score;
	if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 5) {
		throw new Error(`Judge response field "${key}.score" must be a number from 0 to 5.`);
	}

	return {
		score,
		matched: readStringArray(value, 'matched'),
		missing: readStringArray(value, 'missing'),
		evidenceObservationIds: readStringArray(value, 'evidenceObservationIds'),
		irrelevantObservationIds: readStringArray(value, 'irrelevantObservationIds', false),
		notes: readStringArray(value, 'notes'),
	};
}

function readFailures(record: Record<string, unknown>): string[] {
	const value = record.failures;
	if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
		throw new Error('Judge response field "failures" must be an array of strings.');
	}
	return value;
}

export function buildMemoryJudgePrompt(input: BuildMemoryJudgePromptInput): string {
	const activeObservations = input.observations.filter(
		(observation) => observation.status === 'active',
	);

	return [
		'You are a semantic evaluator for an observational-memory eval result.',
		'Compare the scenario oracle, active observations, inactive observations, and final answers.',
		'Do not require exact prose. Treat paraphrases as matches when the core claim is preserved and exact identifiers still match exactly.',
		'Do not give credit when required terms are scattered across unrelated observations without supporting the same claim.',
		'Use active observations for activeFactRecall, activeFactPrecision, and answerFaithfulness. Inactive observations may help judge lifecycle only.',
		'The deterministic scorecard may contain brittle substring false negatives. Use it as a hint for exact identifiers, stale terms, and forbidden leakage, not as ground truth for fuzzy facts.',
		'Score each rubric field from 0 to 5, where 5 is perfect and 0 is a severe failure.',
		'Return strict JSON only. Do not include markdown or commentary.',
		'Required JSON shape:',
		JSON.stringify(
			{
				activeFactRecall: {
					score: 5,
					matched: ['oracle active fact text or id'],
					missing: ['oracle active fact text or id'],
					evidenceObservationIds: ['obs-id'],
					notes: ['short note'],
				},
				activeFactPrecision: {
					score: 5,
					matched: ['relevant observation id'],
					missing: ['irrelevant or unsupported observation id'],
					evidenceObservationIds: ['obs-id'],
					irrelevantObservationIds: ['obs-id'],
					notes: ['short note'],
				},
				lifecycleAccuracy: {
					score: 5,
					matched: ['stale/drop/supersession expectation'],
					missing: ['stale/drop/supersession expectation'],
					evidenceObservationIds: ['obs-id'],
					notes: ['short note'],
				},
				finalAnswerCorrectness: {
					score: 5,
					matched: ['final question id'],
					missing: ['final question id'],
					evidenceObservationIds: ['obs-id'],
					notes: ['short note'],
				},
				answerFaithfulness: {
					score: 5,
					matched: ['answer claim supported by active memory'],
					missing: ['unsupported, stale, or contradicted answer claim'],
					evidenceObservationIds: ['obs-id'],
					notes: ['short note'],
				},
				overall: 5,
				failures: ['short failure note'],
			},
			null,
			2,
		),
		'Scenario:',
		JSON.stringify(input.scenario, null, 2),
		'Active observations:',
		JSON.stringify(activeObservations, null, 2),
		'All observations, including inactive lifecycle rows:',
		JSON.stringify(input.observations, null, 2),
		'Final answers:',
		JSON.stringify(input.finalAnswers, null, 2),
		'Deterministic scorecard:',
		JSON.stringify(input.scorecard, null, 2),
	].join('\n\n');
}

export function parseMemoryJudgeResponse(response: string): MemoryEvalJudgeScore {
	let parsed: unknown;
	try {
		parsed = JSON.parse(response);
	} catch (error) {
		throw new Error('Judge response must be strict JSON.', { cause: error });
	}
	if (!isRecord(parsed)) {
		throw new Error('Judge response must be a JSON object.');
	}

	return {
		activeFactRecall: readJudgeMetric(parsed, 'activeFactRecall'),
		activeFactPrecision: readJudgeMetric(parsed, 'activeFactPrecision'),
		lifecycleAccuracy: readJudgeMetric(parsed, 'lifecycleAccuracy'),
		finalAnswerCorrectness: readJudgeMetric(parsed, 'finalAnswerCorrectness'),
		answerFaithfulness: readJudgeMetric(parsed, 'answerFaithfulness'),
		overall: readRubricScore(parsed, 'overall'),
		failures: readFailures(parsed),
	};
}

const JUDGE_CONTROLLED_METRICS = [
	'activeFactRecall',
	'activeFactPrecision',
	'lifecycleAccuracy',
	'finalAnswerCorrectness',
	'answerFaithfulness',
] as const satisfies readonly MemoryEvalMetricName[];

function toJudgeMetric(metric: MemoryEvalJudgeMetric): MemoryEvalMetric {
	return {
		score: metric.score / 5,
		numerator: metric.score,
		denominator: 5,
		source: 'judge',
		matched: metric.matched,
		missing: metric.missing,
		evidenceObservationIds: metric.evidenceObservationIds,
		irrelevantObservationIds: metric.irrelevantObservationIds,
		notes: metric.notes,
	};
}

function averageMetricScores(metrics: Record<MemoryEvalMetricName, MemoryEvalMetric>): number {
	const scores = Object.values(metrics).map((metric) => metric.score);
	return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function applyMemoryJudgeScore(
	scorecard: MemoryEvalScorecard,
	judge: MemoryEvalJudgeScore,
): MemoryEvalScorecard {
	const metrics = { ...scorecard.metrics };
	for (const metricName of JUDGE_CONTROLLED_METRICS) {
		metrics[metricName] = toJudgeMetric(judge[metricName]);
	}

	return {
		...scorecard,
		metrics,
		overall: averageMetricScores(metrics),
		judge,
	};
}

export function createMemoryJudge(model: MemoryJudgeModel): MemoryEvalJudge {
	return {
		async score(input) {
			const prompt = buildMemoryJudgePrompt(input);
			return parseMemoryJudgeResponse(await model(prompt));
		},
	};
}
