import { MixedLocale } from './locale';
import type { AnyObject, Maybe } from './types';
import type Reference from './Reference';
import type { Defined, If, Thunk } from './util/types';
import BaseSchema from './schema';
export declare function create(): NumberSchema<number | undefined, AnyObject, number | undefined>;
export declare namespace create {
    var prototype: NumberSchema<any, any, any>;
}
export default class NumberSchema<TType extends Maybe<number> = number | undefined, TContext extends AnyObject = AnyObject, TOut extends TType = TType> extends BaseSchema<TType, TContext, TOut> {
    constructor();
    protected _typeCheck(value: any): value is NonNullable<TType>;
    min(min: number | Reference<number>, message?: import("./types").Message<{
        min: number;
    }>): this;
    max(max: number | Reference<number>, message?: import("./types").Message<{
        max: number;
    }>): this;
    lessThan(less: number | Reference<number>, message?: import("./types").Message<{
        less: number;
    }>): this;
    moreThan(more: number | Reference<number>, message?: import("./types").Message<{
        more: number;
    }>): this;
    positive(msg?: import("./types").Message<{
        more: number;
    }>): this;
    negative(msg?: import("./types").Message<{
        less: number;
    }>): this;
    integer(message?: import("./types").Message<{}>): this;
    truncate(): this;
    round(method: 'ceil' | 'floor' | 'round' | 'trunc'): this;
}
export default interface NumberSchema<TType extends Maybe<number> = number | undefined, TContext extends AnyObject = AnyObject, TOut extends TType = TType> extends BaseSchema<TType, TContext, TOut> {
    concat<TOther extends NumberSchema<any, any, any>>(schema: TOther): TOther;
    default<D extends Maybe<TType>>(def: Thunk<D>): If<D, NumberSchema<TType | undefined, TContext>, NumberSchema<Defined<TType>, TContext>>;
    defined(msg?: MixedLocale['defined']): DefinedNumberSchema<TType, TContext>;
    required(msg?: MixedLocale['required']): RequiredNumberSchema<TType, TContext>;
    optional(): NumberSchema<TType, TContext>;
    notRequired(): NumberSchema<TType, TContext>;
    nullable(isNullable?: true): NumberSchema<TType | null, TContext>;
    nullable(isNullable: false): NumberSchema<Exclude<TType, null>, TContext>;
}
export interface DefinedNumberSchema<TType extends Maybe<number>, TContext extends AnyObject = AnyObject> extends NumberSchema<TType, TContext, Defined<TType>> {
    default<D extends Maybe<TType>>(def: Thunk<D>): If<D, DefinedNumberSchema<TType | undefined, TContext>, DefinedNumberSchema<Defined<TType>, TContext>>;
    defined(msg?: MixedLocale['defined']): this;
    required(msg?: MixedLocale['required']): RequiredNumberSchema<TType, TContext>;
    optional(): NumberSchema<TType, TContext>;
    notRequired(): NumberSchema<TType, TContext>;
    nullable(isNullable?: true): RequiredNumberSchema<TType | null, TContext>;
    nullable(isNullable: false): RequiredNumberSchema<Exclude<TType, null>, TContext>;
}
export interface RequiredNumberSchema<TType extends Maybe<number>, TContext extends AnyObject = AnyObject> extends NumberSchema<TType, TContext, NonNullable<TType>> {
    default<D extends Maybe<TType>>(def: Thunk<D>): If<D, RequiredNumberSchema<TType | undefined, TContext>, RequiredNumberSchema<Defined<TType>, TContext>>;
    defined(msg?: MixedLocale['defined']): DefinedNumberSchema<TType, TContext>;
    required(msg?: MixedLocale['required']): RequiredNumberSchema<TType, TContext>;
    optional(): NumberSchema<TType, TContext>;
    notRequired(): NumberSchema<TType, TContext>;
    nullable(isNullable?: true): RequiredNumberSchema<TType | null, TContext>;
    nullable(isNullable: false): RequiredNumberSchema<Exclude<TType, null>, TContext>;
}
