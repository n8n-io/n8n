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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import { diag } from '@opentelemetry/api';
import { getEnv } from '@opentelemetry/core';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { Resource } from '../Resource';
/**
 * EnvDetectorSync can be used to detect the presence of and create a Resource
 * from the OTEL_RESOURCE_ATTRIBUTES environment variable.
 */
var EnvDetectorSync = /** @class */ (function () {
    function EnvDetectorSync() {
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
    EnvDetectorSync.prototype.detect = function (_config) {
        var attributes = {};
        var env = getEnv();
        var rawAttributes = env.OTEL_RESOURCE_ATTRIBUTES;
        var serviceName = env.OTEL_SERVICE_NAME;
        if (rawAttributes) {
            try {
                var parsedAttributes = this._parseResourceAttributes(rawAttributes);
                Object.assign(attributes, parsedAttributes);
            }
            catch (e) {
                diag.debug("EnvDetector failed: " + e.message);
            }
        }
        if (serviceName) {
            attributes[SEMRESATTRS_SERVICE_NAME] = serviceName;
        }
        return new Resource(attributes);
    };
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
    EnvDetectorSync.prototype._parseResourceAttributes = function (rawEnvAttributes) {
        var e_1, _a;
        if (!rawEnvAttributes)
            return {};
        var attributes = {};
        var rawAttributes = rawEnvAttributes.split(this._COMMA_SEPARATOR, -1);
        try {
            for (var rawAttributes_1 = __values(rawAttributes), rawAttributes_1_1 = rawAttributes_1.next(); !rawAttributes_1_1.done; rawAttributes_1_1 = rawAttributes_1.next()) {
                var rawAttribute = rawAttributes_1_1.value;
                var keyValuePair = rawAttribute.split(this._LABEL_KEY_VALUE_SPLITTER, -1);
                if (keyValuePair.length !== 2) {
                    continue;
                }
                var _b = __read(keyValuePair, 2), key = _b[0], value = _b[1];
                // Leading and trailing whitespaces are trimmed.
                key = key.trim();
                value = value.trim().split(/^"|"$/).join('');
                if (!this._isValidAndNotEmpty(key)) {
                    throw new Error("Attribute key " + this._ERROR_MESSAGE_INVALID_CHARS);
                }
                if (!this._isValid(value)) {
                    throw new Error("Attribute value " + this._ERROR_MESSAGE_INVALID_VALUE);
                }
                attributes[key] = decodeURIComponent(value);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (rawAttributes_1_1 && !rawAttributes_1_1.done && (_a = rawAttributes_1.return)) _a.call(rawAttributes_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return attributes;
    };
    /**
     * Determines whether the given String is a valid printable ASCII string with
     * a length not exceed _MAX_LENGTH characters.
     *
     * @param str The String to be validated.
     * @returns Whether the String is valid.
     */
    EnvDetectorSync.prototype._isValid = function (name) {
        return name.length <= this._MAX_LENGTH && this._isBaggageOctetString(name);
    };
    // https://www.w3.org/TR/baggage/#definition
    EnvDetectorSync.prototype._isBaggageOctetString = function (str) {
        for (var i = 0; i < str.length; i++) {
            var ch = str.charCodeAt(i);
            if (ch < 0x21 || ch === 0x2c || ch === 0x3b || ch === 0x5c || ch > 0x7e) {
                return false;
            }
        }
        return true;
    };
    /**
     * Determines whether the given String is a valid printable ASCII string with
     * a length greater than 0 and not exceed _MAX_LENGTH characters.
     *
     * @param str The String to be validated.
     * @returns Whether the String is valid and not empty.
     */
    EnvDetectorSync.prototype._isValidAndNotEmpty = function (str) {
        return str.length > 0 && this._isValid(str);
    };
    return EnvDetectorSync;
}());
export var envDetectorSync = new EnvDetectorSync();
//# sourceMappingURL=EnvDetectorSync.js.map