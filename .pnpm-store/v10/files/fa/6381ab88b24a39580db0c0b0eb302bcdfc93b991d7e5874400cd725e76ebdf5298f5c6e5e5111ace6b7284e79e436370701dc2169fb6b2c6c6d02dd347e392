"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zepRegexField = exports.ZepRegexSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
exports.ZepRegexSchema = base_1.BaseSchema.extend({
    zep_type: zod_1.z.literal(base_1.ZepDataType.ZepRegex),
    value: zod_1.z.string().optional(),
    pattern: zod_1.z.string().refine((p) => {
        try {
            new RegExp(p);
            return true; // Pattern is valid
        }
        catch (_a) {
            return false; // Pattern is invalid
        }
    }, {
        message: "Invalid regex pattern", // Custom error message
    }),
    default: zod_1.z.string().optional(),
});
const zepRegexField = (description, pattern) => {
    return exports.ZepRegexSchema.parse({
        zep_type: base_1.ZepDataType.ZepRegex,
        pattern: pattern.source,
        description,
    });
};
exports.zepRegexField = zepRegexField;
