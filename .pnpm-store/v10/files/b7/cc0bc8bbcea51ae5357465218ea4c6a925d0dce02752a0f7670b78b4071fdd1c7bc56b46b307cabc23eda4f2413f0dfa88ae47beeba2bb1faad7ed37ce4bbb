/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'fs';
import * as path from 'path';
import { getStringFromEnv, parseKeyPairsIntoRecord } from '@opentelemetry/core';
import { diag } from '@opentelemetry/api';
import { getSharedConfigurationFromEnvironment } from './shared-env-configuration';
import { wrapStaticHeadersInFunction } from './shared-configuration';
import { httpAgentFactoryFromOptions, } from './otlp-node-http-configuration';
function getStaticHeadersFromEnv(signalIdentifier) {
    const signalSpecificRawHeaders = getStringFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_HEADERS`);
    const nonSignalSpecificRawHeaders = getStringFromEnv('OTEL_EXPORTER_OTLP_HEADERS');
    const signalSpecificHeaders = parseKeyPairsIntoRecord(signalSpecificRawHeaders);
    const nonSignalSpecificHeaders = parseKeyPairsIntoRecord(nonSignalSpecificRawHeaders);
    if (Object.keys(signalSpecificHeaders).length === 0 &&
        Object.keys(nonSignalSpecificHeaders).length === 0) {
        return undefined;
    }
    // headers are combined instead of overwritten, with the specific headers taking precedence over
    // the non-specific ones.
    return Object.assign({}, parseKeyPairsIntoRecord(nonSignalSpecificRawHeaders), parseKeyPairsIntoRecord(signalSpecificRawHeaders));
}
function appendRootPathToUrlIfNeeded(url) {
    try {
        const parsedUrl = new URL(url);
        // This will automatically append '/' if there's no root path.
        return parsedUrl.toString();
    }
    catch {
        diag.warn(`Configuration: Could not parse environment-provided export URL: '${url}', falling back to undefined`);
        return undefined;
    }
}
function appendResourcePathToUrl(url, path) {
    try {
        // just try to parse, if it fails we catch and warn.
        new URL(url);
    }
    catch {
        diag.warn(`Configuration: Could not parse environment-provided export URL: '${url}', falling back to undefined`);
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
        diag.warn(`Configuration: Provided URL appended with '${path}' is not a valid URL, using 'undefined' instead of '${url}'`);
        return undefined;
    }
    return url;
}
function getNonSpecificUrlFromEnv(signalResourcePath) {
    const envUrl = getStringFromEnv('OTEL_EXPORTER_OTLP_ENDPOINT');
    if (envUrl === undefined) {
        return undefined;
    }
    return appendResourcePathToUrl(envUrl, signalResourcePath);
}
function getSpecificUrlFromEnv(signalIdentifier) {
    const envUrl = getStringFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_ENDPOINT`);
    if (envUrl === undefined) {
        return undefined;
    }
    return appendRootPathToUrlIfNeeded(envUrl);
}
function readFileFromEnv(signalSpecificEnvVar, nonSignalSpecificEnvVar, warningMessage) {
    const signalSpecificPath = getStringFromEnv(signalSpecificEnvVar);
    const nonSignalSpecificPath = getStringFromEnv(nonSignalSpecificEnvVar);
    const filePath = signalSpecificPath ?? nonSignalSpecificPath;
    if (filePath != null) {
        try {
            return fs.readFileSync(path.resolve(process.cwd(), filePath));
        }
        catch {
            diag.warn(warningMessage);
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
export function getNodeHttpConfigurationFromEnvironment(signalIdentifier, signalResourcePath) {
    return {
        ...getSharedConfigurationFromEnvironment(signalIdentifier),
        url: getSpecificUrlFromEnv(signalIdentifier) ??
            getNonSpecificUrlFromEnv(signalResourcePath),
        headers: wrapStaticHeadersInFunction(getStaticHeadersFromEnv(signalIdentifier)),
        agentFactory: httpAgentFactoryFromOptions({
            keepAlive: true,
            ca: getRootCertificateFromEnv(signalIdentifier),
            cert: getClientCertificateFromEnv(signalIdentifier),
            key: getClientKeyFromEnv(signalIdentifier),
        }),
    };
}
//# sourceMappingURL=otlp-node-http-env-configuration.js.map