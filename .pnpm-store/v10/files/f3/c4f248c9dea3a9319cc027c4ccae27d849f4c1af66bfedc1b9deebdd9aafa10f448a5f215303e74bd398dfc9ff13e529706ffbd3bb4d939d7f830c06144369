import { ChildProcess, SpawnOptions } from 'child_process';
import { GitExecutorResult } from '../types';
type SimpleGitTaskPluginContext = {
    readonly method: string;
    readonly commands: string[];
};
export interface SimpleGitPluginTypes {
    'spawn.args': {
        data: string[];
        context: SimpleGitTaskPluginContext & {};
    };
    'spawn.binary': {
        data: string;
        context: SimpleGitTaskPluginContext & {};
    };
    'spawn.options': {
        data: Partial<SpawnOptions>;
        context: SimpleGitTaskPluginContext & {};
    };
    'spawn.before': {
        data: void;
        context: SimpleGitTaskPluginContext & {
            kill(reason: Error): void;
        };
    };
    'spawn.after': {
        data: void;
        context: SimpleGitTaskPluginContext & {
            spawned: ChildProcess;
            close(exitCode: number, reason?: Error): void;
            kill(reason: Error): void;
        };
    };
    'task.error': {
        data: {
            error?: Error;
        };
        context: SimpleGitTaskPluginContext & GitExecutorResult;
    };
}
export type SimpleGitPluginType = keyof SimpleGitPluginTypes;
export interface SimpleGitPlugin<T extends SimpleGitPluginType> {
    action(data: SimpleGitPluginTypes[T]['data'], context: SimpleGitPluginTypes[T]['context']): typeof data;
    type: T;
}
export {};
