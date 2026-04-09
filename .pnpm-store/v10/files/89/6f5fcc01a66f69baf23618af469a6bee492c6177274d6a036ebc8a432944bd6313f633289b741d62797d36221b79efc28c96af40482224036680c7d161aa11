"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAnyValue = exports.toKeyValue = exports.toAttributes = exports.createInstrumentationScope = exports.createResource = void 0;
function createResource(resource, encoder) {
    const result = {
        attributes: toAttributes(resource.attributes, encoder),
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
function toAttributes(attributes, encoder) {
    return Object.keys(attributes).map(key => toKeyValue(key, attributes[key], encoder));
}
exports.toAttributes = toAttributes;
function toKeyValue(key, value, encoder) {
    return {
        key: key,
        value: toAnyValue(value, encoder),
    };
}
exports.toKeyValue = toKeyValue;
function toAnyValue(value, encoder) {
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
        return { bytesValue: encoder.encodeUint8Array(value) };
    if (Array.isArray(value)) {
        const values = new Array(value.length);
        for (let i = 0; i < value.length; i++) {
            values[i] = toAnyValue(value[i], encoder);
        }
        return { arrayValue: { values } };
    }
    if (t === 'object' && value != null) {
        const keys = Object.keys(value);
        const values = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
            values[i] = {
                key: keys[i],
                value: toAnyValue(value[keys[i]], encoder),
            };
        }
        return { kvlistValue: { values } };
    }
    return {};
}
exports.toAnyValue = toAnyValue;
//# sourceMappingURL=internal.js.map