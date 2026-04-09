import * as argparse from 'argparse';
import type { ICommandLineChoiceDefinition, ICommandLineChoiceListDefinition, ICommandLineIntegerDefinition, ICommandLineIntegerListDefinition, ICommandLineFlagDefinition, ICommandLineStringDefinition, ICommandLineStringListDefinition, ICommandLineRemainderDefinition } from '../parameters/CommandLineDefinition';
import type { ICommandLineParserOptions } from './CommandLineParser';
import { type CommandLineParameter } from '../parameters/BaseClasses';
import { CommandLineChoiceParameter, type IRequiredCommandLineChoiceParameter } from '../parameters/CommandLineChoiceParameter';
import { CommandLineChoiceListParameter } from '../parameters/CommandLineChoiceListParameter';
import { CommandLineIntegerParameter, type IRequiredCommandLineIntegerParameter } from '../parameters/CommandLineIntegerParameter';
import { CommandLineIntegerListParameter } from '../parameters/CommandLineIntegerListParameter';
import { CommandLineFlagParameter } from '../parameters/CommandLineFlagParameter';
import { CommandLineStringParameter, type IRequiredCommandLineStringParameter } from '../parameters/CommandLineStringParameter';
import { CommandLineStringListParameter } from '../parameters/CommandLineStringListParameter';
import { CommandLineRemainder } from '../parameters/CommandLineRemainder';
/**
 * The result containing the parsed parameter long name and scope. Returned when calling
 * {@link CommandLineParameterProvider.parseScopedLongName}.
 *
 * @public
 */
export interface IScopedLongNameParseResult {
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
 * An object containing the state of the
 *
 * @internal
 */
export interface IRegisterDefinedParametersState {
    /**
     * A set of all defined parameter names registered by parent {@link CommandLineParameterProvider}
     * objects.
     */
    parentParameterNames: Set<string>;
}
/**
 * This is the argparse result data object
 * @internal
 */
export interface ICommandLineParserData {
    action: string;
    aliasAction?: string;
    aliasDocumentation?: string;
    [key: string]: any;
}
/**
 * This is the common base class for CommandLineAction and CommandLineParser
 * that provides functionality for defining command-line parameters.
 *
 * @public
 */
export declare abstract class CommandLineParameterProvider {
    private static _keyCounter;
    /** @internal */
    readonly _ambiguousParameterParserKeysByName: Map<string, string>;
    /** @internal */
    protected readonly _registeredParameterParserKeysByName: Map<string, string>;
    private readonly _parameters;
    private readonly _parametersByLongName;
    private readonly _parametersByShortName;
    private readonly _parameterGroupsByName;
    private _parametersHaveBeenRegistered;
    private _parametersHaveBeenProcessed;
    private _remainder;
    /** @internal */
    constructor();
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
    /** @internal */
    _registerDefinedParameters(state: IRegisterDefinedParametersState): void;
    /**
     * Retrieves the argparse object.
     * @internal
     */
    protected abstract _getArgumentParser(): argparse.ArgumentParser;
    /**
     * This is called internally by {@link CommandLineParser.executeAsync}
     * @internal
     */
    _preParse(): void;
    /**
     * This is called internally by {@link CommandLineParser.executeAsync} before `printUsage` is called
     * @internal
     */
    _postParse(): void;
    /**
     * This is called internally by {@link CommandLineParser.executeAsync}
     * @internal
     */
    _processParsedData(parserOptions: ICommandLineParserOptions, data: ICommandLineParserData): void;
    /** @internal */
    protected _defineParameter(parameter: CommandLineParameter): void;
    /** @internal */
    protected _defineAmbiguousParameter(name: string): string;
    /** @internal */
    protected _registerParameter(parameter: CommandLineParameter, useScopedLongName: boolean, ignoreShortName: boolean): void;
    protected _registerAmbiguousParameter(name: string, parserKey: string): void;
    private _generateKey;
    private _getParameter;
    private _throwParserExitError;
}
//# sourceMappingURL=CommandLineParameterProvider.d.ts.map