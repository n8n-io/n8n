import { GitExecutorResult, SimpleGitExecutor } from './index';
import { EmptyTask } from '../tasks/task';
export type TaskResponseFormat = Buffer | string;
export interface TaskParser<INPUT extends TaskResponseFormat, RESPONSE> {
    (stdOut: INPUT, stdErr: INPUT): RESPONSE;
}
export interface EmptyTaskParser {
    (executor: SimpleGitExecutor): void;
}
export interface SimpleGitTaskConfiguration<RESPONSE, FORMAT, INPUT extends TaskResponseFormat> {
    commands: string[];
    format: FORMAT;
    parser: TaskParser<INPUT, RESPONSE>;
    onError?: (result: GitExecutorResult, error: Error, done: (result: Buffer | Buffer[]) => void, fail: (error: string | Error) => void) => void;
}
export type StringTask<R> = SimpleGitTaskConfiguration<R, 'utf-8', string>;
export type BufferTask<R> = SimpleGitTaskConfiguration<R, 'buffer', Buffer>;
export type RunnableTask<R> = StringTask<R> | BufferTask<R>;
export type SimpleGitTask<R> = RunnableTask<R> | EmptyTask;
