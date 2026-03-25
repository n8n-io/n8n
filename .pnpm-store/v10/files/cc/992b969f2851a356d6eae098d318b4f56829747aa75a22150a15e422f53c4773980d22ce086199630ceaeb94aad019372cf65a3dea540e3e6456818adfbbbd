import { getChecksumConfiguration, resolveChecksumRuntimeConfig } from "./checksum";
import { getRetryConfiguration, resolveRetryRuntimeConfig } from "./retry";
export const getDefaultExtensionConfiguration = (runtimeConfig) => {
    return Object.assign(getChecksumConfiguration(runtimeConfig), getRetryConfiguration(runtimeConfig));
};
export const getDefaultClientConfiguration = getDefaultExtensionConfiguration;
export const resolveDefaultRuntimeConfig = (config) => {
    return Object.assign(resolveChecksumRuntimeConfig(config), resolveRetryRuntimeConfig(config));
};
