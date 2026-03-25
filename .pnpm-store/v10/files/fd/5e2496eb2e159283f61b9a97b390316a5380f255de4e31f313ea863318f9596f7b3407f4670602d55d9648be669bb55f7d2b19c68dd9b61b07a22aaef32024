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
import { getNumberFromEnv } from '@opentelemetry/core';
export function loadDefaultConfig() {
    return {
        forceFlushTimeoutMillis: 30000,
        logRecordLimits: {
            attributeValueLengthLimit: getNumberFromEnv('OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT') ??
                Infinity,
            attributeCountLimit: getNumberFromEnv('OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT') ?? 128,
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
    return {
        /**
         * Reassign log record attribute count limit to use first non null value defined by user or use default value
         */
        attributeCountLimit: logRecordLimits.attributeCountLimit ??
            getNumberFromEnv('OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT') ??
            getNumberFromEnv('OTEL_ATTRIBUTE_COUNT_LIMIT') ??
            128,
        /**
         * Reassign log record attribute value length limit to use first non null value defined by user or use default value
         */
        attributeValueLengthLimit: logRecordLimits.attributeValueLengthLimit ??
            getNumberFromEnv('OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT') ??
            getNumberFromEnv('OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT') ??
            Infinity,
    };
}
//# sourceMappingURL=config.js.map