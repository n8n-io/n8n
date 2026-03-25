"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zepEmailField = exports.zepPhoneNumberField = exports.zepZipcodeField = exports.zepTextField = exports.ZepTextSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
exports.ZepTextSchema = base_1.BaseSchema.extend({
    zep_type: zod_1.z.union([
        zod_1.z.literal(base_1.ZepDataType.ZepText),
        zod_1.z.literal(base_1.ZepDataType.ZepZipCode),
        zod_1.z.literal(base_1.ZepDataType.ZepEmail),
        zod_1.z.literal(base_1.ZepDataType.ZepPhoneNumber),
    ]),
    value: zod_1.z.string().optional(),
    default: zod_1.z.string().optional(),
});
const zepTextField = (description) => {
    return exports.ZepTextSchema.parse({
        zep_type: base_1.ZepDataType.ZepText,
        description,
    });
};
exports.zepTextField = zepTextField;
const zepZipcodeField = (description) => {
    return exports.ZepTextSchema.parse({
        zep_type: base_1.ZepDataType.ZepZipCode,
        description,
    });
};
exports.zepZipcodeField = zepZipcodeField;
const zepPhoneNumberField = (description) => {
    return exports.ZepTextSchema.parse({
        zep_type: base_1.ZepDataType.ZepPhoneNumber,
        description,
    });
};
exports.zepPhoneNumberField = zepPhoneNumberField;
const zepEmailField = (description) => {
    return exports.ZepTextSchema.parse({
        zep_type: base_1.ZepDataType.ZepEmail,
        description,
    });
};
exports.zepEmailField = zepEmailField;
