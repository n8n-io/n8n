import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * This task reads some text and outputs raw float values, that are usually consumed as part of a semantic database/semantic search.
 */
export async function featureExtraction(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "feature-extraction");
    const { data: res } = await innerRequest(args, providerHelper, {
        ...options,
        task: "feature-extraction",
    });
    return providerHelper.getResponse(res);
}
