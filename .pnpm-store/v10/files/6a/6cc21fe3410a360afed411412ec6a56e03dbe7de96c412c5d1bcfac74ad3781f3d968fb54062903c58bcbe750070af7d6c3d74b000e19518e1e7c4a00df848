import { MixedLocale } from './locale';
import Ref from './Reference';
import type { AnyObject, Maybe } from './types';
import type { Defined, If, Thunk } from './util/types';
import BaseSchema from './schema';
export declare function create(): DateSchema<Date | undefined, AnyObject, Date | undefined>;
export declare namespace create {
    var prototype: DateSchema<any, any, any>;
    var INVALID_DATE: Date;
}
export default class DateSchema<TType extends Maybe<Date> = Date | undefined, TContext extends AnyObject = AnyObject, TOut extends TType = TType> extends BaseSchema<TType, TContext, TOut> {
    static INVALID_DATE: Date;
    constructor();
    protected _typeCheck(v: any): v is NonNullable<TType>;
    private prepareParam;
    min(min: unknown | Ref<Date>, message?: import("./types").Message<{
        min: string | Date;
    }>): this;
    max(max: unknown | Ref, message?: import("./types").Message<{
        max: string | Date;
    }>): this;
}
export default interface DateSchema<TType extends Maybe<Date>, TContext extends AnyObject = AnyObject, TOut extends TType = TType> extends BaseSchema<TType, TContext, TOut> {
    concat<TOther extends DateSchema<any, any, any>>(schema: TOther): TOther;
    default<D extends Maybe<TType>>(def: Thunk<D>): If<D, DateSchema<TType | undefined, TContext>, DateSchema<Defined<TType>, TContext>>;
    defined(msg?: MixedLocale['defined']): DefinedDateSchema<TType, TContext>;
    required(msg?: MixedLocale['required']): RequiredDateSchema<TType, TContext>;
    optional(): DateSchema<TType, TContext>;
    notRequired(): DateSchema<TType, TContext>;
    nullable(isNullable?: true): DateSchema<TType | null, TContext>;
    nullable(isNullable: false): DateSchema<Exclude<TType, null>, TContext>;
}
export interface DefinedDateSchema<TType extends Maybe<Date>, TContext extends AnyObject = AnyObject> extends DateSchema<TType, TContext, Defined<TType>> {
    default<D extends Maybe<TType>>(def: Thunk<D>): If<D, DefinedDateSchema<TType | undefined, TContext>, DefinedDateSchema<Defined<TType>, TContext>>;
    defined(msg?: MixedLocale['defined']): this;
    required(msg?: MixedLocale['required']): RequiredDateSchema<TType, TContext>;
    optional(): DateSchema<TType, TContext>;
    notRequired(): DateSchema<TType, TContext>;
    nullable(isNullable?: true): RequiredDateSchema<TType | null, TContext>;
    nullable(isNullable: false): RequiredDateSchema<Exclude<TType, null>, TContext>;
}
export interface RequiredDateSchema<TType extends Maybe<Date>, TContext extends AnyObject = AnyObject> extends DateSchema<TType, TContext, NonNullable<TType>> {
    default<D extends Maybe<TType>>(def: Thunk<D>): If<D, RequiredDateSchema<TType | undefined, TContext>, RequiredDateSchema<Defined<TType>, TContext>>;
    defined(msg?: MixedLocale['defined']): DefinedDateSchema<TType, TContext>;
    required(msg?: MixedLocale['required']): RequiredDateSchema<TType, TContext>;
    optional(): DateSchema<TType, TContext>;
    notRequired(): DateSchema<TType, TContext>;
    nullable(isNullable?: true): RequiredDateSchema<TType | null, TContext>;
    nullable(isNullable: false): RequiredDateSchema<Exclude<TType, null>, TContext>;
}
