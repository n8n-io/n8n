"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox

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
exports.Type = exports.StandardType = exports.ExtendedTypeBuilder = exports.StandardTypeBuilder = exports.TypeBuilder = exports.TemplateLiteralGenerator = exports.TemplateLiteralFinite = exports.TemplateLiteralParser = exports.TemplateLiteralParserError = exports.TemplateLiteralResolver = exports.TemplateLiteralPattern = exports.KeyResolver = exports.ObjectMap = exports.TypeClone = exports.TypeExtends = exports.TypeExtendsResult = exports.ExtendsUndefined = exports.TypeGuard = exports.TypeGuardUnknownTypeError = exports.FormatRegistry = exports.TypeRegistry = exports.PatternStringExact = exports.PatternNumberExact = exports.PatternBooleanExact = exports.PatternString = exports.PatternNumber = exports.PatternBoolean = exports.Kind = exports.Hint = exports.Modifier = void 0;
// --------------------------------------------------------------------------
// Symbols
// --------------------------------------------------------------------------
exports.Modifier = Symbol.for('TypeBox.Modifier');
exports.Hint = Symbol.for('TypeBox.Hint');
exports.Kind = Symbol.for('TypeBox.Kind');
// --------------------------------------------------------------------------
// Patterns
// --------------------------------------------------------------------------
exports.PatternBoolean = '(true|false)';
exports.PatternNumber = '(0|[1-9][0-9]*)';
exports.PatternString = '(.*)';
exports.PatternBooleanExact = `^${exports.PatternBoolean}$`;
exports.PatternNumberExact = `^${exports.PatternNumber}$`;
exports.PatternStringExact = `^${exports.PatternString}$`;
/** A registry for user defined types */
var TypeRegistry;
(function (TypeRegistry) {
    const map = new Map();
    /** Returns the entries in this registry */
    function Entries() {
        return new Map(map);
    }
    TypeRegistry.Entries = Entries;
    /** Clears all user defined types */
    function Clear() {
        return map.clear();
    }
    TypeRegistry.Clear = Clear;
    /** Returns true if this registry contains this kind */
    function Has(kind) {
        return map.has(kind);
    }
    TypeRegistry.Has = Has;
    /** Sets a validation function for a user defined type */
    function Set(kind, func) {
        map.set(kind, func);
    }
    TypeRegistry.Set = Set;
    /** Gets a custom validation function for a user defined type */
    function Get(kind) {
        return map.get(kind);
    }
    TypeRegistry.Get = Get;
})(TypeRegistry = exports.TypeRegistry || (exports.TypeRegistry = {}));
/** A registry for user defined string formats */
var FormatRegistry;
(function (FormatRegistry) {
    const map = new Map();
    /** Returns the entries in this registry */
    function Entries() {
        return new Map(map);
    }
    FormatRegistry.Entries = Entries;
    /** Clears all user defined string formats */
    function Clear() {
        return map.clear();
    }
    FormatRegistry.Clear = Clear;
    /** Returns true if the user defined string format exists */
    function Has(format) {
        return map.has(format);
    }
    FormatRegistry.Has = Has;
    /** Sets a validation function for a user defined string format */
    function Set(format, func) {
        map.set(format, func);
    }
    FormatRegistry.Set = Set;
    /** Gets a validation function for a user defined string format */
    function Get(format) {
        return map.get(format);
    }
    FormatRegistry.Get = Get;
})(FormatRegistry = exports.FormatRegistry || (exports.FormatRegistry = {}));
// --------------------------------------------------------------------------
// TypeGuard
// --------------------------------------------------------------------------
class TypeGuardUnknownTypeError extends Error {
    constructor(schema) {
        super('TypeGuard: Unknown type');
        this.schema = schema;
    }
}
exports.TypeGuardUnknownTypeError = TypeGuardUnknownTypeError;
/** Provides functions to test if JavaScript values are TypeBox types */
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
    function IsBigInt(value) {
        return typeof value === 'bigint';
    }
    function IsString(value) {
        return typeof value === 'string';
    }
    function IsNumber(value) {
        return typeof value === 'number' && globalThis.Number.isFinite(value);
    }
    function IsBoolean(value) {
        return typeof value === 'boolean';
    }
    function IsOptionalBigInt(value) {
        return value === undefined || (value !== undefined && IsBigInt(value));
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
        return TKind(schema) && schema[exports.Kind] === 'Any' && IsOptionalString(schema.$id);
    }
    TypeGuard.TAny = TAny;
    /** Returns true if the given schema is TArray */
    function TArray(schema) {
        return (TKind(schema) &&
            schema[exports.Kind] === 'Array' &&
            schema.type === 'array' &&
            IsOptionalString(schema.$id) &&
            TSchema(schema.items) &&
            IsOptionalNumber(schema.minItems) &&
            IsOptionalNumber(schema.maxItems) &&
            IsOptionalBoolean(schema.uniqueItems));
    }
    TypeGuard.TArray = TArray;
    /** Returns true if the given schema is TBigInt */
    function TBigInt(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'BigInt' &&
            schema.type === 'null' &&
            schema.typeOf === 'BigInt' &&
            IsOptionalString(schema.$id) &&
            IsOptionalBigInt(schema.multipleOf) &&
            IsOptionalBigInt(schema.minimum) &&
            IsOptionalBigInt(schema.maximum) &&
            IsOptionalBigInt(schema.exclusiveMinimum) &&
            IsOptionalBigInt(schema.exclusiveMaximum));
    }
    TypeGuard.TBigInt = TBigInt;
    /** Returns true if the given schema is TBoolean */
    function TBoolean(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'Boolean' &&
            schema.type === 'boolean' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TBoolean = TBoolean;
    /** Returns true if the given schema is TConstructor */
    function TConstructor(schema) {
        // prettier-ignore
        if (!(TKind(schema) &&
            schema[exports.Kind] === 'Constructor' &&
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
        return (TKind(schema) &&
            schema[exports.Kind] === 'Date' &&
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
        if (!(TKind(schema) &&
            schema[exports.Kind] === 'Function' &&
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
        return (TKind(schema) &&
            schema[exports.Kind] === 'Integer' &&
            schema.type === 'integer' &&
            IsOptionalString(schema.$id) &&
            IsOptionalNumber(schema.multipleOf) &&
            IsOptionalNumber(schema.minimum) &&
            IsOptionalNumber(schema.maximum) &&
            IsOptionalNumber(schema.exclusiveMinimum) &&
            IsOptionalNumber(schema.exclusiveMaximum));
    }
    TypeGuard.TInteger = TInteger;
    /** Returns true if the given schema is TIntersect */
    function TIntersect(schema) {
        // prettier-ignore
        if (!(TKind(schema) &&
            schema[exports.Kind] === 'Intersect' &&
            IsArray(schema.allOf) &&
            IsOptionalString(schema.type) &&
            (IsOptionalBoolean(schema.unevaluatedProperties) || IsOptionalSchema(schema.unevaluatedProperties)) &&
            IsOptionalString(schema.$id))) {
            return false;
        }
        if ('type' in schema && schema.type !== 'object') {
            return false;
        }
        for (const inner of schema.allOf) {
            if (!TSchema(inner))
                return false;
        }
        return true;
    }
    TypeGuard.TIntersect = TIntersect;
    /** Returns true if the given schema is TKind */
    function TKind(schema) {
        return IsObject(schema) && exports.Kind in schema && typeof schema[exports.Kind] === 'string'; // TS 4.1.5: any required for symbol indexer
    }
    TypeGuard.TKind = TKind;
    /** Returns true if the given schema is TLiteral */
    function TLiteral(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'Literal' &&
            IsOptionalString(schema.$id) &&
            (IsString(schema.const) ||
                IsNumber(schema.const) ||
                IsBoolean(schema.const) ||
                IsBigInt(schema.const)));
    }
    TypeGuard.TLiteral = TLiteral;
    /** Returns true if the given schema is TNever */
    function TNever(schema) {
        return TKind(schema) && schema[exports.Kind] === 'Never' && IsObject(schema.not) && globalThis.Object.getOwnPropertyNames(schema.not).length === 0;
    }
    TypeGuard.TNever = TNever;
    /** Returns true if the given schema is TNot */
    function TNot(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'Not' &&
            IsArray(schema.allOf) &&
            schema.allOf.length === 2 &&
            IsObject(schema.allOf[0]) &&
            TSchema(schema.allOf[0].not) &&
            TSchema(schema.allOf[1]));
    }
    TypeGuard.TNot = TNot;
    /** Returns true if the given schema is TNull */
    function TNull(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'Null' &&
            schema.type === 'null' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TNull = TNull;
    /** Returns true if the given schema is TNumber */
    function TNumber(schema) {
        return (TKind(schema) &&
            schema[exports.Kind] === 'Number' &&
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
        if (!(TKind(schema) &&
            schema[exports.Kind] === 'Object' &&
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
        return (TKind(schema) &&
            schema[exports.Kind] === 'Promise' &&
            schema.type === 'object' &&
            schema.instanceOf === 'Promise' &&
            IsOptionalString(schema.$id) &&
            TSchema(schema.item));
    }
    TypeGuard.TPromise = TPromise;
    /** Returns true if the given schema is TRecord */
    function TRecord(schema) {
        // prettier-ignore
        if (!(TKind(schema) &&
            schema[exports.Kind] === 'Record' &&
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
    /** Returns true if the given schema is TRef */
    function TRef(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'Ref' &&
            IsOptionalString(schema.$id) &&
            IsString(schema.$ref));
    }
    TypeGuard.TRef = TRef;
    /** Returns true if the given schema is TString */
    function TString(schema) {
        return (TKind(schema) &&
            schema[exports.Kind] === 'String' &&
            schema.type === 'string' &&
            IsOptionalString(schema.$id) &&
            IsOptionalNumber(schema.minLength) &&
            IsOptionalNumber(schema.maxLength) &&
            IsOptionalPattern(schema.pattern) &&
            IsOptionalFormat(schema.format));
    }
    TypeGuard.TString = TString;
    /** Returns true if the given schema is TSymbol */
    function TSymbol(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'Symbol' &&
            schema.type === 'null' &&
            schema.typeOf === 'Symbol' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TSymbol = TSymbol;
    /** Returns true if the given schema is TTemplateLiteral */
    function TTemplateLiteral(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'TemplateLiteral' &&
            schema.type === 'string' &&
            IsString(schema.pattern) &&
            schema.pattern[0] === '^' &&
            schema.pattern[schema.pattern.length - 1] === '$');
    }
    TypeGuard.TTemplateLiteral = TTemplateLiteral;
    /** Returns true if the given schema is TThis */
    function TThis(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'This' &&
            IsOptionalString(schema.$id) &&
            IsString(schema.$ref));
    }
    TypeGuard.TThis = TThis;
    /** Returns true if the given schema is TTuple */
    function TTuple(schema) {
        // prettier-ignore
        if (!(TKind(schema) &&
            schema[exports.Kind] === 'Tuple' &&
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
        return (TKind(schema) &&
            schema[exports.Kind] === 'Undefined' &&
            schema.type === 'null' &&
            schema.typeOf === 'Undefined' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TUndefined = TUndefined;
    /** Returns true if the given schema is TUnion */
    function TUnion(schema) {
        // prettier-ignore
        if (!(TKind(schema) &&
            schema[exports.Kind] === 'Union' &&
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
    /** Returns true if the given schema is TUnion<Literal<string>[]> */
    function TUnionLiteral(schema) {
        return TUnion(schema) && schema.anyOf.every((schema) => TLiteral(schema) && typeof schema.const === 'string');
    }
    TypeGuard.TUnionLiteral = TUnionLiteral;
    /** Returns true if the given schema is TUint8Array */
    function TUint8Array(schema) {
        return TKind(schema) && schema[exports.Kind] === 'Uint8Array' && schema.type === 'object' && IsOptionalString(schema.$id) && schema.instanceOf === 'Uint8Array' && IsOptionalNumber(schema.minByteLength) && IsOptionalNumber(schema.maxByteLength);
    }
    TypeGuard.TUint8Array = TUint8Array;
    /** Returns true if the given schema is TUnknown */
    function TUnknown(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'Unknown' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TUnknown = TUnknown;
    /** Returns true if the given schema is a raw TUnsafe */
    function TUnsafe(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'Unsafe');
    }
    TypeGuard.TUnsafe = TUnsafe;
    /** Returns true if the given schema is TVoid */
    function TVoid(schema) {
        // prettier-ignore
        return (TKind(schema) &&
            schema[exports.Kind] === 'Void' &&
            schema.type === 'null' &&
            schema.typeOf === 'Void' &&
            IsOptionalString(schema.$id));
    }
    TypeGuard.TVoid = TVoid;
    /** Returns true if this schema has the ReadonlyOptional modifier */
    function TReadonlyOptional(schema) {
        return IsObject(schema) && schema[exports.Modifier] === 'ReadonlyOptional';
    }
    TypeGuard.TReadonlyOptional = TReadonlyOptional;
    /** Returns true if this schema has the Readonly modifier */
    function TReadonly(schema) {
        return IsObject(schema) && schema[exports.Modifier] === 'Readonly';
    }
    TypeGuard.TReadonly = TReadonly;
    /** Returns true if this schema has the Optional modifier */
    function TOptional(schema) {
        return IsObject(schema) && schema[exports.Modifier] === 'Optional';
    }
    TypeGuard.TOptional = TOptional;
    /** Returns true if the given schema is TSchema */
    function TSchema(schema) {
        return (typeof schema === 'object' &&
            (TAny(schema) ||
                TArray(schema) ||
                TBoolean(schema) ||
                TBigInt(schema) ||
                TConstructor(schema) ||
                TDate(schema) ||
                TFunction(schema) ||
                TInteger(schema) ||
                TIntersect(schema) ||
                TLiteral(schema) ||
                TNever(schema) ||
                TNot(schema) ||
                TNull(schema) ||
                TNumber(schema) ||
                TObject(schema) ||
                TPromise(schema) ||
                TRecord(schema) ||
                TRef(schema) ||
                TString(schema) ||
                TSymbol(schema) ||
                TTemplateLiteral(schema) ||
                TThis(schema) ||
                TTuple(schema) ||
                TUndefined(schema) ||
                TUnion(schema) ||
                TUint8Array(schema) ||
                TUnknown(schema) ||
                TUnsafe(schema) ||
                TVoid(schema) ||
                (TKind(schema) && TypeRegistry.Has(schema[exports.Kind]))));
    }
    TypeGuard.TSchema = TSchema;
})(TypeGuard = exports.TypeGuard || (exports.TypeGuard = {}));
// --------------------------------------------------------------------------
// ExtendsUndefined
// --------------------------------------------------------------------------
/** Fast undefined check used for properties of type undefined */
var ExtendsUndefined;
(function (ExtendsUndefined) {
    function Check(schema) {
        if (schema[exports.Kind] === 'Undefined')
            return true;
        if (schema[exports.Kind] === 'Union') {
            const union = schema;
            return union.anyOf.some((schema) => Check(schema));
        }
        return false;
    }
    ExtendsUndefined.Check = Check;
})(ExtendsUndefined = exports.ExtendsUndefined || (exports.ExtendsUndefined = {}));
// --------------------------------------------------------------------------
// TypeExtends
// --------------------------------------------------------------------------
var TypeExtendsResult;
(function (TypeExtendsResult) {
    TypeExtendsResult[TypeExtendsResult["Union"] = 0] = "Union";
    TypeExtendsResult[TypeExtendsResult["True"] = 1] = "True";
    TypeExtendsResult[TypeExtendsResult["False"] = 2] = "False";
})(TypeExtendsResult = exports.TypeExtendsResult || (exports.TypeExtendsResult = {}));
var TypeExtends;
(function (TypeExtends) {
    // --------------------------------------------------------------------------
    // IntoBooleanResult
    // --------------------------------------------------------------------------
    function IntoBooleanResult(result) {
        return result === TypeExtendsResult.False ? TypeExtendsResult.False : TypeExtendsResult.True;
    }
    // --------------------------------------------------------------------------
    // Any
    // --------------------------------------------------------------------------
    function AnyRight(left, right) {
        return TypeExtendsResult.True;
    }
    function Any(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right) && right.anyOf.some((schema) => TypeGuard.TAny(schema) || TypeGuard.TUnknown(schema)))
            return TypeExtendsResult.True;
        if (TypeGuard.TUnion(right))
            return TypeExtendsResult.Union;
        if (TypeGuard.TUnknown(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TAny(right))
            return TypeExtendsResult.True;
        return TypeExtendsResult.Union;
    }
    // --------------------------------------------------------------------------
    // Array
    // --------------------------------------------------------------------------
    function ArrayRight(left, right) {
        if (TypeGuard.TUnknown(left))
            return TypeExtendsResult.False;
        if (TypeGuard.TAny(left))
            return TypeExtendsResult.Union;
        if (TypeGuard.TNever(left))
            return TypeExtendsResult.True;
        return TypeExtendsResult.False;
    }
    function Array(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right) && IsObjectArrayLike(right))
            return TypeExtendsResult.True;
        if (!TypeGuard.TArray(right))
            return TypeExtendsResult.False;
        return IntoBooleanResult(Visit(left.items, right.items));
    }
    // --------------------------------------------------------------------------
    // BigInt
    // --------------------------------------------------------------------------
    function BigInt(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TNever(right))
            return NeverRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        return TypeGuard.TBigInt(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Boolean
    // --------------------------------------------------------------------------
    function BooleanRight(left, right) {
        if (TypeGuard.TLiteral(left) && typeof left.const === 'boolean')
            return TypeExtendsResult.True;
        return TypeGuard.TBoolean(left) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    function Boolean(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TNever(right))
            return NeverRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        return TypeGuard.TBoolean(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Constructor
    // --------------------------------------------------------------------------
    function Constructor(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (!TypeGuard.TConstructor(right))
            return TypeExtendsResult.False;
        if (left.parameters.length > right.parameters.length)
            return TypeExtendsResult.False;
        if (!left.parameters.every((schema, index) => IntoBooleanResult(Visit(right.parameters[index], schema)) === TypeExtendsResult.True)) {
            return TypeExtendsResult.False;
        }
        return IntoBooleanResult(Visit(left.returns, right.returns));
    }
    // --------------------------------------------------------------------------
    // Date
    // --------------------------------------------------------------------------
    function Date(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        return TypeGuard.TDate(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Function
    // --------------------------------------------------------------------------
    function Function(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (!TypeGuard.TFunction(right))
            return TypeExtendsResult.False;
        if (left.parameters.length > right.parameters.length)
            return TypeExtendsResult.False;
        if (!left.parameters.every((schema, index) => IntoBooleanResult(Visit(right.parameters[index], schema)) === TypeExtendsResult.True)) {
            return TypeExtendsResult.False;
        }
        return IntoBooleanResult(Visit(left.returns, right.returns));
    }
    // --------------------------------------------------------------------------
    // Integer
    // --------------------------------------------------------------------------
    function IntegerRight(left, right) {
        if (TypeGuard.TLiteral(left) && typeof left.const === 'number')
            return TypeExtendsResult.True;
        return TypeGuard.TNumber(left) || TypeGuard.TInteger(left) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    function Integer(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TNever(right))
            return NeverRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        return TypeGuard.TInteger(right) || TypeGuard.TNumber(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Intersect
    // --------------------------------------------------------------------------
    function IntersectRight(left, right) {
        return right.allOf.every((schema) => Visit(left, schema) === TypeExtendsResult.True) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    function Intersect(left, right) {
        return left.allOf.some((schema) => Visit(schema, right) === TypeExtendsResult.True) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Literal
    // --------------------------------------------------------------------------
    function IsLiteralString(schema) {
        return typeof schema.const === 'string';
    }
    function IsLiteralNumber(schema) {
        return typeof schema.const === 'number';
    }
    function IsLiteralBoolean(schema) {
        return typeof schema.const === 'boolean';
    }
    function Literal(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TNever(right))
            return NeverRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        if (TypeGuard.TString(right))
            return StringRight(left, right);
        if (TypeGuard.TNumber(right))
            return NumberRight(left, right);
        if (TypeGuard.TInteger(right))
            return IntegerRight(left, right);
        if (TypeGuard.TBoolean(right))
            return BooleanRight(left, right);
        return TypeGuard.TLiteral(right) && right.const === left.const ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Never
    // --------------------------------------------------------------------------
    function NeverRight(left, right) {
        return TypeExtendsResult.False;
    }
    function Never(left, right) {
        return TypeExtendsResult.True;
    }
    // --------------------------------------------------------------------------
    // Null
    // --------------------------------------------------------------------------
    function Null(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TNever(right))
            return NeverRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        return TypeGuard.TNull(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Number
    // --------------------------------------------------------------------------
    function NumberRight(left, right) {
        if (TypeGuard.TLiteral(left) && IsLiteralNumber(left))
            return TypeExtendsResult.True;
        return TypeGuard.TNumber(left) || TypeGuard.TInteger(left) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    function Number(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TNever(right))
            return NeverRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        return TypeGuard.TInteger(right) || TypeGuard.TNumber(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Object
    // --------------------------------------------------------------------------
    function IsObjectPropertyCount(schema, count) {
        return globalThis.Object.keys(schema.properties).length === count;
    }
    function IsObjectStringLike(schema) {
        return IsObjectArrayLike(schema);
    }
    function IsObjectSymbolLike(schema) {
        // prettier-ignore
        return IsObjectPropertyCount(schema, 0) || (IsObjectPropertyCount(schema, 1) && 'description' in schema.properties && TypeGuard.TUnion(schema.properties.description) && schema.properties.description.anyOf.length === 2 && ((TypeGuard.TString(schema.properties.description.anyOf[0]) &&
            TypeGuard.TUndefined(schema.properties.description.anyOf[1])) || (TypeGuard.TString(schema.properties.description.anyOf[1]) &&
            TypeGuard.TUndefined(schema.properties.description.anyOf[0]))));
    }
    function IsObjectNumberLike(schema) {
        return IsObjectPropertyCount(schema, 0);
    }
    function IsObjectBooleanLike(schema) {
        return IsObjectPropertyCount(schema, 0);
    }
    function IsObjectBigIntLike(schema) {
        return IsObjectPropertyCount(schema, 0);
    }
    function IsObjectDateLike(schema) {
        return IsObjectPropertyCount(schema, 0);
    }
    function IsObjectUint8ArrayLike(schema) {
        return IsObjectArrayLike(schema);
    }
    function IsObjectFunctionLike(schema) {
        const length = exports.Type.Number();
        return IsObjectPropertyCount(schema, 0) || (IsObjectPropertyCount(schema, 1) && 'length' in schema.properties && IntoBooleanResult(Visit(schema.properties['length'], length)) === TypeExtendsResult.True);
    }
    function IsObjectConstructorLike(schema) {
        return IsObjectPropertyCount(schema, 0);
    }
    function IsObjectArrayLike(schema) {
        const length = exports.Type.Number();
        return IsObjectPropertyCount(schema, 0) || (IsObjectPropertyCount(schema, 1) && 'length' in schema.properties && IntoBooleanResult(Visit(schema.properties['length'], length)) === TypeExtendsResult.True);
    }
    function IsObjectPromiseLike(schema) {
        const then = exports.Type.Function([exports.Type.Any()], exports.Type.Any());
        return IsObjectPropertyCount(schema, 0) || (IsObjectPropertyCount(schema, 1) && 'then' in schema.properties && IntoBooleanResult(Visit(schema.properties['then'], then)) === TypeExtendsResult.True);
    }
    // --------------------------------------------------------------------------
    // Property
    // --------------------------------------------------------------------------
    function Property(left, right) {
        if (Visit(left, right) === TypeExtendsResult.False)
            return TypeExtendsResult.False;
        if (TypeGuard.TOptional(left) && !TypeGuard.TOptional(right))
            return TypeExtendsResult.False;
        return TypeExtendsResult.True;
    }
    function ObjectRight(left, right) {
        if (TypeGuard.TUnknown(left))
            return TypeExtendsResult.False;
        if (TypeGuard.TAny(left))
            return TypeExtendsResult.Union;
        if (TypeGuard.TNever(left))
            return TypeExtendsResult.True;
        if (TypeGuard.TLiteral(left) && IsLiteralString(left) && IsObjectStringLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TLiteral(left) && IsLiteralNumber(left) && IsObjectNumberLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TLiteral(left) && IsLiteralBoolean(left) && IsObjectBooleanLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TSymbol(left) && IsObjectSymbolLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TBigInt(left) && IsObjectBigIntLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TString(left) && IsObjectStringLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TSymbol(left) && IsObjectSymbolLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TNumber(left) && IsObjectNumberLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TInteger(left) && IsObjectNumberLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TBoolean(left) && IsObjectBooleanLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TUint8Array(left) && IsObjectUint8ArrayLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TDate(left) && IsObjectDateLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TConstructor(left) && IsObjectConstructorLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TFunction(left) && IsObjectFunctionLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TRecord(left) && TypeGuard.TString(RecordKey(left))) {
            // When expressing a Record with literal key values, the Record is converted into a Object with
            // the Hint assigned as `Record`. This is used to invert the extends logic.
            return right[exports.Hint] === 'Record' ? TypeExtendsResult.True : TypeExtendsResult.False;
        }
        if (TypeGuard.TRecord(left) && TypeGuard.TNumber(RecordKey(left))) {
            return IsObjectPropertyCount(right, 0) ? TypeExtendsResult.True : TypeExtendsResult.False;
        }
        return TypeExtendsResult.False;
    }
    function Object(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        if (!TypeGuard.TObject(right))
            return TypeExtendsResult.False;
        for (const key of globalThis.Object.keys(right.properties)) {
            if (!(key in left.properties))
                return TypeExtendsResult.False;
            if (Property(left.properties[key], right.properties[key]) === TypeExtendsResult.False) {
                return TypeExtendsResult.False;
            }
        }
        return TypeExtendsResult.True;
    }
    // --------------------------------------------------------------------------
    // Promise
    // --------------------------------------------------------------------------
    function Promise(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right) && IsObjectPromiseLike(right))
            return TypeExtendsResult.True;
        if (!TypeGuard.TPromise(right))
            return TypeExtendsResult.False;
        return IntoBooleanResult(Visit(left.item, right.item));
    }
    // --------------------------------------------------------------------------
    // Record
    // --------------------------------------------------------------------------
    function RecordKey(schema) {
        if (exports.PatternNumberExact in schema.patternProperties)
            return exports.Type.Number();
        if (exports.PatternStringExact in schema.patternProperties)
            return exports.Type.String();
        throw Error('TypeExtends: Cannot get record key');
    }
    function RecordValue(schema) {
        if (exports.PatternNumberExact in schema.patternProperties)
            return schema.patternProperties[exports.PatternNumberExact];
        if (exports.PatternStringExact in schema.patternProperties)
            return schema.patternProperties[exports.PatternStringExact];
        throw Error('TypeExtends: Cannot get record value');
    }
    function RecordRight(left, right) {
        const Key = RecordKey(right);
        const Value = RecordValue(right);
        if (TypeGuard.TLiteral(left) && IsLiteralString(left) && TypeGuard.TNumber(Key) && IntoBooleanResult(Visit(left, Value)) === TypeExtendsResult.True)
            return TypeExtendsResult.True;
        if (TypeGuard.TUint8Array(left) && TypeGuard.TNumber(Key))
            return Visit(left, Value);
        if (TypeGuard.TString(left) && TypeGuard.TNumber(Key))
            return Visit(left, Value);
        if (TypeGuard.TArray(left) && TypeGuard.TNumber(Key))
            return Visit(left, Value);
        if (TypeGuard.TObject(left)) {
            for (const key of globalThis.Object.keys(left.properties)) {
                if (Property(Value, left.properties[key]) === TypeExtendsResult.False) {
                    return TypeExtendsResult.False;
                }
            }
            return TypeExtendsResult.True;
        }
        return TypeExtendsResult.False;
    }
    function Record(left, right) {
        const Value = RecordValue(left);
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (!TypeGuard.TRecord(right))
            return TypeExtendsResult.False;
        return Visit(Value, RecordValue(right));
    }
    // --------------------------------------------------------------------------
    // String
    // --------------------------------------------------------------------------
    function StringRight(left, right) {
        if (TypeGuard.TLiteral(left) && typeof left.const === 'string')
            return TypeExtendsResult.True;
        return TypeGuard.TString(left) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    function String(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TNever(right))
            return NeverRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        return TypeGuard.TString(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Symbol
    // --------------------------------------------------------------------------
    function Symbol(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TNever(right))
            return NeverRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        return TypeGuard.TSymbol(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Tuple
    // --------------------------------------------------------------------------
    function TupleRight(left, right) {
        if (TypeGuard.TUnknown(left))
            return TypeExtendsResult.False;
        if (TypeGuard.TAny(left))
            return TypeExtendsResult.Union;
        if (TypeGuard.TNever(left))
            return TypeExtendsResult.True;
        return TypeExtendsResult.False;
    }
    function IsArrayOfTuple(left, right) {
        return TypeGuard.TArray(right) && left.items !== undefined && left.items.every((schema) => Visit(schema, right.items) === TypeExtendsResult.True);
    }
    function Tuple(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right) && IsObjectArrayLike(right))
            return TypeExtendsResult.True;
        if (TypeGuard.TArray(right) && IsArrayOfTuple(left, right))
            return TypeExtendsResult.True;
        if (!TypeGuard.TTuple(right))
            return TypeExtendsResult.False;
        if ((left.items === undefined && right.items !== undefined) || (left.items !== undefined && right.items === undefined))
            return TypeExtendsResult.False;
        if (left.items === undefined && right.items === undefined)
            return TypeExtendsResult.True;
        return left.items.every((schema, index) => Visit(schema, right.items[index]) === TypeExtendsResult.True) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Uint8Array
    // --------------------------------------------------------------------------
    function Uint8Array(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        return TypeGuard.TUint8Array(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Undefined
    // --------------------------------------------------------------------------
    function Undefined(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TNever(right))
            return NeverRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        if (TypeGuard.TRecord(right))
            return RecordRight(left, right);
        if (TypeGuard.TVoid(right))
            return VoidRight(left, right);
        return TypeGuard.TUndefined(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Union
    // --------------------------------------------------------------------------
    function UnionRight(left, right) {
        return right.anyOf.some((schema) => Visit(left, schema) === TypeExtendsResult.True) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    function Union(left, right) {
        return left.anyOf.every((schema) => Visit(schema, right) === TypeExtendsResult.True) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Unknown
    // --------------------------------------------------------------------------
    function UnknownRight(left, right) {
        return TypeExtendsResult.True;
    }
    function Unknown(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TString(right))
            return StringRight(left, right);
        if (TypeGuard.TNumber(right))
            return NumberRight(left, right);
        if (TypeGuard.TInteger(right))
            return IntegerRight(left, right);
        if (TypeGuard.TBoolean(right))
            return BooleanRight(left, right);
        if (TypeGuard.TArray(right))
            return ArrayRight(left, right);
        if (TypeGuard.TTuple(right))
            return TupleRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        return TypeGuard.TUnknown(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    // --------------------------------------------------------------------------
    // Void
    // --------------------------------------------------------------------------
    function VoidRight(left, right) {
        if (TypeGuard.TUndefined(left))
            return TypeExtendsResult.True;
        return TypeGuard.TUndefined(left) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    function Void(left, right) {
        if (TypeGuard.TIntersect(right))
            return IntersectRight(left, right);
        if (TypeGuard.TUnion(right))
            return UnionRight(left, right);
        if (TypeGuard.TUnknown(right))
            return UnknownRight(left, right);
        if (TypeGuard.TAny(right))
            return AnyRight(left, right);
        if (TypeGuard.TObject(right))
            return ObjectRight(left, right);
        return TypeGuard.TVoid(right) ? TypeExtendsResult.True : TypeExtendsResult.False;
    }
    function Visit(left, right) {
        // template union remap
        if (TypeGuard.TTemplateLiteral(left))
            return Visit(TemplateLiteralResolver.Resolve(left), right);
        if (TypeGuard.TTemplateLiteral(right))
            return Visit(left, TemplateLiteralResolver.Resolve(right));
        // standard extends
        if (TypeGuard.TAny(left))
            return Any(left, right);
        if (TypeGuard.TArray(left))
            return Array(left, right);
        if (TypeGuard.TBigInt(left))
            return BigInt(left, right);
        if (TypeGuard.TBoolean(left))
            return Boolean(left, right);
        if (TypeGuard.TConstructor(left))
            return Constructor(left, right);
        if (TypeGuard.TDate(left))
            return Date(left, right);
        if (TypeGuard.TFunction(left))
            return Function(left, right);
        if (TypeGuard.TInteger(left))
            return Integer(left, right);
        if (TypeGuard.TIntersect(left))
            return Intersect(left, right);
        if (TypeGuard.TLiteral(left))
            return Literal(left, right);
        if (TypeGuard.TNever(left))
            return Never(left, right);
        if (TypeGuard.TNull(left))
            return Null(left, right);
        if (TypeGuard.TNumber(left))
            return Number(left, right);
        if (TypeGuard.TObject(left))
            return Object(left, right);
        if (TypeGuard.TRecord(left))
            return Record(left, right);
        if (TypeGuard.TString(left))
            return String(left, right);
        if (TypeGuard.TSymbol(left))
            return Symbol(left, right);
        if (TypeGuard.TTuple(left))
            return Tuple(left, right);
        if (TypeGuard.TPromise(left))
            return Promise(left, right);
        if (TypeGuard.TUint8Array(left))
            return Uint8Array(left, right);
        if (TypeGuard.TUndefined(left))
            return Undefined(left, right);
        if (TypeGuard.TUnion(left))
            return Union(left, right);
        if (TypeGuard.TUnknown(left))
            return Unknown(left, right);
        if (TypeGuard.TVoid(left))
            return Void(left, right);
        throw Error(`TypeExtends: Unknown left type operand '${left[exports.Kind]}'`);
    }
    function Extends(left, right) {
        return Visit(left, right);
    }
    TypeExtends.Extends = Extends;
})(TypeExtends = exports.TypeExtends || (exports.TypeExtends = {}));
// --------------------------------------------------------------------------
// TypeClone
// --------------------------------------------------------------------------
/** Specialized Clone for Types */
var TypeClone;
(function (TypeClone) {
    function IsObject(value) {
        return typeof value === 'object' && value !== null;
    }
    function IsArray(value) {
        return globalThis.Array.isArray(value);
    }
    function Array(value) {
        return value.map((value) => Visit(value));
    }
    function Object(value) {
        const clonedProperties = globalThis.Object.getOwnPropertyNames(value).reduce((acc, key) => {
            return { ...acc, [key]: Visit(value[key]) };
        }, {});
        const clonedSymbols = globalThis.Object.getOwnPropertySymbols(value).reduce((acc, key) => {
            return { ...acc, [key]: Visit(value[key]) };
        }, {});
        return { ...clonedProperties, ...clonedSymbols };
    }
    function Visit(value) {
        if (IsArray(value))
            return Array(value);
        if (IsObject(value))
            return Object(value);
        return value;
    }
    /** Clones a type. */
    function Clone(schema, options) {
        return { ...Visit(schema), ...options };
    }
    TypeClone.Clone = Clone;
})(TypeClone = exports.TypeClone || (exports.TypeClone = {}));
// --------------------------------------------------------------------------
// ObjectMap
// --------------------------------------------------------------------------
var ObjectMap;
(function (ObjectMap) {
    function Intersect(schema, callback) {
        // prettier-ignore
        return exports.Type.Intersect(schema.allOf.map((inner) => Visit(inner, callback)), { ...schema });
    }
    function Union(schema, callback) {
        // prettier-ignore
        return exports.Type.Union(schema.anyOf.map((inner) => Visit(inner, callback)), { ...schema });
    }
    function Object(schema, callback) {
        return callback(schema);
    }
    function Visit(schema, callback) {
        // There are cases where users need to map objects with unregistered kinds. Using a TypeGuard here would
        // prevent sub schema mapping as unregistered kinds will not pass TSchema checks. This is notable in the
        // case of TObject where unregistered property kinds cause the TObject check to fail. As mapping is only
        // used for composition, we use explicit checks instead.
        if (schema[exports.Kind] === 'Intersect')
            return Intersect(schema, callback);
        if (schema[exports.Kind] === 'Union')
            return Union(schema, callback);
        if (schema[exports.Kind] === 'Object')
            return Object(schema, callback);
        return schema;
    }
    function Map(schema, callback, options) {
        return { ...Visit(TypeClone.Clone(schema, {}), callback), ...options };
    }
    ObjectMap.Map = Map;
})(ObjectMap = exports.ObjectMap || (exports.ObjectMap = {}));
// --------------------------------------------------------------------------
// KeyResolver
// --------------------------------------------------------------------------
var KeyResolver;
(function (KeyResolver) {
    function IsKeyable(schema) {
        return TypeGuard.TIntersect(schema) || TypeGuard.TUnion(schema) || (TypeGuard.TObject(schema) && globalThis.Object.getOwnPropertyNames(schema.properties).length > 0);
    }
    function Intersect(schema) {
        return [...schema.allOf.filter((schema) => IsKeyable(schema)).reduce((set, schema) => Visit(schema).map((key) => set.add(key))[0], new Set())];
    }
    function Union(schema) {
        const sets = schema.anyOf.filter((schema) => IsKeyable(schema)).map((inner) => Visit(inner));
        return [...sets.reduce((set, outer) => outer.map((key) => (sets.every((inner) => inner.includes(key)) ? set.add(key) : set))[0], new Set())];
    }
    function Object(schema) {
        return globalThis.Object.keys(schema.properties);
    }
    function Visit(schema) {
        if (TypeGuard.TIntersect(schema))
            return Intersect(schema);
        if (TypeGuard.TUnion(schema))
            return Union(schema);
        if (TypeGuard.TObject(schema))
            return Object(schema);
        return [];
    }
    function Resolve(schema) {
        return Visit(schema);
    }
    KeyResolver.Resolve = Resolve;
})(KeyResolver = exports.KeyResolver || (exports.KeyResolver = {}));
// --------------------------------------------------------------------------
// TemplateLiteralPattern
// --------------------------------------------------------------------------
var TemplateLiteralPattern;
(function (TemplateLiteralPattern) {
    function Escape(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    function Visit(schema, acc) {
        if (TypeGuard.TTemplateLiteral(schema)) {
            const pattern = schema.pattern.slice(1, schema.pattern.length - 1);
            return pattern;
        }
        else if (TypeGuard.TUnion(schema)) {
            const tokens = schema.anyOf.map((schema) => Visit(schema, acc)).join('|');
            return `(${tokens})`;
        }
        else if (TypeGuard.TNumber(schema)) {
            return `${acc}${exports.PatternNumber}`;
        }
        else if (TypeGuard.TInteger(schema)) {
            return `${acc}${exports.PatternNumber}`;
        }
        else if (TypeGuard.TBigInt(schema)) {
            return `${acc}${exports.PatternNumber}`;
        }
        else if (TypeGuard.TString(schema)) {
            return `${acc}${exports.PatternString}`;
        }
        else if (TypeGuard.TLiteral(schema)) {
            return `${acc}${Escape(schema.const.toString())}`;
        }
        else if (TypeGuard.TBoolean(schema)) {
            return `${acc}${exports.PatternBoolean}`;
        }
        else if (TypeGuard.TNever(schema)) {
            throw Error('TemplateLiteralPattern: TemplateLiteral cannot operate on types of TNever');
        }
        else {
            throw Error(`TemplateLiteralPattern: Unexpected Kind '${schema[exports.Kind]}'`);
        }
    }
    function Create(kinds) {
        return `^${kinds.map((schema) => Visit(schema, '')).join('')}\$`;
    }
    TemplateLiteralPattern.Create = Create;
})(TemplateLiteralPattern = exports.TemplateLiteralPattern || (exports.TemplateLiteralPattern = {}));
// --------------------------------------------------------------------------------------
// TemplateLiteralResolver
// --------------------------------------------------------------------------------------
var TemplateLiteralResolver;
(function (TemplateLiteralResolver) {
    function Resolve(template) {
        const expression = TemplateLiteralParser.ParseExact(template.pattern);
        if (!TemplateLiteralFinite.Check(expression))
            return exports.Type.String();
        const literals = [...TemplateLiteralGenerator.Generate(expression)].map((value) => exports.Type.Literal(value));
        return exports.Type.Union(literals);
    }
    TemplateLiteralResolver.Resolve = Resolve;
})(TemplateLiteralResolver = exports.TemplateLiteralResolver || (exports.TemplateLiteralResolver = {}));
// --------------------------------------------------------------------------------------
// TemplateLiteralParser
// --------------------------------------------------------------------------------------
class TemplateLiteralParserError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.TemplateLiteralParserError = TemplateLiteralParserError;
var TemplateLiteralParser;
(function (TemplateLiteralParser) {
    function IsNonEscaped(pattern, index, char) {
        return pattern[index] === char && pattern.charCodeAt(index - 1) !== 92;
    }
    function IsOpenParen(pattern, index) {
        return IsNonEscaped(pattern, index, '(');
    }
    function IsCloseParen(pattern, index) {
        return IsNonEscaped(pattern, index, ')');
    }
    function IsSeparator(pattern, index) {
        return IsNonEscaped(pattern, index, '|');
    }
    function IsGroup(pattern) {
        if (!(IsOpenParen(pattern, 0) && IsCloseParen(pattern, pattern.length - 1)))
            return false;
        let count = 0;
        for (let index = 0; index < pattern.length; index++) {
            if (IsOpenParen(pattern, index))
                count += 1;
            if (IsCloseParen(pattern, index))
                count -= 1;
            if (count === 0 && index !== pattern.length - 1)
                return false;
        }
        return true;
    }
    function InGroup(pattern) {
        return pattern.slice(1, pattern.length - 1);
    }
    function IsPrecedenceOr(pattern) {
        let count = 0;
        for (let index = 0; index < pattern.length; index++) {
            if (IsOpenParen(pattern, index))
                count += 1;
            if (IsCloseParen(pattern, index))
                count -= 1;
            if (IsSeparator(pattern, index) && count === 0)
                return true;
        }
        return false;
    }
    function IsPrecedenceAnd(pattern) {
        for (let index = 0; index < pattern.length; index++) {
            if (IsOpenParen(pattern, index))
                return true;
        }
        return false;
    }
    function Or(pattern) {
        let [count, start] = [0, 0];
        const expressions = [];
        for (let index = 0; index < pattern.length; index++) {
            if (IsOpenParen(pattern, index))
                count += 1;
            if (IsCloseParen(pattern, index))
                count -= 1;
            if (IsSeparator(pattern, index) && count === 0) {
                const range = pattern.slice(start, index);
                if (range.length > 0)
                    expressions.push(Parse(range));
                start = index + 1;
            }
        }
        const range = pattern.slice(start);
        if (range.length > 0)
            expressions.push(Parse(range));
        if (expressions.length === 0)
            return { type: 'const', const: '' };
        if (expressions.length === 1)
            return expressions[0];
        return { type: 'or', expr: expressions };
    }
    function And(pattern) {
        function Group(value, index) {
            if (!IsOpenParen(value, index))
                throw new TemplateLiteralParserError(`TemplateLiteralParser: Index must point to open parens`);
            let count = 0;
            for (let scan = index; scan < value.length; scan++) {
                if (IsOpenParen(value, scan))
                    count += 1;
                if (IsCloseParen(value, scan))
                    count -= 1;
                if (count === 0)
                    return [index, scan];
            }
            throw new TemplateLiteralParserError(`TemplateLiteralParser: Unclosed group parens in expression`);
        }
        function Range(pattern, index) {
            for (let scan = index; scan < pattern.length; scan++) {
                if (IsOpenParen(pattern, scan))
                    return [index, scan];
            }
            return [index, pattern.length];
        }
        const expressions = [];
        for (let index = 0; index < pattern.length; index++) {
            if (IsOpenParen(pattern, index)) {
                const [start, end] = Group(pattern, index);
                const range = pattern.slice(start, end + 1);
                expressions.push(Parse(range));
                index = end;
            }
            else {
                const [start, end] = Range(pattern, index);
                const range = pattern.slice(start, end);
                if (range.length > 0)
                    expressions.push(Parse(range));
                index = end - 1;
            }
        }
        if (expressions.length === 0)
            return { type: 'const', const: '' };
        if (expressions.length === 1)
            return expressions[0];
        return { type: 'and', expr: expressions };
    }
    /** Parses a pattern and returns an expression tree */
    function Parse(pattern) {
        if (IsGroup(pattern))
            return Parse(InGroup(pattern));
        if (IsPrecedenceOr(pattern))
            return Or(pattern);
        if (IsPrecedenceAnd(pattern))
            return And(pattern);
        return { type: 'const', const: pattern };
    }
    TemplateLiteralParser.Parse = Parse;
    /** Parses a pattern and strips forward and trailing ^ and $ */
    function ParseExact(pattern) {
        return Parse(pattern.slice(1, pattern.length - 1));
    }
    TemplateLiteralParser.ParseExact = ParseExact;
})(TemplateLiteralParser = exports.TemplateLiteralParser || (exports.TemplateLiteralParser = {}));
// --------------------------------------------------------------------------------------
// TemplateLiteralFinite
// --------------------------------------------------------------------------------------
var TemplateLiteralFinite;
(function (TemplateLiteralFinite) {
    function IsNumber(expression) {
        // prettier-ignore
        return (expression.type === 'or' &&
            expression.expr.length === 2 &&
            expression.expr[0].type === 'const' &&
            expression.expr[0].const === '0' &&
            expression.expr[1].type === 'const' &&
            expression.expr[1].const === '[1-9][0-9]*');
    }
    function IsBoolean(expression) {
        // prettier-ignore
        return (expression.type === 'or' &&
            expression.expr.length === 2 &&
            expression.expr[0].type === 'const' &&
            expression.expr[0].const === 'true' &&
            expression.expr[1].type === 'const' &&
            expression.expr[1].const === 'false');
    }
    function IsString(expression) {
        return expression.type === 'const' && expression.const === '.*';
    }
    function Check(expression) {
        if (IsBoolean(expression))
            return true;
        if (IsNumber(expression) || IsString(expression))
            return false;
        if (expression.type === 'and')
            return expression.expr.every((expr) => Check(expr));
        if (expression.type === 'or')
            return expression.expr.every((expr) => Check(expr));
        if (expression.type === 'const')
            return true;
        throw Error(`TemplateLiteralFinite: Unknown expression type`);
    }
    TemplateLiteralFinite.Check = Check;
})(TemplateLiteralFinite = exports.TemplateLiteralFinite || (exports.TemplateLiteralFinite = {}));
// --------------------------------------------------------------------------------------
// TemplateLiteralGenerator
// --------------------------------------------------------------------------------------
var TemplateLiteralGenerator;
(function (TemplateLiteralGenerator) {
    function* Reduce(buffer) {
        if (buffer.length === 1)
            return yield* buffer[0];
        for (const left of buffer[0]) {
            for (const right of Reduce(buffer.slice(1))) {
                yield `${left}${right}`;
            }
        }
    }
    function* And(expression) {
        return yield* Reduce(expression.expr.map((expr) => [...Generate(expr)]));
    }
    function* Or(expression) {
        for (const expr of expression.expr)
            yield* Generate(expr);
    }
    function* Const(expression) {
        return yield expression.const;
    }
    function* Generate(expression) {
        if (expression.type === 'and')
            return yield* And(expression);
        if (expression.type === 'or')
            return yield* Or(expression);
        if (expression.type === 'const')
            return yield* Const(expression);
        throw Error('TemplateLiteralGenerator: Unknown expression');
    }
    TemplateLiteralGenerator.Generate = Generate;
})(TemplateLiteralGenerator = exports.TemplateLiteralGenerator || (exports.TemplateLiteralGenerator = {}));
// --------------------------------------------------------------------------
// TypeOrdinal: Used for auto $id generation
// --------------------------------------------------------------------------
let TypeOrdinal = 0;
// --------------------------------------------------------------------------
// TypeBuilder
// --------------------------------------------------------------------------
class TypeBuilder {
    /** `[Utility]` Creates a schema without `static` and `params` types */
    Create(schema) {
        return schema;
    }
    /** `[Standard]` Omits compositing symbols from this schema */
    Strict(schema) {
        return JSON.parse(JSON.stringify(schema));
    }
}
exports.TypeBuilder = TypeBuilder;
// --------------------------------------------------------------------------
// StandardTypeBuilder
// --------------------------------------------------------------------------
class StandardTypeBuilder extends TypeBuilder {
    // ------------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------------
    /** `[Modifier]` Creates a Optional property */
    Optional(schema) {
        return { [exports.Modifier]: 'Optional', ...TypeClone.Clone(schema, {}) };
    }
    /** `[Modifier]` Creates a ReadonlyOptional property */
    ReadonlyOptional(schema) {
        return { [exports.Modifier]: 'ReadonlyOptional', ...TypeClone.Clone(schema, {}) };
    }
    /** `[Modifier]` Creates a Readonly object or property */
    Readonly(schema) {
        return { [exports.Modifier]: 'Readonly', ...schema };
    }
    // ------------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------------
    /** `[Standard]` Creates an Any type */
    Any(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Any' });
    }
    /** `[Standard]` Creates an Array type */
    Array(items, options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Array', type: 'array', items: TypeClone.Clone(items, {}) });
    }
    /** `[Standard]` Creates a Boolean type */
    Boolean(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Boolean', type: 'boolean' });
    }
    /** `[Standard]` Creates a Composite object type. */
    Composite(objects, options) {
        const isOptionalAll = (objects, key) => objects.every((object) => !(key in object.properties) || IsOptional(object.properties[key]));
        const IsOptional = (schema) => TypeGuard.TOptional(schema) || TypeGuard.TReadonlyOptional(schema);
        const [required, optional] = [new Set(), new Set()];
        for (const object of objects) {
            for (const key of globalThis.Object.getOwnPropertyNames(object.properties)) {
                if (isOptionalAll(objects, key))
                    optional.add(key);
            }
        }
        for (const object of objects) {
            for (const key of globalThis.Object.getOwnPropertyNames(object.properties)) {
                if (!optional.has(key))
                    required.add(key);
            }
        }
        const properties = {};
        for (const object of objects) {
            for (const [key, schema] of Object.entries(object.properties)) {
                const property = TypeClone.Clone(schema, {});
                if (!optional.has(key))
                    delete property[exports.Modifier];
                if (key in properties) {
                    const left = TypeExtends.Extends(properties[key], property) !== TypeExtendsResult.False;
                    const right = TypeExtends.Extends(property, properties[key]) !== TypeExtendsResult.False;
                    if (!left && !right)
                        properties[key] = exports.Type.Never();
                    if (!left && right)
                        properties[key] = property;
                }
                else {
                    properties[key] = property;
                }
            }
        }
        if (required.size > 0) {
            return this.Create({ ...options, [exports.Kind]: 'Object', [exports.Hint]: 'Composite', type: 'object', properties, required: [...required] });
        }
        else {
            return this.Create({ ...options, [exports.Kind]: 'Object', [exports.Hint]: 'Composite', type: 'object', properties });
        }
    }
    /** `[Standard]` Creates a Enum type */
    Enum(item, options = {}) {
        // prettier-ignore
        const values = globalThis.Object.keys(item).filter((key) => isNaN(key)).map((key) => item[key]);
        const anyOf = values.map((value) => (typeof value === 'string' ? { [exports.Kind]: 'Literal', type: 'string', const: value } : { [exports.Kind]: 'Literal', type: 'number', const: value }));
        return this.Create({ ...options, [exports.Kind]: 'Union', anyOf });
    }
    /** `[Standard]` A conditional type expression that will return the true type if the left type extends the right */
    Extends(left, right, trueType, falseType, options = {}) {
        switch (TypeExtends.Extends(left, right)) {
            case TypeExtendsResult.Union:
                return this.Union([TypeClone.Clone(trueType, options), TypeClone.Clone(falseType, options)]);
            case TypeExtendsResult.True:
                return TypeClone.Clone(trueType, options);
            case TypeExtendsResult.False:
                return TypeClone.Clone(falseType, options);
        }
    }
    /** `[Standard]` Excludes from the left type any type that is not assignable to the right */
    Exclude(left, right, options = {}) {
        if (TypeGuard.TTemplateLiteral(left))
            return this.Exclude(TemplateLiteralResolver.Resolve(left), right, options);
        if (TypeGuard.TTemplateLiteral(right))
            return this.Exclude(left, TemplateLiteralResolver.Resolve(right), options);
        if (TypeGuard.TUnion(left)) {
            const narrowed = left.anyOf.filter((inner) => TypeExtends.Extends(inner, right) === TypeExtendsResult.False);
            return (narrowed.length === 1 ? TypeClone.Clone(narrowed[0], options) : this.Union(narrowed, options));
        }
        else {
            return (TypeExtends.Extends(left, right) !== TypeExtendsResult.False ? this.Never(options) : TypeClone.Clone(left, options));
        }
    }
    /** `[Standard]` Extracts from the left type any type that is assignable to the right */
    Extract(left, right, options = {}) {
        if (TypeGuard.TTemplateLiteral(left))
            return this.Extract(TemplateLiteralResolver.Resolve(left), right, options);
        if (TypeGuard.TTemplateLiteral(right))
            return this.Extract(left, TemplateLiteralResolver.Resolve(right), options);
        if (TypeGuard.TUnion(left)) {
            const narrowed = left.anyOf.filter((inner) => TypeExtends.Extends(inner, right) !== TypeExtendsResult.False);
            return (narrowed.length === 1 ? TypeClone.Clone(narrowed[0], options) : this.Union(narrowed, options));
        }
        else {
            return (TypeExtends.Extends(left, right) !== TypeExtendsResult.False ? TypeClone.Clone(left, options) : this.Never(options));
        }
    }
    /** `[Standard]` Creates an Integer type */
    Integer(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Integer', type: 'integer' });
    }
    Intersect(allOf, options = {}) {
        if (allOf.length === 0)
            return exports.Type.Never();
        if (allOf.length === 1)
            return TypeClone.Clone(allOf[0], options);
        const objects = allOf.every((schema) => TypeGuard.TObject(schema));
        const cloned = allOf.map((schema) => TypeClone.Clone(schema, {}));
        const clonedUnevaluatedProperties = TypeGuard.TSchema(options.unevaluatedProperties) ? { unevaluatedProperties: TypeClone.Clone(options.unevaluatedProperties, {}) } : {};
        if (options.unevaluatedProperties === false || TypeGuard.TSchema(options.unevaluatedProperties) || objects) {
            return this.Create({ ...options, ...clonedUnevaluatedProperties, [exports.Kind]: 'Intersect', type: 'object', allOf: cloned });
        }
        else {
            return this.Create({ ...options, ...clonedUnevaluatedProperties, [exports.Kind]: 'Intersect', allOf: cloned });
        }
    }
    /** `[Standard]` Creates a KeyOf type */
    KeyOf(schema, options = {}) {
        if (TypeGuard.TRecord(schema)) {
            const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
            if (pattern === exports.PatternNumberExact)
                return this.Number(options);
            if (pattern === exports.PatternStringExact)
                return this.String(options);
            throw Error('StandardTypeBuilder: Unable to resolve key type from Record key pattern');
        }
        else {
            const resolved = KeyResolver.Resolve(schema);
            if (resolved.length === 0)
                return this.Never(options);
            const literals = resolved.map((key) => this.Literal(key));
            return this.Union(literals, options);
        }
    }
    /** `[Standard]` Creates a Literal type */
    Literal(value, options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Literal', const: value, type: typeof value });
    }
    /** `[Standard]` Creates a Never type */
    Never(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Never', not: {} });
    }
    /** `[Standard]` Creates a Not type. The first argument is the disallowed type, the second is the allowed. */
    Not(not, schema, options) {
        return this.Create({ ...options, [exports.Kind]: 'Not', allOf: [{ not: TypeClone.Clone(not, {}) }, TypeClone.Clone(schema, {})] });
    }
    /** `[Standard]` Creates a Null type */
    Null(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Null', type: 'null' });
    }
    /** `[Standard]` Creates a Number type */
    Number(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Number', type: 'number' });
    }
    /** `[Standard]` Creates an Object type */
    Object(properties, options = {}) {
        const propertyKeys = globalThis.Object.getOwnPropertyNames(properties);
        const optionalKeys = propertyKeys.filter((key) => TypeGuard.TOptional(properties[key]) || TypeGuard.TReadonlyOptional(properties[key]));
        const requiredKeys = propertyKeys.filter((name) => !optionalKeys.includes(name));
        const clonedAdditionalProperties = TypeGuard.TSchema(options.additionalProperties) ? { additionalProperties: TypeClone.Clone(options.additionalProperties, {}) } : {};
        const clonedProperties = propertyKeys.reduce((acc, key) => ({ ...acc, [key]: TypeClone.Clone(properties[key], {}) }), {});
        if (requiredKeys.length > 0) {
            return this.Create({ ...options, ...clonedAdditionalProperties, [exports.Kind]: 'Object', type: 'object', properties: clonedProperties, required: requiredKeys });
        }
        else {
            return this.Create({ ...options, ...clonedAdditionalProperties, [exports.Kind]: 'Object', type: 'object', properties: clonedProperties });
        }
    }
    Omit(schema, unresolved, options = {}) {
        // prettier-ignore
        const keys = TypeGuard.TUnionLiteral(unresolved) ? unresolved.anyOf.map((schema) => schema.const) :
            TypeGuard.TLiteral(unresolved) ? [unresolved.const] :
                TypeGuard.TNever(unresolved) ? [] :
                    unresolved;
        // prettier-ignore
        return ObjectMap.Map(TypeClone.Clone(schema, {}), (schema) => {
            if (schema.required) {
                schema.required = schema.required.filter((key) => !keys.includes(key));
                if (schema.required.length === 0)
                    delete schema.required;
            }
            for (const key of globalThis.Object.keys(schema.properties)) {
                if (keys.includes(key))
                    delete schema.properties[key];
            }
            return this.Create(schema);
        }, options);
    }
    /** `[Standard]` Creates a mapped type where all properties are Optional */
    Partial(schema, options = {}) {
        function Apply(schema) {
            // prettier-ignore
            switch (schema[exports.Modifier]) {
                case 'ReadonlyOptional':
                    schema[exports.Modifier] = 'ReadonlyOptional';
                    break;
                case 'Readonly':
                    schema[exports.Modifier] = 'ReadonlyOptional';
                    break;
                case 'Optional':
                    schema[exports.Modifier] = 'Optional';
                    break;
                default:
                    schema[exports.Modifier] = 'Optional';
                    break;
            }
        }
        // prettier-ignore
        return ObjectMap.Map(TypeClone.Clone(schema, {}), (schema) => {
            delete schema.required;
            globalThis.Object.keys(schema.properties).forEach(key => Apply(schema.properties[key]));
            return schema;
        }, options);
    }
    Pick(schema, unresolved, options = {}) {
        // prettier-ignore
        const keys = TypeGuard.TUnionLiteral(unresolved) ? unresolved.anyOf.map((schema) => schema.const) :
            TypeGuard.TLiteral(unresolved) ? [unresolved.const] :
                TypeGuard.TNever(unresolved) ? [] :
                    unresolved;
        // prettier-ignore
        return ObjectMap.Map(TypeClone.Clone(schema, {}), (schema) => {
            if (schema.required) {
                schema.required = schema.required.filter((key) => keys.includes(key));
                if (schema.required.length === 0)
                    delete schema.required;
            }
            for (const key of globalThis.Object.keys(schema.properties)) {
                if (!keys.includes(key))
                    delete schema.properties[key];
            }
            return this.Create(schema);
        }, options);
    }
    /** `[Standard]` Creates a Record type */
    Record(key, schema, options = {}) {
        if (TypeGuard.TTemplateLiteral(key)) {
            const expression = TemplateLiteralParser.ParseExact(key.pattern);
            // prettier-ignore
            return TemplateLiteralFinite.Check(expression)
                ? (this.Object([...TemplateLiteralGenerator.Generate(expression)].reduce((acc, key) => ({ ...acc, [key]: TypeClone.Clone(schema, {}) }), {}), options))
                : this.Create({ ...options, [exports.Kind]: 'Record', type: 'object', patternProperties: { [key.pattern]: TypeClone.Clone(schema, {}) }, additionalProperties: false });
        }
        else if (TypeGuard.TUnionLiteral(key)) {
            if (key.anyOf.every((schema) => TypeGuard.TLiteral(schema) && (typeof schema.const === 'string' || typeof schema.const === 'number'))) {
                const properties = key.anyOf.reduce((acc, literal) => ({ ...acc, [literal.const]: TypeClone.Clone(schema, {}) }), {});
                return this.Object(properties, { ...options, [exports.Hint]: 'Record' });
            }
            else
                throw Error('TypeBuilder: Record key can only be derived from union literal of number or string');
        }
        else if (TypeGuard.TLiteral(key)) {
            if (typeof key.const === 'string' || typeof key.const === 'number') {
                return this.Object({ [key.const]: TypeClone.Clone(schema, {}) }, options);
            }
            else
                throw Error('TypeBuilder: Record key can only be derived from literals of number or string');
        }
        else if (TypeGuard.TInteger(key) || TypeGuard.TNumber(key)) {
            const pattern = exports.PatternNumberExact;
            return this.Create({ ...options, [exports.Kind]: 'Record', type: 'object', patternProperties: { [pattern]: TypeClone.Clone(schema, {}) }, additionalProperties: false });
        }
        else if (TypeGuard.TString(key)) {
            const pattern = key.pattern === undefined ? exports.PatternStringExact : key.pattern;
            return this.Create({ ...options, [exports.Kind]: 'Record', type: 'object', patternProperties: { [pattern]: TypeClone.Clone(schema, {}) }, additionalProperties: false });
        }
        else {
            throw Error(`StandardTypeBuilder: Invalid Record Key`);
        }
    }
    /** `[Standard]` Creates a Recursive type */
    Recursive(callback, options = {}) {
        if (options.$id === undefined)
            options.$id = `T${TypeOrdinal++}`;
        const thisType = callback({ [exports.Kind]: 'This', $ref: `${options.$id}` });
        thisType.$id = options.$id;
        return this.Create({ ...options, [exports.Hint]: 'Recursive', ...thisType });
    }
    /** `[Standard]` Creates a Ref type. The referenced type must contain a $id */
    Ref(schema, options = {}) {
        if (schema.$id === undefined)
            throw Error('StandardTypeBuilder.Ref: Target type must specify an $id');
        return this.Create({ ...options, [exports.Kind]: 'Ref', $ref: schema.$id });
    }
    /** `[Standard]` Creates a mapped type where all properties are Required */
    Required(schema, options = {}) {
        function Apply(schema) {
            // prettier-ignore
            switch (schema[exports.Modifier]) {
                case 'ReadonlyOptional':
                    schema[exports.Modifier] = 'Readonly';
                    break;
                case 'Readonly':
                    schema[exports.Modifier] = 'Readonly';
                    break;
                case 'Optional':
                    delete schema[exports.Modifier];
                    break;
                default:
                    delete schema[exports.Modifier];
                    break;
            }
        }
        // prettier-ignore
        return ObjectMap.Map(TypeClone.Clone(schema, {}), (schema) => {
            schema.required = globalThis.Object.keys(schema.properties);
            globalThis.Object.keys(schema.properties).forEach(key => Apply(schema.properties[key]));
            return schema;
        }, options);
    }
    /** `[Standard]` Creates a String type */
    String(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'String', type: 'string' });
    }
    /** `[Standard]` Creates a template literal type */
    TemplateLiteral(kinds, options = {}) {
        const pattern = TemplateLiteralPattern.Create(kinds);
        return this.Create({ ...options, [exports.Kind]: 'TemplateLiteral', type: 'string', pattern });
    }
    /** `[Standard]` Creates a Tuple type */
    Tuple(items, options = {}) {
        const [additionalItems, minItems, maxItems] = [false, items.length, items.length];
        const clonedItems = items.map((item) => TypeClone.Clone(item, {}));
        // prettier-ignore
        const schema = (items.length > 0 ?
            { ...options, [exports.Kind]: 'Tuple', type: 'array', items: clonedItems, additionalItems, minItems, maxItems } :
            { ...options, [exports.Kind]: 'Tuple', type: 'array', minItems, maxItems });
        return this.Create(schema);
    }
    Union(union, options = {}) {
        if (TypeGuard.TTemplateLiteral(union)) {
            return TemplateLiteralResolver.Resolve(union);
        }
        else {
            const anyOf = union;
            if (anyOf.length === 0)
                return this.Never(options);
            if (anyOf.length === 1)
                return this.Create(TypeClone.Clone(anyOf[0], options));
            const clonedAnyOf = anyOf.map((schema) => TypeClone.Clone(schema, {}));
            return this.Create({ ...options, [exports.Kind]: 'Union', anyOf: clonedAnyOf });
        }
    }
    /** `[Standard]` Creates an Unknown type */
    Unknown(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Unknown' });
    }
    /** `[Standard]` Creates a Unsafe type that infers for the generic argument */
    Unsafe(options = {}) {
        return this.Create({ ...options, [exports.Kind]: options[exports.Kind] || 'Unsafe' });
    }
}
exports.StandardTypeBuilder = StandardTypeBuilder;
// --------------------------------------------------------------------------
// ExtendedTypeBuilder
// --------------------------------------------------------------------------
class ExtendedTypeBuilder extends StandardTypeBuilder {
    /** `[Extended]` Creates a BigInt type */
    BigInt(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'BigInt', type: 'null', typeOf: 'BigInt' });
    }
    /** `[Extended]` Extracts the ConstructorParameters from the given Constructor type */
    ConstructorParameters(schema, options = {}) {
        return this.Tuple([...schema.parameters], { ...options });
    }
    Constructor(parameters, returns, options = {}) {
        const clonedReturns = TypeClone.Clone(returns, {});
        if (TypeGuard.TTuple(parameters)) {
            const clonedParameters = parameters.items === undefined ? [] : parameters.items.map((parameter) => TypeClone.Clone(parameter, {}));
            return this.Create({ ...options, [exports.Kind]: 'Constructor', type: 'object', instanceOf: 'Constructor', parameters: clonedParameters, returns: clonedReturns });
        }
        else if (globalThis.Array.isArray(parameters)) {
            const clonedParameters = parameters.map((parameter) => TypeClone.Clone(parameter, {}));
            return this.Create({ ...options, [exports.Kind]: 'Constructor', type: 'object', instanceOf: 'Constructor', parameters: clonedParameters, returns: clonedReturns });
        }
        else {
            throw new Error('ExtendedTypeBuilder.Constructor: Invalid parameters');
        }
    }
    /** `[Extended]` Creates a Date type */
    Date(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Date', type: 'object', instanceOf: 'Date' });
    }
    Function(parameters, returns, options = {}) {
        const clonedReturns = TypeClone.Clone(returns, {});
        if (TypeGuard.TTuple(parameters)) {
            const clonedParameters = parameters.items === undefined ? [] : parameters.items.map((parameter) => TypeClone.Clone(parameter, {}));
            return this.Create({ ...options, [exports.Kind]: 'Function', type: 'object', instanceOf: 'Function', parameters: clonedParameters, returns: clonedReturns });
        }
        else if (globalThis.Array.isArray(parameters)) {
            const clonedParameters = parameters.map((parameter) => TypeClone.Clone(parameter, {}));
            return this.Create({ ...options, [exports.Kind]: 'Function', type: 'object', instanceOf: 'Function', parameters: clonedParameters, returns: clonedReturns });
        }
        else {
            throw new Error('ExtendedTypeBuilder.Function: Invalid parameters');
        }
    }
    /** `[Extended]` Extracts the InstanceType from the given Constructor */
    InstanceType(schema, options = {}) {
        return TypeClone.Clone(schema.returns, options);
    }
    /** `[Extended]` Extracts the Parameters from the given Function type */
    Parameters(schema, options = {}) {
        return this.Tuple(schema.parameters, { ...options });
    }
    /** `[Extended]` Creates a Promise type */
    Promise(item, options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Promise', type: 'object', instanceOf: 'Promise', item: TypeClone.Clone(item, {}) });
    }
    /** `[Extended]` Creates a regular expression type */
    RegEx(regex, options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'String', type: 'string', pattern: regex.source });
    }
    /** `[Extended]` Extracts the ReturnType from the given Function */
    ReturnType(schema, options = {}) {
        return TypeClone.Clone(schema.returns, options);
    }
    /** `[Extended]` Creates a Symbol type */
    Symbol(options) {
        return this.Create({ ...options, [exports.Kind]: 'Symbol', type: 'null', typeOf: 'Symbol' });
    }
    /** `[Extended]` Creates a Undefined type */
    Undefined(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Undefined', type: 'null', typeOf: 'Undefined' });
    }
    /** `[Extended]` Creates a Uint8Array type */
    Uint8Array(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Uint8Array', type: 'object', instanceOf: 'Uint8Array' });
    }
    /** `[Extended]` Creates a Void type */
    Void(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Void', type: 'null', typeOf: 'Void' });
    }
}
exports.ExtendedTypeBuilder = ExtendedTypeBuilder;
/** JSON Schema TypeBuilder with Static Resolution for TypeScript */
exports.StandardType = new StandardTypeBuilder();
/** JSON Schema TypeBuilder with Static Resolution for TypeScript */
exports.Type = new ExtendedTypeBuilder();
