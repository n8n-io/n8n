import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { preparePayload } from "./utils.js";
/**
 * This task reads some image input and outputs the likelihood of classes.
 * Recommended model: google/vit-base-patch16-224
 */
export async function imageClassification(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "image-classification");
    const payload = preparePayload(args);
    const { data: res } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "image-classification",
    });
    return providerHelper.getResponse(res);
}
