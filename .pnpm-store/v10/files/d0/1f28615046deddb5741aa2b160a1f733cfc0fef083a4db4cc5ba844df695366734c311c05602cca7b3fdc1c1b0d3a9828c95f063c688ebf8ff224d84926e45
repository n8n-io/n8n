import { setCredentialFeature } from "@aws-sdk/core/client";
import { CredentialsProviderError } from "@smithy/property-provider";
import { getProfileName, parseKnownFiles } from "@smithy/shared-ini-file-loader";
import { LoginCredentialsFetcher } from "./LoginCredentialsFetcher";
export const fromLoginCredentials = (init) => async ({ callerClientConfig } = {}) => {
    init?.logger?.debug?.("@aws-sdk/credential-providers - fromLoginCredentials");
    const profiles = await parseKnownFiles(init || {});
    const profileName = getProfileName({
        profile: init?.profile ?? callerClientConfig?.profile,
    });
    const profile = profiles[profileName];
    if (!profile?.login_session) {
        throw new CredentialsProviderError(`Profile ${profileName} does not contain login_session.`, {
            tryNextLink: true,
            logger: init?.logger,
        });
    }
    const fetcher = new LoginCredentialsFetcher(profile, init, callerClientConfig);
    const credentials = await fetcher.loadCredentials();
    return setCredentialFeature(credentials, "CREDENTIALS_LOGIN", "AD");
};
