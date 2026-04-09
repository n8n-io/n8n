import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { makeRequestOptions } from "../../lib/makeRequestOptions.js";
/**
 * This task reads some text input and outputs an image.
 * Recommended model: Wan-AI/Wan2.1-I2V-14B-720P
 */
export async function imageToVideo(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "image-to-video");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "image-to-video",
    });
    const { url, info } = await makeRequestOptions(args, providerHelper, { ...options, task: "image-to-video" });
    return providerHelper.getResponse(res, url, info.headers);
}
