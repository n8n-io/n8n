export const regionRedirectEndpointMiddleware = (config) => {
    return (next, context) => async (args) => {
        const originalRegion = await config.region();
        const regionProviderRef = config.region;
        let unlock = () => { };
        if (context.__s3RegionRedirect) {
            Object.defineProperty(config, "region", {
                writable: false,
                value: async () => {
                    return context.__s3RegionRedirect;
                },
            });
            unlock = () => Object.defineProperty(config, "region", {
                writable: true,
                value: regionProviderRef,
            });
        }
        try {
            const result = await next(args);
            if (context.__s3RegionRedirect) {
                unlock();
                const region = await config.region();
                if (originalRegion !== region) {
                    throw new Error("Region was not restored following S3 region redirect.");
                }
            }
            return result;
        }
        catch (e) {
            unlock();
            throw e;
        }
    };
};
export const regionRedirectEndpointMiddlewareOptions = {
    tags: ["REGION_REDIRECT", "S3"],
    name: "regionRedirectEndpointMiddleware",
    override: true,
    relation: "before",
    toMiddleware: "endpointV2Middleware",
};
