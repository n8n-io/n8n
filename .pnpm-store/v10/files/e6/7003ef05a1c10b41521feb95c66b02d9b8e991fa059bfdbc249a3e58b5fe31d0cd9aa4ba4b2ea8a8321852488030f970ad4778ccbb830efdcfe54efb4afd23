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
import { buildSamplerFromEnv, loadDefaultConfig } from './config';
import { getNumberFromEnv } from '@opentelemetry/core';
export const DEFAULT_ATTRIBUTE_COUNT_LIMIT = 128;
export const DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = Infinity;
/**
 * Function to merge Default configuration (as specified in './config') with
 * user provided configurations.
 */
export function mergeConfig(userConfig) {
    const perInstanceDefaults = {
        sampler: buildSamplerFromEnv(),
    };
    const DEFAULT_CONFIG = loadDefaultConfig();
    const target = Object.assign({}, DEFAULT_CONFIG, perInstanceDefaults, userConfig);
    target.generalLimits = Object.assign({}, DEFAULT_CONFIG.generalLimits, userConfig.generalLimits || {});
    target.spanLimits = Object.assign({}, DEFAULT_CONFIG.spanLimits, userConfig.spanLimits || {});
    return target;
}
/**
 * When general limits are provided and model specific limits are not,
 * configures the model specific limits by using the values from the general ones.
 * @param userConfig User provided tracer configuration
 */
export function reconfigureLimits(userConfig) {
    const spanLimits = Object.assign({}, userConfig.spanLimits);
    /**
     * Reassign span attribute count limit to use first non null value defined by user or use default value
     */
    spanLimits.attributeCountLimit =
        userConfig.spanLimits?.attributeCountLimit ??
            userConfig.generalLimits?.attributeCountLimit ??
            getNumberFromEnv('OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT') ??
            getNumberFromEnv('OTEL_ATTRIBUTE_COUNT_LIMIT') ??
            DEFAULT_ATTRIBUTE_COUNT_LIMIT;
    /**
     * Reassign span attribute value length limit to use first non null value defined by user or use default value
     */
    spanLimits.attributeValueLengthLimit =
        userConfig.spanLimits?.attributeValueLengthLimit ??
            userConfig.generalLimits?.attributeValueLengthLimit ??
            getNumberFromEnv('OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT') ??
            getNumberFromEnv('OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT') ??
            DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT;
    return Object.assign({}, userConfig, { spanLimits });
}
//# sourceMappingURL=utility.js.map