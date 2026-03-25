import type { SCOPING_PARAMETER_GROUP } from '../Constants';
/**
 * For use with CommandLineParser, this interface represents a generic command-line parameter
 *
 * @public
 */
export interface IBaseCommandLineDefinition {
    /**
     * The long name of the flag including double dashes, e.g. "--do-something"
     */
    parameterLongName: string;
    /**
     * An optional short name for the flag including the dash, e.g. "-d"
     */
    parameterShortName?: string;
    /**
     * An optional parameter group name, shown when invoking the tool with "--help"
     */
    parameterGroup?: string | typeof SCOPING_PARAMETER_GROUP;
    /**
     * An optional parameter scope name, used to add a scope-prefixed parameter synonym,
     * e.g. "--scope:do-something". Scopes provide additional flexibility for parameters
     * in conflict resolution since when a scope is specified, parameters that have
     * conflicting long names will be defined using only the scope-prefixed name.
     */
    parameterScope?: string;
    /**
     * Documentation for the parameter that will be shown when invoking the tool with "--help"
     */
    description: string;
    /**
     * If true, then an error occurs if the parameter was not included on the command-line.
     */
    required?: boolean;
    /**
     * The name of an environment variable that the parameter value will be read from,
     * if it was omitted from the command-line.  An error will be reported if the
     * environment value cannot be parsed.
     *
     * @remarks
     * The environment variable name must consist only of upper-case letters, numbers,
     * and underscores. It may not start with a number. To disable this validation, set
     * `{@link IBaseCommandLineDefinition.allowNonStandardEnvironmentVariableNames}`
     * to `true`.
     *
     * Syntax notes for environment variable values:
     *
     * - Choice Parameter: The value must match one of the defined choices,
     *   otherwise a validation error is reported.
     *   An empty string causes the environment variable to be ignored.
     *
     * - Flag Parameter: The value must be `1` for true, or `0` for false,
     *   otherwise a validation error is reported.
     *   An empty string causes the environment variable to be ignored.
     *
     * - Integer Parameter: The value must be an integer number,
     *   otherwise a validation error is reported.
     *   An empty string causes the environment variable to be ignored.
     *
     * - String Parameter: Any value is accepted, including an empty string.
     *
     * - String List Parameter: If the string starts with `[` (ignoring whitespace)
     *   then it will be parsed as a JSON array, whose elements must be strings,
     *   numbers, or boolean values.
     *   If the string does not start with `[`, then it behaves like an
     *   ordinary String Parameter:  Any value is accepted, including an empty string.
     */
    environmentVariable?: string;
    /**
     * Allows for the use of environment variable names that do not conform to the standard
     * described by the Shell and Utilities volume of IEEE Std 1003.1-2001. This disables
     * the validation that is performed on the provided
     * {@link IBaseCommandLineDefinition.environmentVariable} value by default.
     *
     * @remarks
     * if this is set to `true`, environment variable discovery will vary based on the
     * platform in use. For example, Windows environment variable names are case-insensitive,
     * while on Linux, environment variable names are case-sensitive. It is recommended that
     * this option be used only when necessary based on environmental constraints.
     */
    allowNonStandardEnvironmentVariableNames?: boolean;
    /**
     * Specifies additional names for this parameter that are accepted but not displayed
     * in the command line help.
     *
     * @remarks
     * This option can be used in cases where a command-line parameter may have been renamed,
     * but the developer doesn't want to break backwards compatibility with systems that may
     * still be using the old name. Only the `parameterLongName` syntax is currently allowed.
     */
    undocumentedSynonyms?: string[];
}
/**
 * The common base interface for parameter types that accept an argument.
 *
 * @remarks
 * An argument is an accompanying command-line token, such as "123" in the
 * example "--max-count 123".
 * @public
 */
export interface IBaseCommandLineDefinitionWithArgument extends IBaseCommandLineDefinition {
    /**
     * The name of the argument, which will be shown in the command-line help.
     *
     * @remarks
     * For example, if the parameter name is '--count" and the argument name is "NUMBER",
     * then the command-line help would display "--count NUMBER".  The argument name must
     * be comprised of upper-case letters, numbers, and underscores.  It should be kept short.
     */
    argumentName: string;
    /**
     * An optional callback that provides a list of custom choices for tab completion.
     * @remarks
     * This option is only used when `ICommandLineParserOptions.enableTabCompletionAction`
     * is enabled.
     *
     * In a future release, this will be renamed to `getCompletionsAsync`
     */
    completions?: () => Promise<ReadonlyArray<string> | ReadonlySet<string>>;
}
/**
 * For use with {@link CommandLineParameterProvider.(defineChoiceParameter:1)} and
 * {@link CommandLineParameterProvider.(defineChoiceParameter:2)}, this interface
 * defines a command line parameter which is constrained to a list of possible
 * options.
 *
 * @public
 */
export interface ICommandLineChoiceDefinition<TChoice extends string = string> extends IBaseCommandLineDefinition {
    /**
     * A list of strings (which contain no spaces), of possible options which can be selected
     */
    alternatives: ReadonlyArray<TChoice> | ReadonlySet<TChoice>;
    /**
     * {@inheritDoc ICommandLineStringDefinition.defaultValue}
     */
    defaultValue?: TChoice;
    /**
     * An optional callback that provides a list of custom choices for tab completion.
     * @remarks
     * This option is only used when `ICommandLineParserOptions.enableTabCompletionAction`
     * is enabled.
     */
    completions?: () => Promise<ReadonlyArray<TChoice> | ReadonlySet<TChoice>>;
}
/**
 * For use with {@link CommandLineParameterProvider.defineChoiceListParameter},
 * this interface defines a command line parameter which is constrained to a list of possible
 * options. The parameter can be specified multiple times to build a list.
 *
 * @public
 */
export interface ICommandLineChoiceListDefinition<TChoice extends string = string> extends IBaseCommandLineDefinition {
    /**
     * A list of strings (which contain no spaces), of possible options which can be selected
     */
    alternatives: ReadonlyArray<TChoice> | ReadonlySet<TChoice>;
    /**
     * An optional callback that provides a list of custom choices for tab completion.
     * @remarks
     * This option is only used when `ICommandLineParserOptions.enableTabCompletionAction`
     * is enabled.
     */
    completions?: () => Promise<ReadonlyArray<TChoice> | ReadonlySet<TChoice>>;
}
/**
 * For use with {@link CommandLineParameterProvider.defineFlagParameter},
 * this interface defines a command line parameter that is a boolean flag.
 *
 * @public
 */
export interface ICommandLineFlagDefinition extends IBaseCommandLineDefinition {
}
/**
 * For use with {@link CommandLineParameterProvider.(defineIntegerParameter:1)},
 * {@link CommandLineParameterProvider.(defineIntegerParameter:2)}, this interface
 * defines a command line parameter whose argument is an integer value.
 *
 * @public
 */
export interface ICommandLineIntegerDefinition extends IBaseCommandLineDefinitionWithArgument {
    /**
     * {@inheritDoc ICommandLineStringDefinition.defaultValue}
     */
    defaultValue?: number;
}
/**
 * For use with {@link CommandLineParameterProvider.defineIntegerListParameter},
 * this interface defines a command line parameter whose argument is an integer value. The
 * parameter can be specified multiple times to build a list.
 *
 * @public
 */
export interface ICommandLineIntegerListDefinition extends IBaseCommandLineDefinitionWithArgument {
}
/**
 * For use with {@link CommandLineParameterProvider.(defineStringParameter:1)} and
 * {@link CommandLineParameterProvider.(defineStringParameter:2)}, this interface
 * defines a command line parameter whose argument is a string value.
 *
 * @public
 */
export interface ICommandLineStringDefinition extends IBaseCommandLineDefinitionWithArgument {
    /**
     * The default value which will be used if the parameter is omitted from the command line.
     *
     * @remarks
     * If a default value is specified, then {@link IBaseCommandLineDefinition.required}
     * must not be true.  Instead, a custom error message should be used to report cases
     * where a default value was not available.
     */
    defaultValue?: string;
}
/**
 * For use with {@link CommandLineParameterProvider.defineStringListParameter},
 * this interface defines a command line parameter whose argument is a single text string.
 * The parameter can be specified multiple times to build a list.
 *
 * @public
 */
export interface ICommandLineStringListDefinition extends IBaseCommandLineDefinitionWithArgument {
}
/**
 * For use with {@link CommandLineParameterProvider.defineCommandLineRemainder},
 * this interface defines a rule that captures any remaining command line arguments after the recognized portion.
 *
 * @public
 */
export interface ICommandLineRemainderDefinition {
    /**
     * Documentation for how the remaining arguments will be used.  This will be shown when invoking
     * the tool with "--help".
     */
    description: string;
}
//# sourceMappingURL=CommandLineDefinition.d.ts.map