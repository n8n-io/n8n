/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Text To Image inference
 */
export interface TextToImageInput {
    /**
     * The input text data (sometimes called "prompt")
     */
    inputs: string;
    /**
     * Additional inference parameters for Text To Image
     */
    parameters?: TextToImageParameters;
    [property: string]: unknown;
}
/**
 * Additional inference parameters for Text To Image
 */
export interface TextToImageParameters {
    /**
     * A higher guidance scale value encourages the model to generate images closely linked to
     * the text prompt, but values too high may cause saturation and other artifacts.
     */
    guidance_scale?: number;
    /**
     * The height in pixels of the output image
     */
    height?: number;
    /**
     * One prompt to guide what NOT to include in image generation.
     */
    negative_prompt?: string;
    /**
     * The number of denoising steps. More denoising steps usually lead to a higher quality
     * image at the expense of slower inference.
     */
    num_inference_steps?: number;
    /**
     * Override the scheduler with a compatible one.
     */
    scheduler?: string;
    /**
     * Seed for the random number generator.
     */
    seed?: number;
    /**
     * The width in pixels of the output image
     */
    width?: number;
    [property: string]: unknown;
}
/**
 * Outputs of inference for the Text To Image task
 */
export interface TextToImageOutput {
    /**
     * The generated image returned as raw bytes in the payload.
     */
    image: unknown;
    [property: string]: unknown;
}
//# sourceMappingURL=inference.d.ts.map