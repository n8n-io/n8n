export class ValidationError {
    /**
     * Reverse errors
     * @type {Array<{ path: string?, expected: string, has: string, message: string? }>}
     */
    _rerrs: Array<{
        path: string | null;
        expected: string;
        has: string;
        message: string | null;
    }>;
    /**
     * @param {string?} path
     * @param {string} expected
     * @param {string} has
     * @param {string?} message
     */
    extend(path: string | null, expected: string, has: string, message?: string | null): void;
    toString(): string;
}
/**
 * @template T
 * @implements {equalityTraits.EqualityTrait}
 */
export class Schema<T> implements equalityTraits.EqualityTrait {
    /**
     * If true, the more things are added to the shape the more objects this schema will accept (e.g.
     * union). By default, the more objects are added, the the fewer objects this schema will accept.
     * @protected
     */
    protected static _dilutes: boolean;
    /**
     * @param {Schema<any>} other
     */
    extends(other: Schema<any>): boolean;
    /**
     * Overwrite this when necessary. By default, we only check the `shape` property which every shape
     * should have.
     * @param {Schema<any>} other
     */
    equals(other: Schema<any>): boolean;
    /**
     * Use `schema.validate(obj)` with a typed parameter that is already of typed to be an instance of
     * Schema. Validate will check the structure of the parameter and return true iff the instance
     * really is an instance of Schema.
     *
     * @param {T} o
     * @return {boolean}
     */
    validate(o: T): boolean;
    /**
     * Similar to validate, but this method accepts untyped parameters.
     *
     * @param {any} _o
     * @param {ValidationError} [_err]
     * @return {_o is T}
     */
    check(_o: any, _err?: ValidationError): _o is T;
    /**
     * @type {Schema<T?>}
     */
    get nullable(): Schema<T | null>;
    /**
     * @type {$Optional<Schema<T>>}
     */
    get optional(): $Optional<Schema<T>>;
    /**
     * Cast a variable to a specific type. Returns the casted value, or throws an exception otherwise.
     * Use this if you know that the type is of a specific type and you just want to convince the type
     * system.
     *
     * **Do not rely on these error messages!**
     * Performs an assertion check only if not in a production environment.
     *
     * @template OO
     * @param {OO} o
     * @return {Extract<OO, T> extends never ? T : (OO extends Array<never> ? T : Extract<OO,T>)}
     */
    cast<OO>(o: OO): Extract<OO, T> extends never ? T : (OO extends Array<never> ? T : Extract<OO, T>);
    /**
     * EXPECTO PATRONUM!! 🪄
     * This function protects against type errors. Though it may not work in the real world.
     *
     * "After all this time?"
     * "Always." - Snape, talking about type safety
     *
     * Ensures that a variable is a a specific type. Returns the value, or throws an exception if the assertion check failed.
     * Use this if you know that the type is of a specific type and you just want to convince the type
     * system.
     *
     * Can be useful when defining lambdas: `s.lambda(s.$number, s.$void).expect((n) => n + 1)`
     *
     * **Do not rely on these error messages!**
     * Performs an assertion check if not in a production environment.
     *
     * @param {T} o
     * @return {o extends T ? T : never}
     */
    expect(o: T): T extends T ? T : never;
    [schemaSymbol](): boolean;
    /**
     * @param {object} other
     */
    [equalityTraits.EqualityTraitSymbol](other: object): boolean;
}
/**
 * @template {(new (...args:any[]) => any) | ((...args:any[]) => any)} Constr
 * @typedef {Constr extends ((...args:any[]) => infer T) ? T : (Constr extends (new (...args:any[]) => any) ? InstanceType<Constr> : never)} Instance
 */
/**
 * @template {(new (...args:any[]) => any) | ((...args:any[]) => any)} C
 * @extends {Schema<Instance<C>>}
 */
export class $ConstructedBy<C extends (new (...args: any[]) => any) | ((...args: any[]) => any)> extends Schema<Instance<C>> {
    /**
     * @param {C} c
     * @param {((o:Instance<C>)=>boolean)|null} check
     */
    constructor(c: C, check: ((o: Instance<C>) => boolean) | null);
    shape: C;
    _c: ((o: Instance<C>) => boolean) | null;
    /**
     * @param {any} o
     * @param {ValidationError} [err]
     * @return {o is C extends ((...args:any[]) => infer T) ? T : (C extends (new (...args:any[]) => any) ? InstanceType<C> : never)} o
     */
    check(o: any, err?: ValidationError): o is C extends ((...args: any[]) => infer T) ? T : (C extends (new (...args: any[]) => any) ? InstanceType<C> : never);
}
export function $constructedBy<C extends (new (...args: any[]) => any) | ((...args: any[]) => any)>(c: C, check?: ((o: Instance<C>) => boolean) | null): CastToSchema<$ConstructedBy<C>>;
export const $$constructedBy: Schema<$ConstructedBy<(new (...args: any[]) => any) | ((...args: any[]) => any)>>;
/**
 * Check custom properties on any object. You may want to overwrite the generated Schema<any>.
 *
 * @extends {Schema<any>}
 */
export class $Custom extends Schema<any> {
    /**
     * @param {(o:any) => boolean} check
     */
    constructor(check: (o: any) => boolean);
    /**
     * @type {(o:any) => boolean}
     */
    shape: (o: any) => boolean;
    /**
     * @param {any} o
     * @param {ValidationError} err
     * @return {o is any}
     */
    check(o: any, err: ValidationError): o is any;
}
export function $custom(check: (o: any) => boolean): Schema<any>;
export const $$custom: Schema<$Custom>;
/**
 * @template {Primitive} T
 * @extends {Schema<T>}
 */
export class $Literal<T extends Primitive> extends Schema<T> {
    /**
     * @param {Array<T>} literals
     */
    constructor(literals: Array<T>);
    shape: T[];
}
export function $literal<T extends Primitive[]>(...literals: T): CastToSchema<$Literal<T[number]>>;
export const $$literal: Schema<$Literal<Primitive>>;
/**
 * @template {Array<string|Schema<string|number>>} T
 * @extends {Schema<CastStringTemplateArgsToTemplate<T>>}
 */
export class $StringTemplate<T extends Array<string | Schema<string | number>>> extends Schema<CastStringTemplateArgsToTemplate<T>> {
    /**
     * @param {T} shape
     */
    constructor(shape: T);
    shape: T;
    _r: RegExp;
}
export function $stringTemplate<T extends Array<string | Schema<string | number>>>(...literals: T): CastToSchema<$StringTemplate<T>>;
export const $$stringTemplate: Schema<$StringTemplate<(string | Schema<string | number>)[]>>;
export const $$optional: Schema<$Optional<Schema<any>>>;
/**
 * @type {Schema<never>}
 */
export const $never: Schema<never>;
export const $$never: Schema<$Never>;
/**
 * @template {{ [key: string|symbol|number]: Schema<any> }} S
 * @typedef {{ [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? Key : never]?: S[Key] extends $Optional<Schema<infer Type>> ? Type : never } & { [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? never : Key]: S[Key] extends Schema<infer Type> ? Type : never }} $ObjectToType
 */
/**
 * @template {{[key:string|symbol|number]: Schema<any>}} S
 * @extends {Schema<$ObjectToType<S>>}
 */
export class $Object<S extends {
    [key: string | symbol | number]: Schema<any>;
}> extends Schema<$ObjectToType<S>> {
    /**
     * @param {S} shape
     * @param {boolean} partial
     */
    constructor(shape: S, partial?: boolean);
    /**
     * @type {S}
     */
    shape: S;
    _isPartial: boolean;
    /**
     * @type {Schema<Partial<$ObjectToType<S>>>}
     */
    get partial(): Schema<Partial<$ObjectToType<S>>>;
    /**
     * @param {any} o
     * @param {ValidationError} err
     * @return {o is $ObjectToType<S>}
     */
    check(o: any, err: ValidationError): o is $ObjectToType<S>;
}
export function $object<S extends {
    [key: string | symbol | number]: Schema<any>;
}>(def: S): _ObjectDefToSchema<S> extends Schema<infer S_1> ? Schema<{ [K in keyof S_1]: S_1[K]; }> : never;
export const $$object: Schema<$Object<{
    [key: string]: Schema<any>;
    [key: number]: Schema<any>;
    [key: symbol]: Schema<any>;
}>>;
/**
 * @type {Schema<{[key:string]: any}>}
 */
export const $objectAny: Schema<{
    [key: string]: any;
}>;
/**
 * @template {Schema<string|number|symbol>} Keys
 * @template {Schema<any>} Values
 * @extends {Schema<{ [key in Unwrap<Keys>]: Unwrap<Values> }>}
 */
export class $Record<Keys extends Schema<string | number | symbol>, Values extends Schema<any>> extends Schema<{ [key in Unwrap<Keys>]: Unwrap<Values>; }> {
    /**
     * @param {Keys} keys
     * @param {Values} values
     */
    constructor(keys: Keys, values: Values);
    shape: {
        keys: Keys;
        values: Values;
    };
    /**
     * @param {any} o
     * @param {ValidationError} err
     * @return {o is { [key in Unwrap<Keys>]: Unwrap<Values> }}
     */
    check(o: any, err: ValidationError): o is { [key_1 in Unwrap<Keys>]: Unwrap<Values>; };
}
export function $record<Keys extends Schema<string | number | symbol>, Values extends Schema<any>>(keys: Keys, values: Values): CastToSchema<$Record<Keys, Values>>;
export const $$record: Schema<$Record<Schema<string | number | symbol>, Schema<any>>>;
/**
 * @template {Schema<any>[]} S
 * @extends {Schema<{ [Key in keyof S]: S[Key] extends Schema<infer Type> ? Type : never }>}
 */
export class $Tuple<S extends Schema<any>[]> extends Schema<{ [Key in keyof S]: S[Key] extends Schema<infer Type> ? Type : never; }> {
    /**
     * @param {S} shape
     */
    constructor(shape: S);
    shape: S;
    /**
     * @param {any} o
     * @param {ValidationError} err
     * @return {o is { [K in keyof S]: S[K] extends Schema<infer Type> ? Type : never }}
     */
    check(o: any, err: ValidationError): o is { [K in keyof S]: S[K] extends Schema<infer Type> ? Type : never; };
}
export function $tuple<T extends Array<Schema<any>>>(...def: T): CastToSchema<$Tuple<T>>;
export const $$tuple: Schema<$Tuple<Schema<any>[]>>;
/**
 * @template {Schema<any>} S
 * @extends {Schema<Array<S extends Schema<infer T> ? T : never>>}
 */
export class $Array<S extends Schema<any>> extends Schema<(S extends Schema<infer T> ? T : never)[]> {
    /**
     * @param {Array<S>} v
     */
    constructor(v: Array<S>);
    /**
     * @type {Schema<S extends Schema<infer T> ? T : never>}
     */
    shape: Schema<S extends Schema<infer T_1> ? T_1 : never>;
    /**
     * @param {any} o
     * @param {ValidationError} [err]
     * @return {o is Array<S extends Schema<infer T> ? T : never>} o
     */
    check(o: any, err?: ValidationError): o is Array<S extends Schema<infer T_1> ? T_1 : never>;
}
export function $array<T extends Array<Schema<any>>>(...def: T): Schema<Array<T extends Array<Schema<infer S>> ? S : never>>;
export const $$array: Schema<$Array<Schema<any>>>;
/**
 * @type {Schema<Array<any>>}
 */
export const $arrayAny: Schema<Array<any>>;
/**
 * @template T
 * @extends {Schema<T>}
 */
export class $InstanceOf<T> extends Schema<T> {
    /**
     * @param {new (...args:any) => T} constructor
     * @param {((o:T) => boolean)|null} check
     */
    constructor(constructor: new (...args: any) => T, check: ((o: T) => boolean) | null);
    shape: new (...args: any) => T;
    _c: ((o: T) => boolean) | null;
    /**
     * @param {any} o
     * @param {ValidationError} err
     * @return {o is T}
     */
    check(o: any, err: ValidationError): o is T;
}
export function $instanceOf<T>(c: new (...args: any) => T, check?: ((o: T) => boolean) | null): Schema<T>;
export const $$instanceOf: Schema<$InstanceOf<unknown>>;
export const $$schema: Schema<Schema<unknown>>;
/**
 * @template {Schema<any>[]} Args
 * @typedef {(...args:UnwrapArray<TuplePop<Args>>)=>Unwrap<TupleLast<Args>>} _LArgsToLambdaDef
 */
/**
 * @template {Array<Schema<any>>} Args
 * @extends {Schema<_LArgsToLambdaDef<Args>>}
 */
export class $Lambda<Args extends Array<Schema<any>>> extends Schema<_LArgsToLambdaDef<Args>> {
    /**
     * @param {Args} args
     */
    constructor(args: Args);
    len: number;
    args: Schema<any[]>;
    res: Schema<any>;
    /**
     * @param {any} f
     * @param {ValidationError} err
     * @return {f is _LArgsToLambdaDef<Args>}
     */
    check(f: any, err: ValidationError): f is _LArgsToLambdaDef<Args>;
}
export function $lambda<Args extends Schema<any>[]>(...args: Args): Schema<(...args: UnwrapArray<TuplePop<Args>>) => Unwrap<TupleLast<Args>>>;
export const $$lambda: Schema<$Lambda<Schema<any>[]>>;
/**
 * @type {Schema<Function>}
 */
export const $function: Schema<Function>;
/**
 * @template {Array<Schema<any>>} T
 * @extends {Schema<Intersect<UnwrapArray<T>>>}
 */
export class $Intersection<T extends Array<Schema<any>>> extends Schema<Intersect<UnwrapArray<T>>> {
    /**
     * @param {T} v
     */
    constructor(v: T);
    /**
     * @type {T}
     */
    shape: T;
}
export function $intersect<T extends Schema<any>[]>(...def: T): CastToSchema<$Intersection<T>>;
export const $$intersect: Schema<$Intersection<Schema<any>[]>>;
/**
 * @template S
 * @extends {Schema<S>}
 */
export class $Union<S> extends Schema<S> {
    /**
     * @param {Array<Schema<S>>} v
     */
    constructor(v: Array<Schema<S>>);
    shape: Schema<S>[];
}
export function $union<T extends Array<any>>(...schemas: T): CastToSchema<$Union<Unwrap<ReadSchema<T>>>>;
export const $$union: Schema<$Union<any>>;
/**
 * @type {Schema<any>}
 */
export const $any: Schema<any>;
export const $$any: Schema<Schema<any>>;
/**
 * @type {Schema<bigint>}
 */
export const $bigint: Schema<bigint>;
export const $$bigint: Schema<Schema<bigint>>;
/**
 * @type {Schema<symbol>}
 */
export const $symbol: Schema<symbol>;
export const $$symbol: Schema<Schema<Symbol>>;
/**
 * @type {Schema<number>}
 */
export const $number: Schema<number>;
export const $$number: Schema<Schema<number>>;
/**
 * @type {Schema<string>}
 */
export const $string: Schema<string>;
export const $$string: Schema<Schema<string>>;
/**
 * @type {Schema<boolean>}
 */
export const $boolean: Schema<boolean>;
export const $$boolean: Schema<Schema<boolean>>;
/**
 * @type {Schema<undefined>}
 */
export const $undefined: Schema<undefined>;
export const $$undefined: Schema<Schema<undefined>>;
/**
 * @type {Schema<void>}
 */
export const $void: Schema<void>;
export const $$void: Schema<Schema<void>>;
export const $null: Schema<null>;
export const $$null: Schema<Schema<null>>;
export const $uint8Array: Schema<Uint8Array<ArrayBuffer>>;
export const $$uint8Array: Schema<Schema<Uint8Array>>;
/**
 * @type {Schema<Primitive>}
 */
export const $primitive: Schema<Primitive>;
/**
 * @typedef {JSON[]} JSONArray
 */
/**
 * @typedef {Primitive|JSONArray|{ [key:string]:JSON }} JSON
 */
/**
 * @type {Schema<null|number|string|boolean|JSON[]|{[key:string]:JSON}>}
 */
export const $json: Schema<null | number | string | boolean | JSON[] | {
    [key: string]: JSON;
}>;
export function $<IN>(o: IN): ReadSchema<IN>;
/**
 * Assert that a variable is of this specific type.
 * The assertion check is only performed in non-production environments.
 *
 * @type {<T>(o:any,schema:Schema<T>) => asserts o is T}
 */
export const assert: <T>(o: any, schema: Schema<T>) => asserts o is T;
/**
 * @template In
 * @template Out
 * @typedef {{ if: Schema<In>, h: (o:In,state?:any)=>Out }} Pattern
 */
/**
 * @template {Pattern<any,any>} P
 * @template In
 * @typedef {ReturnType<Extract<P,Pattern<In extends number ? number : (In extends string ? string : In),any>>['h']>} PatternMatchResult
 */
/**
 * @todo move this to separate library
 * @template {any} [State=undefined]
 * @template {Pattern<any,any>} [Patterns=never]
 */
export class PatternMatcher<State extends unknown = undefined, Patterns extends Pattern<any, any> = never> {
    /**
     * @param {Schema<State>} [$state]
     */
    constructor($state?: Schema<State>);
    /**
     * @type {Array<Patterns>}
     */
    patterns: Array<Patterns>;
    $state: Schema<State> | undefined;
    /**
     * @template P
     * @template R
     * @param {P} pattern
     * @param {(o:NoInfer<Unwrap<ReadSchema<P>>>,s:State)=>R} handler
     * @return {PatternMatcher<State,Patterns|Pattern<Unwrap<ReadSchema<P>>,R>>}
     */
    if<P, R>(pattern: P, handler: (o: NoInfer<Unwrap<ReadSchema<P>>>, s: State) => R): PatternMatcher<State, Patterns | Pattern<Unwrap<ReadSchema<P>>, R>>;
    /**
     * @template R
     * @param {(o:any,s:State)=>R} h
     */
    else<R>(h: (o: any, s: State) => R): PatternMatcher<State, Patterns | Pattern<any, R>>;
    /**
     * @return {State extends undefined
     *   ? <In extends Unwrap<Patterns['if']>>(o:In,state?:undefined)=>PatternMatchResult<Patterns,In>
     *   : <In extends Unwrap<Patterns['if']>>(o:In,state:State)=>PatternMatchResult<Patterns,In>}
     */
    done(): State extends undefined ? <In extends Unwrap<Patterns["if"]>>(o: In, state?: undefined) => PatternMatchResult<Patterns, In> : <In extends Unwrap<Patterns["if"]>>(o: In, state: State) => PatternMatchResult<Patterns, In>;
}
export function match<State = undefined>(state?: State): PatternMatcher<State extends undefined ? undefined : Unwrap<ReadSchema<State>>>;
export function random<S>(gen: prng.PRNG, schema: S): Unwrap<ReadSchema<S>>;
export type Primitive = string | number | bigint | boolean | null | undefined | symbol;
export type AnyObject = {
    [k: string | number | symbol]: any;
};
export type Unwrap<T> = T extends Schema<infer X> ? X : T;
export type TypeOf<T> = T extends Schema<infer X> ? X : T;
export type UnwrapArray<T extends readonly unknown[]> = T extends readonly [Schema<infer First>, ...infer Rest] ? [First, ...UnwrapArray<Rest>] : [];
export type CastToSchema<T> = T extends Schema<infer S> ? Schema<S> : never;
export type TupleLast<Arr extends unknown[]> = Arr extends [...unknown[], infer L] ? L : never;
export type TuplePop<Arr extends unknown[]> = Arr extends [...infer Fs, unknown] ? Fs : never;
export type Intersect<T extends readonly unknown[]> = T extends [] ? {} : T extends [infer First] ? First : T extends [infer First, ...infer Rest] ? First & Intersect<Rest> : never;
export type Instance<Constr extends (new (...args: any[]) => any) | ((...args: any[]) => any)> = Constr extends ((...args: any[]) => infer T) ? T : (Constr extends (new (...args: any[]) => any) ? InstanceType<Constr> : never);
export type CastStringTemplateArgsToTemplate<Ts extends Array<string | Schema<string | number>>> = Ts extends [] ? `` : (Ts extends [infer T] ? (Unwrap<T> extends (string | number) ? Unwrap<T> : never) : (Ts extends [infer T1, ...infer Rest] ? `${Unwrap<T1> extends (string | number) ? Unwrap<T1> : never}${Rest extends Array<string | Schema<string | number>> ? CastStringTemplateArgsToTemplate<Rest> : never}` : never));
export type $ObjectToType<S extends {
    [key: string | symbol | number]: Schema<any>;
}> = { [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? Key : never]?: S[Key] extends $Optional<Schema<infer Type>> ? Type : never; } & { [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? never : Key]: S[Key] extends Schema<infer Type> ? Type : never; };
export type _ObjectDefToSchema<S> = Schema<{ [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? Key : never]?: S[Key] extends $Optional<Schema<infer Type>> ? Type : never; } & { [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? never : Key]: S[Key] extends Schema<infer Type> ? Type : never; }>;
export type _LArgsToLambdaDef<Args extends Schema<any>[]> = (...args: UnwrapArray<TuplePop<Args>>) => Unwrap<TupleLast<Args>>;
export type JSONArray = JSON[];
export type JSON = Primitive | JSONArray | {
    [key: string]: JSON;
};
export type ReadSchemaOld<IN extends unknown> = IN extends Schema<any> ? IN : (IN extends string | number | boolean | null ? Schema<IN> : (IN extends new (...args: any[]) => any ? Schema<InstanceType<IN>> : (IN extends any[] ? Schema<{ [K in keyof IN]: Unwrap<ReadSchema<IN[K]>>; }[number]> : (IN extends object ? (_ObjectDefToSchema<{ [K in keyof IN]: ReadSchema<IN[K]>; }> extends Schema<infer S> ? Schema<{ [K in keyof S]: S[K]; }> : never) : never))));
export type ReadSchema<IN extends unknown> = [Extract<IN, Schema<any>>, Extract<IN, string | number | boolean | null>, Extract<IN, new (...args: any[]) => any>, Extract<IN, any[]>, Extract<Exclude<IN, Schema<any> | string | number | boolean | null | (new (...args: any[]) => any) | any[]>, object>] extends [infer Schemas, infer Primitives, infer Constructors, infer Arrs, infer Obj] ? Schema<(Schemas extends Schema<infer S> ? S : never) | Primitives | (Constructors extends new (...args: any[]) => any ? InstanceType<Constructors> : never) | (Arrs extends any[] ? { [K in keyof Arrs]: Unwrap<ReadSchema<Arrs[K]>>; }[number] : never) | (Obj extends object ? Unwrap<(_ObjectDefToSchema<{ [K in keyof Obj]: ReadSchema<Obj[K]>; }> extends Schema<infer S> ? Schema<{ [K in keyof S]: S[K]; }> : never)> : never)> : never;
export type Q = ReadSchema<{
    x: 42;
} | {
    y: 99;
} | Schema<string> | [1, 2, {}]>;
export type Pattern<In, Out> = {
    if: Schema<In>;
    h: (o: In, state?: any) => Out;
};
export type PatternMatchResult<P extends Pattern<any, any>, In> = ReturnType<Extract<P, Pattern<In extends number ? number : (In extends string ? string : In), any>>["h"]>;
import * as equalityTraits from './trait/equality.js';
/**
 * @template {Schema<any>} S
 * @extends Schema<Unwrap<S>|undefined>
 */
declare class $Optional<S extends Schema<any>> extends Schema<Unwrap<S> | undefined> {
    /**
     * @param {S} shape
     */
    constructor(shape: S);
    shape: S;
    get [isOptionalSymbol](): boolean;
}
/**
 * @typedef {string|number|bigint|boolean|null|undefined|symbol} Primitive
 */
/**
 * @typedef {{ [k:string|number|symbol]: any }} AnyObject
 */
/**
 * @template T
 * @typedef {T extends Schema<infer X> ? X : T} Unwrap
 */
/**
 * @template T
 * @typedef {T extends Schema<infer X> ? X : T} TypeOf
 */
/**
 * @template {readonly unknown[]} T
 * @typedef {T extends readonly [Schema<infer First>, ...infer Rest] ? [First, ...UnwrapArray<Rest>] : [] } UnwrapArray
 */
/**
 * @template T
 * @typedef {T extends Schema<infer S> ? Schema<S> : never} CastToSchema
 */
/**
 * @template {unknown[]} Arr
 * @typedef {Arr extends [...unknown[], infer L] ? L : never} TupleLast
 */
/**
 * @template {unknown[]} Arr
 * @typedef {Arr extends [...infer Fs, unknown] ? Fs : never} TuplePop
 */
/**
 * @template {readonly unknown[]} T
 * @typedef {T extends []
 *   ? {}
 *   : T extends [infer First]
 *   ? First
 *   : T extends [infer First, ...infer Rest]
 *   ? First & Intersect<Rest>
 *   : never
 * } Intersect
 */
declare const schemaSymbol: unique symbol;
/**
 * @extends Schema<never>
 */
declare class $Never extends Schema<never> {
    constructor();
}
import * as prng from './prng.js';
declare const isOptionalSymbol: unique symbol;
export {};
//# sourceMappingURL=schema.d.ts.map