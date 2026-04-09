import { ProviderError } from "@smithy/property-provider";
export const createCredentialChain = (...credentialProviders) => {
    let expireAfter = -1;
    const baseFunction = async (awsIdentityProperties) => {
        const credentials = await propertyProviderChain(...credentialProviders)(awsIdentityProperties);
        if (!credentials.expiration && expireAfter !== -1) {
            credentials.expiration = new Date(Date.now() + expireAfter);
        }
        return credentials;
    };
    const withOptions = Object.assign(baseFunction, {
        expireAfter(milliseconds) {
            if (milliseconds < 5 * 60_000) {
                throw new Error("@aws-sdk/credential-providers - createCredentialChain(...).expireAfter(ms) may not be called with a duration lower than five minutes.");
            }
            expireAfter = milliseconds;
            return withOptions;
        },
    });
    return withOptions;
};
export const propertyProviderChain = (...providers) => async (awsIdentityProperties) => {
    if (providers.length === 0) {
        throw new ProviderError("No providers in chain", { tryNextLink: false });
    }
    let lastProviderError;
    for (const provider of providers) {
        try {
            return await provider(awsIdentityProperties);
        }
        catch (err) {
            lastProviderError = err;
            if (err?.tryNextLink) {
                continue;
            }
            throw err;
        }
    }
    throw lastProviderError;
};
