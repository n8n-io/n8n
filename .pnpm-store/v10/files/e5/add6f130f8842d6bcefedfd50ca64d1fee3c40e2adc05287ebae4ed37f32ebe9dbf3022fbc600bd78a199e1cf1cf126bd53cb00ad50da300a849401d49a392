export const getAwsRegionExtensionConfiguration = (runtimeConfig) => {
    return {
        setRegion(region) {
            runtimeConfig.region = region;
        },
        region() {
            return runtimeConfig.region;
        },
    };
};
export const resolveAwsRegionExtensionConfiguration = (awsRegionExtensionConfiguration) => {
    return {
        region: awsRegionExtensionConfiguration.region(),
    };
};
