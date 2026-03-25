import type * as argparse from 'argparse';
import { CommandLineParameterProvider } from './CommandLineParameterProvider';
/**
 * Options for the CommandLineAction constructor.
 * @public
 */
export interface ICommandLineActionOptions {
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
    /**
     * This is called internally by CommandLineParser.addAction()
     * @internal
     */
    _buildParser(actionsSubParser: argparse.SubParser): void;
    /**
     * Invoked by CommandLineParser.onExecute().
     * @internal
     */
    _executeAsync(): Promise<void>;
    /**
     * {@inheritDoc CommandLineParameterProvider._getArgumentParser}
     * @internal
     */
    _getArgumentParser(): argparse.ArgumentParser;
    /**
     * Your subclass should implement this hook to perform the operation.
     *
     * @remarks
     * In a future release, this function will be renamed to onExecuteAsync
     */
    protected abstract onExecute(): Promise<void>;
}
//# sourceMappingURL=CommandLineAction.d.ts.map