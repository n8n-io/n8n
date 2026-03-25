import { CredentialsProviderError } from "@smithy/property-provider";
import { resolveLogins } from "./resolveLogins";
export function fromCognitoIdentity(parameters) {
    return async (awsIdentityProperties) => {
        parameters.logger?.debug("@aws-sdk/credential-provider-cognito-identity - fromCognitoIdentity");
        const { GetCredentialsForIdentityCommand, CognitoIdentityClient } = await import("./loadCognitoIdentity");
        const fromConfigs = (property) => parameters.clientConfig?.[property] ??
            parameters.parentClientConfig?.[property] ??
            awsIdentityProperties?.callerClientConfig?.[property];
        const { Credentials: { AccessKeyId = throwOnMissingAccessKeyId(parameters.logger), Expiration, SecretKey = throwOnMissingSecretKey(parameters.logger), SessionToken, } = throwOnMissingCredentials(parameters.logger), } = await (parameters.client ??
            new CognitoIdentityClient(Object.assign({}, parameters.clientConfig ?? {}, {
                region: fromConfigs("region"),
                profile: fromConfigs("profile"),
            }))).send(new GetCredentialsForIdentityCommand({
            CustomRoleArn: parameters.customRoleArn,
            IdentityId: parameters.identityId,
            Logins: parameters.logins ? await resolveLogins(parameters.logins) : undefined,
        }));
        return {
            identityId: parameters.identityId,
            accessKeyId: AccessKeyId,
            secretAccessKey: SecretKey,
            sessionToken: SessionToken,
            expiration: Expiration,
        };
    };
}
function throwOnMissingAccessKeyId(logger) {
    throw new CredentialsProviderError("Response from Amazon Cognito contained no access key ID", { logger });
}
function throwOnMissingCredentials(logger) {
    throw new CredentialsProviderError("Response from Amazon Cognito contained no credentials", { logger });
}
function throwOnMissingSecretKey(logger) {
    throw new CredentialsProviderError("Response from Amazon Cognito contained no secret key", { logger });
}
