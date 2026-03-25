"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/value

The MIT License (MIT)

Copyright (c) 2017-2023 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueCheck = exports.ValueCheckUnknownTypeError = void 0;
const Types = require("../typebox");
const index_1 = require("../system/index");
const index_2 = require("../format/index");
const index_3 = require("../custom/index");
const index_4 = require("../hash/index");
class ValueCheckUnknownTypeError extends Error {
    constructor(schema) {
        super(`ValueCheck: ${schema[Types.Kind] ? `Unknown type '${schema[Types.Kind]}'` : 'Unknown type'}`);
        this.schema = schema;
    }
}
exports.ValueCheckUnknownTypeError = ValueCheckUnknownTypeError;
var ValueCheck;
(function (ValueCheck) {
    function IsNumber(value) {
        return typeof value === 'number' && !isNaN(value);
    }
    function Any(schema, references, value) {
        return true;
    }
    function Array(schema, references, value) {
        if (!globalThis.Array.isArray(value)) {
            return false;
        }
        if (IsNumber(schema.minItems) && !(value.length >= schema.minItems)) {
            return false;
        }
        if (IsNumber(schema.maxItems) && !(value.length <= schema.maxItems)) {
            return false;
        }
        // prettier-ignore
        if (schema.uniqueItems === true && !((function () { const set = new Set(); for (const element of value) {
            const hashed = index_4.ValueHash.Create(element);
            if (set.has(hashed)) {
                return false;
            }
            else {
                set.add(hashed);
            }
        } return true; })())) {
            return false;
        }
        return value.every((val) => Visit(schema.items, references, val));
    }
    function Boolean(schema, references, value) {
        return typeof value === 'boolean';
    }
    function Constructor(schema, references, value) {
        return Visit(schema.returns, references, value.prototype);
    }
    function Date(schema, references, value) {
        if (!(value instanceof globalThis.Date)) {
            return false;
        }
        if (isNaN(value.getTime())) {
            return false;
        }
        if (IsNumber(schema.exclusiveMinimumTimestamp) && !(value.getTime() > schema.exclusiveMinimumTimestamp)) {
            return false;
        }
        if (IsNumber(schema.exclusiveMaximumTimestamp) && !(value.getTime() < schema.exclusiveMaximumTimestamp)) {
            return false;
        }
        if (IsNumber(schema.minimumTimestamp) && !(value.getTime() >= schema.minimumTimestamp)) {
            return false;
        }
        if (IsNumber(schema.maximumTimestamp) && !(value.getTime() <= schema.maximumTimestamp)) {
            return false;
        }
        return true;
    }
    function Function(schema, references, value) {
        return typeof value === 'function';
    }
    function Integer(schema, references, value) {
        if (!(typeof value === 'number' && globalThis.Number.isInteger(value))) {
            return false;
        }
        if (IsNumber(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
            return false;
        }
        if (IsNumber(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
            return false;
        }
        if (IsNumber(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
            return false;
        }
        if (IsNumber(schema.minimum) && !(value >= schema.minimum)) {
            return false;
        }
        if (IsNumber(schema.maximum) && !(value <= schema.maximum)) {
            return false;
        }
        return true;
    }
    function Literal(schema, references, value) {
        return value === schema.const;
    }
    function Never(schema, references, value) {
        return false;
    }
    function Null(schema, references, value) {
        return value === null;
    }
    function Number(schema, references, value) {
        if (index_1.TypeSystem.AllowNaN) {
            if (!(typeof value === 'number')) {
                return false;
            }
        }
        else {
            if (!(typeof value === 'number' && !isNaN(value))) {
                return false;
            }
        }
        if (IsNumber(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
            return false;
        }
        if (IsNumber(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
            return false;
        }
        if (IsNumber(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
            return false;
        }
        if (IsNumber(schema.minimum) && !(value >= schema.minimum)) {
            return false;
        }
        if (IsNumber(schema.maximum) && !(value <= schema.maximum)) {
            return false;
        }
        return true;
    }
    function Object(schema, references, value) {
        if (index_1.TypeSystem.AllowArrayObjects) {
            if (!(typeof value === 'object' && value !== null)) {
                return false;
            }
        }
        else {
            if (!(typeof value === 'object' && value !== null && !globalThis.Array.isArray(value))) {
                return false;
            }
        }
        if (IsNumber(schema.minProperties) && !(globalThis.Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
            return false;
        }
        if (IsNumber(schema.maxProperties) && !(globalThis.Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
            return false;
        }
        const propertyKeys = globalThis.Object.getOwnPropertyNames(schema.properties);
        if (schema.additionalProperties === false) {
            // optimization: If the property key length matches the required keys length
            // then we only need check that the values property key length matches that
            // of the property key length. This is because exhaustive testing for values
            // will occur in subsequent property tests.
            if (schema.required && schema.required.length === propertyKeys.length && !(globalThis.Object.getOwnPropertyNames(value).length === propertyKeys.length)) {
                return false;
            }
            else {
                if (!globalThis.Object.getOwnPropertyNames(value).every((key) => propertyKeys.includes(key))) {
                    return false;
                }
            }
        }
        if (typeof schema.additionalProperties === 'object') {
            for (const objectKey of globalThis.Object.getOwnPropertyNames(value)) {
                if (propertyKeys.includes(objectKey))
                    continue;
                if (!Visit(schema.additionalProperties, references, value[objectKey])) {
                    return false;
                }
            }
        }
        for (const propertyKey of propertyKeys) {
            const propertySchema = schema.properties[propertyKey];
            if (schema.required && schema.required.includes(propertyKey)) {
                if (!Visit(propertySchema, references, value[propertyKey])) {
                    return false;
                }
            }
            else {
                if (value[propertyKey] !== undefined) {
                    if (!Visit(propertySchema, references, value[propertyKey])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    function Promise(schema, references, value) {
        return typeof value === 'object' && typeof value.then === 'function';
    }
    function Record(schema, references, value) {
        if (index_1.TypeSystem.AllowArrayObjects) {
            if (!(typeof value === 'object' && value !== null && !(value instanceof globalThis.Date))) {
                return false;
            }
        }
        else {
            if (!(typeof value === 'object' && value !== null && !(value instanceof globalThis.Date) && !globalThis.Array.isArray(value))) {
                return false;
            }
        }
        const [keyPattern, valueSchema] = globalThis.Object.entries(schema.patternProperties)[0];
        const regex = new RegExp(keyPattern);
        if (!globalThis.Object.getOwnPropertyNames(value).every((key) => regex.test(key))) {
            return false;
        }
        for (const propValue of globalThis.Object.values(value)) {
            if (!Visit(valueSchema, references, propValue))
                return false;
        }
        return true;
    }
    function Ref(schema, references, value) {
        const reference = references.find((reference) => reference.$id === schema.$ref);
        if (reference === undefined)
            throw new Error(`ValueCheck.Ref: Cannot find schema with $id '${schema.$ref}'.`);
        return Visit(reference, references, value);
    }
    function Self(schema, references, value) {
        const reference = references.find((reference) => reference.$id === schema.$ref);
        if (reference === undefined)
            throw new Error(`ValueCheck.Self: Cannot find schema with $id '${schema.$ref}'.`);
        return Visit(reference, references, value);
    }
    function String(schema, references, value) {
        if (!(typeof value === 'string')) {
            return false;
        }
        if (IsNumber(schema.minLength)) {
            if (!(value.length >= schema.minLength))
                return false;
        }
        if (IsNumber(schema.maxLength)) {
            if (!(value.length <= schema.maxLength))
                return false;
        }
        if (schema.pattern !== undefined) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value))
                return false;
        }
        if (schema.format !== undefined) {
            if (!index_2.Format.Has(schema.format))
                return false;
            const func = index_2.Format.Get(schema.format);
            return func(value);
        }
        return true;
    }
    function Tuple(schema, references, value) {
        if (!globalThis.Array.isArray(value)) {
            return false;
        }
        if (schema.items === undefined && !(value.length === 0)) {
            return false;
        }
        if (!(value.length === schema.maxItems)) {
            return false;
        }
        if (!schema.items) {
            return true;
        }
        for (let i = 0; i < schema.items.length; i++) {
            if (!Visit(schema.items[i], references, value[i]))
                return false;
        }
        return true;
    }
    function Undefined(schema, references, value) {
        return value === undefined;
    }
    function Union(schema, references, value) {
        return schema.anyOf.some((inner) => Visit(inner, references, value));
    }
    function Uint8Array(schema, references, value) {
        if (!(value instanceof globalThis.Uint8Array)) {
            return false;
        }
        if (IsNumber(schema.maxByteLength) && !(value.length <= schema.maxByteLength)) {
            return false;
        }
        if (IsNumber(schema.minByteLength) && !(value.length >= schema.minByteLength)) {
            return false;
        }
        return true;
    }
    function Unknown(schema, references, value) {
        return true;
    }
    function Void(schema, references, value) {
        return value === null;
    }
    function UserDefined(schema, references, value) {
        if (!index_3.Custom.Has(schema[Types.Kind]))
            return false;
        const func = index_3.Custom.Get(schema[Types.Kind]);
        return func(schema, value);
    }
    function Visit(schema, references, value) {
        const anyReferences = schema.$id === undefined ? references : [schema, ...references];
        const anySchema = schema;
        switch (anySchema[Types.Kind]) {
            case 'Any':
                return Any(anySchema, anyReferences, value);
            case 'Array':
                return Array(anySchema, anyReferences, value);
            case 'Boolean':
                return Boolean(anySchema, anyReferences, value);
            case 'Constructor':
                return Constructor(anySchema, anyReferences, value);
            case 'Date':
                return Date(anySchema, anyReferences, value);
            case 'Function':
                return Function(anySchema, anyReferences, value);
            case 'Integer':
                return Integer(anySchema, anyReferences, value);
            case 'Literal':
                return Literal(anySchema, anyReferences, value);
            case 'Never':
                return Never(anySchema, anyReferences, value);
            case 'Null':
                return Null(anySchema, anyReferences, value);
            case 'Number':
                return Number(anySchema, anyReferences, value);
            case 'Object':
                return Object(anySchema, anyReferences, value);
            case 'Promise':
                return Promise(anySchema, anyReferences, value);
            case 'Record':
                return Record(anySchema, anyReferences, value);
            case 'Ref':
                return Ref(anySchema, anyReferences, value);
            case 'Self':
                return Self(anySchema, anyReferences, value);
            case 'String':
                return String(anySchema, anyReferences, value);
            case 'Tuple':
                return Tuple(anySchema, anyReferences, value);
            case 'Undefined':
                return Undefined(anySchema, anyReferences, value);
            case 'Union':
                return Union(anySchema, anyReferences, value);
            case 'Uint8Array':
                return Uint8Array(anySchema, anyReferences, value);
            case 'Unknown':
                return Unknown(anySchema, anyReferences, value);
            case 'Void':
                return Void(anySchema, anyReferences, value);
            default:
                if (!index_3.Custom.Has(anySchema[Types.Kind]))
                    throw new ValueCheckUnknownTypeError(anySchema);
                return UserDefined(anySchema, anyReferences, value);
        }
    }
    // -------------------------------------------------------------------------
    // Check
    // -------------------------------------------------------------------------
    function Check(schema, references, value) {
        return schema.$id === undefined ? Visit(schema, references, value) : Visit(schema, [schema, ...references], value);
    }
    ValueCheck.Check = Check;
})(ValueCheck = exports.ValueCheck || (exports.ValueCheck = {}));
