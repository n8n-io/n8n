import { NONE_OF_THESE, type ChoiceAnswer, type DecisionAnswer, type NoulAnswer } from './schemas';

/**
 * Deterministic decision policy. Model confidence is evidence, never
 * authorization: these helpers turn scored answers into an explicit
 * act / abstain outcome that the caller then combines with business rules.
 *
 * The thresholds are starting points. Calibrate them on a labeled set for the
 * deployed model and schema version before relying on them in production.
 */
export interface DecisionThresholds {
	/** Minimum confidence to act on a choice without a second look. */
	act: number;
	/** Minimum confidence to keep a choice as a hint (e.g. narrow retrieval). */
	hint: number;
	/** Minimum P(yes) to treat a noul answer as affirmative. */
	affirm: number;
	/** Maximum P(yes) to treat a noul answer as negative. */
	deny: number;
}

export const DEFAULT_DECISION_THRESHOLDS: DecisionThresholds = {
	act: 0.8,
	hint: 0.55,
	affirm: 0.8,
	deny: 0.2,
};

export type ChoiceResolution =
	| {
			status: 'chosen';
			value: string;
			confidence: number;
			source: 'decision' | 'prior' | 'only_option';
	  }
	| {
			status: 'abstain';
			reason: 'low_confidence' | 'none_of_these' | 'unavailable' | 'no_options';
			confidence: number;
			/** Best-scoring option when one exists, for narrowed follow-ups. */
			best?: string;
	  };

export interface ResolveChoiceInput {
	/** Options the caller allows. `none_of_these` is handled separately. */
	allowed: readonly string[];
	answer?: DecisionAnswer;
	/**
	 * Deterministic prior distribution (for example retrieval scores). Used when
	 * the decision service is unavailable and when it abstains with low
	 * confidence but the prior is decisive.
	 */
	prior?: Readonly<Record<string, number>>;
	thresholds?: Partial<DecisionThresholds>;
}

function normalize(distribution: Readonly<Record<string, number>>): Record<string, number> {
	let total = 0;
	for (const value of Object.values(distribution))
		if (Number.isFinite(value) && value > 0) total += value;
	if (total <= 0) return {};
	const result: Record<string, number> = {};
	for (const [key, value] of Object.entries(distribution)) {
		if (Number.isFinite(value) && value > 0) result[key] = value / total;
	}
	return result;
}

function argmax(
	distribution: Readonly<Record<string, number>>,
): { key: string; value: number } | null {
	let best: { key: string; value: number } | null = null;
	for (const [key, value] of Object.entries(distribution)) {
		if (best === null || value > best.value) best = { key, value };
	}
	return best;
}

function resolveFromPrior(
	allowed: readonly string[],
	prior: Readonly<Record<string, number>> | undefined,
	thresholds: DecisionThresholds,
): ChoiceResolution {
	if (!prior) return { status: 'abstain', reason: 'unavailable', confidence: 0 };
	const filtered: Record<string, number> = {};
	for (const option of allowed) if (option in prior) filtered[option] = prior[option];
	const normalized = normalize(filtered);
	const best = argmax(normalized);
	if (!best) return { status: 'abstain', reason: 'unavailable', confidence: 0 };
	if (best.value >= thresholds.act) {
		return { status: 'chosen', value: best.key, confidence: best.value, source: 'prior' };
	}
	return { status: 'abstain', reason: 'low_confidence', confidence: best.value, best: best.key };
}

/** Applies the choice policy: allowed set, abstention option, thresholds, prior fallback. */
export function resolveChoice(input: ResolveChoiceInput): ChoiceResolution {
	const thresholds = { ...DEFAULT_DECISION_THRESHOLDS, ...input.thresholds };
	const allowed = input.allowed.filter((option) => option !== NONE_OF_THESE);
	if (allowed.length === 0) return { status: 'abstain', reason: 'no_options', confidence: 0 };
	if (allowed.length === 1 && !input.answer) {
		return { status: 'chosen', value: allowed[0], confidence: 1, source: 'only_option' };
	}
	const answer = input.answer;
	if (answer?.type !== 'choice') {
		return resolveFromPrior(allowed, input.prior, thresholds);
	}
	if (answer.choice === NONE_OF_THESE) {
		if (answer.confidence >= thresholds.hint) {
			return { status: 'abstain', reason: 'none_of_these', confidence: answer.confidence };
		}
		const bestListed = argmax(
			Object.fromEntries(
				Object.entries(answer.probabilities).filter(([key]) => allowed.includes(key)),
			),
		);
		return {
			status: 'abstain',
			reason: 'low_confidence',
			confidence: bestListed?.value ?? answer.confidence,
			...(bestListed ? { best: bestListed.key } : {}),
		};
	}
	if (!allowed.includes(answer.choice)) {
		// Unknown category: fail closed rather than coerce.
		return { status: 'abstain', reason: 'unavailable', confidence: 0 };
	}
	if (answer.confidence >= thresholds.act) {
		return {
			status: 'chosen',
			value: answer.choice,
			confidence: answer.confidence,
			source: 'decision',
		};
	}
	return {
		status: 'abstain',
		reason: 'low_confidence',
		confidence: answer.confidence,
		best: answer.choice,
	};
}

export type NoulResolution = 'yes' | 'no' | 'uncertain';

/** Applies the yes/no policy to a noul answer. Missing answers are uncertain. */
export function resolveNoul(
	answer: DecisionAnswer | undefined,
	thresholds: Partial<DecisionThresholds> = {},
): NoulResolution {
	const merged = { ...DEFAULT_DECISION_THRESHOLDS, ...thresholds };
	if (answer?.type !== 'noul') return 'uncertain';
	if (answer.noul >= merged.affirm) return 'yes';
	if (answer.noul <= merged.deny) return 'no';
	return 'uncertain';
}

/** Shannon entropy of a choice answer in bits — high entropy marks a read worth repeating. */
export function choiceEntropy(answer: ChoiceAnswer): number {
	const normalized = normalize(answer.probabilities);
	let entropy = 0;
	for (const value of Object.values(normalized)) entropy -= value * Math.log2(value);
	return entropy;
}

export function isChoiceAnswer(answer: DecisionAnswer | undefined): answer is ChoiceAnswer {
	return answer?.type === 'choice';
}

export function isNoulAnswer(answer: DecisionAnswer | undefined): answer is NoulAnswer {
	return answer?.type === 'noul';
}
