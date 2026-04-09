import { determineTimestampFormat } from "@smithy/core/protocols";
import { NormalizedSchema } from "@smithy/core/schema";
import { dateToUtcString, generateIdempotencyToken, LazyJsonString, NumericValue } from "@smithy/core/serde";
import { toBase64 } from "@smithy/util-base64";
import { SerdeContextConfig } from "../../ConfigurableSerdeContext";
export class SinglePassJsonShapeSerializer extends SerdeContextConfig {
    settings;
    buffer;
    rootSchema;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema, value) {
        this.rootSchema = NormalizedSchema.of(schema);
        this.buffer = this.writeObject(this.rootSchema, value);
    }
    writeDiscriminatedDocument(schema, value) {
        this.write(schema, value);
        if (typeof this.buffer === "object") {
            this.buffer.__type = NormalizedSchema.of(schema).getName(true);
        }
    }
    flush() {
        this.rootSchema = undefined;
        return this.buffer;
    }
    writeObject(schema, value) {
        if (value == undefined) {
            return "";
        }
        let b = "";
        const ns = NormalizedSchema.of(schema);
        const sparse = !!ns.getMergedTraits().sparse;
        if (Array.isArray(value) && (ns.isDocumentSchema() || ns.isListSchema())) {
            b += "[";
            for (let i = 0; i < value.length; ++i) {
                const item = value[i];
                if (item != null || sparse) {
                    b += this.writeValue(ns.getValueSchema(), item);
                    b += ",";
                }
            }
        }
        else if (ns.isStructSchema()) {
            b += "{";
            let didWriteMember = false;
            for (const [name, member] of ns.structIterator()) {
                const item = value[name];
                const targetKey = this.settings.jsonName ? member.getMergedTraits().jsonName ?? name : name;
                const serializableValue = this.writeValue(member, item);
                if (item != null || member.isIdempotencyToken()) {
                    didWriteMember = true;
                    b += `"${targetKey}":${serializableValue}`;
                    b += ",";
                }
            }
            if (!didWriteMember && ns.isUnionSchema()) {
                const { $unknown } = value;
                if (Array.isArray($unknown)) {
                    const [k, v] = $unknown;
                    b += `"${k}":${this.writeValue(15, v)}`;
                }
            }
        }
        else if (ns.isMapSchema() || ns.isDocumentSchema()) {
            b += "{";
            for (const [k, v] of Object.entries(value)) {
                if (v != null || sparse) {
                    b += `"${k}":${this.writeValue(ns, v)}`;
                    b += ",";
                }
            }
        }
        if (b[b.length - 1] === ",") {
            b = b.slice(0, -1);
        }
        if (b[0] === "[") {
            b += "]";
        }
        if (b[0] === "{") {
            b += "}";
        }
        return b;
    }
    writeValue(schema, value) {
        const isObject = value !== null && typeof value === "object";
        const ns = NormalizedSchema.of(schema);
        const quote = (_) => `"${_}"`;
        if ((ns.isBlobSchema() && (value instanceof Uint8Array || typeof value === "string")) ||
            (ns.isDocumentSchema() && value instanceof Uint8Array)) {
            return quote((this.serdeContext?.base64Encoder ?? toBase64)(value));
        }
        if ((ns.isTimestampSchema() || ns.isDocumentSchema()) && value instanceof Date) {
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
                case 5:
                    return quote(value.toISOString().replace(".000Z", "Z"));
                case 6:
                    return quote(dateToUtcString(value));
                case 7:
                    return String(value.getTime() / 1000);
                default:
                    console.warn("Missing timestamp format, using epoch seconds", value);
                    return String(value.getTime() / 1000);
            }
        }
        if (ns.isNumericSchema() && typeof value === "number") {
            if (Math.abs(value) === Infinity || isNaN(value)) {
                return quote(String(value));
            }
        }
        if (ns.isStringSchema()) {
            if (typeof value === "undefined" && ns.isIdempotencyToken()) {
                return quote(generateIdempotencyToken());
            }
            if (typeof value === "string") {
                const mediaType = ns.getMergedTraits().mediaType;
                if (mediaType) {
                    const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
                    if (isJson) {
                        return quote(LazyJsonString.from(value).toString());
                    }
                }
            }
        }
        if (value instanceof NumericValue) {
            return value.string;
        }
        if (isObject) {
            return this.writeObject(ns, value);
        }
        return typeof value === "string" ? quote(value) : String(value);
    }
}
