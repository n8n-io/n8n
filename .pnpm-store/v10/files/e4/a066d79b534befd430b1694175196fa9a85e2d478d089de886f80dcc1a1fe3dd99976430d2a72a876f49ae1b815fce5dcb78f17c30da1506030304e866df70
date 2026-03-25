import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * This task is well known to summarize longer text into shorter text. Be careful, some models have a maximum length of input. That means that the summary cannot handle full books for instance. Be careful when choosing your model.
 */
export async function summarization(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "summarization");
    const { data: res } = await innerRequest(args, providerHelper, {
        ...options,
        task: "summarization",
    });
    return providerHelper.getResponse(res);
}
