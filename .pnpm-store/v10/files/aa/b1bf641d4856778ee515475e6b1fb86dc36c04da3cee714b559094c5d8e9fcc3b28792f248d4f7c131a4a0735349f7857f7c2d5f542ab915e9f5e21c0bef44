export const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        forcePathStyle: options.forcePathStyle ?? false,
        useAccelerateEndpoint: options.useAccelerateEndpoint ?? false,
        useGlobalEndpoint: options.useGlobalEndpoint ?? false,
        disableMultiregionAccessPoints: options.disableMultiregionAccessPoints ?? false,
        defaultSigningName: "s3",
    });
};
export const commonParams = {
    ForcePathStyle: { type: "clientContextParams", name: "forcePathStyle" },
    UseArnRegion: { type: "clientContextParams", name: "useArnRegion" },
    DisableMultiRegionAccessPoints: { type: "clientContextParams", name: "disableMultiregionAccessPoints" },
    Accelerate: { type: "clientContextParams", name: "useAccelerateEndpoint" },
    DisableS3ExpressSessionAuth: { type: "clientContextParams", name: "disableS3ExpressSessionAuth" },
    UseGlobalEndpoint: { type: "builtInParams", name: "useGlobalEndpoint" },
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
};
