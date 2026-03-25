/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Zero Shot Image Classification inference
 */
export interface ZeroShotImageClassificationInput {
	/**
	 * The input image data to classify as a base64-encoded string.
	 */
	inputs: Blob;
	/**
	 * Additional inference parameters for Zero Shot Image Classification
	 */
	parameters: ZeroShotImageClassificationParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Zero Shot Image Classification
 */
export interface ZeroShotImageClassificationParameters {
	/**
	 * The candidate labels for this image
	 */
	candidate_labels: string[];
	/**
	 * The sentence used in conjunction with `candidate_labels` to attempt the image
	 * classification by replacing the placeholder with the candidate labels.
	 */
	hypothesis_template?: string;
	[property: string]: unknown;
}
export type ZeroShotImageClassificationOutput = ZeroShotImageClassificationOutputElement[];
/**
 * Outputs of inference for the Zero Shot Image Classification task
 */
export interface ZeroShotImageClassificationOutputElement {
	/**
	 * The predicted class label.
	 */
	label: string;
	/**
	 * The corresponding probability.
	 */
	score: number;
	[property: string]: unknown;
}
