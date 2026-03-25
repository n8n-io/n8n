import { getProfileName, parseKnownFiles } from "@smithy/shared-ini-file-loader";
import { resolveProfileData } from "./resolveProfileData";
export const fromIni = (_init = {}) => async ({ callerClientConfig } = {}) => {
    const init = {
        ..._init,
        parentClientConfig: {
            ...callerClientConfig,
            ..._init.parentClientConfig,
        },
    };
    init.logger?.debug("@aws-sdk/credential-provider-ini - fromIni");
    const profiles = await parseKnownFiles(init);
    return resolveProfileData(getProfileName({
        profile: _init.profile ?? callerClientConfig?.profile,
    }), profiles, init);
};
