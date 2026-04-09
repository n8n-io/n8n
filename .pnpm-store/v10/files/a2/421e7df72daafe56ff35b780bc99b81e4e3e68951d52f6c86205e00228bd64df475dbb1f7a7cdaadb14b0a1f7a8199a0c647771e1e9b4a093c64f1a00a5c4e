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
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_TELEMETRY_SDK_LANGUAGE, SEMRESATTRS_TELEMETRY_SDK_NAME, SEMRESATTRS_TELEMETRY_SDK_VERSION, } from '@opentelemetry/semantic-conventions';
import { SDK_INFO } from '@opentelemetry/core';
import { defaultServiceName } from './platform';
/**
 * A Resource describes the entity for which a signals (metrics or trace) are
 * collected.
 */
export class Resource {
    constructor(
    /**
     * A dictionary of attributes with string keys and values that provide
     * information about the entity as numbers, strings or booleans
     * TODO: Consider to add check/validation on attributes.
     */
    attributes, asyncAttributesPromise) {
        var _a;
        this._attributes = attributes;
        this.asyncAttributesPending = asyncAttributesPromise != null;
        this._syncAttributes = (_a = this._attributes) !== null && _a !== void 0 ? _a : {};
        this._asyncAttributesPromise = asyncAttributesPromise === null || asyncAttributesPromise === void 0 ? void 0 : asyncAttributesPromise.then(asyncAttributes => {
            this._attributes = Object.assign({}, this._attributes, asyncAttributes);
            this.asyncAttributesPending = false;
            return asyncAttributes;
        }, err => {
            diag.debug("a resource's async attributes promise rejected: %s", err);
            this.asyncAttributesPending = false;
            return {};
        });
    }
    /**
     * Returns an empty Resource
     */
    static empty() {
        return Resource.EMPTY;
    }
    /**
     * Returns a Resource that identifies the SDK in use.
     */
    static default() {
        return new Resource({
            [SEMRESATTRS_SERVICE_NAME]: defaultServiceName(),
            [SEMRESATTRS_TELEMETRY_SDK_LANGUAGE]: SDK_INFO[SEMRESATTRS_TELEMETRY_SDK_LANGUAGE],
            [SEMRESATTRS_TELEMETRY_SDK_NAME]: SDK_INFO[SEMRESATTRS_TELEMETRY_SDK_NAME],
            [SEMRESATTRS_TELEMETRY_SDK_VERSION]: SDK_INFO[SEMRESATTRS_TELEMETRY_SDK_VERSION],
        });
    }
    get attributes() {
        var _a;
        if (this.asyncAttributesPending) {
            diag.error('Accessing resource attributes before async attributes settled');
        }
        return (_a = this._attributes) !== null && _a !== void 0 ? _a : {};
    }
    /**
     * Returns a promise that will never be rejected. Resolves when all async attributes have finished being added to
     * this Resource's attributes. This is useful in exporters to block until resource detection
     * has finished.
     */
    async waitForAsyncAttributes() {
        if (this.asyncAttributesPending) {
            await this._asyncAttributesPromise;
        }
    }
    /**
     * Returns a new, merged {@link Resource} by merging the current Resource
     * with the other Resource. In case of a collision, other Resource takes
     * precedence.
     *
     * @param other the Resource that will be merged with this.
     * @returns the newly merged Resource.
     */
    merge(other) {
        var _a;
        if (!other)
            return this;
        // SpanAttributes from other resource overwrite attributes from this resource.
        const mergedSyncAttributes = Object.assign(Object.assign({}, this._syncAttributes), ((_a = other._syncAttributes) !== null && _a !== void 0 ? _a : other.attributes));
        if (!this._asyncAttributesPromise &&
            !other._asyncAttributesPromise) {
            return new Resource(mergedSyncAttributes);
        }
        const mergedAttributesPromise = Promise.all([
            this._asyncAttributesPromise,
            other._asyncAttributesPromise,
        ]).then(([thisAsyncAttributes, otherAsyncAttributes]) => {
            var _a;
            return Object.assign(Object.assign(Object.assign(Object.assign({}, this._syncAttributes), thisAsyncAttributes), ((_a = other._syncAttributes) !== null && _a !== void 0 ? _a : other.attributes)), otherAsyncAttributes);
        });
        return new Resource(mergedSyncAttributes, mergedAttributesPromise);
    }
}
Resource.EMPTY = new Resource({});
//# sourceMappingURL=Resource.js.map