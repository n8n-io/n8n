import { setCredentialFeature } from "@aws-sdk/core/client";
import { chain, CredentialsProviderError } from "@smithy/property-provider";
export const resolveCredentialSource = (credentialSource, profileName, logger) => {
    const sourceProvidersMap = {
        EcsContainer: async (options) => {
            const { fromHttp } = await import("@aws-sdk/credential-provider-http");
            const { fromContainerMetadata } = await import("@smithy/credential-provider-imds");
            logger?.debug("@aws-sdk/credential-provider-ini - credential_source is EcsContainer");
            return async () => chain(fromHttp(options ?? {}), fromContainerMetadata(options))().then(setNamedProvider);
        },
        Ec2InstanceMetadata: async (options) => {
            logger?.debug("@aws-sdk/credential-provider-ini - credential_source is Ec2InstanceMetadata");
            const { fromInstanceMetadata } = await import("@smithy/credential-provider-imds");
            return async () => fromInstanceMetadata(options)().then(setNamedProvider);
        },
        Environment: async (options) => {
            logger?.debug("@aws-sdk/credential-provider-ini - credential_source is Environment");
            const { fromEnv } = await import("@aws-sdk/credential-provider-env");
            return async () => fromEnv(options)().then(setNamedProvider);
        },
    };
    if (credentialSource in sourceProvidersMap) {
        return sourceProvidersMap[credentialSource];
    }
    else {
        throw new CredentialsProviderError(`Unsupported credential source in profile ${profileName}. Got ${credentialSource}, ` +
            `expected EcsContainer or Ec2InstanceMetadata or Environment.`, { logger });
    }
};
const setNamedProvider = (creds) => setCredentialFeature(creds, "CREDENTIALS_PROFILE_NAMED_PROVIDER", "p");
