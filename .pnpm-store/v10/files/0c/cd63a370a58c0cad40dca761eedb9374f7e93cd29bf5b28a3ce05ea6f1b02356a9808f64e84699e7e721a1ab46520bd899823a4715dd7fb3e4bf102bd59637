import type { SCOPING_PARAMETER_GROUP } from '../Constants';
import type { IBaseCommandLineDefinition, IBaseCommandLineDefinitionWithArgument } from './CommandLineDefinition';
import type { CommandLineChoiceListParameter } from './CommandLineChoiceListParameter';
import type { CommandLineChoiceParameter } from './CommandLineChoiceParameter';
import type { CommandLineFlagParameter } from './CommandLineFlagParameter';
import type { CommandLineIntegerListParameter } from './CommandLineIntegerListParameter';
import type { CommandLineIntegerParameter } from './CommandLineIntegerParameter';
import type { CommandLineStringListParameter } from './CommandLineStringListParameter';
import type { CommandLineStringParameter } from './CommandLineStringParameter';
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
 * @public
 */
export type CommandLineParameter = CommandLineChoiceListParameter | CommandLineChoiceParameter | CommandLineFlagParameter | CommandLineIntegerListParameter | CommandLineIntegerParameter | CommandLineStringListParameter | CommandLineStringParameter;
/**
 * The base class for the various command-line parameter types.
 * @public
 */
export declare abstract class CommandLineParameterBase {
    private _shortNameValue;
    /**
     * A unique internal key used to retrieve the value from the parser's dictionary.
     * @internal
     */
    _parserKey: string | undefined;
    /**
     * @internal
     */
    _preParse?: () => void;
    /**
     * @internal
     */
    _postParse?: () => void;
    /**
     * @internal
     */
    _validateValue?: () => void;
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
    /** @internal */
    constructor(definition: IBaseCommandLineDefinition);
    /** {@inheritDoc IBaseCommandLineDefinition.parameterShortName} */
    get shortName(): string | undefined;
    /**
     * Called internally by CommandLineParameterProvider._processParsedData()
     * @internal
     */
    abstract _setValue(data: unknown): void;
    /**
     * Returns additional text used by the help formatter.
     * @internal
     */
    _getSupplementaryNotes(supplementaryNotes: string[]): void;
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
/**
 * The common base class for parameters types that receive an argument.
 *
 * @remarks
 * An argument is an accompanying command-line token, such as "123" in the
 * example "--max-count 123".
 * @public
 */
export declare abstract class CommandLineParameterWithArgument extends CommandLineParameterBase {
    private static _invalidArgumentNameRegExp;
    /** {@inheritDoc IBaseCommandLineDefinitionWithArgument.argumentName} */
    readonly argumentName: string;
    /** {@inheritDoc IBaseCommandLineDefinitionWithArgument.getCompletionsAsync} */
    readonly getCompletionsAsync: (() => Promise<ReadonlyArray<string> | ReadonlySet<string>>) | undefined;
    /** @internal */
    constructor(definition: IBaseCommandLineDefinitionWithArgument);
}
//# sourceMappingURL=BaseClasses.d.ts.map