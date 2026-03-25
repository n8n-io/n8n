"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueErrors = exports.ValueErrorsDereferenceError = exports.ValueErrorsUnknownTypeError = exports.ValueErrorIterator = exports.ValueErrorType = void 0;
/*--------------------------------------------------------------------------

@sinclair/typebox/errors

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
const Types = require("../typebox");
const index_1 = require("../system/index");
const hash_1 = require("../value/hash");
// -------------------------------------------------------------------
// ValueErrorType
// -------------------------------------------------------------------
var ValueErrorType;
(function (ValueErrorType) {
    ValueErrorType[ValueErrorType["Array"] = 0] = "Array";
    ValueErrorType[ValueErrorType["ArrayMinItems"] = 1] = "ArrayMinItems";
    ValueErrorType[ValueErrorType["ArrayMaxItems"] = 2] = "ArrayMaxItems";
    ValueErrorType[ValueErrorType["ArrayUniqueItems"] = 3] = "ArrayUniqueItems";
    ValueErrorType[ValueErrorType["BigInt"] = 4] = "BigInt";
    ValueErrorType[ValueErrorType["BigIntMultipleOf"] = 5] = "BigIntMultipleOf";
    ValueErrorType[ValueErrorType["BigIntExclusiveMinimum"] = 6] = "BigIntExclusiveMinimum";
    ValueErrorType[ValueErrorType["BigIntExclusiveMaximum"] = 7] = "BigIntExclusiveMaximum";
    ValueErrorType[ValueErrorType["BigIntMinimum"] = 8] = "BigIntMinimum";
    ValueErrorType[ValueErrorType["BigIntMaximum"] = 9] = "BigIntMaximum";
    ValueErrorType[ValueErrorType["Boolean"] = 10] = "Boolean";
    ValueErrorType[ValueErrorType["Date"] = 11] = "Date";
    ValueErrorType[ValueErrorType["DateExclusiveMinimumTimestamp"] = 12] = "DateExclusiveMinimumTimestamp";
    ValueErrorType[ValueErrorType["DateExclusiveMaximumTimestamp"] = 13] = "DateExclusiveMaximumTimestamp";
    ValueErrorType[ValueErrorType["DateMinimumTimestamp"] = 14] = "DateMinimumTimestamp";
    ValueErrorType[ValueErrorType["DateMaximumTimestamp"] = 15] = "DateMaximumTimestamp";
    ValueErrorType[ValueErrorType["Function"] = 16] = "Function";
    ValueErrorType[ValueErrorType["Integer"] = 17] = "Integer";
    ValueErrorType[ValueErrorType["IntegerMultipleOf"] = 18] = "IntegerMultipleOf";
    ValueErrorType[ValueErrorType["IntegerExclusiveMinimum"] = 19] = "IntegerExclusiveMinimum";
    ValueErrorType[ValueErrorType["IntegerExclusiveMaximum"] = 20] = "IntegerExclusiveMaximum";
    ValueErrorType[ValueErrorType["IntegerMinimum"] = 21] = "IntegerMinimum";
    ValueErrorType[ValueErrorType["IntegerMaximum"] = 22] = "IntegerMaximum";
    ValueErrorType[ValueErrorType["Intersect"] = 23] = "Intersect";
    ValueErrorType[ValueErrorType["IntersectUnevaluatedProperties"] = 24] = "IntersectUnevaluatedProperties";
    ValueErrorType[ValueErrorType["Literal"] = 25] = "Literal";
    ValueErrorType[ValueErrorType["Never"] = 26] = "Never";
    ValueErrorType[ValueErrorType["Not"] = 27] = "Not";
    ValueErrorType[ValueErrorType["Null"] = 28] = "Null";
    ValueErrorType[ValueErrorType["Number"] = 29] = "Number";
    ValueErrorType[ValueErrorType["NumberMultipleOf"] = 30] = "NumberMultipleOf";
    ValueErrorType[ValueErrorType["NumberExclusiveMinimum"] = 31] = "NumberExclusiveMinimum";
    ValueErrorType[ValueErrorType["NumberExclusiveMaximum"] = 32] = "NumberExclusiveMaximum";
    ValueErrorType[ValueErrorType["NumberMinumum"] = 33] = "NumberMinumum";
    ValueErrorType[ValueErrorType["NumberMaximum"] = 34] = "NumberMaximum";
    ValueErrorType[ValueErrorType["Object"] = 35] = "Object";
    ValueErrorType[ValueErrorType["ObjectMinProperties"] = 36] = "ObjectMinProperties";
    ValueErrorType[ValueErrorType["ObjectMaxProperties"] = 37] = "ObjectMaxProperties";
    ValueErrorType[ValueErrorType["ObjectAdditionalProperties"] = 38] = "ObjectAdditionalProperties";
    ValueErrorType[ValueErrorType["ObjectRequiredProperties"] = 39] = "ObjectRequiredProperties";
    ValueErrorType[ValueErrorType["Promise"] = 40] = "Promise";
    ValueErrorType[ValueErrorType["RecordKeyNumeric"] = 41] = "RecordKeyNumeric";
    ValueErrorType[ValueErrorType["RecordKeyString"] = 42] = "RecordKeyString";
    ValueErrorType[ValueErrorType["String"] = 43] = "String";
    ValueErrorType[ValueErrorType["StringMinLength"] = 44] = "StringMinLength";
    ValueErrorType[ValueErrorType["StringMaxLength"] = 45] = "StringMaxLength";
    ValueErrorType[ValueErrorType["StringPattern"] = 46] = "StringPattern";
    ValueErrorType[ValueErrorType["StringFormatUnknown"] = 47] = "StringFormatUnknown";
    ValueErrorType[ValueErrorType["StringFormat"] = 48] = "StringFormat";
    ValueErrorType[ValueErrorType["Symbol"] = 49] = "Symbol";
    ValueErrorType[ValueErrorType["TupleZeroLength"] = 50] = "TupleZeroLength";
    ValueErrorType[ValueErrorType["TupleLength"] = 51] = "TupleLength";
    ValueErrorType[ValueErrorType["Undefined"] = 52] = "Undefined";
    ValueErrorType[ValueErrorType["Union"] = 53] = "Union";
    ValueErrorType[ValueErrorType["Uint8Array"] = 54] = "Uint8Array";
    ValueErrorType[ValueErrorType["Uint8ArrayMinByteLength"] = 55] = "Uint8ArrayMinByteLength";
    ValueErrorType[ValueErrorType["Uint8ArrayMaxByteLength"] = 56] = "Uint8ArrayMaxByteLength";
    ValueErrorType[ValueErrorType["Void"] = 57] = "Void";
    ValueErrorType[ValueErrorType["Custom"] = 58] = "Custom";
})(ValueErrorType = exports.ValueErrorType || (exports.ValueErrorType = {}));
// -------------------------------------------------------------------
// ValueErrorIterator
// -------------------------------------------------------------------
class ValueErrorIterator {
    constructor(iterator) {
        this.iterator = iterator;
    }
    [Symbol.iterator]() {
        return this.iterator;
    }
    /** Returns the first value error or undefined if no errors */
    First() {
        const next = this.iterator.next();
        return next.done ? undefined : next.value;
    }
}
exports.ValueErrorIterator = ValueErrorIterator;
// -------------------------------------------------------------------
// ValueErrors
// -------------------------------------------------------------------
class ValueErrorsUnknownTypeError extends Error {
    constructor(schema) {
        super('ValueErrors: Unknown type');
        this.schema = schema;
    }
}
exports.ValueErrorsUnknownTypeError = ValueErrorsUnknownTypeError;
class ValueErrorsDereferenceError extends Error {
    constructor(schema) {
        super(`ValueErrors: Unable to dereference schema with $id '${schema.$ref}'`);
        this.schema = schema;
    }
}
exports.ValueErrorsDereferenceError = ValueErrorsDereferenceError;
/** Provides functionality to generate a sequence of errors against a TypeBox type.  */
var ValueErrors;
(function (ValueErrors) {
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
    function* Any(schema, references, path, value) { }
    function* Array(schema, references, path, value) {
        if (!globalThis.Array.isArray(value)) {
            return yield { type: ValueErrorType.Array, schema, path, value, message: `Expected array` };
        }
        if (IsDefined(schema.minItems) && !(value.length >= schema.minItems)) {
            yield { type: ValueErrorType.ArrayMinItems, schema, path, value, message: `Expected array length to be greater or equal to ${schema.minItems}` };
        }
        if (IsDefined(schema.maxItems) && !(value.length <= schema.maxItems)) {
            yield { type: ValueErrorType.ArrayMinItems, schema, path, value, message: `Expected array length to be less or equal to ${schema.maxItems}` };
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
            yield { type: ValueErrorType.ArrayUniqueItems, schema, path, value, message: `Expected array elements to be unique` };
        }
        for (let i = 0; i < value.length; i++) {
            yield* Visit(schema.items, references, `${path}/${i}`, value[i]);
        }
    }
    function* BigInt(schema, references, path, value) {
        if (!IsBigInt(value)) {
            return yield { type: ValueErrorType.BigInt, schema, path, value, message: `Expected bigint` };
        }
        if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === globalThis.BigInt(0))) {
            yield { type: ValueErrorType.BigIntMultipleOf, schema, path, value, message: `Expected bigint to be a multiple of ${schema.multipleOf}` };
        }
        if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
            yield { type: ValueErrorType.BigIntExclusiveMinimum, schema, path, value, message: `Expected bigint to be greater than ${schema.exclusiveMinimum}` };
        }
        if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
            yield { type: ValueErrorType.BigIntExclusiveMaximum, schema, path, value, message: `Expected bigint to be less than ${schema.exclusiveMaximum}` };
        }
        if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
            yield { type: ValueErrorType.BigIntMinimum, schema, path, value, message: `Expected bigint to be greater or equal to ${schema.minimum}` };
        }
        if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
            yield { type: ValueErrorType.BigIntMaximum, schema, path, value, message: `Expected bigint to be less or equal to ${schema.maximum}` };
        }
    }
    function* Boolean(schema, references, path, value) {
        if (!(typeof value === 'boolean')) {
            return yield { type: ValueErrorType.Boolean, schema, path, value, message: `Expected boolean` };
        }
    }
    function* Constructor(schema, references, path, value) {
        yield* Visit(schema.returns, references, path, value.prototype);
    }
    function* Date(schema, references, path, value) {
        if (!(value instanceof globalThis.Date)) {
            return yield { type: ValueErrorType.Date, schema, path, value, message: `Expected Date object` };
        }
        if (!globalThis.isFinite(value.getTime())) {
            return yield { type: ValueErrorType.Date, schema, path, value, message: `Invalid Date` };
        }
        if (IsDefined(schema.exclusiveMinimumTimestamp) && !(value.getTime() > schema.exclusiveMinimumTimestamp)) {
            yield { type: ValueErrorType.DateExclusiveMinimumTimestamp, schema, path, value, message: `Expected Date timestamp to be greater than ${schema.exclusiveMinimum}` };
        }
        if (IsDefined(schema.exclusiveMaximumTimestamp) && !(value.getTime() < schema.exclusiveMaximumTimestamp)) {
            yield { type: ValueErrorType.DateExclusiveMaximumTimestamp, schema, path, value, message: `Expected Date timestamp to be less than ${schema.exclusiveMaximum}` };
        }
        if (IsDefined(schema.minimumTimestamp) && !(value.getTime() >= schema.minimumTimestamp)) {
            yield { type: ValueErrorType.DateMinimumTimestamp, schema, path, value, message: `Expected Date timestamp to be greater or equal to ${schema.minimum}` };
        }
        if (IsDefined(schema.maximumTimestamp) && !(value.getTime() <= schema.maximumTimestamp)) {
            yield { type: ValueErrorType.DateMaximumTimestamp, schema, path, value, message: `Expected Date timestamp to be less or equal to ${schema.maximum}` };
        }
    }
    function* Function(schema, references, path, value) {
        if (!(typeof value === 'function')) {
            return yield { type: ValueErrorType.Function, schema, path, value, message: `Expected function` };
        }
    }
    function* Integer(schema, references, path, value) {
        if (!IsInteger(value)) {
            return yield { type: ValueErrorType.Integer, schema, path, value, message: `Expected integer` };
        }
        if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
            yield { type: ValueErrorType.IntegerMultipleOf, schema, path, value, message: `Expected integer to be a multiple of ${schema.multipleOf}` };
        }
        if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
            yield { type: ValueErrorType.IntegerExclusiveMinimum, schema, path, value, message: `Expected integer to be greater than ${schema.exclusiveMinimum}` };
        }
        if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
            yield { type: ValueErrorType.IntegerExclusiveMaximum, schema, path, value, message: `Expected integer to be less than ${schema.exclusiveMaximum}` };
        }
        if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
            yield { type: ValueErrorType.IntegerMinimum, schema, path, value, message: `Expected integer to be greater or equal to ${schema.minimum}` };
        }
        if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
            yield { type: ValueErrorType.IntegerMaximum, schema, path, value, message: `Expected integer to be less or equal to ${schema.maximum}` };
        }
    }
    function* Intersect(schema, references, path, value) {
        for (const subschema of schema.allOf) {
            const next = Visit(subschema, references, path, value).next();
            if (!next.done) {
                yield next.value;
                yield { type: ValueErrorType.Intersect, schema, path, value, message: `Expected all sub schemas to be valid` };
                return;
            }
        }
        if (schema.unevaluatedProperties === false) {
            const schemaKeys = Types.KeyResolver.Resolve(schema);
            const valueKeys = globalThis.Object.getOwnPropertyNames(value);
            for (const valueKey of valueKeys) {
                if (!schemaKeys.includes(valueKey)) {
                    yield { type: ValueErrorType.IntersectUnevaluatedProperties, schema, path: `${path}/${valueKey}`, value, message: `Unexpected property` };
                }
            }
        }
        if (typeof schema.unevaluatedProperties === 'object') {
            const schemaKeys = Types.KeyResolver.Resolve(schema);
            const valueKeys = globalThis.Object.getOwnPropertyNames(value);
            for (const valueKey of valueKeys) {
                if (!schemaKeys.includes(valueKey)) {
                    const next = Visit(schema.unevaluatedProperties, references, `${path}/${valueKey}`, value[valueKey]).next();
                    if (!next.done) {
                        yield next.value;
                        yield { type: ValueErrorType.IntersectUnevaluatedProperties, schema, path: `${path}/${valueKey}`, value, message: `Invalid additional property` };
                        return;
                    }
                }
            }
        }
    }
    function* Literal(schema, references, path, value) {
        if (!(value === schema.const)) {
            const error = typeof schema.const === 'string' ? `'${schema.const}'` : schema.const;
            return yield { type: ValueErrorType.Literal, schema, path, value, message: `Expected ${error}` };
        }
    }
    function* Never(schema, references, path, value) {
        yield { type: ValueErrorType.Never, schema, path, value, message: `Value cannot be validated` };
    }
    function* Not(schema, references, path, value) {
        if (Visit(schema.allOf[0].not, references, path, value).next().done === true) {
            yield { type: ValueErrorType.Not, schema, path, value, message: `Value should not validate` };
        }
        yield* Visit(schema.allOf[1], references, path, value);
    }
    function* Null(schema, references, path, value) {
        if (!(value === null)) {
            return yield { type: ValueErrorType.Null, schema, path, value, message: `Expected null` };
        }
    }
    function* Number(schema, references, path, value) {
        if (!IsNumber(value)) {
            return yield { type: ValueErrorType.Number, schema, path, value, message: `Expected number` };
        }
        if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
            yield { type: ValueErrorType.NumberMultipleOf, schema, path, value, message: `Expected number to be a multiple of ${schema.multipleOf}` };
        }
        if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
            yield { type: ValueErrorType.NumberExclusiveMinimum, schema, path, value, message: `Expected number to be greater than ${schema.exclusiveMinimum}` };
        }
        if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
            yield { type: ValueErrorType.NumberExclusiveMaximum, schema, path, value, message: `Expected number to be less than ${schema.exclusiveMaximum}` };
        }
        if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
            yield { type: ValueErrorType.NumberMaximum, schema, path, value, message: `Expected number to be greater or equal to ${schema.minimum}` };
        }
        if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
            yield { type: ValueErrorType.NumberMinumum, schema, path, value, message: `Expected number to be less or equal to ${schema.maximum}` };
        }
    }
    function* Object(schema, references, path, value) {
        if (!IsObject(value)) {
            return yield { type: ValueErrorType.Object, schema, path, value, message: `Expected object` };
        }
        if (IsDefined(schema.minProperties) && !(globalThis.Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
            yield { type: ValueErrorType.ObjectMinProperties, schema, path, value, message: `Expected object to have at least ${schema.minProperties} properties` };
        }
        if (IsDefined(schema.maxProperties) && !(globalThis.Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
            yield { type: ValueErrorType.ObjectMaxProperties, schema, path, value, message: `Expected object to have less than ${schema.minProperties} properties` };
        }
        const requiredKeys = globalThis.Array.isArray(schema.required) ? schema.required : [];
        const knownKeys = globalThis.Object.getOwnPropertyNames(schema.properties);
        const unknownKeys = globalThis.Object.getOwnPropertyNames(value);
        for (const knownKey of knownKeys) {
            const property = schema.properties[knownKey];
            if (schema.required && schema.required.includes(knownKey)) {
                yield* Visit(property, references, `${path}/${knownKey}`, value[knownKey]);
                if (Types.ExtendsUndefined.Check(schema) && !(knownKey in value)) {
                    yield { type: ValueErrorType.ObjectRequiredProperties, schema: property, path: `${path}/${knownKey}`, value: undefined, message: `Expected required property` };
                }
            }
            else {
                if (IsExactOptionalProperty(value, knownKey)) {
                    yield* Visit(property, references, `${path}/${knownKey}`, value[knownKey]);
                }
            }
        }
        for (const requiredKey of requiredKeys) {
            if (unknownKeys.includes(requiredKey))
                continue;
            yield { type: ValueErrorType.ObjectRequiredProperties, schema: schema.properties[requiredKey], path: `${path}/${requiredKey}`, value: undefined, message: `Expected required property` };
        }
        if (schema.additionalProperties === false) {
            for (const valueKey of unknownKeys) {
                if (!knownKeys.includes(valueKey)) {
                    yield { type: ValueErrorType.ObjectAdditionalProperties, schema, path: `${path}/${valueKey}`, value: value[valueKey], message: `Unexpected property` };
                }
            }
        }
        if (typeof schema.additionalProperties === 'object') {
            for (const valueKey of unknownKeys) {
                if (knownKeys.includes(valueKey))
                    continue;
                yield* Visit(schema.additionalProperties, references, `${path}/${valueKey}`, value[valueKey]);
            }
        }
    }
    function* Promise(schema, references, path, value) {
        if (!(typeof value === 'object' && typeof value.then === 'function')) {
            yield { type: ValueErrorType.Promise, schema, path, value, message: `Expected Promise` };
        }
    }
    function* Record(schema, references, path, value) {
        if (!IsRecordObject(value)) {
            return yield { type: ValueErrorType.Object, schema, path, value, message: `Expected record object` };
        }
        if (IsDefined(schema.minProperties) && !(globalThis.Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
            yield { type: ValueErrorType.ObjectMinProperties, schema, path, value, message: `Expected object to have at least ${schema.minProperties} properties` };
        }
        if (IsDefined(schema.maxProperties) && !(globalThis.Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
            yield { type: ValueErrorType.ObjectMaxProperties, schema, path, value, message: `Expected object to have less than ${schema.minProperties} properties` };
        }
        const [keyPattern, valueSchema] = globalThis.Object.entries(schema.patternProperties)[0];
        const regex = new RegExp(keyPattern);
        if (!globalThis.Object.getOwnPropertyNames(value).every((key) => regex.test(key))) {
            const numeric = keyPattern === Types.PatternNumberExact;
            const type = numeric ? ValueErrorType.RecordKeyNumeric : ValueErrorType.RecordKeyString;
            const message = numeric ? 'Expected all object property keys to be numeric' : 'Expected all object property keys to be strings';
            return yield { type, schema, path, value, message };
        }
        for (const [propKey, propValue] of globalThis.Object.entries(value)) {
            yield* Visit(valueSchema, references, `${path}/${propKey}`, propValue);
        }
    }
    function* Ref(schema, references, path, value) {
        const index = references.findIndex((foreign) => foreign.$id === schema.$ref);
        if (index === -1)
            throw new ValueErrorsDereferenceError(schema);
        const target = references[index];
        yield* Visit(target, references, path, value);
    }
    function* String(schema, references, path, value) {
        if (!IsString(value)) {
            return yield { type: ValueErrorType.String, schema, path, value, message: 'Expected string' };
        }
        if (IsDefined(schema.minLength) && !(value.length >= schema.minLength)) {
            yield { type: ValueErrorType.StringMinLength, schema, path, value, message: `Expected string length greater or equal to ${schema.minLength}` };
        }
        if (IsDefined(schema.maxLength) && !(value.length <= schema.maxLength)) {
            yield { type: ValueErrorType.StringMaxLength, schema, path, value, message: `Expected string length less or equal to ${schema.maxLength}` };
        }
        if (schema.pattern !== undefined) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value)) {
                yield { type: ValueErrorType.StringPattern, schema, path, value, message: `Expected string to match pattern ${schema.pattern}` };
            }
        }
        if (schema.format !== undefined) {
            if (!Types.FormatRegistry.Has(schema.format)) {
                yield { type: ValueErrorType.StringFormatUnknown, schema, path, value, message: `Unknown string format '${schema.format}'` };
            }
            else {
                const format = Types.FormatRegistry.Get(schema.format);
                if (!format(value)) {
                    yield { type: ValueErrorType.StringFormat, schema, path, value, message: `Expected string to match format '${schema.format}'` };
                }
            }
        }
    }
    function* Symbol(schema, references, path, value) {
        if (!(typeof value === 'symbol')) {
            return yield { type: ValueErrorType.Symbol, schema, path, value, message: 'Expected symbol' };
        }
    }
    function* TemplateLiteral(schema, references, path, value) {
        if (!IsString(value)) {
            return yield { type: ValueErrorType.String, schema, path, value, message: 'Expected string' };
        }
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
            yield { type: ValueErrorType.StringPattern, schema, path, value, message: `Expected string to match pattern ${schema.pattern}` };
        }
    }
    function* This(schema, references, path, value) {
        const index = references.findIndex((foreign) => foreign.$id === schema.$ref);
        if (index === -1)
            throw new ValueErrorsDereferenceError(schema);
        const target = references[index];
        yield* Visit(target, references, path, value);
    }
    function* Tuple(schema, references, path, value) {
        if (!globalThis.Array.isArray(value)) {
            return yield { type: ValueErrorType.Array, schema, path, value, message: 'Expected Array' };
        }
        if (schema.items === undefined && !(value.length === 0)) {
            return yield { type: ValueErrorType.TupleZeroLength, schema, path, value, message: 'Expected tuple to have 0 elements' };
        }
        if (!(value.length === schema.maxItems)) {
            yield { type: ValueErrorType.TupleLength, schema, path, value, message: `Expected tuple to have ${schema.maxItems} elements` };
        }
        if (!schema.items) {
            return;
        }
        for (let i = 0; i < schema.items.length; i++) {
            yield* Visit(schema.items[i], references, `${path}/${i}`, value[i]);
        }
    }
    function* Undefined(schema, references, path, value) {
        if (!(value === undefined)) {
            yield { type: ValueErrorType.Undefined, schema, path, value, message: `Expected undefined` };
        }
    }
    function* Union(schema, references, path, value) {
        const errors = [];
        for (const inner of schema.anyOf) {
            const variantErrors = [...Visit(inner, references, path, value)];
            if (variantErrors.length === 0)
                return;
            errors.push(...variantErrors);
        }
        if (errors.length > 0) {
            yield { type: ValueErrorType.Union, schema, path, value, message: 'Expected value of union' };
        }
        for (const error of errors) {
            yield error;
        }
    }
    function* Uint8Array(schema, references, path, value) {
        if (!(value instanceof globalThis.Uint8Array)) {
            return yield { type: ValueErrorType.Uint8Array, schema, path, value, message: `Expected Uint8Array` };
        }
        if (IsDefined(schema.maxByteLength) && !(value.length <= schema.maxByteLength)) {
            yield { type: ValueErrorType.Uint8ArrayMaxByteLength, schema, path, value, message: `Expected Uint8Array to have a byte length less or equal to ${schema.maxByteLength}` };
        }
        if (IsDefined(schema.minByteLength) && !(value.length >= schema.minByteLength)) {
            yield { type: ValueErrorType.Uint8ArrayMinByteLength, schema, path, value, message: `Expected Uint8Array to have a byte length greater or equal to ${schema.maxByteLength}` };
        }
    }
    function* Unknown(schema, references, path, value) { }
    function* Void(schema, references, path, value) {
        if (!IsVoid(value)) {
            return yield { type: ValueErrorType.Void, schema, path, value, message: `Expected void` };
        }
    }
    function* UserDefined(schema, references, path, value) {
        const check = Types.TypeRegistry.Get(schema[Types.Kind]);
        if (!check(schema, value)) {
            return yield { type: ValueErrorType.Custom, schema, path, value, message: `Expected kind ${schema[Types.Kind]}` };
        }
    }
    function* Visit(schema, references, path, value) {
        const references_ = IsDefined(schema.$id) ? [...references, schema] : references;
        const schema_ = schema;
        switch (schema_[Types.Kind]) {
            case 'Any':
                return yield* Any(schema_, references_, path, value);
            case 'Array':
                return yield* Array(schema_, references_, path, value);
            case 'BigInt':
                return yield* BigInt(schema_, references_, path, value);
            case 'Boolean':
                return yield* Boolean(schema_, references_, path, value);
            case 'Constructor':
                return yield* Constructor(schema_, references_, path, value);
            case 'Date':
                return yield* Date(schema_, references_, path, value);
            case 'Function':
                return yield* Function(schema_, references_, path, value);
            case 'Integer':
                return yield* Integer(schema_, references_, path, value);
            case 'Intersect':
                return yield* Intersect(schema_, references_, path, value);
            case 'Literal':
                return yield* Literal(schema_, references_, path, value);
            case 'Never':
                return yield* Never(schema_, references_, path, value);
            case 'Not':
                return yield* Not(schema_, references_, path, value);
            case 'Null':
                return yield* Null(schema_, references_, path, value);
            case 'Number':
                return yield* Number(schema_, references_, path, value);
            case 'Object':
                return yield* Object(schema_, references_, path, value);
            case 'Promise':
                return yield* Promise(schema_, references_, path, value);
            case 'Record':
                return yield* Record(schema_, references_, path, value);
            case 'Ref':
                return yield* Ref(schema_, references_, path, value);
            case 'String':
                return yield* String(schema_, references_, path, value);
            case 'Symbol':
                return yield* Symbol(schema_, references_, path, value);
            case 'TemplateLiteral':
                return yield* TemplateLiteral(schema_, references_, path, value);
            case 'This':
                return yield* This(schema_, references_, path, value);
            case 'Tuple':
                return yield* Tuple(schema_, references_, path, value);
            case 'Undefined':
                return yield* Undefined(schema_, references_, path, value);
            case 'Union':
                return yield* Union(schema_, references_, path, value);
            case 'Uint8Array':
                return yield* Uint8Array(schema_, references_, path, value);
            case 'Unknown':
                return yield* Unknown(schema_, references_, path, value);
            case 'Void':
                return yield* Void(schema_, references_, path, value);
            default:
                if (!Types.TypeRegistry.Has(schema_[Types.Kind]))
                    throw new ValueErrorsUnknownTypeError(schema);
                return yield* UserDefined(schema_, references_, path, value);
        }
    }
    function Errors(schema, references, value) {
        const iterator = Visit(schema, references, '', value);
        return new ValueErrorIterator(iterator);
    }
    ValueErrors.Errors = Errors;
})(ValueErrors = exports.ValueErrors || (exports.ValueErrors = {}));
