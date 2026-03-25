import { NODE_REGION_CONFIG_FILE_OPTIONS, NODE_REGION_CONFIG_OPTIONS } from "@smithy/config-resolver";
import { loadConfig } from "@smithy/node-config-provider";
export function stsRegionDefaultResolver(loaderConfig = {}) {
    return loadConfig({
        ...NODE_REGION_CONFIG_OPTIONS,
        async default() {
            if (!warning.silence) {
                console.warn("@aws-sdk - WARN - default STS region of us-east-1 used. See @aws-sdk/credential-providers README and set a region explicitly.");
            }
            return "us-east-1";
        },
    }, { ...NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig });
}
export const warning = {
    silence: false,
};
