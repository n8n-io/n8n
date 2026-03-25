import type { FeatureExtractionInput } from "@huggingface/tasks";
import type { BaseArgs, Options } from "../../types.js";
interface FeatureExtractionOAICompatInput {
    encoding_format?: "float" | "base64";
    dimensions?: number | null;
}
export type FeatureExtractionArgs = BaseArgs & FeatureExtractionInput & FeatureExtractionOAICompatInput;
/**
 * Returned values are a multidimensional array of floats (dimension depending on if you sent a string or a list of string, and if the automatic reduction, usually mean_pooling for instance was applied for you or not. This should be explained on the model's README).
 */
export type FeatureExtractionOutput = (number | number[] | number[][])[];
/**
 * This task reads some text and outputs raw float values, that are usually consumed as part of a semantic database/semantic search.
 */
export declare function featureExtraction(args: FeatureExtractionArgs, options?: Options): Promise<FeatureExtractionOutput>;
export {};
//# sourceMappingURL=featureExtraction.d.ts.map