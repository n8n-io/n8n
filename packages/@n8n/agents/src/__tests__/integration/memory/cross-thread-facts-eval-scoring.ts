export interface EvalScoringConfig {
	recallPrompt: string;
	expectedStoredKeywords: string[];
	expectedAnswerKeywords: string[];
	forbiddenKeywords?: string[];
	forbiddenStoredKeywords?: string[];
	forbiddenRecallKeywords?: string[];
	forbiddenAnswerKeywords?: string[];
	forbiddenScopeKeywords?: string[];
	expectedRecallMemory?: boolean;
	expectStoredFacts?: boolean;
	expectedMaxStoredFacts?: number;
}

export interface EvalObservation {
	storedFacts: string[];
	recallFacts: string[];
	answer: string;
	recallToolCalled: boolean;
	crossThreadErrors: string[];
}

export interface EvalScenarioMetrics {
	storedFactRecall: boolean;
	storedFactPrecision: boolean;
	recallToolUsage: boolean;
	retrievalTop1: boolean;
	retrievalTop3: boolean;
	recallPrecision: boolean;
	answerAccuracy: boolean;
	crossScopeSafety: boolean;
	maxStoredFacts: boolean;
	endToEnd: boolean;
}

export interface EvalScoringResult {
	metrics: EvalScenarioMetrics;
	failedMetrics: Array<keyof EvalScenarioMetrics>;
	forbiddenStoredKeywords: string[];
	forbiddenRecallKeywords: string[];
	forbiddenAnswerKeywords: string[];
	forbiddenScopeKeywords: string[];
}

function normalize(text: string): string {
	return text.toLowerCase();
}

function containsAll(text: string, keywords: string[]): boolean {
	const normalized = normalize(text);
	return keywords.every((keyword) => normalized.includes(normalize(keyword)));
}

function containsNone(text: string, keywords: string[]): boolean {
	const normalized = normalize(text);
	return keywords.every((keyword) => !normalized.includes(normalize(keyword)));
}

export function scoreCrossThreadFactScenario(
	config: EvalScoringConfig,
	observation: EvalObservation,
): EvalScoringResult {
	const storedText = observation.storedFacts.join('\n');
	const recallText = observation.recallFacts.join('\n');
	const allObservedText = [storedText, recallText, observation.answer].join('\n');
	const forbiddenStoredKeywords = config.forbiddenStoredKeywords ?? [];
	const forbiddenRecallKeywords = config.forbiddenRecallKeywords ?? [];
	const forbiddenAnswerKeywords = config.forbiddenAnswerKeywords ?? config.forbiddenKeywords ?? [];
	const forbiddenScopeKeywords = config.forbiddenScopeKeywords ?? [];
	const expectedRecallMemory =
		config.expectedRecallMemory ?? config.recallPrompt.toLowerCase().includes('memory');
	const expectsFacts = config.expectStoredFacts ?? config.expectedStoredKeywords.length > 0;
	const expectsRetrieval = expectsFacts && expectedRecallMemory;

	const storedFactRecall = expectsFacts
		? containsAll(storedText, config.expectedStoredKeywords)
		: observation.storedFacts.length === 0;
	const storedFactPrecision = containsNone(storedText, forbiddenStoredKeywords);
	const recallToolUsage = observation.recallToolCalled === expectedRecallMemory;
	const retrievalTop1 =
		!expectsRetrieval ||
		(observation.recallToolCalled &&
			observation.recallFacts[0] !== undefined &&
			containsAll(observation.recallFacts[0], config.expectedStoredKeywords));
	const retrievalTop3 =
		!expectsRetrieval ||
		(observation.recallToolCalled &&
			containsAll(observation.recallFacts.slice(0, 3).join('\n'), config.expectedStoredKeywords));
	const recallPrecision = containsNone(recallText, forbiddenRecallKeywords);
	const answerAccuracy =
		config.expectedAnswerKeywords.length === 0
			? containsNone(observation.answer, forbiddenAnswerKeywords)
			: containsAll(observation.answer, config.expectedAnswerKeywords) &&
				containsNone(observation.answer, forbiddenAnswerKeywords);
	const crossScopeSafety = containsNone(allObservedText, forbiddenScopeKeywords);
	const maxStoredFacts =
		config.expectedMaxStoredFacts === undefined ||
		observation.storedFacts.length <= config.expectedMaxStoredFacts;

	const metrics: EvalScenarioMetrics = {
		storedFactRecall,
		storedFactPrecision,
		recallToolUsage,
		retrievalTop1,
		retrievalTop3,
		recallPrecision,
		answerAccuracy,
		crossScopeSafety,
		maxStoredFacts,
		endToEnd:
			storedFactRecall &&
			storedFactPrecision &&
			recallPrecision &&
			answerAccuracy &&
			crossScopeSafety &&
			maxStoredFacts &&
			observation.crossThreadErrors.length === 0,
	};

	return {
		metrics,
		failedMetrics: Object.entries(metrics)
			.filter(([, passed]) => !passed)
			.map(([name]) => name as keyof EvalScenarioMetrics),
		forbiddenStoredKeywords,
		forbiddenRecallKeywords,
		forbiddenAnswerKeywords,
		forbiddenScopeKeywords,
	};
}
