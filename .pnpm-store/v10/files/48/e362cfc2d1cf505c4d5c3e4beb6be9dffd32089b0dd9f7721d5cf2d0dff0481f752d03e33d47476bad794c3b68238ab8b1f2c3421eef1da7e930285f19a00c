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
exports.ValueConvert = exports.ValueConvertDereferenceError = exports.ValueConvertUnknownTypeError = void 0;
const Types = require("../typebox");
const clone_1 = require("./clone");
const check_1 = require("./check");
// ----------------------------------------------------------------------------------------------
// Errors
// ----------------------------------------------------------------------------------------------
class ValueConvertUnknownTypeError extends Error {
    constructor(schema) {
        super('ValueConvert: Unknown type');
        this.schema = schema;
    }
}
exports.ValueConvertUnknownTypeError = ValueConvertUnknownTypeError;
class ValueConvertDereferenceError extends Error {
    constructor(schema) {
        super(`ValueConvert: Unable to dereference schema with $id '${schema.$ref}'`);
        this.schema = schema;
    }
}
exports.ValueConvertDereferenceError = ValueConvertDereferenceError;
var ValueConvert;
(function (ValueConvert) {
    // ----------------------------------------------------------------------------------------------
    // Guards
    // ----------------------------------------------------------------------------------------------
    function IsObject(value) {
        return typeof value === 'object' && value !== null && !globalThis.Array.isArray(value);
    }
    function IsArray(value) {
        return typeof value === 'object' && globalThis.Array.isArray(value);
    }
    function IsDate(value) {
        return typeof value === 'object' && value instanceof globalThis.Date;
    }
    function IsSymbol(value) {
        return typeof value === 'symbol';
    }
    function IsString(value) {
        return typeof value === 'string';
    }
    function IsBoolean(value) {
        return typeof value === 'boolean';
    }
    function IsBigInt(value) {
        return typeof value === 'bigint';
    }
    function IsNumber(value) {
        return typeof value === 'number' && !isNaN(value);
    }
    function IsStringNumeric(value) {
        return IsString(value) && !isNaN(value) && !isNaN(parseFloat(value));
    }
    function IsValueToString(value) {
        return IsBigInt(value) || IsBoolean(value) || IsNumber(value);
    }
    function IsValueTrue(value) {
        return value === true || (IsNumber(value) && value === 1) || (IsBigInt(value) && value === globalThis.BigInt('1')) || (IsString(value) && (value.toLowerCase() === 'true' || value === '1'));
    }
    function IsValueFalse(value) {
        return value === false || (IsNumber(value) && value === 0) || (IsBigInt(value) && value === globalThis.BigInt('0')) || (IsString(value) && (value.toLowerCase() === 'false' || value === '0'));
    }
    function IsTimeStringWithTimeZone(value) {
        return IsString(value) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value);
    }
    function IsTimeStringWithoutTimeZone(value) {
        return IsString(value) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value);
    }
    function IsDateTimeStringWithTimeZone(value) {
        return IsString(value) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value);
    }
    function IsDateTimeStringWithoutTimeZone(value) {
        return IsString(value) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value);
    }
    function IsDateString(value) {
        return IsString(value) && /^\d\d\d\d-[0-1]\d-[0-3]\d$/i.test(value);
    }
    // ----------------------------------------------------------------------------------------------
    // Convert
    // ----------------------------------------------------------------------------------------------
    function TryConvertLiteralString(value, target) {
        const conversion = TryConvertString(value);
        return conversion === target ? conversion : value;
    }
    function TryConvertLiteralNumber(value, target) {
        const conversion = TryConvertNumber(value);
        return conversion === target ? conversion : value;
    }
    function TryConvertLiteralBoolean(value, target) {
        const conversion = TryConvertBoolean(value);
        return conversion === target ? conversion : value;
    }
    function TryConvertLiteral(schema, value) {
        if (typeof schema.const === 'string') {
            return TryConvertLiteralString(value, schema.const);
        }
        else if (typeof schema.const === 'number') {
            return TryConvertLiteralNumber(value, schema.const);
        }
        else if (typeof schema.const === 'boolean') {
            return TryConvertLiteralBoolean(value, schema.const);
        }
        else {
            return clone_1.ValueClone.Clone(value);
        }
    }
    function TryConvertBoolean(value) {
        return IsValueTrue(value) ? true : IsValueFalse(value) ? false : value;
    }
    function TryConvertBigInt(value) {
        return IsStringNumeric(value) ? globalThis.BigInt(parseInt(value)) : IsNumber(value) ? globalThis.BigInt(value | 0) : IsValueFalse(value) ? 0 : IsValueTrue(value) ? 1 : value;
    }
    function TryConvertString(value) {
        return IsValueToString(value) ? value.toString() : value;
    }
    function TryConvertNumber(value) {
        return IsStringNumeric(value) ? parseFloat(value) : IsValueTrue(value) ? 1 : IsValueFalse(value) ? 0 : value;
    }
    function TryConvertInteger(value) {
        return IsStringNumeric(value) ? parseInt(value) : IsNumber(value) ? value | 0 : IsValueTrue(value) ? 1 : IsValueFalse(value) ? 0 : value;
    }
    function TryConvertNull(value) {
        return IsString(value) && value.toLowerCase() === 'null' ? null : value;
    }
    function TryConvertUndefined(value) {
        return IsString(value) && value === 'undefined' ? undefined : value;
    }
    function TryConvertDate(value) {
        // note: this function may return an invalid dates for the regex tests
        // above. Invalid dates will however be checked during the casting
        // function and will return a epoch date if invalid. Consider better
        // string parsing for the iso dates in future revisions.
        return IsDate(value)
            ? value
            : IsNumber(value)
                ? new globalThis.Date(value)
                : IsValueTrue(value)
                    ? new globalThis.Date(1)
                    : IsValueFalse(value)
                        ? new globalThis.Date(0)
                        : IsStringNumeric(value)
                            ? new globalThis.Date(parseInt(value))
                            : IsTimeStringWithoutTimeZone(value)
                                ? new globalThis.Date(`1970-01-01T${value}.000Z`)
                                : IsTimeStringWithTimeZone(value)
                                    ? new globalThis.Date(`1970-01-01T${value}`)
                                    : IsDateTimeStringWithoutTimeZone(value)
                                        ? new globalThis.Date(`${value}.000Z`)
                                        : IsDateTimeStringWithTimeZone(value)
                                            ? new globalThis.Date(value)
                                            : IsDateString(value)
                                                ? new globalThis.Date(`${value}T00:00:00.000Z`)
                                                : value;
    }
    // ----------------------------------------------------------------------------------------------
    // Cast
    // ----------------------------------------------------------------------------------------------
    function Any(schema, references, value) {
        return value;
    }
    function Array(schema, references, value) {
        if (IsArray(value)) {
            return value.map((value) => Visit(schema.items, references, value));
        }
        return value;
    }
    function BigInt(schema, references, value) {
        return TryConvertBigInt(value);
    }
    function Boolean(schema, references, value) {
        return TryConvertBoolean(value);
    }
    function Constructor(schema, references, value) {
        return clone_1.ValueClone.Clone(value);
    }
    function Date(schema, references, value) {
        return TryConvertDate(value);
    }
    function Function(schema, references, value) {
        return value;
    }
    function Integer(schema, references, value) {
        return TryConvertInteger(value);
    }
    function Intersect(schema, references, value) {
        return value;
    }
    function Literal(schema, references, value) {
        return TryConvertLiteral(schema, value);
    }
    function Never(schema, references, value) {
        return value;
    }
    function Null(schema, references, value) {
        return TryConvertNull(value);
    }
    function Number(schema, references, value) {
        return TryConvertNumber(value);
    }
    function Object(schema, references, value) {
        if (IsObject(value))
            return globalThis.Object.keys(schema.properties).reduce((acc, key) => {
                return value[key] !== undefined ? { ...acc, [key]: Visit(schema.properties[key], references, value[key]) } : { ...acc };
            }, value);
        return value;
    }
    function Promise(schema, references, value) {
        return value;
    }
    function Record(schema, references, value) {
        const propertyKey = globalThis.Object.getOwnPropertyNames(schema.patternProperties)[0];
        const property = schema.patternProperties[propertyKey];
        const result = {};
        for (const [propKey, propValue] of globalThis.Object.entries(value)) {
            result[propKey] = Visit(property, references, propValue);
        }
        return result;
    }
    function Ref(schema, references, value) {
        const index = references.findIndex((foreign) => foreign.$id === schema.$ref);
        if (index === -1)
            throw new ValueConvertDereferenceError(schema);
        const target = references[index];
        return Visit(target, references, value);
    }
    function String(schema, references, value) {
        return TryConvertString(value);
    }
    function Symbol(schema, references, value) {
        return value;
    }
    function TemplateLiteral(schema, references, value) {
        return value;
    }
    function This(schema, references, value) {
        const index = references.findIndex((foreign) => foreign.$id === schema.$ref);
        if (index === -1)
            throw new ValueConvertDereferenceError(schema);
        const target = references[index];
        return Visit(target, references, value);
    }
    function Tuple(schema, references, value) {
        if (IsArray(value) && schema.items !== undefined) {
            return value.map((value, index) => {
                return index < schema.items.length ? Visit(schema.items[index], references, value) : value;
            });
        }
        return value;
    }
    function Undefined(schema, references, value) {
        return TryConvertUndefined(value);
    }
    function Union(schema, references, value) {
        for (const subschema of schema.anyOf) {
            const converted = Visit(subschema, references, value);
            if (check_1.ValueCheck.Check(subschema, references, converted)) {
                return converted;
            }
        }
        return value;
    }
    function Uint8Array(schema, references, value) {
        return value;
    }
    function Unknown(schema, references, value) {
        return value;
    }
    function Void(schema, references, value) {
        return value;
    }
    function UserDefined(schema, references, value) {
        return value;
    }
    function Visit(schema, references, value) {
        const references_ = IsString(schema.$id) ? [...references, schema] : references;
        const schema_ = schema;
        switch (schema[Types.Kind]) {
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
                    throw new ValueConvertUnknownTypeError(schema_);
                return UserDefined(schema_, references_, value);
        }
    }
    ValueConvert.Visit = Visit;
    function Convert(schema, references, value) {
        return Visit(schema, references, clone_1.ValueClone.Clone(value));
    }
    ValueConvert.Convert = Convert;
})(ValueConvert = exports.ValueConvert || (exports.ValueConvert = {}));
