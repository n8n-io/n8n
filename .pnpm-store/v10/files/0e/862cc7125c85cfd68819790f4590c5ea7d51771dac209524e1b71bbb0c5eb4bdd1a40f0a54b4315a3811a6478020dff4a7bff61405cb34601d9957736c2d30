import { setFeature } from "@aws-sdk/core";
import { HttpRequest } from "@smithy/protocol-http";
import { S3_EXPRESS_AUTH_SCHEME, S3_EXPRESS_BACKEND, S3_EXPRESS_BUCKET_TYPE, SESSION_TOKEN_HEADER } from "../constants";
export const s3ExpressMiddleware = (options) => {
    return (next, context) => async (args) => {
        if (context.endpointV2) {
            const endpoint = context.endpointV2;
            const isS3ExpressAuth = endpoint.properties?.authSchemes?.[0]?.name === S3_EXPRESS_AUTH_SCHEME;
            const isS3ExpressBucket = endpoint.properties?.backend === S3_EXPRESS_BACKEND ||
                endpoint.properties?.bucketType === S3_EXPRESS_BUCKET_TYPE;
            if (isS3ExpressBucket) {
                setFeature(context, "S3_EXPRESS_BUCKET", "J");
                context.isS3ExpressBucket = true;
            }
            if (isS3ExpressAuth) {
                const requestBucket = args.input.Bucket;
                if (requestBucket) {
                    const s3ExpressIdentity = await options.s3ExpressIdentityProvider.getS3ExpressIdentity(await options.credentials(), {
                        Bucket: requestBucket,
                    });
                    context.s3ExpressIdentity = s3ExpressIdentity;
                    if (HttpRequest.isInstance(args.request) && s3ExpressIdentity.sessionToken) {
                        args.request.headers[SESSION_TOKEN_HEADER] = s3ExpressIdentity.sessionToken;
                    }
                }
            }
        }
        return next(args);
    };
};
export const s3ExpressMiddlewareOptions = {
    name: "s3ExpressMiddleware",
    step: "build",
    tags: ["S3", "S3_EXPRESS"],
    override: true,
};
export const getS3ExpressPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(s3ExpressMiddleware(options), s3ExpressMiddlewareOptions);
    },
});
