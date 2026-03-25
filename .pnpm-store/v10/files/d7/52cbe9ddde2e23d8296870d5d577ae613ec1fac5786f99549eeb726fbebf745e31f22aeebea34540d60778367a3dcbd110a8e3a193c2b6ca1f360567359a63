import type { PluginStore } from '../plugins';
import type { GitExecutorEnv, outputHandler, SimpleGitExecutor, SimpleGitTask } from '../types';
import { Scheduler } from './scheduler';
export declare class GitExecutor implements SimpleGitExecutor {
    cwd: string;
    private _scheduler;
    private _plugins;
    private _chain;
    env: GitExecutorEnv;
    outputHandler?: outputHandler;
    constructor(cwd: string, _scheduler: Scheduler, _plugins: PluginStore);
    chain(): SimpleGitExecutor;
    push<R>(task: SimpleGitTask<R>): Promise<R>;
}
