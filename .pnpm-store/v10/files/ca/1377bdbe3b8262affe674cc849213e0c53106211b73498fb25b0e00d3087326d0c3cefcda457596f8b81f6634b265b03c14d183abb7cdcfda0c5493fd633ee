import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { makeRequestOptions } from "../../lib/makeRequestOptions.js";
/**
 * This task reads some image input and outputs the likelihood of classes & bounding boxes of detected objects.
 * Recommended model: facebook/detr-resnet-50-panoptic
 */
export async function imageSegmentation(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "image-segmentation");
    const payload = await providerHelper.preparePayloadAsync(args);
    const { data: res } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "image-segmentation",
    });
    const { url, info } = await makeRequestOptions(args, providerHelper, { ...options, task: "image-segmentation" });
    return providerHelper.getResponse(res, url, info.headers);
}
