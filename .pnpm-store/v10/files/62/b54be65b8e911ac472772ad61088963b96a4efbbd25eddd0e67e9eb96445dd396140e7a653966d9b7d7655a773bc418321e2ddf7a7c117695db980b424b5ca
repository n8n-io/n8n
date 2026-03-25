/**
 * Interface for cp/mv options
 */
export interface CopyOptions {
    /** Optional. Whether to recursively copy all subdirectories. Defaults to false */
    recursive?: boolean;
    /** Optional. Whether to overwrite existing files in the destination. Defaults to true */
    force?: boolean;
    /** Optional. Whether to copy the source directory along with all the files. Only takes effect when recursive=true and copying a directory. Default is true*/
    copySourceDirectory?: boolean;
}
/**
 * Interface for cp/mv options
 */
export interface MoveOptions {
    /** Optional. Whether to overwrite existing files in the destination. Defaults to true */
    force?: boolean;
}
/**
 * Copies a file or folder.
 * Based off of shelljs - https://github.com/shelljs/shelljs/blob/9237f66c52e5daa40458f94f9565e18e8132f5a6/src/cp.js
 *
 * @param     source    source path
 * @param     dest      destination path
 * @param     options   optional. See CopyOptions.
 */
export declare function cp(source: string, dest: string, options?: CopyOptions): Promise<void>;
/**
 * Moves a path.
 *
 * @param     source    source path
 * @param     dest      destination path
 * @param     options   optional. See MoveOptions.
 */
export declare function mv(source: string, dest: string, options?: MoveOptions): Promise<void>;
/**
 * Remove a path recursively with force
 *
 * @param inputPath path to remove
 */
export declare function rmRF(inputPath: string): Promise<void>;
/**
 * Make a directory.  Creates the full path with folders in between
 * Will throw if it fails
 *
 * @param   fsPath        path to create
 * @returns Promise<void>
 */
export declare function mkdirP(fsPath: string): Promise<void>;
/**
 * Returns path of a tool had the tool actually been invoked.  Resolves via paths.
 * If you check and the tool does not exist, it will throw.
 *
 * @param     tool              name of the tool
 * @param     check             whether to check if tool exists
 * @returns   Promise<string>   path to tool
 */
export declare function which(tool: string, check?: boolean): Promise<string>;
/**
 * Returns a list of all occurrences of the given tool on the system path.
 *
 * @returns   Promise<string[]>  the paths of the tool
 */
export declare function findInPath(tool: string): Promise<string[]>;
