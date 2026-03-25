"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOtlpGrpcConfigurationFromEnv = void 0;
const core_1 = require("@opentelemetry/core");
const grpc_exporter_transport_1 = require("../grpc-exporter-transport");
const node_http_1 = require("@opentelemetry/otlp-exporter-base/node-http");
const fs = require("fs");
const path = require("path");
const api_1 = require("@opentelemetry/api");
function fallbackIfNullishOrBlank(signalSpecific, nonSignalSpecific) {
    if (signalSpecific != null && signalSpecific !== '') {
        return signalSpecific;
    }
    if (nonSignalSpecific != null && nonSignalSpecific !== '') {
        return nonSignalSpecific;
    }
    return undefined;
}
function getMetadataFromEnv(signalIdentifier) {
    const signalSpecificRawHeaders = process.env[`OTEL_EXPORTER_OTLP_${signalIdentifier}_HEADERS`]?.trim();
    const nonSignalSpecificRawHeaders = process.env['OTEL_EXPORTER_OTLP_HEADERS']?.trim();
    const signalSpecificHeaders = (0, core_1.parseKeyPairsIntoRecord)(signalSpecificRawHeaders);
    const nonSignalSpecificHeaders = (0, core_1.parseKeyPairsIntoRecord)(nonSignalSpecificRawHeaders);
    if (Object.keys(signalSpecificHeaders).length === 0 &&
        Object.keys(nonSignalSpecificHeaders).length === 0) {
        return undefined;
    }
    const mergeHeaders = Object.assign({}, nonSignalSpecificHeaders, signalSpecificHeaders);
    const metadata = (0, grpc_exporter_transport_1.createEmptyMetadata)();
    // for this to work, metadata MUST be empty - otherwise `Metadata#set()` will merge items.
    for (const [key, value] of Object.entries(mergeHeaders)) {
        metadata.set(key, value);
    }
    return metadata;
}
function getMetadataProviderFromEnv(signalIdentifier) {
    const metadata = getMetadataFromEnv(signalIdentifier);
    if (metadata == null) {
        return undefined;
    }
    return () => metadata;
}
function getUrlFromEnv(signalIdentifier) {
    // This does not change the string beyond trimming on purpose.
    // Normally a user would just use a host and port for gRPC, but the OTLP Exporter specification requires us to
    // use the raw provided endpoint to derive credential settings. Therefore, we only normalize right when
    // we merge user-provided, env-provided and defaults together, and we have determined which credentials to use.
    //
    // Examples:
    // - example.test:4317 -> use secure credentials from environment (or provided via code)
    // - http://example.test:4317 -> use insecure credentials if nothing else is provided
    // - https://example.test:4317 -> use secure credentials from environment (or provided via code)
    const specificEndpoint = process.env[`OTEL_EXPORTER_OTLP_${signalIdentifier}_ENDPOINT`]?.trim();
    const nonSpecificEndpoint = process.env[`OTEL_EXPORTER_OTLP_ENDPOINT`]?.trim();
    return fallbackIfNullishOrBlank(specificEndpoint, nonSpecificEndpoint);
}
/**
 * Determines whether the env var for insecure credentials is set to {@code true}.
 *
 * It will allow the following values as {@code true}
 * - 'true'
 * - 'true   '
 * - '   true'
 * - 'TrUE'
 * - 'TRUE'
 *
 * It will not allow:
 * - 'true false'
 * - 'false true'
 * - 'true!'
 * - 'true,true'
 * - '1'
 * - ' '
 *
 * @param signalIdentifier
 */
function getInsecureSettingFromEnv(signalIdentifier) {
    const signalSpecificInsecureValue = process.env[`OTEL_EXPORTER_OTLP_${signalIdentifier}_INSECURE`]
        ?.toLowerCase()
        .trim();
    const nonSignalSpecificInsecureValue = process.env[`OTEL_EXPORTER_OTLP_INSECURE`]
        ?.toLowerCase()
        .trim();
    return (fallbackIfNullishOrBlank(signalSpecificInsecureValue, nonSignalSpecificInsecureValue) === 'true');
}
function readFileFromEnv(signalSpecificEnvVar, nonSignalSpecificEnvVar, warningMessage) {
    const signalSpecificPath = process.env[signalSpecificEnvVar]?.trim();
    const nonSignalSpecificPath = process.env[nonSignalSpecificEnvVar]?.trim();
    const filePath = fallbackIfNullishOrBlank(signalSpecificPath, nonSignalSpecificPath);
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
function getCredentialsFromEnvIgnoreInsecure(signalIdentifier) {
    const clientKey = getClientKeyFromEnv(signalIdentifier);
    const clientCertificate = getClientCertificateFromEnv(signalIdentifier);
    const rootCertificate = getRootCertificateFromEnv(signalIdentifier);
    // if the chain is not intact, @grpc/grpc-js will throw. This is fine when a user provides it in code, but env var
    // config is not allowed to throw, so we add this safeguard and try to make the best of it here.
    const clientChainIntact = clientKey != null && clientCertificate != null;
    if (rootCertificate != null && !clientChainIntact) {
        api_1.diag.warn('Client key and certificate must both be provided, but one was missing - attempting to create credentials from just the root certificate');
        return (0, grpc_exporter_transport_1.createSslCredentials)(getRootCertificateFromEnv(signalIdentifier));
    }
    return (0, grpc_exporter_transport_1.createSslCredentials)(rootCertificate, clientKey, clientCertificate);
}
function getCredentialsFromEnv(signalIdentifier) {
    if (getInsecureSettingFromEnv(signalIdentifier)) {
        return (0, grpc_exporter_transport_1.createInsecureCredentials)();
    }
    return getCredentialsFromEnvIgnoreInsecure(signalIdentifier);
}
function getOtlpGrpcConfigurationFromEnv(signalIdentifier) {
    return {
        ...(0, node_http_1.getSharedConfigurationFromEnvironment)(signalIdentifier),
        metadata: getMetadataProviderFromEnv(signalIdentifier),
        url: getUrlFromEnv(signalIdentifier),
        credentials: (finalResolvedUrl) => {
            // Always assume insecure on http:// and secure on https://, the protocol always takes precedence over the insecure setting.
            // note: the spec does not make any exception for
            // - "localhost:4317". If the protocol is omitted, credentials are required unless insecure is set
            // - "unix://", as it's neither http:// nor https:// and therefore credentials are required unless insecure is set
            if (finalResolvedUrl.startsWith('http://')) {
                return () => {
                    return (0, grpc_exporter_transport_1.createInsecureCredentials)();
                };
            }
            else if (finalResolvedUrl.startsWith('https://')) {
                return () => {
                    return getCredentialsFromEnvIgnoreInsecure(signalIdentifier);
                };
            }
            // defer to env settings in this case
            return () => {
                return getCredentialsFromEnv(signalIdentifier);
            };
        },
    };
}
exports.getOtlpGrpcConfigurationFromEnv = getOtlpGrpcConfigurationFromEnv;
//# sourceMappingURL=otlp-grpc-env-configuration.js.map