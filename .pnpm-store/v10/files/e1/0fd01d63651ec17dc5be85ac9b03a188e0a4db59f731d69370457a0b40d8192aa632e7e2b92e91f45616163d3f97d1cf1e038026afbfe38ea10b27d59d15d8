import { awsEndpointFunctions } from "@aws-sdk/util-endpoints";
import { customEndpointFunctions, EndpointCache, resolveEndpoint } from "@smithy/util-endpoints";
import { ruleSet } from "./ruleset";
const cache = new EndpointCache({
    size: 50,
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS", "UseGlobalEndpoint"],
});
export const defaultEndpointResolver = (endpointParams, context = {}) => {
    return cache.get(endpointParams, () => resolveEndpoint(ruleSet, {
        endpointParams: endpointParams,
        logger: context.logger,
    }));
};
customEndpointFunctions.aws = awsEndpointFunctions;
