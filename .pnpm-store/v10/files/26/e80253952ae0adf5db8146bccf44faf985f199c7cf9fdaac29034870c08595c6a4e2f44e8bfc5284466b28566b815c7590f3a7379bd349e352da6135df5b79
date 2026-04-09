import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * This task takes an image and text input and outputs a generated video.
 * Recommended model: Lightricks/LTX-Video
 */
export async function imageTextToVideo(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "image-text-to-video");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res, requestContext } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "image-text-to-video",
    });
    return providerHelper.getResponse(res, requestContext.url, requestContext.info.headers);
}
