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
export function createInstrumentationScope(scope) {
    return {
        name: scope.name,
        version: scope.version,
    };
}
export function toAttributes(attributes) {
    return Object.keys(attributes).map(function (key) { return toKeyValue(key, attributes[key]); });
}
export function toKeyValue(key, value) {
    return {
        key: key,
        value: toAnyValue(value),
    };
}
export function toAnyValue(value) {
    var t = typeof value;
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
                values: Object.entries(value).map(function (_a) {
                    var _b = __read(_a, 2), k = _b[0], v = _b[1];
                    return toKeyValue(k, v);
                }),
            },
        };
    return {};
}
//# sourceMappingURL=internal.js.map