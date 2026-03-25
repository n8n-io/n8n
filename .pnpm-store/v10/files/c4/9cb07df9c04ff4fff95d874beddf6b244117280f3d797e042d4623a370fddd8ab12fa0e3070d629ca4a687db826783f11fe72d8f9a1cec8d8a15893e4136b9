import { normalizeProvider } from "@smithy/core";
import { ProviderError } from "@smithy/property-provider";
export const resolveAwsSdkSigV4AConfig = (config) => {
    config.sigv4aSigningRegionSet = normalizeProvider(config.sigv4aSigningRegionSet);
    return config;
};
export const NODE_SIGV4A_CONFIG_OPTIONS = {
    environmentVariableSelector(env) {
        if (env.AWS_SIGV4A_SIGNING_REGION_SET) {
            return env.AWS_SIGV4A_SIGNING_REGION_SET.split(",").map((_) => _.trim());
        }
        throw new ProviderError("AWS_SIGV4A_SIGNING_REGION_SET not set in env.", {
            tryNextLink: true,
        });
    },
    configFileSelector(profile) {
        if (profile.sigv4a_signing_region_set) {
            return (profile.sigv4a_signing_region_set ?? "").split(",").map((_) => _.trim());
        }
        throw new ProviderError("sigv4a_signing_region_set not set in profile.", {
            tryNextLink: true,
        });
    },
    default: undefined,
};
