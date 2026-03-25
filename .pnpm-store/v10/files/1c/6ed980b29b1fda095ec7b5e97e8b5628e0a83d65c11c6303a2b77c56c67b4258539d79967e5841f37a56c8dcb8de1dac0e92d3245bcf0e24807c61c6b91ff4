import { ENV_KEY, ENV_SECRET, fromEnv } from "@aws-sdk/credential-provider-env";
import { chain, CredentialsProviderError, memoize } from "@smithy/property-provider";
import { ENV_PROFILE } from "@smithy/shared-ini-file-loader";
import { remoteProvider } from "./remoteProvider";
let multipleCredentialSourceWarningEmitted = false;
export const defaultProvider = (init = {}) => memoize(chain(async () => {
    const profile = init.profile ?? process.env[ENV_PROFILE];
    if (profile) {
        const envStaticCredentialsAreSet = process.env[ENV_KEY] && process.env[ENV_SECRET];
        if (envStaticCredentialsAreSet) {
            if (!multipleCredentialSourceWarningEmitted) {
                const warnFn = init.logger?.warn && init.logger?.constructor?.name !== "NoOpLogger" ? init.logger.warn : console.warn;
                warnFn(`@aws-sdk/credential-provider-node - defaultProvider::fromEnv WARNING:
    Multiple credential sources detected: 
    Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
    This SDK will proceed with the AWS_PROFILE value.
    
    However, a future version may change this behavior to prefer the ENV static credentials.
    Please ensure that your environment only sets either the AWS_PROFILE or the
    AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY pair.
`);
                multipleCredentialSourceWarningEmitted = true;
            }
        }
        throw new CredentialsProviderError("AWS_PROFILE is set, skipping fromEnv provider.", {
            logger: init.logger,
            tryNextLink: true,
        });
    }
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromEnv");
    return fromEnv(init)();
}, async () => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromSSO");
    const { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
    if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
        throw new CredentialsProviderError("Skipping SSO provider in default chain (inputs do not include SSO fields).", { logger: init.logger });
    }
    const { fromSSO } = await import("@aws-sdk/credential-provider-sso");
    return fromSSO(init)();
}, async () => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromIni");
    const { fromIni } = await import("@aws-sdk/credential-provider-ini");
    return fromIni(init)();
}, async () => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromProcess");
    const { fromProcess } = await import("@aws-sdk/credential-provider-process");
    return fromProcess(init)();
}, async () => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromTokenFile");
    const { fromTokenFile } = await import("@aws-sdk/credential-provider-web-identity");
    return fromTokenFile(init)();
}, async () => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::remoteProvider");
    return (await remoteProvider(init))();
}, async () => {
    throw new CredentialsProviderError("Could not load credentials from any providers", {
        tryNextLink: false,
        logger: init.logger,
    });
}), credentialsTreatedAsExpired, credentialsWillNeedRefresh);
export const credentialsWillNeedRefresh = (credentials) => credentials?.expiration !== undefined;
export const credentialsTreatedAsExpired = (credentials) => credentials?.expiration !== undefined && credentials.expiration.getTime() - Date.now() < 300000;
