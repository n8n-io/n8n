import { QuansyncInputObject, QuansyncFn, QuansyncGeneratorFn, QuansyncOptions } from './types.cjs';
export { QuansyncAwaitableGenerator, QuansyncGenerator, QuansyncInput } from './types.cjs';

/**
 * This function is equivalent to `quansync` from main entry
 * but accepts a fake argument type of async functions.
 *
 * This requires to be used with the macro transformer `unplugin-quansync`.
 * Do NOT use it directly.
 *
 * @internal
 */
declare const quansync: {
    <Return, Args extends any[] = []>(input: QuansyncInputObject<Return, Args>): QuansyncFn<Return, Args>;
    <Return, Args extends any[] = []>(input: QuansyncGeneratorFn<Return, Args> | Promise<Return> | ((...args: Args) => Promise<Return> | Return), options?: QuansyncOptions): QuansyncFn<Return, Args>;
};

export { QuansyncFn, QuansyncGeneratorFn, QuansyncInputObject, QuansyncOptions, quansync };
