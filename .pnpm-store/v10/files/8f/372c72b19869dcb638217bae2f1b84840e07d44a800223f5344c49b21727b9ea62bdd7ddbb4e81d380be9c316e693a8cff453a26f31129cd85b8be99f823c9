import { CredentialsProviderError } from "@smithy/property-provider";
import { fromCognitoIdentity } from "./fromCognitoIdentity";
import { localStorage } from "./localStorage";
import { resolveLogins } from "./resolveLogins";
export function fromCognitoIdentityPool({ accountId, cache = localStorage(), client, clientConfig, customRoleArn, identityPoolId, logins, userIdentifier = !logins || Object.keys(logins).length === 0 ? "ANONYMOUS" : undefined, logger, parentClientConfig, }) {
    logger?.debug("@aws-sdk/credential-provider-cognito-identity - fromCognitoIdentity");
    const cacheKey = userIdentifier
        ? `aws:cognito-identity-credentials:${identityPoolId}:${userIdentifier}`
        : undefined;
    let provider = async (awsIdentityProperties) => {
        const { GetIdCommand, CognitoIdentityClient } = await import("./loadCognitoIdentity");
        const fromConfigs = (property) => clientConfig?.[property] ??
            parentClientConfig?.[property] ??
            awsIdentityProperties?.callerClientConfig?.[property];
        const _client = client ??
            new CognitoIdentityClient(Object.assign({}, clientConfig ?? {}, {
                region: fromConfigs("region"),
                profile: fromConfigs("profile"),
                userAgentAppId: fromConfigs("userAgentAppId"),
            }));
        let identityId = (cacheKey && (await cache.getItem(cacheKey)));
        if (!identityId) {
            const { IdentityId = throwOnMissingId(logger) } = await _client.send(new GetIdCommand({
                AccountId: accountId,
                IdentityPoolId: identityPoolId,
                Logins: logins ? await resolveLogins(logins) : undefined,
            }));
            identityId = IdentityId;
            if (cacheKey) {
                Promise.resolve(cache.setItem(cacheKey, identityId)).catch(() => { });
            }
        }
        provider = fromCognitoIdentity({
            client: _client,
            customRoleArn,
            logins,
            identityId,
        });
        return provider(awsIdentityProperties);
    };
    return (awsIdentityProperties) => provider(awsIdentityProperties).catch(async (err) => {
        if (cacheKey) {
            Promise.resolve(cache.removeItem(cacheKey)).catch(() => { });
        }
        throw err;
    });
}
function throwOnMissingId(logger) {
    throw new CredentialsProviderError("Response from Amazon Cognito contained no identity ID", { logger });
}
