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
exports.defaultResource = exports.emptyResource = exports.resourceFromDetectedResource = exports.resourceFromAttributes = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const platform_1 = require("./platform");
const utils_1 = require("./utils");
class ResourceImpl {
    _rawAttributes;
    _asyncAttributesPending = false;
    _memoizedAttributes;
    static FromAttributeList(attributes) {
        const res = new ResourceImpl({});
        res._rawAttributes = attributes;
        res._asyncAttributesPending =
            attributes.filter(([_, val]) => (0, utils_1.isPromiseLike)(val)).length > 0;
        return res;
    }
    constructor(
    /**
     * A dictionary of attributes with string keys and values that provide
     * information about the entity as numbers, strings or booleans
     * TODO: Consider to add check/validation on attributes.
     */
    resource) {
        const attributes = resource.attributes ?? {};
        this._rawAttributes = Object.entries(attributes).map(([k, v]) => {
            if ((0, utils_1.isPromiseLike)(v)) {
                // side-effect
                this._asyncAttributesPending = true;
            }
            return [k, v];
        });
    }
    get asyncAttributesPending() {
        return this._asyncAttributesPending;
    }
    async waitForAsyncAttributes() {
        if (!this.asyncAttributesPending) {
            return;
        }
        for (let i = 0; i < this._rawAttributes.length; i++) {
            const [k, v] = this._rawAttributes[i];
            try {
                this._rawAttributes[i] = [k, (0, utils_1.isPromiseLike)(v) ? await v : v];
            }
            catch (err) {
                api_1.diag.debug("a resource's async attributes promise rejected: %s", err);
                this._rawAttributes[i] = [k, undefined];
            }
        }
        this._asyncAttributesPending = false;
    }
    get attributes() {
        if (this.asyncAttributesPending) {
            api_1.diag.error('Accessing resource attributes before async attributes settled');
        }
        if (this._memoizedAttributes) {
            return this._memoizedAttributes;
        }
        const attrs = {};
        for (const [k, v] of this._rawAttributes) {
            if ((0, utils_1.isPromiseLike)(v)) {
                api_1.diag.debug(`Unsettled resource attribute ${k} skipped`);
                continue;
            }
            if (v != null) {
                attrs[k] ??= v;
            }
        }
        // only memoize output if all attributes are settled
        if (!this._asyncAttributesPending) {
            this._memoizedAttributes = attrs;
        }
        return attrs;
    }
    getRawAttributes() {
        return this._rawAttributes;
    }
    merge(resource) {
        if (resource == null)
            return this;
        // Order is important
        // Spec states incoming attributes override existing attributes
        return ResourceImpl.FromAttributeList([
            ...resource.getRawAttributes(),
            ...this.getRawAttributes(),
        ]);
    }
}
function resourceFromAttributes(attributes) {
    return ResourceImpl.FromAttributeList(Object.entries(attributes));
}
exports.resourceFromAttributes = resourceFromAttributes;
function resourceFromDetectedResource(detectedResource) {
    return new ResourceImpl(detectedResource);
}
exports.resourceFromDetectedResource = resourceFromDetectedResource;
function emptyResource() {
    return resourceFromAttributes({});
}
exports.emptyResource = emptyResource;
function defaultResource() {
    return resourceFromAttributes({
        [semantic_conventions_1.ATTR_SERVICE_NAME]: (0, platform_1.defaultServiceName)(),
        [semantic_conventions_1.ATTR_TELEMETRY_SDK_LANGUAGE]: core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_LANGUAGE],
        [semantic_conventions_1.ATTR_TELEMETRY_SDK_NAME]: core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_NAME],
        [semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION]: core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION],
    });
}
exports.defaultResource = defaultResource;
//# sourceMappingURL=ResourceImpl.js.map