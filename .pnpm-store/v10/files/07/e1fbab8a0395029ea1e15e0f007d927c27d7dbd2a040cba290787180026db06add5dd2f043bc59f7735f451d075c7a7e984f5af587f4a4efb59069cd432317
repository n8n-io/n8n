import { getProfileName, parseKnownFiles } from "@smithy/shared-ini-file-loader";
import { resolveProcessCredentials } from "./resolveProcessCredentials";
export const fromProcess = (init = {}) => async ({ callerClientConfig } = {}) => {
    init.logger?.debug("@aws-sdk/credential-provider-process - fromProcess");
    const profiles = await parseKnownFiles(init);
    return resolveProcessCredentials(getProfileName({
        profile: init.profile ?? callerClientConfig?.profile,
    }), profiles, init.logger);
};
