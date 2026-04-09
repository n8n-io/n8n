export function createInstrumentationScope(scope) {
    return {
        name: scope.name,
        version: scope.version,
    };
}
export function toAttributes(attributes) {
    return Object.keys(attributes).map(key => toKeyValue(key, attributes[key]));
}
export function toKeyValue(key, value) {
    return {
        key: key,
        value: toAnyValue(value),
    };
}
export function toAnyValue(value) {
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
//# sourceMappingURL=internal.js.map