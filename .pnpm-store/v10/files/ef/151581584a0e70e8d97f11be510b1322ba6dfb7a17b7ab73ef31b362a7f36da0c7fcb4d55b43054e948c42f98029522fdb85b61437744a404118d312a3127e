"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.string = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
exports.string = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.STRING, (value, { breadcrumbsPrefix = [] } = {}) => {
    if (typeof value === "string") {
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
                    message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "string"),
                },
            ],
        };
    }
});
