"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSchema = exports.ZepDataType = void 0;
const zod_1 = require("zod");
var ZepDataType;
(function (ZepDataType) {
    ZepDataType["ZepText"] = "ZepText";
    ZepDataType["ZepZipCode"] = "ZepZipCode";
    ZepDataType["ZepDate"] = "ZepDate";
    ZepDataType["ZepDateTime"] = "ZepDateTime";
    ZepDataType["ZepEmail"] = "ZepEmail";
    ZepDataType["ZepPhoneNumber"] = "ZepPhoneNumber";
    ZepDataType["ZepFloat"] = "ZepFloat";
    ZepDataType["ZepNumber"] = "ZepNumber";
    ZepDataType["ZepRegex"] = "ZepRegex";
})(ZepDataType = exports.ZepDataType || (exports.ZepDataType = {}));
exports.BaseSchema = zod_1.z.object({
    zep_type: zod_1.z.nativeEnum(ZepDataType),
    description: zod_1.z.string(),
});
