"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyProviderChain = exports.createCredentialChain = void 0;
const property_provider_1 = require("@smithy/property-provider");
const createCredentialChain = (...credentialProviders) => {
    let expireAfter = -1;
    const baseFunction = async (awsIdentityProperties) => {
        const credentials = await (0, exports.propertyProviderChain)(...credentialProviders)(awsIdentityProperties);
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
exports.createCredentialChain = createCredentialChain;
const propertyProviderChain = (...providers) => async (awsIdentityProperties) => {
    if (providers.length === 0) {
        throw new property_provider_1.ProviderError("No providers in chain");
    }
    let lastProviderError;
    for (const provider of providers) {
        try {
            const credentials = await provider(awsIdentityProperties);
            return credentials;
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
exports.propertyProviderChain = propertyProviderChain;
