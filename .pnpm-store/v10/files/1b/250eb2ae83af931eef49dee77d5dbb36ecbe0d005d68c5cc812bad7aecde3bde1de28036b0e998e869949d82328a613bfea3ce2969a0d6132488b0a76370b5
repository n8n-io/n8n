import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
import { preparePayload } from "./utils.js";
/**
 * This task reads some image input and outputs the text caption.
 */
export async function imageToText(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "image-to-text");
    const payload = preparePayload(args);
    const { data: res } = await innerRequest(payload, providerHelper, {
        ...options,
        task: "image-to-text",
    });
    return providerHelper.getResponse(res[0]);
}
