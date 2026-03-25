import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * Usually used for sentiment-analysis this will output the likelihood of classes of an input. Recommended model: distilbert-base-uncased-finetuned-sst-2-english
 */
export async function textClassification(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "text-classification");
    const { data: res } = await innerRequest(args, providerHelper, {
        ...options,
        task: "text-classification",
    });
    return providerHelper.getResponse(res);
}
