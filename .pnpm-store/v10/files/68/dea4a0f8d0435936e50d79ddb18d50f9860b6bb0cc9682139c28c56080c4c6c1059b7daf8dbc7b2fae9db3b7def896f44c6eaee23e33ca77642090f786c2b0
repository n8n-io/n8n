/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { getHttpConfigurationDefaults, mergeOtlpHttpConfigurationWithDefaults, } from './otlp-http-configuration';
export function httpAgentFactoryFromOptions(options) {
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
/**
 * @param userProvidedConfiguration  Configuration options provided by the user in code.
 * @param fallbackConfiguration Fallback to use when the {@link userProvidedConfiguration} does not specify an option.
 * @param defaultConfiguration The defaults as defined by the exporter specification
 */
export function mergeOtlpNodeHttpConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
        ...mergeOtlpHttpConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration),
        agentFactory: userProvidedConfiguration.agentFactory ??
            fallbackConfiguration.agentFactory ??
            defaultConfiguration.agentFactory,
        userAgent: userProvidedConfiguration.userAgent,
    };
}
export function getNodeHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return {
        ...getHttpConfigurationDefaults(requiredHeaders, signalResourcePath),
        agentFactory: httpAgentFactoryFromOptions({ keepAlive: true }),
    };
}
//# sourceMappingURL=otlp-node-http-configuration.js.map