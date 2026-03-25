/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Image To Image inference
 */
export interface ImageToImageInput {
	/**
	 * The input image data as a base64-encoded string. If no `parameters` are provided, you can
	 * also provide the image data as a raw bytes payload.
	 */
	inputs: Blob;
	/**
	 * Additional inference parameters for Image To Image
	 */
	parameters?: ImageToImageParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Image To Image
 */
export interface ImageToImageParameters {
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
	 * The text prompt to guide the image generation.
	 */
	prompt?: string;
	/**
	 * The size in pixel of the output image.
	 */
	target_size?: TargetSize;
	[property: string]: unknown;
}
/**
 * The size in pixel of the output image.
 */
export interface TargetSize {
	height: number;
	width: number;
	[property: string]: unknown;
}
/**
 * Outputs of inference for the Image To Image task
 */
export interface ImageToImageOutput {
	/**
	 * The output image returned as raw bytes in the payload.
	 */
	image?: unknown;
	[property: string]: unknown;
}
