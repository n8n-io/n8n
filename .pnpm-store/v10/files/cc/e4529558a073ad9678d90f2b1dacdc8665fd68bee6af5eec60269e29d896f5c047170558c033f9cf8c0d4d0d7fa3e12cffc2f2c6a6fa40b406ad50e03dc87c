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
exports.ValueCheck = exports.ValueCheckDereferenceError = exports.ValueCheckUnknownTypeError = void 0;
const Types = require("../typebox");
const index_1 = require("../system/index");
const hash_1 = require("./hash");
// -------------------------------------------------------------------------
// Errors
// -------------------------------------------------------------------------
class ValueCheckUnknownTypeError extends Error {
    constructor(schema) {
        super(`ValueCheck: ${schema[Types.Kind] ? `Unknown type '${schema[Types.Kind]}'` : 'Unknown type'}`);
        this.schema = schema;
    }
}
exports.ValueCheckUnknownTypeError = ValueCheckUnknownTypeError;
class ValueCheckDereferenceError extends Error {
    constructor(schema) {
        super(`ValueCheck: Unable to dereference schema with $id '${schema.$ref}'`);
        this.schema = schema;
    }
}
exports.ValueCheckDereferenceError = ValueCheckDereferenceError;
var ValueCheck;
(function (ValueCheck) {
    // ----------------------------------------------------------------------
    // Guards
    // ----------------------------------------------------------------------
    function IsBigInt(value) {
        return typeof value === 'bigint';
    }
    function IsInteger(value) {
        return globalThis.Number.isInteger(value);
    }
    function IsString(value) {
        return typeof value === 'string';
    }
    function IsDefined(value) {
        return value !== undefined;
    }
    // ----------------------------------------------------------------------
    // Policies
    // ----------------------------------------------------------------------
    function IsExactOptionalProperty(value, key) {
        return index_1.TypeSystem.ExactOptionalPropertyTypes ? key in value : value[key] !== undefined;
    }
    function IsObject(value) {
        const result = typeof value === 'object' && value !== null;
        return index_1.TypeSystem.AllowArrayObjects ? result : result && !globalThis.Array.isArray(value);
    }
    function IsRecordObject(value) {
        return IsObject(value) && !(value instanceof globalThis.Date) && !(value instanceof globalThis.Uint8Array);
    }
    function IsNumber(value) {
        const result = typeof value === 'number';
        return index_1.TypeSystem.AllowNaN ? result : result && globalThis.Number.isFinite(value);
    }
    function IsVoid(value) {
        const result = value === undefined;
        return index_1.TypeSystem.AllowVoidNull ? result || value === null : result;
    }
    // ----------------------------------------------------------------------
    // Types
    // ----------------------------------------------------------------------
    function Any(schema, references, value) {
        return true;
    }
    function Array(schema, references, value) {
        if (!globalThis.Array.isArray(value)) {
            return false;
        }
        if (IsDefined(schema.minItems) && !(value.length >= schema.minItems)) {
            return false;
        }
        if (IsDefined(schema.maxItems) && !(value.length <= schema.maxItems)) {
            return false;
        }
        // prettier-ignore
        if (schema.uniqueItems === true && !((function () { const set = new Set(); for (const element of value) {
            const hashed = hash_1.ValueHash.Create(element);
            if (set.has(hashed)) {
                return false;
            }
            else {
                set.add(hashed);
            }
        } return true; })())) {
            return false;
        }
        return value.every((value) => Visit(schema.items, references, value));
    }
    function BigInt(schema, references, value) {
        if (!IsBigInt(value)) {
            return false;
        }
        if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === globalThis.BigInt(0))) {
            return false;
        }
        if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
            return false;
        }
        if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
            return false;
        }
        if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
            return false;
        }
        if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
            return false;
        }
        return true;
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
        if (!IsNumber(value.getTime())) {
            return false;
        }
        if (IsDefined(schema.exclusiveMinimumTimestamp) && !(value.getTime() > schema.exclusiveMinimumTimestamp)) {
            return false;
        }
        if (IsDefined(schema.exclusiveMaximumTimestamp) && !(value.getTime() < schema.exclusiveMaximumTimestamp)) {
            return false;
        }
        if (IsDefined(schema.minimumTimestamp) && !(value.getTime() >= schema.minimumTimestamp)) {
            return false;
        }
        if (IsDefined(schema.maximumTimestamp) && !(value.getTime() <= schema.maximumTimestamp)) {
            return false;
        }
        return true;
    }
    function Function(schema, references, value) {
        return typeof value === 'function';
    }
    function Integer(schema, references, value) {
        if (!IsInteger(value)) {
            return false;
        }
        if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
            return false;
        }
        if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
            return false;
        }
        if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
            return false;
        }
        if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
            return false;
        }
        if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
            return false;
        }
        return true;
    }
    function Intersect(schema, references, value) {
        if (!schema.allOf.every((schema) => Visit(schema, references, value))) {
            return false;
        }
        else if (schema.unevaluatedProperties === false) {
            const schemaKeys = Types.KeyResolver.Resolve(schema);
            const valueKeys = globalThis.Object.getOwnPropertyNames(value);
            return valueKeys.every((key) => schemaKeys.includes(key));
        }
        else if (Types.TypeGuard.TSchema(schema.unevaluatedProperties)) {
            const schemaKeys = Types.KeyResolver.Resolve(schema);
            const valueKeys = globalThis.Object.getOwnPropertyNames(value);
            return valueKeys.every((key) => schemaKeys.includes(key) || Visit(schema.unevaluatedProperties, references, value[key]));
        }
        else {
            return true;
        }
    }
    function Literal(schema, references, value) {
        return value === schema.const;
    }
    function Never(schema, references, value) {
        return false;
    }
    function Not(schema, references, value) {
        return !Visit(schema.allOf[0].not, references, value) && Visit(schema.allOf[1], references, value);
    }
    function Null(schema, references, value) {
        return value === null;
    }
    function Number(schema, references, value) {
        if (!IsNumber(value)) {
            return false;
        }
        if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
            return false;
        }
        if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
            return false;
        }
        if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
            return false;
        }
        if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
            return false;
        }
        if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
            return false;
        }
        return true;
    }
    function Object(schema, references, value) {
        if (!IsObject(value)) {
            return false;
        }
        if (IsDefined(schema.minProperties) && !(globalThis.Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
            return false;
        }
        if (IsDefined(schema.maxProperties) && !(globalThis.Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
            return false;
        }
        const knownKeys = globalThis.Object.getOwnPropertyNames(schema.properties);
        for (const knownKey of knownKeys) {
            const property = schema.properties[knownKey];
            if (schema.required && schema.required.includes(knownKey)) {
                if (!Visit(property, references, value[knownKey])) {
                    return false;
                }
                if (Types.ExtendsUndefined.Check(property)) {
                    return knownKey in value;
                }
            }
            else {
                if (IsExactOptionalProperty(value, knownKey) && !Visit(property, references, value[knownKey])) {
                    return false;
                }
            }
        }
        if (schema.additionalProperties === false) {
            const valueKeys = globalThis.Object.getOwnPropertyNames(value);
            // optimization: value is valid if schemaKey length matches the valueKey length
            if (schema.required && schema.required.length === knownKeys.length && valueKeys.length === knownKeys.length) {
                return true;
            }
            else {
                return valueKeys.every((valueKey) => knownKeys.includes(valueKey));
            }
        }
        else if (typeof schema.additionalProperties === 'object') {
            const valueKeys = globalThis.Object.getOwnPropertyNames(value);
            return valueKeys.every((key) => knownKeys.includes(key) || Visit(schema.additionalProperties, references, value[key]));
        }
        else {
            return true;
        }
    }
    function Promise(schema, references, value) {
        return typeof value === 'object' && typeof value.then === 'function';
    }
    function Record(schema, references, value) {
        if (!IsRecordObject(value)) {
            return false;
        }
        if (IsDefined(schema.minProperties) && !(globalThis.Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
            return false;
        }
        if (IsDefined(schema.maxProperties) && !(globalThis.Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
            return false;
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
        const index = references.findIndex((foreign) => foreign.$id === schema.$ref);
        if (index === -1)
            throw new ValueCheckDereferenceError(schema);
        const target = references[index];
        return Visit(target, references, value);
    }
    function String(schema, references, value) {
        if (!IsString(value)) {
            return false;
        }
        if (IsDefined(schema.minLength)) {
            if (!(value.length >= schema.minLength))
                return false;
        }
        if (IsDefined(schema.maxLength)) {
            if (!(value.length <= schema.maxLength))
                return false;
        }
        if (IsDefined(schema.pattern)) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value))
                return false;
        }
        if (IsDefined(schema.format)) {
            if (!Types.FormatRegistry.Has(schema.format))
                return false;
            const func = Types.FormatRegistry.Get(schema.format);
            return func(value);
        }
        return true;
    }
    function Symbol(schema, references, value) {
        if (!(typeof value === 'symbol')) {
            return false;
        }
        return true;
    }
    function TemplateLiteral(schema, references, value) {
        if (!IsString(value)) {
            return false;
        }
        return new RegExp(schema.pattern).test(value);
    }
    function This(schema, references, value) {
        const index = references.findIndex((foreign) => foreign.$id === schema.$ref);
        if (index === -1)
            throw new ValueCheckDereferenceError(schema);
        const target = references[index];
        return Visit(target, references, value);
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
        if (IsDefined(schema.maxByteLength) && !(value.length <= schema.maxByteLength)) {
            return false;
        }
        if (IsDefined(schema.minByteLength) && !(value.length >= schema.minByteLength)) {
            return false;
        }
        return true;
    }
    function Unknown(schema, references, value) {
        return true;
    }
    function Void(schema, references, value) {
        return IsVoid(value);
    }
    function UserDefined(schema, references, value) {
        if (!Types.TypeRegistry.Has(schema[Types.Kind]))
            return false;
        const func = Types.TypeRegistry.Get(schema[Types.Kind]);
        return func(schema, value);
    }
    function Visit(schema, references, value) {
        const references_ = IsDefined(schema.$id) ? [...references, schema] : references;
        const schema_ = schema;
        switch (schema_[Types.Kind]) {
            case 'Any':
                return Any(schema_, references_, value);
            case 'Array':
                return Array(schema_, references_, value);
            case 'BigInt':
                return BigInt(schema_, references_, value);
            case 'Boolean':
                return Boolean(schema_, references_, value);
            case 'Constructor':
                return Constructor(schema_, references_, value);
            case 'Date':
                return Date(schema_, references_, value);
            case 'Function':
                return Function(schema_, references_, value);
            case 'Integer':
                return Integer(schema_, references_, value);
            case 'Intersect':
                return Intersect(schema_, references_, value);
            case 'Literal':
                return Literal(schema_, references_, value);
            case 'Never':
                return Never(schema_, references_, value);
            case 'Not':
                return Not(schema_, references_, value);
            case 'Null':
                return Null(schema_, references_, value);
            case 'Number':
                return Number(schema_, references_, value);
            case 'Object':
                return Object(schema_, references_, value);
            case 'Promise':
                return Promise(schema_, references_, value);
            case 'Record':
                return Record(schema_, references_, value);
            case 'Ref':
                return Ref(schema_, references_, value);
            case 'String':
                return String(schema_, references_, value);
            case 'Symbol':
                return Symbol(schema_, references_, value);
            case 'TemplateLiteral':
                return TemplateLiteral(schema_, references_, value);
            case 'This':
                return This(schema_, references_, value);
            case 'Tuple':
                return Tuple(schema_, references_, value);
            case 'Undefined':
                return Undefined(schema_, references_, value);
            case 'Union':
                return Union(schema_, references_, value);
            case 'Uint8Array':
                return Uint8Array(schema_, references_, value);
            case 'Unknown':
                return Unknown(schema_, references_, value);
            case 'Void':
                return Void(schema_, references_, value);
            default:
                if (!Types.TypeRegistry.Has(schema_[Types.Kind]))
                    throw new ValueCheckUnknownTypeError(schema_);
                return UserDefined(schema_, references_, value);
        }
    }
    // -------------------------------------------------------------------------
    // Check
    // -------------------------------------------------------------------------
    function Check(schema, references, value) {
        return Visit(schema, references, value);
    }
    ValueCheck.Check = Check;
})(ValueCheck = exports.ValueCheck || (exports.ValueCheck = {}));
