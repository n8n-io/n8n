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
exports.ValueEqual = void 0;
const is_1 = require("./is");
var ValueEqual;
(function (ValueEqual) {
    function Object(left, right) {
        if (!is_1.Is.Object(right))
            return false;
        const leftKeys = [...globalThis.Object.keys(left), ...globalThis.Object.getOwnPropertySymbols(left)];
        const rightKeys = [...globalThis.Object.keys(right), ...globalThis.Object.getOwnPropertySymbols(right)];
        if (leftKeys.length !== rightKeys.length)
            return false;
        return leftKeys.every((key) => Equal(left[key], right[key]));
    }
    function Date(left, right) {
        return is_1.Is.Date(right) && left.getTime() === right.getTime();
    }
    function Array(left, right) {
        if (!is_1.Is.Array(right) || left.length !== right.length)
            return false;
        return left.every((value, index) => Equal(value, right[index]));
    }
    function TypedArray(left, right) {
        if (!is_1.Is.TypedArray(right) || left.length !== right.length || globalThis.Object.getPrototypeOf(left).constructor.name !== globalThis.Object.getPrototypeOf(right).constructor.name)
            return false;
        return left.every((value, index) => Equal(value, right[index]));
    }
    function Value(left, right) {
        return left === right;
    }
    function Equal(left, right) {
        if (is_1.Is.Object(left)) {
            return Object(left, right);
        }
        else if (is_1.Is.Date(left)) {
            return Date(left, right);
        }
        else if (is_1.Is.TypedArray(left)) {
            return TypedArray(left, right);
        }
        else if (is_1.Is.Array(left)) {
            return Array(left, right);
        }
        else if (is_1.Is.Value(left)) {
            return Value(left, right);
        }
        else {
            throw new Error('ValueEquals: Unable to compare value');
        }
    }
    ValueEqual.Equal = Equal;
})(ValueEqual = exports.ValueEqual || (exports.ValueEqual = {}));
