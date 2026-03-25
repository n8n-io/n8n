/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Video Classification inference
 */
export interface VideoClassificationInput {
	/**
	 * The input video data
	 */
	inputs: unknown;
	/**
	 * Additional inference parameters for Video Classification
	 */
	parameters?: VideoClassificationParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Video Classification
 */
export interface VideoClassificationParameters {
	/**
	 * The sampling rate used to select frames from the video.
	 */
	frame_sampling_rate?: number;
	/**
	 * The function to apply to the model outputs in order to retrieve the scores.
	 */
	function_to_apply?: ClassificationOutputTransform;
	/**
	 * The number of sampled frames to consider for classification.
	 */
	num_frames?: number;
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
export type VideoClassificationOutput = VideoClassificationOutputElement[];
/**
 * Outputs of inference for the Video Classification task
 */
export interface VideoClassificationOutputElement {
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
