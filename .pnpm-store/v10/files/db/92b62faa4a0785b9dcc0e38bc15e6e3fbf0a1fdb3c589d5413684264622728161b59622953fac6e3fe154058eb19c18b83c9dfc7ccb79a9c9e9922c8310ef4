import { Debugger } from 'debug';
type OutputLoggingHandler = (message: string, ...args: any[]) => void;
export interface OutputLogger extends OutputLoggingHandler {
    readonly label: string;
    info: OutputLoggingHandler;
    step(nextStep?: string): OutputLogger;
    sibling(name: string): OutputLogger;
}
export declare function createLogger(label: string, verbose?: string | Debugger, initialStep?: string, infoDebugger?: Debugger): OutputLogger;
/**
 * The `GitLogger` is used by the main `SimpleGit` runner to handle logging
 * any warnings or errors.
 */
export declare class GitLogger {
    private _out;
    error: OutputLoggingHandler;
    warn: OutputLoggingHandler;
    constructor(_out?: Debugger);
    silent(silence?: boolean): void;
}
export {};
