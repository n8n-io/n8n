import { MixedLocale } from './locale';
import type { AnyObject, InternalOptions, Callback, Message, Maybe, Preserve, Optionals } from './types';
import type Reference from './Reference';
import { Asserts, Defined, If, Thunk, TypeOf } from './util/types';
import BaseSchema, { AnySchema, SchemaInnerTypeDescription, SchemaSpec } from './schema';
import Lazy from './Lazy';
export declare type RejectorFn = (value: any, index: number, array: any[]) => boolean;
export declare function create<C extends AnyObject = AnyObject, T extends AnySchema | Lazy<any, any> = AnySchema>(type?: T): OptionalArraySchema<T, C, TypeOf<T>[] | undefined>;
export declare namespace create {
    var prototype: ArraySchema<any, any, any, any>;
}
export default class ArraySchema<T extends AnySchema | Lazy<any, any>, C extends AnyObject = AnyObject, TIn extends Maybe<TypeOf<T>[]> = TypeOf<T>[] | undefined, TOut extends Maybe<Asserts<T>[]> = Asserts<T>[] | Optionals<TIn>> extends BaseSchema<TIn, C, TOut> {
    innerType?: T;
    constructor(type?: T);
    protected _typeCheck(v: any): v is NonNullable<TIn>;
    private get _subType();
    protected _cast(_value: any, _opts: InternalOptions<C>): any;
    protected _validate(_value: any, options: InternalOptions<C> | undefined, callback: Callback): void;
    clone(spec?: SchemaSpec<any>): this;
    concat<TOther extends ArraySchema<any, any, any, any>>(schema: TOther): TOther;
    concat(schema: any): any;
    of<TInner extends AnySchema>(schema: TInner): ArraySchema<TInner>;
    length(length: number | Reference<number>, message?: Message<{
        length: number;
    }>): this;
    min(min: number | Reference<number>, message?: Message<{
        min: number;
    }>): this;
    max(max: number | Reference<number>, message?: Message<{
        max: number;
    }>): this;
    ensure(): RequiredArraySchema<T, C, TIn>;
    compact(rejector?: RejectorFn): this;
    describe(): SchemaInnerTypeDescription;
    nullable(isNullable?: true): ArraySchema<T, C, TIn | null>;
    nullable(isNullable: false): ArraySchema<T, C, Exclude<TIn, null>>;
    defined(): DefinedArraySchema<T, C, TIn>;
    required(msg?: MixedLocale['required']): RequiredArraySchema<T, C, TIn>;
}
export interface DefinedArraySchema<T extends AnySchema | Lazy<any, any>, TContext extends AnyObject, TIn extends Maybe<TypeOf<T>[]>> extends ArraySchema<T, TContext, TIn, Asserts<T>[] | Preserve<TIn, null>> {
    default<D extends Maybe<TIn>>(def: Thunk<D>): If<D, DefinedArraySchema<T, TContext, TIn | undefined>, DefinedArraySchema<T, TContext, Defined<TIn>>>;
    defined(msg?: MixedLocale['defined']): this;
    required(msg?: MixedLocale['required']): RequiredArraySchema<T, TContext, TIn>;
    optional(): ArraySchema<T, TContext, TIn>;
    notRequired(): ArraySchema<T, TContext, TIn>;
    nullable(isNullable?: true): DefinedArraySchema<T, TContext, TIn | null>;
    nullable(isNullable: false): RequiredArraySchema<T, TContext, Exclude<TIn, null>>;
}
export interface RequiredArraySchema<T extends AnySchema | Lazy<any, any>, TContext extends AnyObject, TIn extends Maybe<TypeOf<T>[]>> extends ArraySchema<T, TContext, TIn, Asserts<T>[]> {
    default<D extends Maybe<TIn>>(def: Thunk<D>): If<D, RequiredArraySchema<T, TContext, TIn | undefined>, RequiredArraySchema<T, TContext, Defined<TIn>>>;
    defined(msg?: MixedLocale['defined']): DefinedArraySchema<T, TContext, TIn>;
    required(msg?: MixedLocale['required']): this;
    optional(): ArraySchema<T, TContext, TIn>;
    notRequired(): ArraySchema<T, TContext, TIn>;
    nullable(isNullable?: true): RequiredArraySchema<T, TContext, TIn | null>;
    nullable(isNullable: false): RequiredArraySchema<T, TContext, Exclude<TIn, null>>;
}
export interface OptionalArraySchema<T extends AnySchema | Lazy<any, any>, TContext extends AnyObject = AnyObject, TIn extends Maybe<TypeOf<T>[]> = TypeOf<T>[] | undefined> extends ArraySchema<T, TContext, TIn> {
    default<D extends Maybe<TIn>>(def: Thunk<D>): If<D, ArraySchema<T, TContext, TIn | undefined>, ArraySchema<T, TContext, Defined<TIn>>>;
    defined(msg?: MixedLocale['defined']): DefinedArraySchema<T, TContext, TIn>;
    required(msg?: MixedLocale['required']): RequiredArraySchema<T, TContext, TIn>;
    optional(): ArraySchema<T, TContext, TIn>;
    notRequired(): ArraySchema<T, TContext, TIn>;
    nullable(isNullable?: true): OptionalArraySchema<T, TContext, TIn | null>;
    nullable(isNullable: false): OptionalArraySchema<T, TContext, Exclude<TIn, null>>;
}
