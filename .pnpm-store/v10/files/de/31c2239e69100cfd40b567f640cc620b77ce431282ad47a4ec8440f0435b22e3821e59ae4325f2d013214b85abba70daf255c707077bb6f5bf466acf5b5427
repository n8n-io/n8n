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
exports.Value = void 0;
const index_1 = require("../errors/index");
const mutate_1 = require("./mutate");
const hash_1 = require("./hash");
const equal_1 = require("./equal");
const cast_1 = require("./cast");
const clone_1 = require("./clone");
const convert_1 = require("./convert");
const create_1 = require("./create");
const check_1 = require("./check");
const delta_1 = require("./delta");
/** Provides functions to perform structural updates to JavaScript values */
var Value;
(function (Value) {
    function Cast(...args) {
        const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
        return cast_1.ValueCast.Cast(schema, references, value);
    }
    Value.Cast = Cast;
    function Create(...args) {
        const [schema, references] = args.length === 2 ? [args[0], args[1]] : [args[0], []];
        return create_1.ValueCreate.Create(schema, references);
    }
    Value.Create = Create;
    function Check(...args) {
        const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
        return check_1.ValueCheck.Check(schema, references, value);
    }
    Value.Check = Check;
    function Convert(...args) {
        const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
        return convert_1.ValueConvert.Convert(schema, references, value);
    }
    Value.Convert = Convert;
    /** Returns a structural clone of the given value */
    function Clone(value) {
        return clone_1.ValueClone.Clone(value);
    }
    Value.Clone = Clone;
    function Errors(...args) {
        const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
        return index_1.ValueErrors.Errors(schema, references, value);
    }
    Value.Errors = Errors;
    /** Returns true if left and right values are structurally equal */
    function Equal(left, right) {
        return equal_1.ValueEqual.Equal(left, right);
    }
    Value.Equal = Equal;
    /** Returns edits to transform the current value into the next value */
    function Diff(current, next) {
        return delta_1.ValueDelta.Diff(current, next);
    }
    Value.Diff = Diff;
    /** Returns a FNV1A-64 non cryptographic hash of the given value */
    function Hash(value) {
        return hash_1.ValueHash.Create(value);
    }
    Value.Hash = Hash;
    /** Returns a new value with edits applied to the given value */
    function Patch(current, edits) {
        return delta_1.ValueDelta.Patch(current, edits);
    }
    Value.Patch = Patch;
    /** Performs a deep mutable value assignment while retaining internal references. */
    function Mutate(current, next) {
        mutate_1.ValueMutate.Mutate(current, next);
    }
    Value.Mutate = Mutate;
})(Value = exports.Value || (exports.Value = {}));
