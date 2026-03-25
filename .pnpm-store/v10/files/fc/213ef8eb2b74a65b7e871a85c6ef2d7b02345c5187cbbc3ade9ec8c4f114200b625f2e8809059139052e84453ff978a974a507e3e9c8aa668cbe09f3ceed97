"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/format

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
exports.Format = void 0;
/** Provides functions to create user defined string formats */
var Format;
(function (Format) {
    const formats = new Map();
    /** Clears all user defined string formats */
    function Clear() {
        return formats.clear();
    }
    Format.Clear = Clear;
    /** Returns true if the user defined string format exists */
    function Has(format) {
        return formats.has(format);
    }
    Format.Has = Has;
    /** Sets a validation function for a user defined string format */
    function Set(format, func) {
        formats.set(format, func);
    }
    Format.Set = Set;
    /** Gets a validation function for a user defined string format */
    function Get(format) {
        return formats.get(format);
    }
    Format.Get = Get;
})(Format = exports.Format || (exports.Format = {}));
