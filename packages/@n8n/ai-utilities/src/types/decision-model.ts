import type { JSONArray, JSONObject } from './json';

/**
 * Provider-neutral contract for decision models: models that evaluate a state
 * against typed questions and return calibrated, probabilistic answers.
 *
 * A decision model is not a chat model. It takes no messages, streams nothing,
 * and calls no tools. Keep provider vocabulary out of this file — a provider
 * adapter translates to and from its own wire format.
 */

/** The information a model evaluates. Structured state is passed through as JSON. */
export type DecisionState = string | JSONObject | JSONArray;

/** One selectable option of a choice question. */
export interface DecisionChoiceOption {
	/** Stable key returned as the answer value. */
	value: string;
	/** Rubric telling the model when this option applies. */
	description?: string;
}

/** Pick exactly one of a closed set of options. */
export interface ChoiceQuestion {
	type: 'choice';
	instructions: string;
	options: DecisionChoiceOption[];
}

/** Rate the state against an ordered rubric. Needs at least two levels. */
export interface ScoreQuestion {
	type: 'score';
	instructions: string;
	/** Level descriptions, lowest first. Index is the level number. */
	levels: string[];
}

/** Assess how likely an assertion about the state is to hold. */
export interface BooleanProbabilityQuestion {
	type: 'booleanProbability';
	instructions: string;
	/** Optional descriptions of what a true and a false answer mean. */
	criteria?: {
		true?: string;
		false?: string;
	};
}

export type DecisionQuestion = ChoiceQuestion | ScoreQuestion | BooleanProbabilityQuestion;

export type DecisionQuestionType = DecisionQuestion['type'];

export interface DecisionRequest {
	state: DecisionState;
	/** Questions keyed by caller-chosen ID. Answers come back under the same IDs. */
	questions: Record<string, DecisionQuestion>;
}

export interface ChoiceAnswer {
	type: 'choice';
	/** The selected option's `value`. */
	value: string;
	/** How certain the model is, 0 to 1. Not a probability of correctness. */
	confidence?: number;
	/** Probability per option value, as reported by the provider. */
	probabilities?: Record<string, number>;
}

export interface ScoreAnswer {
	type: 'score';
	/** Probability-weighted level. Can land between levels. */
	value: number;
	confidence?: number;
	/** Probability per level index, as reported by the provider. */
	probabilities?: Record<string, number>;
	/** Level index mapped back to its description. */
	legend?: Record<string, string>;
}

export interface BooleanProbabilityAnswer {
	type: 'booleanProbability';
	/** `probability` resolved against a 0.5 midpoint. Read `probability` to decide yourself. */
	value: boolean;
	/** Probability that the assertion holds, 0 to 1. */
	probability: number;
	confidence?: number;
}

export type DecisionAnswer = ChoiceAnswer | ScoreAnswer | BooleanProbabilityAnswer;

/** Normalized token counts. Providers that report neither omit this. */
export interface DecisionUsage {
	inputTokens?: number;
	outputTokens?: number;
}

export interface DecisionResponse {
	/** Answers keyed by the question IDs of the request. */
	decisions: Record<string, DecisionAnswer>;
	model?: string;
	usage?: DecisionUsage;
	/**
	 * Raw provider-specific detail, kept for debugging and provider-aware
	 * workflows. Never required to read the normalized answers.
	 */
	providerMetadata?: JSONObject;
}

export interface DecisionModel {
	/** Provider identifier, e.g. `typesafe`. */
	provider: string;
	/** Model identifier, e.g. `jev-latest`. */
	modelId: string;
	decide(request: DecisionRequest): Promise<DecisionResponse>;
}
