"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/system

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
exports.TypeSystem = exports.TypeSystemDuplicateFormat = exports.TypeSystemDuplicateTypeKind = void 0;
const Types = require("../typebox");
class TypeSystemDuplicateTypeKind extends Error {
    constructor(kind) {
        super(`Duplicate type kind '${kind}' detected`);
    }
}
exports.TypeSystemDuplicateTypeKind = TypeSystemDuplicateTypeKind;
class TypeSystemDuplicateFormat extends Error {
    constructor(kind) {
        super(`Duplicate string format '${kind}' detected`);
    }
}
exports.TypeSystemDuplicateFormat = TypeSystemDuplicateFormat;
/** Creates user defined types and formats and provides overrides for value checking behaviours */
var TypeSystem;
(function (TypeSystem) {
    // ------------------------------------------------------------------------
    // Assertion Policies
    // ------------------------------------------------------------------------
    /** Sets whether TypeBox should assert optional properties using the TypeScript `exactOptionalPropertyTypes` assertion policy. The default is `false` */
    TypeSystem.ExactOptionalPropertyTypes = false;
    /** Sets whether arrays should be treated as a kind of objects. The default is `false` */
    TypeSystem.AllowArrayObjects = false;
    /** Sets whether `NaN` or `Infinity` should be treated as valid numeric values. The default is `false` */
    TypeSystem.AllowNaN = false;
    /** Sets whether `null` should validate for void types. The default is `false` */
    TypeSystem.AllowVoidNull = false;
    // ------------------------------------------------------------------------
    // String Formats and Types
    // ------------------------------------------------------------------------
    /** Creates a new type */
    function Type(kind, check) {
        if (Types.TypeRegistry.Has(kind))
            throw new TypeSystemDuplicateTypeKind(kind);
        Types.TypeRegistry.Set(kind, check);
        return (options = {}) => Types.Type.Unsafe({ ...options, [Types.Kind]: kind });
    }
    TypeSystem.Type = Type;
    /** Creates a new string format */
    function Format(format, check) {
        if (Types.FormatRegistry.Has(format))
            throw new TypeSystemDuplicateFormat(format);
        Types.FormatRegistry.Set(format, check);
        return format;
    }
    TypeSystem.Format = Format;
    // ------------------------------------------------------------------------
    // Deprecated
    // ------------------------------------------------------------------------
    /** @deprecated Use `TypeSystem.Type()` instead. */
    function CreateType(kind, check) {
        return Type(kind, check);
    }
    TypeSystem.CreateType = CreateType;
    /** @deprecated Use `TypeSystem.Format()` instead.  */
    function CreateFormat(format, check) {
        return Format(format, check);
    }
    TypeSystem.CreateFormat = CreateFormat;
})(TypeSystem = exports.TypeSystem || (exports.TypeSystem = {}));
