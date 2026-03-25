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
import { SDK_INFO } from '@opentelemetry/core';
import { ATTR_SERVICE_NAME, ATTR_TELEMETRY_SDK_LANGUAGE, ATTR_TELEMETRY_SDK_NAME, ATTR_TELEMETRY_SDK_VERSION, } from '@opentelemetry/semantic-conventions';
import { defaultServiceName } from './platform';
import { isPromiseLike } from './utils';
class ResourceImpl {
    _rawAttributes;
    _asyncAttributesPending = false;
    _memoizedAttributes;
    static FromAttributeList(attributes) {
        const res = new ResourceImpl({});
        res._rawAttributes = attributes;
        res._asyncAttributesPending =
            attributes.filter(([_, val]) => isPromiseLike(val)).length > 0;
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
            if (isPromiseLike(v)) {
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
                this._rawAttributes[i] = [k, isPromiseLike(v) ? await v : v];
            }
            catch (err) {
                diag.debug("a resource's async attributes promise rejected: %s", err);
                this._rawAttributes[i] = [k, undefined];
            }
        }
        this._asyncAttributesPending = false;
    }
    get attributes() {
        if (this.asyncAttributesPending) {
            diag.error('Accessing resource attributes before async attributes settled');
        }
        if (this._memoizedAttributes) {
            return this._memoizedAttributes;
        }
        const attrs = {};
        for (const [k, v] of this._rawAttributes) {
            if (isPromiseLike(v)) {
                diag.debug(`Unsettled resource attribute ${k} skipped`);
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
export function resourceFromAttributes(attributes) {
    return ResourceImpl.FromAttributeList(Object.entries(attributes));
}
export function resourceFromDetectedResource(detectedResource) {
    return new ResourceImpl(detectedResource);
}
export function emptyResource() {
    return resourceFromAttributes({});
}
export function defaultResource() {
    return resourceFromAttributes({
        [ATTR_SERVICE_NAME]: defaultServiceName(),
        [ATTR_TELEMETRY_SDK_LANGUAGE]: SDK_INFO[ATTR_TELEMETRY_SDK_LANGUAGE],
        [ATTR_TELEMETRY_SDK_NAME]: SDK_INFO[ATTR_TELEMETRY_SDK_NAME],
        [ATTR_TELEMETRY_SDK_VERSION]: SDK_INFO[ATTR_TELEMETRY_SDK_VERSION],
    });
}
//# sourceMappingURL=ResourceImpl.js.map