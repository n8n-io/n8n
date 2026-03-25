import { ConditionOptions, ResolveOptions } from './Condition';
import { TestFunction, Test, TestConfig } from './util/createValidation';
import { ValidateOptions, TransformFunction, Message, Callback, InternalOptions, Maybe, ExtraParams, AnyObject } from './types';
import type { Asserts, Thunk } from './util/types';
import ReferenceSet from './util/ReferenceSet';
import Reference from './Reference';
export declare type SchemaSpec<TDefault> = {
    nullable: boolean;
    presence: 'required' | 'defined' | 'optional';
    default?: TDefault | (() => TDefault);
    abortEarly?: boolean;
    strip?: boolean;
    strict?: boolean;
    recursive?: boolean;
    label?: string | undefined;
    meta?: any;
};
export declare type SchemaOptions<TDefault> = {
    type?: string;
    spec?: SchemaSpec<TDefault>;
};
export declare type AnySchema<Type = any, TContext = any, TOut = any> = BaseSchema<Type, TContext, TOut>;
export interface CastOptions<TContext = {}> {
    parent?: any;
    context?: TContext;
    assert?: boolean;
    stripUnknown?: boolean;
    path?: string;
}
export interface SchemaRefDescription {
    type: 'ref';
    key: string;
}
export interface SchemaInnerTypeDescription extends SchemaDescription {
    innerType?: SchemaFieldDescription;
}
export interface SchemaObjectDescription extends SchemaDescription {
    fields: Record<string, SchemaFieldDescription>;
}
export declare type SchemaFieldDescription = SchemaDescription | SchemaRefDescription | SchemaObjectDescription | SchemaInnerTypeDescription;
export interface SchemaDescription {
    type: string;
    label?: string;
    meta: object;
    oneOf: unknown[];
    notOneOf: unknown[];
    tests: Array<{
        name?: string;
        params: ExtraParams | undefined;
    }>;
}
export default abstract class BaseSchema<TCast = any, TContext = AnyObject, TOutput = any> {
    readonly type: string;
    readonly __inputType: TCast;
    readonly __outputType: TOutput;
    readonly __isYupSchema__: boolean;
    readonly deps: readonly string[];
    tests: Test[];
    transforms: TransformFunction<AnySchema>[];
    private conditions;
    private _mutate?;
    private _typeError?;
    private _whitelistError?;
    private _blacklistError?;
    protected _whitelist: ReferenceSet;
    protected _blacklist: ReferenceSet;
    protected exclusiveTests: Record<string, boolean>;
    spec: SchemaSpec<any>;
    constructor(options?: SchemaOptions<any>);
    get _type(): string;
    protected _typeCheck(_value: any): _value is NonNullable<TCast>;
    clone(spec?: Partial<SchemaSpec<any>>): this;
    label(label: string): this;
    meta(): Record<string, unknown> | undefined;
    meta(obj: Record<string, unknown>): this;
    withMutation<T>(fn: (schema: this) => T): T;
    concat(schema: this): this;
    concat(schema: AnySchema): AnySchema;
    isType(v: any): boolean;
    resolve(options: ResolveOptions): this;
    /**
     *
     * @param {*} value
     * @param {Object} options
     * @param {*=} options.parent
     * @param {*=} options.context
     */
    cast(value: any, options?: CastOptions<TContext>): TCast;
    protected _cast(rawValue: any, _options: CastOptions<TContext>): any;
    protected _validate(_value: any, options: InternalOptions<TContext> | undefined, cb: Callback): void;
    validate(value: any, options?: ValidateOptions<TContext>): Promise<this['__outputType']>;
    validateSync(value: any, options?: ValidateOptions<TContext>): this['__outputType'];
    isValid(value: any, options?: ValidateOptions<TContext>): Promise<boolean>;
    isValidSync(value: any, options?: ValidateOptions<TContext>): value is Asserts<this>;
    protected _getDefault(): any;
    getDefault(options?: ResolveOptions): TCast;
    default(def: Thunk<any>): any;
    strict(isStrict?: boolean): this;
    protected _isPresent(value: unknown): boolean;
    defined(message?: Message<{}>): any;
    required(message?: Message<{}>): any;
    notRequired(): any;
    nullable(isNullable?: true): any;
    nullable(isNullable: false): any;
    transform(fn: TransformFunction<this>): this;
    /**
     * Adds a test function to the schema's queue of tests.
     * tests can be exclusive or non-exclusive.
     *
     * - exclusive tests, will replace any existing tests of the same name.
     * - non-exclusive: can be stacked
     *
     * If a non-exclusive test is added to a schema with an exclusive test of the same name
     * the exclusive test is removed and further tests of the same name will be stacked.
     *
     * If an exclusive test is added to a schema with non-exclusive tests of the same name
     * the previous tests are removed and further tests of the same name will replace each other.
     */
    test(options: TestConfig<TCast, TContext>): this;
    test(test: TestFunction<TCast, TContext>): this;
    test(name: string, test: TestFunction<TCast, TContext>): this;
    test(name: string, message: Message, test: TestFunction<TCast, TContext>): this;
    when(options: ConditionOptions<this>): this;
    when(keys: string | string[], options: ConditionOptions<this>): this;
    typeError(message: Message): this;
    oneOf<U extends TCast>(enums: Array<Maybe<U> | Reference>, message?: Message<{
        values: any;
    }>): this;
    notOneOf<U extends TCast>(enums: Array<Maybe<U> | Reference>, message?: Message<{
        values: any;
    }>): this;
    strip(strip?: boolean): this;
    describe(): SchemaDescription;
}
export default interface BaseSchema<TCast, TContext, TOutput> {
    validateAt(path: string, value: any, options?: ValidateOptions<TContext>): Promise<TOutput>;
    validateSyncAt(path: string, value: any, options?: ValidateOptions<TContext>): TOutput;
    equals: BaseSchema['oneOf'];
    is: BaseSchema['oneOf'];
    not: BaseSchema['notOneOf'];
    nope: BaseSchema['notOneOf'];
    optional(): any;
}
