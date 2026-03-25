"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zepDateTimeField = exports.zepDateField = exports.ZepDateSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
const stringToDateTransformer = zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).transform((value, ctx) => {
    if (typeof value === "string") {
        return new Date(value);
    }
    return value;
});
exports.ZepDateSchema = base_1.BaseSchema.extend({
    zep_type: zod_1.z.union([zod_1.z.literal(base_1.ZepDataType.ZepDate), zod_1.z.literal(base_1.ZepDataType.ZepDateTime)]),
    value: stringToDateTransformer.optional(),
});
const zepDateField = (description) => {
    return exports.ZepDateSchema.parse({
        zep_type: base_1.ZepDataType.ZepDate,
        description,
    });
};
exports.zepDateField = zepDateField;
const zepDateTimeField = (description) => {
    return exports.ZepDateSchema.parse({
        zep_type: base_1.ZepDataType.ZepDateTime,
        description,
    });
};
exports.zepDateTimeField = zepDateTimeField;
