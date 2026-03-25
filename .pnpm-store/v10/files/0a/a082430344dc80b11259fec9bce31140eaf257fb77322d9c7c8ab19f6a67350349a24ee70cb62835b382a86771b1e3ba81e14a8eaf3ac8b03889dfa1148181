"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.number = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
exports.number = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.NUMBER, (value, { breadcrumbsPrefix = [] } = {}) => {
    if (typeof value === "number") {
        return {
            ok: true,
            value,
        };
    }
    else {
        return {
            ok: false,
            errors: [
                {
                    path: breadcrumbsPrefix,
                    message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "number"),
                },
            ],
        };
    }
});
