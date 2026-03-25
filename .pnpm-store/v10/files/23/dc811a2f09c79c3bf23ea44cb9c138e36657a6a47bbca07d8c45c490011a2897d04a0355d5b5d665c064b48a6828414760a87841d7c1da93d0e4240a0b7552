"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oasTypeOf = oasTypeOf;
exports.matchesJsonSchemaType = matchesJsonSchemaType;
exports.missingRequiredField = missingRequiredField;
exports.missingRequiredOneOfFields = missingRequiredOneOfFields;
exports.fieldNonEmpty = fieldNonEmpty;
exports.validateDefinedAndNonEmpty = validateDefinedAndNonEmpty;
exports.validateOneOfDefinedAndNonEmpty = validateOneOfDefinedAndNonEmpty;
exports.getSuggest = getSuggest;
exports.validateExample = validateExample;
exports.getAdditionalPropertiesOption = getAdditionalPropertiesOption;
exports.validateSchemaEnumType = validateSchemaEnumType;
exports.validateResponseCodes = validateResponseCodes;
const levenshtein = require("js-levenshtein");
const ref_utils_1 = require("../ref-utils");
const ajv_1 = require("./ajv");
const utils_1 = require("../utils");
function oasTypeOf(value) {
    if (Array.isArray(value)) {
        return 'array';
    }
    else if (value === null) {
        return 'null';
    }
    else if (Number.isInteger(value)) {
        return 'integer';
    }
    else {
        return typeof value;
    }
}
/**
 * Checks if value matches specified JSON schema type
 *
 * @param {*} value - value to check
 * @param {JSONSchemaType} type - JSON Schema type
 * @returns boolean
 */
function matchesJsonSchemaType(value, type, nullable) {
    if (nullable && value === null) {
        return true;
    }
    switch (type) {
        case 'array':
            return Array.isArray(value);
        case 'object':
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        case 'null':
            return value === null;
        case 'integer':
            return Number.isInteger(value);
        default:
            return typeof value === type;
    }
}
function missingRequiredField(type, field) {
    return `${type} object should contain \`${field}\` field.`;
}
function missingRequiredOneOfFields(type, fields) {
    return `${type} object should contain one of the fields: ${fields
        .map((field) => `\`${field}\``)
        .join(', ')}.`;
}
function fieldNonEmpty(type, field) {
    return `${type} object \`${field}\` must be non-empty string.`;
}
function validateDefinedAndNonEmpty(fieldName, value, ctx) {
    if (!(0, utils_1.isPlainObject)(value)) {
        return;
    }
    if (value[fieldName] === undefined) {
        ctx.report({
            message: missingRequiredField(ctx.type.name, fieldName),
            location: ctx.location.child([fieldName]).key(),
        });
    }
    else if (!value[fieldName]) {
        ctx.report({
            message: fieldNonEmpty(ctx.type.name, fieldName),
            location: ctx.location.child([fieldName]).key(),
        });
    }
}
function validateOneOfDefinedAndNonEmpty(fieldNames, value, ctx) {
    if (!(0, utils_1.isPlainObject)(value)) {
        return;
    }
    if (!fieldNames.some((fieldName) => value.hasOwnProperty(fieldName))) {
        ctx.report({
            message: missingRequiredOneOfFields(ctx.type.name, fieldNames),
            location: ctx.location.key(),
        });
    }
    for (const fieldName of fieldNames) {
        if (value.hasOwnProperty(fieldName) && !value[fieldName]) {
            ctx.report({
                message: fieldNonEmpty(ctx.type.name, fieldName),
                location: ctx.location.child([fieldName]).key(),
            });
        }
    }
}
function getSuggest(given, variants) {
    if (given === null)
        return variants;
    if (typeof given !== 'string' || !variants.length)
        return [];
    const distances = [];
    for (let i = 0; i < variants.length; i++) {
        const distance = levenshtein(given, variants[i]);
        if (distance < 4) {
            distances.push({ distance, variant: variants[i] });
        }
    }
    distances.sort((a, b) => a.distance - b.distance);
    // if (bestMatch.distance <= 4) return bestMatch.string;
    return distances.map((d) => d.variant);
}
function validateExample(example, schema, dataLoc, { resolve, location, report }, allowAdditionalProperties) {
    try {
        const { valid, errors } = (0, ajv_1.validateJsonSchema)(example, schema, location.child('schema'), dataLoc.pointer, resolve, allowAdditionalProperties);
        if (!valid) {
            for (const error of errors) {
                report({
                    message: `Example value must conform to the schema: ${error.message}.`,
                    location: {
                        ...new ref_utils_1.Location(dataLoc.source, error.instancePath),
                        reportOnKey: error.keyword === 'unevaluatedProperties' || error.keyword === 'additionalProperties',
                    },
                    from: location,
                    suggest: error.suggest,
                });
            }
        }
    }
    catch (e) {
        if (e.message === 'discriminator: requires oneOf or anyOf composite keyword') {
            return;
        }
        report({
            message: `Example validation errored: ${e.message}.`,
            location: location.child('schema'),
            from: location,
        });
    }
}
function getAdditionalPropertiesOption(opts) {
    if (opts.disallowAdditionalProperties === undefined) {
        return opts.allowAdditionalProperties;
    }
    if (opts.allowAdditionalProperties !== undefined) {
        (0, utils_1.showErrorForDeprecatedField)('disallowAdditionalProperties', 'allowAdditionalProperties', undefined);
    }
    (0, utils_1.showWarningForDeprecatedField)('disallowAdditionalProperties', 'allowAdditionalProperties');
    return !opts.disallowAdditionalProperties;
}
function validateSchemaEnumType(schemaEnum, propertyValue, propName, refLocation, { report, location }) {
    if (!schemaEnum) {
        return;
    }
    if (!schemaEnum.includes(propertyValue)) {
        report({
            location,
            message: `\`${propName}\` can be one of the following only: ${schemaEnum
                .map((type) => `"${type}"`)
                .join(', ')}.`,
            from: refLocation,
            suggest: getSuggest(propertyValue, schemaEnum),
        });
    }
}
function validateResponseCodes(responseCodes, codeRange, { report }) {
    const responseCodeRegexp = new RegExp(`^${codeRange[0]}[0-9Xx]{2}$`);
    const containsNeededCode = responseCodes.some((code) => (codeRange === '2XX' && code === 'default') || // It's OK to replace 2xx codes with the default
        responseCodeRegexp.test(code));
    if (!containsNeededCode) {
        report({
            message: `Operation must have at least one \`${codeRange}\` response.`,
            location: { reportOnKey: true },
        });
    }
}
