import type { BufferTask, EmptyTaskParser, SimpleGitTask, StringTask } from '../types';
export declare const EMPTY_COMMANDS: [];
export type EmptyTask = {
    commands: typeof EMPTY_COMMANDS;
    format: 'empty';
    parser: EmptyTaskParser;
    onError?: undefined;
};
export declare function adhocExecTask(parser: EmptyTaskParser): EmptyTask;
export declare function configurationErrorTask(error: Error | string): EmptyTask;
export declare function straightThroughStringTask(commands: string[], trimmed?: boolean): StringTask<string>;
export declare function straightThroughBufferTask(commands: string[]): BufferTask<Buffer>;
export declare function isBufferTask<R>(task: SimpleGitTask<R>): task is BufferTask<R>;
export declare function isEmptyTask<R>(task: SimpleGitTask<R>): task is EmptyTask;
