import { parse as parseArn, validate as validateArn } from "@aws-sdk/util-arn-parser";
import { HttpRequest } from "@smithy/protocol-http";
import { bucketHostname } from "./bucketHostname";
export const bucketEndpointMiddleware = (options) => (next, context) => async (args) => {
    const { Bucket: bucketName } = args.input;
    let replaceBucketInPath = options.bucketEndpoint;
    const request = args.request;
    if (HttpRequest.isInstance(request)) {
        if (options.bucketEndpoint) {
            request.hostname = bucketName;
        }
        else if (validateArn(bucketName)) {
            const bucketArn = parseArn(bucketName);
            const clientRegion = await options.region();
            const useDualstackEndpoint = await options.useDualstackEndpoint();
            const useFipsEndpoint = await options.useFipsEndpoint();
            const { partition, signingRegion = clientRegion } = (await options.regionInfoProvider(clientRegion, { useDualstackEndpoint, useFipsEndpoint })) || {};
            const useArnRegion = await options.useArnRegion();
            const { hostname, bucketEndpoint, signingRegion: modifiedSigningRegion, signingService, } = bucketHostname({
                bucketName: bucketArn,
                baseHostname: request.hostname,
                accelerateEndpoint: options.useAccelerateEndpoint,
                dualstackEndpoint: useDualstackEndpoint,
                fipsEndpoint: useFipsEndpoint,
                pathStyleEndpoint: options.forcePathStyle,
                tlsCompatible: request.protocol === "https:",
                useArnRegion,
                clientPartition: partition,
                clientSigningRegion: signingRegion,
                clientRegion: clientRegion,
                isCustomEndpoint: options.isCustomEndpoint,
                disableMultiregionAccessPoints: await options.disableMultiregionAccessPoints(),
            });
            if (modifiedSigningRegion && modifiedSigningRegion !== signingRegion) {
                context["signing_region"] = modifiedSigningRegion;
            }
            if (signingService && signingService !== "s3") {
                context["signing_service"] = signingService;
            }
            request.hostname = hostname;
            replaceBucketInPath = bucketEndpoint;
        }
        else {
            const clientRegion = await options.region();
            const dualstackEndpoint = await options.useDualstackEndpoint();
            const fipsEndpoint = await options.useFipsEndpoint();
            const { hostname, bucketEndpoint } = bucketHostname({
                bucketName,
                clientRegion,
                baseHostname: request.hostname,
                accelerateEndpoint: options.useAccelerateEndpoint,
                dualstackEndpoint,
                fipsEndpoint,
                pathStyleEndpoint: options.forcePathStyle,
                tlsCompatible: request.protocol === "https:",
                isCustomEndpoint: options.isCustomEndpoint,
            });
            request.hostname = hostname;
            replaceBucketInPath = bucketEndpoint;
        }
        if (replaceBucketInPath) {
            request.path = request.path.replace(/^(\/)?[^\/]+/, "");
            if (request.path === "") {
                request.path = "/";
            }
        }
    }
    return next({ ...args, request });
};
export const bucketEndpointMiddlewareOptions = {
    tags: ["BUCKET_ENDPOINT"],
    name: "bucketEndpointMiddleware",
    relation: "before",
    toMiddleware: "hostHeaderMiddleware",
    override: true,
};
export const getBucketEndpointPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(bucketEndpointMiddleware(options), bucketEndpointMiddlewareOptions);
    },
});
