import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * Predicts target label for a given set of features in tabular form.
 * Typically, you will want to train a classification model on your training data and use it with your new data of the same format.
 * Example model: vvmnnnkv/wine-quality
 */
export async function tabularClassification(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "tabular-classification");
    const { data: res } = await innerRequest(args, providerHelper, {
        ...options,
        task: "tabular-classification",
    });
    return providerHelper.getResponse(res);
}
