/// <reference types="node" resolution-mode="require"/>
export type ConfigType = 'number' | 'string' | 'boolean';
/**
 * Given a Jack object, get the typeof its ConfigSet
 */
export type Unwrap<J> = J extends Jack<infer C> ? C : never;
import { inspect, InspectOptions } from 'node:util';
/**
 * Defines the type of value that is valid, given a config definition's
 * {@link ConfigType} and boolean multiple setting
 */
export type ValidValue<T extends ConfigType = ConfigType, M extends boolean = boolean> = [
    T,
    M
] extends ['number', true] ? number[] : [T, M] extends ['string', true] ? string[] : [T, M] extends ['boolean', true] ? boolean[] : [T, M] extends ['number', false] ? number : [T, M] extends ['string', false] ? string : [T, M] extends ['boolean', false] ? boolean : [T, M] extends ['string', boolean] ? string | string[] : [T, M] extends ['boolean', boolean] ? boolean | boolean[] : [T, M] extends ['number', boolean] ? number | number[] : [T, M] extends [ConfigType, false] ? string | number | boolean : [T, M] extends [ConfigType, true] ? string[] | number[] | boolean[] : string | number | boolean | string[] | number[] | boolean[];
/**
 * The meta information for a config option definition, when the
 * type and multiple values can be inferred by the method being used
 */
export type ConfigOptionMeta<T extends ConfigType, M extends boolean = boolean, O extends undefined | (T extends 'boolean' ? never : T extends 'string' ? readonly string[] : T extends 'number' ? readonly number[] : readonly number[] | readonly string[]) = undefined | (T extends 'boolean' ? never : T extends 'string' ? readonly string[] : T extends 'number' ? readonly number[] : readonly number[] | readonly string[])> = {
    default?: undefined | (ValidValue<T, M> & (O extends number[] | string[] ? M extends false ? O[number] : O[number][] : unknown));
    validOptions?: O;
    description?: string;
    validate?: ((v: unknown) => v is ValidValue<T, M>) | ((v: unknown) => boolean);
    short?: string | undefined;
    type?: T;
    hint?: T extends 'boolean' ? never : string;
    delim?: M extends true ? string : never;
} & (M extends false ? {
    multiple?: false | undefined;
} : M extends true ? {
    multiple: true;
} : {
    multiple?: boolean;
});
/**
 * A set of {@link ConfigOptionMeta} fields, referenced by their longOption
 * string values.
 */
export type ConfigMetaSet<T extends ConfigType, M extends boolean = boolean> = {
    [longOption: string]: ConfigOptionMeta<T, M>;
};
/**
 * Infer {@link ConfigSet} fields from a given {@link ConfigMetaSet}
 */
export type ConfigSetFromMetaSet<T extends ConfigType, M extends boolean, S extends ConfigMetaSet<T, M>> = {
    [longOption in keyof S]: ConfigOptionBase<T, M>;
};
/**
 * Fields that can be set on a {@link ConfigOptionBase} or
 * {@link ConfigOptionMeta} based on whether or not the field is known to be
 * multiple.
 */
export type MultiType<M extends boolean> = M extends true ? {
    multiple: true;
    delim?: string | undefined;
} : M extends false ? {
    multiple?: false | undefined;
    delim?: undefined;
} : {
    multiple?: boolean | undefined;
    delim?: string | undefined;
};
/**
 * A config field definition, in its full representation.
 */
export type ConfigOptionBase<T extends ConfigType, M extends boolean = boolean> = {
    type: T;
    short?: string | undefined;
    default?: ValidValue<T, M> | undefined;
    description?: string;
    hint?: T extends 'boolean' ? undefined : string | undefined;
    validate?: (v: unknown) => v is ValidValue<T, M>;
    validOptions?: T extends 'boolean' ? undefined : T extends 'string' ? readonly string[] : T extends 'number' ? readonly number[] : readonly number[] | readonly string[];
} & MultiType<M>;
export declare const isConfigType: (t: string) => t is ConfigType;
export declare const isConfigOption: <T extends ConfigType, M extends boolean>(o: any, type: T, multi: M) => o is ConfigOptionBase<T, M>;
/**
 * A set of {@link ConfigOptionBase} objects, referenced by their longOption
 * string values.
 */
export type ConfigSet = {
    [longOption: string]: ConfigOptionBase<ConfigType>;
};
/**
 * The 'values' field returned by {@link Jack#parse}
 */
export type OptionsResults<T extends ConfigSet> = {
    [k in keyof T]?: T[k]['validOptions'] extends (readonly string[] | readonly number[]) ? T[k] extends ConfigOptionBase<'string' | 'number', false> ? T[k]['validOptions'][number] : T[k] extends ConfigOptionBase<'string' | 'number', true> ? T[k]['validOptions'][number][] : never : T[k] extends ConfigOptionBase<'string', false> ? string : T[k] extends ConfigOptionBase<'string', true> ? string[] : T[k] extends ConfigOptionBase<'number', false> ? number : T[k] extends ConfigOptionBase<'number', true> ? number[] : T[k] extends ConfigOptionBase<'boolean', false> ? boolean : T[k] extends ConfigOptionBase<'boolean', true> ? boolean[] : never;
};
/**
 * The object retured by {@link Jack#parse}
 */
export type Parsed<T extends ConfigSet> = {
    values: OptionsResults<T>;
    positionals: string[];
};
/**
 * A row used when generating the {@link Jack#usage} string
 */
export interface Row {
    left?: string;
    text: string;
    skipLine?: boolean;
    type?: string;
}
/**
 * A heading for a section in the usage, created by the jack.heading()
 * method.
 *
 * First heading is always level 1, subsequent headings default to 2.
 *
 * The level of the nearest heading level sets the indentation of the
 * description that follows.
 */
export interface Heading extends Row {
    type: 'heading';
    text: string;
    left?: '';
    skipLine?: boolean;
    level: number;
    pre?: boolean;
}
/**
 * An arbitrary blob of text describing some stuff, set by the
 * jack.description() method.
 *
 * Indentation determined by level of the nearest header.
 */
export interface Description extends Row {
    type: 'description';
    text: string;
    left?: '';
    skipLine?: boolean;
    pre?: boolean;
}
/**
 * A heading or description row used when generating the {@link Jack#usage}
 * string
 */
export type TextRow = Heading | Description;
/**
 * Either a {@link TextRow} or a reference to a {@link ConfigOptionBase}
 */
export type UsageField = TextRow | {
    type: 'config';
    name: string;
    value: ConfigOptionBase<ConfigType>;
};
/**
 * Options provided to the {@link Jack} constructor
 */
export interface JackOptions {
    /**
     * Whether to allow positional arguments
     *
     * @default true
     */
    allowPositionals?: boolean;
    /**
     * Prefix to use when reading/writing the environment variables
     *
     * If not specified, environment behavior will not be available.
     */
    envPrefix?: string;
    /**
     * Environment object to read/write. Defaults `process.env`.
     * No effect if `envPrefix` is not set.
     */
    env?: {
        [k: string]: string | undefined;
    };
    /**
     * A short usage string. If not provided, will be generated from the
     * options provided, but that can of course be rather verbose if
     * there are a lot of options.
     */
    usage?: string;
    /**
     * Stop parsing flags and opts at the first positional argument.
     * This is to support cases like `cmd [flags] <subcmd> [options]`, where
     * each subcommand may have different options.  This effectively treats
     * any positional as a `--` argument.  Only relevant if `allowPositionals`
     * is true.
     *
     * To do subcommands, set this option, look at the first positional, and
     * parse the remaining positionals as appropriate.
     *
     * @default false
     */
    stopAtPositional?: boolean;
    /**
     * Conditional `stopAtPositional`. If set to a `(string)=>boolean` function,
     * will be called with each positional argument encountered. If the function
     * returns true, then parsing will stop at that point.
     */
    stopAtPositionalTest?: (arg: string) => boolean;
}
/**
 * Class returned by the {@link jack} function and all configuration
 * definition methods.  This is what gets chained together.
 */
export declare class Jack<C extends ConfigSet = {}> {
    #private;
    constructor(options?: JackOptions);
    /**
     * Set the default value (which will still be overridden by env or cli)
     * as if from a parsed config file. The optional `source` param, if
     * provided, will be included in error messages if a value is invalid or
     * unknown.
     */
    setConfigValues(values: OptionsResults<C>, source?: string): this;
    /**
     * Parse a string of arguments, and return the resulting
     * `{ values, positionals }` object.
     *
     * If an {@link JackOptions#envPrefix} is set, then it will read default
     * values from the environment, and write the resulting values back
     * to the environment as well.
     *
     * Environment values always take precedence over any other value, except
     * an explicit CLI setting.
     */
    parse(args?: string[]): Parsed<C>;
    loadEnvDefaults(): void;
    applyDefaults(p: Parsed<C>): void;
    /**
     * Only parse the command line arguments passed in.
     * Does not strip off the `node script.js` bits, so it must be just the
     * arguments you wish to have parsed.
     * Does not read from or write to the environment, or set defaults.
     */
    parseRaw(args: string[]): Parsed<C>;
    /**
     * Validate that any arbitrary object is a valid configuration `values`
     * object.  Useful when loading config files or other sources.
     */
    validate(o: unknown): asserts o is Parsed<C>['values'];
    writeEnv(p: Parsed<C>): void;
    /**
     * Add a heading to the usage output banner
     */
    heading(text: string, level?: 1 | 2 | 3 | 4 | 5 | 6, { pre }?: {
        pre?: boolean;
    }): Jack<C>;
    /**
     * Add a long-form description to the usage output at this position.
     */
    description(text: string, { pre }?: {
        pre?: boolean;
    }): Jack<C>;
    /**
     * Add one or more number fields.
     */
    num<F extends ConfigMetaSet<'number', false>>(fields: F): Jack<C & ConfigSetFromMetaSet<'number', false, F>>;
    /**
     * Add one or more multiple number fields.
     */
    numList<F extends ConfigMetaSet<'number'>>(fields: F): Jack<C & ConfigSetFromMetaSet<'number', true, F>>;
    /**
     * Add one or more string option fields.
     */
    opt<F extends ConfigMetaSet<'string', false>>(fields: F): Jack<C & ConfigSetFromMetaSet<'string', false, F>>;
    /**
     * Add one or more multiple string option fields.
     */
    optList<F extends ConfigMetaSet<'string'>>(fields: F): Jack<C & ConfigSetFromMetaSet<'string', true, F>>;
    /**
     * Add one or more flag fields.
     */
    flag<F extends ConfigMetaSet<'boolean', false>>(fields: F): Jack<C & ConfigSetFromMetaSet<'boolean', false, F>>;
    /**
     * Add one or more multiple flag fields.
     */
    flagList<F extends ConfigMetaSet<'boolean'>>(fields: F): Jack<C & ConfigSetFromMetaSet<'boolean', true, F>>;
    /**
     * Generic field definition method. Similar to flag/flagList/number/etc,
     * but you must specify the `type` (and optionally `multiple` and `delim`)
     * fields on each one, or Jack won't know how to define them.
     */
    addFields<F extends ConfigSet>(fields: F): Jack<C & F>;
    /**
     * Return the usage banner for the given configuration
     */
    usage(): string;
    /**
     * Return the usage banner markdown for the given configuration
     */
    usageMarkdown(): string;
    /**
     * Return the configuration options as a plain object
     */
    toJSON(): {
        [k: string]: {
            hint?: string | undefined;
            default?: string | number | boolean | string[] | number[] | boolean[] | undefined;
            validOptions?: readonly number[] | readonly string[] | undefined;
            validate?: ((v: unknown) => v is string | number | boolean | string[] | number[] | boolean[]) | undefined;
            description?: string | undefined;
            short?: string | undefined;
            delim?: string | undefined;
            multiple?: boolean | undefined;
            type: ConfigType;
        };
    };
    /**
     * Custom printer for `util.inspect`
     */
    [inspect.custom](_: number, options: InspectOptions): string;
}
/**
 * Main entry point. Create and return a {@link Jack} object.
 */
export declare const jack: (options?: JackOptions) => Jack<{}>;
//# sourceMappingURL=index.d.ts.map