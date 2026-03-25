/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Zero Shot Classification inference
 */
export interface ZeroShotClassificationInput {
    /**
     * The text to classify
     */
    inputs: string;
    /**
     * Additional inference parameters for Zero Shot Classification
     */
    parameters: ZeroShotClassificationParameters;
    [property: string]: unknown;
}
/**
 * Additional inference parameters for Zero Shot Classification
 */
export interface ZeroShotClassificationParameters {
    /**
     * The set of possible class labels to classify the text into.
     */
    candidate_labels: string[];
    /**
     * The sentence used in conjunction with `candidate_labels` to attempt the text
     * classification by replacing the placeholder with the candidate labels.
     */
    hypothesis_template?: string;
    /**
     * Whether multiple candidate labels can be true. If false, the scores are normalized such
     * that the sum of the label likelihoods for each sequence is 1. If true, the labels are
     * considered independent and probabilities are normalized for each candidate.
     */
    multi_label?: boolean;
    [property: string]: unknown;
}
export type ZeroShotClassificationOutput = ZeroShotClassificationOutputElement[];
/**
 * Outputs of inference for the Zero Shot Classification task
 */
export interface ZeroShotClassificationOutputElement {
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