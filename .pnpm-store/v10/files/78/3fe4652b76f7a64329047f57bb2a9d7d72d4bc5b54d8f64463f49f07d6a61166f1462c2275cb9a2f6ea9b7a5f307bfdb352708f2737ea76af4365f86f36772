export declare const Modifier: unique symbol;
export declare const Hint: unique symbol;
export declare const Kind: unique symbol;
export declare const PatternBoolean = "(true|false)";
export declare const PatternNumber = "(0|[1-9][0-9]*)";
export declare const PatternString = "(.*)";
export declare const PatternBooleanExact: string;
export declare const PatternNumberExact: string;
export declare const PatternStringExact: string;
export type TupleToIntersect<T extends any[]> = T extends [infer I] ? I : T extends [infer I, ...infer R] ? I & TupleToIntersect<R> : never;
export type TupleToUnion<T extends any[]> = {
    [K in keyof T]: T[K];
}[number];
export type UnionToIntersect<U> = (U extends unknown ? (arg: U) => 0 : never) extends (arg: infer I) => 0 ? I : never;
export type UnionLast<U> = UnionToIntersect<U extends unknown ? (x: U) => 0 : never> extends (x: infer L) => 0 ? L : never;
export type UnionToTuple<U, L = UnionLast<U>> = [U] extends [never] ? [] : [...UnionToTuple<Exclude<U, L>>, L];
export type Assert<T, E> = T extends E ? T : never;
export type Evaluate<T> = T extends infer O ? {
    [K in keyof O]: O[K];
} : never;
export type Ensure<T> = T extends infer U ? U : never;
export type TModifier = TReadonlyOptional<TSchema> | TOptional<TSchema> | TReadonly<TSchema>;
export type TReadonly<T extends TSchema> = T & {
    [Modifier]: 'Readonly';
};
export type TOptional<T extends TSchema> = T & {
    [Modifier]: 'Optional';
};
export type TReadonlyOptional<T extends TSchema> = T & {
    [Modifier]: 'ReadonlyOptional';
};
export interface SchemaOptions {
    $schema?: string;
    /** Id for this schema */
    $id?: string;
    /** Title of this schema */
    title?: string;
    /** Description of this schema */
    description?: string;
    /** Default value for this schema */
    default?: any;
    /** Example values matching this schema */
    examples?: any;
    [prop: string]: any;
}
export interface TKind {
    [Kind]: string;
}
export interface TSchema extends SchemaOptions, TKind {
    [Modifier]?: string;
    [Hint]?: string;
    params: unknown[];
    static: unknown;
}
export type TAnySchema = TSchema | TAny | TArray | TBigInt | TBoolean | TConstructor | TDate | TEnum | TFunction | TInteger | TIntersect | TLiteral | TNot | TNull | TNumber | TObject | TPromise | TRecord | TRef | TString | TSymbol | TTemplateLiteral | TThis | TTuple | TUndefined | TUnion | TUint8Array | TUnknown | TVoid;
export type TNumeric = TInteger | TNumber;
export interface NumericOptions<N extends number | bigint> extends SchemaOptions {
    exclusiveMaximum?: N;
    exclusiveMinimum?: N;
    maximum?: N;
    minimum?: N;
    multipleOf?: N;
}
export interface TAny extends TSchema {
    [Kind]: 'Any';
    static: any;
}
export interface ArrayOptions extends SchemaOptions {
    uniqueItems?: boolean;
    minItems?: number;
    maxItems?: number;
}
export interface TArray<T extends TSchema = TSchema> extends TSchema, ArrayOptions {
    [Kind]: 'Array';
    static: Static<T, this['params']>[];
    type: 'array';
    items: T;
}
export interface TBigInt extends TSchema, NumericOptions<bigint> {
    [Kind]: 'BigInt';
    static: bigint;
    type: 'null';
    typeOf: 'BigInt';
}
export interface TBoolean extends TSchema {
    [Kind]: 'Boolean';
    static: boolean;
    type: 'boolean';
}
export type TConstructorParameters<T extends TConstructor<TSchema[], TSchema>> = TTuple<T['parameters']>;
export type TInstanceType<T extends TConstructor<TSchema[], TSchema>> = T['returns'];
export type TCompositeEvaluateArray<T extends readonly TSchema[], P extends unknown[]> = {
    [K in keyof T]: T[K] extends TSchema ? Static<T[K], P> : never;
};
export type TCompositeArray<T extends readonly TObject[]> = {
    [K in keyof T]: T[K] extends TObject<infer P> ? P : {};
};
export type TCompositeProperties<I extends unknown, T extends readonly any[]> = Evaluate<T extends [infer A, ...infer B] ? TCompositeProperties<I & A, B> : I extends object ? I : {}>;
export interface TComposite<T extends TObject[] = TObject[]> extends TObject {
    [Hint]: 'Composite';
    static: Evaluate<TCompositeProperties<unknown, TCompositeEvaluateArray<T, this['params']>>>;
    properties: TCompositeProperties<unknown, TCompositeArray<T>>;
}
export type TConstructorParameterArray<T extends readonly TSchema[], P extends unknown[]> = [...{
    [K in keyof T]: Static<Assert<T[K], TSchema>, P>;
}];
export interface TConstructor<T extends TSchema[] = TSchema[], U extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Constructor';
    static: new (...param: TConstructorParameterArray<T, this['params']>) => Static<U, this['params']>;
    type: 'object';
    instanceOf: 'Constructor';
    parameters: T;
    returns: U;
}
export interface DateOptions extends SchemaOptions {
    exclusiveMaximumTimestamp?: number;
    exclusiveMinimumTimestamp?: number;
    maximumTimestamp?: number;
    minimumTimestamp?: number;
}
export interface TDate extends TSchema, DateOptions {
    [Kind]: 'Date';
    static: Date;
    type: 'object';
    instanceOf: 'Date';
}
export interface TEnumOption<T> {
    type: 'number' | 'string';
    const: T;
}
export interface TEnum<T extends Record<string, string | number> = Record<string, string | number>> extends TSchema {
    [Kind]: 'Union';
    static: T[keyof T];
    anyOf: TLiteral<string | number>[];
}
export type TExtends<L extends TSchema, R extends TSchema, T extends TSchema, U extends TSchema> = (Static<L> extends Static<R> ? T : U) extends infer O ? UnionToTuple<O> extends [infer X, infer Y] ? TUnion<[Assert<X, TSchema>, Assert<Y, TSchema>]> : Assert<O, TSchema> : never;
export type TExcludeTemplateLiteralResult<T extends string> = TString;
export type TExcludeTemplateLiteral<T extends TTemplateLiteral, U extends TSchema> = Exclude<Static<T>, Static<U>> extends infer S ? TExcludeTemplateLiteralResult<Assert<S, string>> : never;
export type TExcludeArray<T extends TSchema[], U extends TSchema> = Assert<UnionToTuple<{
    [K in keyof T]: Static<Assert<T[K], TSchema>> extends Static<U> ? never : T[K];
}[number]>, TSchema[]> extends infer R ? TUnionResult<Assert<R, TSchema[]>> : never;
export type TExclude<T extends TSchema, U extends TSchema> = T extends TTemplateLiteral ? TExcludeTemplateLiteral<T, U> : T extends TUnion<infer S> ? TExcludeArray<S, U> : T extends U ? TNever : T;
export type TExtractTemplateLiteralResult<T extends string> = TString;
export type TExtractTemplateLiteral<T extends TTemplateLiteral, U extends TSchema> = Extract<Static<T>, Static<U>> extends infer S ? TExtractTemplateLiteralResult<Assert<S, string>> : never;
export type TExtractArray<T extends TSchema[], U extends TSchema> = Assert<UnionToTuple<{
    [K in keyof T]: Static<Assert<T[K], TSchema>> extends Static<U> ? T[K] : never;
}[number]>, TSchema[]> extends infer R ? TUnionResult<Assert<R, TSchema[]>> : never;
export type TExtract<T extends TSchema, U extends TSchema> = T extends TTemplateLiteral ? TExtractTemplateLiteral<T, U> : T extends TUnion<infer S> ? TExtractArray<S, U> : T extends U ? T : T;
export type TFunctionParameters<T extends readonly TSchema[], P extends unknown[]> = [...{
    [K in keyof T]: Static<Assert<T[K], TSchema>, P>;
}];
export interface TFunction<T extends readonly TSchema[] = TSchema[], U extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Function';
    static: (...param: TFunctionParameters<T, this['params']>) => Static<U, this['params']>;
    type: 'object';
    instanceOf: 'Function';
    parameters: T;
    returns: U;
}
export interface TInteger extends TSchema, NumericOptions<number> {
    [Kind]: 'Integer';
    static: number;
    type: 'integer';
}
export type TUnevaluatedProperties = undefined | TSchema | boolean;
export interface IntersectOptions extends SchemaOptions {
    unevaluatedProperties?: TUnevaluatedProperties;
}
export interface TIntersect<T extends TSchema[] = TSchema[]> extends TSchema, IntersectOptions {
    [Kind]: 'Intersect';
    static: TupleToIntersect<{
        [K in keyof T]: Static<Assert<T[K], TSchema>, this['params']>;
    }>;
    type?: 'object';
    allOf: [...T];
}
export type TKeyOfTuple<T extends TSchema> = {
    [K in keyof Static<T>]: TLiteral<Assert<K, TLiteralValue>>;
} extends infer U ? UnionToTuple<Exclude<{
    [K in keyof U]: U[K];
}[keyof U], undefined>> : never;
export type TKeyOf<T extends TSchema = TSchema> = (T extends TRecursive<infer S> ? TKeyOfTuple<S> : T extends TComposite ? TKeyOfTuple<T> : T extends TIntersect ? TKeyOfTuple<T> : T extends TUnion ? TKeyOfTuple<T> : T extends TObject ? TKeyOfTuple<T> : T extends TRecord<infer K> ? [K] : [
]) extends infer R ? TUnionResult<Assert<R, TSchema[]>> : never;
export type TLiteralValue = string | number | boolean;
export interface TLiteral<T extends TLiteralValue = TLiteralValue> extends TSchema {
    [Kind]: 'Literal';
    static: T;
    const: T;
}
export interface TNever extends TSchema {
    [Kind]: 'Never';
    static: never;
    not: {};
}
export interface TNot<Not extends TSchema = TSchema, T extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Not';
    static: Static<T>;
    allOf: [{
        not: Not;
    }, T];
}
export interface TNull extends TSchema {
    [Kind]: 'Null';
    static: null;
    type: 'null';
}
export interface TNumber extends TSchema, NumericOptions<number> {
    [Kind]: 'Number';
    static: number;
    type: 'number';
}
export type ReadonlyOptionalPropertyKeys<T extends TProperties> = {
    [K in keyof T]: T[K] extends TReadonlyOptional<TSchema> ? K : never;
}[keyof T];
export type ReadonlyPropertyKeys<T extends TProperties> = {
    [K in keyof T]: T[K] extends TReadonly<TSchema> ? K : never;
}[keyof T];
export type OptionalPropertyKeys<T extends TProperties> = {
    [K in keyof T]: T[K] extends TOptional<TSchema> ? K : never;
}[keyof T];
export type RequiredPropertyKeys<T extends TProperties> = keyof Omit<T, ReadonlyOptionalPropertyKeys<T> | ReadonlyPropertyKeys<T> | OptionalPropertyKeys<T>>;
export type PropertiesReducer<T extends TProperties, R extends Record<keyof any, unknown>> = Evaluate<(Readonly<Partial<Pick<R, ReadonlyOptionalPropertyKeys<T>>>> & Readonly<Pick<R, ReadonlyPropertyKeys<T>>> & Partial<Pick<R, OptionalPropertyKeys<T>>> & Required<Pick<R, RequiredPropertyKeys<T>>>)>;
export type PropertiesReduce<T extends TProperties, P extends unknown[]> = PropertiesReducer<T, {
    [K in keyof T]: Static<T[K], P>;
}>;
export type TProperties = Record<keyof any, TSchema>;
export type ObjectProperties<T> = T extends TObject<infer U> ? U : never;
export type ObjectPropertyKeys<T> = T extends TObject<infer U> ? keyof U : never;
export type TAdditionalProperties = undefined | TSchema | boolean;
export interface ObjectOptions extends SchemaOptions {
    additionalProperties?: TAdditionalProperties;
    minProperties?: number;
    maxProperties?: number;
}
export interface TObject<T extends TProperties = TProperties> extends TSchema, ObjectOptions {
    [Kind]: 'Object';
    static: PropertiesReduce<T, this['params']>;
    additionalProperties?: TAdditionalProperties;
    type: 'object';
    properties: T;
    required?: string[];
}
export type TOmitArray<T extends TSchema[], K extends keyof any> = Assert<{
    [K2 in keyof T]: TOmit<Assert<T[K2], TSchema>, K>;
}, TSchema[]>;
export type TOmitProperties<T extends TProperties, K extends keyof any> = Evaluate<Assert<Omit<T, K>, TProperties>>;
export type TOmit<T extends TSchema = TSchema, K extends keyof any = keyof any> = T extends TRecursive<infer S> ? TRecursive<TOmit<S, K>> : T extends TComposite<infer S> ? TComposite<TOmitArray<S, K>> : T extends TIntersect<infer S> ? TIntersect<TOmitArray<S, K>> : T extends TUnion<infer S> ? TUnion<TOmitArray<S, K>> : T extends TObject<infer S> ? TObject<TOmitProperties<S, K>> : T;
export type TParameters<T extends TFunction> = TTuple<T['parameters']>;
export type TPartialObjectArray<T extends TObject[]> = Assert<{
    [K in keyof T]: TPartial<Assert<T[K], TObject>>;
}, TObject[]>;
export type TPartialArray<T extends TSchema[]> = Assert<{
    [K in keyof T]: TPartial<Assert<T[K], TSchema>>;
}, TSchema[]>;
export type TPartialProperties<T extends TProperties> = Evaluate<Assert<{
    [K in keyof T]: T[K] extends TReadonlyOptional<infer U> ? TReadonlyOptional<U> : T[K] extends TReadonly<infer U> ? TReadonlyOptional<U> : T[K] extends TOptional<infer U> ? TOptional<U> : TOptional<T[K]>;
}, TProperties>>;
export type TPartial<T extends TSchema> = T extends TRecursive<infer S> ? TRecursive<TPartial<S>> : T extends TComposite<infer S> ? TComposite<TPartialArray<S>> : T extends TIntersect<infer S> ? TIntersect<TPartialArray<S>> : T extends TUnion<infer S> ? TUnion<TPartialArray<S>> : T extends TObject<infer S> ? TObject<TPartialProperties<S>> : T;
export type TPickArray<T extends TSchema[], K extends keyof any> = {
    [K2 in keyof T]: TPick<Assert<T[K2], TSchema>, K>;
};
export type TPickProperties<T extends TProperties, K extends keyof any> = Pick<T, Assert<Extract<K, keyof T>, keyof T>> extends infer R ? ({
    [K in keyof R]: Assert<R[K], TSchema> extends TSchema ? R[K] : never;
}) : never;
export type TPick<T extends TSchema = TSchema, K extends keyof any = keyof any> = T extends TRecursive<infer S> ? TRecursive<TPick<S, K>> : T extends TComposite<infer S> ? TComposite<TPickArray<S, K>> : T extends TIntersect<infer S> ? TIntersect<TPickArray<S, K>> : T extends TUnion<infer S> ? TUnion<TPickArray<S, K>> : T extends TObject<infer S> ? TObject<TPickProperties<S, K>> : T;
export interface TPromise<T extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Promise';
    static: Promise<Static<T, this['params']>>;
    type: 'object';
    instanceOf: 'Promise';
    item: TSchema;
}
export type RecordTemplateLiteralObjectType<K extends TTemplateLiteral, T extends TSchema> = Ensure<TObject<Evaluate<{
    [_ in Static<K>]: T;
}>>>;
export type RecordTemplateLiteralType<K extends TTemplateLiteral, T extends TSchema> = IsTemplateLiteralFinite<K> extends true ? RecordTemplateLiteralObjectType<K, T> : TRecord<K, T>;
export type RecordUnionLiteralType<K extends TUnion<TLiteral<string | number>[]>, T extends TSchema> = Static<K> extends string ? Ensure<TObject<{
    [X in Static<K>]: T;
}>> : never;
export type RecordLiteralType<K extends TLiteral<string | number>, T extends TSchema> = Ensure<TObject<{
    [K2 in K['const']]: T;
}>>;
export type RecordNumberType<K extends TInteger | TNumber, T extends TSchema> = Ensure<TRecord<K, T>>;
export type RecordStringType<K extends TString, T extends TSchema> = Ensure<TRecord<K, T>>;
export type RecordKey = TUnion<TLiteral<string | number>[]> | TLiteral<string | number> | TTemplateLiteral | TInteger | TNumber | TString;
export interface TRecord<K extends RecordKey = RecordKey, T extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Record';
    static: Record<Static<K>, Static<T, this['params']>>;
    type: 'object';
    patternProperties: {
        [pattern: string]: T;
    };
    additionalProperties: false;
}
export interface TThis extends TSchema {
    [Kind]: 'This';
    static: this['params'][0];
    $ref: string;
}
export type TRecursiveReduce<T extends TSchema> = Static<T, [TRecursiveReduce<T>]>;
export interface TRecursive<T extends TSchema> extends TSchema {
    [Hint]: 'Recursive';
    static: TRecursiveReduce<T>;
}
export interface TRef<T extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Ref';
    static: Static<T, this['params']>;
    $ref: string;
}
export type TReturnType<T extends TFunction> = T['returns'];
export type TRequiredArray<T extends TSchema[]> = Assert<{
    [K in keyof T]: TRequired<Assert<T[K], TSchema>>;
}, TSchema[]>;
export type TRequiredProperties<T extends TProperties> = Evaluate<Assert<{
    [K in keyof T]: T[K] extends TReadonlyOptional<infer U> ? TReadonly<U> : T[K] extends TReadonly<infer U> ? TReadonly<U> : T[K] extends TOptional<infer U> ? U : T[K];
}, TProperties>>;
export type TRequired<T extends TSchema> = T extends TRecursive<infer S> ? TRecursive<TRequired<S>> : T extends TComposite<infer S> ? TComposite<TRequiredArray<S>> : T extends TIntersect<infer S> ? TIntersect<TRequiredArray<S>> : T extends TUnion<infer S> ? TUnion<TRequiredArray<S>> : T extends TObject<infer S> ? TObject<TRequiredProperties<S>> : T;
export type StringFormatOption = 'date-time' | 'time' | 'date' | 'email' | 'idn-email' | 'hostname' | 'idn-hostname' | 'ipv4' | 'ipv6' | 'uri' | 'uri-reference' | 'iri' | 'uuid' | 'iri-reference' | 'uri-template' | 'json-pointer' | 'relative-json-pointer' | 'regex';
export interface StringOptions<Format extends string> extends SchemaOptions {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: Format;
    contentEncoding?: '7bit' | '8bit' | 'binary' | 'quoted-printable' | 'base64';
    contentMediaType?: string;
}
export interface TString<Format extends string = string> extends TSchema, StringOptions<Format> {
    [Kind]: 'String';
    static: string;
    type: 'string';
}
export type SymbolValue = string | number | undefined;
export interface TSymbol extends TSchema, SchemaOptions {
    [Kind]: 'Symbol';
    static: symbol;
    type: 'null';
    typeOf: 'Symbol';
}
export type IsTemplateLiteralFiniteCheck<T> = T extends TTemplateLiteral<infer U> ? IsTemplateLiteralFiniteArray<Assert<U, TTemplateLiteralKind[]>> : T extends TUnion<infer U> ? IsTemplateLiteralFiniteArray<Assert<U, TTemplateLiteralKind[]>> : T extends TString ? false : T extends TBoolean ? false : T extends TNumber ? false : T extends TInteger ? false : T extends TBigInt ? false : T extends TLiteral ? true : false;
export type IsTemplateLiteralFiniteArray<T extends TTemplateLiteralKind[]> = T extends [infer L, ...infer R] ? IsTemplateLiteralFiniteCheck<L> extends false ? false : IsTemplateLiteralFiniteArray<Assert<R, TTemplateLiteralKind[]>> : T extends [infer L] ? IsTemplateLiteralFiniteCheck<L> extends false ? false : true : true;
export type IsTemplateLiteralFinite<T> = T extends TTemplateLiteral<infer U> ? IsTemplateLiteralFiniteArray<U> : false;
export type TTemplateLiteralKind = TUnion | TLiteral | TInteger | TTemplateLiteral | TNumber | TBigInt | TString | TBoolean | TNever;
export type TTemplateLiteralConst<T, Acc extends string> = T extends TUnion<infer U> ? {
    [K in keyof U]: TTemplateLiteralUnion<Assert<[U[K]], TTemplateLiteralKind[]>, Acc>;
}[number] : T extends TTemplateLiteral ? `${Static<T>}` : T extends TLiteral<infer U> ? `${U}` : T extends TString ? `${string}` : T extends TNumber ? `${number}` : T extends TBigInt ? `${bigint}` : T extends TBoolean ? `${boolean}` : never;
export type TTemplateLiteralUnion<T extends TTemplateLiteralKind[], Acc extends string = ''> = T extends [infer L, ...infer R] ? `${TTemplateLiteralConst<L, Acc>}${TTemplateLiteralUnion<Assert<R, TTemplateLiteralKind[]>, Acc>}` : T extends [infer L] ? `${TTemplateLiteralConst<L, Acc>}${Acc}` : Acc;
export interface TTemplateLiteral<T extends TTemplateLiteralKind[] = TTemplateLiteralKind[]> extends TSchema {
    [Kind]: 'TemplateLiteral';
    static: TTemplateLiteralUnion<T>;
    type: 'string';
    pattern: string;
}
export type TTupleIntoArray<T extends TTuple<TSchema[]>> = T extends TTuple<infer R> ? Assert<R, TSchema[]> : never;
export interface TTuple<T extends TSchema[] = TSchema[]> extends TSchema {
    [Kind]: 'Tuple';
    static: {
        [K in keyof T]: T[K] extends TSchema ? Static<T[K], this['params']> : T[K];
    };
    type: 'array';
    items?: T;
    additionalItems?: false;
    minItems: number;
    maxItems: number;
}
export interface TUndefined extends TSchema {
    [Kind]: 'Undefined';
    static: undefined;
    type: 'null';
    typeOf: 'Undefined';
}
export type TUnionOfLiteralArray<T extends TLiteral<string>[]> = {
    [K in keyof T]: Assert<T[K], TLiteral>['const'];
}[number];
export type TUnionOfLiteral<T extends TUnion<TLiteral<string>[]>> = TUnionOfLiteralArray<T['anyOf']>;
export type TUnionResult<T extends TSchema[]> = T extends [] ? TNever : T extends [infer S] ? S : TUnion<T>;
export type TUnionTemplateLiteral<T extends TTemplateLiteral, S extends string = Static<T>> = (string);
export interface TUnion<T extends TSchema[] = TSchema[]> extends TSchema {
    [Kind]: 'Union';
    static: {
        [K in keyof T]: T[K] extends TSchema ? Static<T[K], this['params']> : never;
    }[number];
    anyOf: T;
}
export interface Uint8ArrayOptions extends SchemaOptions {
    maxByteLength?: number;
    minByteLength?: number;
}
export interface TUint8Array extends TSchema, Uint8ArrayOptions {
    [Kind]: 'Uint8Array';
    static: Uint8Array;
    instanceOf: 'Uint8Array';
    type: 'object';
}
export interface TUnknown extends TSchema {
    [Kind]: 'Unknown';
    static: unknown;
}
export interface UnsafeOptions extends SchemaOptions {
    [Kind]?: string;
}
export interface TUnsafe<T> extends TSchema {
    [Kind]: string;
    static: T;
}
export interface TVoid extends TSchema {
    [Kind]: 'Void';
    static: void;
    type: 'null';
    typeOf: 'Void';
}
/** Creates a TypeScript static type from a TypeBox type */
export type Static<T extends TSchema, P extends unknown[] = []> = (T & {
    params: P;
})['static'];
export type TypeRegistryValidationFunction<TSchema> = (schema: TSchema, value: unknown) => boolean;
/** A registry for user defined types */
export declare namespace TypeRegistry {
    /** Returns the entries in this registry */
    function Entries(): Map<string, TypeRegistryValidationFunction<any>>;
    /** Clears all user defined types */
    function Clear(): void;
    /** Returns true if this registry contains this kind */
    function Has(kind: string): boolean;
    /** Sets a validation function for a user defined type */
    function Set<TSchema = unknown>(kind: string, func: TypeRegistryValidationFunction<TSchema>): void;
    /** Gets a custom validation function for a user defined type */
    function Get(kind: string): TypeRegistryValidationFunction<any> | undefined;
}
export type FormatRegistryValidationFunction = (value: string) => boolean;
/** A registry for user defined string formats */
export declare namespace FormatRegistry {
    /** Returns the entries in this registry */
    function Entries(): Map<string, FormatRegistryValidationFunction>;
    /** Clears all user defined string formats */
    function Clear(): void;
    /** Returns true if the user defined string format exists */
    function Has(format: string): boolean;
    /** Sets a validation function for a user defined string format */
    function Set(format: string, func: FormatRegistryValidationFunction): void;
    /** Gets a validation function for a user defined string format */
    function Get(format: string): FormatRegistryValidationFunction | undefined;
}
export declare class TypeGuardUnknownTypeError extends Error {
    readonly schema: unknown;
    constructor(schema: unknown);
}
/** Provides functions to test if JavaScript values are TypeBox types */
export declare namespace TypeGuard {
    /** Returns true if the given schema is TAny */
    function TAny(schema: unknown): schema is TAny;
    /** Returns true if the given schema is TArray */
    function TArray(schema: unknown): schema is TArray;
    /** Returns true if the given schema is TBigInt */
    function TBigInt(schema: unknown): schema is TBigInt;
    /** Returns true if the given schema is TBoolean */
    function TBoolean(schema: unknown): schema is TBoolean;
    /** Returns true if the given schema is TConstructor */
    function TConstructor(schema: unknown): schema is TConstructor;
    /** Returns true if the given schema is TDate */
    function TDate(schema: unknown): schema is TDate;
    /** Returns true if the given schema is TFunction */
    function TFunction(schema: unknown): schema is TFunction;
    /** Returns true if the given schema is TInteger */
    function TInteger(schema: unknown): schema is TInteger;
    /** Returns true if the given schema is TIntersect */
    function TIntersect(schema: unknown): schema is TIntersect;
    /** Returns true if the given schema is TKind */
    function TKind(schema: unknown): schema is Record<typeof Kind | string, unknown>;
    /** Returns true if the given schema is TLiteral */
    function TLiteral(schema: unknown): schema is TLiteral;
    /** Returns true if the given schema is TNever */
    function TNever(schema: unknown): schema is TNever;
    /** Returns true if the given schema is TNot */
    function TNot(schema: unknown): schema is TNot;
    /** Returns true if the given schema is TNull */
    function TNull(schema: unknown): schema is TNull;
    /** Returns true if the given schema is TNumber */
    function TNumber(schema: unknown): schema is TNumber;
    /** Returns true if the given schema is TObject */
    function TObject(schema: unknown): schema is TObject;
    /** Returns true if the given schema is TPromise */
    function TPromise(schema: unknown): schema is TPromise;
    /** Returns true if the given schema is TRecord */
    function TRecord(schema: unknown): schema is TRecord;
    /** Returns true if the given schema is TRef */
    function TRef(schema: unknown): schema is TRef;
    /** Returns true if the given schema is TString */
    function TString(schema: unknown): schema is TString;
    /** Returns true if the given schema is TSymbol */
    function TSymbol(schema: unknown): schema is TSymbol;
    /** Returns true if the given schema is TTemplateLiteral */
    function TTemplateLiteral(schema: unknown): schema is TTemplateLiteral;
    /** Returns true if the given schema is TThis */
    function TThis(schema: unknown): schema is TThis;
    /** Returns true if the given schema is TTuple */
    function TTuple(schema: unknown): schema is TTuple;
    /** Returns true if the given schema is TUndefined */
    function TUndefined(schema: unknown): schema is TUndefined;
    /** Returns true if the given schema is TUnion */
    function TUnion(schema: unknown): schema is TUnion;
    /** Returns true if the given schema is TUnion<Literal<string>[]> */
    function TUnionLiteral(schema: unknown): schema is TUnion<TLiteral<string>[]>;
    /** Returns true if the given schema is TUint8Array */
    function TUint8Array(schema: unknown): schema is TUint8Array;
    /** Returns true if the given schema is TUnknown */
    function TUnknown(schema: unknown): schema is TUnknown;
    /** Returns true if the given schema is a raw TUnsafe */
    function TUnsafe(schema: unknown): schema is TUnsafe<unknown>;
    /** Returns true if the given schema is TVoid */
    function TVoid(schema: unknown): schema is TVoid;
    /** Returns true if this schema has the ReadonlyOptional modifier */
    function TReadonlyOptional<T extends TSchema>(schema: T): schema is TReadonlyOptional<T>;
    /** Returns true if this schema has the Readonly modifier */
    function TReadonly<T extends TSchema>(schema: T): schema is TReadonly<T>;
    /** Returns true if this schema has the Optional modifier */
    function TOptional<T extends TSchema>(schema: T): schema is TOptional<T>;
    /** Returns true if the given schema is TSchema */
    function TSchema(schema: unknown): schema is TSchema;
}
/** Fast undefined check used for properties of type undefined */
export declare namespace ExtendsUndefined {
    function Check(schema: TSchema): boolean;
}
export declare enum TypeExtendsResult {
    Union = 0,
    True = 1,
    False = 2
}
export declare namespace TypeExtends {
    function Extends(left: TSchema, right: TSchema): TypeExtendsResult;
}
/** Specialized Clone for Types */
export declare namespace TypeClone {
    /** Clones a type. */
    function Clone<T extends TSchema>(schema: T, options: SchemaOptions): T;
}
export declare namespace ObjectMap {
    function Map<T = TSchema>(schema: TSchema, callback: (object: TObject) => TObject, options: SchemaOptions): T;
}
export declare namespace KeyResolver {
    function Resolve<T extends TSchema>(schema: T): string[];
}
export declare namespace TemplateLiteralPattern {
    function Create(kinds: TTemplateLiteralKind[]): string;
}
export declare namespace TemplateLiteralResolver {
    function Resolve(template: TTemplateLiteral): TString | TUnion | TLiteral;
}
export declare class TemplateLiteralParserError extends Error {
    constructor(message: string);
}
export declare namespace TemplateLiteralParser {
    type Expression = And | Or | Const;
    type Const = {
        type: 'const';
        const: string;
    };
    type And = {
        type: 'and';
        expr: Expression[];
    };
    type Or = {
        type: 'or';
        expr: Expression[];
    };
    /** Parses a pattern and returns an expression tree */
    function Parse(pattern: string): Expression;
    /** Parses a pattern and strips forward and trailing ^ and $ */
    function ParseExact(pattern: string): Expression;
}
export declare namespace TemplateLiteralFinite {
    function Check(expression: TemplateLiteralParser.Expression): boolean;
}
export declare namespace TemplateLiteralGenerator {
    function Generate(expression: TemplateLiteralParser.Expression): IterableIterator<string>;
}
export declare class TypeBuilder {
    /** `[Utility]` Creates a schema without `static` and `params` types */
    protected Create<T>(schema: Omit<T, 'static' | 'params'>): T;
    /** `[Standard]` Omits compositing symbols from this schema */
    Strict<T extends TSchema>(schema: T): T;
}
export declare class StandardTypeBuilder extends TypeBuilder {
    /** `[Modifier]` Creates a Optional property */
    Optional<T extends TSchema>(schema: T): TOptional<T>;
    /** `[Modifier]` Creates a ReadonlyOptional property */
    ReadonlyOptional<T extends TSchema>(schema: T): TReadonlyOptional<T>;
    /** `[Modifier]` Creates a Readonly object or property */
    Readonly<T extends TSchema>(schema: T): TReadonly<T>;
    /** `[Standard]` Creates an Any type */
    Any(options?: SchemaOptions): TAny;
    /** `[Standard]` Creates an Array type */
    Array<T extends TSchema>(items: T, options?: ArrayOptions): TArray<T>;
    /** `[Standard]` Creates a Boolean type */
    Boolean(options?: SchemaOptions): TBoolean;
    /** `[Standard]` Creates a Composite object type. */
    Composite<T extends TObject[]>(objects: [...T], options?: ObjectOptions): TComposite<T>;
    /** `[Standard]` Creates a Enum type */
    Enum<T extends Record<string, string | number>>(item: T, options?: SchemaOptions): TEnum<T>;
    /** `[Standard]` A conditional type expression that will return the true type if the left type extends the right */
    Extends<L extends TSchema, R extends TSchema, T extends TSchema, U extends TSchema>(left: L, right: R, trueType: T, falseType: U, options?: SchemaOptions): TExtends<L, R, T, U>;
    /** `[Standard]` Excludes from the left type any type that is not assignable to the right */
    Exclude<L extends TSchema, R extends TSchema>(left: L, right: R, options?: SchemaOptions): TExclude<L, R>;
    /** `[Standard]` Extracts from the left type any type that is assignable to the right */
    Extract<L extends TSchema, R extends TSchema>(left: L, right: R, options?: SchemaOptions): TExtract<L, R>;
    /** `[Standard]` Creates an Integer type */
    Integer(options?: NumericOptions<number>): TInteger;
    /** `[Standard]` Creates a Intersect type */
    Intersect(allOf: [], options?: SchemaOptions): TNever;
    /** `[Standard]` Creates a Intersect type */
    Intersect<T extends [TSchema]>(allOf: [...T], options?: SchemaOptions): T[0];
    Intersect<T extends TSchema[]>(allOf: [...T], options?: IntersectOptions): TIntersect<T>;
    /** `[Standard]` Creates a KeyOf type */
    KeyOf<T extends TSchema>(schema: T, options?: SchemaOptions): TKeyOf<T>;
    /** `[Standard]` Creates a Literal type */
    Literal<T extends TLiteralValue>(value: T, options?: SchemaOptions): TLiteral<T>;
    /** `[Standard]` Creates a Never type */
    Never(options?: SchemaOptions): TNever;
    /** `[Standard]` Creates a Not type. The first argument is the disallowed type, the second is the allowed. */
    Not<N extends TSchema, T extends TSchema>(not: N, schema: T, options?: SchemaOptions): TNot<N, T>;
    /** `[Standard]` Creates a Null type */
    Null(options?: SchemaOptions): TNull;
    /** `[Standard]` Creates a Number type */
    Number(options?: NumericOptions<number>): TNumber;
    /** `[Standard]` Creates an Object type */
    Object<T extends TProperties>(properties: T, options?: ObjectOptions): TObject<T>;
    /** `[Standard]` Creates a mapped type whose keys are omitted from the given type */
    Omit<T extends TSchema, K extends (keyof Static<T>)[]>(schema: T, keys: readonly [...K], options?: SchemaOptions): TOmit<T, K[number]>;
    /** `[Standard]` Creates a mapped type whose keys are omitted from the given type */
    Omit<T extends TSchema, K extends TUnion<TLiteral<string>[]>>(schema: T, keys: K, options?: SchemaOptions): TOmit<T, TUnionOfLiteral<K>>;
    /** `[Standard]` Creates a mapped type whose keys are omitted from the given type */
    Omit<T extends TSchema, K extends TLiteral<string>>(schema: T, key: K, options?: SchemaOptions): TOmit<T, K['const']>;
    /** `[Standard]` Creates a mapped type whose keys are omitted from the given type */
    Omit<T extends TSchema, K extends TNever>(schema: T, key: K, options?: SchemaOptions): TOmit<T, never>;
    /** `[Standard]` Creates a mapped type where all properties are Optional */
    Partial<T extends TSchema>(schema: T, options?: ObjectOptions): TPartial<T>;
    /** `[Standard]` Creates a mapped type whose keys are picked from the given type */
    Pick<T extends TSchema, K extends (keyof Static<T>)[]>(schema: T, keys: readonly [...K], options?: SchemaOptions): TPick<T, K[number]>;
    /** `[Standard]` Creates a mapped type whose keys are picked from the given type */
    Pick<T extends TSchema, K extends TUnion<TLiteral<string>[]>>(schema: T, keys: K, options?: SchemaOptions): TPick<T, TUnionOfLiteral<K>>;
    /** `[Standard]` Creates a mapped type whose keys are picked from the given type */
    Pick<T extends TSchema, K extends TLiteral<string>>(schema: T, key: K, options?: SchemaOptions): TPick<T, K['const']>;
    /** `[Standard]` Creates a mapped type whose keys are picked from the given type */
    Pick<T extends TSchema, K extends TNever>(schema: T, key: K, options?: SchemaOptions): TPick<T, never>;
    /** `[Standard]` Creates a Record type */
    Record<K extends TUnion<TLiteral<string | number>[]>, T extends TSchema>(key: K, schema: T, options?: ObjectOptions): RecordUnionLiteralType<K, T>;
    /** `[Standard]` Creates a Record type */
    Record<K extends TLiteral<string | number>, T extends TSchema>(key: K, schema: T, options?: ObjectOptions): RecordLiteralType<K, T>;
    /** `[Standard]` Creates a Record type */
    Record<K extends TTemplateLiteral, T extends TSchema>(key: K, schema: T, options?: ObjectOptions): RecordTemplateLiteralType<K, T>;
    /** `[Standard]` Creates a Record type */
    Record<K extends TInteger | TNumber, T extends TSchema>(key: K, schema: T, options?: ObjectOptions): RecordNumberType<K, T>;
    /** `[Standard]` Creates a Record type */
    Record<K extends TString, T extends TSchema>(key: K, schema: T, options?: ObjectOptions): RecordStringType<K, T>;
    /** `[Standard]` Creates a Recursive type */
    Recursive<T extends TSchema>(callback: (thisType: TThis) => T, options?: SchemaOptions): TRecursive<T>;
    /** `[Standard]` Creates a Ref type. The referenced type must contain a $id */
    Ref<T extends TSchema>(schema: T, options?: SchemaOptions): TRef<T>;
    /** `[Standard]` Creates a mapped type where all properties are Required */
    Required<T extends TSchema>(schema: T, options?: SchemaOptions): TRequired<T>;
    /** `[Standard]` Creates a String type */
    String<Format extends string>(options?: StringOptions<StringFormatOption | Format>): TString<Format>;
    /** `[Standard]` Creates a template literal type */
    TemplateLiteral<T extends TTemplateLiteralKind[]>(kinds: [...T], options?: SchemaOptions): TTemplateLiteral<T>;
    /** `[Standard]` Creates a Tuple type */
    Tuple<T extends TSchema[]>(items: [...T], options?: SchemaOptions): TTuple<T>;
    /** `[Standard]` Creates a Union type */
    Union(anyOf: [], options?: SchemaOptions): TNever;
    /** `[Standard]` Creates a Union type */
    Union<T extends [TSchema]>(anyOf: [...T], options?: SchemaOptions): T[0];
    /** `[Standard]` Creates a Union type */
    Union<T extends TSchema[]>(anyOf: [...T], options?: SchemaOptions): TUnion<T>;
    /** `[Experimental]` Remaps a TemplateLiteral into a Union representation. This function is known to cause TS compiler crashes for finite templates with large generation counts. Use with caution. */
    Union<T extends TTemplateLiteral>(template: T): TUnionTemplateLiteral<T>;
    /** `[Standard]` Creates an Unknown type */
    Unknown(options?: SchemaOptions): TUnknown;
    /** `[Standard]` Creates a Unsafe type that infers for the generic argument */
    Unsafe<T>(options?: UnsafeOptions): TUnsafe<T>;
}
export declare class ExtendedTypeBuilder extends StandardTypeBuilder {
    /** `[Extended]` Creates a BigInt type */
    BigInt(options?: NumericOptions<bigint>): TBigInt;
    /** `[Extended]` Extracts the ConstructorParameters from the given Constructor type */
    ConstructorParameters<T extends TConstructor<any[], any>>(schema: T, options?: SchemaOptions): TConstructorParameters<T>;
    /** `[Extended]` Creates a Constructor type */
    Constructor<T extends TTuple<TSchema[]>, U extends TSchema>(parameters: T, returns: U, options?: SchemaOptions): TConstructor<TTupleIntoArray<T>, U>;
    /** `[Extended]` Creates a Constructor type */
    Constructor<T extends TSchema[], U extends TSchema>(parameters: [...T], returns: U, options?: SchemaOptions): TConstructor<T, U>;
    /** `[Extended]` Creates a Date type */
    Date(options?: DateOptions): TDate;
    /** `[Extended]` Creates a Function type */
    Function<T extends TTuple<TSchema[]>, U extends TSchema>(parameters: T, returns: U, options?: SchemaOptions): TFunction<TTupleIntoArray<T>, U>;
    /** `[Extended]` Creates a Function type */
    Function<T extends TSchema[], U extends TSchema>(parameters: [...T], returns: U, options?: SchemaOptions): TFunction<T, U>;
    /** `[Extended]` Extracts the InstanceType from the given Constructor */
    InstanceType<T extends TConstructor<any[], any>>(schema: T, options?: SchemaOptions): TInstanceType<T>;
    /** `[Extended]` Extracts the Parameters from the given Function type */
    Parameters<T extends TFunction<any[], any>>(schema: T, options?: SchemaOptions): TParameters<T>;
    /** `[Extended]` Creates a Promise type */
    Promise<T extends TSchema>(item: T, options?: SchemaOptions): TPromise<T>;
    /** `[Extended]` Creates a regular expression type */
    RegEx(regex: RegExp, options?: SchemaOptions): TString;
    /** `[Extended]` Extracts the ReturnType from the given Function */
    ReturnType<T extends TFunction<any[], any>>(schema: T, options?: SchemaOptions): TReturnType<T>;
    /** `[Extended]` Creates a Symbol type */
    Symbol(options?: SchemaOptions): TSymbol;
    /** `[Extended]` Creates a Undefined type */
    Undefined(options?: SchemaOptions): TUndefined;
    /** `[Extended]` Creates a Uint8Array type */
    Uint8Array(options?: Uint8ArrayOptions): TUint8Array;
    /** `[Extended]` Creates a Void type */
    Void(options?: SchemaOptions): TVoid;
}
/** JSON Schema TypeBuilder with Static Resolution for TypeScript */
export declare const StandardType: StandardTypeBuilder;
/** JSON Schema TypeBuilder with Static Resolution for TypeScript */
export declare const Type: ExtendedTypeBuilder;
