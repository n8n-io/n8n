"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox

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
exports.Type = exports.TypeBuilder = exports.Modifier = exports.Hint = exports.Kind = void 0;
// --------------------------------------------------------------------------
// Symbols
// --------------------------------------------------------------------------
exports.Kind = Symbol.for('TypeBox.Kind');
exports.Hint = Symbol.for('TypeBox.Hint');
exports.Modifier = Symbol.for('TypeBox.Modifier');
// --------------------------------------------------------------------------
// TypeBuilder
// --------------------------------------------------------------------------
let TypeOrdinal = 0;
class TypeBuilder {
    // ----------------------------------------------------------------------
    // Modifiers
    // ----------------------------------------------------------------------
    /** Creates a readonly optional property */
    ReadonlyOptional(item) {
        return { [exports.Modifier]: 'ReadonlyOptional', ...item };
    }
    /** Creates a readonly property */
    Readonly(item) {
        return { [exports.Modifier]: 'Readonly', ...item };
    }
    /** Creates a optional property */
    Optional(item) {
        return { [exports.Modifier]: 'Optional', ...item };
    }
    // ----------------------------------------------------------------------
    // Types
    // ----------------------------------------------------------------------
    /** `Standard` Creates a any type */
    Any(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Any' });
    }
    /** `Standard` Creates a array type */
    Array(items, options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Array', type: 'array', items });
    }
    /** `Standard` Creates a boolean type */
    Boolean(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Boolean', type: 'boolean' });
    }
    /** `Extended` Creates a tuple type from this constructors parameters */
    ConstructorParameters(schema, options = {}) {
        return this.Tuple([...schema.parameters], { ...options });
    }
    /** `Extended` Creates a constructor type */
    Constructor(parameters, returns, options = {}) {
        if (parameters[exports.Kind] === 'Tuple') {
            const inner = parameters.items === undefined ? [] : parameters.items;
            return this.Create({ ...options, [exports.Kind]: 'Constructor', type: 'object', instanceOf: 'Constructor', parameters: inner, returns });
        }
        else if (globalThis.Array.isArray(parameters)) {
            return this.Create({ ...options, [exports.Kind]: 'Constructor', type: 'object', instanceOf: 'Constructor', parameters, returns });
        }
        else {
            throw new Error('TypeBuilder.Constructor: Invalid parameters');
        }
    }
    /** `Extended` Creates a Date type */
    Date(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Date', type: 'object', instanceOf: 'Date' });
    }
    /** `Standard` Creates a enum type */
    Enum(item, options = {}) {
        const values = Object.keys(item)
            .filter((key) => isNaN(key))
            .map((key) => item[key]);
        const anyOf = values.map((value) => (typeof value === 'string' ? { [exports.Kind]: 'Literal', type: 'string', const: value } : { [exports.Kind]: 'Literal', type: 'number', const: value }));
        return this.Create({ ...options, [exports.Kind]: 'Union', [exports.Hint]: 'Enum', anyOf });
    }
    /** `Extended` Creates a function type */
    Function(parameters, returns, options = {}) {
        if (parameters[exports.Kind] === 'Tuple') {
            const inner = parameters.items === undefined ? [] : parameters.items;
            return this.Create({ ...options, [exports.Kind]: 'Function', type: 'object', instanceOf: 'Function', parameters: inner, returns });
        }
        else if (globalThis.Array.isArray(parameters)) {
            return this.Create({ ...options, [exports.Kind]: 'Function', type: 'object', instanceOf: 'Function', parameters, returns });
        }
        else {
            throw new Error('TypeBuilder.Function: Invalid parameters');
        }
    }
    /** `Extended` Creates a type from this constructors instance type */
    InstanceType(schema, options = {}) {
        return { ...options, ...this.Clone(schema.returns) };
    }
    /** `Standard` Creates a integer type */
    Integer(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Integer', type: 'integer' });
    }
    /** `Standard` Creates a intersect type. */
    Intersect(objects, options = {}) {
        const isOptional = (schema) => (schema[exports.Modifier] && schema[exports.Modifier] === 'Optional') || schema[exports.Modifier] === 'ReadonlyOptional';
        const [required, optional] = [new Set(), new Set()];
        for (const object of objects) {
            for (const [key, schema] of Object.entries(object.properties)) {
                if (isOptional(schema))
                    optional.add(key);
            }
        }
        for (const object of objects) {
            for (const key of Object.keys(object.properties)) {
                if (!optional.has(key))
                    required.add(key);
            }
        }
        const properties = {};
        for (const object of objects) {
            for (const [key, schema] of Object.entries(object.properties)) {
                properties[key] = properties[key] === undefined ? schema : { [exports.Kind]: 'Union', anyOf: [properties[key], { ...schema }] };
            }
        }
        if (required.size > 0) {
            return this.Create({ ...options, [exports.Kind]: 'Object', type: 'object', properties, required: [...required] });
        }
        else {
            return this.Create({ ...options, [exports.Kind]: 'Object', type: 'object', properties });
        }
    }
    /** `Standard` Creates a keyof type */
    KeyOf(object, options = {}) {
        const items = Object.keys(object.properties).map((key) => this.Create({ ...options, [exports.Kind]: 'Literal', type: 'string', const: key }));
        return this.Create({ ...options, [exports.Kind]: 'Union', [exports.Hint]: 'KeyOf', anyOf: items });
    }
    /** `Standard` Creates a literal type. */
    Literal(value, options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Literal', const: value, type: typeof value });
    }
    /** `Standard` Creates a never type */
    Never(options = {}) {
        return this.Create({
            ...options,
            [exports.Kind]: 'Never',
            allOf: [
                { type: 'boolean', const: false },
                { type: 'boolean', const: true },
            ],
        });
    }
    /** `Standard` Creates a null type */
    Null(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Null', type: 'null' });
    }
    /** `Standard` Creates a number type */
    Number(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Number', type: 'number' });
    }
    /** `Standard` Creates an object type */
    Object(properties, options = {}) {
        const property_names = Object.keys(properties);
        const optional = property_names.filter((name) => {
            const property = properties[name];
            const modifier = property[exports.Modifier];
            return modifier && (modifier === 'Optional' || modifier === 'ReadonlyOptional');
        });
        const required = property_names.filter((name) => !optional.includes(name));
        if (required.length > 0) {
            return this.Create({ ...options, [exports.Kind]: 'Object', type: 'object', properties, required });
        }
        else {
            return this.Create({ ...options, [exports.Kind]: 'Object', type: 'object', properties });
        }
    }
    /** `Standard` Creates a new object type whose keys are omitted from the given source type */
    Omit(schema, keys, options = {}) {
        const select = keys[exports.Kind] === 'Union' ? keys.anyOf.map((schema) => schema.const) : keys;
        const next = { ...this.Clone(schema), ...options, [exports.Hint]: 'Omit' };
        if (next.required) {
            next.required = next.required.filter((key) => !select.includes(key));
            if (next.required.length === 0)
                delete next.required;
        }
        for (const key of Object.keys(next.properties)) {
            if (select.includes(key))
                delete next.properties[key];
        }
        return this.Create(next);
    }
    /** `Extended` Creates a tuple type from this functions parameters */
    Parameters(schema, options = {}) {
        return exports.Type.Tuple(schema.parameters, { ...options });
    }
    /** `Standard` Creates an object type whose properties are all optional */
    Partial(schema, options = {}) {
        const next = { ...this.Clone(schema), ...options, [exports.Hint]: 'Partial' };
        delete next.required;
        for (const key of Object.keys(next.properties)) {
            const property = next.properties[key];
            const modifer = property[exports.Modifier];
            switch (modifer) {
                case 'ReadonlyOptional':
                    property[exports.Modifier] = 'ReadonlyOptional';
                    break;
                case 'Readonly':
                    property[exports.Modifier] = 'ReadonlyOptional';
                    break;
                case 'Optional':
                    property[exports.Modifier] = 'Optional';
                    break;
                default:
                    property[exports.Modifier] = 'Optional';
                    break;
            }
        }
        return this.Create(next);
    }
    /** `Standard` Creates a new object type whose keys are picked from the given source type */
    Pick(schema, keys, options = {}) {
        const select = keys[exports.Kind] === 'Union' ? keys.anyOf.map((schema) => schema.const) : keys;
        const next = { ...this.Clone(schema), ...options, [exports.Hint]: 'Pick' };
        if (next.required) {
            next.required = next.required.filter((key) => select.includes(key));
            if (next.required.length === 0)
                delete next.required;
        }
        for (const key of Object.keys(next.properties)) {
            if (!select.includes(key))
                delete next.properties[key];
        }
        return this.Create(next);
    }
    /** `Extended` Creates a Promise type */
    Promise(item, options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Promise', type: 'object', instanceOf: 'Promise', item });
    }
    /** `Standard` Creates a record type */
    Record(key, value, options = {}) {
        // If string literal union return TObject with properties extracted from union.
        if (key[exports.Kind] === 'Union') {
            return this.Object(key.anyOf.reduce((acc, literal) => {
                return { ...acc, [literal.const]: value };
            }, {}), { ...options, [exports.Hint]: 'Record' });
        }
        // otherwise return TRecord with patternProperties
        const pattern = ['Integer', 'Number'].includes(key[exports.Kind]) ? '^(0|[1-9][0-9]*)$' : key[exports.Kind] === 'String' && key.pattern ? key.pattern : '^.*$';
        return this.Create({
            ...options,
            [exports.Kind]: 'Record',
            type: 'object',
            patternProperties: { [pattern]: value },
            additionalProperties: false,
        });
    }
    /** `Standard` Creates recursive type */
    Recursive(callback, options = {}) {
        if (options.$id === undefined)
            options.$id = `T${TypeOrdinal++}`;
        const self = callback({ [exports.Kind]: 'Self', $ref: `${options.$id}` });
        self.$id = options.$id;
        return this.Create({ ...options, ...self });
    }
    /** `Standard` Creates a reference type. The referenced type must contain a $id. */
    Ref(schema, options = {}) {
        if (schema.$id === undefined)
            throw Error('TypeBuilder.Ref: Referenced schema must specify an $id');
        return this.Create({ ...options, [exports.Kind]: 'Ref', $ref: schema.$id });
    }
    /** `Standard` Creates a string type from a regular expression */
    RegEx(regex, options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'String', type: 'string', pattern: regex.source });
    }
    /** `Standard` Creates an object type whose properties are all required */
    Required(schema, options = {}) {
        const next = { ...this.Clone(schema), ...options, [exports.Hint]: 'Required' };
        next.required = Object.keys(next.properties);
        for (const key of Object.keys(next.properties)) {
            const property = next.properties[key];
            const modifier = property[exports.Modifier];
            switch (modifier) {
                case 'ReadonlyOptional':
                    property[exports.Modifier] = 'Readonly';
                    break;
                case 'Readonly':
                    property[exports.Modifier] = 'Readonly';
                    break;
                case 'Optional':
                    delete property[exports.Modifier];
                    break;
                default:
                    delete property[exports.Modifier];
                    break;
            }
        }
        return this.Create(next);
    }
    /** `Extended` Creates a type from this functions return type */
    ReturnType(schema, options = {}) {
        return { ...options, ...this.Clone(schema.returns) };
    }
    /** Removes Kind and Modifier symbol property keys from this schema */
    Strict(schema) {
        return JSON.parse(JSON.stringify(schema));
    }
    /** `Standard` Creates a string type */
    String(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'String', type: 'string' });
    }
    /** `Standard` Creates a tuple type */
    Tuple(items, options = {}) {
        const additionalItems = false;
        const minItems = items.length;
        const maxItems = items.length;
        const schema = (items.length > 0 ? { ...options, [exports.Kind]: 'Tuple', type: 'array', items, additionalItems, minItems, maxItems } : { ...options, [exports.Kind]: 'Tuple', type: 'array', minItems, maxItems });
        return this.Create(schema);
    }
    /** `Extended` Creates a undefined type */
    Undefined(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Undefined', type: 'null', typeOf: 'Undefined' });
    }
    /** `Standard` Creates a union type */
    Union(items, options = {}) {
        return items.length === 0 ? exports.Type.Never({ ...options }) : this.Create({ ...options, [exports.Kind]: 'Union', anyOf: items });
    }
    /** `Extended` Creates a Uint8Array type */
    Uint8Array(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Uint8Array', type: 'object', instanceOf: 'Uint8Array' });
    }
    /** `Standard` Creates an unknown type */
    Unknown(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Unknown' });
    }
    /** `Standard` Creates a user defined schema that infers as type T  */
    Unsafe(options = {}) {
        return this.Create({ ...options, [exports.Kind]: options[exports.Kind] || 'Unsafe' });
    }
    /** `Extended` Creates a void type */
    Void(options = {}) {
        return this.Create({ ...options, [exports.Kind]: 'Void', type: 'null', typeOf: 'Void' });
    }
    /** Use this function to return TSchema with static and params omitted */
    Create(schema) {
        return schema;
    }
    /** Clones the given value */
    Clone(value) {
        const isObject = (object) => typeof object === 'object' && object !== null && !Array.isArray(object);
        const isArray = (object) => typeof object === 'object' && object !== null && Array.isArray(object);
        if (isObject(value)) {
            return Object.keys(value).reduce((acc, key) => ({
                ...acc,
                [key]: this.Clone(value[key]),
            }), Object.getOwnPropertySymbols(value).reduce((acc, key) => ({
                ...acc,
                [key]: this.Clone(value[key]),
            }), {}));
        }
        else if (isArray(value)) {
            return value.map((item) => this.Clone(item));
        }
        else {
            return value;
        }
    }
}
exports.TypeBuilder = TypeBuilder;
/** JSON Schema Type Builder with Static Type Resolution for TypeScript */
exports.Type = new TypeBuilder();
