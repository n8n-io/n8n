import { setCredentialFeature } from "@aws-sdk/core/client";
export const isProcessProfile = (arg) => Boolean(arg) && typeof arg === "object" && typeof arg.credential_process === "string";
export const resolveProcessCredentials = async (options, profile) => import("@aws-sdk/credential-provider-process").then(({ fromProcess }) => fromProcess({
    ...options,
    profile,
})().then((creds) => setCredentialFeature(creds, "CREDENTIALS_PROFILE_PROCESS", "v")));
