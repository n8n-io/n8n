/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Audio Classification inference
 */
export interface AudioClassificationInput {
	/**
	 * The input audio data as a base64-encoded string. If no `parameters` are provided, you can
	 * also provide the audio data as a raw bytes payload.
	 */
	inputs: Blob;
	/**
	 * Additional inference parameters for Audio Classification
	 */
	parameters?: AudioClassificationParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Audio Classification
 */
export interface AudioClassificationParameters {
	/**
	 * The function to apply to the model outputs in order to retrieve the scores.
	 */
	function_to_apply?: ClassificationOutputTransform;
	/**
	 * When specified, limits the output to the top K most probable classes.
	 */
	top_k?: number;
	[property: string]: unknown;
}
/**
 * The function to apply to the model outputs in order to retrieve the scores.
 */
export type ClassificationOutputTransform = "sigmoid" | "softmax" | "none";
export type AudioClassificationOutput = AudioClassificationOutputElement[];
/**
 * Outputs for Audio Classification inference
 */
export interface AudioClassificationOutputElement {
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
