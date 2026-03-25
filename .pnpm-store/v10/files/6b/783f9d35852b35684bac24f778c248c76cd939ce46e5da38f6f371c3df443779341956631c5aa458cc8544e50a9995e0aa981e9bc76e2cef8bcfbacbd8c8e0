import { determineTimestampFormat } from "@smithy/core/protocols";
import { NormalizedSchema } from "@smithy/core/schema";
import { dateToUtcString, generateIdempotencyToken, LazyJsonString, NumericValue } from "@smithy/core/serde";
import { toBase64 } from "@smithy/util-base64";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import { JsonReplacer } from "./jsonReplacer";
export class JsonShapeSerializer extends SerdeContextConfig {
    settings;
    buffer;
    rootSchema;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema, value) {
        this.rootSchema = NormalizedSchema.of(schema);
        this.buffer = this._write(this.rootSchema, value);
    }
    writeDiscriminatedDocument(schema, value) {
        this.write(schema, value);
        if (typeof this.buffer === "object") {
            this.buffer.__type = NormalizedSchema.of(schema).getName(true);
        }
    }
    flush() {
        const { rootSchema } = this;
        this.rootSchema = undefined;
        if (rootSchema?.isStructSchema() || rootSchema?.isDocumentSchema()) {
            const replacer = new JsonReplacer();
            return replacer.replaceInJson(JSON.stringify(this.buffer, replacer.createReplacer(), 0));
        }
        return this.buffer;
    }
    _write(schema, value, container) {
        const isObject = value !== null && typeof value === "object";
        const ns = NormalizedSchema.of(schema);
        if (ns.isListSchema() && Array.isArray(value)) {
            const listMember = ns.getValueSchema();
            const out = [];
            const sparse = !!ns.getMergedTraits().sparse;
            for (const item of value) {
                if (sparse || item != null) {
                    out.push(this._write(listMember, item));
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
                    out[_k] = this._write(mapMember, _v);
                }
            }
            return out;
        }
        else if (ns.isStructSchema() && isObject) {
            const out = {};
            for (const [memberName, memberSchema] of ns.structIterator()) {
                const targetKey = this.settings.jsonName ? memberSchema.getMergedTraits().jsonName ?? memberName : memberName;
                const serializableValue = this._write(memberSchema, value[memberName], ns);
                if (serializableValue !== undefined) {
                    out[targetKey] = serializableValue;
                }
            }
            return out;
        }
        if (value === null && container?.isStructSchema()) {
            return void 0;
        }
        if ((ns.isBlobSchema() && (value instanceof Uint8Array || typeof value === "string")) ||
            (ns.isDocumentSchema() && value instanceof Uint8Array)) {
            if (ns === this.rootSchema) {
                return value;
            }
            if (!this.serdeContext?.base64Encoder) {
                return toBase64(value);
            }
            return this.serdeContext?.base64Encoder(value);
        }
        if ((ns.isTimestampSchema() || ns.isDocumentSchema()) && value instanceof Date) {
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
                case 5:
                    return value.toISOString().replace(".000Z", "Z");
                case 6:
                    return dateToUtcString(value);
                case 7:
                    return value.getTime() / 1000;
                default:
                    console.warn("Missing timestamp format, using epoch seconds", value);
                    return value.getTime() / 1000;
            }
        }
        if (ns.isNumericSchema() && typeof value === "number") {
            if (Math.abs(value) === Infinity || isNaN(value)) {
                return String(value);
            }
        }
        if (ns.isStringSchema()) {
            if (typeof value === "undefined" && ns.isIdempotencyToken()) {
                return generateIdempotencyToken();
            }
            const mediaType = ns.getMergedTraits().mediaType;
            if (value != null && mediaType) {
                const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
                if (isJson) {
                    return LazyJsonString.from(value);
                }
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
                        out[k] = this._write(ns, v);
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
