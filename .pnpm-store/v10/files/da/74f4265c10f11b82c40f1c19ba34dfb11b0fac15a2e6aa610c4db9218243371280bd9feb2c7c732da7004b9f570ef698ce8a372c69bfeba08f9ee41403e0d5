"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.processEnvVars = processEnvVars;
exports.logEnvVars = logEnvVars;
exports.formatSuccess = formatSuccess;
exports.formatError = formatError;
exports.credentialLoggerInstance = credentialLoggerInstance;
exports.credentialLogger = credentialLogger;
const logger_1 = require("@azure/logger");
/**
 * The AzureLogger used for all clients within the identity package
 */
exports.logger = (0, logger_1.createClientLogger)("identity");
/**
 * Separates a list of environment variable names into a plain object with two arrays: an array of missing environment variables and another array with assigned environment variables.
 * @param supportedEnvVars - List of environment variable names
 */
function processEnvVars(supportedEnvVars) {
    return supportedEnvVars.reduce((acc, envVariable) => {
        if (process.env[envVariable]) {
            acc.assigned.push(envVariable);
        }
        else {
            acc.missing.push(envVariable);
        }
        return acc;
    }, { missing: [], assigned: [] });
}
/**
 * Based on a given list of environment variable names,
 * logs the environment variables currently assigned during the usage of a credential that goes by the given name.
 * @param credentialName - Name of the credential in use
 * @param supportedEnvVars - List of environment variables supported by that credential
 */
function logEnvVars(credentialName, supportedEnvVars) {
    const { assigned } = processEnvVars(supportedEnvVars);
    exports.logger.info(`${credentialName} => Found the following environment variables: ${assigned.join(", ")}`);
}
/**
 * Formatting the success event on the credentials
 */
function formatSuccess(scope) {
    return `SUCCESS. Scopes: ${Array.isArray(scope) ? scope.join(", ") : scope}.`;
}
/**
 * Formatting the success event on the credentials
 */
function formatError(scope, error) {
    let message = "ERROR.";
    if (scope?.length) {
        message += ` Scopes: ${Array.isArray(scope) ? scope.join(", ") : scope}.`;
    }
    return `${message} Error message: ${typeof error === "string" ? error : error.message}.`;
}
/**
 * Generates a CredentialLoggerInstance.
 *
 * It logs with the format:
 *
 *   `[title] => [message]`
 *
 */
function credentialLoggerInstance(title, parent, log = exports.logger) {
    const fullTitle = parent ? `${parent.fullTitle} ${title}` : title;
    function info(message) {
        log.info(`${fullTitle} =>`, message);
    }
    function warning(message) {
        log.warning(`${fullTitle} =>`, message);
    }
    function verbose(message) {
        log.verbose(`${fullTitle} =>`, message);
    }
    function error(message) {
        log.error(`${fullTitle} =>`, message);
    }
    return {
        title,
        fullTitle,
        info,
        warning,
        verbose,
        error,
    };
}
/**
 * Generates a CredentialLogger, which is a logger declared at the credential's constructor, and used at any point in the credential.
 * It has all the properties of a CredentialLoggerInstance, plus other logger instances, one per method.
 *
 * It logs with the format:
 *
 *   `[title] => [message]`
 *   `[title] => getToken() => [message]`
 *
 */
function credentialLogger(title, log = exports.logger) {
    const credLogger = credentialLoggerInstance(title, undefined, log);
    return {
        ...credLogger,
        parent: log,
        getToken: credentialLoggerInstance("=> getToken()", credLogger, log),
    };
}
//# sourceMappingURL=logging.js.map