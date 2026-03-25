/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Text To Video inference
 */
export interface TextToVideoInput {
	/**
	 * The input text data (sometimes called "prompt")
	 */
	inputs: string;
	/**
	 * Additional inference parameters for Text To Video
	 */
	parameters?: TextToVideoParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Text To Video
 */
export interface TextToVideoParameters {
	/**
	 * A higher guidance scale value encourages the model to generate videos closely linked to
	 * the text prompt, but values too high may cause saturation and other artifacts.
	 */
	guidance_scale?: number;
	/**
	 * One or several prompt to guide what NOT to include in video generation.
	 */
	negative_prompt?: string[];
	/**
	 * The num_frames parameter determines how many video frames are generated.
	 */
	num_frames?: number;
	/**
	 * The number of denoising steps. More denoising steps usually lead to a higher quality
	 * video at the expense of slower inference.
	 */
	num_inference_steps?: number;
	/**
	 * Seed for the random number generator.
	 */
	seed?: number;
	[property: string]: unknown;
}
/**
 * Outputs of inference for the Text To Video task
 */
export interface TextToVideoOutput {
	/**
	 * The generated video returned as raw bytes in the payload.
	 */
	video: unknown;
	[property: string]: unknown;
}
