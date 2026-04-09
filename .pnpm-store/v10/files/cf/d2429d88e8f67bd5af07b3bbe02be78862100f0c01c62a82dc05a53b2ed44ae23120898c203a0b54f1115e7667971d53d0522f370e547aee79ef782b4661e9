/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
class NoopAttributesProcessor {
    process(incoming, _context) {
        return incoming;
    }
}
class MultiAttributesProcessor {
    _processors;
    constructor(processors) {
        this._processors = processors;
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
    constructor(allowedAttributeNames) {
        this._allowedAttributeNames = allowedAttributeNames;
    }
    process(incoming, _context) {
        const filteredAttributes = {};
        Object.keys(incoming).forEach(attributeName => {
            if (this._allowedAttributeNames.includes(attributeName)) {
                filteredAttributes[attributeName] = incoming[attributeName];
            }
        });
        return filteredAttributes;
    }
}
class DenyListProcessor {
    _deniedAttributeNames;
    constructor(deniedAttributeNames) {
        this._deniedAttributeNames = deniedAttributeNames;
    }
    process(incoming, _context) {
        const filteredAttributes = {};
        Object.keys(incoming).forEach(attributeName => {
            if (!this._deniedAttributeNames.includes(attributeName)) {
                filteredAttributes[attributeName] = incoming[attributeName];
            }
        });
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