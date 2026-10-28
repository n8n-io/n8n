import type {
	DecisionAnswer,
	DecisionQuestion,
	DecisionRequest,
	DecisionResponse,
	DecisionUsage,
	JSONObject,
} from '@n8n/ai-utilities';

/**
 * Translation between the provider-neutral Decision Model contract and the
 * TypeSafe System One wire format.
 *
 * TypeSafe calls a probabilistic yes/no question a "noul". The generic contract
 * calls it a boolean probability, so users of the Decision node never meet the
 * provider's vocabulary.
 */

export type TypeSafeQuestion =
	| { type: 'choice'; instructions: string; criteria: Record<string, string | null> }
	| { type: 'score'; instructions: string; criteria: string[] }
	| { type: 'noul'; instructions: string; criteria?: { true?: string; false?: string } };

interface TypeSafeChoiceAnswer {
	type: 'choice';
	choice: string;
	probabilities?: Record<string, number>;
	confidence?: number;
}

interface TypeSafeScoreAnswer {
	type: 'score';
	score: number;
	legend?: Record<string, string>;
	probabilities?: Record<string, number>;
	confidence?: number;
}

interface TypeSafeNoulAnswer {
	type: 'noul';
	noul: number;
}

export type TypeSafeAnswer = TypeSafeChoiceAnswer | TypeSafeScoreAnswer | TypeSafeNoulAnswer;

export interface TypeSafeSystemOneResponse {
	model?: string;
	answers?: Record<string, TypeSafeAnswer>;
	usage?: { input_tokens?: number; output_tokens?: number };
}

/** Probability at or above which a boolean probability reads as true. */
const BOOLEAN_MIDPOINT = 0.5;

export function toTypeSafeQuestion(question: DecisionQuestion): TypeSafeQuestion {
	switch (question.type) {
		case 'choice':
			return {
				type: 'choice',
				instructions: question.instructions,
				criteria: Object.fromEntries(
					question.options.map((option) => [option.value, option.description ?? null]),
				),
			};

		case 'score':
			return {
				type: 'score',
				instructions: question.instructions,
				criteria: question.levels,
			};

		case 'booleanProbability':
			return {
				type: 'noul',
				instructions: question.instructions,
				...(question.criteria === undefined ? {} : { criteria: question.criteria }),
			};
	}
}

export function toTypeSafeQuestions(
	questions: DecisionRequest['questions'],
): Record<string, TypeSafeQuestion> {
	return Object.fromEntries(
		Object.entries(questions).map(([id, question]) => [id, toTypeSafeQuestion(question)]),
	);
}

/** Returns `undefined` for an answer type this provider adapter does not know. */
function toDecisionAnswer(answer: TypeSafeAnswer): DecisionAnswer | undefined {
	switch (answer.type) {
		case 'choice':
			return {
				type: 'choice',
				value: answer.choice,
				...(answer.confidence === undefined ? {} : { confidence: answer.confidence }),
				...(answer.probabilities === undefined ? {} : { probabilities: answer.probabilities }),
			};

		case 'score':
			return {
				type: 'score',
				value: answer.score,
				...(answer.confidence === undefined ? {} : { confidence: answer.confidence }),
				...(answer.probabilities === undefined ? {} : { probabilities: answer.probabilities }),
				...(answer.legend === undefined ? {} : { legend: answer.legend }),
			};

		case 'noul':
			return {
				type: 'booleanProbability',
				value: answer.noul >= BOOLEAN_MIDPOINT,
				probability: answer.noul,
			};

		default:
			return undefined;
	}
}

function toUsage(usage: TypeSafeSystemOneResponse['usage']): DecisionUsage | undefined {
	if (!usage) return undefined;

	const normalized: DecisionUsage = {
		...(usage.input_tokens === undefined ? {} : { inputTokens: usage.input_tokens }),
		...(usage.output_tokens === undefined ? {} : { outputTokens: usage.output_tokens }),
	};

	return Object.keys(normalized).length === 0 ? undefined : normalized;
}

export function toDecisionResponse(body: TypeSafeSystemOneResponse): DecisionResponse {
	const answers = body.answers ?? {};
	const decisions: Record<string, DecisionAnswer> = {};

	for (const [id, answer] of Object.entries(answers)) {
		const decision = toDecisionAnswer(answer);
		if (decision !== undefined) {
			decisions[id] = decision;
		}
	}

	const usage = toUsage(body.usage);

	return {
		decisions,
		...(body.model === undefined ? {} : { model: body.model }),
		...(usage === undefined ? {} : { usage }),
		// Keeps TypeSafe's own wording, including `noul`, available for debugging
		// without any downstream node having to know it.
		providerMetadata: { answers: answers as unknown as JSONObject },
	};
}
