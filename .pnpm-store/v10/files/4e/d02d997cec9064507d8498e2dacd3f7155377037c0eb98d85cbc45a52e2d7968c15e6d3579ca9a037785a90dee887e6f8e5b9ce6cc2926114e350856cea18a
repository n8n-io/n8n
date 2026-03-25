export function bucketEndpointMiddleware(options) {
    return (next, context) => async (args) => {
        if (options.bucketEndpoint) {
            const endpoint = context.endpointV2;
            if (endpoint) {
                const bucket = args.input.Bucket;
                if (typeof bucket === "string") {
                    try {
                        const bucketEndpointUrl = new URL(bucket);
                        context.endpointV2 = {
                            ...endpoint,
                            url: bucketEndpointUrl,
                        };
                    }
                    catch (e) {
                        const warning = `@aws-sdk/middleware-sdk-s3: bucketEndpoint=true was set but Bucket=${bucket} could not be parsed as URL.`;
                        if (context.logger?.constructor?.name === "NoOpLogger") {
                            console.warn(warning);
                        }
                        else {
                            context.logger?.warn?.(warning);
                        }
                        throw e;
                    }
                }
            }
        }
        return next(args);
    };
}
export const bucketEndpointMiddlewareOptions = {
    name: "bucketEndpointMiddleware",
    override: true,
    relation: "after",
    toMiddleware: "endpointV2Middleware",
};
