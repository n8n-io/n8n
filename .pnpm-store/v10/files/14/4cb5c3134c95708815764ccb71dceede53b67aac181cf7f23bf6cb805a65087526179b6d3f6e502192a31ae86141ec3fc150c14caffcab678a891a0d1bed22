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
exports.ValueCreate = exports.ValueCreateDereferenceError = exports.ValueCreateTempateLiteralTypeError = exports.ValueCreateIntersectTypeError = exports.ValueCreateNeverTypeError = exports.ValueCreateUnknownTypeError = void 0;
const Types = require("../typebox");
const check_1 = require("./check");
// --------------------------------------------------------------------------
// Errors
// --------------------------------------------------------------------------
class ValueCreateUnknownTypeError extends Error {
    constructor(schema) {
        super('ValueCreate: Unknown type');
        this.schema = schema;
    }
}
exports.ValueCreateUnknownTypeError = ValueCreateUnknownTypeError;
class ValueCreateNeverTypeError extends Error {
    constructor(schema) {
        super('ValueCreate: Never types cannot be created');
        this.schema = schema;
    }
}
exports.ValueCreateNeverTypeError = ValueCreateNeverTypeError;
class ValueCreateIntersectTypeError extends Error {
    constructor(schema) {
        super('ValueCreate: Intersect produced invalid value. Consider using a default value.');
        this.schema = schema;
    }
}
exports.ValueCreateIntersectTypeError = ValueCreateIntersectTypeError;
class ValueCreateTempateLiteralTypeError extends Error {
    constructor(schema) {
        super('ValueCreate: Can only create template literal values from patterns that produce finite sequences. Consider using a default value.');
        this.schema = schema;
    }
}
exports.ValueCreateTempateLiteralTypeError = ValueCreateTempateLiteralTypeError;
class ValueCreateDereferenceError extends Error {
    constructor(schema) {
        super(`ValueCreate: Unable to dereference schema with $id '${schema.$ref}'`);
        this.schema = schema;
    }
}
exports.ValueCreateDereferenceError = ValueCreateDereferenceError;
// --------------------------------------------------------------------------
// ValueCreate
// --------------------------------------------------------------------------
var ValueCreate;
(function (ValueCreate) {
    // --------------------------------------------------------
    // Guards
    // --------------------------------------------------------
    function IsString(value) {
        return typeof value === 'string';
    }
    // --------------------------------------------------------
    // Types
    // --------------------------------------------------------
    function Any(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return {};
        }
    }
    function Array(schema, references) {
        if (schema.uniqueItems === true && schema.default === undefined) {
            throw new Error('ValueCreate.Array: Arrays with uniqueItems require a default value');
        }
        else if ('default' in schema) {
            return schema.default;
        }
        else if (schema.minItems !== undefined) {
            return globalThis.Array.from({ length: schema.minItems }).map((item) => {
                return ValueCreate.Create(schema.items, references);
            });
        }
        else {
            return [];
        }
    }
    function BigInt(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return globalThis.BigInt(0);
        }
    }
    function Boolean(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return false;
        }
    }
    function Constructor(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            const value = ValueCreate.Create(schema.returns, references);
            if (typeof value === 'object' && !globalThis.Array.isArray(value)) {
                return class {
                    constructor() {
                        for (const [key, val] of globalThis.Object.entries(value)) {
                            const self = this;
                            self[key] = val;
                        }
                    }
                };
            }
            else {
                return class {
                };
            }
        }
    }
    function Date(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else if (schema.minimumTimestamp !== undefined) {
            return new globalThis.Date(schema.minimumTimestamp);
        }
        else {
            return new globalThis.Date(0);
        }
    }
    function Function(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return () => ValueCreate.Create(schema.returns, references);
        }
    }
    function Integer(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else if (schema.minimum !== undefined) {
            return schema.minimum;
        }
        else {
            return 0;
        }
    }
    function Intersect(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            // Note: The best we can do here is attempt to instance each sub type and apply through object assign. For non-object
            // sub types, we just escape the assignment and just return the value. In the latter case, this is typically going to
            // be a consequence of an illogical intersection.
            const value = schema.allOf.reduce((acc, schema) => {
                const next = Visit(schema, references);
                return typeof next === 'object' ? { ...acc, ...next } : next;
            }, {});
            if (!check_1.ValueCheck.Check(schema, references, value))
                throw new ValueCreateIntersectTypeError(schema);
            return value;
        }
    }
    function Literal(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return schema.const;
        }
    }
    function Never(schema, references) {
        throw new ValueCreateNeverTypeError(schema);
    }
    function Not(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return Visit(schema.allOf[1], references);
        }
    }
    function Null(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return null;
        }
    }
    function Number(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else if (schema.minimum !== undefined) {
            return schema.minimum;
        }
        else {
            return 0;
        }
    }
    function Object(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            const required = new Set(schema.required);
            return (schema.default ||
                globalThis.Object.entries(schema.properties).reduce((acc, [key, schema]) => {
                    return required.has(key) ? { ...acc, [key]: ValueCreate.Create(schema, references) } : { ...acc };
                }, {}));
        }
    }
    function Promise(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return globalThis.Promise.resolve(ValueCreate.Create(schema.item, references));
        }
    }
    function Record(schema, references) {
        const [keyPattern, valueSchema] = globalThis.Object.entries(schema.patternProperties)[0];
        if ('default' in schema) {
            return schema.default;
        }
        else if (!(keyPattern === Types.PatternStringExact || keyPattern === Types.PatternNumberExact)) {
            const propertyKeys = keyPattern.slice(1, keyPattern.length - 1).split('|');
            return propertyKeys.reduce((acc, key) => {
                return { ...acc, [key]: Create(valueSchema, references) };
            }, {});
        }
        else {
            return {};
        }
    }
    function Ref(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            const index = references.findIndex((foreign) => foreign.$id === schema.$id);
            if (index === -1)
                throw new ValueCreateDereferenceError(schema);
            const target = references[index];
            return Visit(target, references);
        }
    }
    function String(schema, references) {
        if (schema.pattern !== undefined) {
            if (!('default' in schema)) {
                throw new Error('ValueCreate.String: String types with patterns must specify a default value');
            }
            else {
                return schema.default;
            }
        }
        else if (schema.format !== undefined) {
            if (!('default' in schema)) {
                throw new Error('ValueCreate.String: String types with formats must specify a default value');
            }
            else {
                return schema.default;
            }
        }
        else {
            if ('default' in schema) {
                return schema.default;
            }
            else if (schema.minLength !== undefined) {
                return globalThis.Array.from({ length: schema.minLength })
                    .map(() => '.')
                    .join('');
            }
            else {
                return '';
            }
        }
    }
    function Symbol(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else if ('value' in schema) {
            return globalThis.Symbol.for(schema.value);
        }
        else {
            return globalThis.Symbol();
        }
    }
    function TemplateLiteral(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        const expression = Types.TemplateLiteralParser.ParseExact(schema.pattern);
        if (!Types.TemplateLiteralFinite.Check(expression))
            throw new ValueCreateTempateLiteralTypeError(schema);
        const sequence = Types.TemplateLiteralGenerator.Generate(expression);
        return sequence.next().value;
    }
    function This(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            const index = references.findIndex((foreign) => foreign.$id === schema.$id);
            if (index === -1)
                throw new ValueCreateDereferenceError(schema);
            const target = references[index];
            return Visit(target, references);
        }
    }
    function Tuple(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        if (schema.items === undefined) {
            return [];
        }
        else {
            return globalThis.Array.from({ length: schema.minItems }).map((_, index) => ValueCreate.Create(schema.items[index], references));
        }
    }
    function Undefined(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return undefined;
        }
    }
    function Union(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else if (schema.anyOf.length === 0) {
            throw new Error('ValueCreate.Union: Cannot create Union with zero variants');
        }
        else {
            return ValueCreate.Create(schema.anyOf[0], references);
        }
    }
    function Uint8Array(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else if (schema.minByteLength !== undefined) {
            return new globalThis.Uint8Array(schema.minByteLength);
        }
        else {
            return new globalThis.Uint8Array(0);
        }
    }
    function Unknown(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return {};
        }
    }
    function Void(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            return void 0;
        }
    }
    function UserDefined(schema, references) {
        if ('default' in schema) {
            return schema.default;
        }
        else {
            throw new Error('ValueCreate.UserDefined: User defined types must specify a default value');
        }
    }
    /** Creates a value from the given schema. If the schema specifies a default value, then that value is returned. */
    function Visit(schema, references) {
        const references_ = IsString(schema.$id) ? [...references, schema] : references;
        const schema_ = schema;
        switch (schema_[Types.Kind]) {
            case 'Any':
                return Any(schema_, references_);
            case 'Array':
                return Array(schema_, references_);
            case 'BigInt':
                return BigInt(schema_, references_);
            case 'Boolean':
                return Boolean(schema_, references_);
            case 'Constructor':
                return Constructor(schema_, references_);
            case 'Date':
                return Date(schema_, references_);
            case 'Function':
                return Function(schema_, references_);
            case 'Integer':
                return Integer(schema_, references_);
            case 'Intersect':
                return Intersect(schema_, references_);
            case 'Literal':
                return Literal(schema_, references_);
            case 'Never':
                return Never(schema_, references_);
            case 'Not':
                return Not(schema_, references_);
            case 'Null':
                return Null(schema_, references_);
            case 'Number':
                return Number(schema_, references_);
            case 'Object':
                return Object(schema_, references_);
            case 'Promise':
                return Promise(schema_, references_);
            case 'Record':
                return Record(schema_, references_);
            case 'Ref':
                return Ref(schema_, references_);
            case 'String':
                return String(schema_, references_);
            case 'Symbol':
                return Symbol(schema_, references_);
            case 'TemplateLiteral':
                return TemplateLiteral(schema_, references_);
            case 'This':
                return This(schema_, references_);
            case 'Tuple':
                return Tuple(schema_, references_);
            case 'Undefined':
                return Undefined(schema_, references_);
            case 'Union':
                return Union(schema_, references_);
            case 'Uint8Array':
                return Uint8Array(schema_, references_);
            case 'Unknown':
                return Unknown(schema_, references_);
            case 'Void':
                return Void(schema_, references_);
            default:
                if (!Types.TypeRegistry.Has(schema_[Types.Kind]))
                    throw new ValueCreateUnknownTypeError(schema_);
                return UserDefined(schema_, references_);
        }
    }
    ValueCreate.Visit = Visit;
    function Create(schema, references) {
        return Visit(schema, references);
    }
    ValueCreate.Create = Create;
})(ValueCreate = exports.ValueCreate || (exports.ValueCreate = {}));
