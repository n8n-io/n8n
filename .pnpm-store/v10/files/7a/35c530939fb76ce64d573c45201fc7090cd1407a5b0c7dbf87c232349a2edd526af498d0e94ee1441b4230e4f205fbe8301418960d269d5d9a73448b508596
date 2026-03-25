import { Command } from '../command';
import { AlphabetLowercase, AlphabetUppercase } from './alphabet';
export type FlagOutput = {
    [name: string]: any;
};
export type ArgOutput = {
    [name: string]: any;
};
export type CLIParseErrorOptions = {
    parse: {
        input?: ParserInput | undefined;
        output?: ParserOutput | undefined;
    };
    exit?: number | undefined;
};
export type OutputArgs<T extends ParserInput['args']> = {
    [P in keyof T]: any;
};
export type OutputFlags<T extends ParserInput['flags']> = {
    [P in keyof T]: any;
};
export type ParserOutput<TFlags extends OutputFlags<any> = any, BFlags extends OutputFlags<any> = any, TArgs extends OutputFlags<any> = any> = {
    flags: TFlags & BFlags & {
        json: boolean | undefined;
    };
    args: TArgs;
    argv: unknown[];
    raw: ParsingToken[];
    metadata: Metadata;
    nonExistentFlags: string[];
};
export type ArgToken = {
    type: 'arg';
    arg: string;
    input: string;
};
export type FlagToken = {
    type: 'flag';
    flag: string;
    input: string;
};
export type ParsingToken = ArgToken | FlagToken;
export type FlagUsageOptions = {
    displayRequired?: boolean;
};
export type Metadata = {
    flags: {
        [key: string]: MetadataFlag;
    };
};
export type MetadataFlag = {
    setFromDefault?: boolean;
    defaultHelp?: unknown;
};
export type ListItem = [string, string | undefined];
export type List = ListItem[];
export type CustomOptions = Record<string, unknown>;
export type DefaultContext<T> = {
    options: T;
    flags: Record<string, string>;
};
/**
 * Type to define a default value for a flag.
 * @param context The context of the flag.
 */
export type FlagDefault<T, P = CustomOptions> = T | ((context: DefaultContext<P & OptionFlag<T, P>>) => Promise<T>);
/**
 * Type to define a defaultHelp value for a flag.
 * The defaultHelp value is used in the help output for the flag and when writing a manifest.
 * It is also can be used to provide a value for the flag when issuing certain error messages.
 *
 * @param context The context of the flag.
 */
export type FlagDefaultHelp<T, P = CustomOptions> = T | ((context: DefaultContext<P & OptionFlag<T, P>>) => Promise<string | undefined>);
/**
 * Type to define a default value for an arg.
 * @param context The context of the arg.
 */
export type ArgDefault<T, P = CustomOptions> = T | ((context: DefaultContext<Arg<T, P>>) => Promise<T>);
/**
 * Type to define a defaultHelp value for an arg.
 * @param context The context of the arg.
 */
export type ArgDefaultHelp<T, P = CustomOptions> = T | ((context: DefaultContext<Arg<T, P>>) => Promise<string | undefined>);
export type FlagRelationship = string | {
    name: string;
    when: (flags: Record<string, unknown>) => Promise<boolean>;
};
export type Relationship = {
    type: 'all' | 'some' | 'none';
    flags: FlagRelationship[];
};
export type Deprecation = {
    to?: string;
    message?: string;
    version?: string | number;
};
export type FlagProps = {
    name: string;
    char?: AlphabetLowercase | AlphabetUppercase;
    /**
     * A short summary of flag usage to show in the flag list.
     * If not provided, description will be used.
     */
    summary?: string;
    /**
     * A description of flag usage. If summary is provided, the description
     * is assumed to be a longer description and will be shown in a separate
     * section within help.
     */
    description?: string;
    /**
     * The flag label to show in help. Defaults to "[-<char>] --<name>" where -<char> is
     * only displayed if the char is defined.
     */
    helpLabel?: string;
    /**
     * Shows this flag in a separate list in the help.
     */
    helpGroup?: string;
    /**
     * Accept an environment variable as input
     */
    env?: string;
    /**
     * If true, the flag will not be shown in the help.
     */
    hidden?: boolean;
    /**
     * If true, the flag will be required.
     */
    required?: boolean;
    /**
     * List of flags that this flag depends on.
     */
    dependsOn?: string[];
    /**
     * List of flags that cannot be used with this flag.
     */
    exclusive?: string[];
    /**
     * Exactly one of these flags must be provided.
     */
    exactlyOne?: string[];
    /**
     * Define complex relationships between flags.
     */
    relationships?: Relationship[];
    /**
     * Make the flag as deprecated.
     */
    deprecated?: true | Deprecation;
    /**
     * Alternate names that can be used for this flag.
     */
    aliases?: string[];
    /**
     * Alternate short chars that can be used for this flag.
     */
    charAliases?: (AlphabetLowercase | AlphabetUppercase)[];
    /**
     * Emit deprecation warning when a flag alias is provided
     */
    deprecateAliases?: boolean;
    /**
     * If true, the value returned by defaultHelp will not be cached in the oclif.manifest.json.
     * This is helpful if the default value contains sensitive data that shouldn't be published to npm.
     */
    noCacheDefault?: boolean;
};
export type ArgProps = {
    name: string;
    /**
     * A description of flag usage. If summary is provided, the description
     * is assumed to be a longer description and will be shown in a separate
     * section within help.
     */
    description?: string;
    /**
     * If true, the flag will not be shown in the help.
     */
    hidden?: boolean;
    /**
     * If true, the flag will be required.
     */
    required?: boolean;
    options?: string[];
    ignoreStdin?: boolean;
    /**
     * If true, the value returned by defaultHelp will not be cached in the oclif.manifest.json.
     * This is helpful if the default value contains sensitive data that shouldn't be published to npm.
     */
    noCacheDefault?: boolean;
};
export type BooleanFlagProps = FlagProps & {
    type: 'boolean';
    allowNo: boolean;
};
export type OptionFlagProps = FlagProps & {
    type: 'option';
    helpValue?: string | string[];
    options?: readonly string[];
    multiple?: boolean;
    /**
     * Parse one value per flag; allow `-m val1 -m val2`, disallow `-m val1 val2`.
     * Set to true to use "multiple: true" flags together with args.
     * Only respected if multiple is set to true.
     */
    multipleNonGreedy?: boolean;
    /**
     * Delimiter to separate the values for a multiple value flag.
     * Only respected if multiple is set to true. Default behavior is to
     * separate on spaces.
     */
    delimiter?: ',';
    /**
     * Allow input value to be read from stdin if the provided value is `-`.
     * If set to `only`, the flag will only accept input from stdin.
     * Should only be used on one flag at a time.
     */
    allowStdin?: boolean | 'only';
};
export type FlagParserContext = Command & {
    token: FlagToken;
};
type NonNullableElementOf<T> = [NonNullable<T>] extends [Array<infer U>] ? U : T;
export type FlagParser<T, I extends string | boolean, P = CustomOptions> = (input: I, context: FlagParserContext, opts: P & OptionFlag<T, P>) => Promise<NonNullableElementOf<T> | undefined>;
export type ArgParserContext = Command & {
    token: ArgToken;
};
export type ArgParser<T, P = CustomOptions> = (input: string, context: ArgParserContext, opts: P & Arg<T, P>) => Promise<T>;
export type Arg<T, P = CustomOptions> = ArgProps & {
    options?: T[];
    defaultHelp?: ArgDefaultHelp<T>;
    input: string[];
    default?: ArgDefault<T | undefined>;
    parse: ArgParser<T, P>;
};
export type ArgDefinition<T, P = CustomOptions> = {
    (options: P & ({
        required: true;
    } | {
        default: ArgDefault<T>;
    }) & Partial<Arg<T, P>>): Arg<T, P>;
    (options?: P & Partial<Arg<T, P>>): Arg<T | undefined, P>;
};
export type BooleanFlag<T> = FlagProps & BooleanFlagProps & {
    /**
     * specifying a default of false is the same as not specifying a default
     */
    default?: FlagDefault<boolean>;
    parse: (input: boolean, context: FlagParserContext, opts: FlagProps & BooleanFlagProps) => Promise<T>;
};
export type OptionFlag<T, P = CustomOptions> = FlagProps & OptionFlagProps & {
    parse: FlagParser<T | undefined, string, P>;
    defaultHelp?: FlagDefaultHelp<T, P>;
    input: string[];
    default?: FlagDefault<T | undefined, P>;
};
type ReturnTypeSwitches = {
    multiple: boolean;
    requiredOrDefaulted: boolean;
};
/**
 * The logic here is as follows:
 * - If requiredOrDefaulted is true && multiple is true, then the return type is T[]
 *    - It's possible that T extends an Array, if so we want to return T so that the return isn't T[][]
 * - If requiredOrDefaulted is true && multiple is false, then the return type is T
 * - If requiredOrDefaulted is false && multiple is true, then the return type is T[] | undefined
 *    - It's possible that T extends an Array, if so we want to return T so that the return isn't T[][]
 * - If requiredOrDefaulted is false && multiple is false, then the return type is T | undefined
 */
type FlagReturnType<T, R extends ReturnTypeSwitches> = R['requiredOrDefaulted'] extends true ? R['multiple'] extends true ? [T] extends [Array<unknown>] ? T : T[] : T : R['multiple'] extends true ? [T] extends [Array<unknown>] ? T | undefined : T[] | undefined : T | undefined;
/**
 * FlagDefinition types a function that takes `options` and returns an OptionFlag<T>.
 *
 * This is returned by `Flags.custom()` and `Flags.option()`, which each take a `defaults` object
 * that mirrors the OptionFlag interface.
 *
 * The `T` in the `OptionFlag<T>` return type is determined by a combination of the provided defaults for
 * `multiple`, `required`, and `default` and the provided options for those same properties. If these properties
 * are provided in the options, they override the defaults.
 *
 * no options or defaults -> T | undefined
 * `required` -> T
 * `default` -> T
 * `multiple` -> T[] | undefined
 * `required` + `multiple` -> T[]
 * `default` + `multiple` -> T[]
 */
export type FlagDefinition<T, P = CustomOptions, R extends ReturnTypeSwitches = {
    multiple: false;
    requiredOrDefaulted: false;
}> = {
    (options: P & {
        multiple: false;
        required: true;
    } & Partial<OptionFlag<FlagReturnType<T, {
        multiple: false;
        requiredOrDefaulted: true;
    }>, P>>): OptionFlag<FlagReturnType<T, {
        multiple: false;
        requiredOrDefaulted: true;
    }>>;
    (options: P & {
        multiple: true;
        required: false;
    } & Partial<OptionFlag<FlagReturnType<T, {
        multiple: true;
        requiredOrDefaulted: false;
    }>, P>>): OptionFlag<FlagReturnType<T, {
        multiple: true;
        requiredOrDefaulted: false;
    }>>;
    (options: P & {
        multiple: false;
        required: false;
    } & Partial<OptionFlag<FlagReturnType<T, {
        multiple: false;
        requiredOrDefaulted: false;
    }>, P>>): OptionFlag<FlagReturnType<T, {
        multiple: false;
        requiredOrDefaulted: false;
    }>>;
    (options: R['multiple'] extends true ? // `multiple` is defaulted to true and either `required=true` or `default` are provided in options
    P & ({
        required: true;
    } | {
        default: OptionFlag<FlagReturnType<T, {
            multiple: R['multiple'];
            requiredOrDefaulted: true;
        }>, P>['default'];
    }) & Partial<OptionFlag<FlagReturnType<T, {
        multiple: R['multiple'];
        requiredOrDefaulted: true;
    }>, P>> : // `multiple` is NOT defaulted to true and either `required=true` or `default` are provided in options
    P & {
        multiple?: false | undefined;
    } & ({
        required: true;
    } | {
        default: OptionFlag<FlagReturnType<T, {
            multiple: R['multiple'];
            requiredOrDefaulted: true;
        }>, P>['default'];
    }) & Partial<OptionFlag<FlagReturnType<T, {
        multiple: R['multiple'];
        requiredOrDefaulted: true;
    }>, P>>): OptionFlag<FlagReturnType<T, {
        multiple: R['multiple'];
        requiredOrDefaulted: true;
    }>>;
    (options: R['multiple'] extends true ? // `multiple` is defaulted to true and either `required=true` or `default` are provided in options
    P & ({
        required: true;
    } | {
        default: OptionFlag<FlagReturnType<T, {
            multiple: true;
            requiredOrDefaulted: true;
        }>, P>['default'];
    }) & Partial<OptionFlag<FlagReturnType<T, {
        multiple: true;
        requiredOrDefaulted: true;
    }>, P>> : // `multiple` is NOT defaulted to true but `multiple=true` and either `required=true` or `default` are provided in options
    P & {
        multiple: true;
    } & ({
        required: true;
    } | {
        default: OptionFlag<FlagReturnType<T, {
            multiple: true;
            requiredOrDefaulted: true;
        }>, P>['default'];
    }) & Partial<OptionFlag<FlagReturnType<T, {
        multiple: true;
        requiredOrDefaulted: true;
    }>, P>>): OptionFlag<FlagReturnType<T, {
        multiple: true;
        requiredOrDefaulted: true;
    }>>;
    (options: P & {
        multiple?: false | undefined;
    } & ({
        required: true;
    } | {
        default: OptionFlag<FlagReturnType<T, {
            multiple: R['multiple'];
            requiredOrDefaulted: true;
        }>, P>['default'];
    }) & Partial<OptionFlag<FlagReturnType<T, {
        multiple: R['multiple'];
        requiredOrDefaulted: true;
    }>, P>>): OptionFlag<FlagReturnType<T, {
        multiple: R['multiple'];
        requiredOrDefaulted: true;
    }>>;
    (options: P & {
        required: false;
    } & Partial<OptionFlag<FlagReturnType<T, {
        multiple: R['multiple'];
        requiredOrDefaulted: false;
    }>, P>>): OptionFlag<FlagReturnType<T, {
        multiple: R['multiple'];
        requiredOrDefaulted: false;
    }>>;
    (options: P & {
        multiple: false;
    } & Partial<OptionFlag<FlagReturnType<T, {
        multiple: false;
        requiredOrDefaulted: R['requiredOrDefaulted'];
    }>, P>>): OptionFlag<FlagReturnType<T, {
        multiple: false;
        requiredOrDefaulted: R['requiredOrDefaulted'];
    }>>;
    (options?: P & {
        multiple?: false | undefined;
    } & Partial<OptionFlag<FlagReturnType<T, R>, P>>): OptionFlag<FlagReturnType<T, R>>;
    (options: P & {
        multiple: true;
    } & Partial<OptionFlag<FlagReturnType<T, {
        multiple: true;
        requiredOrDefaulted: R['requiredOrDefaulted'];
    }>, P>>): OptionFlag<FlagReturnType<T, {
        multiple: true;
        requiredOrDefaulted: R['requiredOrDefaulted'];
    }>>;
};
export type Flag<T> = BooleanFlag<T> | OptionFlag<T>;
export type Input<TFlags extends FlagOutput, BFlags extends FlagOutput, AFlags extends ArgOutput> = {
    flags?: FlagInput<TFlags>;
    baseFlags?: FlagInput<BFlags>;
    enableJsonFlag?: true | false;
    args?: ArgInput<AFlags>;
    strict?: boolean | undefined;
    context?: ParserContext;
    '--'?: boolean;
};
export type ParserInput = {
    argv: string[];
    flags: FlagInput<any>;
    args: ArgInput<any>;
    strict: boolean;
    context: ParserContext | undefined;
    '--'?: boolean | undefined;
};
export type ParserContext = Command & {
    token?: FlagToken | ArgToken | undefined;
};
export type FlagInput<T extends FlagOutput = {
    [flag: string]: any;
}> = {
    [P in keyof T]: Flag<T[P]>;
};
export type ArgInput<T extends ArgOutput = {
    [arg: string]: any;
}> = {
    [P in keyof T]: Arg<T[P]>;
};
export {};
