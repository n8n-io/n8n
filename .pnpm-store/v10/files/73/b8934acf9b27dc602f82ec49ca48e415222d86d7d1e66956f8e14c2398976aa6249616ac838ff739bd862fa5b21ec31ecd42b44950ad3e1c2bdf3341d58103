/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Object Detection inference
 */
export interface ObjectDetectionInput {
	/**
	 * The input image data as a base64-encoded string. If no `parameters` are provided, you can
	 * also provide the image data as a raw bytes payload.
	 */
	inputs: Blob;
	/**
	 * Additional inference parameters for Object Detection
	 */
	parameters?: ObjectDetectionParameters;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Object Detection
 */
export interface ObjectDetectionParameters {
	/**
	 * The probability necessary to make a prediction.
	 */
	threshold?: number;
	[property: string]: unknown;
}
/**
 * The predicted bounding box. Coordinates are relative to the top left corner of the input
 * image.
 */
export interface BoundingBox {
	/**
	 * The x-coordinate of the bottom-right corner of the bounding box.
	 */
	xmax: number;
	/**
	 * The x-coordinate of the top-left corner of the bounding box.
	 */
	xmin: number;
	/**
	 * The y-coordinate of the bottom-right corner of the bounding box.
	 */
	ymax: number;
	/**
	 * The y-coordinate of the top-left corner of the bounding box.
	 */
	ymin: number;
	[property: string]: unknown;
}
export type ObjectDetectionOutput = ObjectDetectionOutputElement[];
/**
 * Outputs of inference for the Object Detection task
 */
export interface ObjectDetectionOutputElement {
	/**
	 * The predicted bounding box. Coordinates are relative to the top left corner of the input
	 * image.
	 */
	box: BoundingBox;
	/**
	 * The predicted label for the bounding box.
	 */
	label: string;
	/**
	 * The associated score / probability.
	 */
	score: number;
	[property: string]: unknown;
}
