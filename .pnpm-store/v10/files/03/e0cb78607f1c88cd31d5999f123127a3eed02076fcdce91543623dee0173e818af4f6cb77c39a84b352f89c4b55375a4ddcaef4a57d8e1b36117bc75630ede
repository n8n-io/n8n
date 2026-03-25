import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { preparePayload } from "./utils.js";
/**
 * This task reads some audio input and outputs the likelihood of classes.
 * Recommended model:  superb/hubert-large-superb-er
 */
export async function audioClassification(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "audio-classification");
    const payload = preparePayload(args);
    const { data: res } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "audio-classification",
    });
    return providerHelper.getResponse(res);
}
