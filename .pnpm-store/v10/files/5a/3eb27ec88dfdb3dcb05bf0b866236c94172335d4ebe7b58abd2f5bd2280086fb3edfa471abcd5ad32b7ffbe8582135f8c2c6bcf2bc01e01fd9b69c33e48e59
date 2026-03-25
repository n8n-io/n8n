import ValidationError from '../ValidationError';
import { ValidateOptions, Message, InternalOptions, Callback, ExtraParams } from '../types';
import Reference from '../Reference';
import type { AnySchema } from '../schema';
export declare type CreateErrorOptions = {
    path?: string;
    message?: Message<any>;
    params?: ExtraParams;
    type?: string;
};
export declare type TestContext<TContext = {}> = {
    path: string;
    options: ValidateOptions<TContext>;
    parent: any;
    schema: any;
    resolve: <T>(value: T | Reference<T>) => T;
    createError: (params?: CreateErrorOptions) => ValidationError;
};
export declare type TestFunction<T = unknown, TContext = {}> = (this: TestContext<TContext>, value: T, context: TestContext<TContext>) => boolean | ValidationError | Promise<boolean | ValidationError>;
export declare type TestOptions<TSchema extends AnySchema = AnySchema> = {
    value: any;
    path?: string;
    label?: string;
    options: InternalOptions;
    originalValue: any;
    schema: TSchema;
    sync?: boolean;
};
export declare type TestConfig<TValue = unknown, TContext = {}> = {
    name?: string;
    message?: Message<any>;
    test: TestFunction<TValue, TContext>;
    params?: ExtraParams;
    exclusive?: boolean;
};
export declare type Test = ((opts: TestOptions, cb: Callback) => void) & {
    OPTIONS: TestConfig;
};
export default function createValidation(config: {
    name?: string;
    test: TestFunction;
    params?: ExtraParams;
    message?: Message<any>;
}): {
    <TSchema extends AnySchema<any, any, any> = AnySchema<any, any, any>>({ value, path, label, options, originalValue, sync, ...rest }: TestOptions<TSchema>, cb: Callback): void;
    OPTIONS: {
        name?: string | undefined;
        test: TestFunction;
        params?: ExtraParams | undefined;
        message?: Message<any> | undefined;
    };
};
