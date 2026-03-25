/**
 * An object-oriented command-line parser for TypeScript projects.
 *
 * @packageDocumentation
 */

import * as argparse from 'argparse';

/**
 * Represents a sub-command that is part of the CommandLineParser command line.
 * The sub-command is an alias for another existing action.
 *
 * The alias name should be comprised of lower case words separated by hyphens
 * or colons. The name should include an English verb (e.g. "deploy"). Use a
 * hyphen to separate words (e.g. "upload-docs").
 *
 * @public
 */
export declare class AliasCommandLineAction extends CommandLineAction {
    /**
     * The action that this alias invokes.
     */
    readonly targetAction: CommandLineAction;
    /**
     * A list of default arguments to pass to the target action.
     */
    readonly defaultParameters: ReadonlyArray<string>;
    private _parameterKeyMap;
    constructor(options: IAliasCommandLineActionOptions);
    /* Excluded from this release type: _registerDefinedParameters */
    /* Excluded from this release type: _processParsedData */
    /**
     * Executes the target action.
     */
    protected onExecute(): Promise<void>;
}

/**
 * Represents a sub-command that is part of the CommandLineParser command line.
 * Applications should create subclasses of CommandLineAction corresponding to
 * each action that they want to expose.
 *
 * The action name should be comprised of lower case words separated by hyphens
 * or colons. The name should include an English verb (e.g. "deploy"). Use a
 * hyphen to separate words (e.g. "upload-docs"). A group of related commands
 * can be prefixed with a colon (e.g. "docs:generate", "docs:deploy",
 * "docs:serve", etc).
 *
 * @public
 */
export declare abstract class CommandLineAction extends CommandLineParameterProvider {
    /** {@inheritDoc ICommandLineActionOptions.actionName} */
    readonly actionName: string;
    /** {@inheritDoc ICommandLineActionOptions.summary} */
    readonly summary: string;
    /** {@inheritDoc ICommandLineActionOptions.documentation} */
    readonly documentation: string;
    private _argumentParser;
    constructor(options: ICommandLineActionOptions);
    /* Excluded from this release type: _buildParser */
    /* Excluded from this release type: _executeAsync */
    /* Excluded from this release type: _getArgumentParser */
    /**
     * Your subclass should implement this hook to perform the operation.
     *
     * @remarks
     * In a future release, this function will be renamed to onExecuteAsync
     */
    protected abstract onExecute(): Promise<void>;
}

/**
 * The data type returned by {@link CommandLineParameterProvider.defineChoiceListParameter}.
 * @public
 */
export declare class CommandLineChoiceListParameter<TChoice extends string = string> extends CommandLineParameter {
    /** {@inheritDoc ICommandLineChoiceListDefinition.alternatives} */
    readonly alternatives: ReadonlySet<TChoice>;
    private _values;
    /** {@inheritDoc ICommandLineChoiceListDefinition.completions} */
    readonly completions: (() => Promise<ReadonlyArray<TChoice> | ReadonlySet<TChoice>>) | undefined;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.ChoiceList;
    /* Excluded from this release type: __constructor */
    /* Excluded from this release type: _setValue */
    /**
     * Returns the string arguments for a choice list parameter that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get values(): ReadonlyArray<TChoice>;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}

/**
 * The data type returned by {@link CommandLineParameterProvider.(defineChoiceParameter:1)}.
 * @public
 */
export declare class CommandLineChoiceParameter<TChoice extends string = string> extends CommandLineParameter {
    /** {@inheritDoc ICommandLineChoiceDefinition.alternatives} */
    readonly alternatives: ReadonlySet<TChoice>;
    /** {@inheritDoc ICommandLineStringDefinition.defaultValue} */
    readonly defaultValue: TChoice | undefined;
    private _value;
    /** {@inheritDoc ICommandLineChoiceDefinition.completions} */
    readonly completions: (() => Promise<ReadonlyArray<TChoice> | ReadonlySet<TChoice>>) | undefined;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.Choice;
    /* Excluded from this release type: __constructor */
    /* Excluded from this release type: _setValue */
    /* Excluded from this release type: _getSupplementaryNotes */
    /**
     * Returns the argument value for a choice parameter that was parsed from the command line.
     *
     * @remarks
     * The return value will be `undefined` if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get value(): TChoice | undefined;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}

/**
 * String constants for command line processing.
 *
 * @public
 */
export declare enum CommandLineConstants {
    /**
     * The name of the built-in action that serves suggestions for tab-completion
     */
    TabCompletionActionName = "tab-complete"
}

/**
 * The data type returned by {@link CommandLineParameterProvider.defineFlagParameter}.
 * @public
 */
export declare class CommandLineFlagParameter extends CommandLineParameter {
    private _value;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.Flag;
    /* Excluded from this release type: __constructor */
    /* Excluded from this release type: _setValue */
    /**
     * Returns a boolean indicating whether the parameter was included in the command line.
     *
     * @remarks
     * The return value will be false if the command-line has not been parsed yet,
     * or if the flag was not used.
     */
    get value(): boolean;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}

/**
 * Helpers for working with the ts-command-line API.
 *
 * @public
 */
export declare class CommandLineHelper {
    /**
     * Returns true if the current command line action is tab-complete.
     *
     * @public
     */
    static isTabCompletionActionRequest(argv: string[]): boolean;
}

/**
 * The data type returned by {@link CommandLineParameterProvider.defineIntegerListParameter}.
 * @public
 */
export declare class CommandLineIntegerListParameter extends CommandLineParameterWithArgument {
    private _values;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.IntegerList;
    /* Excluded from this release type: __constructor */
    /* Excluded from this release type: _setValue */
    /**
     * Returns the integer arguments for an integer list parameter that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get values(): ReadonlyArray<number>;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}

/**
 * The data type returned by {@link CommandLineParameterProvider.(defineIntegerParameter:1)}.
 * @public
 */
export declare class CommandLineIntegerParameter extends CommandLineParameterWithArgument {
    /** {@inheritDoc ICommandLineStringDefinition.defaultValue} */
    readonly defaultValue: number | undefined;
    private _value;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.Integer;
    /* Excluded from this release type: __constructor */
    /* Excluded from this release type: _setValue */
    /* Excluded from this release type: _getSupplementaryNotes */
    /**
     * Returns the argument value for an integer parameter that was parsed from the command line.
     *
     * @remarks
     * The return value will be undefined if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get value(): number | undefined;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}

/**
 * The base class for the various command-line parameter types.
 * @public
 */
export declare abstract class CommandLineParameter {
    private _shortNameValue;
    /* Excluded from this release type: _parserKey */
    /* Excluded from this release type: _preParse */
    /* Excluded from this release type: _postParse */
    /* Excluded from this release type: _validateValue */
    /** {@inheritDoc IBaseCommandLineDefinition.parameterLongName} */
    readonly longName: string;
    /**
     * If a parameterScope is provided, returns the scope-prefixed long name of the flag,
     * including double dashes, eg. "--scope:do-something". Otherwise undefined.
     */
    readonly scopedLongName: string | undefined;
    /** {@inheritDoc IBaseCommandLineDefinition.parameterGroup} */
    readonly parameterGroup: string | typeof SCOPING_PARAMETER_GROUP | undefined;
    /** {@inheritDoc IBaseCommandLineDefinition.parameterScope} */
    readonly parameterScope: string | undefined;
    /** {@inheritDoc IBaseCommandLineDefinition.description} */
    readonly description: string;
    /** {@inheritDoc IBaseCommandLineDefinition.required} */
    readonly required: boolean;
    /** {@inheritDoc IBaseCommandLineDefinition.environmentVariable} */
    readonly environmentVariable: string | undefined;
    /** {@inheritDoc IBaseCommandLineDefinition.allowNonStandardEnvironmentVariableNames} */
    readonly allowNonStandardEnvironmentVariableNames: boolean | undefined;
    /** {@inheritDoc IBaseCommandLineDefinition.undocumentedSynonyms } */
    readonly undocumentedSynonyms: string[] | undefined;
    /* Excluded from this release type: __constructor */
    /** {@inheritDoc IBaseCommandLineDefinition.parameterShortName} */
    get shortName(): string | undefined;
    /* Excluded from this release type: _setValue */
    /* Excluded from this release type: _getSupplementaryNotes */
    /**
     * Indicates the type of parameter.
     */
    abstract get kind(): CommandLineParameterKind;
    /**
     * Append the parsed values to the provided string array.
     * @remarks
     * Sometimes a command line parameter is not used directly, but instead gets passed through to another
     * tool that will use it.  For example if our parameter comes in as "--max-count 3", then we might want to
     * call `child_process.spawn()` and append ["--max-count", "3"] to the args array for that tool.
     * appendToArgList() appends zero or more strings to the provided array, based on the input command-line
     * that we parsed.
     *
     * If the parameter was omitted from our command-line and has no default value, then
     * nothing will be appended.  If the short name was used, the long name will be appended instead.
     * @param argList - the parsed strings will be appended to this string array
     */
    abstract appendToArgList(argList: string[]): void;
    /**
     * Internal usage only.  Used to report unexpected output from the argparse library.
     */
    protected reportInvalidData(data: unknown): never;
    protected validateDefaultValue(hasDefaultValue: boolean): void;
}

declare type CommandLineParameter_2 = CommandLineChoiceListParameter | CommandLineChoiceParameter | CommandLineFlagParameter | CommandLineIntegerListParameter | CommandLineIntegerParameter | CommandLineStringListParameter | CommandLineStringParameter;

/**
 * Identifies the kind of a CommandLineParameter.
 * @public
 */
export declare enum CommandLineParameterKind {
    /** Indicates a CommandLineChoiceParameter */
    Choice = 0,
    /** Indicates a CommandLineFlagParameter */
    Flag = 1,
    /** Indicates a CommandLineIntegerParameter */
    Integer = 2,
    /** Indicates a CommandLineStringParameter */
    String = 3,
    /** Indicates a CommandLineStringListParameter */
    StringList = 4,
    /** Indicates a CommandLineChoiceListParameter */
    ChoiceList = 5,
    /** Indicates a CommandLineIntegerListParameter */
    IntegerList = 6
}

/**
 * This is the common base class for CommandLineAction and CommandLineParser
 * that provides functionality for defining command-line parameters.
 *
 * @public
 */
export declare abstract class CommandLineParameterProvider {
    private static _keyCounter;
    /* Excluded from this release type: _ambiguousParameterParserKeysByName */
    /* Excluded from this release type: _registeredParameterParserKeysByName */
    private readonly _parameters;
    private readonly _parametersByLongName;
    private readonly _parametersByShortName;
    private readonly _parameterGroupsByName;
    private _parametersHaveBeenRegistered;
    private _parametersHaveBeenProcessed;
    private _remainder;
    /* Excluded from this release type: __constructor */
    /**
     * Returns a collection of the parameters that were defined for this object.
     */
    get parameters(): ReadonlyArray<CommandLineParameter>;
    /**
     * Informs the caller if the argparse data has been processed into parameters.
     */
    get parametersProcessed(): boolean;
    /**
     * If {@link CommandLineParameterProvider.defineCommandLineRemainder} was called,
     * this object captures any remaining command line arguments after the recognized portion.
     */
    get remainder(): CommandLineRemainder | undefined;
    /**
     * Defines a command-line parameter whose value must be a string from a fixed set of
     * allowable choices (similar to an enum).
     *
     * @remarks
     * Example of a choice parameter:
     * ```
     * example-tool --log-level warn
     * ```
     */
    defineChoiceParameter<TChoice extends string = string>(definition: ICommandLineChoiceDefinition<TChoice> & {
        required: false | undefined;
        defaultValue: undefined;
    }): CommandLineChoiceParameter<TChoice>;
    /**
     * {@inheritdoc CommandLineParameterProvider.(defineChoiceParameter:1)}
     */
    defineChoiceParameter<TChoice extends string = string>(definition: ICommandLineChoiceDefinition<TChoice> & {
        required: true;
    }): IRequiredCommandLineChoiceParameter<TChoice>;
    /**
     * {@inheritdoc CommandLineParameterProvider.(defineChoiceParameter:1)}
     */
    defineChoiceParameter<TChoice extends string = string>(definition: ICommandLineChoiceDefinition<TChoice> & {
        defaultValue: TChoice;
    }): IRequiredCommandLineChoiceParameter<TChoice>;
    /**
     * {@inheritdoc CommandLineParameterProvider.(defineChoiceParameter:1)}
     */
    defineChoiceParameter<TChoice extends string = string>(definition: ICommandLineChoiceDefinition<TChoice>): CommandLineChoiceParameter<TChoice>;
    /**
     * Returns the CommandLineChoiceParameter with the specified long name.
     * @remarks
     * This method throws an exception if the parameter is not defined.
     */
    getChoiceParameter(parameterLongName: string, parameterScope?: string): CommandLineChoiceParameter;
    /**
     * Defines a command-line parameter whose value must be a string from a fixed set of
     * allowable choices (similar to an enum). The parameter can be specified multiple times to
     * build a list.
     *
     * @remarks
     * Example of a choice list parameter:
     * ```
     * example-tool --allow-color red --allow-color green
     * ```
     */
    defineChoiceListParameter<TChoice extends string = string>(definition: ICommandLineChoiceListDefinition<TChoice>): CommandLineChoiceListParameter<TChoice>;
    /**
     * Returns the CommandLineChoiceListParameter with the specified long name.
     * @remarks
     * This method throws an exception if the parameter is not defined.
     */
    getChoiceListParameter(parameterLongName: string, parameterScope?: string): CommandLineChoiceListParameter;
    /**
     * Defines a command-line switch whose boolean value is true if the switch is provided,
     * and false otherwise.
     *
     * @remarks
     * Example usage of a flag parameter:
     * ```
     * example-tool --debug
     * ```
     */
    defineFlagParameter(definition: ICommandLineFlagDefinition): CommandLineFlagParameter;
    /**
     * Returns the CommandLineFlagParameter with the specified long name.
     * @remarks
     * This method throws an exception if the parameter is not defined.
     */
    getFlagParameter(parameterLongName: string, parameterScope?: string): CommandLineFlagParameter;
    /**
     * Defines a command-line parameter whose argument is an integer.
     *
     * @remarks
     * Example usage of an integer parameter:
     * ```
     * example-tool --max-attempts 5
     * ```
     */
    defineIntegerParameter(definition: ICommandLineIntegerDefinition & {
        required: false | undefined;
        defaultValue: undefined;
    }): CommandLineIntegerParameter;
    /**
     * {@inheritdoc CommandLineParameterProvider.(defineIntegerParameter:1)}
     */
    defineIntegerParameter(definition: ICommandLineIntegerDefinition & {
        required: true;
    }): IRequiredCommandLineIntegerParameter;
    /**
     * {@inheritdoc CommandLineParameterProvider.(defineIntegerParameter:1)}
     */
    defineIntegerParameter(definition: ICommandLineIntegerDefinition & {
        defaultValue: number;
    }): IRequiredCommandLineIntegerParameter;
    /**
     * {@inheritdoc CommandLineParameterProvider.(defineIntegerParameter:1)}
     */
    defineIntegerParameter(definition: ICommandLineIntegerDefinition): CommandLineIntegerParameter;
    /**
     * Returns the CommandLineIntegerParameter with the specified long name.
     * @remarks
     * This method throws an exception if the parameter is not defined.
     */
    getIntegerParameter(parameterLongName: string, parameterScope?: string): CommandLineIntegerParameter;
    /**
     * Defines a command-line parameter whose argument is an integer. The parameter can be specified
     * multiple times to build a list.
     *
     * @remarks
     * Example usage of an integer list parameter:
     * ```
     * example-tool --avoid 4 --avoid 13
     * ```
     */
    defineIntegerListParameter(definition: ICommandLineIntegerListDefinition): CommandLineIntegerListParameter;
    /**
     * Returns the CommandLineIntegerParameter with the specified long name.
     * @remarks
     * This method throws an exception if the parameter is not defined.
     */
    getIntegerListParameter(parameterLongName: string, parameterScope?: string): CommandLineIntegerListParameter;
    /**
     * Defines a command-line parameter whose argument is a single text string.
     *
     * @remarks
     * Example usage of a string parameter:
     * ```
     * example-tool --message "Hello, world!"
     * ```
     */
    defineStringParameter(definition: ICommandLineStringDefinition & {
        required: false | undefined;
        defaultValue: undefined;
    }): CommandLineStringParameter;
    /**
     * {@inheritdoc CommandLineParameterProvider.(defineStringParameter:1)}
     */
    defineStringParameter(definition: ICommandLineStringDefinition & {
        required: true;
    }): IRequiredCommandLineStringParameter;
    /**
     * {@inheritdoc CommandLineParameterProvider.(defineStringParameter:1)}
     */
    defineStringParameter(definition: ICommandLineStringDefinition & {
        defaultValue: string;
    }): IRequiredCommandLineStringParameter;
    /**
     * {@inheritdoc CommandLineParameterProvider.(defineStringParameter:1)}
     */
    defineStringParameter(definition: ICommandLineStringDefinition): CommandLineStringParameter;
    /**
     * Returns the CommandLineStringParameter with the specified long name.
     * @remarks
     * This method throws an exception if the parameter is not defined.
     */
    getStringParameter(parameterLongName: string, parameterScope?: string): CommandLineStringParameter;
    /**
     * Defines a command-line parameter whose argument is a single text string.  The parameter can be
     * specified multiple times to build a list.
     *
     * @remarks
     * Example usage of a string list parameter:
     * ```
     * example-tool --add file1.txt --add file2.txt --add file3.txt
     * ```
     */
    defineStringListParameter(definition: ICommandLineStringListDefinition): CommandLineStringListParameter;
    /**
     * Defines a rule that captures any remaining command line arguments after the recognized portion.
     *
     * @remarks
     * This feature is useful for commands that pass their arguments along to an external tool, relying on
     * that tool to perform validation.  (It could also be used to parse parameters without any validation
     * or documentation, but that is not recommended.)
     *
     * Example of capturing the remainder after an optional flag parameter.
     * ```
     * example-tool --my-flag this is the remainder
     * ```
     *
     * In the "--help" documentation, the remainder rule will be represented as "...".
     */
    defineCommandLineRemainder(definition: ICommandLineRemainderDefinition): CommandLineRemainder;
    /**
     * Returns the CommandLineStringListParameter with the specified long name.
     * @remarks
     * This method throws an exception if the parameter is not defined.
     */
    getStringListParameter(parameterLongName: string, parameterScope?: string): CommandLineStringListParameter;
    /**
     * Generates the command-line help text.
     */
    renderHelpText(): string;
    /**
     * Generates the command-line usage text.
     */
    renderUsageText(): string;
    /**
     * Returns a object which maps the long name of each parameter in this.parameters
     * to the stringified form of its value. This is useful for logging telemetry, but
     * it is not the proper way of accessing parameters or their values.
     */
    getParameterStringMap(): Record<string, string>;
    /**
     * Returns an object with the parsed scope (if present) and the long name of the parameter.
     */
    parseScopedLongName(scopedLongName: string): IScopedLongNameParseResult;
    /* Excluded from this release type: _registerDefinedParameters */
    /**
     * @deprecated - Define parameters in the constructor
     */
    protected onDefineParameters?(): void;
    /* Excluded from this release type: _getArgumentParser */
    /* Excluded from this release type: _preParse */
    /* Excluded from this release type: _postParse */
    /* Excluded from this release type: _processParsedData */
    /* Excluded from this release type: _defineParameter */
    /* Excluded from this release type: _defineAmbiguousParameter */
    /* Excluded from this release type: _registerParameter */
    protected _registerAmbiguousParameter(name: string, parserKey: string): void;
    private _generateKey;
    private _getParameter;
    private _throwParserExitError;
}

/**
 * The common base class for parameters types that receive an argument.
 *
 * @remarks
 * An argument is an accompanying command-line token, such as "123" in the
 * example "--max-count 123".
 * @public
 */
export declare abstract class CommandLineParameterWithArgument extends CommandLineParameter {
    private static _invalidArgumentNameRegExp;
    /** {@inheritDoc IBaseCommandLineDefinitionWithArgument.argumentName} */
    readonly argumentName: string;
    /** {@inheritDoc IBaseCommandLineDefinitionWithArgument.completions} */
    readonly completions: (() => Promise<ReadonlyArray<string> | ReadonlySet<string>>) | undefined;
    /* Excluded from this release type: __constructor */
}

/**
 * The "argparse" library is a relatively advanced command-line parser with features such
 * as word-wrapping and intelligible error messages (that are lacking in other similar
 * libraries such as commander, yargs, and nomnom).  Unfortunately, its ruby-inspired API
 * is awkward to use.  The abstract base classes CommandLineParser and CommandLineAction
 * provide a wrapper for "argparse" that makes defining and consuming arguments quick
 * and simple, and enforces that appropriate documentation is provided for each parameter.
 *
 * @public
 */
export declare abstract class CommandLineParser extends CommandLineParameterProvider {
    /**
     * Reports which CommandLineAction was specified on the command line.
     * @remarks
     * The value will be assigned before onExecute() is invoked.
     */
    selectedAction: CommandLineAction | undefined;
    private readonly _argumentParser;
    private _actionsSubParser;
    private readonly _options;
    private readonly _actions;
    private readonly _actionsByName;
    private _executed;
    private _tabCompleteActionWasAdded;
    constructor(options: ICommandLineParserOptions);
    /**
     * Returns the list of actions that were defined for this CommandLineParser object.
     */
    get actions(): ReadonlyArray<CommandLineAction>;
    /**
     * Defines a new action that can be used with the CommandLineParser instance.
     */
    addAction(action: CommandLineAction): void;
    /**
     * Retrieves the action with the specified name.  If no matching action is found,
     * an exception is thrown.
     */
    getAction(actionName: string): CommandLineAction;
    /**
     * Retrieves the action with the specified name.  If no matching action is found,
     * undefined is returned.
     */
    tryGetAction(actionName: string): CommandLineAction | undefined;
    /**
     * The program entry point will call this method to begin parsing command-line arguments
     * and executing the corresponding action.
     *
     * @remarks
     * The returned promise will never reject:  If an error occurs, it will be printed
     * to stderr, process.exitCode will be set to 1, and the promise will resolve to false.
     * This simplifies the most common usage scenario where the program entry point doesn't
     * want to be involved with the command-line logic, and will discard the promise without
     * a then() or catch() block.
     *
     * If your caller wants to trap and handle errors, use {@link CommandLineParser.executeWithoutErrorHandlingAsync}
     * instead.
     *
     * @param args - the command-line arguments to be parsed; if omitted, then
     *               the process.argv will be used
     */
    executeAsync(args?: string[]): Promise<boolean>;
    /**
     * @deprecated Use {@link CommandLineParser.executeAsync} instead.
     */
    execute(args?: string[]): Promise<boolean>;
    /**
     * This is similar to {@link CommandLineParser.executeAsync}, except that execution errors
     * simply cause the promise to reject.  It is the caller's responsibility to trap
     */
    executeWithoutErrorHandlingAsync(args?: string[]): Promise<void>;
    /**
     * @deprecated Use {@link CommandLineParser.executeWithoutErrorHandlingAsync} instead.
     */
    executeWithoutErrorHandling(args?: string[]): Promise<void>;
    /* Excluded from this release type: _registerDefinedParameters */
    private _validateDefinitions;
    /* Excluded from this release type: _getArgumentParser */
    /**
     * This hook allows the subclass to perform additional operations before or after
     * the chosen action is executed.
     */
    protected onExecute(): Promise<void>;
}

/**
 * The data type returned by {@link CommandLineParameterProvider.defineCommandLineRemainder}.
 * @public
 */
export declare class CommandLineRemainder {
    private _values;
    /** {@inheritDoc IBaseCommandLineDefinition.description} */
    readonly description: string;
    /* Excluded from this release type: __constructor */
    /**
     * Returns any remaining command line arguments after the recognized portion
     * that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet.
     */
    get values(): ReadonlyArray<string>;
    /* Excluded from this release type: _setValue */
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}

/**
 * The data type returned by {@link CommandLineParameterProvider.defineStringListParameter}.
 * @public
 */
export declare class CommandLineStringListParameter extends CommandLineParameterWithArgument {
    private _values;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.StringList;
    /* Excluded from this release type: __constructor */
    /* Excluded from this release type: _setValue */
    /**
     * Returns the string arguments for a string list parameter that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get values(): ReadonlyArray<string>;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}

/**
 * The data type returned by {@link CommandLineParameterProvider.(defineStringParameter:1)}.
 * @public
 */
export declare class CommandLineStringParameter extends CommandLineParameterWithArgument {
    /** {@inheritDoc ICommandLineStringDefinition.defaultValue} */
    readonly defaultValue: string | undefined;
    private _value;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.String;
    /* Excluded from this release type: __constructor */
    /* Excluded from this release type: _setValue */
    /* Excluded from this release type: _getSupplementaryNotes */
    /**
     * Returns the argument value for a string parameter that was parsed from the command line.
     *
     * @remarks
     * The return value will be undefined if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get value(): string | undefined;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}

/**
 * @public
 */
export declare class DynamicCommandLineAction extends CommandLineAction {
    protected onExecute(): Promise<void>;
}

/**
 * @public
 */
export declare class DynamicCommandLineParser extends CommandLineParser {
}

/**
 * Options for the AliasCommandLineAction constructor.
 * @public
 */
export declare interface IAliasCommandLineActionOptions {
    /**
     * The name of your tool when invoked from the command line. Used for generating help text.
     */
    toolFilename: string;
    /**
     * The name of the alias.  For example, if the tool is called "example",
     * then the "build" alias might be invoked as: "example build -q --some-other-option"
     */
    aliasName: string;
    /**
     * A list of default parameters to pass to the target action.
     */
    defaultParameters?: string[];
    /**
     * The action that this alias invokes.
     */
    targetAction: CommandLineAction;
}

/**
 * For use with CommandLineParser, this interface represents a generic command-line parameter
 *
 * @public
 */
export declare interface IBaseCommandLineDefinition {
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
export declare interface IBaseCommandLineDefinitionWithArgument extends IBaseCommandLineDefinition {
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
 * Options for the CommandLineAction constructor.
 * @public
 */
export declare interface ICommandLineActionOptions {
    /**
     * The name of the action.  For example, if the tool is called "example",
     * then the "build" action might be invoked as: "example build -q --some-other-option"
     */
    actionName: string;
    /**
     * A quick summary that is shown on the main help page, which is displayed
     * by the command "example --help"
     */
    summary: string;
    /**
     * A detailed description that is shown on the action help page, which is displayed
     * by the command "example build --help", e.g. for actionName="build".
     */
    documentation: string;
}

/**
 * For use with {@link CommandLineParameterProvider.(defineChoiceParameter:1)} and
 * {@link CommandLineParameterProvider.(defineChoiceParameter:2)}, this interface
 * defines a command line parameter which is constrained to a list of possible
 * options.
 *
 * @public
 */
export declare interface ICommandLineChoiceDefinition<TChoice extends string = string> extends IBaseCommandLineDefinition {
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
export declare interface ICommandLineChoiceListDefinition<TChoice extends string = string> extends IBaseCommandLineDefinition {
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
export declare interface ICommandLineFlagDefinition extends IBaseCommandLineDefinition {
}

/**
 * For use with {@link CommandLineParameterProvider.(defineIntegerParameter:1)},
 * {@link CommandLineParameterProvider.(defineIntegerParameter:2)}, this interface
 * defines a command line parameter whose argument is an integer value.
 *
 * @public
 */
export declare interface ICommandLineIntegerDefinition extends IBaseCommandLineDefinitionWithArgument {
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
export declare interface ICommandLineIntegerListDefinition extends IBaseCommandLineDefinitionWithArgument {
}

/* Excluded from this release type: _ICommandLineParserData */

/**
 * Options for the {@link CommandLineParser} constructor.
 * @public
 */
export declare interface ICommandLineParserOptions {
    /**
     * The name of your tool when invoked from the command line
     */
    toolFilename: string;
    /**
     * General documentation that is included in the "--help" main page
     */
    toolDescription: string;
    /**
     * An optional string to append at the end of the "--help" main page. If not provided, an epilog
     * will be automatically generated based on the toolFilename.
     */
    toolEpilog?: string;
    /**
     * Set to true to auto-define a tab completion action. False by default.
     */
    enableTabCompletionAction?: boolean;
}

/**
 * For use with {@link CommandLineParameterProvider.defineCommandLineRemainder},
 * this interface defines a rule that captures any remaining command line arguments after the recognized portion.
 *
 * @public
 */
export declare interface ICommandLineRemainderDefinition {
    /**
     * Documentation for how the remaining arguments will be used.  This will be shown when invoking
     * the tool with "--help".
     */
    description: string;
}

/**
 * For use with {@link CommandLineParameterProvider.(defineStringParameter:1)} and
 * {@link CommandLineParameterProvider.(defineStringParameter:2)}, this interface
 * defines a command line parameter whose argument is a string value.
 *
 * @public
 */
export declare interface ICommandLineStringDefinition extends IBaseCommandLineDefinitionWithArgument {
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
export declare interface ICommandLineStringListDefinition extends IBaseCommandLineDefinitionWithArgument {
}

/* Excluded from this release type: _IRegisterDefinedParametersState */

/**
 * The data type returned by {@link CommandLineParameterProvider.(defineChoiceParameter:2)}.
 * @public
 */
export declare interface IRequiredCommandLineChoiceParameter<TChoice extends string = string> extends CommandLineChoiceParameter<TChoice> {
    readonly value: TChoice;
}

/**
 * The data type returned by {@link CommandLineParameterProvider.(defineIntegerParameter:2)}.
 * @public
 */
export declare interface IRequiredCommandLineIntegerParameter extends CommandLineIntegerParameter {
    readonly value: number;
}

/**
 * The data type returned by {@link CommandLineParameterProvider.(defineStringParameter:2)}.
 * @public
 */
export declare interface IRequiredCommandLineStringParameter extends CommandLineStringParameter {
    readonly value: string;
}

/**
 * The result containing the parsed parameter long name and scope. Returned when calling
 * {@link CommandLineParameterProvider.parseScopedLongName}.
 *
 * @public
 */
export declare interface IScopedLongNameParseResult {
    /**
     * The long name parsed from the scoped long name, e.g. "--my-scope:my-parameter" -\> "--my-parameter"
     */
    longName: string;
    /**
     * The scope parsed from the scoped long name or undefined if no scope was found,
     * e.g. "--my-scope:my-parameter" -\> "my-scope"
     */
    scope: string | undefined;
}

/**
 * Represents a sub-command that is part of the CommandLineParser command-line.
 * Applications should create subclasses of ScopedCommandLineAction corresponding to
 * each action that they want to expose.
 *
 * The action name should be comprised of lower case words separated by hyphens
 * or colons. The name should include an English verb (e.g. "deploy"). Use a
 * hyphen to separate words (e.g. "upload-docs"). A group of related commands
 * can be prefixed with a colon (e.g. "docs:generate", "docs:deploy",
 * "docs:serve", etc).
 *
 * Scoped commands allow for different parameters to be specified for different
 * provided scoping values. For example, the "scoped-action --scope A" command
 * may allow for different scoped arguments to be specified than the "scoped-action
 * --scope B" command.
 *
 * Scoped arguments are specified after the "--" pseudo-argument. For example,
 * "scoped-action --scope A -- --scopedFoo --scopedBar".
 *
 * @public
 */
export declare abstract class ScopedCommandLineAction extends CommandLineAction {
    private _options;
    private _scopingParameters;
    private _unscopedParserOptions;
    private _scopedCommandLineParser;
    private _subparserState;
    /**
     * The required group name to apply to all scoping parameters. At least one parameter
     * must be defined with this group name.
     */
    static readonly ScopingParameterGroup: typeof SCOPING_PARAMETER_GROUP;
    constructor(options: ICommandLineActionOptions);
    /**
     * {@inheritDoc CommandLineParameterProvider.parameters}
     *
     * @internalremarks
     * TODO: Replace this type with `CommandLineParameter` in the next major bump.
     */
    get parameters(): ReadonlyArray<CommandLineParameter>;
    /* Excluded from this release type: _processParsedData */
    /* Excluded from this release type: _executeAsync */
    /* Excluded from this release type: _registerDefinedParameters */
    /* Excluded from this release type: _getScopedCommandLineParser */
    /* Excluded from this release type: _defineParameter */
    /**
     * @deprecated - Define parameters in the constructor
     */
    protected onDefineUnscopedParameters?(): void;
    /**
     * The child class should implement this hook to define its scoped command-line
     * parameters, e.g. by calling scopedParameterProvider.defineFlagParameter(). These
     * parameters will only be available if the action is invoked with a scope.
     *
     * @remarks
     * onDefineScopedParameters is called after the unscoped parameters have been parsed.
     * The values they provide can be used to vary the defined scope parameters.
     */
    protected abstract onDefineScopedParameters(scopedParameterProvider: CommandLineParameterProvider): void;
    /**
     * {@inheritDoc CommandLineAction.onExecute}
     */
    protected abstract onExecute(): Promise<void>;
}

declare const SCOPING_PARAMETER_GROUP: unique symbol;

export { }
