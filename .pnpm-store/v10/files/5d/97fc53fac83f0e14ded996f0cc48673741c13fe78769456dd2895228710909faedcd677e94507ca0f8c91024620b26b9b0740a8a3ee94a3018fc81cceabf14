"use strict";
// Forked from https://github.com/eslint/eslint/blob/ad9dd6a933fd098a0d99c6a9aa059850535c23ee/lib/shared/config-validator.js#LL50-L82C2
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuleOptionsSchema = getRuleOptionsSchema;
const isReadonlyArray_1 = require("./isReadonlyArray");
/**
 * Gets a complete options schema for a rule.
 * @param rule A new-style rule object
 * @returns JSON Schema for the rule's options.
 */
function getRuleOptionsSchema(rule) {
    const schema = rule.meta?.schema;
    // Given a tuple of schemas, insert warning level at the beginning
    if ((0, isReadonlyArray_1.isReadonlyArray)(schema)) {
        if (schema.length) {
            return {
                items: schema,
                maxItems: schema.length,
                minItems: 0,
                type: 'array',
            };
        }
        return {
            maxItems: 0,
            minItems: 0,
            type: 'array',
        };
    }
    // Given a full schema, leave it alone
    return schema ?? null;
}
