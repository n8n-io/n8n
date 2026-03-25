"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tabularRegression = tabularRegression;
const getInferenceProviderMapping_js_1 = require("../../lib/getInferenceProviderMapping.js");
const getProviderHelper_js_1 = require("../../lib/getProviderHelper.js");
const request_js_1 = require("../../utils/request.js");
/**
 * Predicts target value for a given set of features in tabular form.
 * Typically, you will want to train a regression model on your training data and use it with your new data of the same format.
 * Example model: scikit-learn/Fish-Weight
 */
async function tabularRegression(args, options) {
    const provider = await (0, getInferenceProviderMapping_js_1.resolveProvider)(args.provider, args.model, args.endpointUrl);
    const providerHelper = (0, getProviderHelper_js_1.getProviderHelper)(provider, "tabular-regression");
    const { data: res } = await (0, request_js_1.innerRequest)(args, providerHelper, {
        ...options,
        task: "tabular-regression",
    });
    return providerHelper.getResponse(res);
}
