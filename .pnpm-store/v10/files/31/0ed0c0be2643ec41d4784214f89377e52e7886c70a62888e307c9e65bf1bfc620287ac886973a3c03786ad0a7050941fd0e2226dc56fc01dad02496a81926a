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
exports.ValueClone = void 0;
const is_1 = require("./is");
var ValueClone;
(function (ValueClone) {
    function Array(value) {
        return value.map((element) => Clone(element));
    }
    function Date(value) {
        return new globalThis.Date(value.toISOString());
    }
    function Object(value) {
        const keys = [...globalThis.Object.keys(value), ...globalThis.Object.getOwnPropertySymbols(value)];
        return keys.reduce((acc, key) => ({ ...acc, [key]: Clone(value[key]) }), {});
    }
    function TypedArray(value) {
        return value.slice();
    }
    function Value(value) {
        return value;
    }
    function Clone(value) {
        if (is_1.Is.Date(value)) {
            return Date(value);
        }
        else if (is_1.Is.Object(value)) {
            return Object(value);
        }
        else if (is_1.Is.Array(value)) {
            return Array(value);
        }
        else if (is_1.Is.TypedArray(value)) {
            return TypedArray(value);
        }
        else if (is_1.Is.Value(value)) {
            return Value(value);
        }
        else {
            throw new Error('ValueClone: Unable to clone value');
        }
    }
    ValueClone.Clone = Clone;
})(ValueClone = exports.ValueClone || (exports.ValueClone = {}));
