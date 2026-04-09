"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveInputValuesToSchema = resolveInputValuesToSchema;
const _2020_1 = __importDefault(require("@redocly/ajv/dist/2020"));
function resolveInputValuesToSchema(value, schema) {
    if (!schema || Object.keys(schema).length === 0) {
        return {};
    }
    const ajv = new _2020_1.default({
        useDefaults: true,
        removeAdditional: 'all',
        coerceTypes: true,
        strictTypes: false,
    });
    // Add custom formats
    ajv.addFormat('password', true);
    ajv.addFormat('int32', true);
    ajv.addFormat('int64', true);
    ajv.addFormat('float', true);
    ajv.addFormat('double', true);
    const validate = ajv.compile(schema);
    const result = { ...value };
    validate(result);
    return result;
}
//# sourceMappingURL=map-input-values-to-schema.js.map