"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/guard

The MIT License (MIT)

Copyright (c) 2017-2023 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, dTribute, sublicense, and/or sell
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
exports.TypeGuard = exports.TypeGuardUnknownTypeError = void 0;
const index_1 = require("../custom/index");
const Types = require("../typebox");
class TypeGuardUnknownTypeError extends Error {
    constructor(schema) {
        super('TypeGuard: Unknown type');
        this.schema = schema;
    }
}
exports.TypeGuardUnknownTypeError = TypeGuardUnknownTypeError;
/** Provides functionality to test if values are TypeBox types */
var TypeGuard;
(function (TypeGuard) {
    function IsObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
    function IsArray(value) {
        return typeof value === 'object' && value !== null && Array.isArray(value);
    }
    function IsPattern(value) {
        try {
            new RegExp(value);
            return true;
        }
        catch {
            return false;
        }
    }
    function IsControlCharacterFree(value) {
        if (typeof value !== 'string')
            return false;
        for (let i = 0; i < value.length; i++) {
            const code = value.charCodeAt(i);
            if ((code >= 7 && code <= 13) || code === 27 || code === 127) {
                return false;
            }
        }
        return true;
    }
    function IsString(value) {
        return typeof value === 'string';
    }
    function IsNumber(value) {
        return typeof value === 'number' && !isNaN(value);
    }
    function IsBoolean(value) {
        return typeof value === 'boolean';
    }
    function IsOptionalNumber(value) {
        return value === undefined || (value !== undefined && IsNumber(value));
    }
    function IsOptionalBoolean(value) {
        return value === undefined || (value !== undefined && IsBoolean(value));
    }
    function IsOptionalString(value) {
        return value === undefined || (value !== undefined && IsString(value));
    }
    function IsOptionalPattern(value) {
        return value === undefined || (value !== undefined && IsString(value) && IsControlCharacterFree(value) && IsPattern(value));
    }
    function IsOptionalFormat(value) {
        return value === undefined || (value !== undefined && IsString(value) && IsControlCharacterFree(value));
    }
    function IsOptionalSchema(value) {
        return value === undefined || TSchema(value);
    }
    /** Returns true if the given schema is TAny */
    function TAny(schema) {
        return IsObject(schema) && schema[Types.Kind] === 'Any' && IsOptionalString(schema.$id);
    }
    TypeGuard.TAny = TAny;
    /** Returns true if the given schema is TArray */
    function TArray(schema) {
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Array' &&
            schema.type === 'array' &&
            IsOptionalString(schema.$id) &&
            TSchema(schema.items) &&
            IsOptionalNumber(schema.minItems) &&
            IsOptionalNumber(schema.maxItems) &&
            IsOptionalBoolean(schema.uniqueItems));
    }
    TypeGuard.TArray = TArray;
    /** Returns true if the given schema is TBoolean */
    function TBoolean(schema) {
        // prettier-ignore
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Boolean' &&
            schema.type === 'boolean' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TBoolean = TBoolean;
    /** Returns true if the given schema is TConstructor */
    function TConstructor(schema) {
        // prettier-ignore
        if (!(IsObject(schema) &&
            schema[Types.Kind] === 'Constructor' &&
            schema.type === 'object' &&
            schema.instanceOf === 'Constructor' &&
            IsOptionalString(schema.$id) &&
            IsArray(schema.parameters) &&
            TSchema(schema.returns))) {
            return false;
        }
        for (const parameter of schema.parameters) {
            if (!TSchema(parameter))
                return false;
        }
        return true;
    }
    TypeGuard.TConstructor = TConstructor;
    /** Returns true if the given schema is TDate */
    function TDate(schema) {
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Date' &&
            schema.type === 'object' &&
            schema.instanceOf === 'Date' &&
            IsOptionalString(schema.$id) &&
            IsOptionalNumber(schema.minimumTimestamp) &&
            IsOptionalNumber(schema.maximumTimestamp) &&
            IsOptionalNumber(schema.exclusiveMinimumTimestamp) &&
            IsOptionalNumber(schema.exclusiveMaximumTimestamp));
    }
    TypeGuard.TDate = TDate;
    /** Returns true if the given schema is TFunction */
    function TFunction(schema) {
        // prettier-ignore
        if (!(IsObject(schema) &&
            schema[Types.Kind] === 'Function' &&
            schema.type === 'object' &&
            schema.instanceOf === 'Function' &&
            IsOptionalString(schema.$id) &&
            IsArray(schema.parameters) &&
            TSchema(schema.returns))) {
            return false;
        }
        for (const parameter of schema.parameters) {
            if (!TSchema(parameter))
                return false;
        }
        return true;
    }
    TypeGuard.TFunction = TFunction;
    /** Returns true if the given schema is TInteger */
    function TInteger(schema) {
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Integer' &&
            schema.type === 'integer' &&
            IsOptionalString(schema.$id) &&
            IsOptionalNumber(schema.multipleOf) &&
            IsOptionalNumber(schema.minimum) &&
            IsOptionalNumber(schema.maximum) &&
            IsOptionalNumber(schema.exclusiveMinimum) &&
            IsOptionalNumber(schema.exclusiveMaximum));
    }
    TypeGuard.TInteger = TInteger;
    /** Returns true if the given schema is TLiteral */
    function TLiteral(schema) {
        // prettier-ignore
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Literal' &&
            IsOptionalString(schema.$id) &&
            (IsString(schema.const) ||
                IsNumber(schema.const) ||
                IsBoolean(schema.const)));
    }
    TypeGuard.TLiteral = TLiteral;
    /** Returns true if the given schema is TNever */
    function TNever(schema) {
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Never' &&
            IsArray(schema.allOf) &&
            schema.allOf.length === 2 &&
            IsObject(schema.allOf[0]) &&
            IsString(schema.allOf[0].type) &&
            schema.allOf[0].type === 'boolean' &&
            schema.allOf[0].const === false &&
            IsObject(schema.allOf[1]) &&
            IsString(schema.allOf[1].type) &&
            schema.allOf[1].type === 'boolean' &&
            schema.allOf[1].const === true);
    }
    TypeGuard.TNever = TNever;
    /** Returns true if the given schema is TNull */
    function TNull(schema) {
        return IsObject(schema) && schema[Types.Kind] === 'Null' && schema.type === 'null' && IsOptionalString(schema.$id);
    }
    TypeGuard.TNull = TNull;
    /** Returns true if the given schema is TNumber */
    function TNumber(schema) {
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Number' &&
            schema.type === 'number' &&
            IsOptionalString(schema.$id) &&
            IsOptionalNumber(schema.multipleOf) &&
            IsOptionalNumber(schema.minimum) &&
            IsOptionalNumber(schema.maximum) &&
            IsOptionalNumber(schema.exclusiveMinimum) &&
            IsOptionalNumber(schema.exclusiveMaximum));
    }
    TypeGuard.TNumber = TNumber;
    /** Returns true if the given schema is TObject */
    function TObject(schema) {
        if (!(IsObject(schema) &&
            schema[Types.Kind] === 'Object' &&
            schema.type === 'object' &&
            IsOptionalString(schema.$id) &&
            IsObject(schema.properties) &&
            (IsOptionalBoolean(schema.additionalProperties) || IsOptionalSchema(schema.additionalProperties)) &&
            IsOptionalNumber(schema.minProperties) &&
            IsOptionalNumber(schema.maxProperties))) {
            return false;
        }
        for (const [key, value] of Object.entries(schema.properties)) {
            if (!IsControlCharacterFree(key))
                return false;
            if (!TSchema(value))
                return false;
        }
        return true;
    }
    TypeGuard.TObject = TObject;
    /** Returns true if the given schema is TPromise */
    function TPromise(schema) {
        // prettier-ignore
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Promise' &&
            schema.type === 'object' &&
            schema.instanceOf === 'Promise' &&
            IsOptionalString(schema.$id) &&
            TSchema(schema.item));
    }
    TypeGuard.TPromise = TPromise;
    /** Returns true if the given schema is TRecord */
    function TRecord(schema) {
        // prettier-ignore
        if (!(IsObject(schema) &&
            schema[Types.Kind] === 'Record' &&
            schema.type === 'object' &&
            IsOptionalString(schema.$id) &&
            schema.additionalProperties === false &&
            IsObject(schema.patternProperties))) {
            return false;
        }
        const keys = Object.keys(schema.patternProperties);
        if (keys.length !== 1) {
            return false;
        }
        if (!IsPattern(keys[0])) {
            return false;
        }
        if (!TSchema(schema.patternProperties[keys[0]])) {
            return false;
        }
        return true;
    }
    TypeGuard.TRecord = TRecord;
    /** Returns true if the given schema is TSelf */
    function TSelf(schema) {
        // prettier-ignore
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Self' &&
            IsOptionalString(schema.$id) &&
            IsString(schema.$ref));
    }
    TypeGuard.TSelf = TSelf;
    /** Returns true if the given schema is TRef */
    function TRef(schema) {
        // prettier-ignore
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Ref' &&
            IsOptionalString(schema.$id) &&
            IsString(schema.$ref));
    }
    TypeGuard.TRef = TRef;
    /** Returns true if the given schema is TString */
    function TString(schema) {
        return (IsObject(schema) &&
            schema[Types.Kind] === 'String' &&
            schema.type === 'string' &&
            IsOptionalString(schema.$id) &&
            IsOptionalNumber(schema.minLength) &&
            IsOptionalNumber(schema.maxLength) &&
            IsOptionalPattern(schema.pattern) &&
            IsOptionalFormat(schema.format));
    }
    TypeGuard.TString = TString;
    /** Returns true if the given schema is TTuple */
    function TTuple(schema) {
        // prettier-ignore
        if (!(IsObject(schema) &&
            schema[Types.Kind] === 'Tuple' &&
            schema.type === 'array' &&
            IsOptionalString(schema.$id) &&
            IsNumber(schema.minItems) &&
            IsNumber(schema.maxItems) &&
            schema.minItems === schema.maxItems)) {
            return false;
        }
        if (schema.items === undefined && schema.additionalItems === undefined && schema.minItems === 0) {
            return true;
        }
        if (!IsArray(schema.items)) {
            return false;
        }
        for (const inner of schema.items) {
            if (!TSchema(inner))
                return false;
        }
        return true;
    }
    TypeGuard.TTuple = TTuple;
    /** Returns true if the given schema is TUndefined */
    function TUndefined(schema) {
        // prettier-ignore
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Undefined' &&
            schema.type === 'null' &&
            schema.typeOf === 'Undefined' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TUndefined = TUndefined;
    /** Returns true if the given schema is TUnion */
    function TUnion(schema) {
        // prettier-ignore
        if (!(IsObject(schema) &&
            schema[Types.Kind] === 'Union' &&
            IsArray(schema.anyOf) &&
            IsOptionalString(schema.$id))) {
            return false;
        }
        for (const inner of schema.anyOf) {
            if (!TSchema(inner))
                return false;
        }
        return true;
    }
    TypeGuard.TUnion = TUnion;
    /** Returns true if the given schema is TUint8Array */
    function TUint8Array(schema) {
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Uint8Array' &&
            schema.type === 'object' &&
            IsOptionalString(schema.$id) &&
            schema.instanceOf === 'Uint8Array' &&
            IsOptionalNumber(schema.minByteLength) &&
            IsOptionalNumber(schema.maxByteLength));
    }
    TypeGuard.TUint8Array = TUint8Array;
    /** Returns true if the given schema is TUnknown */
    function TUnknown(schema) {
        // prettier-ignore
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Unknown' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TUnknown = TUnknown;
    /** Returns true if the given schema is TVoid */
    function TVoid(schema) {
        // prettier-ignore
        return (IsObject(schema) &&
            schema[Types.Kind] === 'Void' &&
            schema.type === 'null' &&
            schema.typeOf === 'Void' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TVoid = TVoid;
    /** Returns true if the given schema is a registered user defined type */
    function TUserDefined(schema) {
        return IsObject(schema) && IsString(schema[Types.Kind]) && index_1.Custom.Has(schema[Types.Kind]);
    }
    TypeGuard.TUserDefined = TUserDefined;
    /** Returns true if the given schema is TSchema */
    function TSchema(schema) {
        return (TAny(schema) ||
            TArray(schema) ||
            TBoolean(schema) ||
            TConstructor(schema) ||
            TDate(schema) ||
            TFunction(schema) ||
            TInteger(schema) ||
            TLiteral(schema) ||
            TNever(schema) ||
            TNull(schema) ||
            TNumber(schema) ||
            TObject(schema) ||
            TPromise(schema) ||
            TRecord(schema) ||
            TSelf(schema) ||
            TRef(schema) ||
            TString(schema) ||
            TTuple(schema) ||
            TUndefined(schema) ||
            TUnion(schema) ||
            TUint8Array(schema) ||
            TUnknown(schema) ||
            TVoid(schema) ||
            TUserDefined(schema));
    }
    TypeGuard.TSchema = TSchema;
    /** Asserts if this schema and associated references are valid. */
    function Assert(schema, references = []) {
        if (!TSchema(schema))
            throw new TypeGuardUnknownTypeError(schema);
        for (const schema of references) {
            if (!TSchema(schema))
                throw new TypeGuardUnknownTypeError(schema);
        }
    }
    TypeGuard.Assert = Assert;
})(TypeGuard = exports.TypeGuard || (exports.TypeGuard = {}));
