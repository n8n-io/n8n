"use strict";
// zod-json-schema-compat.ts
// ----------------------------------------------------
// JSON Schema conversion for both Zod v3 and Zod v4 (Mini)
// v3 uses your vendored converter; v4 uses Mini's toJSONSchema
// ----------------------------------------------------
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJsonSchemaCompat = toJsonSchemaCompat;
exports.getMethodLiteral = getMethodLiteral;
exports.parseWithCompat = parseWithCompat;
const z4mini = __importStar(require("zod/v4-mini"));
const zod_compat_js_1 = require("./zod-compat.js");
const zod_to_json_schema_1 = require("zod-to-json-schema");
function mapMiniTarget(t) {
    if (!t)
        return 'draft-7';
    if (t === 'jsonSchema7' || t === 'draft-7')
        return 'draft-7';
    if (t === 'jsonSchema2019-09' || t === 'draft-2020-12')
        return 'draft-2020-12';
    return 'draft-7'; // fallback
}
function toJsonSchemaCompat(schema, opts) {
    if ((0, zod_compat_js_1.isZ4Schema)(schema)) {
        // v4 branch — use Mini's built-in toJSONSchema
        return z4mini.toJSONSchema(schema, {
            target: mapMiniTarget(opts?.target),
            io: opts?.pipeStrategy ?? 'input'
        });
    }
    // v3 branch — use vendored converter
    return (0, zod_to_json_schema_1.zodToJsonSchema)(schema, {
        strictUnions: opts?.strictUnions ?? true,
        pipeStrategy: opts?.pipeStrategy ?? 'input'
    });
}
function getMethodLiteral(schema) {
    const shape = (0, zod_compat_js_1.getObjectShape)(schema);
    const methodSchema = shape?.method;
    if (!methodSchema) {
        throw new Error('Schema is missing a method literal');
    }
    const value = (0, zod_compat_js_1.getLiteralValue)(methodSchema);
    if (typeof value !== 'string') {
        throw new Error('Schema method literal must be a string');
    }
    return value;
}
function parseWithCompat(schema, data) {
    const result = (0, zod_compat_js_1.safeParse)(schema, data);
    if (!result.success) {
        throw result.error;
    }
    return result.data;
}
//# sourceMappingURL=zod-json-schema-compat.js.map