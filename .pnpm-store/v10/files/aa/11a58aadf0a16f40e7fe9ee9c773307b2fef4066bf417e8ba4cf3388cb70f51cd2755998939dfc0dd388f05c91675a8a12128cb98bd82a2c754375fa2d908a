"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeHttpConfigurationDefaults = exports.mergeOtlpNodeHttpConfigurationWithDefaults = exports.httpAgentFactoryFromOptions = void 0;
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const otlp_http_configuration_1 = require("./otlp-http-configuration");
function httpAgentFactoryFromOptions(options) {
    return async (protocol) => {
        const module = protocol === 'http:' ? import('http') : import('https');
        const { Agent } = await module;
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