export declare const Kind: unique symbol;
export declare const Hint: unique symbol;
export declare const Modifier: unique symbol;
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
    /** Example values matching this schema. */
    examples?: any;
    [prop: string]: any;
}
export interface TSchema extends SchemaOptions {
    [Kind]: string;
    [Hint]?: string;
    [Modifier]?: string;
    params: unknown[];
    static: unknown;
}
export type TAnySchema = TSchema | TAny | TArray | TBoolean | TConstructor | TDate | TEnum | TFunction | TInteger | TLiteral | TNull | TNumber | TObject | TPromise | TRecord | TSelf | TRef | TString | TTuple | TUndefined | TUnion | TUint8Array | TUnknown | TVoid;
export interface NumericOptions extends SchemaOptions {
    exclusiveMaximum?: number;
    exclusiveMinimum?: number;
    maximum?: number;
    minimum?: number;
    multipleOf?: number;
}
export type TNumeric = TInteger | TNumber;
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
    static: Array<Static<T, this['params']>>;
    type: 'array';
    items: T;
}
export interface TBoolean extends TSchema {
    [Kind]: 'Boolean';
    static: boolean;
    type: 'boolean';
}
export type TConstructorParameters<T extends TConstructor<TSchema[], TSchema>> = TTuple<T['parameters']>;
export type TInstanceType<T extends TConstructor<TSchema[], TSchema>> = T['returns'];
export type StaticContructorParameters<T extends readonly TSchema[], P extends unknown[]> = [...{
    [K in keyof T]: T[K] extends TSchema ? Static<T[K], P> : never;
}];
export interface TConstructor<T extends TSchema[] = TSchema[], U extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Constructor';
    static: new (...param: StaticContructorParameters<T, this['params']>) => Static<U, this['params']>;
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
export type TParameters<T extends TFunction> = TTuple<T['parameters']>;
export type TReturnType<T extends TFunction> = T['returns'];
export type StaticFunctionParameters<T extends readonly TSchema[], P extends unknown[]> = [...{
    [K in keyof T]: T[K] extends TSchema ? Static<T[K], P> : never;
}];
export interface TFunction<T extends readonly TSchema[] = TSchema[], U extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Function';
    static: (...param: StaticFunctionParameters<T, this['params']>) => Static<U, this['params']>;
    type: 'object';
    instanceOf: 'Function';
    parameters: T;
    returns: U;
}
export interface TInteger extends TSchema, NumericOptions {
    [Kind]: 'Integer';
    static: number;
    type: 'integer';
}
export type IntersectReduce<I extends unknown, T extends readonly any[]> = T extends [infer A, ...infer B] ? IntersectReduce<I & A, B> : I extends object ? I : {};
export type IntersectEvaluate<T extends readonly TSchema[], P extends unknown[]> = {
    [K in keyof T]: T[K] extends TSchema ? Static<T[K], P> : never;
};
export type IntersectProperties<T extends readonly TObject[]> = {
    [K in keyof T]: T[K] extends TObject<infer P> ? P : {};
};
export interface TIntersect<T extends TObject[] = TObject[]> extends TObject {
    static: IntersectReduce<unknown, IntersectEvaluate<T, this['params']>>;
    properties: IntersectReduce<unknown, IntersectProperties<T>>;
}
export type UnionToIntersect<U> = (U extends unknown ? (arg: U) => 0 : never) extends (arg: infer I) => 0 ? I : never;
export type UnionLast<U> = UnionToIntersect<U extends unknown ? (x: U) => 0 : never> extends (x: infer L) => 0 ? L : never;
export type UnionToTuple<U, L = UnionLast<U>> = [U] extends [never] ? [] : [...UnionToTuple<Exclude<U, L>>, L];
export type UnionStringLiteralToTuple<T> = T extends TUnion<infer L> ? {
    [I in keyof L]: L[I] extends TLiteral<infer C> ? C : never;
} : never;
export type UnionLiteralsFromObject<T extends TObject> = {
    [K in ObjectPropertyKeys<T>]: TLiteral<K>;
} extends infer R ? UnionToTuple<R[keyof R]> : never;
export interface TKeyOf<T extends TObject> extends TUnion<UnionLiteralsFromObject<T>> {
}
export type TLiteralValue = string | number | boolean;
export interface TLiteral<T extends TLiteralValue = TLiteralValue> extends TSchema {
    [Kind]: 'Literal';
    static: T;
    const: T;
}
export interface TNever extends TSchema {
    [Kind]: 'Never';
    static: never;
    allOf: [{
        type: 'boolean';
        const: false;
    }, {
        type: 'boolean';
        const: true;
    }];
}
export interface TNull extends TSchema {
    [Kind]: 'Null';
    static: null;
    type: 'null';
}
export interface TNumber extends TSchema, NumericOptions {
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
export type PropertiesReduce<T extends TProperties, P extends unknown[]> = {
    readonly [K in ReadonlyOptionalPropertyKeys<T>]?: Static<T[K], P>;
} & {
    readonly [K in ReadonlyPropertyKeys<T>]: Static<T[K], P>;
} & {
    [K in OptionalPropertyKeys<T>]?: Static<T[K], P>;
} & {
    [K in RequiredPropertyKeys<T>]: Static<T[K], P>;
} extends infer R ? {
    [K in keyof R]: R[K];
} : never;
export type TRecordProperties<K extends TUnion<TLiteral[]>, T extends TSchema> = Static<K> extends string ? {
    [X in Static<K>]: T;
} : never;
export interface TProperties {
    [key: string]: TSchema;
}
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
export interface TOmit<T extends TObject, Properties extends ObjectPropertyKeys<T>[]> extends TObject, ObjectOptions {
    static: Omit<Static<T, this['params']>, Properties[number]>;
    properties: T extends TObject ? Omit<T['properties'], Properties[number]> : never;
}
export interface TPartial<T extends TObject> extends TObject {
    static: Partial<Static<T, this['params']>>;
    properties: {
        [K in keyof T['properties']]: T['properties'][K] extends TReadonlyOptional<infer U> ? TReadonlyOptional<U> : T['properties'][K] extends TReadonly<infer U> ? TReadonlyOptional<U> : T['properties'][K] extends TOptional<infer U> ? TOptional<U> : TOptional<T['properties'][K]>;
    };
}
export type TPick<T extends TObject, Properties extends ObjectPropertyKeys<T>[]> = TObject<{
    [K in Properties[number]]: T['properties'][K];
}>;
export interface TPromise<T extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Promise';
    static: Promise<Static<T, this['params']>>;
    type: 'object';
    instanceOf: 'Promise';
    item: TSchema;
}
export type TRecordKey = TString | TNumeric | TUnion<TLiteral<any>[]>;
export interface TRecord<K extends TRecordKey = TRecordKey, T extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Record';
    static: Record<Static<K>, Static<T, this['params']>>;
    type: 'object';
    patternProperties: {
        [pattern: string]: T;
    };
    additionalProperties: false;
}
export interface TSelf extends TSchema {
    [Kind]: 'Self';
    static: this['params'][0];
    $ref: string;
}
export type TRecursiveReduce<T extends TSchema> = Static<T, [TRecursiveReduce<T>]>;
export interface TRecursive<T extends TSchema> extends TSchema {
    static: TRecursiveReduce<T>;
}
export interface TRef<T extends TSchema = TSchema> extends TSchema {
    [Kind]: 'Ref';
    static: Static<T, this['params']>;
    $ref: string;
}
export interface TRequired<T extends TObject | TRef<TObject>> extends TObject {
    static: Required<Static<T, this['params']>>;
    properties: {
        [K in keyof T['properties']]: T['properties'][K] extends TReadonlyOptional<infer U> ? TReadonly<U> : T['properties'][K] extends TReadonly<infer U> ? TReadonly<U> : T['properties'][K] extends TOptional<infer U> ? U : T['properties'][K];
    };
}
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
export type TupleToArray<T extends TTuple<TSchema[]>> = T extends TTuple<infer R> ? R : never;
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
/** Creates a static type from a TypeBox type */
export type Static<T extends TSchema, P extends unknown[] = []> = (T & {
    params: P;
})['static'];
export declare class TypeBuilder {
    /** Creates a readonly optional property */
    ReadonlyOptional<T extends TSchema>(item: T): TReadonlyOptional<T>;
    /** Creates a readonly property */
    Readonly<T extends TSchema>(item: T): TReadonly<T>;
    /** Creates a optional property */
    Optional<T extends TSchema>(item: T): TOptional<T>;
    /** `Standard` Creates a any type */
    Any(options?: SchemaOptions): TAny;
    /** `Standard` Creates a array type */
    Array<T extends TSchema>(items: T, options?: ArrayOptions): TArray<T>;
    /** `Standard` Creates a boolean type */
    Boolean(options?: SchemaOptions): TBoolean;
    /** `Extended` Creates a tuple type from this constructors parameters */
    ConstructorParameters<T extends TConstructor<any[], any>>(schema: T, options?: SchemaOptions): TConstructorParameters<T>;
    /** `Extended` Creates a constructor type */
    Constructor<T extends TTuple<TSchema[]>, U extends TSchema>(parameters: T, returns: U, options?: SchemaOptions): TConstructor<TupleToArray<T>, U>;
    /** `Extended` Creates a constructor type */
    Constructor<T extends TSchema[], U extends TSchema>(parameters: [...T], returns: U, options?: SchemaOptions): TConstructor<T, U>;
    /** `Extended` Creates a Date type */
    Date(options?: DateOptions): TDate;
    /** `Standard` Creates a enum type */
    Enum<T extends Record<string, string | number>>(item: T, options?: SchemaOptions): TEnum<T>;
    /** `Extended` Creates a function type */
    Function<T extends TTuple<TSchema[]>, U extends TSchema>(parameters: T, returns: U, options?: SchemaOptions): TFunction<TupleToArray<T>, U>;
    /** `Extended` Creates a function type */
    Function<T extends TSchema[], U extends TSchema>(parameters: [...T], returns: U, options?: SchemaOptions): TFunction<T, U>;
    /** `Extended` Creates a type from this constructors instance type */
    InstanceType<T extends TConstructor<any[], any>>(schema: T, options?: SchemaOptions): TInstanceType<T>;
    /** `Standard` Creates a integer type */
    Integer(options?: NumericOptions): TInteger;
    /** `Standard` Creates a intersect type. */
    Intersect<T extends TObject[]>(objects: [...T], options?: ObjectOptions): TIntersect<T>;
    /** `Standard` Creates a keyof type */
    KeyOf<T extends TObject>(object: T, options?: SchemaOptions): TKeyOf<T>;
    /** `Standard` Creates a literal type. */
    Literal<T extends TLiteralValue>(value: T, options?: SchemaOptions): TLiteral<T>;
    /** `Standard` Creates a never type */
    Never(options?: SchemaOptions): TNever;
    /** `Standard` Creates a null type */
    Null(options?: SchemaOptions): TNull;
    /** `Standard` Creates a number type */
    Number(options?: NumericOptions): TNumber;
    /** `Standard` Creates an object type */
    Object<T extends TProperties>(properties: T, options?: ObjectOptions): TObject<T>;
    /** `Standard` Creates a new object type whose keys are omitted from the given source type */
    Omit<T extends TObject, K extends TUnion<TLiteral<string>[]>>(schema: T, keys: K, options?: ObjectOptions): TOmit<T, UnionStringLiteralToTuple<K>>;
    /** `Standard` Creates a new object type whose keys are omitted from the given source type */
    Omit<T extends TObject, K extends ObjectPropertyKeys<T>[]>(schema: T, keys: readonly [...K], options?: ObjectOptions): TOmit<T, K>;
    /** `Extended` Creates a tuple type from this functions parameters */
    Parameters<T extends TFunction<any[], any>>(schema: T, options?: SchemaOptions): TParameters<T>;
    /** `Standard` Creates an object type whose properties are all optional */
    Partial<T extends TObject>(schema: T, options?: ObjectOptions): TPartial<T>;
    /** `Standard` Creates a new object type whose keys are picked from the given source type */
    Pick<T extends TObject, K extends TUnion<TLiteral<string>[]>>(schema: T, keys: K, options?: ObjectOptions): TPick<T, UnionStringLiteralToTuple<K>>;
    /** `Standard` Creates a new object type whose keys are picked from the given source type */
    Pick<T extends TObject, K extends ObjectPropertyKeys<T>[]>(schema: T, keys: readonly [...K], options?: ObjectOptions): TPick<T, K>;
    /** `Extended` Creates a Promise type */
    Promise<T extends TSchema>(item: T, options?: SchemaOptions): TPromise<T>;
    /** `Standard` Creates an object whose properties are derived from the given string literal union. */
    Record<K extends TUnion<TLiteral[]>, T extends TSchema>(key: K, schema: T, options?: ObjectOptions): TObject<TRecordProperties<K, T>>;
    /** `Standard` Creates a record type */
    Record<K extends TString | TNumeric, T extends TSchema>(key: K, schema: T, options?: ObjectOptions): TRecord<K, T>;
    /** `Standard` Creates recursive type */
    Recursive<T extends TSchema>(callback: (self: TSelf) => T, options?: SchemaOptions): TRecursive<T>;
    /** `Standard` Creates a reference type. The referenced type must contain a $id. */
    Ref<T extends TSchema>(schema: T, options?: SchemaOptions): TRef<T>;
    /** `Standard` Creates a string type from a regular expression */
    RegEx(regex: RegExp, options?: SchemaOptions): TString;
    /** `Standard` Creates an object type whose properties are all required */
    Required<T extends TObject>(schema: T, options?: SchemaOptions): TRequired<T>;
    /** `Extended` Creates a type from this functions return type */
    ReturnType<T extends TFunction<any[], any>>(schema: T, options?: SchemaOptions): TReturnType<T>;
    /** Removes Kind and Modifier symbol property keys from this schema */
    Strict<T extends TSchema>(schema: T): T;
    /** `Standard` Creates a string type */
    String<Format extends string>(options?: StringOptions<StringFormatOption | Format>): TString<Format>;
    /** `Standard` Creates a tuple type */
    Tuple<T extends TSchema[]>(items: [...T], options?: SchemaOptions): TTuple<T>;
    /** `Extended` Creates a undefined type */
    Undefined(options?: SchemaOptions): TUndefined;
    /** `Standard` Creates a union type */
    Union(items: [], options?: SchemaOptions): TNever;
    /** `Standard` Creates a union type */
    Union<T extends TSchema[]>(items: [...T], options?: SchemaOptions): TUnion<T>;
    /** `Extended` Creates a Uint8Array type */
    Uint8Array(options?: Uint8ArrayOptions): TUint8Array;
    /** `Standard` Creates an unknown type */
    Unknown(options?: SchemaOptions): TUnknown;
    /** `Standard` Creates a user defined schema that infers as type T  */
    Unsafe<T>(options?: UnsafeOptions): TUnsafe<T>;
    /** `Extended` Creates a void type */
    Void(options?: SchemaOptions): TVoid;
    /** Use this function to return TSchema with static and params omitted */
    protected Create<T>(schema: Omit<T, 'static' | 'params'>): T;
    /** Clones the given value */
    protected Clone(value: any): any;
}
/** JSON Schema Type Builder with Static Type Resolution for TypeScript */
export declare const Type: TypeBuilder;
