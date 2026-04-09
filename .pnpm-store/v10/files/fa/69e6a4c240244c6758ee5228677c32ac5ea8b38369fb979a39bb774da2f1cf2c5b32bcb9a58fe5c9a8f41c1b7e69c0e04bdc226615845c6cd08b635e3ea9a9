import { setCredentialFeature } from "@aws-sdk/core/client";
export const resolveSsoCredentials = async (profile, profileData, options = {}, callerClientConfig) => {
    const { fromSSO } = await import("@aws-sdk/credential-provider-sso");
    return fromSSO({
        profile,
        logger: options.logger,
        parentClientConfig: options.parentClientConfig,
        clientConfig: options.clientConfig,
    })({
        callerClientConfig,
    }).then((creds) => {
        if (profileData.sso_session) {
            return setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO", "r");
        }
        else {
            return setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO_LEGACY", "t");
        }
    });
};
export const isSsoProfile = (arg) => arg &&
    (typeof arg.sso_start_url === "string" ||
        typeof arg.sso_account_id === "string" ||
        typeof arg.sso_session === "string" ||
        typeof arg.sso_region === "string" ||
        typeof arg.sso_role_name === "string");
