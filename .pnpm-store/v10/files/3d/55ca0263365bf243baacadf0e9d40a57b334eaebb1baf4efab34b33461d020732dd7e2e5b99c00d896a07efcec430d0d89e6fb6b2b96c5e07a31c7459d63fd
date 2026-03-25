import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * This task is well known to translate text from one language to another. Recommended model: Helsinki-NLP/opus-mt-ru-en.
 */
export async function translation(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "translation");
    const { data: res } = await innerRequest(args, providerHelper, {
        ...options,
        task: "translation",
    });
    return providerHelper.getResponse(res);
}
