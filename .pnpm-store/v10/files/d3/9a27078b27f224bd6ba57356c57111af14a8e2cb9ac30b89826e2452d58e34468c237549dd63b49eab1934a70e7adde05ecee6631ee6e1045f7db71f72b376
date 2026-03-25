import { QuansyncInputObject, QuansyncFn, QuansyncGeneratorFn, QuansyncOptions, QuansyncGenerator } from './types.cjs';
export { QuansyncAwaitableGenerator, QuansyncInput } from './types.cjs';

declare const GET_IS_ASYNC: unique symbol;
declare class QuansyncError extends Error {
    constructor(message?: string);
}
/**
 * Creates a new Quansync function, a "superposition" between async and sync.
 */
declare function quansync<Return, Args extends any[] = []>(input: QuansyncInputObject<Return, Args>): QuansyncFn<Return, Args>;
declare function quansync<Return, Args extends any[] = []>(input: QuansyncGeneratorFn<Return, Args> | Promise<Return>, options?: QuansyncOptions): QuansyncFn<Return, Args>;
/**
 * Converts a promise to a Quansync generator.
 */
declare function toGenerator<T>(promise: Promise<T> | QuansyncGenerator<T> | T): QuansyncGenerator<T>;
/**
 * @returns `true` if the current context is async, `false` otherwise.
 */
declare const getIsAsync: QuansyncFn<boolean, []>;

export { GET_IS_ASYNC, QuansyncError, QuansyncFn, QuansyncGenerator, QuansyncGeneratorFn, QuansyncInputObject, QuansyncOptions, getIsAsync, quansync, toGenerator };
