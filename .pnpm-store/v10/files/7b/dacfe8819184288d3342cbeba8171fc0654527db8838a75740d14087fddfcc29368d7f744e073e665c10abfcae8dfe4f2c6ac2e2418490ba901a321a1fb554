import { diag } from '@opentelemetry/api';
function parseAndValidateTimeoutFromEnv(timeoutEnvVar) {
    const envTimeout = process.env[timeoutEnvVar]?.trim();
    if (envTimeout != null && envTimeout !== '') {
        const definedTimeout = Number(envTimeout);
        if (Number.isFinite(definedTimeout) && definedTimeout > 0) {
            return definedTimeout;
        }
        diag.warn(`Configuration: ${timeoutEnvVar} is invalid, expected number greater than 0 (actual: ${envTimeout})`);
    }
    return undefined;
}
function getTimeoutFromEnv(signalIdentifier) {
    const specificTimeout = parseAndValidateTimeoutFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_TIMEOUT`);
    const nonSpecificTimeout = parseAndValidateTimeoutFromEnv('OTEL_EXPORTER_OTLP_TIMEOUT');
    return specificTimeout ?? nonSpecificTimeout;
}
function parseAndValidateCompressionFromEnv(compressionEnvVar) {
    const compression = process.env[compressionEnvVar]?.trim();
    if (compression === '') {
        return undefined;
    }
    if (compression == null || compression === 'none' || compression === 'gzip') {
        return compression;
    }
    diag.warn(`Configuration: ${compressionEnvVar} is invalid, expected 'none' or 'gzip' (actual: '${compression}')`);
    return undefined;
}
function getCompressionFromEnv(signalIdentifier) {
    const specificCompression = parseAndValidateCompressionFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_COMPRESSION`);
    const nonSpecificCompression = parseAndValidateCompressionFromEnv('OTEL_EXPORTER_OTLP_COMPRESSION');
    return specificCompression ?? nonSpecificCompression;
}
export function getSharedConfigurationFromEnvironment(signalIdentifier) {
    return {
        timeoutMillis: getTimeoutFromEnv(signalIdentifier),
        compression: getCompressionFromEnv(signalIdentifier),
    };
}
//# sourceMappingURL=shared-env-configuration.js.map