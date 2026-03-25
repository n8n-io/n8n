import { MixedLocale } from './locale';
import { InternalOptions, Callback, Maybe, Optionals, Preserve } from './types';
import type { TypedSchema, Defined } from './util/types';
import type Reference from './Reference';
import Lazy from './Lazy';
import BaseSchema, { AnySchema, SchemaObjectDescription, SchemaSpec } from './schema';
export declare type Assign<T extends {}, U extends {}> = {
    [P in keyof T]: P extends keyof U ? U[P] : T[P];
} & U;
export declare type AnyObject = Record<string, any>;
export declare type ObjectShape = Record<string, AnySchema | Reference | Lazy<any, any>>;
export declare type DefaultFromShape<Shape extends ObjectShape> = {
    [K in keyof Shape]: Shape[K] extends ObjectSchema<infer TShape> ? DefaultFromShape<TShape> : Shape[K] extends {
        getDefault: () => infer D;
    } ? Preserve<D, undefined> extends never ? Defined<D> : Preserve<D, undefined> : undefined;
};
export declare type TypeOfShape<Shape extends ObjectShape> = {
    [K in keyof Shape]: Shape[K] extends TypedSchema ? Shape[K]['__inputType'] : Shape[K] extends Reference ? unknown : never;
};
export declare type AssertsShape<Shape extends ObjectShape> = {
    [K in keyof Shape]: Shape[K] extends TypedSchema ? Shape[K]['__outputType'] : Shape[K] extends Reference ? unknown : never;
};
export declare type ObjectSchemaSpec = SchemaSpec<any> & {
    noUnknown?: boolean;
};
export default class ObjectSchema<TShape extends ObjectShape, TContext extends AnyObject = AnyObject, TIn extends Maybe<TypeOfShape<TShape>> = TypeOfShape<TShape>, TOut extends Maybe<AssertsShape<TShape>> = AssertsShape<TShape> | Optionals<TIn>> extends BaseSchema<TIn, TContext, TOut> {
    fields: TShape;
    spec: ObjectSchemaSpec;
    private _sortErrors;
    private _nodes;
    private _excludedEdges;
    constructor(spec?: TShape);
    protected _typeCheck(value: any): value is NonNullable<TIn>;
    protected _cast(_value: any, options?: InternalOptions<TContext>): any;
    protected _validate(_value: any, opts: InternalOptions<TContext> | undefined, callback: Callback): void;
    clone(spec?: ObjectSchemaSpec): this;
    concat<TOther extends ObjectSchema<any, any, any>>(schema: TOther): TOther extends ObjectSchema<infer S, infer C, infer IType> ? ObjectSchema<TShape & S, TContext & C, TypeOfShape<TShape & S> | Optionals<IType>> : never;
    concat(schema: this): this;
    getDefaultFromShape(): DefaultFromShape<TShape>;
    protected _getDefault(): any;
    shape<TNextShape extends ObjectShape>(additions: TNextShape, excludes?: [string, string][]): ObjectSchema<Assign<TShape, TNextShape>, TContext, TypeOfShape<Assign<TShape, TNextShape>> | Optionals<TIn>>;
    pick(keys: string[]): any;
    omit(keys: string[]): any;
    from(from: string, to: keyof TShape, alias?: boolean): this;
    noUnknown(noAllow?: boolean, message?: import("./types").Message<{}>): this;
    unknown(allow?: boolean, message?: import("./types").Message<{}>): this;
    transformKeys(fn: (key: string) => string): this;
    camelCase(): this;
    snakeCase(): this;
    constantCase(): this;
    describe(): SchemaObjectDescription;
}
export declare function create<TShape extends ObjectShape>(spec?: TShape): OptionalObjectSchema<TShape, AnyObject, TypeOfShape<TShape>>;
export declare namespace create {
    var prototype: ObjectSchema<any, any, any, any>;
}
export interface OptionalObjectSchema<TShape extends ObjectShape, TContext extends AnyObject = AnyObject, TIn extends Maybe<TypeOfShape<TShape>> = TypeOfShape<TShape>> extends ObjectSchema<TShape, TContext, TIn> {
    default<TNextDefault extends Maybe<AnyObject>>(def: TNextDefault | (() => TNextDefault)): TNextDefault extends undefined ? ObjectSchema<TShape, TContext, TIn | undefined> : ObjectSchema<TShape, TContext, Defined<TIn>>;
    defined(msg?: MixedLocale['defined']): DefinedObjectSchema<TShape, TContext, TIn>;
    required(msg?: MixedLocale['required']): RequiredObjectSchema<TShape, TContext, TIn>;
    optional(): this;
    notRequired(): this;
    nullable(isNullable?: true): OptionalObjectSchema<TShape, TContext, TIn | null>;
    nullable(isNullable: false): OptionalObjectSchema<TShape, TContext, Exclude<TIn, null>>;
    pick<TKey extends keyof TShape>(keys: TKey[]): OptionalObjectSchema<Pick<TShape, TKey>, TContext, TypeOfShape<Pick<TShape, TKey>> | Optionals<TIn>>;
    omit<TKey extends keyof TShape>(keys: TKey[]): OptionalObjectSchema<Omit<TShape, TKey>, TContext, TypeOfShape<Omit<TShape, TKey>> | Optionals<TIn>>;
}
export interface DefinedObjectSchema<TShape extends ObjectShape, TContext extends AnyObject, TIn extends Maybe<TypeOfShape<TShape>>> extends ObjectSchema<TShape, TContext, TIn, AssertsShape<TShape> | Extract<TIn, null>> {
    default<TNextDefault extends Maybe<AnyObject>>(def: TNextDefault | (() => TNextDefault)): TNextDefault extends undefined ? DefinedObjectSchema<TShape, TContext, TIn | undefined> : DefinedObjectSchema<TShape, TContext, Defined<TIn>>;
    defined(msg?: MixedLocale['defined']): this;
    required(msg?: MixedLocale['required']): RequiredObjectSchema<TShape, TContext, TIn>;
    optional(): OptionalObjectSchema<TShape, TContext, TIn>;
    notRequired(): OptionalObjectSchema<TShape, TContext, TIn>;
    nullable(isNullable?: true): DefinedObjectSchema<TShape, TContext, TIn | null>;
    nullable(isNullable: false): DefinedObjectSchema<TShape, TContext, Exclude<TIn, null>>;
    pick<TKey extends keyof TShape>(keys: TKey[]): DefinedObjectSchema<Pick<TShape, TKey>, TContext, TypeOfShape<Pick<TShape, TKey>> | Optionals<TIn>>;
    omit<TKey extends keyof TShape>(keys: TKey[]): DefinedObjectSchema<Omit<TShape, TKey>, TContext, TypeOfShape<Omit<TShape, TKey>> | Optionals<TIn>>;
}
export interface RequiredObjectSchema<TShape extends ObjectShape, TContext extends AnyObject, TIn extends Maybe<TypeOfShape<TShape>>> extends ObjectSchema<TShape, TContext, TIn, AssertsShape<TShape>> {
    default<TNextDefault extends Maybe<AnyObject>>(def: TNextDefault | (() => TNextDefault)): TNextDefault extends undefined ? RequiredObjectSchema<TShape, TContext, TIn | undefined> : RequiredObjectSchema<TShape, TContext, Defined<TIn>>;
    defined(msg?: MixedLocale['defined']): DefinedObjectSchema<TShape, TContext, TIn>;
    required(msg?: MixedLocale['required']): this;
    optional(): OptionalObjectSchema<TShape, TContext, TIn>;
    notRequired(): OptionalObjectSchema<TShape, TContext, TIn>;
    nullable(isNullable?: true): RequiredObjectSchema<TShape, TContext, TIn | null>;
    nullable(isNullable: false): RequiredObjectSchema<TShape, TContext, Exclude<TIn, null>>;
    pick<TKey extends keyof TShape>(keys: TKey[]): RequiredObjectSchema<Pick<TShape, TKey>, TContext, TypeOfShape<Pick<TShape, TKey>> | Optionals<TIn>>;
    omit<TKey extends keyof TShape>(keys: TKey[]): RequiredObjectSchema<Omit<TShape, TKey>, TContext, TypeOfShape<Omit<TShape, TKey>> | Optionals<TIn>>;
}
