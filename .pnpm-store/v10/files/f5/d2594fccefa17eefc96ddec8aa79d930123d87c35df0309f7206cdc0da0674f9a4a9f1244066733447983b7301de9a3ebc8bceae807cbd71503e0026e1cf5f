import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { makeRequestOptions } from "../../lib/makeRequestOptions.js";
import { innerRequest } from "../../utils/request.js";
export async function textToImage(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "text-to-image");
    const { data: res } = await innerRequest(args, providerHelper, {
        ...options,
        task: "text-to-image",
    });
    const { url, info } = await makeRequestOptions(args, providerHelper, { ...options, task: "text-to-image" });
    return providerHelper.getResponse(res, url, info.headers, options?.outputType);
}
