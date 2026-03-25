import { URL } from 'node:url';
import { BooleanFlag, CustomOptions, FlagDefinition, OptionFlag } from './interfaces';
type NotArray<T> = T extends Array<any> ? never : T;
/**
 * Create a custom flag.
 *
 * @example
 * type Id = string
 * type IdOpts = { startsWith: string; length: number }
 *
 * export const myFlag = custom<Id, IdOpts>({
 *   parse: async (input, opts) => {
 *     if (input.startsWith(opts.startsWith) && input.length === opts.length) {
 *       return input
 *     }
 *
 *     throw new Error('Invalid id')
 *   },
 * })
 */
export declare function custom<T = string, P extends CustomOptions = CustomOptions>(defaults: Partial<OptionFlag<T[], P>> & {
    multiple: true;
} & ({
    default: OptionFlag<T[], P>['default'];
} | {
    required: true;
})): FlagDefinition<T, P, {
    multiple: true;
    requiredOrDefaulted: true;
}>;
export declare function custom<T = string, P extends CustomOptions = CustomOptions>(defaults: Partial<OptionFlag<NotArray<T>, P>> & {
    multiple?: false | undefined;
} & ({
    default: OptionFlag<NotArray<T>, P>['default'];
} | {
    required: true;
})): FlagDefinition<T, P, {
    multiple: false;
    requiredOrDefaulted: true;
}>;
export declare function custom<T = string, P extends CustomOptions = CustomOptions>(defaults: Partial<OptionFlag<NotArray<T>, P>> & {
    default?: OptionFlag<NotArray<T>, P>['default'] | undefined;
    multiple?: false | undefined;
    required?: false | undefined;
}): FlagDefinition<T, P, {
    multiple: false;
    requiredOrDefaulted: false;
}>;
export declare function custom<T = string, P extends CustomOptions = CustomOptions>(defaults: Partial<OptionFlag<T[], P>> & {
    default?: OptionFlag<T[], P>['default'] | undefined;
    multiple: true;
    required?: false | undefined;
}): FlagDefinition<T, P, {
    multiple: true;
    requiredOrDefaulted: false;
}>;
export declare function custom<T = string, P extends CustomOptions = CustomOptions>(): FlagDefinition<T, P, {
    multiple: false;
    requiredOrDefaulted: false;
}>;
/**
 * A boolean flag. Defaults to `false` unless default is set to `true`.
 *
 * - `allowNo` option allows `--no-` prefix to negate boolean flag.
 */
export declare function boolean<T = boolean>(options?: Partial<BooleanFlag<T>>): BooleanFlag<T>;
/**
 * An integer flag. Throws an error if the provided value is not a valid integer.
 *
 * - `min` option allows to set a minimum value.
 * - `max` option allows to set a maximum value.
 */
export declare const integer: FlagDefinition<number, {
    max?: number;
    min?: number;
}, {
    multiple: false;
    requiredOrDefaulted: false;
}>;
/**
 * A directory flag.
 *
 * - `exists` option allows you to throw an error if the directory does not exist.
 */
export declare const directory: FlagDefinition<string, {
    exists?: boolean;
}, {
    multiple: false;
    requiredOrDefaulted: false;
}>;
/**
 * A file flag.
 *
 * - `exists` option allows you to throw an error if the file does not exist.
 */
export declare const file: FlagDefinition<string, {
    exists?: boolean;
}, {
    multiple: false;
    requiredOrDefaulted: false;
}>;
/**
 * A URL flag that converts the provided value is a string.
 *
 * Throws an error if the string is not a valid URL.
 */
export declare const url: FlagDefinition<URL, CustomOptions, {
    multiple: false;
    requiredOrDefaulted: false;
}>;
/**
 * A string flag.
 */
export declare const string: FlagDefinition<string, CustomOptions, {
    multiple: false;
    requiredOrDefaulted: false;
}>;
/**
 * Version flag that will print the CLI version and exit.
 */
export declare const version: (opts?: Partial<BooleanFlag<boolean>>) => BooleanFlag<void>;
/**
 * A help flag that will print the CLI help and exit.
 */
export declare const help: (opts?: Partial<BooleanFlag<boolean>>) => BooleanFlag<void>;
type ReadonlyElementOf<T extends ReadonlyArray<unknown>> = T[number];
/**
 * Create a custom flag that infers the flag type from the provided options.
 *
 * The provided `options` must be a readonly array in order for type inference to work.
 *
 * @example
 * export default class MyCommand extends Command {
 *   static flags = {
 *     name: Flags.option({
 *       options: ['foo', 'bar'] as const,
 *     })(),
 *   }
 * }
 */
export declare function option<T extends readonly string[], P extends CustomOptions>(defaults: Partial<OptionFlag<ReadonlyElementOf<T>[], P>> & {
    multiple: true;
    options: T;
} & ({
    default: OptionFlag<ReadonlyElementOf<T>[], P>['default'] | undefined;
} | {
    required: true;
})): FlagDefinition<(typeof defaults.options)[number], P, {
    multiple: true;
    requiredOrDefaulted: true;
}>;
export declare function option<T extends readonly string[], P extends CustomOptions>(defaults: Partial<OptionFlag<ReadonlyElementOf<T>, P>> & {
    multiple?: false | undefined;
    options: T;
} & ({
    default: OptionFlag<ReadonlyElementOf<T>, P>['default'];
} | {
    required: true;
})): FlagDefinition<(typeof defaults.options)[number], P, {
    multiple: false;
    requiredOrDefaulted: true;
}>;
export declare function option<T extends readonly string[], P extends CustomOptions>(defaults: Partial<OptionFlag<ReadonlyElementOf<T>, P>> & {
    default?: OptionFlag<ReadonlyElementOf<T>, P>['default'] | undefined;
    multiple?: false | undefined;
    options: T;
    required?: false | undefined;
}): FlagDefinition<(typeof defaults.options)[number], P, {
    multiple: false;
    requiredOrDefaulted: false;
}>;
export declare function option<T extends readonly string[], P extends CustomOptions>(defaults: Partial<OptionFlag<ReadonlyElementOf<T>[], P>> & {
    default?: OptionFlag<ReadonlyElementOf<T>[], P>['default'] | undefined;
    multiple: true;
    options: T;
    required?: false | undefined;
}): FlagDefinition<(typeof defaults.options)[number], P, {
    multiple: true;
    requiredOrDefaulted: false;
}>;
export {};
