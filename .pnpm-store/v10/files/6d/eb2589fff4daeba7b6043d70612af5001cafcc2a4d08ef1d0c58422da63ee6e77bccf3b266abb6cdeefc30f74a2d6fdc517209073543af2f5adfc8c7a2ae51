import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { getLogger } from "../../lib/logger.js";
/**
 * Primitive to make custom calls to the inference provider
 * @deprecated Use specific task functions instead. This function will be removed in a future version.
 */
export async function request(args, options) {
    const logger = getLogger();
    logger.warn("The request method is deprecated and will be removed in a future version of huggingface.js. Use specific task functions instead.");
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, options?.task);
    const result = await innerRequest(args, providerHelper, options);
    return result.data;
}
