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
import { DEFAULT_ATTRIBUTE_COUNT_LIMIT, DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT, getEnv, getEnvWithoutDefaults, } from '@opentelemetry/core';
export function loadDefaultConfig() {
    return {
        forceFlushTimeoutMillis: 30000,
        logRecordLimits: {
            attributeValueLengthLimit: getEnv().OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT,
            attributeCountLimit: getEnv().OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT,
        },
        includeTraceContext: true,
    };
}
/**
 * When general limits are provided and model specific limits are not,
 * configures the model specific limits by using the values from the general ones.
 * @param logRecordLimits User provided limits configuration
 */
export function reconfigureLimits(logRecordLimits) {
    var _a, _b, _c, _d, _e, _f;
    const parsedEnvConfig = getEnvWithoutDefaults();
    return {
        /**
         * Reassign log record attribute count limit to use first non null value defined by user or use default value
         */
        attributeCountLimit: (_c = (_b = (_a = logRecordLimits.attributeCountLimit) !== null && _a !== void 0 ? _a : parsedEnvConfig.OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT) !== null && _b !== void 0 ? _b : parsedEnvConfig.OTEL_ATTRIBUTE_COUNT_LIMIT) !== null && _c !== void 0 ? _c : DEFAULT_ATTRIBUTE_COUNT_LIMIT,
        /**
         * Reassign log record attribute value length limit to use first non null value defined by user or use default value
         */
        attributeValueLengthLimit: (_f = (_e = (_d = logRecordLimits.attributeValueLengthLimit) !== null && _d !== void 0 ? _d : parsedEnvConfig.OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT) !== null && _e !== void 0 ? _e : parsedEnvConfig.OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT) !== null && _f !== void 0 ? _f : DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    };
}
//# sourceMappingURL=config.js.map