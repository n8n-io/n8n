"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zepFloatField = exports.zepNumberField = exports.ZepNumberSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
const stringToNumberTransformer = zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform((value, ctx) => {
    if (typeof value === "string") {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Not a number",
            });
        }
        return parsed;
    }
    return value;
});
exports.ZepNumberSchema = base_1.BaseSchema.extend({
    zep_type: zod_1.z.union([zod_1.z.literal(base_1.ZepDataType.ZepNumber), zod_1.z.literal(base_1.ZepDataType.ZepFloat)]),
    value: stringToNumberTransformer.optional(),
    default: stringToNumberTransformer.optional(),
});
const zepNumberField = (description) => {
    return exports.ZepNumberSchema.parse({
        zep_type: base_1.ZepDataType.ZepNumber,
        description,
    });
};
exports.zepNumberField = zepNumberField;
const zepFloatField = (description) => {
    return exports.ZepNumberSchema.parse({
        zep_type: base_1.ZepDataType.ZepFloat,
        description,
    });
};
exports.zepFloatField = zepFloatField;
