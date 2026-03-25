// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
export class AvroParser {
    /**
     * Reads a fixed number of bytes from the stream.
     *
     * @param stream -
     * @param length -
     * @param options -
     */
    static async readFixedBytes(stream, length, options = {}) {
        const bytes = await stream.read(length, { abortSignal: options.abortSignal });
        if (bytes.length !== length) {
            throw new Error("Hit stream end.");
        }
        return bytes;
    }
    /**
     * Reads a single byte from the stream.
     *
     * @param stream -
     * @param options -
     */
    static async readByte(stream, options = {}) {
        const buf = await AvroParser.readFixedBytes(stream, 1, options);
        return buf[0];
    }
    // int and long are stored in variable-length zig-zag coding.
    // variable-length: https://lucene.apache.org/core/3_5_0/fileformats.html#VInt
    // zig-zag: https://developers.google.com/protocol-buffers/docs/encoding?csw=1#types
    static async readZigZagLong(stream, options = {}) {
        let zigZagEncoded = 0;
        let significanceInBit = 0;
        let byte, haveMoreByte, significanceInFloat;
        do {
            byte = await AvroParser.readByte(stream, options);
            haveMoreByte = byte & 0x80;
            zigZagEncoded |= (byte & 0x7f) << significanceInBit;
            significanceInBit += 7;
        } while (haveMoreByte && significanceInBit < 28); // bitwise operation only works for 32-bit integers
        if (haveMoreByte) {
            // Switch to float arithmetic
            // eslint-disable-next-line no-self-assign
            zigZagEncoded = zigZagEncoded;
            significanceInFloat = 268435456; // 2 ** 28.
            do {
                byte = await AvroParser.readByte(stream, options);
                zigZagEncoded += (byte & 0x7f) * significanceInFloat;
                significanceInFloat *= 128; // 2 ** 7
            } while (byte & 0x80);
            const res = (zigZagEncoded % 2 ? -(zigZagEncoded + 1) : zigZagEncoded) / 2;
            if (res < Number.MIN_SAFE_INTEGER || res > Number.MAX_SAFE_INTEGER) {
                throw new Error("Integer overflow.");
            }
            return res;
        }
        return (zigZagEncoded >> 1) ^ -(zigZagEncoded & 1);
    }
    static async readLong(stream, options = {}) {
        return AvroParser.readZigZagLong(stream, options);
    }
    static async readInt(stream, options = {}) {
        return AvroParser.readZigZagLong(stream, options);
    }
    static async readNull() {
        return null;
    }
    static async readBoolean(stream, options = {}) {
        const b = await AvroParser.readByte(stream, options);
        if (b === 1) {
            return true;
        }
        else if (b === 0) {
            return false;
        }
        else {
            throw new Error("Byte was not a boolean.");
        }
    }
    static async readFloat(stream, options = {}) {
        const u8arr = await AvroParser.readFixedBytes(stream, 4, options);
        const view = new DataView(u8arr.buffer, u8arr.byteOffset, u8arr.byteLength);
        return view.getFloat32(0, true); // littleEndian = true
    }
    static async readDouble(stream, options = {}) {
        const u8arr = await AvroParser.readFixedBytes(stream, 8, options);
        const view = new DataView(u8arr.buffer, u8arr.byteOffset, u8arr.byteLength);
        return view.getFloat64(0, true); // littleEndian = true
    }
    static async readBytes(stream, options = {}) {
        const size = await AvroParser.readLong(stream, options);
        if (size < 0) {
            throw new Error("Bytes size was negative.");
        }
        return stream.read(size, { abortSignal: options.abortSignal });
    }
    static async readString(stream, options = {}) {
        const u8arr = await AvroParser.readBytes(stream, options);
        const utf8decoder = new TextDecoder();
        return utf8decoder.decode(u8arr);
    }
    static async readMapPair(stream, readItemMethod, options = {}) {
        const key = await AvroParser.readString(stream, options);
        // FUTURE: this won't work with readFixed (currently not supported) which needs a length as the parameter.
        const value = await readItemMethod(stream, options);
        return { key, value };
    }
    static async readMap(stream, readItemMethod, options = {}) {
        const readPairMethod = (s, opts = {}) => {
            return AvroParser.readMapPair(s, readItemMethod, opts);
        };
        const pairs = await AvroParser.readArray(stream, readPairMethod, options);
        const dict = {};
        for (const pair of pairs) {
            dict[pair.key] = pair.value;
        }
        return dict;
    }
    static async readArray(stream, readItemMethod, options = {}) {
        const items = [];
        for (let count = await AvroParser.readLong(stream, options); count !== 0; count = await AvroParser.readLong(stream, options)) {
            if (count < 0) {
                // Ignore block sizes
                await AvroParser.readLong(stream, options);
                count = -count;
            }
            while (count--) {
                const item = await readItemMethod(stream, options);
                items.push(item);
            }
        }
        return items;
    }
}
var AvroComplex;
(function (AvroComplex) {
    AvroComplex["RECORD"] = "record";
    AvroComplex["ENUM"] = "enum";
    AvroComplex["ARRAY"] = "array";
    AvroComplex["MAP"] = "map";
    AvroComplex["UNION"] = "union";
    AvroComplex["FIXED"] = "fixed";
})(AvroComplex || (AvroComplex = {}));
var AvroPrimitive;
(function (AvroPrimitive) {
    AvroPrimitive["NULL"] = "null";
    AvroPrimitive["BOOLEAN"] = "boolean";
    AvroPrimitive["INT"] = "int";
    AvroPrimitive["LONG"] = "long";
    AvroPrimitive["FLOAT"] = "float";
    AvroPrimitive["DOUBLE"] = "double";
    AvroPrimitive["BYTES"] = "bytes";
    AvroPrimitive["STRING"] = "string";
})(AvroPrimitive || (AvroPrimitive = {}));
export class AvroType {
    /**
     * Determines the AvroType from the Avro Schema.
     */
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    static fromSchema(schema) {
        if (typeof schema === "string") {
            return AvroType.fromStringSchema(schema);
        }
        else if (Array.isArray(schema)) {
            return AvroType.fromArraySchema(schema);
        }
        else {
            return AvroType.fromObjectSchema(schema);
        }
    }
    static fromStringSchema(schema) {
        switch (schema) {
            case AvroPrimitive.NULL:
            case AvroPrimitive.BOOLEAN:
            case AvroPrimitive.INT:
            case AvroPrimitive.LONG:
            case AvroPrimitive.FLOAT:
            case AvroPrimitive.DOUBLE:
            case AvroPrimitive.BYTES:
            case AvroPrimitive.STRING:
                return new AvroPrimitiveType(schema);
            default:
                throw new Error(`Unexpected Avro type ${schema}`);
        }
    }
    static fromArraySchema(schema) {
        return new AvroUnionType(schema.map(AvroType.fromSchema));
    }
    static fromObjectSchema(schema) {
        const type = schema.type;
        // Primitives can be defined as strings or objects
        try {
            return AvroType.fromStringSchema(type);
        }
        catch (_a) {
            // no-op
        }
        switch (type) {
            case AvroComplex.RECORD:
                if (schema.aliases) {
                    throw new Error(`aliases currently is not supported, schema: ${schema}`);
                }
                if (!schema.name) {
                    throw new Error(`Required attribute 'name' doesn't exist on schema: ${schema}`);
                }
                // eslint-disable-next-line no-case-declarations
                const fields = {};
                if (!schema.fields) {
                    throw new Error(`Required attribute 'fields' doesn't exist on schema: ${schema}`);
                }
                for (const field of schema.fields) {
                    fields[field.name] = AvroType.fromSchema(field.type);
                }
                return new AvroRecordType(fields, schema.name);
            case AvroComplex.ENUM:
                if (schema.aliases) {
                    throw new Error(`aliases currently is not supported, schema: ${schema}`);
                }
                if (!schema.symbols) {
                    throw new Error(`Required attribute 'symbols' doesn't exist on schema: ${schema}`);
                }
                return new AvroEnumType(schema.symbols);
            case AvroComplex.MAP:
                if (!schema.values) {
                    throw new Error(`Required attribute 'values' doesn't exist on schema: ${schema}`);
                }
                return new AvroMapType(AvroType.fromSchema(schema.values));
            case AvroComplex.ARRAY: // Unused today
            case AvroComplex.FIXED: // Unused today
            default:
                throw new Error(`Unexpected Avro type ${type} in ${schema}`);
        }
    }
}
class AvroPrimitiveType extends AvroType {
    constructor(primitive) {
        super();
        this._primitive = primitive;
    }
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    read(stream, options = {}) {
        switch (this._primitive) {
            case AvroPrimitive.NULL:
                return AvroParser.readNull();
            case AvroPrimitive.BOOLEAN:
                return AvroParser.readBoolean(stream, options);
            case AvroPrimitive.INT:
                return AvroParser.readInt(stream, options);
            case AvroPrimitive.LONG:
                return AvroParser.readLong(stream, options);
            case AvroPrimitive.FLOAT:
                return AvroParser.readFloat(stream, options);
            case AvroPrimitive.DOUBLE:
                return AvroParser.readDouble(stream, options);
            case AvroPrimitive.BYTES:
                return AvroParser.readBytes(stream, options);
            case AvroPrimitive.STRING:
                return AvroParser.readString(stream, options);
            default:
                throw new Error("Unknown Avro Primitive");
        }
    }
}
class AvroEnumType extends AvroType {
    constructor(symbols) {
        super();
        this._symbols = symbols;
    }
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    async read(stream, options = {}) {
        const value = await AvroParser.readInt(stream, options);
        return this._symbols[value];
    }
}
class AvroUnionType extends AvroType {
    constructor(types) {
        super();
        this._types = types;
    }
    async read(stream, options = {}) {
        const typeIndex = await AvroParser.readInt(stream, options);
        return this._types[typeIndex].read(stream, options);
    }
}
class AvroMapType extends AvroType {
    constructor(itemType) {
        super();
        this._itemType = itemType;
    }
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    read(stream, options = {}) {
        const readItemMethod = (s, opts) => {
            return this._itemType.read(s, opts);
        };
        return AvroParser.readMap(stream, readItemMethod, options);
    }
}
class AvroRecordType extends AvroType {
    constructor(fields, name) {
        super();
        this._fields = fields;
        this._name = name;
    }
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    async read(stream, options = {}) {
        // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
        const record = {};
        record["$schema"] = this._name;
        for (const key in this._fields) {
            if (Object.prototype.hasOwnProperty.call(this._fields, key)) {
                record[key] = await this._fields[key].read(stream, options);
            }
        }
        return record;
    }
}
//# sourceMappingURL=AvroParser.js.map