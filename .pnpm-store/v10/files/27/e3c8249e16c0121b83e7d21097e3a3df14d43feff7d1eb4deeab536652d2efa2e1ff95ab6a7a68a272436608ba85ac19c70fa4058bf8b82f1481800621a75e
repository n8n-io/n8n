import type { Callback, ValidateOptions } from './types';
import type { ResolveOptions } from './Condition';
import type { AnySchema, CastOptions } from './schema';
import { TypedSchema, TypeOf } from './util/types';
declare type ContextOf<T> = T extends AnySchema<any, infer C> ? C : never;
export declare type LazyBuilder<T extends AnySchema = any> = (value: any, options: ResolveOptions) => T;
export declare function create<T extends AnySchema>(builder: LazyBuilder<T>): Lazy<T, ContextOf<T>>;
export declare type LazyReturnValue<T> = T extends Lazy<infer TSchema> ? TSchema : never;
export declare type LazyType<T> = LazyReturnValue<T> extends TypedSchema ? TypeOf<LazyReturnValue<T>> : never;
declare class Lazy<T extends AnySchema, TContext = ContextOf<T>> implements TypedSchema {
    private builder;
    type: "lazy";
    __isYupSchema__: boolean;
    readonly __inputType: T['__inputType'];
    readonly __outputType: T['__outputType'];
    constructor(builder: LazyBuilder<T>);
    private _resolve;
    resolve(options: ResolveOptions<TContext>): T;
    cast(value: any, options?: CastOptions<TContext>): T['__inputType'];
    validate(value: any, options?: ValidateOptions, maybeCb?: Callback): T['__outputType'];
    validateSync(value: any, options?: ValidateOptions<TContext>): T['__outputType'];
    validateAt(path: string, value: any, options?: ValidateOptions<TContext>): Promise<any>;
    validateSyncAt(path: string, value: any, options?: ValidateOptions<TContext>): any;
    describe(): any;
    isValid(value: any, options?: ValidateOptions<TContext>): Promise<boolean>;
    isValidSync(value: any, options?: ValidateOptions<TContext>): boolean;
}
export default Lazy;
