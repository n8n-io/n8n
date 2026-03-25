"use strict";
// Forked from https://github.com/eslint/eslint/blob/ad9dd6a933fd098a0d99c6a9aa059850535c23ee/lib/shared/ajv.js
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ajvBuilder = ajvBuilder;
const ajv_1 = __importDefault(require("ajv"));
const json_schema_draft_04_json_1 = __importDefault(require("ajv/lib/refs/json-schema-draft-04.json"));
function ajvBuilder(additionalOptions = {}) {
    const ajv = new ajv_1.default({
        meta: false,
        missingRefs: 'ignore',
        schemaId: 'auto',
        useDefaults: true,
        validateSchema: false,
        verbose: true,
        ...additionalOptions,
    });
    ajv.addMetaSchema(json_schema_draft_04_json_1.default);
    // @ts-expect-error -- this is an untyped part of the ajv API
    ajv._opts.defaultMeta = json_schema_draft_04_json_1.default.id;
    return ajv;
}
