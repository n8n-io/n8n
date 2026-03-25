import { SimpleGitBase } from '../../typings';
import { outputHandler, SimpleGitExecutor, SimpleGitTask, SimpleGitTaskCallback } from './types';
export declare class SimpleGitApi implements SimpleGitBase {
    private _executor;
    constructor(_executor: SimpleGitExecutor);
    protected _runTask<T>(task: SimpleGitTask<T>, then?: SimpleGitTaskCallback<T>): any;
    add(files: string | string[]): any;
    cwd(directory: string | {
        path: string;
        root?: boolean;
    }): any;
    hashObject(path: string, write: boolean | unknown): any;
    init(bare?: boolean | unknown): any;
    merge(): any;
    mergeFromTo(remote: string, branch: string): any;
    outputHandler(handler: outputHandler): this;
    push(): any;
    stash(): any;
    status(): any;
}
