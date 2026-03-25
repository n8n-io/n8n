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
exports.Conditional = void 0;
const Types = require("../typebox");
const structural_1 = require("./structural");
const index_1 = require("../guard/index");
/** Conditional type mapping for TypeBox types */
var Conditional;
(function (Conditional) {
    /** (Experimental) Creates a conditional expression type */
    function Extends(left, right, ok, fail) {
        switch (structural_1.Structural.Check(left, right)) {
            case structural_1.StructuralResult.Union:
                return Types.Type.Union([Clone(ok), Clone(fail)]);
            case structural_1.StructuralResult.True:
                return Clone(ok);
            case structural_1.StructuralResult.False:
                return Clone(fail);
        }
    }
    Conditional.Extends = Extends;
    /** (Experimental) Constructs a type by excluding from UnionType all union members that are assignable to ExcludedMembers. */
    function Exclude(unionType, excludedMembers, options = {}) {
        const anyOf = unionType.anyOf
            .filter((schema) => {
            const check = structural_1.Structural.Check(schema, excludedMembers);
            return !(check === structural_1.StructuralResult.True || check === structural_1.StructuralResult.Union);
        })
            .map((schema) => Clone(schema));
        return { ...options, [Types.Kind]: 'Union', anyOf };
    }
    Conditional.Exclude = Exclude;
    /** (Experimental) Constructs a type by extracting from Type all union members that are assignable to Union. */
    function Extract(type, union, options = {}) {
        if (index_1.TypeGuard.TUnion(type)) {
            const anyOf = type.anyOf.filter((schema) => structural_1.Structural.Check(schema, union) === structural_1.StructuralResult.True).map((schema) => Clone(schema));
            return { ...options, [Types.Kind]: 'Union', anyOf };
        }
        else {
            const anyOf = union.anyOf.filter((schema) => structural_1.Structural.Check(type, schema) === structural_1.StructuralResult.True).map((schema) => Clone(schema));
            return { ...options, [Types.Kind]: 'Union', anyOf };
        }
    }
    Conditional.Extract = Extract;
    function Clone(value) {
        const isObject = (object) => typeof object === 'object' && object !== null && !Array.isArray(object);
        const isArray = (object) => typeof object === 'object' && object !== null && Array.isArray(object);
        if (isObject(value)) {
            return Object.keys(value).reduce((acc, key) => ({
                ...acc,
                [key]: Clone(value[key]),
            }), Object.getOwnPropertySymbols(value).reduce((acc, key) => ({
                ...acc,
                [key]: Clone(value[key]),
            }), {}));
        }
        else if (isArray(value)) {
            return value.map((item) => Clone(item));
        }
        else {
            return value;
        }
    }
})(Conditional = exports.Conditional || (exports.Conditional = {}));
