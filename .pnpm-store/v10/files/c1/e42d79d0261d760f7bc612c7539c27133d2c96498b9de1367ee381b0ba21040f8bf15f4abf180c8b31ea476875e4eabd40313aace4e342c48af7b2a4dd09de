import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { makeRequestOptions } from "../../lib/makeRequestOptions.js";
import { innerRequest } from "../../utils/request.js";
export async function textToVideo(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "text-to-video");
    const { data: response } = await innerRequest(args, providerHelper, {
        ...options,
        task: "text-to-video",
    });
    const { url, info } = await makeRequestOptions(args, providerHelper, { ...options, task: "text-to-video" });
    return providerHelper.getResponse(response, url, info.headers);
}
