import { S3ExpressIdentityProviderImpl } from "./s3-express";
export const resolveS3Config = (input, { session, }) => {
    const [s3ClientProvider, CreateSessionCommandCtor] = session;
    const { forcePathStyle, useAccelerateEndpoint, disableMultiregionAccessPoints, followRegionRedirects, s3ExpressIdentityProvider, bucketEndpoint, } = input;
    return Object.assign(input, {
        forcePathStyle: forcePathStyle ?? false,
        useAccelerateEndpoint: useAccelerateEndpoint ?? false,
        disableMultiregionAccessPoints: disableMultiregionAccessPoints ?? false,
        followRegionRedirects: followRegionRedirects ?? false,
        s3ExpressIdentityProvider: s3ExpressIdentityProvider ??
            new S3ExpressIdentityProviderImpl(async (key) => s3ClientProvider().send(new CreateSessionCommandCtor({
                Bucket: key,
            }))),
        bucketEndpoint: bucketEndpoint ?? false,
    });
};
