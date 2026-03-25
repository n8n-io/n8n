import { setTokenFeature } from "@aws-sdk/core/client";
import { getBearerTokenEnvKey } from "@aws-sdk/core/httpAuthSchemes";
import { TokenProviderError } from "@smithy/property-provider";
export const fromEnvSigningName = ({ logger, signingName } = {}) => async () => {
    logger?.debug?.("@aws-sdk/token-providers - fromEnvSigningName");
    if (!signingName) {
        throw new TokenProviderError("Please pass 'signingName' to compute environment variable key", { logger });
    }
    const bearerTokenKey = getBearerTokenEnvKey(signingName);
    if (!(bearerTokenKey in process.env)) {
        throw new TokenProviderError(`Token not present in '${bearerTokenKey}' environment variable`, { logger });
    }
    const token = { token: process.env[bearerTokenKey] };
    setTokenFeature(token, "BEARER_SERVICE_ENV_VARS", "3");
    return token;
};
