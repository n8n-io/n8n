"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zepFields = exports.schemas = exports.DataExtractorFields = void 0;
const zod_1 = require("zod");
const date_1 = require("./date");
const number_1 = require("./number");
const text_1 = require("./text");
const regex_1 = require("./regex");
exports.DataExtractorFields = zod_1.z.record(zod_1.z.union([number_1.ZepNumberSchema, text_1.ZepTextSchema, date_1.ZepDateSchema, regex_1.ZepRegexSchema]));
exports.schemas = {
    ZepNumber: number_1.ZepNumberSchema,
    ZepText: text_1.ZepTextSchema,
    ZepZipCode: text_1.ZepTextSchema,
    ZepDate: date_1.ZepDateSchema,
    ZepDateTime: date_1.ZepDateSchema,
    ZepEmail: text_1.ZepTextSchema,
    ZepPhoneNumber: text_1.ZepTextSchema,
    ZepFloat: number_1.ZepNumberSchema,
    ZepRegex: regex_1.ZepRegexSchema,
};
exports.zepFields = {
    number: number_1.zepNumberField,
    text: text_1.zepTextField,
    zipCode: text_1.zepZipcodeField,
    date: date_1.zepDateField,
    dateTime: date_1.zepDateTimeField,
    email: text_1.zepEmailField,
    phoneNumber: text_1.zepPhoneNumberField,
    float: number_1.zepFloatField,
    regex: regex_1.zepRegexField,
};
