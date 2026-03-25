/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Visual Question Answering inference
 */
export interface VisualQuestionAnsweringInput {
    /**
     * One (image, question) pair to answer
     */
    inputs: VisualQuestionAnsweringInputData;
    /**
     * Additional inference parameters for Visual Question Answering
     */
    parameters?: VisualQuestionAnsweringParameters;
    [property: string]: unknown;
}
/**
 * One (image, question) pair to answer
 */
export interface VisualQuestionAnsweringInputData {
    /**
     * The image.
     */
    image: unknown;
    /**
     * The question to answer based on the image.
     */
    question: string;
    [property: string]: unknown;
}
/**
 * Additional inference parameters for Visual Question Answering
 */
export interface VisualQuestionAnsweringParameters {
    /**
     * The number of answers to return (will be chosen by order of likelihood). Note that we
     * return less than topk answers if there are not enough options available within the
     * context.
     */
    top_k?: number;
    [property: string]: unknown;
}
export type VisualQuestionAnsweringOutput = VisualQuestionAnsweringOutputElement[];
/**
 * Outputs of inference for the Visual Question Answering task
 */
export interface VisualQuestionAnsweringOutputElement {
    /**
     * The answer to the question
     */
    answer?: string;
    /**
     * The associated score / probability
     */
    score: number;
    [property: string]: unknown;
}
//# sourceMappingURL=inference.d.ts.map