"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.booleanLiteral = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
function booleanLiteral(literal) {
    const schemaCreator = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.BOOLEAN_LITERAL, (value, { breadcrumbsPrefix = [] } = {}) => {
        if (value === literal) {
            return {
                ok: true,
                value: literal,
            };
        }
        else {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, `${literal.toString()}`),
                    },
                ],
            };
        }
    });
    return schemaCreator();
}
exports.booleanLiteral = booleanLiteral;
