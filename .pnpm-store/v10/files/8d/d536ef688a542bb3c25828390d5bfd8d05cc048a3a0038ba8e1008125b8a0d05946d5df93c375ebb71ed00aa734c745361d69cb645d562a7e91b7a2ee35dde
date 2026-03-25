import { CommandLineAction } from './CommandLineAction';
import type { ICommandLineParserData, IRegisterDefinedParametersState } from './CommandLineParameterProvider';
import type { ICommandLineParserOptions } from './CommandLineParser';
/**
 * Options for the AliasCommandLineAction constructor.
 * @public
 */
export interface IAliasCommandLineActionOptions {
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
    /** @internal */
    _registerDefinedParameters(state: IRegisterDefinedParametersState): void;
    /**
     * {@inheritdoc CommandLineParameterProvider._processParsedData}
     * @internal
     */
    _processParsedData(parserOptions: ICommandLineParserOptions, data: ICommandLineParserData): void;
    /**
     * Executes the target action.
     */
    protected onExecute(): Promise<void>;
}
//# sourceMappingURL=AliasCommandLineAction.d.ts.map