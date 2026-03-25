"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metadata = void 0;
exports.Metadata = function Metadata(init) {
    const data = new Map();
    const metadata = {
        set(key, value) {
            key = normalizeKey(key);
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    data.delete(key);
                }
                else {
                    for (const item of value) {
                        validate(key, item);
                    }
                    data.set(key, key.endsWith('-bin') ? value : [value.join(', ')]);
                }
            }
            else {
                validate(key, value);
                data.set(key, [value]);
            }
            return metadata;
        },
        append(key, value) {
            key = normalizeKey(key);
            validate(key, value);
            let values = data.get(key);
            if (values == null) {
                values = [];
                data.set(key, values);
            }
            values.push(value);
            if (!key.endsWith('-bin')) {
                data.set(key, [values.join(', ')]);
            }
            return metadata;
        },
        delete(key) {
            key = normalizeKey(key);
            data.delete(key);
        },
        get(key) {
            var _a;
            key = normalizeKey(key);
            return (_a = data.get(key)) === null || _a === void 0 ? void 0 : _a[0];
        },
        getAll(key) {
            var _a;
            key = normalizeKey(key);
            return ((_a = data.get(key)) !== null && _a !== void 0 ? _a : []);
        },
        has(key) {
            key = normalizeKey(key);
            return data.has(key);
        },
        [Symbol.iterator]() {
            return data[Symbol.iterator]();
        },
    };
    if (init != null) {
        const entries = isIterable(init) ? init : Object.entries(init);
        for (const [key, value] of entries) {
            metadata.set(key, value);
        }
    }
    return metadata;
};
function normalizeKey(key) {
    return key.toLowerCase();
}
function validate(key, value) {
    if (!/^[0-9a-z_.-]+$/.test(key)) {
        throw new Error(`Metadata key '${key}' contains illegal characters`);
    }
    if (key.endsWith('-bin')) {
        if (!(value instanceof Uint8Array)) {
            throw new Error(`Metadata key '${key}' ends with '-bin', thus it must have binary value`);
        }
    }
    else {
        if (typeof value !== 'string') {
            throw new Error(`Metadata key '${key}' doesn't end with '-bin', thus it must have string value`);
        }
        if (!/^[ -~]*$/.test(value)) {
            throw new Error(`Metadata value '${value}' of key '${key}' contains illegal characters`);
        }
    }
}
function isIterable(value) {
    return Symbol.iterator in value;
}
//# sourceMappingURL=Metadata.js.map