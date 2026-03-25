"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialBaseURI = exports.ignoredKeyword = exports.schemaMapKeyword = exports.schemaArrayKeyword = exports.schemaKeyword = void 0;
exports.dereference = dereference;
const pointer_js_1 = require("./pointer.js");
exports.schemaKeyword = {
    additionalItems: true,
    unevaluatedItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    unevaluatedProperties: true,
    propertyNames: true,
    not: true,
    if: true,
    then: true,
    else: true
};
exports.schemaArrayKeyword = {
    prefixItems: true,
    items: true,
    allOf: true,
    anyOf: true,
    oneOf: true
};
exports.schemaMapKeyword = {
    $defs: true,
    definitions: true,
    properties: true,
    patternProperties: true,
    dependentSchemas: true
};
exports.ignoredKeyword = {
    id: true,
    $id: true,
    $ref: true,
    $schema: true,
    $anchor: true,
    $vocabulary: true,
    $comment: true,
    default: true,
    enum: true,
    const: true,
    required: true,
    type: true,
    maximum: true,
    minimum: true,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    multipleOf: true,
    maxLength: true,
    minLength: true,
    pattern: true,
    format: true,
    maxItems: true,
    minItems: true,
    uniqueItems: true,
    maxProperties: true,
    minProperties: true
};
exports.initialBaseURI = typeof self !== 'undefined' &&
    self.location &&
    self.location.origin !== 'null'
    ?
        new URL(self.location.origin + self.location.pathname + location.search)
    : new URL('https://github.com/cfworker');
function dereference(schema, lookup = Object.create(null), baseURI = exports.initialBaseURI, basePointer = '') {
    if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
        const id = schema.$id || schema.id;
        if (id) {
            const url = new URL(id, baseURI.href);
            if (url.hash.length > 1) {
                lookup[url.href] = schema;
            }
            else {
                url.hash = '';
                if (basePointer === '') {
                    baseURI = url;
                }
                else {
                    dereference(schema, lookup, baseURI);
                }
            }
        }
    }
    else if (schema !== true && schema !== false) {
        return lookup;
    }
    const schemaURI = baseURI.href + (basePointer ? '#' + basePointer : '');
    if (lookup[schemaURI] !== undefined) {
        throw new Error(`Duplicate schema URI "${schemaURI}".`);
    }
    lookup[schemaURI] = schema;
    if (schema === true || schema === false) {
        return lookup;
    }
    if (schema.__absolute_uri__ === undefined) {
        Object.defineProperty(schema, '__absolute_uri__', {
            enumerable: false,
            value: schemaURI
        });
    }
    if (schema.$ref && schema.__absolute_ref__ === undefined) {
        const url = new URL(schema.$ref, baseURI.href);
        url.hash = url.hash;
        Object.defineProperty(schema, '__absolute_ref__', {
            enumerable: false,
            value: url.href
        });
    }
    if (schema.$recursiveRef && schema.__absolute_recursive_ref__ === undefined) {
        const url = new URL(schema.$recursiveRef, baseURI.href);
        url.hash = url.hash;
        Object.defineProperty(schema, '__absolute_recursive_ref__', {
            enumerable: false,
            value: url.href
        });
    }
    if (schema.$anchor) {
        const url = new URL('#' + schema.$anchor, baseURI.href);
        lookup[url.href] = schema;
    }
    for (let key in schema) {
        if (exports.ignoredKeyword[key]) {
            continue;
        }
        const keyBase = `${basePointer}/${(0, pointer_js_1.encodePointer)(key)}`;
        const subSchema = schema[key];
        if (Array.isArray(subSchema)) {
            if (exports.schemaArrayKeyword[key]) {
                const length = subSchema.length;
                for (let i = 0; i < length; i++) {
                    dereference(subSchema[i], lookup, baseURI, `${keyBase}/${i}`);
                }
            }
        }
        else if (exports.schemaMapKeyword[key]) {
            for (let subKey in subSchema) {
                dereference(subSchema[subKey], lookup, baseURI, `${keyBase}/${(0, pointer_js_1.encodePointer)(subKey)}`);
            }
        }
        else {
            dereference(subSchema, lookup, baseURI, keyBase);
        }
    }
    return lookup;
}
