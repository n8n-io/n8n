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
import { diag } from '@opentelemetry/api';
import { getEnv } from '@opentelemetry/core';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { Resource } from '../Resource';
/**
 * EnvDetectorSync can be used to detect the presence of and create a Resource
 * from the OTEL_RESOURCE_ATTRIBUTES environment variable.
 */
class EnvDetectorSync {
    constructor() {
        // Type, attribute keys, and attribute values should not exceed 256 characters.
        this._MAX_LENGTH = 255;
        // OTEL_RESOURCE_ATTRIBUTES is a comma-separated list of attributes.
        this._COMMA_SEPARATOR = ',';
        // OTEL_RESOURCE_ATTRIBUTES contains key value pair separated by '='.
        this._LABEL_KEY_VALUE_SPLITTER = '=';
        this._ERROR_MESSAGE_INVALID_CHARS = 'should be a ASCII string with a length greater than 0 and not exceed ' +
            this._MAX_LENGTH +
            ' characters.';
        this._ERROR_MESSAGE_INVALID_VALUE = 'should be a ASCII string with a length not exceed ' +
            this._MAX_LENGTH +
            ' characters.';
    }
    /**
     * Returns a {@link Resource} populated with attributes from the
     * OTEL_RESOURCE_ATTRIBUTES environment variable. Note this is an async
     * function to conform to the Detector interface.
     *
     * @param config The resource detection config
     */
    detect(_config) {
        const attributes = {};
        const env = getEnv();
        const rawAttributes = env.OTEL_RESOURCE_ATTRIBUTES;
        const serviceName = env.OTEL_SERVICE_NAME;
        if (rawAttributes) {
            try {
                const parsedAttributes = this._parseResourceAttributes(rawAttributes);
                Object.assign(attributes, parsedAttributes);
            }
            catch (e) {
                diag.debug(`EnvDetector failed: ${e.message}`);
            }
        }
        if (serviceName) {
            attributes[SEMRESATTRS_SERVICE_NAME] = serviceName;
        }
        return new Resource(attributes);
    }
    /**
     * Creates an attribute map from the OTEL_RESOURCE_ATTRIBUTES environment
     * variable.
     *
     * OTEL_RESOURCE_ATTRIBUTES: A comma-separated list of attributes describing
     * the source in more detail, e.g. “key1=val1,key2=val2”. Domain names and
     * paths are accepted as attribute keys. Values may be quoted or unquoted in
     * general. If a value contains whitespace, =, or " characters, it must
     * always be quoted.
     *
     * @param rawEnvAttributes The resource attributes as a comma-separated list
     * of key/value pairs.
     * @returns The sanitized resource attributes.
     */
    _parseResourceAttributes(rawEnvAttributes) {
        if (!rawEnvAttributes)
            return {};
        const attributes = {};
        const rawAttributes = rawEnvAttributes.split(this._COMMA_SEPARATOR, -1);
        for (const rawAttribute of rawAttributes) {
            const keyValuePair = rawAttribute.split(this._LABEL_KEY_VALUE_SPLITTER, -1);
            if (keyValuePair.length !== 2) {
                continue;
            }
            let [key, value] = keyValuePair;
            // Leading and trailing whitespaces are trimmed.
            key = key.trim();
            value = value.trim().split(/^"|"$/).join('');
            if (!this._isValidAndNotEmpty(key)) {
                throw new Error(`Attribute key ${this._ERROR_MESSAGE_INVALID_CHARS}`);
            }
            if (!this._isValid(value)) {
                throw new Error(`Attribute value ${this._ERROR_MESSAGE_INVALID_VALUE}`);
            }
            attributes[key] = decodeURIComponent(value);
        }
        return attributes;
    }
    /**
     * Determines whether the given String is a valid printable ASCII string with
     * a length not exceed _MAX_LENGTH characters.
     *
     * @param str The String to be validated.
     * @returns Whether the String is valid.
     */
    _isValid(name) {
        return name.length <= this._MAX_LENGTH && this._isBaggageOctetString(name);
    }
    // https://www.w3.org/TR/baggage/#definition
    _isBaggageOctetString(str) {
        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i);
            if (ch < 0x21 || ch === 0x2c || ch === 0x3b || ch === 0x5c || ch > 0x7e) {
                return false;
            }
        }
        return true;
    }
    /**
     * Determines whether the given String is a valid printable ASCII string with
     * a length greater than 0 and not exceed _MAX_LENGTH characters.
     *
     * @param str The String to be validated.
     * @returns Whether the String is valid and not empty.
     */
    _isValidAndNotEmpty(str) {
        return str.length > 0 && this._isValid(str);
    }
}
export const envDetectorSync = new EnvDetectorSync();
//# sourceMappingURL=EnvDetectorSync.js.map