/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Summarization inference
 */
export interface SummarizationInput {
	/**
	 * The input text to summarize.
	 */
	inputs: string;
	/**
	 * Additional inference parameters for summarization.
	 */
	parameters?: SummarizationParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for summarization.
 */
export interface SummarizationParameters {
	/**
	 * Whether to clean up the potential extra spaces in the text output.
	 */
	clean_up_tokenization_spaces?: boolean;
	/**
	 * Additional parametrization of the text generation algorithm.
	 */
	generate_parameters?: {
		[key: string]: unknown;
	};
	/**
	 * The truncation strategy to use.
	 */
	truncation?: SummarizationTruncationStrategy;
	[property: string]: unknown;
}
/**
 * The truncation strategy to use.
 */
export type SummarizationTruncationStrategy = "do_not_truncate" | "longest_first" | "only_first" | "only_second";
/**
 * Outputs of inference for the Summarization task
 */
export interface SummarizationOutput {
	/**
	 * The summarized text.
	 */
	summary_text: string;
	[property: string]: unknown;
}
