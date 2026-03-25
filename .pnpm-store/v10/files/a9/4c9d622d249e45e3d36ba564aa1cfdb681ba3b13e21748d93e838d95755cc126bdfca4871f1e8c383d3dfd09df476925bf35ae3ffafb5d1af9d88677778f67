import { GitError } from './git-error';
import { SimpleGitOptions } from '../types';
/**
 * The `GitConstructError` is thrown when an error occurs in the constructor
 * of the `simple-git` instance itself. Most commonly as a result of using
 * a `baseDir` option that points to a folder that either does not exist,
 * or cannot be read by the user the node script is running as.
 *
 * Check the `.message` property for more detail including the properties
 * passed to the constructor.
 */
export declare class GitConstructError extends GitError {
    readonly config: SimpleGitOptions;
    constructor(config: SimpleGitOptions, message: string);
}
