/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
export type SentenceSimilarityOutput = number[];
/**
 * Inputs for Sentence similarity inference
 */
export interface SentenceSimilarityInput {
	inputs: SentenceSimilarityInputData;
	/**
	 * Additional inference parameters for Sentence Similarity
	 */
	parameters?: {
		[key: string]: unknown;
	};
	[property: string]: unknown;
}
export interface SentenceSimilarityInputData {
	/**
	 * A list of strings which will be compared against the source_sentence.
	 */
	sentences: string[];
	/**
	 * The string that you wish to compare the other strings with. This can be a phrase,
	 * sentence, or longer passage, depending on the model being used.
	 */
	source_sentence: string;
	[property: string]: unknown;
}
