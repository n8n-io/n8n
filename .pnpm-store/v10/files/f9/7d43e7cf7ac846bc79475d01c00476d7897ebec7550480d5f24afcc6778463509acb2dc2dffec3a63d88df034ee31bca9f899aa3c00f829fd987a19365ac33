/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Zero Shot Object Detection inference
 */
export interface ZeroShotObjectDetectionInput {
    /**
     * The input image data as a base64-encoded string.
     */
    inputs: Blob;
    /**
     * Additional inference parameters for Zero Shot Object Detection
     */
    parameters: ZeroShotObjectDetectionParameters;
    [property: string]: unknown;
}
/**
 * Additional inference parameters for Zero Shot Object Detection
 */
export interface ZeroShotObjectDetectionParameters {
    /**
     * The candidate labels for this image
     */
    candidate_labels: string[];
    [property: string]: unknown;
}
/**
 * The predicted bounding box. Coordinates are relative to the top left corner of the input
 * image.
 */
export interface BoundingBox {
    xmax: number;
    xmin: number;
    ymax: number;
    ymin: number;
    [property: string]: unknown;
}
export type ZeroShotObjectDetectionOutput = ZeroShotObjectDetectionOutputElement[];
/**
 * Outputs of inference for the Zero Shot Object Detection task
 */
export interface ZeroShotObjectDetectionOutputElement {
    /**
     * The predicted bounding box. Coordinates are relative to the top left corner of the input
     * image.
     */
    box: BoundingBox;
    /**
     * A candidate label
     */
    label: string;
    /**
     * The associated score / probability
     */
    score: number;
    [property: string]: unknown;
}
//# sourceMappingURL=inference.d.ts.map