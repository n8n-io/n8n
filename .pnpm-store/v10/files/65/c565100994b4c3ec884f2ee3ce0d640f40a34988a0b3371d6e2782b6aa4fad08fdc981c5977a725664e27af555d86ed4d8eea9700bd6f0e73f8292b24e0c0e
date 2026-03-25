"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/compiler

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
exports.TypeCompiler = exports.TypeCompilerTypeGuardError = exports.TypeCompilerDereferenceError = exports.TypeCompilerUnknownTypeError = exports.TypeCheck = void 0;
const Types = require("../typebox");
const index_1 = require("../errors/index");
const index_2 = require("../system/index");
const hash_1 = require("../value/hash");
// -------------------------------------------------------------------
// TypeCheck
// -------------------------------------------------------------------
class TypeCheck {
    constructor(schema, references, checkFunc, code) {
        this.schema = schema;
        this.references = references;
        this.checkFunc = checkFunc;
        this.code = code;
    }
    /** Returns the generated assertion code used to validate this type. */
    Code() {
        return this.code;
    }
    /** Returns an iterator for each error in this value. */
    Errors(value) {
        return index_1.ValueErrors.Errors(this.schema, this.references, value);
    }
    /** Returns true if the value matches the compiled type. */
    Check(value) {
        return this.checkFunc(value);
    }
}
exports.TypeCheck = TypeCheck;
// -------------------------------------------------------------------
// Character
// -------------------------------------------------------------------
var Character;
(function (Character) {
    function DollarSign(code) {
        return code === 36;
    }
    Character.DollarSign = DollarSign;
    function IsUnderscore(code) {
        return code === 95;
    }
    Character.IsUnderscore = IsUnderscore;
    function IsAlpha(code) {
        return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    }
    Character.IsAlpha = IsAlpha;
    function IsNumeric(code) {
        return code >= 48 && code <= 57;
    }
    Character.IsNumeric = IsNumeric;
})(Character || (Character = {}));
// -------------------------------------------------------------------
// MemberExpression
// -------------------------------------------------------------------
var MemberExpression;
(function (MemberExpression) {
    function IsFirstCharacterNumeric(value) {
        if (value.length === 0)
            return false;
        return Character.IsNumeric(value.charCodeAt(0));
    }
    function IsAccessor(value) {
        if (IsFirstCharacterNumeric(value))
            return false;
        for (let i = 0; i < value.length; i++) {
            const code = value.charCodeAt(i);
            const check = Character.IsAlpha(code) || Character.IsNumeric(code) || Character.DollarSign(code) || Character.IsUnderscore(code);
            if (!check)
                return false;
        }
        return true;
    }
    function EscapeHyphen(key) {
        return key.replace(/'/g, "\\'");
    }
    function Encode(object, key) {
        return IsAccessor(key) ? `${object}.${key}` : `${object}['${EscapeHyphen(key)}']`;
    }
    MemberExpression.Encode = Encode;
})(MemberExpression || (MemberExpression = {}));
// -------------------------------------------------------------------
// Identifier
// -------------------------------------------------------------------
var Identifier;
(function (Identifier) {
    function Encode($id) {
        const buffer = [];
        for (let i = 0; i < $id.length; i++) {
            const code = $id.charCodeAt(i);
            if (Character.IsNumeric(code) || Character.IsAlpha(code)) {
                buffer.push($id.charAt(i));
            }
            else {
                buffer.push(`_${code}_`);
            }
        }
        return buffer.join('').replace(/__/g, '_');
    }
    Identifier.Encode = Encode;
})(Identifier || (Identifier = {}));
// -------------------------------------------------------------------
// TypeCompiler
// -------------------------------------------------------------------
class TypeCompilerUnknownTypeError extends Error {
    constructor(schema) {
        super('TypeCompiler: Unknown type');
        this.schema = schema;
    }
}
exports.TypeCompilerUnknownTypeError = TypeCompilerUnknownTypeError;
class TypeCompilerDereferenceError extends Error {
    constructor(schema) {
        super(`TypeCompiler: Unable to dereference schema with $id '${schema.$ref}'`);
        this.schema = schema;
    }
}
exports.TypeCompilerDereferenceError = TypeCompilerDereferenceError;
class TypeCompilerTypeGuardError extends Error {
    constructor(schema) {
        super('TypeCompiler: Preflight validation check failed to guard for the given schema');
        this.schema = schema;
    }
}
exports.TypeCompilerTypeGuardError = TypeCompilerTypeGuardError;
/** Compiles Types for Runtime Type Checking */
var TypeCompiler;
(function (TypeCompiler) {
    // -------------------------------------------------------------------
    // Guards
    // -------------------------------------------------------------------
    function IsBigInt(value) {
        return typeof value === 'bigint';
    }
    function IsNumber(value) {
        return typeof value === 'number' && globalThis.Number.isFinite(value);
    }
    function IsString(value) {
        return typeof value === 'string';
    }
    // -------------------------------------------------------------------
    // Polices
    // -------------------------------------------------------------------
    function IsExactOptionalProperty(value, key, expression) {
        return index_2.TypeSystem.ExactOptionalPropertyTypes ? `('${key}' in ${value} ? ${expression} : true)` : `(${MemberExpression.Encode(value, key)} !== undefined ? ${expression} : true)`;
    }
    function IsObjectCheck(value) {
        return !index_2.TypeSystem.AllowArrayObjects ? `(typeof ${value} === 'object' && ${value} !== null && !Array.isArray(${value}))` : `(typeof ${value} === 'object' && ${value} !== null)`;
    }
    function IsRecordCheck(value) {
        return !index_2.TypeSystem.AllowArrayObjects
            ? `(typeof ${value} === 'object' && ${value} !== null && !Array.isArray(${value}) && !(${value} instanceof Date) && !(${value} instanceof Uint8Array))`
            : `(typeof ${value} === 'object' && ${value} !== null && !(${value} instanceof Date) && !(${value} instanceof Uint8Array))`;
    }
    function IsNumberCheck(value) {
        return !index_2.TypeSystem.AllowNaN ? `(typeof ${value} === 'number' && Number.isFinite(${value}))` : `typeof ${value} === 'number'`;
    }
    function IsVoidCheck(value) {
        return index_2.TypeSystem.AllowVoidNull ? `(${value} === undefined || ${value} === null)` : `${value} === undefined`;
    }
    // -------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------
    function* Any(schema, references, value) {
        yield 'true';
    }
    function* Array(schema, references, value) {
        const expression = CreateExpression(schema.items, references, 'value');
        yield `Array.isArray(${value}) && ${value}.every(value => ${expression})`;
        if (IsNumber(schema.minItems))
            yield `${value}.length >= ${schema.minItems}`;
        if (IsNumber(schema.maxItems))
            yield `${value}.length <= ${schema.maxItems}`;
        if (schema.uniqueItems === true)
            yield `((function() { const set = new Set(); for(const element of ${value}) { const hashed = hash(element); if(set.has(hashed)) { return false } else { set.add(hashed) } } return true })())`;
    }
    function* BigInt(schema, references, value) {
        yield `(typeof ${value} === 'bigint')`;
        if (IsBigInt(schema.multipleOf))
            yield `(${value} % BigInt(${schema.multipleOf})) === 0`;
        if (IsBigInt(schema.exclusiveMinimum))
            yield `${value} > BigInt(${schema.exclusiveMinimum})`;
        if (IsBigInt(schema.exclusiveMaximum))
            yield `${value} < BigInt(${schema.exclusiveMaximum})`;
        if (IsBigInt(schema.minimum))
            yield `${value} >= BigInt(${schema.minimum})`;
        if (IsBigInt(schema.maximum))
            yield `${value} <= BigInt(${schema.maximum})`;
    }
    function* Boolean(schema, references, value) {
        yield `typeof ${value} === 'boolean'`;
    }
    function* Constructor(schema, references, value) {
        yield* Visit(schema.returns, references, `${value}.prototype`);
    }
    function* Date(schema, references, value) {
        yield `(${value} instanceof Date) && Number.isFinite(${value}.getTime())`;
        if (IsNumber(schema.exclusiveMinimumTimestamp))
            yield `${value}.getTime() > ${schema.exclusiveMinimumTimestamp}`;
        if (IsNumber(schema.exclusiveMaximumTimestamp))
            yield `${value}.getTime() < ${schema.exclusiveMaximumTimestamp}`;
        if (IsNumber(schema.minimumTimestamp))
            yield `${value}.getTime() >= ${schema.minimumTimestamp}`;
        if (IsNumber(schema.maximumTimestamp))
            yield `${value}.getTime() <= ${schema.maximumTimestamp}`;
    }
    function* Function(schema, references, value) {
        yield `typeof ${value} === 'function'`;
    }
    function* Integer(schema, references, value) {
        yield `(typeof ${value} === 'number' && Number.isInteger(${value}))`;
        if (IsNumber(schema.multipleOf))
            yield `(${value} % ${schema.multipleOf}) === 0`;
        if (IsNumber(schema.exclusiveMinimum))
            yield `${value} > ${schema.exclusiveMinimum}`;
        if (IsNumber(schema.exclusiveMaximum))
            yield `${value} < ${schema.exclusiveMaximum}`;
        if (IsNumber(schema.minimum))
            yield `${value} >= ${schema.minimum}`;
        if (IsNumber(schema.maximum))
            yield `${value} <= ${schema.maximum}`;
    }
    function* Intersect(schema, references, value) {
        if (schema.unevaluatedProperties === undefined) {
            const expressions = schema.allOf.map((schema) => CreateExpression(schema, references, value));
            yield `${expressions.join(' && ')}`;
        }
        else if (schema.unevaluatedProperties === false) {
            // prettier-ignore
            const schemaKeys = Types.KeyResolver.Resolve(schema).map((key) => `'${key}'`).join(', ');
            const expressions = schema.allOf.map((schema) => CreateExpression(schema, references, value));
            const expression1 = `Object.getOwnPropertyNames(${value}).every(key => [${schemaKeys}].includes(key))`;
            yield `${expressions.join(' && ')} && ${expression1}`;
        }
        else if (typeof schema.unevaluatedProperties === 'object') {
            // prettier-ignore
            const schemaKeys = Types.KeyResolver.Resolve(schema).map((key) => `'${key}'`).join(', ');
            const expressions = schema.allOf.map((schema) => CreateExpression(schema, references, value));
            const expression1 = CreateExpression(schema.unevaluatedProperties, references, 'value[key]');
            const expression2 = `Object.getOwnPropertyNames(${value}).every(key => [${schemaKeys}].includes(key) || ${expression1})`;
            yield `${expressions.join(' && ')} && ${expression2}`;
        }
    }
    function* Literal(schema, references, value) {
        if (typeof schema.const === 'number' || typeof schema.const === 'boolean') {
            yield `${value} === ${schema.const}`;
        }
        else {
            yield `${value} === '${schema.const}'`;
        }
    }
    function* Never(schema, references, value) {
        yield `false`;
    }
    function* Not(schema, references, value) {
        const left = CreateExpression(schema.allOf[0].not, references, value);
        const right = CreateExpression(schema.allOf[1], references, value);
        yield `!${left} && ${right}`;
    }
    function* Null(schema, references, value) {
        yield `${value} === null`;
    }
    function* Number(schema, references, value) {
        yield IsNumberCheck(value);
        if (IsNumber(schema.multipleOf))
            yield `(${value} % ${schema.multipleOf}) === 0`;
        if (IsNumber(schema.exclusiveMinimum))
            yield `${value} > ${schema.exclusiveMinimum}`;
        if (IsNumber(schema.exclusiveMaximum))
            yield `${value} < ${schema.exclusiveMaximum}`;
        if (IsNumber(schema.minimum))
            yield `${value} >= ${schema.minimum}`;
        if (IsNumber(schema.maximum))
            yield `${value} <= ${schema.maximum}`;
    }
    function* Object(schema, references, value) {
        yield IsObjectCheck(value);
        if (IsNumber(schema.minProperties))
            yield `Object.getOwnPropertyNames(${value}).length >= ${schema.minProperties}`;
        if (IsNumber(schema.maxProperties))
            yield `Object.getOwnPropertyNames(${value}).length <= ${schema.maxProperties}`;
        const knownKeys = globalThis.Object.getOwnPropertyNames(schema.properties);
        for (const knownKey of knownKeys) {
            const memberExpression = MemberExpression.Encode(value, knownKey);
            const property = schema.properties[knownKey];
            if (schema.required && schema.required.includes(knownKey)) {
                yield* Visit(property, references, memberExpression);
                if (Types.ExtendsUndefined.Check(property))
                    yield `('${knownKey}' in ${value})`;
            }
            else {
                const expression = CreateExpression(property, references, memberExpression);
                yield IsExactOptionalProperty(value, knownKey, expression);
            }
        }
        if (schema.additionalProperties === false) {
            if (schema.required && schema.required.length === knownKeys.length) {
                yield `Object.getOwnPropertyNames(${value}).length === ${knownKeys.length}`;
            }
            else {
                const keys = `[${knownKeys.map((key) => `'${key}'`).join(', ')}]`;
                yield `Object.getOwnPropertyNames(${value}).every(key => ${keys}.includes(key))`;
            }
        }
        if (typeof schema.additionalProperties === 'object') {
            const expression = CreateExpression(schema.additionalProperties, references, 'value[key]');
            const keys = `[${knownKeys.map((key) => `'${key}'`).join(', ')}]`;
            yield `(Object.getOwnPropertyNames(${value}).every(key => ${keys}.includes(key) || ${expression}))`;
        }
    }
    function* Promise(schema, references, value) {
        yield `(typeof value === 'object' && typeof ${value}.then === 'function')`;
    }
    function* Record(schema, references, value) {
        yield IsRecordCheck(value);
        if (IsNumber(schema.minProperties))
            yield `Object.getOwnPropertyNames(${value}).length >= ${schema.minProperties}`;
        if (IsNumber(schema.maxProperties))
            yield `Object.getOwnPropertyNames(${value}).length <= ${schema.maxProperties}`;
        const [keyPattern, valueSchema] = globalThis.Object.entries(schema.patternProperties)[0];
        const local = PushLocal(`new RegExp(/${keyPattern}/)`);
        yield `(Object.getOwnPropertyNames(${value}).every(key => ${local}.test(key)))`;
        const expression = CreateExpression(valueSchema, references, 'value');
        yield `Object.values(${value}).every(value => ${expression})`;
    }
    function* Ref(schema, references, value) {
        const index = references.findIndex((foreign) => foreign.$id === schema.$ref);
        if (index === -1)
            throw new TypeCompilerDereferenceError(schema);
        const target = references[index];
        // Reference: If we have seen this reference before we can just yield and return
        // the function call. If this isn't the case we defer to visit to generate and
        // set the function for subsequent passes. Consider for refactor.
        if (state_local_function_names.has(schema.$ref))
            return yield `${CreateFunctionName(schema.$ref)}(${value})`;
        yield* Visit(target, references, value);
    }
    function* String(schema, references, value) {
        yield `(typeof ${value} === 'string')`;
        if (IsNumber(schema.minLength))
            yield `${value}.length >= ${schema.minLength}`;
        if (IsNumber(schema.maxLength))
            yield `${value}.length <= ${schema.maxLength}`;
        if (schema.pattern !== undefined) {
            const local = PushLocal(`${new RegExp(schema.pattern)};`);
            yield `${local}.test(${value})`;
        }
        if (schema.format !== undefined) {
            yield `format('${schema.format}', ${value})`;
        }
    }
    function* Symbol(schema, references, value) {
        yield `(typeof ${value} === 'symbol')`;
    }
    function* TemplateLiteral(schema, references, value) {
        yield `(typeof ${value} === 'string')`;
        const local = PushLocal(`${new RegExp(schema.pattern)};`);
        yield `${local}.test(${value})`;
    }
    function* This(schema, references, value) {
        const func = CreateFunctionName(schema.$ref);
        yield `${func}(${value})`;
    }
    function* Tuple(schema, references, value) {
        yield `(Array.isArray(${value}))`;
        if (schema.items === undefined)
            return yield `${value}.length === 0`;
        yield `(${value}.length === ${schema.maxItems})`;
        for (let i = 0; i < schema.items.length; i++) {
            const expression = CreateExpression(schema.items[i], references, `${value}[${i}]`);
            yield `${expression}`;
        }
    }
    function* Undefined(schema, references, value) {
        yield `${value} === undefined`;
    }
    function* Union(schema, references, value) {
        const expressions = schema.anyOf.map((schema) => CreateExpression(schema, references, value));
        yield `(${expressions.join(' || ')})`;
    }
    function* Uint8Array(schema, references, value) {
        yield `${value} instanceof Uint8Array`;
        if (IsNumber(schema.maxByteLength))
            yield `(${value}.length <= ${schema.maxByteLength})`;
        if (IsNumber(schema.minByteLength))
            yield `(${value}.length >= ${schema.minByteLength})`;
    }
    function* Unknown(schema, references, value) {
        yield 'true';
    }
    function* Void(schema, references, value) {
        yield IsVoidCheck(value);
    }
    function* UserDefined(schema, references, value) {
        const schema_key = `schema_key_${state_remote_custom_types.size}`;
        state_remote_custom_types.set(schema_key, schema);
        yield `custom('${schema[Types.Kind]}', '${schema_key}', ${value})`;
    }
    function* Visit(schema, references, value) {
        const references_ = IsString(schema.$id) ? [...references, schema] : references;
        const schema_ = schema;
        // Reference: Referenced schemas can originate from either additional schemas
        // or inline in the schema itself. Ideally the recursive path should align to
        // reference path. Consider for refactor.
        if (IsString(schema.$id) && !state_local_function_names.has(schema.$id)) {
            state_local_function_names.add(schema.$id);
            const name = CreateFunctionName(schema.$id);
            const body = CreateFunction(name, schema, references, 'value');
            PushFunction(body);
            yield `${name}(${value})`;
            return;
        }
        switch (schema_[Types.Kind]) {
            case 'Any':
                return yield* Any(schema_, references_, value);
            case 'Array':
                return yield* Array(schema_, references_, value);
            case 'BigInt':
                return yield* BigInt(schema_, references_, value);
            case 'Boolean':
                return yield* Boolean(schema_, references_, value);
            case 'Constructor':
                return yield* Constructor(schema_, references_, value);
            case 'Date':
                return yield* Date(schema_, references_, value);
            case 'Function':
                return yield* Function(schema_, references_, value);
            case 'Integer':
                return yield* Integer(schema_, references_, value);
            case 'Intersect':
                return yield* Intersect(schema_, references_, value);
            case 'Literal':
                return yield* Literal(schema_, references_, value);
            case 'Never':
                return yield* Never(schema_, references_, value);
            case 'Not':
                return yield* Not(schema_, references_, value);
            case 'Null':
                return yield* Null(schema_, references_, value);
            case 'Number':
                return yield* Number(schema_, references_, value);
            case 'Object':
                return yield* Object(schema_, references_, value);
            case 'Promise':
                return yield* Promise(schema_, references_, value);
            case 'Record':
                return yield* Record(schema_, references_, value);
            case 'Ref':
                return yield* Ref(schema_, references_, value);
            case 'String':
                return yield* String(schema_, references_, value);
            case 'Symbol':
                return yield* Symbol(schema_, references_, value);
            case 'TemplateLiteral':
                return yield* TemplateLiteral(schema_, references_, value);
            case 'This':
                return yield* This(schema_, references_, value);
            case 'Tuple':
                return yield* Tuple(schema_, references_, value);
            case 'Undefined':
                return yield* Undefined(schema_, references_, value);
            case 'Union':
                return yield* Union(schema_, references_, value);
            case 'Uint8Array':
                return yield* Uint8Array(schema_, references_, value);
            case 'Unknown':
                return yield* Unknown(schema_, references_, value);
            case 'Void':
                return yield* Void(schema_, references_, value);
            default:
                if (!Types.TypeRegistry.Has(schema_[Types.Kind]))
                    throw new TypeCompilerUnknownTypeError(schema);
                return yield* UserDefined(schema_, references_, value);
        }
    }
    // -------------------------------------------------------------------
    // Compiler State
    // -------------------------------------------------------------------
    const state_local_variables = new Set(); // local variables and functions
    const state_local_function_names = new Set(); // local function names used call ref validators
    const state_remote_custom_types = new Map(); // remote custom types used during compilation
    function ResetCompiler() {
        state_local_variables.clear();
        state_local_function_names.clear();
        state_remote_custom_types.clear();
    }
    function CreateExpression(schema, references, value) {
        return `(${[...Visit(schema, references, value)].join(' && ')})`;
    }
    function CreateFunctionName($id) {
        return `check_${Identifier.Encode($id)}`;
    }
    function CreateFunction(name, schema, references, value) {
        const expression = [...Visit(schema, references, value)].map((condition) => `    ${condition}`).join(' &&\n');
        return `function ${name}(value) {\n  return (\n${expression}\n )\n}`;
    }
    function PushFunction(functionBody) {
        state_local_variables.add(functionBody);
    }
    function PushLocal(expression) {
        const local = `local_${state_local_variables.size}`;
        state_local_variables.add(`const ${local} = ${expression}`);
        return local;
    }
    function GetLocals() {
        return [...state_local_variables.values()];
    }
    // -------------------------------------------------------------------
    // Compile
    // -------------------------------------------------------------------
    function Build(schema, references) {
        ResetCompiler();
        const check = CreateFunction('check', schema, references, 'value');
        const locals = GetLocals();
        return `${locals.join('\n')}\nreturn ${check}`;
    }
    /** Returns the generated assertion code used to validate this type. */
    function Code(schema, references = []) {
        if (!Types.TypeGuard.TSchema(schema))
            throw new TypeCompilerTypeGuardError(schema);
        for (const schema of references)
            if (!Types.TypeGuard.TSchema(schema))
                throw new TypeCompilerTypeGuardError(schema);
        return Build(schema, references);
    }
    TypeCompiler.Code = Code;
    /** Compiles the given type for runtime type checking. This compiler only accepts known TypeBox types non-inclusive of unsafe types. */
    function Compile(schema, references = []) {
        const code = Code(schema, references);
        const custom_schemas = new Map(state_remote_custom_types);
        const compiledFunction = globalThis.Function('custom', 'format', 'hash', code);
        const checkFunction = compiledFunction((kind, schema_key, value) => {
            if (!Types.TypeRegistry.Has(kind) || !custom_schemas.has(schema_key))
                return false;
            const schema = custom_schemas.get(schema_key);
            const func = Types.TypeRegistry.Get(kind);
            return func(schema, value);
        }, (format, value) => {
            if (!Types.FormatRegistry.Has(format))
                return false;
            const func = Types.FormatRegistry.Get(format);
            return func(value);
        }, (value) => {
            return hash_1.ValueHash.Create(value);
        });
        return new TypeCheck(schema, references, checkFunction, code);
    }
    TypeCompiler.Compile = Compile;
})(TypeCompiler = exports.TypeCompiler || (exports.TypeCompiler = {}));
