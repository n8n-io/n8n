import { setCredentialFeature } from "@aws-sdk/core/client";
import { fromLoginCredentials } from "@aws-sdk/credential-provider-login";
export const isLoginProfile = (data) => {
    return Boolean(data && data.login_session);
};
export const resolveLoginCredentials = async (profileName, options, callerClientConfig) => {
    const credentials = await fromLoginCredentials({
        ...options,
        profile: profileName,
    })({ callerClientConfig });
    return setCredentialFeature(credentials, "CREDENTIALS_PROFILE_LOGIN", "AC");
};
