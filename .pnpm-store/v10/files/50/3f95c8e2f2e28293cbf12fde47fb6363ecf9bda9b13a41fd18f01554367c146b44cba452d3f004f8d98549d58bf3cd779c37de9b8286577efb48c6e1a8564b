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
exports.record = void 0;
const Schema_1 = require("../../Schema");
const entries_1 = require("../../utils/entries");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const isPlainObject_1 = require("../../utils/isPlainObject");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const schema_utils_1 = require("../schema-utils");
function record(keySchema, valueSchema) {
    const baseSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformRecord({
                value: raw,
                isKeyNumeric: (yield keySchema.getType()) === Schema_1.SchemaType.NUMBER,
                transformKey: (key) => {
                    var _a;
                    return keySchema.parse(key, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `${key} (key)`] }));
                },
                transformValue: (value, key) => {
                    var _a;
                    return valueSchema.parse(value, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `${key}`] }));
                },
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
            });
        }),
        json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformRecord({
                value: parsed,
                isKeyNumeric: (yield keySchema.getType()) === Schema_1.SchemaType.NUMBER,
                transformKey: (key) => {
                    var _a;
                    return keySchema.json(key, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `${key} (key)`] }));
                },
                transformValue: (value, key) => {
                    var _a;
                    return valueSchema.json(value, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `${key}`] }));
                },
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
            });
        }),
        getType: () => Schema_1.SchemaType.RECORD,
    };
    return Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.record = record;
function validateAndTransformRecord({ value, isKeyNumeric, transformKey, transformValue, breadcrumbsPrefix = [], }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, isPlainObject_1.isPlainObject)(value)) {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "object"),
                    },
                ],
            };
        }
        return (0, entries_1.entries)(value).reduce((accPromise, [stringKey, value]) => __awaiter(this, void 0, void 0, function* () {
            // skip nullish keys
            if (value == null) {
                return accPromise;
            }
            const acc = yield accPromise;
            let key = stringKey;
            if (isKeyNumeric) {
                const numberKey = stringKey.length > 0 ? Number(stringKey) : NaN;
                if (!isNaN(numberKey)) {
                    key = numberKey;
                }
            }
            const transformedKey = yield transformKey(key);
            const transformedValue = yield transformValue(value, key);
            if (acc.ok && transformedKey.ok && transformedValue.ok) {
                return {
                    ok: true,
                    value: Object.assign(Object.assign({}, acc.value), { [transformedKey.value]: transformedValue.value }),
                };
            }
            const errors = [];
            if (!acc.ok) {
                errors.push(...acc.errors);
            }
            if (!transformedKey.ok) {
                errors.push(...transformedKey.errors);
            }
            if (!transformedValue.ok) {
                errors.push(...transformedValue.errors);
            }
            return {
                ok: false,
                errors,
            };
        }), Promise.resolve({ ok: true, value: {} }));
    });
}
