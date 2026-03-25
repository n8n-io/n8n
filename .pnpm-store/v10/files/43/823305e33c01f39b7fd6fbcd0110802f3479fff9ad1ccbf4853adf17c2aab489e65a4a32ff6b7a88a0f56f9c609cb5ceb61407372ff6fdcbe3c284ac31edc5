import BaseSchema from './schema';
import type { MixedLocale } from './locale';
import type { AnyObject, Maybe, Optionals } from './types';
import type { Defined } from './util/types';
export declare function create(): BooleanSchema<boolean | undefined, AnyObject, boolean | undefined>;
export declare namespace create {
    var prototype: BooleanSchema<any, any, any>;
}
export default class BooleanSchema<TType extends Maybe<boolean> = boolean | undefined, TContext extends AnyObject = AnyObject, TOut extends TType = TType> extends BaseSchema<TType, TContext, TOut> {
    constructor();
    protected _typeCheck(v: any): v is NonNullable<TType>;
    isTrue(message?: import("./types").Message<{}> | undefined): BooleanSchema<TType | true, TContext, true | Optionals<TOut>>;
    isFalse(message?: import("./types").Message<{}> | undefined): BooleanSchema<TType | false, TContext, false | Optionals<TOut>>;
}
export default interface BooleanSchema<TType extends Maybe<boolean>, TContext extends AnyObject = AnyObject, TOut extends TType = TType> extends BaseSchema<TType, TContext, TOut> {
    concat<TOther extends BooleanSchema<any, any, any>>(schema: TOther): TOther;
    default<TNextDefault extends Maybe<TType>>(def: TNextDefault | (() => TNextDefault)): TNextDefault extends undefined ? BooleanSchema<TType | undefined, TContext> : BooleanSchema<Defined<TType>, TContext>;
    defined(msg?: MixedLocale['defined']): DefinedBooleanSchema<TType, TContext>;
    required(msg?: MixedLocale['required']): RequiredBooleanSchema<TType, TContext>;
    optional(): BooleanSchema<TType, TContext>;
    notRequired(): BooleanSchema<TType, TContext>;
    nullable(isNullable?: true): BooleanSchema<TType | null>;
    nullable(isNullable: false): BooleanSchema<Exclude<TType, null>>;
}
export interface DefinedBooleanSchema<TType extends Maybe<boolean>, TContext extends AnyObject = AnyObject> extends BooleanSchema<TType, TContext, Defined<TType>> {
    default<TNextDefault extends Maybe<TType>>(def: TNextDefault | (() => TNextDefault)): TNextDefault extends undefined ? BooleanSchema<TType | undefined, TContext> : BooleanSchema<Defined<TType>, TContext>;
    defined(msg?: MixedLocale['defined']): DefinedBooleanSchema<TType, TContext>;
    required(msg?: MixedLocale['required']): RequiredBooleanSchema<TType, TContext>;
    optional(): BooleanSchema<TType, TContext>;
    notRequired(): BooleanSchema<TType, TContext>;
    nullable(isNullable?: true): DefinedBooleanSchema<TType | null>;
    nullable(isNullable: false): DefinedBooleanSchema<Exclude<TType, null>>;
}
export interface RequiredBooleanSchema<TType extends Maybe<boolean>, TContext extends AnyObject = AnyObject> extends BooleanSchema<TType, TContext, NonNullable<TType>> {
    default<TNextDefault extends Maybe<TType>>(def: TNextDefault | (() => TNextDefault)): TNextDefault extends undefined ? BooleanSchema<TType | undefined, TContext> : BooleanSchema<Defined<TType>, TContext>;
    defined(msg?: MixedLocale['defined']): DefinedBooleanSchema<TType, TContext>;
    required(msg?: MixedLocale['required']): RequiredBooleanSchema<TType, TContext>;
    optional(): BooleanSchema<TType, TContext>;
    notRequired(): BooleanSchema<TType, TContext>;
    nullable(isNullable?: true): RequiredBooleanSchema<TType | null, TContext>;
    nullable(isNullable: false): RequiredBooleanSchema<Exclude<TType, null>, TContext>;
}
