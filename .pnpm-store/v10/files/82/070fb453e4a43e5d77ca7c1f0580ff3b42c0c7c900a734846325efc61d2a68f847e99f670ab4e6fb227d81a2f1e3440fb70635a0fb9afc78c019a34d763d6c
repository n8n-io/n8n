"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resource = void 0;
const api_1 = require("@opentelemetry/api");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const core_1 = require("@opentelemetry/core");
const platform_1 = require("./platform");
/**
 * A Resource describes the entity for which a signals (metrics or trace) are
 * collected.
 */
class Resource {
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
            api_1.diag.debug("a resource's async attributes promise rejected: %s", err);
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
            [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: (0, platform_1.defaultServiceName)(),
            [semantic_conventions_1.SEMRESATTRS_TELEMETRY_SDK_LANGUAGE]: core_1.SDK_INFO[semantic_conventions_1.SEMRESATTRS_TELEMETRY_SDK_LANGUAGE],
            [semantic_conventions_1.SEMRESATTRS_TELEMETRY_SDK_NAME]: core_1.SDK_INFO[semantic_conventions_1.SEMRESATTRS_TELEMETRY_SDK_NAME],
            [semantic_conventions_1.SEMRESATTRS_TELEMETRY_SDK_VERSION]: core_1.SDK_INFO[semantic_conventions_1.SEMRESATTRS_TELEMETRY_SDK_VERSION],
        });
    }
    get attributes() {
        var _a;
        if (this.asyncAttributesPending) {
            api_1.diag.error('Accessing resource attributes before async attributes settled');
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
exports.Resource = Resource;
Resource.EMPTY = new Resource({});
//# sourceMappingURL=Resource.js.map