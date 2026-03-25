import { SerdeContext } from "@smithy/core/protocols";
import { NormalizedSchema } from "@smithy/core/schema";
import { _parseEpochTimestamp, generateIdempotencyToken } from "@smithy/core/serde";
import { fromBase64 } from "@smithy/util-base64";
import { cbor } from "./cbor";
import { dateToTag } from "./parseCborBody";
export class CborCodec extends SerdeContext {
    createSerializer() {
        const serializer = new CborShapeSerializer();
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
    }
    createDeserializer() {
        const deserializer = new CborShapeDeserializer();
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
    }
}
export class CborShapeSerializer extends SerdeContext {
    value;
    write(schema, value) {
        this.value = this.serialize(schema, value);
    }
    serialize(schema, source) {
        const ns = NormalizedSchema.of(schema);
        if (source == null) {
            if (ns.isIdempotencyToken()) {
                return generateIdempotencyToken();
            }
            return source;
        }
        if (ns.isBlobSchema()) {
            if (typeof source === "string") {
                return (this.serdeContext?.base64Decoder ?? fromBase64)(source);
            }
            return source;
        }
        if (ns.isTimestampSchema()) {
            if (typeof source === "number" || typeof source === "bigint") {
                return dateToTag(new Date((Number(source) / 1000) | 0));
            }
            return dateToTag(source);
        }
        if (typeof source === "function" || typeof source === "object") {
            const sourceObject = source;
            if (ns.isListSchema() && Array.isArray(sourceObject)) {
                const sparse = !!ns.getMergedTraits().sparse;
                const newArray = [];
                let i = 0;
                for (const item of sourceObject) {
                    const value = this.serialize(ns.getValueSchema(), item);
                    if (value != null || sparse) {
                        newArray[i++] = value;
                    }
                }
                return newArray;
            }
            if (sourceObject instanceof Date) {
                return dateToTag(sourceObject);
            }
            const newObject = {};
            if (ns.isMapSchema()) {
                const sparse = !!ns.getMergedTraits().sparse;
                for (const key of Object.keys(sourceObject)) {
                    const value = this.serialize(ns.getValueSchema(), sourceObject[key]);
                    if (value != null || sparse) {
                        newObject[key] = value;
                    }
                }
            }
            else if (ns.isStructSchema()) {
                for (const [key, memberSchema] of ns.structIterator()) {
                    const value = this.serialize(memberSchema, sourceObject[key]);
                    if (value != null) {
                        newObject[key] = value;
                    }
                }
            }
            else if (ns.isDocumentSchema()) {
                for (const key of Object.keys(sourceObject)) {
                    newObject[key] = this.serialize(ns.getValueSchema(), sourceObject[key]);
                }
            }
            return newObject;
        }
        return source;
    }
    flush() {
        const buffer = cbor.serialize(this.value);
        this.value = undefined;
        return buffer;
    }
}
export class CborShapeDeserializer extends SerdeContext {
    read(schema, bytes) {
        const data = cbor.deserialize(bytes);
        return this.readValue(schema, data);
    }
    readValue(_schema, value) {
        const ns = NormalizedSchema.of(_schema);
        if (ns.isTimestampSchema() && typeof value === "number") {
            return _parseEpochTimestamp(value);
        }
        if (ns.isBlobSchema()) {
            if (typeof value === "string") {
                return (this.serdeContext?.base64Decoder ?? fromBase64)(value);
            }
            return value;
        }
        if (typeof value === "undefined" ||
            typeof value === "boolean" ||
            typeof value === "number" ||
            typeof value === "string" ||
            typeof value === "bigint" ||
            typeof value === "symbol") {
            return value;
        }
        else if (typeof value === "function" || typeof value === "object") {
            if (value === null) {
                return null;
            }
            if ("byteLength" in value) {
                return value;
            }
            if (value instanceof Date) {
                return value;
            }
            if (ns.isDocumentSchema()) {
                return value;
            }
            if (ns.isListSchema()) {
                const newArray = [];
                const memberSchema = ns.getValueSchema();
                const sparse = !!ns.getMergedTraits().sparse;
                for (const item of value) {
                    const itemValue = this.readValue(memberSchema, item);
                    if (itemValue != null || sparse) {
                        newArray.push(itemValue);
                    }
                }
                return newArray;
            }
            const newObject = {};
            if (ns.isMapSchema()) {
                const sparse = !!ns.getMergedTraits().sparse;
                const targetSchema = ns.getValueSchema();
                for (const key of Object.keys(value)) {
                    const itemValue = this.readValue(targetSchema, value[key]);
                    if (itemValue != null || sparse) {
                        newObject[key] = itemValue;
                    }
                }
            }
            else if (ns.isStructSchema()) {
                for (const [key, memberSchema] of ns.structIterator()) {
                    const v = this.readValue(memberSchema, value[key]);
                    if (v != null) {
                        newObject[key] = v;
                    }
                }
            }
            return newObject;
        }
        else {
            return value;
        }
    }
}
