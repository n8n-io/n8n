import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * This task takes an image and text input and outputs a new generated image.
 * Recommended model: black-forest-labs/FLUX.2-dev
 */
export async function imageTextToImage(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "image-text-to-image");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res, requestContext } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "image-text-to-image",
    });
    return providerHelper.getResponse(res, requestContext.url, requestContext.info.headers);
}
