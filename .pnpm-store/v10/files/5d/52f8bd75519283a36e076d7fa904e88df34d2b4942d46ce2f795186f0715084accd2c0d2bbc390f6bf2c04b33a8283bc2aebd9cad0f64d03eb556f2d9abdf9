import { SimpleGitOptions, SimpleGitTask } from '../types';
import { GitError } from './git-error';
export declare class GitPluginError extends GitError {
    task?: SimpleGitTask<any> | undefined;
    readonly plugin?: keyof SimpleGitOptions | undefined;
    constructor(task?: SimpleGitTask<any> | undefined, plugin?: keyof SimpleGitOptions | undefined, message?: string);
}
