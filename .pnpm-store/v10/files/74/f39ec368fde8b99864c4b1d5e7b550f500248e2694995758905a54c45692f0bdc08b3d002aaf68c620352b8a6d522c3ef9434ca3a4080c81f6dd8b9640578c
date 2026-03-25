"use strict";
// For internal usage only
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeTypesFromJSONSchema = getNodeTypesFromJSONSchema;
const _2020_1 = require("@redocly/ajv/dist/2020");
const utils_1 = require("../utils");
const ajv = new _2020_1.default({
    strictSchema: false,
    allowUnionTypes: true,
    useDefaults: true,
    allErrors: true,
    discriminator: true,
    strictTypes: false,
    verbose: true,
});
function findOneOf(schemaOneOf, oneOfs) {
    if (oneOfs.some((option) => typeof option === 'function')) {
        throw new Error('Unexpected oneOf inside oneOf.');
    }
    return (value) => {
        let index = schemaOneOf.findIndex((option) => ajv.validate(option, value));
        if (index === -1) {
            index = 0;
        }
        return oneOfs[index];
    };
}
function transformJSONSchemaToNodeType(propertyName, schema, ctx) {
    if (!schema || typeof schema === 'boolean') {
        throw new Error(`Unexpected schema in ${propertyName}.`);
    }
    if (schema instanceof Array) {
        throw new Error(`Unexpected array schema in ${propertyName}. Try using oneOf instead.`);
    }
    if (schema.type === 'null') {
        throw new Error(`Unexpected null schema type in ${propertyName} schema.`);
    }
    if (schema.type instanceof Array) {
        throw new Error(`Unexpected array schema type in ${propertyName} schema. Try using oneOf instead.`);
    }
    if (schema.type === 'string' ||
        schema.type === 'number' ||
        schema.type === 'integer' ||
        schema.type === 'boolean') {
        const { default: _, format: _format, ...rest } = schema;
        return rest;
    }
    if (schema.type === 'object' && !schema.properties && !schema.oneOf) {
        if (schema.additionalProperties === undefined || schema.additionalProperties === true) {
            return { type: 'object' };
        }
        else if (schema.additionalProperties === false) {
            return { type: 'object', properties: {} };
        }
    }
    if (schema.allOf) {
        throw new Error(`Unexpected allOf in ${propertyName}.`);
    }
    if (schema.anyOf) {
        throw new Error(`Unexpected anyOf in ${propertyName}.`);
    }
    if ((0, utils_1.isPlainObject)(schema.properties) ||
        (0, utils_1.isPlainObject)(schema.additionalProperties) ||
        ((0, utils_1.isPlainObject)(schema.items) &&
            ((0, utils_1.isPlainObject)(schema.items.properties) ||
                (0, utils_1.isPlainObject)(schema.items.additionalProperties) ||
                schema.items.oneOf)) // exclude scalar array types
    ) {
        return extractNodeToContext(propertyName, schema, ctx);
    }
    if (schema.oneOf) {
        if (schema.discriminator) {
            const discriminatedPropertyName = schema.discriminator?.propertyName;
            if (!discriminatedPropertyName) {
                throw new Error(`Unexpected discriminator without a propertyName in ${propertyName}.`);
            }
            const oneOfs = schema.oneOf.map((option, i) => {
                if (typeof option === 'boolean') {
                    throw new Error(`Unexpected boolean schema in ${propertyName} at position ${i} in oneOf.`);
                }
                const discriminatedProperty = option?.properties?.[discriminatedPropertyName];
                if (!discriminatedProperty || typeof discriminatedProperty === 'boolean') {
                    throw new Error(`Unexpected property '${discriminatedProperty}' schema in ${propertyName} at position ${i} in oneOf.`);
                }
                const name = discriminatedProperty.const;
                return transformJSONSchemaToNodeType(name, option, ctx);
            });
            return (value, key) => {
                if ((0, utils_1.isPlainObject)(value)) {
                    const discriminatedTypeName = value[discriminatedPropertyName];
                    if (typeof discriminatedTypeName === 'string' && ctx[discriminatedTypeName]) {
                        return discriminatedTypeName;
                    }
                }
                return findOneOf(schema.oneOf, oneOfs)(value, key);
            };
        }
        else {
            const oneOfs = schema.oneOf.map((option, i) => transformJSONSchemaToNodeType(propertyName + '_' + i, option, ctx));
            return findOneOf(schema.oneOf, oneOfs);
        }
    }
    return schema;
}
function extractNodeToContext(propertyName, schema, ctx) {
    if (!schema || typeof schema === 'boolean') {
        throw new Error(`Unexpected schema in ${propertyName}.`);
    }
    if (schema instanceof Array) {
        throw new Error(`Unexpected array schema in ${propertyName}. Try using oneOf instead.`);
    }
    if (schema.type === 'null') {
        throw new Error(`Unexpected null schema type in ${propertyName} schema.`);
    }
    if (schema.type instanceof Array) {
        throw new Error(`Unexpected array schema type in ${propertyName} schema. Try using oneOf instead.`);
    }
    const properties = {};
    for (const [name, property] of Object.entries(schema.properties || {})) {
        properties[name] = transformJSONSchemaToNodeType(propertyName + '.' + name, property, ctx);
    }
    let additionalProperties;
    if ((0, utils_1.isPlainObject)(schema.additionalProperties)) {
        additionalProperties = transformJSONSchemaToNodeType(propertyName + '_additionalProperties', schema.additionalProperties, ctx);
    }
    if (schema.additionalProperties === true) {
        additionalProperties = {};
    }
    let items;
    if ((0, utils_1.isPlainObject)(schema.items) &&
        ((0, utils_1.isPlainObject)(schema.items.properties) ||
            (0, utils_1.isPlainObject)(schema.items.additionalProperties) ||
            schema.items.oneOf) // exclude scalar array types
    ) {
        items = transformJSONSchemaToNodeType(propertyName + '_items', schema.items, ctx);
    }
    let required = schema.required;
    // Translate required in oneOfs into a ResolveTypeFn.
    if (schema.oneOf && schema.oneOf.every((option) => !!option.required)) {
        required = (value) => {
            const requiredList = schema.oneOf.map((option) => [
                ...(schema.required || []),
                ...option.required,
            ]);
            let index = requiredList.findIndex((r) => r.every((requiredProp) => value[requiredProp] !== undefined));
            if (index === -1) {
                index = 0;
            }
            return requiredList[index];
        };
    }
    ctx[propertyName] = { properties, additionalProperties, items, required };
    return propertyName;
}
function getNodeTypesFromJSONSchema(schemaName, entrySchema) {
    const ctx = {};
    transformJSONSchemaToNodeType(schemaName, entrySchema, ctx);
    return ctx;
}
