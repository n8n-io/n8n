import { Maybe, Options } from '../types';
export declare function appendTaskOptions<T extends Options = Options>(options: Maybe<T>, commands?: string[]): string[];
export declare function getTrailingOptions(args: IArguments, initialPrimitive?: number, objectOnly?: boolean): string[];
/**
 * Given any number of arguments, returns the trailing options argument, ignoring a trailing function argument
 * if there is one. When not found, the return value is null.
 */
export declare function trailingOptionsArgument(args: IArguments): Maybe<Options>;
/**
 * Returns either the source argument when it is a `Function`, or the default
 * `NOOP` function constant
 */
export declare function trailingFunctionArgument(args: unknown[] | IArguments | unknown, includeNoop?: boolean): Maybe<(...args: unknown[]) => unknown>;
