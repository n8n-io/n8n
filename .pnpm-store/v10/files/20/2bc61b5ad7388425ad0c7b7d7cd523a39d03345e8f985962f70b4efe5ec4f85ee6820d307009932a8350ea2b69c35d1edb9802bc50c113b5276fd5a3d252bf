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
class NoopAttributesProcessor {
    process(incoming, _context) {
        return incoming;
    }
}
class MultiAttributesProcessor {
    _processors;
    constructor(_processors) {
        this._processors = _processors;
    }
    process(incoming, context) {
        let filteredAttributes = incoming;
        for (const processor of this._processors) {
            filteredAttributes = processor.process(filteredAttributes, context);
        }
        return filteredAttributes;
    }
}
class AllowListProcessor {
    _allowedAttributeNames;
    constructor(_allowedAttributeNames) {
        this._allowedAttributeNames = _allowedAttributeNames;
    }
    process(incoming, _context) {
        const filteredAttributes = {};
        Object.keys(incoming)
            .filter(attributeName => this._allowedAttributeNames.includes(attributeName))
            .forEach(attributeName => (filteredAttributes[attributeName] = incoming[attributeName]));
        return filteredAttributes;
    }
}
class DenyListProcessor {
    _deniedAttributeNames;
    constructor(_deniedAttributeNames) {
        this._deniedAttributeNames = _deniedAttributeNames;
    }
    process(incoming, _context) {
        const filteredAttributes = {};
        Object.keys(incoming)
            .filter(attributeName => !this._deniedAttributeNames.includes(attributeName))
            .forEach(attributeName => (filteredAttributes[attributeName] = incoming[attributeName]));
        return filteredAttributes;
    }
}
/**
 * @internal
 *
 * Create an {@link IAttributesProcessor} that acts as a simple pass-through for attributes.
 */
export function createNoopAttributesProcessor() {
    return NOOP;
}
/**
 * @internal
 *
 * Create an {@link IAttributesProcessor} that applies all processors from the provided list in order.
 *
 * @param processors Processors to apply in order.
 */
export function createMultiAttributesProcessor(processors) {
    return new MultiAttributesProcessor(processors);
}
/**
 * Create an {@link IAttributesProcessor} that filters by allowed attribute names and drops any names that are not in the
 * allow list.
 */
export function createAllowListAttributesProcessor(attributeAllowList) {
    return new AllowListProcessor(attributeAllowList);
}
/**
 * Create an {@link IAttributesProcessor} that drops attributes based on the names provided in the deny list
 */
export function createDenyListAttributesProcessor(attributeDenyList) {
    return new DenyListProcessor(attributeDenyList);
}
const NOOP = new NoopAttributesProcessor();
//# sourceMappingURL=AttributesProcessor.js.map