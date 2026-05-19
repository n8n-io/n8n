import type {
	EpisodicDeterministicMetrics,
	EpisodicEvalEntry,
	EpisodicEvalFailureKind,
	EpisodicEvalFinalAnswer,
	EpisodicEvalRecallResult,
	EpisodicJudgeScores,
	EpisodicMemoryScenario,
	EpisodicScorecard,
	FactAssertion,
} from './types';

const JUDGE_SCORE_FIELDS = [
	'answerCorrectness',
	'answerFaithfulness',
	'historicalFraming',
	'inventoryCompleteness',
	'distractorResistance',
] as const;

interface DeterministicMetricInput {
	scenario: EpisodicMemoryScenario;
	entries: EpisodicEvalEntry[];
	recalls: EpisodicEvalRecallResult[];
	finalAnswers: EpisodicEvalFinalAnswer[];
}

interface RankingMetrics {
	recallTopKHitRate: number;
	mrr: number;
	ndcg: number;
}

interface AggregateScorecardInput {
	deterministic: EpisodicDeterministicMetrics;
	judge?: EpisodicJudgeScores;
}

export function computeDeterministicMetrics(
	input: DeterministicMetricInput,
): EpisodicDeterministicMetrics {
	const ranking = computeRankingMetrics(input.scenario, input.recalls);
	return {
		entryCoverage: ratio(
			countMatchingAssertions(input.scenario.expectedActiveEpisodes, activeContents(input.entries)),
			input.scenario.expectedActiveEpisodes.length,
		),
		sourceBackedPrecision: sourceBackedPrecision(input.entries),
		exactIdentifierRecall: ratio(
			input.scenario.exactIdentifiers.filter((identifier) =>
				activeContents(input.entries).some((content) => content.includes(identifier)),
			).length,
			input.scenario.exactIdentifiers.length,
		),
		dedupeAccuracy: dedupeAccuracy(input.entries),
		lifecycleAccuracy: staleFactSuppression(
			input.scenario.staleFacts,
			activeContents(input.entries),
		),
		scopeContaminationRate: contaminationRate(input.scenario.forbiddenFacts, [
			...activeContents(input.entries),
			...input.recalls.flatMap((recall) => [
				recall.answer,
				...recall.results.map((result) => result.content),
			]),
			...input.finalAnswers.map((answer) => answer.answer),
		]),
		...ranking,
		abstentionPrecision: abstentionPrecision(input.scenario, input.recalls),
		toolCallAccuracy: toolCallAccuracy(input.scenario, input.recalls),
	};
}

export function computeRankingMetrics(
	scenario: EpisodicMemoryScenario,
	recalls: EpisodicEvalRecallResult[],
): RankingMetrics {
	const recallById = new Map(recalls.map((recall) => [recall.id, recall]));
	const expectedQueries = scenario.recallQueries.filter((query) => query.expectedFacts.length > 0);
	const scores = expectedQueries.map((query) => {
		const recall = recallById.get(query.id);
		if (!recall) return { hit: 0, reciprocalRank: 0, ndcg: 0 };
		const rankedMatches = recall.results.map((result) =>
			query.expectedFacts.some((factId) => {
				const assertion = findFactAssertion(scenario, factId);
				return assertion ? matchesFact(result.content, assertion) : false;
			}),
		);
		const firstMatchIndex = rankedMatches.findIndex(Boolean);
		return {
			hit: firstMatchIndex === -1 ? 0 : 1,
			reciprocalRank: firstMatchIndex === -1 ? 0 : 1 / (firstMatchIndex + 1),
			ndcg: ndcg(rankedMatches),
		};
	});

	return {
		recallTopKHitRate: ratio(scores.filter((score) => score.hit === 1).length, scores.length),
		mrr: average(scores.map((score) => score.reciprocalRank)),
		ndcg: average(scores.map((score) => score.ndcg)),
	};
}

export function parseJudgeScores(response: string): EpisodicJudgeScores {
	let parsed: unknown;
	try {
		parsed = JSON.parse(response);
	} catch {
		throw new Error('Judge response must be valid JSON');
	}
	if (!isRecord(parsed)) throw new Error('Judge response must be a JSON object');

	const scores: Partial<EpisodicJudgeScores> = {};
	for (const field of JUDGE_SCORE_FIELDS) {
		const value = parsed[field];
		if (typeof value !== 'number') throw new Error(`Judge response is missing ${field}`);
		if (!Number.isFinite(value) || value < 0 || value > 5) {
			throw new Error(`Judge score ${field} must be between 0 and 5`);
		}
		scores[field] = value;
	}
	const notes = parsed.notes;
	if (notes !== undefined) {
		if (!Array.isArray(notes) || notes.some((note) => typeof note !== 'string')) {
			throw new Error('Judge notes must be an array of strings');
		}
		scores.notes = notes;
	}

	return scores as EpisodicJudgeScores;
}

export function classifyRecallFailure(input: {
	toolCalled: boolean;
	shouldCallRecallMemory: boolean;
	expectedObservationActive: boolean;
	expectedEntryActive: boolean;
	retrievedExpectedFact?: boolean;
	answerUsedExpectedFact?: boolean;
}): EpisodicEvalFailureKind {
	if (!input.expectedObservationActive) return 'om_observation';
	if (!input.expectedEntryActive) return 'em_extraction';
	if (input.shouldCallRecallMemory && !input.toolCalled) return 'tool_policy';
	if (input.toolCalled && input.retrievedExpectedFact === false) return 'retrieval';
	if (input.answerUsedExpectedFact === false) return 'answer_synthesis';
	return 'oracle_false_negative';
}

export function aggregateScorecard(input: AggregateScorecardInput): EpisodicScorecard {
	const deterministic = average([
		input.deterministic.entryCoverage,
		input.deterministic.sourceBackedPrecision,
		input.deterministic.exactIdentifierRecall,
		input.deterministic.dedupeAccuracy,
		input.deterministic.lifecycleAccuracy,
		1 - input.deterministic.scopeContaminationRate,
		input.deterministic.recallTopKHitRate,
		input.deterministic.mrr,
		input.deterministic.ndcg,
		input.deterministic.abstentionPrecision,
		input.deterministic.toolCallAccuracy,
	]);
	const judge = input.judge
		? average(JUDGE_SCORE_FIELDS.map((field) => input.judge?.[field] ?? 0)) / 5
		: undefined;
	return {
		deterministic,
		...(judge !== undefined ? { judge, judgeScores: input.judge } : {}),
		overall: judge === undefined ? deterministic : deterministic * 0.7 + judge * 0.3,
		metrics: input.deterministic,
	};
}

function activeContents(entries: EpisodicEvalEntry[]): string[] {
	return entries.filter((entry) => entry.status === 'active').map((entry) => entry.content);
}

function countMatchingAssertions(assertions: FactAssertion[], contents: string[]): number {
	return assertions.filter((assertion) =>
		contents.some((content) => matchesFact(content, assertion)),
	).length;
}

function matchesFact(content: string, assertion: FactAssertion): boolean {
	const haystack = content.toLocaleLowerCase();
	const all = assertion.match.all ?? [];
	if (all.some((needle) => !haystack.includes(needle.toLocaleLowerCase()))) return false;
	const oneOf = assertion.match.oneOf ?? [];
	if (oneOf.length > 0 && oneOf.every((needle) => !haystack.includes(needle.toLocaleLowerCase()))) {
		return false;
	}
	const regex = assertion.match.regex ?? [];
	return regex.every((pattern) => new RegExp(pattern, 'iu').test(content));
}

function sourceBackedPrecision(entries: EpisodicEvalEntry[]): number {
	const activeEntries = entries.filter((entry) => entry.status === 'active');
	return ratio(
		activeEntries.filter(
			(entry) =>
				entry.sources.length > 0 &&
				entry.sources.every(
					(source) =>
						source.observationId.trim() !== '' &&
						source.threadId.trim() !== '' &&
						source.evidenceText.trim() !== '',
				),
		).length,
		activeEntries.length,
	);
}

function staleFactSuppression(staleFacts: FactAssertion[], activeEntryContents: string[]): number {
	const staleActiveCount = countMatchingAssertions(staleFacts, activeEntryContents);
	return staleFacts.length === 0 ? 1 : 1 - staleActiveCount / staleFacts.length;
}

function contaminationRate(forbiddenFacts: FactAssertion[], contents: string[]): number {
	if (forbiddenFacts.length === 0) return 0;
	const contaminatedFacts = countMatchingAssertions(forbiddenFacts, contents);
	return ratio(contaminatedFacts, forbiddenFacts.length);
}

function dedupeAccuracy(entries: EpisodicEvalEntry[]): number {
	const normalizedActive = entries
		.filter((entry) => entry.status === 'active')
		.map((entry) => normalizeForDedupe(entry.content));
	if (normalizedActive.length === 0) return 1;
	const unique = new Set(normalizedActive);
	return unique.size / normalizedActive.length;
}

function abstentionPrecision(
	scenario: EpisodicMemoryScenario,
	recalls: EpisodicEvalRecallResult[],
): number {
	const recallById = new Map(recalls.map((recall) => [recall.id, recall]));
	const abstentionQueries = scenario.recallQueries.filter(
		(query) => query.expectedFacts.length === 0,
	);
	return ratio(
		abstentionQueries.filter((query) => (recallById.get(query.id)?.results.length ?? 0) === 0)
			.length,
		abstentionQueries.length,
	);
}

function toolCallAccuracy(
	scenario: EpisodicMemoryScenario,
	recalls: EpisodicEvalRecallResult[],
): number {
	const recallById = new Map(recalls.map((recall) => [recall.id, recall]));
	return ratio(
		scenario.recallQueries.filter((query) => {
			const recall = recallById.get(query.id);
			return recall?.toolCalled === query.shouldCallRecallMemory;
		}).length,
		scenario.recallQueries.length,
	);
}

function findFactAssertion(
	scenario: EpisodicMemoryScenario,
	factId: string,
): FactAssertion | undefined {
	return [
		...scenario.expectedActiveEpisodes,
		...scenario.staleFacts,
		...scenario.forbiddenFacts,
	].find((assertion) => assertion.id === factId);
}

function ndcg(matchesByRank: boolean[]): number {
	const dcg = matchesByRank.reduce(
		(total, matches, index) => total + (matches ? 1 / Math.log2(index + 2) : 0),
		0,
	);
	const idealMatches = matchesByRank.filter(Boolean).length;
	if (idealMatches === 0) return 0;
	const idealDcg = Array.from({ length: idealMatches }).reduce<number>(
		(total, _, index) => total + 1 / Math.log2(index + 2),
		0,
	);
	return dcg / idealDcg;
}

function ratio(numerator: number, denominator: number): number {
	return denominator === 0 ? 1 : numerator / denominator;
}

function average(values: number[]): number {
	return values.length === 0 ? 1 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeForDedupe(content: string): string {
	return content.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
