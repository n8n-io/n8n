import { MixedLocale } from './locale';
import type Reference from './Reference';
import type { Message, Maybe, AnyObject } from './types';
import type { Defined, If, Thunk } from './util/types';
import BaseSchema from './schema';
export declare type MatchOptions = {
    excludeEmptyString?: boolean;
    message: Message<{
        regex: RegExp;
    }>;
    name?: string;
};
export declare function create(): StringSchema<string | undefined, AnyObject, string | undefined>;
export declare namespace create {
    var prototype: StringSchema<any, any, any>;
}
export default class StringSchema<TType extends Maybe<string> = string | undefined, TContext extends AnyObject = AnyObject, TOut extends TType = TType> extends BaseSchema<TType, TContext, TOut> {
    constructor();
    protected _typeCheck(value: any): value is NonNullable<TType>;
    protected _isPresent(value: any): boolean;
    length(length: number | Reference<number>, message?: Message<{
        length: number;
    }>): this;
    min(min: number | Reference<number>, message?: Message<{
        min: number;
    }>): this;
    max(max: number | Reference<number>, message?: Message<{
        max: number;
    }>): this;
    matches(regex: RegExp, options?: MatchOptions | MatchOptions['message']): this;
    email(message?: Message<{
        regex: RegExp;
    }>): this;
    url(message?: Message<{
        regex: RegExp;
    }>): this;
    uuid(message?: Message<{
        regex: RegExp;
    }>): this;
    ensure(): StringSchema<NonNullable<TType>>;
    trim(message?: Message<{}>): this;
    lowercase(message?: Message<{}>): this;
    uppercase(message?: Message<{}>): this;
}
export interface DefinedStringSchema<TType extends Maybe<string>, TContext extends AnyObject = AnyObject> extends StringSchema<TType, TContext, Defined<TType>> {
    default<D extends Maybe<TType>>(def: Thunk<D>): If<D, DefinedStringSchema<TType | undefined, TContext>, DefinedStringSchema<Defined<TType>, TContext>>;
    defined(msg?: MixedLocale['defined']): this;
    required(msg?: MixedLocale['required']): RequiredStringSchema<TType, TContext>;
    optional(): StringSchema<TType, TContext>;
    notRequired(): StringSchema<TType, TContext>;
    nullable(isNullable?: true): RequiredStringSchema<TType | null, TContext>;
    nullable(isNullable: false): RequiredStringSchema<Exclude<TType, null>, TContext>;
}
export interface RequiredStringSchema<TType extends Maybe<string>, TContext extends AnyObject = AnyObject> extends StringSchema<TType, TContext, NonNullable<TType>> {
    default<D extends Maybe<TType>>(def: Thunk<D>): If<D, RequiredStringSchema<TType | undefined, TContext>, RequiredStringSchema<Defined<TType>, TContext>>;
    defined(msg?: MixedLocale['defined']): DefinedStringSchema<TType, TContext>;
    required(msg?: MixedLocale['required']): RequiredStringSchema<TType, TContext>;
    optional(): StringSchema<TType, TContext>;
    notRequired(): StringSchema<TType, TContext>;
    nullable(isNullable?: true): RequiredStringSchema<TType | null, TContext>;
    nullable(isNullable: false): RequiredStringSchema<Exclude<TType, null>, TContext>;
}
export default interface StringSchema<TType extends Maybe<string> = string | undefined, TContext extends AnyObject = AnyObject, TOut extends TType = TType> extends BaseSchema<TType, TContext, TOut> {
    concat<TOther extends StringSchema<any, any, any>>(schema: TOther): TOther;
    default<D extends Maybe<TType>>(def: Thunk<D>): If<D, StringSchema<TType | undefined, TContext>, StringSchema<Defined<TType>, TContext>>;
    defined(msg?: MixedLocale['defined']): DefinedStringSchema<TType, TContext>;
    required(msg?: MixedLocale['required']): RequiredStringSchema<TType, TContext>;
    optional(): StringSchema<TType, TContext>;
    notRequired(): StringSchema<TType, TContext>;
    nullable(isNullable?: true): StringSchema<TType | null, TContext>;
    nullable(isNullable: false): StringSchema<Exclude<TType, null>, TContext>;
    withContext<TNextContext extends TContext>(): StringSchema<Exclude<TType, null>, TNextContext>;
}
