"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeHttpConfigurationFromEnvironment = void 0;
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
const fs = require("fs");
const path = require("path");
const core_1 = require("@opentelemetry/core");
const api_1 = require("@opentelemetry/api");
const shared_env_configuration_1 = require("./shared-env-configuration");
const shared_configuration_1 = require("./shared-configuration");
const otlp_node_http_configuration_1 = require("./otlp-node-http-configuration");
function getStaticHeadersFromEnv(signalIdentifier) {
    const signalSpecificRawHeaders = (0, core_1.getStringFromEnv)(`OTEL_EXPORTER_OTLP_${signalIdentifier}_HEADERS`);
    const nonSignalSpecificRawHeaders = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_HEADERS');
    const signalSpecificHeaders = (0, core_1.parseKeyPairsIntoRecord)(signalSpecificRawHeaders);
    const nonSignalSpecificHeaders = (0, core_1.parseKeyPairsIntoRecord)(nonSignalSpecificRawHeaders);
    if (Object.keys(signalSpecificHeaders).length === 0 &&
        Object.keys(nonSignalSpecificHeaders).length === 0) {
        return undefined;
    }
    // headers are combined instead of overwritten, with the specific headers taking precedence over
    // the non-specific ones.
    return Object.assign({}, (0, core_1.parseKeyPairsIntoRecord)(nonSignalSpecificRawHeaders), (0, core_1.parseKeyPairsIntoRecord)(signalSpecificRawHeaders));
}
function appendRootPathToUrlIfNeeded(url) {
    try {
        const parsedUrl = new URL(url);
        // This will automatically append '/' if there's no root path.
        return parsedUrl.toString();
    }
    catch {
        api_1.diag.warn(`Configuration: Could not parse environment-provided export URL: '${url}', falling back to undefined`);
        return undefined;
    }
}
function appendResourcePathToUrl(url, path) {
    try {
        // just try to parse, if it fails we catch and warn.
        new URL(url);
    }
    catch {
        api_1.diag.warn(`Configuration: Could not parse environment-provided export URL: '${url}', falling back to undefined`);
        return undefined;
    }
    if (!url.endsWith('/')) {
        url = url + '/';
    }
    url += path;
    try {
        // just try to parse, if it fails we catch and warn.
        new URL(url);
    }
    catch {
        api_1.diag.warn(`Configuration: Provided URL appended with '${path}' is not a valid URL, using 'undefined' instead of '${url}'`);
        return undefined;
    }
    return url;
}
function getNonSpecificUrlFromEnv(signalResourcePath) {
    const envUrl = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT');
    if (envUrl === undefined) {
        return undefined;
    }
    return appendResourcePathToUrl(envUrl, signalResourcePath);
}
function getSpecificUrlFromEnv(signalIdentifier) {
    const envUrl = (0, core_1.getStringFromEnv)(`OTEL_EXPORTER_OTLP_${signalIdentifier}_ENDPOINT`);
    if (envUrl === undefined) {
        return undefined;
    }
    return appendRootPathToUrlIfNeeded(envUrl);
}
function readFileFromEnv(signalSpecificEnvVar, nonSignalSpecificEnvVar, warningMessage) {
    const signalSpecificPath = (0, core_1.getStringFromEnv)(signalSpecificEnvVar);
    const nonSignalSpecificPath = (0, core_1.getStringFromEnv)(nonSignalSpecificEnvVar);
    const filePath = signalSpecificPath ?? nonSignalSpecificPath;
    if (filePath != null) {
        try {
            return fs.readFileSync(path.resolve(process.cwd(), filePath));
        }
        catch {
            api_1.diag.warn(warningMessage);
            return undefined;
        }
    }
    else {
        return undefined;
    }
}
function getClientCertificateFromEnv(signalIdentifier) {
    return readFileFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_CLIENT_CERTIFICATE`, 'OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE', 'Failed to read client certificate chain file');
}
function getClientKeyFromEnv(signalIdentifier) {
    return readFileFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_CLIENT_KEY`, 'OTEL_EXPORTER_OTLP_CLIENT_KEY', 'Failed to read client certificate private key file');
}
function getRootCertificateFromEnv(signalIdentifier) {
    return readFileFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_CERTIFICATE`, 'OTEL_EXPORTER_OTLP_CERTIFICATE', 'Failed to read root certificate file');
}
/**
 * Reads and returns configuration from the environment
 *
 * @param signalIdentifier all caps part in environment variables that identifies the signal (e.g.: METRICS, TRACES, LOGS)
 * @param signalResourcePath signal resource path to append if necessary (e.g.: v1/metrics, v1/traces, v1/logs)
 */
function getNodeHttpConfigurationFromEnvironment(signalIdentifier, signalResourcePath) {
    return {
        ...(0, shared_env_configuration_1.getSharedConfigurationFromEnvironment)(signalIdentifier),
        url: getSpecificUrlFromEnv(signalIdentifier) ??
            getNonSpecificUrlFromEnv(signalResourcePath),
        headers: (0, shared_configuration_1.wrapStaticHeadersInFunction)(getStaticHeadersFromEnv(signalIdentifier)),
        agentFactory: (0, otlp_node_http_configuration_1.httpAgentFactoryFromOptions)({
            keepAlive: true,
            ca: getRootCertificateFromEnv(signalIdentifier),
            cert: getClientCertificateFromEnv(signalIdentifier),
            key: getClientKeyFromEnv(signalIdentifier),
        }),
    };
}
exports.getNodeHttpConfigurationFromEnvironment = getNodeHttpConfigurationFromEnvironment;
//# sourceMappingURL=otlp-node-http-env-configuration.js.map