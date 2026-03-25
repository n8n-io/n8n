/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Fill Mask inference
 */
export interface FillMaskInput {
	/**
	 * The text with masked tokens
	 */
	inputs: string;
	/**
	 * Additional inference parameters for Fill Mask
	 */
	parameters?: FillMaskParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Fill Mask
 */
export interface FillMaskParameters {
	/**
	 * When passed, the model will limit the scores to the passed targets instead of looking up
	 * in the whole vocabulary. If the provided targets are not in the model vocab, they will be
	 * tokenized and the first resulting token will be used (with a warning, and that might be
	 * slower).
	 */
	targets?: string[];
	/**
	 * When passed, overrides the number of predictions to return.
	 */
	top_k?: number;
	[property: string]: unknown;
}
export type FillMaskOutput = FillMaskOutputElement[];
/**
 * Outputs of inference for the Fill Mask task
 */
export interface FillMaskOutputElement {
	/**
	 * The corresponding probability
	 */
	score: number;
	/**
	 * The corresponding input with the mask token prediction.
	 */
	sequence: string;
	/**
	 * The predicted token id (to replace the masked one).
	 */
	token: number;
	tokenStr: unknown;
	/**
	 * The predicted token (to replace the masked one).
	 */
	token_str?: string;
	[property: string]: unknown;
}
