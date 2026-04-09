'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParquetTypeDataObject = getParquetTypeDataObject;
exports.toPrimitive = toPrimitive;
exports.fromPrimitive = fromPrimitive;
// BSON uses top level awaits, so use require for now
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bsonSerialize = require('bson').serialize;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bsonDeserialize = require('bson').deserialize;
function getParquetTypeDataObject(type, field) {
    if (type === 'DECIMAL') {
        if (field?.typeLength !== undefined) {
            return {
                primitiveType: 'FIXED_LEN_BYTE_ARRAY',
                originalType: 'DECIMAL',
                typeLength: field.typeLength,
                toPrimitive: toPrimitive_FIXED_LEN_BYTE_ARRAY_DECIMAL,
            };
        }
        else if (field?.precision && field.precision > 18) {
            return {
                primitiveType: 'BYTE_ARRAY',
                originalType: 'DECIMAL',
                toPrimitive: toPrimitive_BYTE_ARRAY_DECIMAL,
            };
        }
        else {
            return {
                primitiveType: 'INT64',
                originalType: 'DECIMAL',
                toPrimitive: toPrimitive_INT64,
            };
        }
    }
    else if (field?.logicalType?.TIME) {
        const unit = field.logicalType.TIME.unit;
        if (unit.MILLIS) {
            return {
                originalType: 'TIME_MILLIS',
                primitiveType: 'INT32',
                toPrimitive: toPrimitive_TIME,
            };
        }
        if (unit.MICROS) {
            return {
                originalType: 'TIME_MICROS',
                primitiveType: 'INT64',
                toPrimitive: toPrimitive_TIME,
            };
        }
        if (unit.NANOS) {
            return {
                primitiveType: 'INT64',
                toPrimitive: toPrimitive_TIME,
            };
        }
        throw new Error('TIME type must have a valid unit (MILLIS, MICROS, NANOS).');
    }
    else {
        return PARQUET_LOGICAL_TYPE_DATA[type];
    }
}
const PARQUET_LOGICAL_TYPES = new Set([
    'BOOLEAN',
    'INT32',
    'INT64',
    'INT96',
    'FLOAT',
    'DOUBLE',
    'BYTE_ARRAY',
    'FIXED_LEN_BYTE_ARRAY',
    'UTF8',
    'ENUM',
    'TIME_MILLIS',
    'TIME_MICROS',
    'DATE',
    'TIMESTAMP_MILLIS',
    'TIMESTAMP_MICROS',
    'UINT_8',
    'UINT_16',
    'UINT_32',
    'UINT_64',
    'INT_8',
    'INT_16',
    'INT_32',
    'INT_64',
    'DECIMAL',
    'JSON',
    'BSON',
    'INTERVAL',
    'MAP',
    'LIST',
]);
const PARQUET_LOGICAL_TYPE_DATA = {
    BOOLEAN: {
        primitiveType: 'BOOLEAN',
        toPrimitive: toPrimitive_BOOLEAN,
        fromPrimitive: fromPrimitive_BOOLEAN,
    },
    INT32: {
        primitiveType: 'INT32',
        toPrimitive: toPrimitive_INT32,
    },
    INT64: {
        primitiveType: 'INT64',
        toPrimitive: toPrimitive_INT64,
    },
    INT96: {
        primitiveType: 'INT96',
        toPrimitive: toPrimitive_INT96,
    },
    FLOAT: {
        primitiveType: 'FLOAT',
        toPrimitive: toPrimitive_FLOAT,
    },
    DOUBLE: {
        primitiveType: 'DOUBLE',
        toPrimitive: toPrimitive_DOUBLE,
    },
    BYTE_ARRAY: {
        primitiveType: 'BYTE_ARRAY',
        toPrimitive: toPrimitive_BYTE_ARRAY,
    },
    FIXED_LEN_BYTE_ARRAY: {
        primitiveType: 'FIXED_LEN_BYTE_ARRAY',
        toPrimitive: toPrimitive_BYTE_ARRAY,
    },
    UTF8: {
        primitiveType: 'BYTE_ARRAY',
        originalType: 'UTF8',
        toPrimitive: toPrimitive_UTF8,
        fromPrimitive: fromPrimitive_UTF8,
    },
    ENUM: {
        primitiveType: 'BYTE_ARRAY',
        originalType: 'UTF8',
        toPrimitive: toPrimitive_UTF8,
        fromPrimitive: fromPrimitive_UTF8,
    },
    TIME_MILLIS: {
        primitiveType: 'INT32',
        originalType: 'TIME_MILLIS',
        toPrimitive: toPrimitive_TIME_MILLIS,
    },
    TIME_MICROS: {
        primitiveType: 'INT64',
        originalType: 'TIME_MICROS',
        toPrimitive: toPrimitive_TIME_MICROS,
    },
    DATE: {
        primitiveType: 'INT32',
        originalType: 'DATE',
        toPrimitive: toPrimitive_DATE,
        fromPrimitive: fromPrimitive_DATE,
    },
    TIMESTAMP_MILLIS: {
        primitiveType: 'INT64',
        originalType: 'TIMESTAMP_MILLIS',
        toPrimitive: toPrimitive_TIMESTAMP_MILLIS,
        fromPrimitive: fromPrimitive_TIMESTAMP_MILLIS,
    },
    TIMESTAMP_MICROS: {
        primitiveType: 'INT64',
        originalType: 'TIMESTAMP_MICROS',
        toPrimitive: toPrimitive_TIMESTAMP_MICROS,
        fromPrimitive: fromPrimitive_TIMESTAMP_MICROS,
    },
    UINT_8: {
        primitiveType: 'INT32',
        originalType: 'UINT_8',
        toPrimitive: toPrimitive_UINT8,
    },
    UINT_16: {
        primitiveType: 'INT32',
        originalType: 'UINT_16',
        toPrimitive: toPrimitive_UINT16,
    },
    UINT_32: {
        primitiveType: 'INT32',
        originalType: 'UINT_32',
        toPrimitive: toPrimitive_UINT32,
    },
    UINT_64: {
        primitiveType: 'INT64',
        originalType: 'UINT_64',
        toPrimitive: toPrimitive_UINT64,
    },
    INT_8: {
        primitiveType: 'INT32',
        originalType: 'INT_8',
        toPrimitive: toPrimitive_INT8,
    },
    INT_16: {
        primitiveType: 'INT32',
        originalType: 'INT_16',
        toPrimitive: toPrimitive_INT16,
    },
    INT_32: {
        primitiveType: 'INT32',
        originalType: 'INT_32',
        toPrimitive: toPrimitive_INT32,
    },
    INT_64: {
        primitiveType: 'INT64',
        originalType: 'INT_64',
        toPrimitive: toPrimitive_INT64,
    },
    JSON: {
        primitiveType: 'BYTE_ARRAY',
        originalType: 'JSON',
        toPrimitive: toPrimitive_JSON,
        fromPrimitive: fromPrimitive_JSON,
    },
    BSON: {
        primitiveType: 'BYTE_ARRAY',
        originalType: 'BSON',
        toPrimitive: toPrimitive_BSON,
        fromPrimitive: fromPrimitive_BSON,
    },
    INTERVAL: {
        primitiveType: 'FIXED_LEN_BYTE_ARRAY',
        originalType: 'INTERVAL',
        typeLength: 12,
        toPrimitive: toPrimitive_INTERVAL,
        fromPrimitive: fromPrimitive_INTERVAL,
    },
    MAP: {
        originalType: 'MAP',
        toPrimitive: toPrimitive_MAP,
    },
    LIST: {
        originalType: 'LIST',
        toPrimitive: toPrimitive_LIST,
    },
};
/**
 * Test if something is a valid Parquet Type
 * @param type the string of the type
 * @returns if type is a valid Parquet Type
 */
function isParquetType(type) {
    return type !== undefined && PARQUET_LOGICAL_TYPES.has(type);
}
/**
 * Convert a value from it's native representation to the internal/underlying
 * primitive type
 */
function toPrimitive(type, value, field) {
    if (!isParquetType(type)) {
        throw new Error('invalid type: ' + type || 'undefined');
    }
    return getParquetTypeDataObject(type, field).toPrimitive(value);
}
/**
 * Convert a value from it's internal/underlying primitive representation to
 * the native representation
 */
function fromPrimitive(type, value, field) {
    if (!isParquetType(type)) {
        throw new Error('invalid type: ' + type || 'undefined');
    }
    const typeFromPrimitive = getParquetTypeDataObject(type, field).fromPrimitive;
    if (typeFromPrimitive !== undefined) {
        return typeFromPrimitive(value);
    }
    else {
        return value;
    }
}
function toPrimitive_BOOLEAN(value) {
    return !!value;
}
function fromPrimitive_BOOLEAN(value) {
    return !!value;
}
function toPrimitive_FLOAT(value) {
    if (typeof value === 'string') {
        const v = parseFloat(value);
        return v;
    }
    else if (typeof value === 'number') {
        return value;
    }
    throw new Error('invalid value for FLOAT: ' + value);
}
function toPrimitive_DOUBLE(value) {
    if (typeof value === 'string') {
        const v = parseFloat(value);
        return v;
    }
    else if (typeof value === 'number') {
        return value;
    }
    throw new Error('invalid value for DOUBLE: ' + value);
}
function toPrimitive_INT8(value) {
    try {
        let v = value;
        if (typeof v === 'string')
            v = BigInt(value);
        checkValidValue(-0x80, 0x7f, v);
        return v;
    }
    catch {
        throw new Error('invalid value for INT8: ' + value);
    }
}
function toPrimitive_UINT8(value) {
    try {
        let v = value;
        if (typeof v === 'string')
            v = BigInt(value);
        checkValidValue(0, 0xff, v);
        return v;
    }
    catch {
        throw new Error('invalid value for UINT8: ' + value);
    }
}
function toPrimitive_INT16(value) {
    try {
        let v = value;
        if (typeof v === 'string')
            v = BigInt(value);
        checkValidValue(-0x8000, 0x7fff, v);
        return v;
    }
    catch {
        throw new Error('invalid value for INT16: ' + value);
    }
}
function toPrimitive_UINT16(value) {
    try {
        let v = value;
        if (typeof v === 'string')
            v = BigInt(value);
        checkValidValue(0, 0xffff, v);
        return v;
    }
    catch {
        throw new Error('invalid value for UINT16: ' + value);
    }
}
function toPrimitive_INT32(value) {
    try {
        let v = value;
        if (typeof v === 'string')
            v = BigInt(value);
        checkValidValue(-0x80000000, 0x7fffffff, v);
        return v;
    }
    catch {
        throw new Error('invalid value for INT32: ' + value);
    }
}
function toPrimitive_UINT32(value) {
    try {
        let v = value;
        if (typeof v === 'string')
            v = BigInt(value);
        checkValidValue(0, 0xffffffffffff, v);
        return v;
    }
    catch {
        throw new Error('invalid value for UINT32: ' + value);
    }
}
const MIN_64 = BigInt('0x8000000000000000') * -1n;
const MAX_64 = BigInt('0x7fffffffffffffff');
function toPrimitive_INT64(value) {
    try {
        let v = value;
        if (typeof v === 'string')
            v = BigInt(value);
        checkValidValue(MIN_64, MAX_64, v);
        return v;
    }
    catch {
        throw new Error('invalid value for INT64: ' + value);
    }
}
const MAX_U64 = BigInt('0xffffffffffffffff');
function toPrimitive_UINT64(value) {
    try {
        let v = value;
        if (typeof v === 'string')
            v = BigInt(value);
        checkValidValue(0, MAX_U64, v);
        return v;
    }
    catch {
        throw new Error('invalid value for UINT64: ' + value);
    }
}
const MIN_96 = BigInt('0x800000000000000000000000') * -1n;
const MAX_96 = BigInt('0x7fffffffffffffffffffffff');
function toPrimitive_INT96(value) {
    try {
        let v = value;
        if (typeof v === 'string')
            v = BigInt(value);
        checkValidValue(MIN_96, MAX_96, v);
        return v;
    }
    catch {
        throw new Error('invalid value for INT96: ' + value);
    }
}
function toPrimitive_FIXED_LEN_BYTE_ARRAY_DECIMAL(value) {
    return Buffer.from(value);
}
function toPrimitive_BYTE_ARRAY_DECIMAL(value) {
    return Buffer.from(value);
}
function toPrimitive_MAP(value) {
    return value;
}
function toPrimitive_LIST(value) {
    return value;
}
function toPrimitive_BYTE_ARRAY(value) {
    return Buffer.from(value);
}
function toPrimitive_UTF8(value) {
    return Buffer.from(value, 'utf8');
}
function fromPrimitive_UTF8(value) {
    return value !== undefined && value !== null ? value.toString() : value;
}
function toPrimitive_JSON(value) {
    return Buffer.from(JSON.stringify(value));
}
function fromPrimitive_JSON(value) {
    return JSON.parse(value);
}
function toPrimitive_BSON(value) {
    return Buffer.from(bsonSerialize(value));
}
function fromPrimitive_BSON(value) {
    return bsonDeserialize(value);
}
function toNumberInternal(typeName, value) {
    let numberValue = 0;
    switch (typeof value) {
        case 'string':
            numberValue = parseInt(value, 10);
            break;
        case 'number':
            numberValue = value;
            break;
        default:
            throw new Error(`${typeName} has an invalid type: ${typeof value}`);
    }
    // Year 2255 bug. Should eventually switch to bigint
    if (numberValue < 0 || numberValue >= Number.MAX_SAFE_INTEGER) {
        throw new Error(`${typeName} value is out of bounds: ${numberValue}`);
    }
    return numberValue;
}
function toPrimitive_TIME_MILLIS(value) {
    return toNumberInternal('TIME_MILLIS', value);
}
function toPrimitive_TIME_MICROS(value) {
    const v = BigInt(value);
    if (v < 0n) {
        throw new Error('TIME_MICROS value is out of bounds: ' + value);
    }
    return v;
}
const kMillisPerDay = 86400000;
function toPrimitive_DATE(value) {
    /* convert from date */
    if (value instanceof Date) {
        return value.getTime() / kMillisPerDay;
    }
    return toNumberInternal('DATE', value);
}
function fromPrimitive_DATE(value) {
    return new Date(+value * kMillisPerDay);
}
function toPrimitive_TIMESTAMP_MILLIS(value) {
    /* convert from date */
    if (value instanceof Date) {
        return value.getTime();
    }
    return toNumberInternal('TIMESTAMP_MILLIS', value);
}
function fromPrimitive_TIMESTAMP_MILLIS(value) {
    return new Date(Number(value));
}
function toPrimitive_TIMESTAMP_MICROS(value) {
    /* convert from date */
    if (value instanceof Date) {
        return BigInt(value.getTime()) * 1000n;
    }
    /* convert from integer */
    try {
        // Will throw if NaN
        const v = BigInt(value);
        if (v < 0n) {
            throw new Error('out of bounds');
        }
        return v;
    }
    catch (_e) {
        throw new Error('TIMESTAMP_MICROS value is out of bounds: ' + value);
    }
}
function fromPrimitive_TIMESTAMP_MICROS(value) {
    if (typeof value === 'bigint')
        return new Date(Number(value / 1000n));
    return new Date(value / 1000);
}
function toPrimitive_INTERVAL(value) {
    if (!value.months || !value.days || !value.milliseconds) {
        throw new Error('value for INTERVAL must be object { months: ..., days: ..., milliseconds: ... }');
    }
    const buf = Buffer.alloc(12);
    buf.writeUInt32LE(value.months, 0);
    buf.writeUInt32LE(value.days, 4);
    buf.writeUInt32LE(value.milliseconds, 8);
    return buf;
}
function fromPrimitive_INTERVAL(value) {
    const buf = Buffer.from(value);
    const months = buf.readUInt32LE(0);
    const days = buf.readUInt32LE(4);
    const millis = buf.readUInt32LE(8);
    return { months: months, days: days, milliseconds: millis };
}
function checkValidValue(lowerRange, upperRange, v) {
    if (v < lowerRange || v > upperRange) {
        throw new Error('invalid value');
    }
}
function toPrimitive_TIME(time) {
    const { value, unit, isAdjustedToUTC } = time;
    const timeValue = typeof value === 'string' ? BigInt(value) : BigInt(value);
    if (isAdjustedToUTC) {
        return unit === 'MILLIS' ? Number(timeValue) : timeValue;
    }
    else {
        switch (unit) {
            case 'MILLIS':
                return Number(adjustToLocalTimestamp(timeValue, { MILLIS: true }));
            case 'MICROS':
                return adjustToLocalTimestamp(timeValue, { MICROS: true });
            case 'NANOS':
                return adjustToLocalTimestamp(timeValue, { NANOS: true });
            default:
                throw new Error(`Unsupported time unit: ${unit}`);
        }
    }
}
function adjustToLocalTimestamp(timestamp, unit) {
    const localOffset = BigInt(new Date().getTimezoneOffset()) * 60n * 1000n; // Offset in milliseconds
    if (unit.MILLIS) {
        return timestamp - localOffset;
    }
    else if (unit.MICROS) {
        return timestamp - localOffset * 1000n;
    }
    else if (unit.NANOS) {
        return timestamp - localOffset * 1000000n;
    }
    throw new Error('Unsupported time unit');
}
