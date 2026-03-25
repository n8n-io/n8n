"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLegacyOtlpGrpcOptions = void 0;
const api_1 = require("@opentelemetry/api");
const otlp_grpc_configuration_1 = require("./otlp-grpc-configuration");
const grpc_exporter_transport_1 = require("../grpc-exporter-transport");
const otlp_grpc_env_configuration_1 = require("./otlp-grpc-env-configuration");
/**
 * @deprecated
 * @param config
 * @param signalIdentifier
 */
function convertLegacyOtlpGrpcOptions(config, signalIdentifier) {
    if (config.headers) {
        api_1.diag.warn('Headers cannot be set when using grpc');
    }
    // keep credentials locally in case user updates the reference on the config object
    const userProvidedCredentials = config.credentials;
    return (0, otlp_grpc_configuration_1.mergeOtlpGrpcConfigurationWithDefaults)({
        url: config.url,
        metadata: () => {
            // metadata resolution strategy is merge, so we can return empty here, and it will not override the rest of the settings.
            return config.metadata ?? (0, grpc_exporter_transport_1.createEmptyMetadata)();
        },
        compression: config.compression,
        timeoutMillis: config.timeoutMillis,
        concurrencyLimit: config.concurrencyLimit,
        credentials: userProvidedCredentials != null
            ? () => userProvidedCredentials
            : undefined,
    }, (0, otlp_grpc_env_configuration_1.getOtlpGrpcConfigurationFromEnv)(signalIdentifier), (0, otlp_grpc_configuration_1.getOtlpGrpcDefaultConfiguration)());
}
exports.convertLegacyOtlpGrpcOptions = convertLegacyOtlpGrpcOptions;
//# sourceMappingURL=convert-legacy-otlp-grpc-options.js.map