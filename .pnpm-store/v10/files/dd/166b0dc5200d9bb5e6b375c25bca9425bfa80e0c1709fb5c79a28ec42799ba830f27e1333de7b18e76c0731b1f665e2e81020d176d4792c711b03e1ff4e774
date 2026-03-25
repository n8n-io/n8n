import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { preparePayload } from "./utils.js";
/**
 * This task reads some image input and outputs the likelihood of classes & bounding boxes of detected objects.
 * Recommended model: facebook/detr-resnet-50
 */
export async function objectDetection(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "object-detection");
    const payload = preparePayload(args);
    const { data: res } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "object-detection",
    });
    return providerHelper.getResponse(res);
}
