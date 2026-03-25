"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enum_ = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
function enum_(values) {
    const validValues = new Set(values);
    const schemaCreator = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.ENUM, (value, { allowUnrecognizedEnumValues, breadcrumbsPrefix = [] } = {}) => {
        if (typeof value !== "string") {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "string"),
                    },
                ],
            };
        }
        if (!validValues.has(value) && !allowUnrecognizedEnumValues) {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "enum"),
                    },
                ],
            };
        }
        return {
            ok: true,
            value: value,
        };
    });
    return schemaCreator();
}
exports.enum_ = enum_;
