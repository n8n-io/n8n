/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Image Text To Image inference. Either inputs (image) or prompt (in parameters)
 * must be provided, or both.
 */
export interface ImageTextToImageInput {
	/**
	 * The input image data as a base64-encoded string. If no `parameters` are provided, you can
	 * also provide the image data as a raw bytes payload. Either this or prompt must be
	 * provided.
	 */
	inputs?: Blob;
	/**
	 * Additional inference parameters for Image Text To Image
	 */
	parameters?: ImageTextToImageParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Image Text To Image
 */
export interface ImageTextToImageParameters {
	/**
	 * For diffusion models. A higher guidance scale value encourages the model to generate
	 * images closely linked to the text prompt at the expense of lower image quality.
	 */
	guidance_scale?: number;
	/**
	 * One prompt to guide what NOT to include in image generation.
	 */
	negative_prompt?: string;
	/**
	 * For diffusion models. The number of denoising steps. More denoising steps usually lead to
	 * a higher quality image at the expense of slower inference.
	 */
	num_inference_steps?: number;
	/**
	 * The text prompt to guide the image generation. Either this or inputs (image) must be
	 * provided.
	 */
	prompt?: string;
	/**
	 * Seed for the random number generator.
	 */
	seed?: number;
	/**
	 * The size in pixels of the output image. This parameter is only supported by some
	 * providers and for specific models. It will be ignored when unsupported.
	 */
	target_size?: TargetSize;
	[property: string]: unknown;
}
/**
 * The size in pixels of the output image. This parameter is only supported by some
 * providers and for specific models. It will be ignored when unsupported.
 */
export interface TargetSize {
	height: number;
	width: number;
	[property: string]: unknown;
}
/**
 * Outputs of inference for the Image Text To Image task
 */
export interface ImageTextToImageOutput {
	/**
	 * The generated image returned as raw bytes in the payload.
	 */
	image: unknown;
	[property: string]: unknown;
}
