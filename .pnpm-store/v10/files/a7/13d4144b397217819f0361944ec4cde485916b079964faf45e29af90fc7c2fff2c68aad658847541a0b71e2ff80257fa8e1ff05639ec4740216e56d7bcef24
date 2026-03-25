import { PluginStore } from '../plugins';
import { outputHandler, SimpleGitExecutor, SimpleGitTask } from '../types';
import { Scheduler } from './scheduler';
export declare class GitExecutorChain implements SimpleGitExecutor {
    private _executor;
    private _scheduler;
    private _plugins;
    private _chain;
    private _queue;
    private _cwd;
    get cwd(): string;
    set cwd(cwd: string);
    get env(): import("../types").GitExecutorEnv;
    get outputHandler(): outputHandler | undefined;
    constructor(_executor: SimpleGitExecutor, _scheduler: Scheduler, _plugins: PluginStore);
    chain(): this;
    push<R>(task: SimpleGitTask<R>): Promise<R>;
    private attemptTask;
    private onFatalException;
    private attemptRemoteTask;
    private attemptEmptyTask;
    private handleTaskData;
    private gitResponse;
    private _beforeSpawn;
}
