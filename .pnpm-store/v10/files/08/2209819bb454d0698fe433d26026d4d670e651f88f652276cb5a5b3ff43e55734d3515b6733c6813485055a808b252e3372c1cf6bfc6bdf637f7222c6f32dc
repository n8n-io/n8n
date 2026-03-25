import { awsEndpointFunctions } from "@aws-sdk/util-endpoints";
import { customEndpointFunctions, EndpointCache, resolveEndpoint } from "@smithy/util-endpoints";
import { ruleSet } from "./ruleset";
const cache = new EndpointCache({
    size: 50,
    params: [
        "Accelerate",
        "Bucket",
        "DisableAccessPoints",
        "DisableMultiRegionAccessPoints",
        "DisableS3ExpressSessionAuth",
        "Endpoint",
        "ForcePathStyle",
        "Region",
        "UseArnRegion",
        "UseDualStack",
        "UseFIPS",
        "UseGlobalEndpoint",
        "UseObjectLambdaEndpoint",
        "UseS3ExpressControlEndpoint",
    ],
});
export const defaultEndpointResolver = (endpointParams, context = {}) => {
    return cache.get(endpointParams, () => resolveEndpoint(ruleSet, {
        endpointParams: endpointParams,
        logger: context.logger,
    }));
};
customEndpointFunctions.aws = awsEndpointFunctions;
