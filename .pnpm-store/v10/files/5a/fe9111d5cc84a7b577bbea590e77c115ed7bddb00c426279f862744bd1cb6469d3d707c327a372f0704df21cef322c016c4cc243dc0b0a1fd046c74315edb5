/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
export type FeatureExtractionOutput = Array<number[]>;
/**
 * Feature Extraction Input.
 *
 * Auto-generated from TEI specs.
 * For more details, check out
 * https://github.com/huggingface/huggingface.js/blob/main/packages/tasks/scripts/inference-tei-import.ts.
 */
export interface FeatureExtractionInput {
	/**
	 * The text or list of texts to embed.
	 */
	inputs: FeatureExtractionInputs;
	normalize?: boolean;
	/**
	 * The name of the prompt that should be used by for encoding. If not set, no prompt
	 * will be applied.
	 *
	 * Must be a key in the `sentence-transformers` configuration `prompts` dictionary.
	 *
	 * For example if ``prompt_name`` is "query" and the ``prompts`` is {"query": "query: ",
	 * ...},
	 * then the sentence "What is the capital of France?" will be encoded as
	 * "query: What is the capital of France?" because the prompt text will be prepended before
	 * any text to encode.
	 */
	prompt_name?: string;
	truncate?: boolean;
	truncation_direction?: FeatureExtractionInputTruncationDirection;
	[property: string]: unknown;
}
/**
 * The text or list of texts to embed.
 */
export type FeatureExtractionInputs = string[] | string;
export type FeatureExtractionInputTruncationDirection = "Left" | "Right";
