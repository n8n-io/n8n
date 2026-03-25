import type * as argparse from 'argparse';
import type { CommandLineAction } from './CommandLineAction';
import { CommandLineParameterProvider, type IRegisterDefinedParametersState } from './CommandLineParameterProvider';
/**
 * Options for the {@link CommandLineParser} constructor.
 * @public
 */
export interface ICommandLineParserOptions {
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
    /** @internal */
    _registerDefinedParameters(state: IRegisterDefinedParametersState): void;
    private _validateDefinitions;
    /**
     * {@inheritDoc CommandLineParameterProvider._getArgumentParser}
     * @internal
     */
    protected _getArgumentParser(): argparse.ArgumentParser;
    /**
     * This hook allows the subclass to perform additional operations before or after
     * the chosen action is executed.
     */
    protected onExecute(): Promise<void>;
}
//# sourceMappingURL=CommandLineParser.d.ts.map