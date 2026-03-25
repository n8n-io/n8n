"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const limitNumber_1 = require("./limitNumber");
const limitNumberExclusive_1 = require("./limitNumberExclusive");
const multipleOf_1 = require("ajv/dist/vocabularies/validation/multipleOf");
const limitLength_1 = require("ajv/dist/vocabularies/validation/limitLength");
const pattern_1 = require("ajv/dist/vocabularies/validation/pattern");
const limitProperties_1 = require("ajv/dist/vocabularies/validation/limitProperties");
const required_1 = require("ajv/dist/vocabularies/validation/required");
const limitItems_1 = require("ajv/dist/vocabularies/validation/limitItems");
const uniqueItems_1 = require("ajv/dist/vocabularies/validation/uniqueItems");
const const_1 = require("ajv/dist/vocabularies/validation/const");
const enum_1 = require("ajv/dist/vocabularies/validation/enum");
const validation = [
    // number
    limitNumber_1.default,
    limitNumberExclusive_1.default,
    multipleOf_1.default,
    // string
    limitLength_1.default,
    pattern_1.default,
    // object
    limitProperties_1.default,
    required_1.default,
    // array
    limitItems_1.default,
    uniqueItems_1.default,
    // any
    { keyword: "type", schemaType: ["string", "array"] },
    { keyword: "nullable", schemaType: "boolean" },
    const_1.default,
    enum_1.default,
];
exports.default = validation;
//# sourceMappingURL=index.js.map