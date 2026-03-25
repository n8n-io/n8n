"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = void 0;
const Schema_1 = require("../../Schema");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const schema_utils_1 = require("../schema-utils");
function list(schema) {
    const baseSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformArray(raw, (item, index) => {
                var _a;
                return schema.parse(item, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `[${index}]`] }));
            });
        }),
        json: (parsed, opts) => validateAndTransformArray(parsed, (item, index) => {
            var _a;
            return schema.json(item, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `[${index}]`] }));
        }),
        getType: () => Schema_1.SchemaType.LIST,
    };
    return Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.list = list;
function validateAndTransformArray(value, transformItem) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Array.isArray(value)) {
            return {
                ok: false,
                errors: [
                    {
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "list"),
                        path: [],
                    },
                ],
            };
        }
        const maybeValidItems = yield Promise.all(value.map((item, index) => transformItem(item, index)));
        return maybeValidItems.reduce((acc, item) => {
            if (acc.ok && item.ok) {
                return {
                    ok: true,
                    value: [...acc.value, item.value],
                };
            }
            const errors = [];
            if (!acc.ok) {
                errors.push(...acc.errors);
            }
            if (!item.ok) {
                errors.push(...item.errors);
            }
            return {
                ok: false,
                errors,
            };
        }, { ok: true, value: [] });
    });
}
