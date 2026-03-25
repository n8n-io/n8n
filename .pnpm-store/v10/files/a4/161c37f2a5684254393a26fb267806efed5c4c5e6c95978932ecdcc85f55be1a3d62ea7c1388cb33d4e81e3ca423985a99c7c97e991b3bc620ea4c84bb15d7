"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = exports.optional = exports.getSchemaUtils = void 0;
const Schema_1 = require("../../Schema");
const JsonError_1 = require("./JsonError");
const ParseError_1 = require("./ParseError");
function getSchemaUtils(schema) {
    return {
        optional: () => optional(schema),
        transform: (transformer) => transform(schema, transformer),
        parseOrThrow: (raw, opts) => {
            const parsed = schema.parse(raw, opts);
            if (parsed.ok) {
                return parsed.value;
            }
            throw new ParseError_1.ParseError(parsed.errors);
        },
        jsonOrThrow: (parsed, opts) => {
            const raw = schema.json(parsed, opts);
            if (raw.ok) {
                return raw.value;
            }
            throw new JsonError_1.JsonError(raw.errors);
        },
    };
}
exports.getSchemaUtils = getSchemaUtils;
/**
 * schema utils are defined in one file to resolve issues with circular imports
 */
function optional(schema) {
    const baseSchema = {
        parse: (raw, opts) => {
            if (raw == null) {
                return {
                    ok: true,
                    value: undefined,
                };
            }
            return schema.parse(raw, opts);
        },
        json: (parsed, opts) => {
            if ((opts === null || opts === void 0 ? void 0 : opts.omitUndefined) && parsed === undefined) {
                return {
                    ok: true,
                    value: undefined,
                };
            }
            if (parsed == null) {
                return {
                    ok: true,
                    value: null,
                };
            }
            return schema.json(parsed, opts);
        },
        getType: () => Schema_1.SchemaType.OPTIONAL,
    };
    return Object.assign(Object.assign({}, baseSchema), getSchemaUtils(baseSchema));
}
exports.optional = optional;
function transform(schema, transformer) {
    const baseSchema = {
        parse: (raw, opts) => {
            const parsed = schema.parse(raw, opts);
            if (!parsed.ok) {
                return parsed;
            }
            return {
                ok: true,
                value: transformer.transform(parsed.value),
            };
        },
        json: (transformed, opts) => {
            const parsed = transformer.untransform(transformed);
            return schema.json(parsed, opts);
        },
        getType: () => schema.getType(),
    };
    return Object.assign(Object.assign({}, baseSchema), getSchemaUtils(baseSchema));
}
exports.transform = transform;
