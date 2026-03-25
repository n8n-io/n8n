import { inspect, InspectOptions, ParseArgsConfig } from 'node:util';
export type ParseArgsOptions = Exclude<ParseArgsConfig['options'], undefined>;
export type ParseArgsOption = ParseArgsOptions[string];
export type ParseArgsDefault = Exclude<ConfigValue, number | number[]>;
export type ConfigType = 'number' | 'string' | 'boolean';
export declare const isConfigType: (t: unknown) => t is ConfigType;
export type ConfigValuePrimitive = string | boolean | number;
export type ConfigValueArray = string[] | boolean[] | number[];
export type ConfigValue = ConfigValuePrimitive | ConfigValueArray;
/**
 * Given a Jack object, get the typeof its ConfigSet
 */
export type Unwrap<J> = J extends Jack<infer C> ? C : never;
/**
 * Defines the type of value that is valid, given a config definition's
 * {@link ConfigType} and boolean multiple setting
 */
export type ValidValue<T extends ConfigType = ConfigType, M extends boolean = boolean> = [
    T,
    M
] extends ['number', true] ? number[] : [T, M] extends ['string', true] ? string[] : [T, M] extends ['boolean', true] ? boolean[] : [T, M] extends ['number', false] ? number : [T, M] extends ['string', false] ? string : [T, M] extends ['boolean', false] ? boolean : [T, M] extends ['string', boolean] ? string | string[] : [T, M] extends ['boolean', boolean] ? boolean | boolean[] : [T, M] extends ['number', boolean] ? number | number[] : [T, M] extends [ConfigType, false] ? ConfigValuePrimitive : [T, M] extends [ConfigType, true] ? ConfigValueArray : ConfigValue;
export type ReadonlyArrays = readonly number[] | readonly string[];
/**
 * Defines the type of validOptions that are valid, given a config definition's
 * {@link ConfigType}
 */
export type ValidOptions<T extends ConfigType> = T extends 'boolean' ? undefined : T extends 'string' ? readonly string[] : T extends 'number' ? readonly number[] : ReadonlyArrays;
/**
 * A config field definition, in its full representation.
 * This is what is passed in to addFields so `type` is required.
 */
export type ConfigOption<T extends ConfigType = ConfigType, M extends boolean = boolean, O extends undefined | ValidOptions<T> = undefined | ValidOptions<T>> = {
    type: T;
    short?: string;
    default?: ValidValue<T, M> & (O extends ReadonlyArrays ? M extends false ? O[number] : O[number][] : unknown);
    description?: string;
    hint?: T extends 'boolean' ? undefined : string;
    validate?: ((v: unknown) => v is ValidValue<T, M>) | ((v: unknown) => boolean);
    validOptions?: O;
    delim?: M extends false ? undefined : string;
    multiple?: M;
};
/**
 * Determine whether an unknown object is a {@link ConfigOption} based only
 * on its `type` and `multiple` property
 */
export declare const isConfigOptionOfType: <T extends ConfigType, M extends boolean>(o: any, type: T, multi: M) => o is ConfigOption<T, M>;
/**
 * Determine whether an unknown object is a {@link ConfigOption} based on
 * it having all valid properties
 */
export declare const isConfigOption: <T extends ConfigType, M extends boolean>(o: any, type: T, multi: M) => o is ConfigOption<T, M>;
/**
 * The meta information for a config option definition, when the
 * type and multiple values can be inferred by the method being used
 */
export type ConfigOptionMeta<T extends ConfigType, M extends boolean, O extends ConfigOption<T, M> = ConfigOption<T, M>> = Pick<Partial<O>, 'type'> & Omit<O, 'type'>;
/**
 * A set of {@link ConfigOption} objects, referenced by their longOption
 * string values.
 */
export type ConfigSet = {
    [longOption: string]: ConfigOption;
};
/**
 * A set of {@link ConfigOptionMeta} fields, referenced by their longOption
 * string values.
 */
export type ConfigMetaSet<T extends ConfigType, M extends boolean> = {
    [longOption: string]: ConfigOptionMeta<T, M>;
};
/**
 * Infer {@link ConfigSet} fields from a given {@link ConfigMetaSet}
 */
export type ConfigSetFromMetaSet<T extends ConfigType, M extends boolean, S extends ConfigMetaSet<T, M>> = S & {
    [longOption in keyof S]: ConfigOption<T, M>;
};
/**
 * The 'values' field returned by {@link Jack#parse}. If a value has
 * a default field it will be required on the object otherwise it is optional.
 */
export type OptionsResults<T extends ConfigSet> = {
    [K in keyof T]: (T[K]['validOptions'] extends ReadonlyArrays ? T[K] extends ConfigOption<'string' | 'number', false> ? T[K]['validOptions'][number] : T[K] extends ConfigOption<'string' | 'number', true> ? T[K]['validOptions'][number][] : never : T[K] extends ConfigOption<'string', false> ? string : T[K] extends ConfigOption<'string', true> ? string[] : T[K] extends ConfigOption<'number', false> ? number : T[K] extends ConfigOption<'number', true> ? number[] : T[K] extends ConfigOption<'boolean', false> ? boolean : T[K] extends ConfigOption<'boolean', true> ? boolean[] : never) | (T[K]['default'] extends ConfigValue ? never : undefined);
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
 * Either a {@link TextRow} or a reference to a {@link ConfigOption}
 */
export type UsageField = TextRow | {
    type: 'config';
    name: string;
    value: ConfigOption;
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
    env?: Record<string, string | undefined>;
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
     * Resulting definitions, suitable to be passed to Node's `util.parseArgs`,
     * but also including `description` and `short` fields, if set.
     */
    get definitions(): C;
    /** map of `{ <short>: <long> }` strings for each short name defined */
    get shorts(): Record<string, string>;
    /**
     * options passed to the {@link Jack} constructor
     */
    get jackOptions(): JackOptions;
    /**
     * the data used to generate {@link Jack#usage} and
     * {@link Jack#usageMarkdown} content.
     */
    get usageFields(): UsageField[];
    /**
     * Set the default value (which will still be overridden by env or cli)
     * as if from a parsed config file. The optional `source` param, if
     * provided, will be included in error messages if a value is invalid or
     * unknown.
     */
    setConfigValues(values: Partial<OptionsResults<C>>, source?: string): this;
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
    numList<F extends ConfigMetaSet<'number', true>>(fields: F): Jack<C & ConfigSetFromMetaSet<'number', true, F>>;
    /**
     * Add one or more string option fields.
     */
    opt<F extends ConfigMetaSet<'string', false>>(fields: F): Jack<C & ConfigSetFromMetaSet<'string', false, F>>;
    /**
     * Add one or more multiple string option fields.
     */
    optList<F extends ConfigMetaSet<'string', true>>(fields: F): Jack<C & ConfigSetFromMetaSet<'string', true, F>>;
    /**
     * Add one or more flag fields.
     */
    flag<F extends ConfigMetaSet<'boolean', false>>(fields: F): Jack<C & ConfigSetFromMetaSet<'boolean', false, F>>;
    /**
     * Add one or more multiple flag fields.
     */
    flagList<F extends ConfigMetaSet<'boolean', true>>(fields: F): Jack<C & ConfigSetFromMetaSet<'boolean', true, F>>;
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
            default?: ConfigValue | undefined;
            validOptions?: readonly number[] | readonly string[] | undefined;
            validate?: ((v: unknown) => boolean) | ((v: unknown) => v is ValidValue<ConfigType, boolean>) | undefined;
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