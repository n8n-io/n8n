"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/conditional

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
exports.Structural = exports.StructuralResult = void 0;
const Types = require("../typebox");
const guard_1 = require("../guard");
// --------------------------------------------------------------------------
// StructuralResult
// --------------------------------------------------------------------------
var StructuralResult;
(function (StructuralResult) {
    StructuralResult[StructuralResult["Union"] = 0] = "Union";
    StructuralResult[StructuralResult["True"] = 1] = "True";
    StructuralResult[StructuralResult["False"] = 2] = "False";
})(StructuralResult = exports.StructuralResult || (exports.StructuralResult = {}));
// --------------------------------------------------------------------------
// Structural
// --------------------------------------------------------------------------
/** Performs structural equivalence checks against TypeBox types. */
var Structural;
(function (Structural) {
    const referenceMap = new Map();
    // ------------------------------------------------------------------------
    // Rules
    // ------------------------------------------------------------------------
    function AnyUnknownOrCustomRule(right) {
        // https://github.com/microsoft/TypeScript/issues/40049
        if (guard_1.TypeGuard.TUnion(right) && right.anyOf.some((schema) => schema[Types.Kind] === 'Any' || schema[Types.Kind] === 'Unknown'))
            return true;
        if (guard_1.TypeGuard.TUnknown(right))
            return true;
        if (guard_1.TypeGuard.TAny(right))
            return true;
        if (guard_1.TypeGuard.TUserDefined(right))
            throw Error(`Structural: Cannot structurally compare custom type '${right[Types.Kind]}'`);
        return false;
    }
    function ObjectRightRule(left, right) {
        // type A = boolean extends {}     ? 1 : 2 // additionalProperties: false
        // type B = boolean extends object ? 1 : 2 // additionalProperties: true
        const additionalProperties = right.additionalProperties;
        const propertyLength = globalThis.Object.keys(right.properties).length;
        return additionalProperties === false && propertyLength === 0;
    }
    function UnionRightRule(left, right) {
        const result = right.anyOf.some((right) => Visit(left, right) !== StructuralResult.False);
        return result ? StructuralResult.True : StructuralResult.False;
    }
    // ------------------------------------------------------------------------
    // Records
    // ------------------------------------------------------------------------
    function RecordPattern(schema) {
        return globalThis.Object.keys(schema.patternProperties)[0];
    }
    function RecordNumberOrStringKey(schema) {
        const pattern = RecordPattern(schema);
        return pattern === '^.*$' || pattern === '^(0|[1-9][0-9]*)$';
    }
    function RecordValue(schema) {
        const pattern = RecordPattern(schema);
        return schema.patternProperties[pattern];
    }
    function RecordKey(schema) {
        const pattern = RecordPattern(schema);
        if (pattern === '^.*$') {
            return Types.Type.String();
        }
        else if (pattern === '^(0|[1-9][0-9]*)$') {
            return Types.Type.Number();
        }
        else {
            const keys = pattern.slice(1, pattern.length - 1).split('|');
            const schemas = keys.map((key) => (isNaN(+key) ? Types.Type.Literal(key) : Types.Type.Literal(parseFloat(key))));
            return Types.Type.Union(schemas);
        }
    }
    function PropertyMap(schema) {
        const comparable = new Map();
        if (guard_1.TypeGuard.TRecord(schema)) {
            const propertyPattern = RecordPattern(schema);
            if (propertyPattern === '^.*$' || propertyPattern === '^(0|[1-9][0-9]*)$')
                throw Error('Cannot extract record properties without property constraints');
            const propertySchema = schema.patternProperties[propertyPattern];
            const propertyKeys = propertyPattern.slice(1, propertyPattern.length - 1).split('|');
            propertyKeys.forEach((propertyKey) => {
                comparable.set(propertyKey, propertySchema);
            });
        }
        else {
            globalThis.Object.entries(schema.properties).forEach(([propertyKey, propertySchema]) => {
                comparable.set(propertyKey, propertySchema);
            });
        }
        return comparable;
    }
    // ------------------------------------------------------------------------
    // Indexable
    // ------------------------------------------------------------------------
    function Indexable(left, right) {
        if (guard_1.TypeGuard.TUnion(right)) {
            return StructuralResult.False;
        }
        else {
            return Visit(left, right);
        }
    }
    // ------------------------------------------------------------------------
    // Checks
    // ------------------------------------------------------------------------
    function Any(left, right) {
        return AnyUnknownOrCustomRule(right) ? StructuralResult.True : StructuralResult.Union;
    }
    function Array(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right)) {
            if (right.properties['length'] !== undefined && right.properties['length'][Types.Kind] === 'Number')
                return StructuralResult.True;
            if (globalThis.Object.keys(right.properties).length === 0)
                return StructuralResult.True;
            return StructuralResult.False;
        }
        else if (!guard_1.TypeGuard.TArray(right)) {
            return StructuralResult.False;
        }
        else if (left.items === undefined && right.items !== undefined) {
            return StructuralResult.False;
        }
        else if (left.items !== undefined && right.items === undefined) {
            return StructuralResult.False;
        }
        else if (left.items === undefined && right.items === undefined) {
            return StructuralResult.False;
        }
        else {
            const result = Visit(left.items, right.items) !== StructuralResult.False;
            return result ? StructuralResult.True : StructuralResult.False;
        }
    }
    function Boolean(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right) && ObjectRightRule(left, right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TBoolean(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            return UnionRightRule(left, right);
        }
        else {
            return StructuralResult.False;
        }
    }
    function Constructor(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right) && globalThis.Object.keys(right.properties).length === 0) {
            return StructuralResult.True;
        }
        else if (!guard_1.TypeGuard.TConstructor(right)) {
            return StructuralResult.False;
        }
        else if (right.parameters.length < left.parameters.length) {
            return StructuralResult.False;
        }
        else {
            if (Visit(left.returns, right.returns) === StructuralResult.False) {
                return StructuralResult.False;
            }
            for (let i = 0; i < left.parameters.length; i++) {
                const result = Visit(right.parameters[i], left.parameters[i]);
                if (result === StructuralResult.False)
                    return StructuralResult.False;
            }
            return StructuralResult.True;
        }
    }
    function Date(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right) && ObjectRightRule(left, right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TRecord(right)) {
            return StructuralResult.False;
        }
        else if (guard_1.TypeGuard.TDate(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            return UnionRightRule(left, right);
        }
        else {
            return StructuralResult.False;
        }
    }
    function Function(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right)) {
            if (right.properties['length'] !== undefined && right.properties['length'][Types.Kind] === 'Number')
                return StructuralResult.True;
            if (globalThis.Object.keys(right.properties).length === 0)
                return StructuralResult.True;
            return StructuralResult.False;
        }
        else if (!guard_1.TypeGuard.TFunction(right)) {
            return StructuralResult.False;
        }
        else if (right.parameters.length < left.parameters.length) {
            return StructuralResult.False;
        }
        else if (Visit(left.returns, right.returns) === StructuralResult.False) {
            return StructuralResult.False;
        }
        else {
            for (let i = 0; i < left.parameters.length; i++) {
                const result = Visit(right.parameters[i], left.parameters[i]);
                if (result === StructuralResult.False)
                    return StructuralResult.False;
            }
            return StructuralResult.True;
        }
    }
    function Integer(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right) && ObjectRightRule(left, right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TInteger(right) || guard_1.TypeGuard.TNumber(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            return UnionRightRule(left, right);
        }
        else {
            return StructuralResult.False;
        }
    }
    function Literal(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right) && ObjectRightRule(left, right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TRecord(right)) {
            if (typeof left.const === 'string') {
                return Indexable(left, RecordValue(right));
            }
            else {
                return StructuralResult.False;
            }
        }
        else if (guard_1.TypeGuard.TLiteral(right) && left.const === right.const) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TString(right) && typeof left.const === 'string') {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TNumber(right) && typeof left.const === 'number') {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TInteger(right) && typeof left.const === 'number') {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TBoolean(right) && typeof left.const === 'boolean') {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            return UnionRightRule(left, right);
        }
        else {
            return StructuralResult.False;
        }
    }
    function Number(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right) && ObjectRightRule(left, right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TNumber(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TInteger(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            return UnionRightRule(left, right);
        }
        else {
            return StructuralResult.False;
        }
    }
    function Null(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TNull(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            return UnionRightRule(left, right);
        }
        else {
            return StructuralResult.False;
        }
    }
    function Properties(left, right) {
        if (right.size > left.size)
            return StructuralResult.False;
        if (![...right.keys()].every((rightKey) => left.has(rightKey)))
            return StructuralResult.False;
        for (const rightKey of right.keys()) {
            const leftProp = left.get(rightKey);
            const rightProp = right.get(rightKey);
            if (Visit(leftProp, rightProp) === StructuralResult.False) {
                return StructuralResult.False;
            }
        }
        return StructuralResult.True;
    }
    function Object(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right)) {
            return Properties(PropertyMap(left), PropertyMap(right));
        }
        else if (guard_1.TypeGuard.TRecord(right)) {
            if (!RecordNumberOrStringKey(right)) {
                return Properties(PropertyMap(left), PropertyMap(right));
            }
            else {
                return StructuralResult.True;
            }
        }
        else {
            return StructuralResult.False;
        }
    }
    function Promise(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right)) {
            if (ObjectRightRule(left, right) || globalThis.Object.keys(right.properties).length === 0) {
                return StructuralResult.True;
            }
            else {
                return StructuralResult.False;
            }
        }
        else if (!guard_1.TypeGuard.TPromise(right)) {
            return StructuralResult.False;
        }
        else {
            const result = Visit(left.item, right.item) !== StructuralResult.False;
            return result ? StructuralResult.True : StructuralResult.False;
        }
    }
    function Record(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right)) {
            if (RecordPattern(left) === '^.*$' && right[Types.Hint] === 'Record') {
                return StructuralResult.True;
            }
            else if (RecordPattern(left) === '^.*$') {
                return StructuralResult.False;
            }
            else {
                return globalThis.Object.keys(right.properties).length === 0 ? StructuralResult.True : StructuralResult.False;
            }
        }
        else if (guard_1.TypeGuard.TRecord(right)) {
            if (!RecordNumberOrStringKey(left) && !RecordNumberOrStringKey(right)) {
                return Properties(PropertyMap(left), PropertyMap(right));
            }
            else if (RecordNumberOrStringKey(left) && !RecordNumberOrStringKey(right)) {
                const leftKey = RecordKey(left);
                const rightKey = RecordKey(right);
                if (Visit(rightKey, leftKey) === StructuralResult.False) {
                    return StructuralResult.False;
                }
                else {
                    return StructuralResult.True;
                }
            }
            else {
                return StructuralResult.True;
            }
        }
        else {
            return StructuralResult.False;
        }
    }
    function Ref(left, right) {
        if (!referenceMap.has(left.$ref))
            throw Error(`Cannot locate referenced $id '${left.$ref}'`);
        const resolved = referenceMap.get(left.$ref);
        return Visit(resolved, right);
    }
    function Self(left, right) {
        if (!referenceMap.has(left.$ref))
            throw Error(`Cannot locate referenced self $id '${left.$ref}'`);
        const resolved = referenceMap.get(left.$ref);
        return Visit(resolved, right);
    }
    function String(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right) && ObjectRightRule(left, right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TRecord(right)) {
            return Indexable(left, RecordValue(right));
        }
        else if (guard_1.TypeGuard.TString(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            return UnionRightRule(left, right);
        }
        else {
            return StructuralResult.False;
        }
    }
    function Tuple(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right)) {
            const result = ObjectRightRule(left, right) || globalThis.Object.keys(right.properties).length === 0;
            return result ? StructuralResult.True : StructuralResult.False;
        }
        else if (guard_1.TypeGuard.TRecord(right)) {
            return Indexable(left, RecordValue(right));
        }
        else if (guard_1.TypeGuard.TArray(right)) {
            if (right.items === undefined) {
                return StructuralResult.False;
            }
            else if (guard_1.TypeGuard.TUnion(right.items) && left.items) {
                const result = left.items.every((left) => UnionRightRule(left, right.items) !== StructuralResult.False);
                return result ? StructuralResult.True : StructuralResult.False;
            }
            else if (guard_1.TypeGuard.TAny(right.items)) {
                return StructuralResult.True;
            }
            else {
                return StructuralResult.False;
            }
        }
        if (!guard_1.TypeGuard.TTuple(right))
            return StructuralResult.False;
        if (left.items === undefined && right.items === undefined)
            return StructuralResult.True;
        if (left.items === undefined && right.items !== undefined)
            return StructuralResult.False;
        if (left.items !== undefined && right.items === undefined)
            return StructuralResult.False;
        if (left.items === undefined && right.items === undefined)
            return StructuralResult.True;
        if (left.minItems !== right.minItems || left.maxItems !== right.maxItems)
            return StructuralResult.False;
        for (let i = 0; i < left.items.length; i++) {
            if (Visit(left.items[i], right.items[i]) === StructuralResult.False)
                return StructuralResult.False;
        }
        return StructuralResult.True;
    }
    function Uint8Array(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TObject(right) && ObjectRightRule(left, right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TRecord(right)) {
            return Indexable(left, RecordValue(right));
        }
        else if (guard_1.TypeGuard.TUint8Array(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            return UnionRightRule(left, right);
        }
        else {
            return StructuralResult.False;
        }
    }
    function Undefined(left, right) {
        if (AnyUnknownOrCustomRule(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUndefined(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TVoid(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            return UnionRightRule(left, right);
        }
        else {
            return StructuralResult.False;
        }
    }
    function Union(left, right) {
        if (left.anyOf.some((left) => guard_1.TypeGuard.TAny(left))) {
            return StructuralResult.Union;
        }
        else if (guard_1.TypeGuard.TUnion(right)) {
            const result = left.anyOf.every((left) => right.anyOf.some((right) => Visit(left, right) !== StructuralResult.False));
            return result ? StructuralResult.True : StructuralResult.False;
        }
        else {
            const result = left.anyOf.every((left) => Visit(left, right) !== StructuralResult.False);
            return result ? StructuralResult.True : StructuralResult.False;
        }
    }
    function Unknown(left, right) {
        if (guard_1.TypeGuard.TUnion(right)) {
            const result = right.anyOf.some((right) => guard_1.TypeGuard.TAny(right) || guard_1.TypeGuard.TUnknown(right));
            return result ? StructuralResult.True : StructuralResult.False;
        }
        else if (guard_1.TypeGuard.TAny(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnknown(right)) {
            return StructuralResult.True;
        }
        else {
            return StructuralResult.False;
        }
    }
    function Void(left, right) {
        if (guard_1.TypeGuard.TUnion(right)) {
            const result = right.anyOf.some((right) => guard_1.TypeGuard.TAny(right) || guard_1.TypeGuard.TUnknown(right));
            return result ? StructuralResult.True : StructuralResult.False;
        }
        else if (guard_1.TypeGuard.TAny(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TUnknown(right)) {
            return StructuralResult.True;
        }
        else if (guard_1.TypeGuard.TVoid(right)) {
            return StructuralResult.True;
        }
        else {
            return StructuralResult.False;
        }
    }
    let recursionDepth = 0;
    function Visit(left, right) {
        recursionDepth += 1;
        if (recursionDepth >= 1000)
            return StructuralResult.True;
        if (left.$id !== undefined)
            referenceMap.set(left.$id, left);
        if (right.$id !== undefined)
            referenceMap.set(right.$id, right);
        const resolvedRight = right[Types.Kind] === 'Self' ? referenceMap.get(right.$ref) : right;
        if (guard_1.TypeGuard.TAny(left)) {
            return Any(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TArray(left)) {
            return Array(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TBoolean(left)) {
            return Boolean(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TConstructor(left)) {
            return Constructor(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TDate(left)) {
            return Date(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TFunction(left)) {
            return Function(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TInteger(left)) {
            return Integer(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TLiteral(left)) {
            return Literal(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TNull(left)) {
            return Null(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TNumber(left)) {
            return Number(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TObject(left)) {
            return Object(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TPromise(left)) {
            return Promise(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TRecord(left)) {
            return Record(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TRef(left)) {
            return Ref(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TSelf(left)) {
            return Self(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TString(left)) {
            return String(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TTuple(left)) {
            return Tuple(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TUndefined(left)) {
            return Undefined(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TUint8Array(left)) {
            return Uint8Array(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TUnion(left)) {
            return Union(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TUnknown(left)) {
            return Unknown(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TVoid(left)) {
            return Void(left, resolvedRight);
        }
        else if (guard_1.TypeGuard.TUserDefined(left)) {
            throw Error(`Structural: Cannot structurally compare custom type '${left[Types.Kind]}'`);
        }
        else {
            throw Error(`Structural: Unknown left operand '${left[Types.Kind]}'`);
        }
    }
    /** Structurally tests if the left schema extends the right. */
    function Check(left, right) {
        referenceMap.clear();
        recursionDepth = 0;
        return Visit(left, right);
    }
    Structural.Check = Check;
})(Structural = exports.Structural || (exports.Structural = {}));
