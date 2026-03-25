import { determineTimestampFormat } from "@smithy/core/protocols";
import { NormalizedSchema } from "@smithy/core/schema";
import { LazyJsonString, NumericValue, parseEpochTimestamp, parseRfc3339DateTimeWithOffset, parseRfc7231DateTime, } from "@smithy/core/serde";
import { fromBase64 } from "@smithy/util-base64";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import { jsonReviver } from "./jsonReviver";
import { parseJsonBody } from "./parseJsonBody";
export class JsonShapeDeserializer extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    async read(schema, data) {
        return this._read(schema, typeof data === "string" ? JSON.parse(data, jsonReviver) : await parseJsonBody(data, this.serdeContext));
    }
    readObject(schema, data) {
        return this._read(schema, data);
    }
    _read(schema, value) {
        const isObject = value !== null && typeof value === "object";
        const ns = NormalizedSchema.of(schema);
        if (ns.isListSchema() && Array.isArray(value)) {
            const listMember = ns.getValueSchema();
            const out = [];
            const sparse = !!ns.getMergedTraits().sparse;
            for (const item of value) {
                if (sparse || item != null) {
                    out.push(this._read(listMember, item));
                }
            }
            return out;
        }
        else if (ns.isMapSchema() && isObject) {
            const mapMember = ns.getValueSchema();
            const out = {};
            const sparse = !!ns.getMergedTraits().sparse;
            for (const [_k, _v] of Object.entries(value)) {
                if (sparse || _v != null) {
                    out[_k] = this._read(mapMember, _v);
                }
            }
            return out;
        }
        else if (ns.isStructSchema() && isObject) {
            const out = {};
            for (const [memberName, memberSchema] of ns.structIterator()) {
                const fromKey = this.settings.jsonName ? memberSchema.getMergedTraits().jsonName ?? memberName : memberName;
                const deserializedValue = this._read(memberSchema, value[fromKey]);
                if (deserializedValue != null) {
                    out[memberName] = deserializedValue;
                }
            }
            return out;
        }
        if (ns.isBlobSchema() && typeof value === "string") {
            return fromBase64(value);
        }
        const mediaType = ns.getMergedTraits().mediaType;
        if (ns.isStringSchema() && typeof value === "string" && mediaType) {
            const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
            if (isJson) {
                return LazyJsonString.from(value);
            }
        }
        if (ns.isTimestampSchema() && value != null) {
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
                case 5:
                    return parseRfc3339DateTimeWithOffset(value);
                case 6:
                    return parseRfc7231DateTime(value);
                case 7:
                    return parseEpochTimestamp(value);
                default:
                    console.warn("Missing timestamp format, parsing value with Date constructor:", value);
                    return new Date(value);
            }
        }
        if (ns.isBigIntegerSchema() && (typeof value === "number" || typeof value === "string")) {
            return BigInt(value);
        }
        if (ns.isBigDecimalSchema() && value != undefined) {
            if (value instanceof NumericValue) {
                return value;
            }
            const untyped = value;
            if (untyped.type === "bigDecimal" && "string" in untyped) {
                return new NumericValue(untyped.string, untyped.type);
            }
            return new NumericValue(String(value), "bigDecimal");
        }
        if (ns.isNumericSchema() && typeof value === "string") {
            switch (value) {
                case "Infinity":
                    return Infinity;
                case "-Infinity":
                    return -Infinity;
                case "NaN":
                    return NaN;
            }
        }
        if (ns.isDocumentSchema()) {
            if (isObject) {
                const out = Array.isArray(value) ? [] : {};
                for (const [k, v] of Object.entries(value)) {
                    if (v instanceof NumericValue) {
                        out[k] = v;
                    }
                    else {
                        out[k] = this._read(ns, v);
                    }
                }
                return out;
            }
            else {
                return structuredClone(value);
            }
        }
        return value;
    }
}
