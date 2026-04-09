"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeHttpConfigurationDefaults = exports.mergeOtlpNodeHttpConfigurationWithDefaults = exports.httpAgentFactoryFromOptions = void 0;
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
const otlp_http_configuration_1 = require("./otlp-http-configuration");
function httpAgentFactoryFromOptions(options) {
    return async (protocol) => {
        const isInsecure = protocol === 'http:';
        const module = isInsecure ? import('http') : import('https');
        const { Agent } = await module;
        if (isInsecure) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- these props should not be used in agent options
            const { ca, cert, key, ...insecureOptions } = options;
            return new Agent(insecureOptions);
        }
        return new Agent(options);
    };
}
exports.httpAgentFactoryFromOptions = httpAgentFactoryFromOptions;
/**
 * @param userProvidedConfiguration  Configuration options provided by the user in code.
 * @param fallbackConfiguration Fallback to use when the {@link userProvidedConfiguration} does not specify an option.
 * @param defaultConfiguration The defaults as defined by the exporter specification
 */
function mergeOtlpNodeHttpConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
        ...(0, otlp_http_configuration_1.mergeOtlpHttpConfigurationWithDefaults)(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration),
        agentFactory: userProvidedConfiguration.agentFactory ??
            fallbackConfiguration.agentFactory ??
            defaultConfiguration.agentFactory,
        userAgent: userProvidedConfiguration.userAgent,
    };
}
exports.mergeOtlpNodeHttpConfigurationWithDefaults = mergeOtlpNodeHttpConfigurationWithDefaults;
function getNodeHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return {
        ...(0, otlp_http_configuration_1.getHttpConfigurationDefaults)(requiredHeaders, signalResourcePath),
        agentFactory: httpAgentFactoryFromOptions({ keepAlive: true }),
    };
}
exports.getNodeHttpConfigurationDefaults = getNodeHttpConfigurationDefaults;
//# sourceMappingURL=otlp-node-http-configuration.js.map