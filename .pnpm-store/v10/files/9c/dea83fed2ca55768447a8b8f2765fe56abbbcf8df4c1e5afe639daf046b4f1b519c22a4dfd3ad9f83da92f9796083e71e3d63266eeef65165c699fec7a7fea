"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAnyValue = exports.toKeyValue = exports.toAttributes = exports.createInstrumentationScope = exports.createResource = void 0;
function createResource(resource) {
    const result = {
        attributes: toAttributes(resource.attributes),
        droppedAttributesCount: 0,
    };
    const schemaUrl = resource.schemaUrl;
    if (schemaUrl && schemaUrl !== '')
        result.schemaUrl = schemaUrl;
    return result;
}
exports.createResource = createResource;
function createInstrumentationScope(scope) {
    return {
        name: scope.name,
        version: scope.version,
    };
}
exports.createInstrumentationScope = createInstrumentationScope;
function toAttributes(attributes) {
    return Object.keys(attributes).map(key => toKeyValue(key, attributes[key]));
}
exports.toAttributes = toAttributes;
function toKeyValue(key, value) {
    return {
        key: key,
        value: toAnyValue(value),
    };
}
exports.toKeyValue = toKeyValue;
function toAnyValue(value) {
    const t = typeof value;
    if (t === 'string')
        return { stringValue: value };
    if (t === 'number') {
        if (!Number.isInteger(value))
            return { doubleValue: value };
        return { intValue: value };
    }
    if (t === 'boolean')
        return { boolValue: value };
    if (value instanceof Uint8Array)
        return { bytesValue: value };
    if (Array.isArray(value))
        return { arrayValue: { values: value.map(toAnyValue) } };
    if (t === 'object' && value != null)
        return {
            kvlistValue: {
                values: Object.entries(value).map(([k, v]) => toKeyValue(k, v)),
            },
        };
    return {};
}
exports.toAnyValue = toAnyValue;
//# sourceMappingURL=internal.js.map