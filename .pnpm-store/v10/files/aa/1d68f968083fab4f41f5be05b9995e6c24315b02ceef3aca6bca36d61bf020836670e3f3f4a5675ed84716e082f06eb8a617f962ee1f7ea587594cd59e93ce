/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Image Segmentation inference
 */
export interface ImageSegmentationInput {
    /**
     * The input image data as a base64-encoded string. If no `parameters` are provided, you can
     * also provide the image data as a raw bytes payload.
     */
    inputs: Blob;
    /**
     * Additional inference parameters for Image Segmentation
     */
    parameters?: ImageSegmentationParameters;
    [property: string]: unknown;
}
/**
 * Additional inference parameters for Image Segmentation
 */
export interface ImageSegmentationParameters {
    /**
     * Threshold to use when turning the predicted masks into binary values.
     */
    mask_threshold?: number;
    /**
     * Mask overlap threshold to eliminate small, disconnected segments.
     */
    overlap_mask_area_threshold?: number;
    /**
     * Segmentation task to be performed, depending on model capabilities.
     */
    subtask?: ImageSegmentationSubtask;
    /**
     * Probability threshold to filter out predicted masks.
     */
    threshold?: number;
    [property: string]: unknown;
}
/**
 * Segmentation task to be performed, depending on model capabilities.
 */
export type ImageSegmentationSubtask = "instance" | "panoptic" | "semantic";
export type ImageSegmentationOutput = ImageSegmentationOutputElement[];
/**
 * Outputs of inference for the Image Segmentation task
 *
 * A predicted mask / segment
 */
export interface ImageSegmentationOutputElement {
    /**
     * The label of the predicted segment.
     */
    label: string;
    /**
     * The corresponding mask as a black-and-white image (base64-encoded).
     */
    mask: string;
    /**
     * The score or confidence degree the model has.
     */
    score?: number;
    [property: string]: unknown;
}
//# sourceMappingURL=inference.d.ts.map