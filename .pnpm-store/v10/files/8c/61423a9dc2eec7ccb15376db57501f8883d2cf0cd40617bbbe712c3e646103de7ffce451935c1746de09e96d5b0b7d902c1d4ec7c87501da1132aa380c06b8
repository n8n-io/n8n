import { getProfileName, parseKnownFiles } from "@smithy/shared-ini-file-loader";
import { resolveProfileData } from "./resolveProfileData";
export const fromIni = (init = {}) => async ({ callerClientConfig } = {}) => {
    init.logger?.debug("@aws-sdk/credential-provider-ini - fromIni");
    const profiles = await parseKnownFiles(init);
    return resolveProfileData(getProfileName({
        profile: init.profile ?? callerClientConfig?.profile,
    }), profiles, init, callerClientConfig);
};
