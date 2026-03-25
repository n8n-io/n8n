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
exports.Is = void 0;
var Is;
(function (Is) {
    function Object(value) {
        return value !== null && typeof value === 'object' && !globalThis.Array.isArray(value) && !ArrayBuffer.isView(value) && !(value instanceof globalThis.Date);
    }
    Is.Object = Object;
    function Date(value) {
        return value instanceof globalThis.Date;
    }
    Is.Date = Date;
    function Array(value) {
        return globalThis.Array.isArray(value) && !ArrayBuffer.isView(value);
    }
    Is.Array = Array;
    function Value(value) {
        return value === null || value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string';
    }
    Is.Value = Value;
    function TypedArray(value) {
        return ArrayBuffer.isView(value);
    }
    Is.TypedArray = TypedArray;
})(Is = exports.Is || (exports.Is = {}));
