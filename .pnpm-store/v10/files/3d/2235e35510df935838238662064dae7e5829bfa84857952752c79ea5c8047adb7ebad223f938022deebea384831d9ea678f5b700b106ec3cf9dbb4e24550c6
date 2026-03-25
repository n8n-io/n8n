import type { FeatureExtractionInput } from "@huggingface/tasks";
import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import type { BaseArgs, Options } from "../../types.js";
import { innerRequest } from "../../utils/request.js";

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
export async function featureExtraction(
	args: FeatureExtractionArgs,
	options?: Options
): Promise<FeatureExtractionOutput> {
	const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
	const providerHelper = getProviderHelper(provider, "feature-extraction");
	const { data: res } = await innerRequest<FeatureExtractionOutput>(args, providerHelper, {
		...options,
		task: "feature-extraction",
	});
	return providerHelper.getResponse(res);
}
