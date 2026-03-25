/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Image Classification inference
 */
export interface ImageClassificationInput {
    /**
     * The input image data as a base64-encoded string. If no `parameters` are provided, you can
     * also provide the image data as a raw bytes payload.
     */
    inputs: Blob;
    /**
     * Additional inference parameters for Image Classification
     */
    parameters?: ImageClassificationParameters;
    [property: string]: unknown;
}
/**
 * Additional inference parameters for Image Classification
 */
export interface ImageClassificationParameters {
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
export type ImageClassificationOutput = ImageClassificationOutputElement[];
/**
 * Outputs of inference for the Image Classification task
 */
export interface ImageClassificationOutputElement {
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
//# sourceMappingURL=inference.d.ts.map