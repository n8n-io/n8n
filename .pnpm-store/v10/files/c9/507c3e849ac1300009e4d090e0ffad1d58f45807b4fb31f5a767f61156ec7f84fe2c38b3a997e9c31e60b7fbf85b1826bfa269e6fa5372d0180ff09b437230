"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObjectUtils = exports.object = void 0;
const Schema_1 = require("../../Schema");
const entries_1 = require("../../utils/entries");
const filterObject_1 = require("../../utils/filterObject");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const isPlainObject_1 = require("../../utils/isPlainObject");
const keys_1 = require("../../utils/keys");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const partition_1 = require("../../utils/partition");
const object_like_1 = require("../object-like");
const schema_utils_1 = require("../schema-utils");
const property_1 = require("./property");
function object(schemas) {
    const baseSchema = {
        _getRawProperties: () => Object.entries(schemas).map(([parsedKey, propertySchema]) => (0, property_1.isProperty)(propertySchema) ? propertySchema.rawKey : parsedKey),
        _getParsedProperties: () => (0, keys_1.keys)(schemas),
        parse: (raw, opts) => {
            const rawKeyToProperty = {};
            const requiredKeys = [];
            for (const [parsedKey, schemaOrObjectProperty] of (0, entries_1.entries)(schemas)) {
                const rawKey = (0, property_1.isProperty)(schemaOrObjectProperty) ? schemaOrObjectProperty.rawKey : parsedKey;
                const valueSchema = (0, property_1.isProperty)(schemaOrObjectProperty)
                    ? schemaOrObjectProperty.valueSchema
                    : schemaOrObjectProperty;
                const property = {
                    rawKey,
                    parsedKey: parsedKey,
                    valueSchema,
                };
                rawKeyToProperty[rawKey] = property;
                if (isSchemaRequired(valueSchema)) {
                    requiredKeys.push(rawKey);
                }
            }
            return validateAndTransformObject({
                value: raw,
                requiredKeys,
                getProperty: (rawKey) => {
                    const property = rawKeyToProperty[rawKey];
                    if (property == null) {
                        return undefined;
                    }
                    return {
                        transformedKey: property.parsedKey,
                        transform: (propertyValue) => {
                            var _a;
                            return property.valueSchema.parse(propertyValue, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), rawKey] }));
                        },
                    };
                },
                unrecognizedObjectKeys: opts === null || opts === void 0 ? void 0 : opts.unrecognizedObjectKeys,
                skipValidation: opts === null || opts === void 0 ? void 0 : opts.skipValidation,
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
                omitUndefined: opts === null || opts === void 0 ? void 0 : opts.omitUndefined,
            });
        },
        json: (parsed, opts) => {
            const requiredKeys = [];
            for (const [parsedKey, schemaOrObjectProperty] of (0, entries_1.entries)(schemas)) {
                const valueSchema = (0, property_1.isProperty)(schemaOrObjectProperty)
                    ? schemaOrObjectProperty.valueSchema
                    : schemaOrObjectProperty;
                if (isSchemaRequired(valueSchema)) {
                    requiredKeys.push(parsedKey);
                }
            }
            return validateAndTransformObject({
                value: parsed,
                requiredKeys,
                getProperty: (parsedKey) => {
                    const property = schemas[parsedKey];
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    if (property == null) {
                        return undefined;
                    }
                    if ((0, property_1.isProperty)(property)) {
                        return {
                            transformedKey: property.rawKey,
                            transform: (propertyValue) => {
                                var _a;
                                return property.valueSchema.json(propertyValue, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), parsedKey] }));
                            },
                        };
                    }
                    else {
                        return {
                            transformedKey: parsedKey,
                            transform: (propertyValue) => {
                                var _a;
                                return property.json(propertyValue, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), parsedKey] }));
                            },
                        };
                    }
                },
                unrecognizedObjectKeys: opts === null || opts === void 0 ? void 0 : opts.unrecognizedObjectKeys,
                skipValidation: opts === null || opts === void 0 ? void 0 : opts.skipValidation,
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
                omitUndefined: opts === null || opts === void 0 ? void 0 : opts.omitUndefined,
            });
        },
        getType: () => Schema_1.SchemaType.OBJECT,
    };
    return Object.assign(Object.assign(Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema)), (0, object_like_1.getObjectLikeUtils)(baseSchema)), getObjectUtils(baseSchema));
}
exports.object = object;
function validateAndTransformObject({ value, requiredKeys, getProperty, unrecognizedObjectKeys = "fail", skipValidation = false, breadcrumbsPrefix = [], }) {
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
    const missingRequiredKeys = new Set(requiredKeys);
    const errors = [];
    const transformed = {};
    for (const [preTransformedKey, preTransformedItemValue] of Object.entries(value)) {
        const property = getProperty(preTransformedKey);
        if (property != null) {
            missingRequiredKeys.delete(preTransformedKey);
            const value = property.transform(preTransformedItemValue);
            if (value.ok) {
                transformed[property.transformedKey] = value.value;
            }
            else {
                transformed[preTransformedKey] = preTransformedItemValue;
                errors.push(...value.errors);
            }
        }
        else {
            switch (unrecognizedObjectKeys) {
                case "fail":
                    errors.push({
                        path: [...breadcrumbsPrefix, preTransformedKey],
                        message: `Unexpected key "${preTransformedKey}"`,
                    });
                    break;
                case "strip":
                    break;
                case "passthrough":
                    transformed[preTransformedKey] = preTransformedItemValue;
                    break;
            }
        }
    }
    errors.push(...requiredKeys
        .filter((key) => missingRequiredKeys.has(key))
        .map((key) => ({
        path: breadcrumbsPrefix,
        message: `Missing required key "${key}"`,
    })));
    if (errors.length === 0 || skipValidation) {
        return {
            ok: true,
            value: transformed,
        };
    }
    else {
        return {
            ok: false,
            errors,
        };
    }
}
function getObjectUtils(schema) {
    return {
        extend: (extension) => {
            const baseSchema = {
                _getParsedProperties: () => [...schema._getParsedProperties(), ...extension._getParsedProperties()],
                _getRawProperties: () => [...schema._getRawProperties(), ...extension._getRawProperties()],
                parse: (raw, opts) => {
                    return validateAndTransformExtendedObject({
                        extensionKeys: extension._getRawProperties(),
                        value: raw,
                        transformBase: (rawBase) => schema.parse(rawBase, opts),
                        transformExtension: (rawExtension) => extension.parse(rawExtension, opts),
                    });
                },
                json: (parsed, opts) => {
                    return validateAndTransformExtendedObject({
                        extensionKeys: extension._getParsedProperties(),
                        value: parsed,
                        transformBase: (parsedBase) => schema.json(parsedBase, opts),
                        transformExtension: (parsedExtension) => extension.json(parsedExtension, opts),
                    });
                },
                getType: () => Schema_1.SchemaType.OBJECT,
            };
            return Object.assign(Object.assign(Object.assign(Object.assign({}, baseSchema), (0, schema_utils_1.getSchemaUtils)(baseSchema)), (0, object_like_1.getObjectLikeUtils)(baseSchema)), getObjectUtils(baseSchema));
        },
    };
}
exports.getObjectUtils = getObjectUtils;
function validateAndTransformExtendedObject({ extensionKeys, value, transformBase, transformExtension, }) {
    const extensionPropertiesSet = new Set(extensionKeys);
    const [extensionProperties, baseProperties] = (0, partition_1.partition)((0, keys_1.keys)(value), (key) => extensionPropertiesSet.has(key));
    const transformedBase = transformBase((0, filterObject_1.filterObject)(value, baseProperties));
    const transformedExtension = transformExtension((0, filterObject_1.filterObject)(value, extensionProperties));
    if (transformedBase.ok && transformedExtension.ok) {
        return {
            ok: true,
            value: Object.assign(Object.assign({}, transformedBase.value), transformedExtension.value),
        };
    }
    else {
        return {
            ok: false,
            errors: [
                ...(transformedBase.ok ? [] : transformedBase.errors),
                ...(transformedExtension.ok ? [] : transformedExtension.errors),
            ],
        };
    }
}
function isSchemaRequired(schema) {
    return !isSchemaOptional(schema);
}
function isSchemaOptional(schema) {
    switch (schema.getType()) {
        case Schema_1.SchemaType.ANY:
        case Schema_1.SchemaType.UNKNOWN:
        case Schema_1.SchemaType.OPTIONAL:
            return true;
        default:
            return false;
    }
}
