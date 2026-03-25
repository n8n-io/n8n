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
const typebox_1 = require("../typebox");
const index_1 = require("../custom/index");
const index_2 = require("../format/index");
class TypeSystemDuplicateTypeKind extends Error {
    constructor(kind) {
        super(`Duplicate kind '${kind}' detected`);
    }
}
exports.TypeSystemDuplicateTypeKind = TypeSystemDuplicateTypeKind;
class TypeSystemDuplicateFormat extends Error {
    constructor(kind) {
        super(`Duplicate format '${kind}' detected`);
    }
}
exports.TypeSystemDuplicateFormat = TypeSystemDuplicateFormat;
/** Creates user defined types and formats and provides overrides for value checking behaviours */
var TypeSystem;
(function (TypeSystem) {
    /** Sets whether arrays should be treated as kinds of objects. The default is `false` */
    TypeSystem.AllowArrayObjects = false;
    /** Sets whether numeric checks should consider NaN a valid number type. The default is `false` */
    TypeSystem.AllowNaN = false;
    /** Creates a custom type */
    function CreateType(kind, callback) {
        if (index_1.Custom.Has(kind))
            throw new TypeSystemDuplicateTypeKind(kind);
        index_1.Custom.Set(kind, callback);
        return (options = {}) => typebox_1.Type.Unsafe({ ...options, [typebox_1.Kind]: kind });
    }
    TypeSystem.CreateType = CreateType;
    /** Creates a custom string format */
    function CreateFormat(format, callback) {
        if (index_2.Format.Has(format))
            throw new TypeSystemDuplicateFormat(format);
        index_2.Format.Set(format, callback);
        return callback;
    }
    TypeSystem.CreateFormat = CreateFormat;
})(TypeSystem = exports.TypeSystem || (exports.TypeSystem = {}));
