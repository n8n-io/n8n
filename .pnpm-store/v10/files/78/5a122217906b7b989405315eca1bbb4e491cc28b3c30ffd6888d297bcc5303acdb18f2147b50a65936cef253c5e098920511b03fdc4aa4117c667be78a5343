"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/custom

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
exports.Custom = void 0;
/** Provides functions to create user defined types */
var Custom;
(function (Custom) {
    const customs = new Map();
    /** Clears all user defined types */
    function Clear() {
        return customs.clear();
    }
    Custom.Clear = Clear;
    /** Returns true if this user defined type exists */
    function Has(kind) {
        return customs.has(kind);
    }
    Custom.Has = Has;
    /** Sets a validation function for a user defined type */
    function Set(kind, func) {
        customs.set(kind, func);
    }
    Custom.Set = Set;
    /** Gets a custom validation function for a user defined type */
    function Get(kind) {
        return customs.get(kind);
    }
    Custom.Get = Get;
})(Custom = exports.Custom || (exports.Custom = {}));
