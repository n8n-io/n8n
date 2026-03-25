import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * Tries to fill in a hole with a missing word (token to be precise). That’s the base task for BERT models.
 */
export async function fillMask(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "fill-mask");
    const { data: res } = await innerRequest(args, providerHelper, {
        ...options,
        task: "fill-mask",
    });
    return providerHelper.getResponse(res);
}
