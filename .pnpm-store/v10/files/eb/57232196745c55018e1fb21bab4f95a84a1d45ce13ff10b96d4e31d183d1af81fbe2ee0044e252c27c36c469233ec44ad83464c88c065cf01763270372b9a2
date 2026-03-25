import { GitExecutorResult, SimpleGitPluginConfig } from '../types';
import { SimpleGitPlugin } from './simple-git-plugin';
type TaskResult = Omit<GitExecutorResult, 'rejection'>;
declare function isTaskError(result: TaskResult): boolean;
export declare function errorDetectionHandler(overwrite?: boolean, isError?: typeof isTaskError, errorMessage?: (result: TaskResult) => Buffer | Error): (error: Buffer | Error | undefined, result: TaskResult) => Error | Buffer<ArrayBufferLike> | undefined;
export declare function errorDetectionPlugin(config: SimpleGitPluginConfig['errors']): SimpleGitPlugin<'task.error'>;
export {};
