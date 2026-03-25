import { toUtf8 } from "@smithy/util-utf8";
import { alloc, extendedFloat16, extendedFloat32, extendedFloat64, extendedOneByte, majorList, majorMap, majorNegativeInt64, majorTag, majorUint64, majorUnstructuredByteString, majorUtf8String, minorIndefinite, specialFalse, specialNull, specialTrue, specialUndefined, tag, } from "./cbor-types";
const USE_TEXT_DECODER = typeof TextDecoder !== "undefined";
const USE_BUFFER = typeof Buffer !== "undefined";
let payload = alloc(0);
let dataView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
const textDecoder = USE_TEXT_DECODER ? new TextDecoder() : null;
let _offset = 0;
export function setPayload(bytes) {
    payload = bytes;
    dataView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
}
export function decode(at, to) {
    if (at >= to) {
        throw new Error("unexpected end of (decode) payload.");
    }
    const major = (payload[at] & 224) >> 5;
    const minor = payload[at] & 31;
    switch (major) {
        case majorUint64:
        case majorNegativeInt64:
        case majorTag:
            let unsignedInt;
            let offset;
            if (minor < 24) {
                unsignedInt = minor;
                offset = 1;
            }
            else {
                switch (minor) {
                    case extendedOneByte:
                    case extendedFloat16:
                    case extendedFloat32:
                    case extendedFloat64:
                        const countLength = minorValueToArgumentLength[minor];
                        const countOffset = (countLength + 1);
                        offset = countOffset;
                        if (to - at < countOffset) {
                            throw new Error(`countLength ${countLength} greater than remaining buf len.`);
                        }
                        const countIndex = at + 1;
                        if (countLength === 1) {
                            unsignedInt = payload[countIndex];
                        }
                        else if (countLength === 2) {
                            unsignedInt = dataView.getUint16(countIndex);
                        }
                        else if (countLength === 4) {
                            unsignedInt = dataView.getUint32(countIndex);
                        }
                        else {
                            unsignedInt = dataView.getBigUint64(countIndex);
                        }
                        break;
                    default:
                        throw new Error(`unexpected minor value ${minor}.`);
                }
            }
            if (major === majorUint64) {
                _offset = offset;
                return castBigInt(unsignedInt);
            }
            else if (major === majorNegativeInt64) {
                let negativeInt;
                if (typeof unsignedInt === "bigint") {
                    negativeInt = BigInt(-1) - unsignedInt;
                }
                else {
                    negativeInt = -1 - unsignedInt;
                }
                _offset = offset;
                return castBigInt(negativeInt);
            }
            else {
                const value = decode(at + offset, to);
                const valueOffset = _offset;
                _offset = offset + valueOffset;
                return tag({ tag: castBigInt(unsignedInt), value });
            }
        case majorUtf8String:
        case majorMap:
        case majorList:
        case majorUnstructuredByteString:
            if (minor === minorIndefinite) {
                switch (major) {
                    case majorUtf8String:
                        return decodeUtf8StringIndefinite(at, to);
                    case majorMap:
                        return decodeMapIndefinite(at, to);
                    case majorList:
                        return decodeListIndefinite(at, to);
                    case majorUnstructuredByteString:
                        return decodeUnstructuredByteStringIndefinite(at, to);
                }
            }
            else {
                switch (major) {
                    case majorUtf8String:
                        return decodeUtf8String(at, to);
                    case majorMap:
                        return decodeMap(at, to);
                    case majorList:
                        return decodeList(at, to);
                    case majorUnstructuredByteString:
                        return decodeUnstructuredByteString(at, to);
                }
            }
        default:
            return decodeSpecial(at, to);
    }
}
function bytesToUtf8(bytes, at, to) {
    if (USE_BUFFER && bytes.constructor?.name === "Buffer") {
        return bytes.toString("utf-8", at, to);
    }
    if (textDecoder) {
        return textDecoder.decode(bytes.subarray(at, to));
    }
    return toUtf8(bytes.subarray(at, to));
}
function demote(bigInteger) {
    const num = Number(bigInteger);
    if (num < Number.MIN_SAFE_INTEGER || Number.MAX_SAFE_INTEGER < num) {
        console.warn(new Error(`@smithy/core/cbor - truncating BigInt(${bigInteger}) to ${num} with loss of precision.`));
    }
    return num;
}
const minorValueToArgumentLength = {
    [extendedOneByte]: 1,
    [extendedFloat16]: 2,
    [extendedFloat32]: 4,
    [extendedFloat64]: 8,
};
export function bytesToFloat16(a, b) {
    const sign = a >> 7;
    const exponent = (a & 124) >> 2;
    const fraction = ((a & 3) << 8) | b;
    const scalar = sign === 0 ? 1 : -1;
    let exponentComponent;
    let summation;
    if (exponent === 0b00000) {
        if (fraction === 0) {
            return 0;
        }
        else {
            exponentComponent = Math.pow(2, 1 - 15);
            summation = 0;
        }
    }
    else if (exponent === 0b11111) {
        if (fraction === 0) {
            return scalar * Infinity;
        }
        else {
            return NaN;
        }
    }
    else {
        exponentComponent = Math.pow(2, exponent - 15);
        summation = 1;
    }
    summation += fraction / 1024;
    return scalar * (exponentComponent * summation);
}
function decodeCount(at, to) {
    const minor = payload[at] & 31;
    if (minor < 24) {
        _offset = 1;
        return minor;
    }
    if (minor === extendedOneByte ||
        minor === extendedFloat16 ||
        minor === extendedFloat32 ||
        minor === extendedFloat64) {
        const countLength = minorValueToArgumentLength[minor];
        _offset = (countLength + 1);
        if (to - at < _offset) {
            throw new Error(`countLength ${countLength} greater than remaining buf len.`);
        }
        const countIndex = at + 1;
        if (countLength === 1) {
            return payload[countIndex];
        }
        else if (countLength === 2) {
            return dataView.getUint16(countIndex);
        }
        else if (countLength === 4) {
            return dataView.getUint32(countIndex);
        }
        return demote(dataView.getBigUint64(countIndex));
    }
    throw new Error(`unexpected minor value ${minor}.`);
}
function decodeUtf8String(at, to) {
    const length = decodeCount(at, to);
    const offset = _offset;
    at += offset;
    if (to - at < length) {
        throw new Error(`string len ${length} greater than remaining buf len.`);
    }
    const value = bytesToUtf8(payload, at, at + length);
    _offset = offset + length;
    return value;
}
function decodeUtf8StringIndefinite(at, to) {
    at += 1;
    const vector = [];
    for (const base = at; at < to;) {
        if (payload[at] === 255) {
            const data = alloc(vector.length);
            data.set(vector, 0);
            _offset = at - base + 2;
            return bytesToUtf8(data, 0, data.length);
        }
        const major = (payload[at] & 224) >> 5;
        const minor = payload[at] & 31;
        if (major !== majorUtf8String) {
            throw new Error(`unexpected major type ${major} in indefinite string.`);
        }
        if (minor === minorIndefinite) {
            throw new Error("nested indefinite string.");
        }
        const bytes = decodeUnstructuredByteString(at, to);
        const length = _offset;
        at += length;
        for (let i = 0; i < bytes.length; ++i) {
            vector.push(bytes[i]);
        }
    }
    throw new Error("expected break marker.");
}
function decodeUnstructuredByteString(at, to) {
    const length = decodeCount(at, to);
    const offset = _offset;
    at += offset;
    if (to - at < length) {
        throw new Error(`unstructured byte string len ${length} greater than remaining buf len.`);
    }
    const value = payload.subarray(at, at + length);
    _offset = offset + length;
    return value;
}
function decodeUnstructuredByteStringIndefinite(at, to) {
    at += 1;
    const vector = [];
    for (const base = at; at < to;) {
        if (payload[at] === 255) {
            const data = alloc(vector.length);
            data.set(vector, 0);
            _offset = at - base + 2;
            return data;
        }
        const major = (payload[at] & 224) >> 5;
        const minor = payload[at] & 31;
        if (major !== majorUnstructuredByteString) {
            throw new Error(`unexpected major type ${major} in indefinite string.`);
        }
        if (minor === minorIndefinite) {
            throw new Error("nested indefinite string.");
        }
        const bytes = decodeUnstructuredByteString(at, to);
        const length = _offset;
        at += length;
        for (let i = 0; i < bytes.length; ++i) {
            vector.push(bytes[i]);
        }
    }
    throw new Error("expected break marker.");
}
function decodeList(at, to) {
    const listDataLength = decodeCount(at, to);
    const offset = _offset;
    at += offset;
    const base = at;
    const list = Array(listDataLength);
    for (let i = 0; i < listDataLength; ++i) {
        const item = decode(at, to);
        const itemOffset = _offset;
        list[i] = item;
        at += itemOffset;
    }
    _offset = offset + (at - base);
    return list;
}
function decodeListIndefinite(at, to) {
    at += 1;
    const list = [];
    for (const base = at; at < to;) {
        if (payload[at] === 255) {
            _offset = at - base + 2;
            return list;
        }
        const item = decode(at, to);
        const n = _offset;
        at += n;
        list.push(item);
    }
    throw new Error("expected break marker.");
}
function decodeMap(at, to) {
    const mapDataLength = decodeCount(at, to);
    const offset = _offset;
    at += offset;
    const base = at;
    const map = {};
    for (let i = 0; i < mapDataLength; ++i) {
        if (at >= to) {
            throw new Error("unexpected end of map payload.");
        }
        const major = (payload[at] & 224) >> 5;
        if (major !== majorUtf8String) {
            throw new Error(`unexpected major type ${major} for map key at index ${at}.`);
        }
        const key = decode(at, to);
        at += _offset;
        const value = decode(at, to);
        at += _offset;
        map[key] = value;
    }
    _offset = offset + (at - base);
    return map;
}
function decodeMapIndefinite(at, to) {
    at += 1;
    const base = at;
    const map = {};
    for (; at < to;) {
        if (at >= to) {
            throw new Error("unexpected end of map payload.");
        }
        if (payload[at] === 255) {
            _offset = at - base + 2;
            return map;
        }
        const major = (payload[at] & 224) >> 5;
        if (major !== majorUtf8String) {
            throw new Error(`unexpected major type ${major} for map key.`);
        }
        const key = decode(at, to);
        at += _offset;
        const value = decode(at, to);
        at += _offset;
        map[key] = value;
    }
    throw new Error("expected break marker.");
}
function decodeSpecial(at, to) {
    const minor = payload[at] & 31;
    switch (minor) {
        case specialTrue:
        case specialFalse:
            _offset = 1;
            return minor === specialTrue;
        case specialNull:
            _offset = 1;
            return null;
        case specialUndefined:
            _offset = 1;
            return null;
        case extendedFloat16:
            if (to - at < 3) {
                throw new Error("incomplete float16 at end of buf.");
            }
            _offset = 3;
            return bytesToFloat16(payload[at + 1], payload[at + 2]);
        case extendedFloat32:
            if (to - at < 5) {
                throw new Error("incomplete float32 at end of buf.");
            }
            _offset = 5;
            return dataView.getFloat32(at + 1);
        case extendedFloat64:
            if (to - at < 9) {
                throw new Error("incomplete float64 at end of buf.");
            }
            _offset = 9;
            return dataView.getFloat64(at + 1);
        default:
            throw new Error(`unexpected minor value ${minor}.`);
    }
}
function castBigInt(bigInt) {
    if (typeof bigInt === "number") {
        return bigInt;
    }
    const num = Number(bigInt);
    if (Number.MIN_SAFE_INTEGER <= num && num <= Number.MAX_SAFE_INTEGER) {
        return num;
    }
    return bigInt;
}
