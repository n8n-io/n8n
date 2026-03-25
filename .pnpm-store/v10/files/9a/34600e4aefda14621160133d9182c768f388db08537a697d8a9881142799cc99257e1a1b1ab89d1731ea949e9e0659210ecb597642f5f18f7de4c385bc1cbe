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
exports.ValueCast = exports.ValueCastUnknownTypeError = exports.ValueCastRecursiveTypeError = exports.ValueCastNeverTypeError = exports.ValueCastArrayUniqueItemsTypeError = exports.ValueCastReferenceTypeError = void 0;
const Types = require("../typebox");
const create_1 = require("./create");
const check_1 = require("./check");
const clone_1 = require("./clone");
const index_1 = require("../custom/index");
// ----------------------------------------------------------------------------------------------
// Errors
// ----------------------------------------------------------------------------------------------
class ValueCastReferenceTypeError extends Error {
    constructor(schema) {
        super(`ValueCast: Cannot locate referenced schema with $id '${schema.$ref}'`);
        this.schema = schema;
    }
}
exports.ValueCastReferenceTypeError = ValueCastReferenceTypeError;
class ValueCastArrayUniqueItemsTypeError extends Error {
    constructor(schema, value) {
        super('ValueCast: Array cast produced invalid data due to uniqueItems constraint');
        this.schema = schema;
        this.value = value;
    }
}
exports.ValueCastArrayUniqueItemsTypeError = ValueCastArrayUniqueItemsTypeError;
class ValueCastNeverTypeError extends Error {
    constructor(schema) {
        super('ValueCast: Never types cannot be cast');
        this.schema = schema;
    }
}
exports.ValueCastNeverTypeError = ValueCastNeverTypeError;
class ValueCastRecursiveTypeError extends Error {
    constructor(schema) {
        super('ValueCast.Recursive: Cannot cast recursive schemas');
        this.schema = schema;
    }
}
exports.ValueCastRecursiveTypeError = ValueCastRecursiveTypeError;
class ValueCastUnknownTypeError extends Error {
    constructor(schema) {
        super('ValueCast: Unknown type');
        this.schema = schema;
    }
}
exports.ValueCastUnknownTypeError = ValueCastUnknownTypeError;
// ----------------------------------------------------------------------------------------------
// The following will score a schema against a value. For objects, the score is the tally of
// points awarded for each property of the value. Property points are (1.0 / propertyCount)
// to prevent large property counts biasing results. Properties that match literal values are
// maximally awarded as literals are typically used as union discriminator fields.
// ----------------------------------------------------------------------------------------------
var UnionCastCreate;
(function (UnionCastCreate) {
    function Score(schema, references, value) {
        if (schema[Types.Kind] === 'Object' && typeof value === 'object' && value !== null) {
            const object = schema;
            const keys = Object.keys(value);
            const entries = globalThis.Object.entries(object.properties);
            const [point, max] = [1 / entries.length, entries.length];
            return entries.reduce((acc, [key, schema]) => {
                const literal = schema[Types.Kind] === 'Literal' && schema.const === value[key] ? max : 0;
                const checks = check_1.ValueCheck.Check(schema, references, value[key]) ? point : 0;
                const exists = keys.includes(key) ? point : 0;
                return acc + (literal + checks + exists);
            }, 0);
        }
        else {
            return check_1.ValueCheck.Check(schema, references, value) ? 1 : 0;
        }
    }
    function Select(union, references, value) {
        let [select, best] = [union.anyOf[0], 0];
        for (const schema of union.anyOf) {
            const score = Score(schema, references, value);
            if (score > best) {
                select = schema;
                best = score;
            }
        }
        return select;
    }
    function Create(union, references, value) {
        if (union.default !== undefined) {
            return union.default;
        }
        else {
            const schema = Select(union, references, value);
            return ValueCast.Cast(schema, references, value);
        }
    }
    UnionCastCreate.Create = Create;
})(UnionCastCreate || (UnionCastCreate = {}));
var ValueCast;
(function (ValueCast) {
    // ----------------------------------------------------------------------------------------------
    // Guards
    // ----------------------------------------------------------------------------------------------
    function IsArray(value) {
        return typeof value === 'object' && globalThis.Array.isArray(value);
    }
    function IsDate(value) {
        return typeof value === 'object' && value instanceof globalThis.Date;
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
    function TryConvertString(value) {
        return IsValueToString(value) ? value.toString() : value;
    }
    function TryConvertNumber(value) {
        return IsStringNumeric(value) ? parseFloat(value) : IsValueTrue(value) ? 1 : value;
    }
    function TryConvertInteger(value) {
        return IsStringNumeric(value) ? parseInt(value) : IsValueTrue(value) ? 1 : value;
    }
    function TryConvertBoolean(value) {
        return IsValueTrue(value) ? true : IsValueFalse(value) ? false : value;
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
        return check_1.ValueCheck.Check(schema, references, value) ? clone_1.ValueClone.Clone(value) : create_1.ValueCreate.Create(schema, references);
    }
    function Array(schema, references, value) {
        if (check_1.ValueCheck.Check(schema, references, value))
            return clone_1.ValueClone.Clone(value);
        const created = IsArray(value) ? clone_1.ValueClone.Clone(value) : create_1.ValueCreate.Create(schema, references);
        const minimum = IsNumber(schema.minItems) && created.length < schema.minItems ? [...created, ...globalThis.Array.from({ length: schema.minItems - created.length }, () => null)] : created;
        const maximum = IsNumber(schema.maxItems) && minimum.length > schema.maxItems ? minimum.slice(0, schema.maxItems) : minimum;
        const casted = maximum.map((value) => Visit(schema.items, references, value));
        if (schema.uniqueItems !== true)
            return casted;
        const unique = [...new Set(casted)];
        if (!check_1.ValueCheck.Check(schema, references, unique))
            throw new ValueCastArrayUniqueItemsTypeError(schema, unique);
        return unique;
    }
    function Boolean(schema, references, value) {
        const conversion = TryConvertBoolean(value);
        return check_1.ValueCheck.Check(schema, references, conversion) ? conversion : create_1.ValueCreate.Create(schema, references);
    }
    function Constructor(schema, references, value) {
        if (check_1.ValueCheck.Check(schema, references, value))
            return create_1.ValueCreate.Create(schema, references);
        const required = new Set(schema.returns.required || []);
        const result = function () { };
        for (const [key, property] of globalThis.Object.entries(schema.returns.properties)) {
            if (!required.has(key) && value.prototype[key] === undefined)
                continue;
            result.prototype[key] = Visit(property, references, value.prototype[key]);
        }
        return result;
    }
    function Date(schema, references, value) {
        const conversion = TryConvertDate(value);
        return check_1.ValueCheck.Check(schema, references, conversion) ? clone_1.ValueClone.Clone(conversion) : create_1.ValueCreate.Create(schema, references);
    }
    function Function(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? value : create_1.ValueCreate.Create(schema, references);
    }
    function Integer(schema, references, value) {
        const conversion = TryConvertInteger(value);
        return check_1.ValueCheck.Check(schema, references, conversion) ? conversion : create_1.ValueCreate.Create(schema, references);
    }
    function Literal(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? clone_1.ValueClone.Clone(value) : create_1.ValueCreate.Create(schema, references);
    }
    function Never(schema, references, value) {
        throw new ValueCastNeverTypeError(schema);
    }
    function Null(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? clone_1.ValueClone.Clone(value) : create_1.ValueCreate.Create(schema, references);
    }
    function Number(schema, references, value) {
        const conversion = TryConvertNumber(value);
        return check_1.ValueCheck.Check(schema, references, conversion) ? conversion : create_1.ValueCreate.Create(schema, references);
    }
    function Object(schema, references, value) {
        if (check_1.ValueCheck.Check(schema, references, value))
            return clone_1.ValueClone.Clone(value);
        if (value === null || typeof value !== 'object')
            return create_1.ValueCreate.Create(schema, references);
        const required = new Set(schema.required || []);
        const result = {};
        for (const [key, property] of globalThis.Object.entries(schema.properties)) {
            if (!required.has(key) && value[key] === undefined)
                continue;
            result[key] = Visit(property, references, value[key]);
        }
        // additional schema properties
        if (typeof schema.additionalProperties === 'object') {
            const propertyNames = globalThis.Object.getOwnPropertyNames(schema.properties);
            for (const propertyName of globalThis.Object.getOwnPropertyNames(value)) {
                if (propertyNames.includes(propertyName))
                    continue;
                result[propertyName] = Visit(schema.additionalProperties, references, value[propertyName]);
            }
        }
        return result;
    }
    function Promise(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? value : create_1.ValueCreate.Create(schema, references);
    }
    function Record(schema, references, value) {
        if (check_1.ValueCheck.Check(schema, references, value))
            return clone_1.ValueClone.Clone(value);
        if (value === null || typeof value !== 'object' || globalThis.Array.isArray(value) || value instanceof globalThis.Date)
            return create_1.ValueCreate.Create(schema, references);
        const subschemaPropertyName = globalThis.Object.getOwnPropertyNames(schema.patternProperties)[0];
        const subschema = schema.patternProperties[subschemaPropertyName];
        const result = {};
        for (const [propKey, propValue] of globalThis.Object.entries(value)) {
            result[propKey] = Visit(subschema, references, propValue);
        }
        return result;
    }
    function Recursive(schema, references, value) {
        throw new ValueCastRecursiveTypeError(schema);
    }
    function Ref(schema, references, value) {
        const reference = references.find((reference) => reference.$id === schema.$ref);
        if (reference === undefined)
            throw new ValueCastReferenceTypeError(schema);
        return Visit(reference, references, value);
    }
    function Self(schema, references, value) {
        const reference = references.find((reference) => reference.$id === schema.$ref);
        if (reference === undefined)
            throw new ValueCastReferenceTypeError(schema);
        return Visit(reference, references, value);
    }
    function String(schema, references, value) {
        const conversion = TryConvertString(value);
        return check_1.ValueCheck.Check(schema, references, conversion) ? conversion : create_1.ValueCreate.Create(schema, references);
    }
    function Tuple(schema, references, value) {
        if (check_1.ValueCheck.Check(schema, references, value))
            return clone_1.ValueClone.Clone(value);
        if (!globalThis.Array.isArray(value))
            return create_1.ValueCreate.Create(schema, references);
        if (schema.items === undefined)
            return [];
        return schema.items.map((schema, index) => Visit(schema, references, value[index]));
    }
    function Undefined(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? clone_1.ValueClone.Clone(value) : create_1.ValueCreate.Create(schema, references);
    }
    function Union(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? clone_1.ValueClone.Clone(value) : UnionCastCreate.Create(schema, references, value);
    }
    function Uint8Array(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? clone_1.ValueClone.Clone(value) : create_1.ValueCreate.Create(schema, references);
    }
    function Unknown(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? clone_1.ValueClone.Clone(value) : create_1.ValueCreate.Create(schema, references);
    }
    function Void(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? clone_1.ValueClone.Clone(value) : create_1.ValueCreate.Create(schema, references);
    }
    function UserDefined(schema, references, value) {
        return check_1.ValueCheck.Check(schema, references, value) ? clone_1.ValueClone.Clone(value) : create_1.ValueCreate.Create(schema, references);
    }
    function Visit(schema, references, value) {
        const anyReferences = schema.$id === undefined ? references : [schema, ...references];
        const anySchema = schema;
        switch (schema[Types.Kind]) {
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
            case 'Rec':
                return Recursive(anySchema, anyReferences, value);
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
                if (!index_1.Custom.Has(anySchema[Types.Kind]))
                    throw new ValueCastUnknownTypeError(anySchema);
                return UserDefined(anySchema, anyReferences, value);
        }
    }
    ValueCast.Visit = Visit;
    function Cast(schema, references, value) {
        return schema.$id === undefined ? Visit(schema, references, value) : Visit(schema, [schema, ...references], value);
    }
    ValueCast.Cast = Cast;
})(ValueCast = exports.ValueCast || (exports.ValueCast = {}));
