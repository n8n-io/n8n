import { type CommandLineParameterBase } from '../parameters/BaseClasses';
import { CommandLineAction } from './CommandLineAction';
export declare class TabCompleteAction extends CommandLineAction {
    private readonly _wordToCompleteParameter;
    private readonly _positionParameter;
    private readonly _actions;
    private readonly _globalParameters;
    constructor(actions: ReadonlyArray<CommandLineAction>, globalParameters: ReadonlyArray<CommandLineParameterBase>);
    protected onExecuteAsync(): Promise<void>;
    getCompletionsAsync(commandLine: string, caretPosition?: number): AsyncIterable<string>;
    private _getAllActions;
    tokenizeCommandLine(commandLine: string): string[];
    private _getParameterValueCompletionsAsync;
    private _getGlobalParameterOffset;
    private _completeParameterValues;
}
//# sourceMappingURL=TabCompletionAction.d.ts.map