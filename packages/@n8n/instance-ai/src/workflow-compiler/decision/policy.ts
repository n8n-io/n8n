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

type Distribution = Readonly<Record<string, number>>;

function normalize(distribution: Distribution): Record<string, number> {
	const positive = Object.entries(distribution).filter(([, v]) => Number.isFinite(v) && v > 0);
	const total = positive.reduce((sum, [, value]) => sum + value, 0);
	if (total <= 0) return {};
	return Object.fromEntries(positive.map(([key, value]) => [key, value / total]));
}

function argmax(distribution: Distribution): { key: string; value: number } | null {
	let best: { key: string; value: number } | null = null;
	for (const [key, value] of Object.entries(distribution)) {
		if (best === null || value > best.value) best = { key, value };
	}
	return best;
}

const unavailable = (): ChoiceResolution => ({
	status: 'abstain',
	reason: 'unavailable',
	confidence: 0,
});

function resolveFromPrior(
	allowed: readonly string[],
	prior: Distribution | undefined,
	thresholds: DecisionThresholds,
): ChoiceResolution {
	if (!prior) return unavailable();
	const filtered = allowed
		.filter((option) => option in prior)
		.map((option): [string, number] => [option, prior[option]]);
	const best = argmax(normalize(Object.fromEntries(filtered)));
	if (!best) return unavailable();
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
	if (answer?.type !== 'choice') return resolveFromPrior(allowed, input.prior, thresholds);
	const { choice, confidence } = answer;
	if (choice === NONE_OF_THESE) {
		if (confidence >= thresholds.hint)
			return { status: 'abstain', reason: 'none_of_these', confidence };
		const listed = Object.entries(answer.probabilities).filter(([key]) => allowed.includes(key));
		const bestListed = argmax(Object.fromEntries(listed));
		return {
			status: 'abstain',
			reason: 'low_confidence',
			confidence: bestListed?.value ?? confidence,
			...(bestListed ? { best: bestListed.key } : {}),
		};
	}
	// Unknown category: fail closed rather than coerce.
	if (!allowed.includes(choice)) return unavailable();
	if (confidence >= thresholds.act)
		return { status: 'chosen', value: choice, confidence, source: 'decision' };
	return { status: 'abstain', reason: 'low_confidence', confidence, best: choice };
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
	const normalized = Object.values(normalize(answer.probabilities));
	return normalized.reduce((entropy, value) => entropy - value * Math.log2(value), 0);
}

export function isChoiceAnswer(answer: DecisionAnswer | undefined): answer is ChoiceAnswer {
	return answer?.type === 'choice';
}

export function isNoulAnswer(answer: DecisionAnswer | undefined): answer is NoulAnswer {
	return answer?.type === 'noul';
}
