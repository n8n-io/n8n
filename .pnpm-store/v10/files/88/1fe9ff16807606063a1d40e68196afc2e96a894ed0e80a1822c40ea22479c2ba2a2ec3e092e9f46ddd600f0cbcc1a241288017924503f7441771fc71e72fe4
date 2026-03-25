import { resolveProvider } from "../../lib/getInferenceProviderMapping.js";
import { getProviderHelper } from "../../lib/getProviderHelper.js";
import { innerRequest } from "../../utils/request.js";
/**
 * Predicts target value for a given set of features in tabular form.
 * Typically, you will want to train a regression model on your training data and use it with your new data of the same format.
 * Example model: scikit-learn/Fish-Weight
 */
export async function tabularRegression(args, options) {
    const provider = await resolveProvider(args.provider, args.model, args.endpointUrl);
    const providerHelper = getProviderHelper(provider, "tabular-regression");
    const { data: res } = await innerRequest(args, providerHelper, {
        ...options,
        task: "tabular-regression",
    });
    return providerHelper.getResponse(res);
}
