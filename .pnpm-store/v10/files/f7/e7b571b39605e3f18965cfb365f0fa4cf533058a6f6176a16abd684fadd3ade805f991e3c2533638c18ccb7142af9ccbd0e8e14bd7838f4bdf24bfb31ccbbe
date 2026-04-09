import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { makeRequestOptions } from "../../lib/makeRequestOptions.js";
/**
 * This task reads some text input and outputs an image.
 * Recommended model: lllyasviel/sd-controlnet-depth
 */
export async function imageToImage(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "image-to-image");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "image-to-image",
    });
    const { url, info } = await makeRequestOptions(args, providerHelper, { ...options, task: "image-to-image" });
    return providerHelper.getResponse(res, url, info.headers);
}
