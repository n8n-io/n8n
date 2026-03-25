"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLoggerCallback = void 0;
exports.ensureValidMsalToken = ensureValidMsalToken;
exports.getAuthorityHost = getAuthorityHost;
exports.getAuthority = getAuthority;
exports.getKnownAuthorities = getKnownAuthorities;
exports.getMSALLogLevel = getMSALLogLevel;
exports.randomUUID = randomUUID;
exports.handleMsalError = handleMsalError;
exports.publicToMsal = publicToMsal;
exports.msalToPublic = msalToPublic;
exports.serializeAuthenticationRecord = serializeAuthenticationRecord;
exports.deserializeAuthenticationRecord = deserializeAuthenticationRecord;
const errors_js_1 = require("../errors.js");
const logging_js_1 = require("../util/logging.js");
const constants_js_1 = require("../constants.js");
const core_util_1 = require("@azure/core-util");
const abort_controller_1 = require("@azure/abort-controller");
const msal_js_1 = require("./msal.js");
const logger = (0, logging_js_1.credentialLogger)("IdentityUtils");
/**
 * Latest AuthenticationRecord version
 */
const LatestAuthenticationRecordVersion = "1.0";
/**
 * Ensures the validity of the MSAL token
 * @internal
 */
function ensureValidMsalToken(scopes, msalToken, getTokenOptions) {
    const error = (message) => {
        logger.getToken.info(message);
        return new errors_js_1.AuthenticationRequiredError({
            scopes: Array.isArray(scopes) ? scopes : [scopes],
            getTokenOptions,
            message,
        });
    };
    if (!msalToken) {
        throw error("No response");
    }
    if (!msalToken.expiresOn) {
        throw error(`Response had no "expiresOn" property.`);
    }
    if (!msalToken.accessToken) {
        throw error(`Response had no "accessToken" property.`);
    }
}
/**
 * Returns the authority host from either the options bag or the AZURE_AUTHORITY_HOST environment variable.
 *
 * Defaults to {@link DefaultAuthorityHost}.
 * @internal
 */
function getAuthorityHost(options) {
    let authorityHost = options?.authorityHost;
    if (!authorityHost && core_util_1.isNodeLike) {
        authorityHost = process.env.AZURE_AUTHORITY_HOST;
    }
    return authorityHost ?? constants_js_1.DefaultAuthorityHost;
}
/**
 * Generates a valid authority by combining a host with a tenantId.
 * @internal
 */
function getAuthority(tenantId, host) {
    if (!host) {
        host = constants_js_1.DefaultAuthorityHost;
    }
    if (new RegExp(`${tenantId}/?$`).test(host)) {
        return host;
    }
    if (host.endsWith("/")) {
        return host + tenantId;
    }
    else {
        return `${host}/${tenantId}`;
    }
}
/**
 * Generates the known authorities.
 * If the Tenant Id is `adfs`, the authority can't be validated since the format won't match the expected one.
 * For that reason, we have to force MSAL to disable validating the authority
 * by sending it within the known authorities in the MSAL configuration.
 * @internal
 */
function getKnownAuthorities(tenantId, authorityHost, disableInstanceDiscovery) {
    if ((tenantId === "adfs" && authorityHost) || disableInstanceDiscovery) {
        return [authorityHost];
    }
    return [];
}
/**
 * Generates a logger that can be passed to the MSAL clients.
 * @param credLogger - The logger of the credential.
 * @internal
 */
const defaultLoggerCallback = (credLogger, platform = core_util_1.isNode ? "Node" : "Browser") => (level, message, containsPii) => {
    if (containsPii) {
        return;
    }
    switch (level) {
        case msal_js_1.msalCommon.LogLevel.Error:
            credLogger.info(`MSAL ${platform} V2 error: ${message}`);
            return;
        case msal_js_1.msalCommon.LogLevel.Info:
            credLogger.info(`MSAL ${platform} V2 info message: ${message}`);
            return;
        case msal_js_1.msalCommon.LogLevel.Verbose:
            credLogger.info(`MSAL ${platform} V2 verbose message: ${message}`);
            return;
        case msal_js_1.msalCommon.LogLevel.Warning:
            credLogger.info(`MSAL ${platform} V2 warning: ${message}`);
            return;
    }
};
exports.defaultLoggerCallback = defaultLoggerCallback;
/**
 * @internal
 */
function getMSALLogLevel(logLevel) {
    switch (logLevel) {
        case "error":
            return msal_js_1.msalCommon.LogLevel.Error;
        case "info":
            return msal_js_1.msalCommon.LogLevel.Info;
        case "verbose":
            return msal_js_1.msalCommon.LogLevel.Verbose;
        case "warning":
            return msal_js_1.msalCommon.LogLevel.Warning;
        default:
            // default msal logging level should be Info
            return msal_js_1.msalCommon.LogLevel.Info;
    }
}
/**
 * Wraps core-util's randomUUID in order to allow for mocking in tests.
 * This prepares the library for the upcoming core-util update to ESM.
 *
 * @internal
 * @returns A string containing a random UUID
 */
function randomUUID() {
    return (0, core_util_1.randomUUID)();
}
/**
 * Handles MSAL errors.
 */
function handleMsalError(scopes, error, getTokenOptions) {
    if (error.name === "AuthError" ||
        error.name === "ClientAuthError" ||
        error.name === "BrowserAuthError") {
        const msalError = error;
        switch (msalError.errorCode) {
            case "endpoints_resolution_error":
                logger.info((0, logging_js_1.formatError)(scopes, error.message));
                return new errors_js_1.CredentialUnavailableError(error.message);
            case "device_code_polling_cancelled":
                return new abort_controller_1.AbortError("The authentication has been aborted by the caller.");
            case "consent_required":
            case "interaction_required":
            case "login_required":
                logger.info((0, logging_js_1.formatError)(scopes, `Authentication returned errorCode ${msalError.errorCode}`));
                break;
            default:
                logger.info((0, logging_js_1.formatError)(scopes, `Failed to acquire token: ${error.message}`));
                break;
        }
    }
    if (error.name === "ClientConfigurationError" ||
        error.name === "BrowserConfigurationAuthError" ||
        error.name === "AbortError" ||
        error.name === "AuthenticationError") {
        return error;
    }
    if (error.name === "NativeAuthError") {
        logger.info((0, logging_js_1.formatError)(scopes, `Error from the native broker: ${error.message} with status code: ${error.statusCode}`));
        return error;
    }
    return new errors_js_1.AuthenticationRequiredError({ scopes, getTokenOptions, message: error.message });
}
// transformations
function publicToMsal(account) {
    return {
        localAccountId: account.homeAccountId,
        environment: account.authority,
        username: account.username,
        homeAccountId: account.homeAccountId,
        tenantId: account.tenantId,
    };
}
function msalToPublic(clientId, account) {
    const record = {
        authority: account.environment ?? constants_js_1.DefaultAuthority,
        homeAccountId: account.homeAccountId,
        tenantId: account.tenantId || constants_js_1.DefaultTenantId,
        username: account.username,
        clientId,
        version: LatestAuthenticationRecordVersion,
    };
    return record;
}
/**
 * Serializes an `AuthenticationRecord` into a string.
 *
 * The output of a serialized authentication record will contain the following properties:
 *
 * - "authority"
 * - "homeAccountId"
 * - "clientId"
 * - "tenantId"
 * - "username"
 * - "version"
 *
 * To later convert this string to a serialized `AuthenticationRecord`, please use the exported function `deserializeAuthenticationRecord()`.
 */
function serializeAuthenticationRecord(record) {
    return JSON.stringify(record);
}
/**
 * Deserializes a previously serialized authentication record from a string into an object.
 *
 * The input string must contain the following properties:
 *
 * - "authority"
 * - "homeAccountId"
 * - "clientId"
 * - "tenantId"
 * - "username"
 * - "version"
 *
 * If the version we receive is unsupported, an error will be thrown.
 *
 * At the moment, the only available version is: "1.0", which is always set when the authentication record is serialized.
 *
 * @param serializedRecord - Authentication record previously serialized into string.
 * @returns AuthenticationRecord.
 */
function deserializeAuthenticationRecord(serializedRecord) {
    const parsed = JSON.parse(serializedRecord);
    if (parsed.version && parsed.version !== LatestAuthenticationRecordVersion) {
        throw Error("Unsupported AuthenticationRecord version");
    }
    return parsed;
}
//# sourceMappingURL=utils.js.map