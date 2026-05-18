import type {
	MemoryEvalFinalAnswer,
	MemoryEvalMetric,
	MemoryEvalMetricName,
	MemoryEvalObservation,
	MemoryEvalScenario,
	MemoryEvalScorecard,
} from './types';

interface ScoreMemoryEvalInput {
	scenario: MemoryEvalScenario;
	observations: MemoryEvalObservation[];
	finalAnswers: MemoryEvalFinalAnswer[];
}

function normalizeText(value: string): string {
	return value
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

function includesTerm(text: string, term: string): boolean {
	const normalizedText = normalizeText(text);
	const normalizedTerm = normalizeText(term);
	return normalizedTerm.length > 0 && normalizedText.includes(normalizedTerm);
}

function textMatchesAnyTerm(text: string, terms: string[]): boolean {
	return terms.some((term) => includesTerm(text, term) || includesTerm(term, text));
}

function termsFoundInText(terms: string[], text: string): string[] {
	return terms.filter((term) => includesTerm(text, term));
}

function termsMissingFromText(terms: string[], text: string): string[] {
	return terms.filter((term) => !includesTerm(text, term));
}

function ratioMetric(
	numerator: number,
	denominator: number,
	options?: Pick<MemoryEvalMetric, 'matched' | 'missing' | 'notes'>,
): MemoryEvalMetric {
	return {
		score: denominator === 0 ? 1 : numerator / denominator,
		numerator,
		denominator,
		...options,
	};
}

function joinObservationText(observations: MemoryEvalObservation[]): string {
	return observations.map((observation) => observation.text).join('\n');
}

function joinAnswerText(finalAnswers: MemoryEvalFinalAnswer[]): string {
	return finalAnswers.map((answer) => answer.answer).join('\n');
}

function scoreActiveFactRecall(
	scenario: MemoryEvalScenario,
	activeObservations: MemoryEvalObservation[],
): MemoryEvalMetric {
	const activeText = joinObservationText(activeObservations);
	const matched = termsFoundInText(scenario.oracle.activeFacts, activeText);
	const missing = termsMissingFromText(scenario.oracle.activeFacts, activeText);
	return ratioMetric(matched.length, scenario.oracle.activeFacts.length, { matched, missing });
}

function scoreActiveFactPrecision(
	scenario: MemoryEvalScenario,
	activeObservations: MemoryEvalObservation[],
): MemoryEvalMetric {
	const relevantTerms = [...scenario.oracle.activeFacts, ...scenario.oracle.exactTerms];
	const matched = activeObservations
		.filter((observation) => textMatchesAnyTerm(observation.text, relevantTerms))
		.map((observation) => observation.id);
	const missing = activeObservations
		.filter((observation) => !matched.includes(observation.id))
		.map((observation) => observation.text);

	return ratioMetric(matched.length, activeObservations.length, { matched, missing });
}

function scoreStaleFactSuppression(
	scenario: MemoryEvalScenario,
	activeObservations: MemoryEvalObservation[],
	finalAnswers: MemoryEvalFinalAnswer[],
): MemoryEvalMetric {
	const surfacedText = `${joinObservationText(activeObservations)}\n${joinAnswerText(finalAnswers)}`;
	const leaked = termsFoundInText(scenario.oracle.staleFacts, surfacedText);
	const suppressed = termsMissingFromText(scenario.oracle.staleFacts, surfacedText);
	return ratioMetric(suppressed.length, scenario.oracle.staleFacts.length, {
		matched: suppressed,
		missing: leaked,
	});
}

function scoreExactIdentifierRecall(
	scenario: MemoryEvalScenario,
	activeObservations: MemoryEvalObservation[],
): MemoryEvalMetric {
	const activeText = joinObservationText(activeObservations);
	const matched = termsFoundInText(scenario.oracle.exactTerms, activeText);
	const missing = termsMissingFromText(scenario.oracle.exactTerms, activeText);
	return ratioMetric(matched.length, scenario.oracle.exactTerms.length, { matched, missing });
}

function scoreLifecycleAccuracy(
	scenario: MemoryEvalScenario,
	observations: MemoryEvalObservation[],
): MemoryEvalMetric {
	const expectations = scenario.oracle.lifecycle ?? [];
	if (expectations.length === 0) {
		return ratioMetric(0, 0, { notes: ['No lifecycle expectations for this scenario.'] });
	}

	const matched: string[] = [];
	const missing: string[] = [];
	for (const expectation of expectations) {
		const found = observations.some(
			(observation) =>
				observation.status === expectation.status &&
				includesTerm(observation.text, expectation.text),
		);
		if (found) {
			matched.push(`${expectation.status}: ${expectation.text}`);
		} else {
			missing.push(`${expectation.status}: ${expectation.text}`);
		}
	}

	return ratioMetric(matched.length, expectations.length, { matched, missing });
}

function scoreContaminationRate(
	scenario: MemoryEvalScenario,
	activeObservations: MemoryEvalObservation[],
	finalAnswers: MemoryEvalFinalAnswer[],
): MemoryEvalMetric {
	const surfacedText = `${joinObservationText(activeObservations)}\n${joinAnswerText(finalAnswers)}`;
	const leaked = termsFoundInText(scenario.oracle.forbiddenFacts, surfacedText);
	const clean = termsMissingFromText(scenario.oracle.forbiddenFacts, surfacedText);
	return ratioMetric(clean.length, scenario.oracle.forbiddenFacts.length, {
		matched: clean,
		missing: leaked,
	});
}

function scoreFinalAnswerCorrectness(
	scenario: MemoryEvalScenario,
	finalAnswers: MemoryEvalFinalAnswer[],
): MemoryEvalMetric {
	const answersById = new Map(finalAnswers.map((answer) => [answer.questionId, answer.answer]));
	const matched: string[] = [];
	const missing: string[] = [];

	for (const question of scenario.finalQuestions) {
		const answer = answersById.get(question.id) ?? '';
		const expectedTerms = question.expectedAnswerTerms ?? [];
		const forbiddenTerms = question.forbiddenAnswerTerms ?? [];
		const hasExpectedTerms = termsMissingFromText(expectedTerms, answer).length === 0;
		const hasForbiddenTerms = termsFoundInText(forbiddenTerms, answer).length > 0;
		if (hasExpectedTerms && !hasForbiddenTerms) {
			matched.push(question.id);
		} else {
			missing.push(question.id);
		}
	}

	return ratioMetric(matched.length, scenario.finalQuestions.length, { matched, missing });
}

function scoreAnswerFaithfulness(
	scenario: MemoryEvalScenario,
	activeObservations: MemoryEvalObservation[],
	finalAnswers: MemoryEvalFinalAnswer[],
): MemoryEvalMetric {
	const activeText = joinObservationText(activeObservations);
	const answerText = joinAnswerText(finalAnswers);
	const unsupported: string[] = [];
	const supported: string[] = [];

	for (const question of scenario.finalQuestions) {
		for (const term of question.expectedAnswerTerms ?? []) {
			if (!includesTerm(answerText, term)) continue;
			if (includesTerm(activeText, term)) {
				supported.push(term);
			} else {
				unsupported.push(term);
			}
		}
	}

	const leakedTerms = termsFoundInText(
		[...scenario.oracle.staleFacts, ...scenario.oracle.forbiddenFacts],
		answerText,
	);
	const denominator = supported.length + unsupported.length + leakedTerms.length;
	const numerator = supported.length;

	if (denominator === 0) {
		return ratioMetric(0, 0, { notes: ['No answer terms required memory support.'] });
	}

	return ratioMetric(numerator, denominator, {
		matched: supported,
		missing: [...unsupported, ...leakedTerms],
	});
}

function averageMetricScores(metrics: Record<MemoryEvalMetricName, MemoryEvalMetric>): number {
	const scores = Object.values(metrics).map((metric) => metric.score);
	return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function scoreMemoryEval(input: ScoreMemoryEvalInput): MemoryEvalScorecard {
	const activeObservations = input.observations.filter(
		(observation) => observation.status === 'active',
	);
	const metrics: Record<MemoryEvalMetricName, MemoryEvalMetric> = {
		activeFactRecall: scoreActiveFactRecall(input.scenario, activeObservations),
		activeFactPrecision: scoreActiveFactPrecision(input.scenario, activeObservations),
		staleFactSuppression: scoreStaleFactSuppression(
			input.scenario,
			activeObservations,
			input.finalAnswers,
		),
		exactIdentifierRecall: scoreExactIdentifierRecall(input.scenario, activeObservations),
		lifecycleAccuracy: scoreLifecycleAccuracy(input.scenario, input.observations),
		contaminationRate: scoreContaminationRate(
			input.scenario,
			activeObservations,
			input.finalAnswers,
		),
		finalAnswerCorrectness: scoreFinalAnswerCorrectness(input.scenario, input.finalAnswers),
		answerFaithfulness: scoreAnswerFaithfulness(
			input.scenario,
			activeObservations,
			input.finalAnswers,
		),
	};

	return {
		scenarioId: input.scenario.id,
		metrics,
		overall: averageMetricScores(metrics),
	};
}
