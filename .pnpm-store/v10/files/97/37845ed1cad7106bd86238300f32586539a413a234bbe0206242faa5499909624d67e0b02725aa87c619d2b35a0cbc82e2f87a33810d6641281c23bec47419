import { regionRedirectEndpointMiddleware, regionRedirectEndpointMiddlewareOptions, } from "./region-redirect-endpoint-middleware";
export function regionRedirectMiddleware(clientConfig) {
    return (next, context) => async (args) => {
        try {
            return await next(args);
        }
        catch (err) {
            if (clientConfig.followRegionRedirects) {
                const statusCode = err?.$metadata?.httpStatusCode;
                const isHeadBucket = context.commandName === "HeadBucketCommand";
                const bucketRegionHeader = err?.$response?.headers?.["x-amz-bucket-region"];
                if (bucketRegionHeader) {
                    if (statusCode === 301 ||
                        (statusCode === 400 && (err?.name === "IllegalLocationConstraintException" || isHeadBucket))) {
                        try {
                            const actualRegion = bucketRegionHeader;
                            context.logger?.debug(`Redirecting from ${await clientConfig.region()} to ${actualRegion}`);
                            context.__s3RegionRedirect = actualRegion;
                        }
                        catch (e) {
                            throw new Error("Region redirect failed: " + e);
                        }
                        return next(args);
                    }
                }
            }
            throw err;
        }
    };
}
export const regionRedirectMiddlewareOptions = {
    step: "initialize",
    tags: ["REGION_REDIRECT", "S3"],
    name: "regionRedirectMiddleware",
    override: true,
};
export const getRegionRedirectMiddlewarePlugin = (clientConfig) => ({
    applyToStack: (clientStack) => {
        clientStack.add(regionRedirectMiddleware(clientConfig), regionRedirectMiddlewareOptions);
        clientStack.addRelativeTo(regionRedirectEndpointMiddleware(clientConfig), regionRedirectEndpointMiddlewareOptions);
    },
});
