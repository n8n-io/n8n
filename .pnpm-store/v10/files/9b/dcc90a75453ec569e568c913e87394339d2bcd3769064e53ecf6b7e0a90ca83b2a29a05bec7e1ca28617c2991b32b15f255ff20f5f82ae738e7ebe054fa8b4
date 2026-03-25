'use strict';

var client = require('@aws-sdk/core/client');
var httpAuthSchemes = require('@aws-sdk/core/httpAuthSchemes');
var propertyProvider = require('@smithy/property-provider');
var sharedIniFileLoader = require('@smithy/shared-ini-file-loader');
var fs = require('fs');

const fromEnvSigningName = ({ logger, signingName } = {}) => async () => {
    logger?.debug?.("@aws-sdk/token-providers - fromEnvSigningName");
    if (!signingName) {
        throw new propertyProvider.TokenProviderError("Please pass 'signingName' to compute environment variable key", { logger });
    }
    const bearerTokenKey = httpAuthSchemes.getBearerTokenEnvKey(signingName);
    if (!(bearerTokenKey in process.env)) {
        throw new propertyProvider.TokenProviderError(`Token not present in '${bearerTokenKey}' environment variable`, { logger });
    }
    const token = { token: process.env[bearerTokenKey] };
    client.setTokenFeature(token, "BEARER_SERVICE_ENV_VARS", "3");
    return token;
};

const EXPIRE_WINDOW_MS = 5 * 60 * 1000;
const REFRESH_MESSAGE = `To refresh this SSO session run 'aws sso login' with the corresponding profile.`;

const getSsoOidcClient = async (ssoRegion, init = {}) => {
    const { SSOOIDCClient } = await import('@aws-sdk/nested-clients/sso-oidc');
    const ssoOidcClient = new SSOOIDCClient(Object.assign({}, init.clientConfig ?? {}, {
        region: ssoRegion ?? init.clientConfig?.region,
        logger: init.clientConfig?.logger ?? init.parentClientConfig?.logger,
    }));
    return ssoOidcClient;
};

const getNewSsoOidcToken = async (ssoToken, ssoRegion, init = {}) => {
    const { CreateTokenCommand } = await import('@aws-sdk/nested-clients/sso-oidc');
    const ssoOidcClient = await getSsoOidcClient(ssoRegion, init);
    return ssoOidcClient.send(new CreateTokenCommand({
        clientId: ssoToken.clientId,
        clientSecret: ssoToken.clientSecret,
        refreshToken: ssoToken.refreshToken,
        grantType: "refresh_token",
    }));
};

const validateTokenExpiry = (token) => {
    if (token.expiration && token.expiration.getTime() < Date.now()) {
        throw new propertyProvider.TokenProviderError(`Token is expired. ${REFRESH_MESSAGE}`, false);
    }
};

const validateTokenKey = (key, value, forRefresh = false) => {
    if (typeof value === "undefined") {
        throw new propertyProvider.TokenProviderError(`Value not present for '${key}' in SSO Token${forRefresh ? ". Cannot refresh" : ""}. ${REFRESH_MESSAGE}`, false);
    }
};

const { writeFile } = fs.promises;
const writeSSOTokenToFile = (id, ssoToken) => {
    const tokenFilepath = sharedIniFileLoader.getSSOTokenFilepath(id);
    const tokenString = JSON.stringify(ssoToken, null, 2);
    return writeFile(tokenFilepath, tokenString);
};

const lastRefreshAttemptTime = new Date(0);
const fromSso = (_init = {}) => async ({ callerClientConfig } = {}) => {
    const init = {
        ..._init,
        parentClientConfig: {
            ...callerClientConfig,
            ..._init.parentClientConfig,
        },
    };
    init.logger?.debug("@aws-sdk/token-providers - fromSso");
    const profiles = await sharedIniFileLoader.parseKnownFiles(init);
    const profileName = sharedIniFileLoader.getProfileName({
        profile: init.profile ?? callerClientConfig?.profile,
    });
    const profile = profiles[profileName];
    if (!profile) {
        throw new propertyProvider.TokenProviderError(`Profile '${profileName}' could not be found in shared credentials file.`, false);
    }
    else if (!profile["sso_session"]) {
        throw new propertyProvider.TokenProviderError(`Profile '${profileName}' is missing required property 'sso_session'.`);
    }
    const ssoSessionName = profile["sso_session"];
    const ssoSessions = await sharedIniFileLoader.loadSsoSessionData(init);
    const ssoSession = ssoSessions[ssoSessionName];
    if (!ssoSession) {
        throw new propertyProvider.TokenProviderError(`Sso session '${ssoSessionName}' could not be found in shared credentials file.`, false);
    }
    for (const ssoSessionRequiredKey of ["sso_start_url", "sso_region"]) {
        if (!ssoSession[ssoSessionRequiredKey]) {
            throw new propertyProvider.TokenProviderError(`Sso session '${ssoSessionName}' is missing required property '${ssoSessionRequiredKey}'.`, false);
        }
    }
    ssoSession["sso_start_url"];
    const ssoRegion = ssoSession["sso_region"];
    let ssoToken;
    try {
        ssoToken = await sharedIniFileLoader.getSSOTokenFromFile(ssoSessionName);
    }
    catch (e) {
        throw new propertyProvider.TokenProviderError(`The SSO session token associated with profile=${profileName} was not found or is invalid. ${REFRESH_MESSAGE}`, false);
    }
    validateTokenKey("accessToken", ssoToken.accessToken);
    validateTokenKey("expiresAt", ssoToken.expiresAt);
    const { accessToken, expiresAt } = ssoToken;
    const existingToken = { token: accessToken, expiration: new Date(expiresAt) };
    if (existingToken.expiration.getTime() - Date.now() > EXPIRE_WINDOW_MS) {
        return existingToken;
    }
    if (Date.now() - lastRefreshAttemptTime.getTime() < 30 * 1000) {
        validateTokenExpiry(existingToken);
        return existingToken;
    }
    validateTokenKey("clientId", ssoToken.clientId, true);
    validateTokenKey("clientSecret", ssoToken.clientSecret, true);
    validateTokenKey("refreshToken", ssoToken.refreshToken, true);
    try {
        lastRefreshAttemptTime.setTime(Date.now());
        const newSsoOidcToken = await getNewSsoOidcToken(ssoToken, ssoRegion, init);
        validateTokenKey("accessToken", newSsoOidcToken.accessToken);
        validateTokenKey("expiresIn", newSsoOidcToken.expiresIn);
        const newTokenExpiration = new Date(Date.now() + newSsoOidcToken.expiresIn * 1000);
        try {
            await writeSSOTokenToFile(ssoSessionName, {
                ...ssoToken,
                accessToken: newSsoOidcToken.accessToken,
                expiresAt: newTokenExpiration.toISOString(),
                refreshToken: newSsoOidcToken.refreshToken,
            });
        }
        catch (error) {
        }
        return {
            token: newSsoOidcToken.accessToken,
            expiration: newTokenExpiration,
        };
    }
    catch (error) {
        validateTokenExpiry(existingToken);
        return existingToken;
    }
};

const fromStatic = ({ token, logger }) => async () => {
    logger?.debug("@aws-sdk/token-providers - fromStatic");
    if (!token || !token.token) {
        throw new propertyProvider.TokenProviderError(`Please pass a valid token to fromStatic`, false);
    }
    return token;
};

const nodeProvider = (init = {}) => propertyProvider.memoize(propertyProvider.chain(fromSso(init), async () => {
    throw new propertyProvider.TokenProviderError("Could not load token from any providers", false);
}), (token) => token.expiration !== undefined && token.expiration.getTime() - Date.now() < 300000, (token) => token.expiration !== undefined);

exports.fromEnvSigningName = fromEnvSigningName;
exports.fromSso = fromSso;
exports.fromStatic = fromStatic;
exports.nodeProvider = nodeProvider;
