"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultEndpointResolver = void 0;
const util_endpoints_1 = require("@aws-sdk/util-endpoints");
const util_endpoints_2 = require("@smithy/util-endpoints");
const ruleset_1 = require("./ruleset");
const cache = new util_endpoints_2.EndpointCache({
    size: 50,
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
});
const defaultEndpointResolver = (endpointParams, context = {}) => {
    return cache.get(endpointParams, () => (0, util_endpoints_2.resolveEndpoint)(ruleset_1.ruleSet, {
        endpointParams: endpointParams,
        logger: context.logger,
    }));
};
exports.defaultEndpointResolver = defaultEndpointResolver;
util_endpoints_2.customEndpointFunctions.aws = util_endpoints_1.awsEndpointFunctions;
