import { EventEmitter } from 'events';
export declare class TscWatchClient extends EventEmitter {
    private tscWatchPath;
    private tsc;
    constructor(tscWatchPath?: string);
    start(...args: string[]): void;
    kill(): void;
    runOnCompilationStartedCommand(): void;
    runOnCompilationCompleteCommand(): void;
    runOnFirstSuccessCommand(): void;
    runOnFailureCommand(): void;
    runOnSuccessCommand(): void;
    runOnEmitCommand(): void;
}
