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
exports.ValueCreate = exports.ValueCreateNeverTypeError = exports.ValueCreateUnknownTypeError = void 0;
const Types = require("../typebox");
const index_1 = require("../custom/index");
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
var ValueCreate;
(function (ValueCreate) {
    function Any(schema, references) {
        if (schema.default !== undefined) {
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
        else if (schema.default !== undefined) {
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
    function Boolean(schema, references) {
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            return false;
        }
    }
    function Constructor(schema, references) {
        if (schema.default !== undefined) {
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
        if (schema.default !== undefined) {
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
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            return () => ValueCreate.Create(schema.returns, references);
        }
    }
    function Integer(schema, references) {
        if (schema.default !== undefined) {
            return schema.default;
        }
        else if (schema.minimum !== undefined) {
            return schema.minimum;
        }
        else {
            return 0;
        }
    }
    function Literal(schema, references) {
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            return schema.const;
        }
    }
    function Never(schema, references) {
        throw new ValueCreateNeverTypeError(schema);
    }
    function Null(schema, references) {
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            return null;
        }
    }
    function Number(schema, references) {
        if (schema.default !== undefined) {
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
        if (schema.default !== undefined) {
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
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            return globalThis.Promise.resolve(ValueCreate.Create(schema.item, references));
        }
    }
    function Record(schema, references) {
        const [keyPattern, valueSchema] = globalThis.Object.entries(schema.patternProperties)[0];
        if (schema.default !== undefined) {
            return schema.default;
        }
        else if (!(keyPattern === '^.*$' || keyPattern === '^(0|[1-9][0-9]*)$')) {
            const propertyKeys = keyPattern.slice(1, keyPattern.length - 1).split('|');
            return propertyKeys.reduce((acc, key) => {
                return { ...acc, [key]: Create(valueSchema, references) };
            }, {});
        }
        else {
            return {};
        }
    }
    function Recursive(schema, references) {
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            throw new Error('ValueCreate.Recursive: Recursive types require a default value');
        }
    }
    function Ref(schema, references) {
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            const reference = references.find((reference) => reference.$id === schema.$ref);
            if (reference === undefined)
                throw new Error(`ValueCreate.Ref: Cannot find schema with $id '${schema.$ref}'.`);
            return Visit(reference, references);
        }
    }
    function Self(schema, references) {
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            const reference = references.find((reference) => reference.$id === schema.$ref);
            if (reference === undefined)
                throw new Error(`ValueCreate.Self: Cannot locate schema with $id '${schema.$ref}'`);
            return Visit(reference, references);
        }
    }
    function String(schema, references) {
        if (schema.pattern !== undefined) {
            if (schema.default === undefined) {
                throw new Error('ValueCreate.String: String types with patterns must specify a default value');
            }
            else {
                return schema.default;
            }
        }
        else if (schema.format !== undefined) {
            if (schema.default === undefined) {
                throw new Error('ValueCreate.String: String types with formats must specify a default value');
            }
            else {
                return schema.default;
            }
        }
        else {
            if (schema.default !== undefined) {
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
    function Tuple(schema, references) {
        if (schema.default !== undefined) {
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
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            return undefined;
        }
    }
    function Union(schema, references) {
        if (schema.default !== undefined) {
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
        if (schema.default !== undefined) {
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
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            return {};
        }
    }
    function Void(schema, references) {
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            return null;
        }
    }
    function UserDefined(schema, references) {
        if (schema.default !== undefined) {
            return schema.default;
        }
        else {
            throw new Error('ValueCreate.UserDefined: User defined types must specify a default value');
        }
    }
    /** Creates a value from the given schema. If the schema specifies a default value, then that value is returned. */
    function Visit(schema, references) {
        const anyReferences = schema.$id === undefined ? references : [schema, ...references];
        const anySchema = schema;
        switch (anySchema[Types.Kind]) {
            case 'Any':
                return Any(anySchema, anyReferences);
            case 'Array':
                return Array(anySchema, anyReferences);
            case 'Boolean':
                return Boolean(anySchema, anyReferences);
            case 'Constructor':
                return Constructor(anySchema, anyReferences);
            case 'Date':
                return Date(anySchema, anyReferences);
            case 'Function':
                return Function(anySchema, anyReferences);
            case 'Integer':
                return Integer(anySchema, anyReferences);
            case 'Literal':
                return Literal(anySchema, anyReferences);
            case 'Never':
                return Never(anySchema, anyReferences);
            case 'Null':
                return Null(anySchema, anyReferences);
            case 'Number':
                return Number(anySchema, anyReferences);
            case 'Object':
                return Object(anySchema, anyReferences);
            case 'Promise':
                return Promise(anySchema, anyReferences);
            case 'Record':
                return Record(anySchema, anyReferences);
            case 'Rec':
                return Recursive(anySchema, anyReferences);
            case 'Ref':
                return Ref(anySchema, anyReferences);
            case 'Self':
                return Self(anySchema, anyReferences);
            case 'String':
                return String(anySchema, anyReferences);
            case 'Tuple':
                return Tuple(anySchema, anyReferences);
            case 'Undefined':
                return Undefined(anySchema, anyReferences);
            case 'Union':
                return Union(anySchema, anyReferences);
            case 'Uint8Array':
                return Uint8Array(anySchema, anyReferences);
            case 'Unknown':
                return Unknown(anySchema, anyReferences);
            case 'Void':
                return Void(anySchema, anyReferences);
            default:
                if (!index_1.Custom.Has(anySchema[Types.Kind]))
                    throw new ValueCreateUnknownTypeError(anySchema);
                return UserDefined(anySchema, anyReferences);
        }
    }
    ValueCreate.Visit = Visit;
    function Create(schema, references) {
        return Visit(schema, references);
    }
    ValueCreate.Create = Create;
})(ValueCreate = exports.ValueCreate || (exports.ValueCreate = {}));
