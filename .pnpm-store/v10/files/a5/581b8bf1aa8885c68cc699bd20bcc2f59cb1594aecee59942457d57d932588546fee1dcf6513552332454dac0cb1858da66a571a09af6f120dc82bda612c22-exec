// Type definitions for ShellJS 0.8
// Project: http://shelljs.org, https://github.com/shelljs/shelljs
// Definitions by: Niklas Mollenhauer <https://github.com/nikeee>
//                 Vojtech Jasny <https://github.com/voy>
//                 George Kalpakas <https://github.com/gkalpak>
//                 Paul Huynh <https://github.com/pheromonez>
//                 Alexander Futász <https://github.com/aldafu>
//                 ExE Boss <https://github.com/ExE-Boss>
//                 Mirco Sanguineti <https://github.com/msanguineti>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node"/>

import child = require('child_process');
import glob = require('glob');

/**
 * Changes the current working directory dir for the duration of the script.
 * Changes to the home directory if no argument is supplied.
 *
 * @param dir Directory to change to.
 * @return    Object with shell exit code, stderr and stdout.
 */
export function cd(dir?: string): ShellString;

/**
 * Returns the current directory.
 * @return The current directory.
 */
export function pwd(): ShellString;

export interface ListFunction {
    /**
     * Returns array of files in the given path, or in current directory if no path provided.
     *
     * @param options Available options:
     *        - `-R`: recursive
     *        - `-A`: all files (include files beginning with ., except for . and ..)
     *        - `-L`: follow symlinks
     *        - `-d`: list directories themselves, not their contents
     *        - `-l`: list objects representing each file, each with fields containing
     *                `ls -l` output fields. See fs.Stats for more info
     * @param paths   Paths to search.
     * @return        An array of files in the given path(s).
     */
    (options: string, paths: string[]): ShellArray;
    (options: string, ...paths: string[]): ShellArray;

    /**
     * Returns array of files in the given path, or in current directory if no path provided.
     *
     * @param paths Paths to search.
     * @return      An array of files in the given path(s).
     */
    (paths: string[]): ShellArray;
    (...paths: string[]): ShellArray;
}

/**
 * Returns array of files in the given path, or in current directory if no path provided.
 *
 * @param options Available options:
 *        - `-R`: recursive
 *        - `-A`: all files (include files beginning with ., except for . and ..)
 *        - `-L`: follow symlinks
 *        - `-d`: list directories themselves, not their contents
 *        - `-l`: list objects representing each file, each with fields containing
 *                `ls -l` output fields. See fs.Stats for more info
 * @param paths   Paths to search.
 * @return        An array of files in the given path(s).
 */
export const ls: ListFunction;

export interface FindFunction {
    /**
     * Returns array of all files (however deep) in the given paths.
     *
     * @param path The path(s) to search.
     * @return     An array of all files (however deep) in the given path(s).
     */
    (path: string[]): ShellArray;
    (...path: string[]): ShellArray;
}

/**
 * Returns array of all files (however deep) in the given paths.
 *
 * @param path The path(s) to search.
 * @return     An array of all files (however deep) in the given path(s).
 */
export const find: FindFunction;

export interface CopyFunction {
    /**
     * Copies files. The wildcard `*` is accepted.
     *
     * @param options Available options:
     *        - `-f`: force (default behavior)
     *        - `-n`: no-clobber
     *        - `-u`: only copy if source is newer than dest
     *        - `-r`, `-R`: recursive
     *        - `-L`: follow symlinks
     *        - `-P`: don't follow symlinks
     * @param source The source.
     * @param dest   The destination.
     * @return       Object with shell exit code, stderr and stdout.
     */
    (options: string, source: string | string[], dest: string): ShellString;

    /**
     * Copies files. The wildcard `*` is accepted.
     *
     * @param source The source.
     * @param dest   The destination.
     * @return       Object with shell exit code, stderr and stdout.
     */
    (source: string | string[], dest: string): ShellString;
}

/**
 * Copies files. The wildcard `*` is accepted.
 *
 * @param options Available options:
 *        - `-f`: force (default behavior)
 *        - `-n`: no-clobber
 *        - `-u`: only copy if source is newer than dest
 *        - `-r`, -R: recursive
 *        - `-L`: follow symlinks
 *        - `-P`: don't follow symlinks
 * @param source The source.
 * @param dest   The destination.
 * @return       Object with shell exit code, stderr and stdout.
 */
export const cp: CopyFunction;

export interface RemoveFunction {
    /**
     * Removes files. The wildcard `*` is accepted.
     *
     * @param options Available options:
     *        - `-f`: force
     *        - `-r`, `-R`: recursive
     * @param files   Files to remove.
     * @return        Object with shell exit code, stderr and stdout.
     */
    (options: string, files: string[]): ShellString;
    (options: string, ...files: string[]): ShellString;

    /**
     * Removes files. The wildcard `*` is accepted.
     *
     * @param files Files to remove.
     * @return      Object with shell exit code, stderr and stdout.
     */
    (files: string[]): ShellString;
    (...files: string[]): ShellString;
}

/**
 * Removes files. The wildcard `*` is accepted.
 *
 * @param options Available options:
 *        - `-f` (force),
 *        - `-r`, `-R` (recursive)
 * @param files   Files to remove.
 * @return        Object with shell exit code, stderr and stdout.
 */
export const rm: RemoveFunction;

export interface MoveFunction {
    /**
     * Moves files. The wildcard `*` is accepted.
     *
     * @param options Available options:
     *        - `-f`: force (default behavior)
     *        - `-n`: no-clobber
     * @param source The source.
     * @param dest   The destination.
     * @return       Object with shell exit code, stderr and stdout.
     */
    (options: string, source: string | string[], dest: string): ShellString;

    /**
     * Moves files. The wildcard `*` is accepted.
     *
     * @param source The source.
     * @param dest   The destination.
     * @return       Object with shell exit code, stderr and stdout.
     */
    (source: string | string[], dest: string): ShellString;
}

/**
 * Moves files. The wildcard `*` is accepted.
 *
 * @param options Available options:
 *        - `-f`: force (default behavior)
 *        - `-n`: no-clobber
 * @param source The source.
 * @param dest   The destination.
 * @return       Object with shell exit code, stderr and stdout.
 */
export const mv: MoveFunction;

export interface MkdirFunction {
    /**
     * Creates directories.
     *
     * @param options Available options:
     *        - `-p`: full paths, will create intermediate dirs if necessary
     * @param dir     The directories to create.
     * @return        Object with shell exit code, stderr and stdout.
     */
    (options: string, dir: string[]): ShellString;
    (options: string, ...dir: string[]): ShellString;

    /**
     * Creates directories.
     *
     * @param dir Directories to create.
     * @return    Object with shell exit code, stderr and stdout.
     */
    (dir: string[]): ShellString;
    (...dir: string[]): ShellString;
}

/**
 * Creates directories.
 *
 * @param options Available options:
 *        - `-p`: full paths, will create intermediate dirs if necessary
 * @param dir     The directories to create.
 * @return        Object with shell exit code, stderr and stdout.
 */
export const mkdir: MkdirFunction;

/**
 * Evaluates expression using the available primaries and returns corresponding value.
 *
 * @param option Valid options:
 *        - `-b`: true if path is a block device;
 *        - `-c`: true if path is a character device;
 *        - `-d`: true if path is a directory;
 *        - `-e`: true if path exists;
 *        - `-f`: true if path is a regular file;
 *        - `-L`: true if path is a symbolic link;
 *        - `-p`: true if path is a pipe (FIFO);
 *        - `-S`: true if path is a socket
 * @param path    The path.
 * @return        See option parameter.
 */
export function test(option: TestOptions, path: string): boolean;

export type TestOptions = '-b' | '-c' | '-d' | '-e' | '-f' | '-L' | '-p' | '-S';

export interface CatFunction {
    /**
     * Returns a string containing the given file, or a concatenated string
     * containing the files if more than one file is given (a new line character
     * is introduced between each file).
     *
     * @param files Files to use. Wildcard `*` accepted.
     * @return A string containing the given file, or a concatenated string
     *         containing the files if more than one file is given
     *         (a new line character is introduced between each file).
     */
    (files: string[]): ShellString;
    (...files: string[]): ShellString;
}

/**
 * Returns a string containing the given file, or a concatenated string
 * containing the files if more than one file is given (a new line character
 * is introduced between each file).
 *
 * @param files Files to use. Wildcard `*` accepted.
 * @return A string containing the given file, or a concatenated string
 *         containing the files if more than one file is given
 *         (a new line character is introduced between each file).
 */
export const cat: CatFunction;

export interface SedFunction {
    /**
     * Reads an input string from file and performs a JavaScript `replace()`
     * on the input using the given search regex and replacement string or function.
     *
     * @param options Available options:
     *        - `-i`: Replace contents of 'file' in-place. Note that no backups will be created!
     * @param searchRegex The regular expression to use for search.
     * @param replacement The replacement.
     * @param files       The files to process.
     * @return            The new string after replacement.
     */
    (options: string, searchRegex: string | RegExp, replacement: string, files: string[]): ShellString;
    (options: string, searchRegex: string | RegExp, replacement: string, ...files: string[]): ShellString;

    /**
     * Reads an input string from file and performs a JavaScript `replace()`
     * on the input using the given search regex and replacement string or function.
     *
     * @param searchRegex The regular expression to use for search.
     * @param replacement The replacement.
     * @param files       The files to process.
     * @return            The new string after replacement.
     */
    (searchRegex: string | RegExp, replacement: string, files: string[]): ShellString;
    (searchRegex: string | RegExp, replacement: string, ...files: string[]): ShellString;
}

/**
 * Reads an input string from file and performs a JavaScript `replace()`
 * on the input using the given search regex and replacement string or function.
 *
 * @param options Available options:
 *        - `-i`: Replace contents of 'file' in-place. Note that no backups will be created!
 * @param searchRegex The regular expression to use for search.
 * @param replacement The replacement.
 * @param files       The files to process.
 * @return            The new string after replacement.
 */
export const sed: SedFunction;

export interface GrepFunction {
    /**
     * Reads input string from given files and returns a string containing all lines
     * of the file that match the given `regex_filter`. Wildcard `*` accepted.
     *
     * @param options Available options:
     *        - `-v`: Inverse the sense of the regex and print
     *                the lines not matching the criteria.
     *        - `-l`: Print only filenames of matching files
     * @param regex_filter The regular expression to use.
     * @param files The files to process.
     * @return Returns a string containing all lines of the file that match the given regex_filter.
     */
    (options: string, regex_filter: string | RegExp, files: string[]): ShellString;
    (options: string, regex_filter: string | RegExp, ...files: string[]): ShellString;

    /**
     * Reads input string from given files and returns a string containing all lines
     * of the file that match the given `regex_filter`. Wildcard `*` accepted.
     *
     * @param regex_filter The regular expression to use.
     * @param files        The files to process.
     * @return             Returns a string containing all lines of the file that match the given `regex_filter`.
     */
    (regex_filter: string | RegExp, files: string[]): ShellString;
    (regex_filter: string | RegExp, ...files: string[]): ShellString;
}

/**
 * Reads input string from given files and returns a string containing all lines
 * of the file that match the given `regex_filter`. Wildcard `*` accepted.
 *
 * @param options Available options:
 *        - `-v`: Inverse the sense of the regex and print
 *                the lines not matching the criteria.
 *        - `-l`: Print only filenames of matching files
 * @param regex_filter The regular expression to use.
 * @param files        The files to process.
 * @return Returns a string containing all lines of the file that match the given `regex_filter`.
 */
export const grep: GrepFunction;

/**
 * Searches for command in the system's PATH. On Windows looks for .exe, .cmd, and .bat extensions.
 *
 * @param command The command to search for.
 * @return        Returns string containing the absolute path to the command or `null` if it couldn't be found.
 */
export function which(command: string): ShellString | null;

export interface EchoFunction {
    /**
     * Prints string to stdout, and returns string with additional utility methods like .to().
     *
     * @param options Available options:
     *        - `-e`: interpret backslash escapes (default)
     *        - `-n`: remove trailing newline from output
     * @param text The text to print.
     * @return     Returns the string that was passed as argument.
     */
    (options: string, ...text: string[]): ShellString;

    /**
     * Prints string to stdout, and returns string with additional utility methods like .to().
     *
     * @param text The text to print.
     * @return     Returns the string that was passed as argument.
     */
    (...text: string[]): ShellString;
}

/**
 * Prints string to stdout, and returns string with additional utility methods like .to().
 *
 * @param options Available options:
 *        - `-e`: interpret backslash escapes (default)
 *        - `-n`: remove trailing newline from output
 * @param text The text to print.
 * @return     Returns the string that was passed as argument.
 */
export const echo: EchoFunction;

export interface PushDirFunction {
    /**
     * Saves the current directory on the top of the directory stack and then cd to dir.
     * With no arguments, `pushd` exchanges the top two directories.
     *
     * @param options Available options:
     *        - `-n`: Suppresses the normal change of directory when adding directories
     *                to the stack, so that only the stack is manipulated
     *        - `-q`: Suppresses output to the console.
     * @param dir     Brings the Nth directory (counting from the left of the list printed by dirs,
     *                starting with zero) to the top of the list by rotating the stack.
     * @return        Returns an array of paths in the stack.
     */
    (options: string, dir: '+N'): ShellArray;

    /**
     * Saves the current directory on the top of the directory stack and then cd to dir.
     * With no arguments, `pushd` exchanges the top two directories.
     *
     * @param options Available options:
     *        - `-n`: Suppresses the normal change of directory when adding directories
     *                to the stack, so that only the stack is manipulated
     *        - `-q`: Suppresses output to the console.
     * @param dir     Brings the Nth directory (counting from the right of the list printed by dirs,
     *                starting with zero) to the top of the list by rotating the stack.
     * @return        Returns an array of paths in the stack.
     */
    (options: string, dir: '-N'): ShellArray;

    /**
     * Saves the current directory on the top of the directory stack and then cd to dir.
     * With no arguments, `pushd` exchanges the top two directories.
     *
     * @param options Available options:
     *        - `-n`: Suppresses the normal change of directory when adding directories
     *                to the stack, so that only the stack is manipulated
     *        - `-q`: Suppresses output to the console.
     * @param dir     Makes the current working directory be the top of the stack,
     *                and then executes the equivalent of `cd dir`.
     * @return        Returns an array of paths in the stack.
     */
    (options: string, dir: string): ShellArray;

    /**
     * Saves the current directory on the top of the directory stack and then cd to dir.
     * With no arguments, `pushd` exchanges the top two directories.
     *
     * @param dir Brings the Nth directory (counting from the left of the list printed by dirs,
     *            starting with zero) to the top of the list by rotating the stack.
     * @return    Returns an array of paths in the stack.
     */
    (dir: '+N'): ShellArray;

    /**
     * Saves the current directory on the top of the directory stack and then cd to dir.
     * With no arguments, `pushd` exchanges the top two directories.
     *
     * @param dir Brings the Nth directory (counting from the right of the list printed by dirs,
     *            starting with zero) to the top of the list by rotating the stack.
     * @return    Returns an array of paths in the stack.
     */
    (dir: '-N'): ShellArray;

    /**
     * Saves the current directory on the top of the directory stack and then cd to dir.
     * With no arguments, `pushd` exchanges the top two directories.
     *
     * @param dir Makes the current working directory be the top of the stack,
     *            and then executes the equivalent of cd dir.
     * @return    Returns an array of paths in the stack.
     */
    (dir: string): ShellArray;

    /**
     * Saves the current directory on the top of the directory stack and then cd to dir.
     * With no arguments, `pushd` exchanges the top two directories.
     *
     * @return Returns an array of paths in the stack.
     */
    (): ShellArray;
}

/**
 * Saves the current directory on the top of the directory stack and then cd to dir.
 * With no arguments, `pushd` exchanges the top two directories.
 *
 * @param options Available options:
 *        - `-n`: Suppresses the normal change of directory when adding directories
 *                to the stack, so that only the stack is manipulated
 *        - `-q`: Suppresses output to the console.
 * @param dir     Makes the current working directory be the top of the stack,
 *                and then executes the equivalent of `cd dir`.
 * @return        Returns an array of paths in the stack.
 */
export const pushd: PushDirFunction;

export interface PopDirFunction {
    /**
     * When no arguments are given, popd removes the top directory from the stack
     * and performs a `cd` to the new top directory.
     *
     * The elements are numbered from 0 starting at the first directory listed with dirs;
     * i.e., `popd` is equivalent to `popd +0`. Returns an array of paths in the stack.
     *
     * @param options Available options:
     *        - `-n`: Suppresses the normal change of directory when removing directories
     *                from the stack, so that only the stack is manipulated
     *        - `-q`: Suppresses output to the console.
     * @param dir     Removes the Nth directory (counting from the left of the list printed by dirs), starting with zero.
     * @return        Returns an array of paths in the stack.
     */
    (options: string, dir: '+N'): ShellArray;

    /**
     * When no arguments are given, popd removes the top directory from the stack
     * and performs a `cd` to the new top directory.
     *
     * The elements are numbered from 0 starting at the first directory listed with dirs;
     * i.e., `popd` is equivalent to `popd +0`. Returns an array of paths in the stack.
     *
     * @param options Available options:
     *        - `-n`: Suppresses the normal change of directory when removing directories
     *                from the stack, so that only the stack is manipulated
     *        - `-q`: Suppresses output to the console.
     * @param dir     Removes the Nth directory (counting from the right of the list printed by dirs), starting with zero.
     * @return        Returns an array of paths in the stack.
     */
    (options: string, dir: '-N'): ShellArray;

    /**
     * When no arguments are given, popd removes the top directory from the stack
     * and performs a `cd` to the new top directory.
     *
     * The elements are numbered from 0 starting at the first directory listed with dirs;
     * i.e., `popd` is equivalent to `popd +0`. Returns an array of paths in the stack.
     *
     * @param options Available options:
     *        - `-n`: Suppresses the normal change of directory when removing directories
     *                from the stack, so that only the stack is manipulated
     *        - `-q`: Suppresses output to the console.
     * @param dir     You can only use -N and +N.
     * @return        Returns an array of paths in the stack.
     */
    (options: string, dir: string): ShellArray;

    /**
     * When no arguments are given, popd removes the top directory from the stack
     * and performs a `cd` to the new top directory.
     *
     * The elements are numbered from 0 starting at the first directory listed with dirs;
     * i.e., popd is equivalent to popd +0. Returns an array of paths in the stack.
     *
     * @param dir Removes the Nth directory (counting from the left of the list printed by dirs), starting with zero.
     * @return    Returns an array of paths in the stack.
     */
    (dir: '+N'): ShellArray;

    /**
     * When no arguments are given, popd removes the top directory from the stack
     * and performs a `cd` to the new top directory.
     *
     * The elements are numbered from 0 starting at the first directory listed with dirs;
     * i.e., `popd` is equivalent to `popd +0`. Returns an array of paths in the stack.
     *
     * @param dir Removes the Nth directory (counting from the right of the list printed by dirs), starting with zero.
     * @return    Returns an array of paths in the stack.
     */
    (dir: '-N'): ShellArray;

    /**
     * When no arguments are given, popd removes the top directory from the stack
     * and performs a `cd` to the new top directory.
     *
     * The elements are numbered from 0 starting at the first directory listed with dirs;
     * i.e., `popd` is equivalent to `popd +0`. Returns an array of paths in the stack.
     *
     * @param dir You can only use -N and +N.
     * @return    Returns an array of paths in the stack.
     */
    (dir: string): ShellArray;

    /**
     * When no arguments are given, popd removes the top directory from the stack
     * and performs a `cd` to the new top directory.
     *
     * The elements are numbered from 0 starting at the first directory listed with dirs;
     * i.e., `popd` is equivalent to `popd +0`. Returns an array of paths in the stack.
     *
     * @return     Returns an array of paths in the stack.
     */
    (): ShellArray;
}

/**
 * When no arguments are given, popd removes the top directory from the stack
 * and performs a `cd` to the new top directory.
 *
 * The elements are numbered from 0 starting at the first directory listed with dirs;
 * i.e., `popd` is equivalent to `popd +0`. Returns an array of paths in the stack.
 *
 * @param options Available options:
 *        - `-n`: Suppresses the normal change of directory when removing directories
 *                from the stack, so that only the stack is manipulated
 *        - `-q`: Suppresses output to the console.
 * @param dir     You can only use -N and +N.
 * @return        Returns an array of paths in the stack.
 */
export const popd: PopDirFunction;

export interface DirsFunction {
    /**
     * Clears the directory stack by deleting all of the elements.
     *
     * @param options Clears the directory stack by deleting all of the elements.
     * @return        Returns an array of paths in the stack, or a single path if +N or -N was specified.
     */
    (options: '-c'): ShellArray;

    /**
     * Displays the list of currently remembered directories.
     *
     * @param options Displays the Nth directory (counting from the left of the list
     *                printed by dirs when invoked without options), starting with zero.
     * @return        Returns an array of paths in the stack, or a single path if +N or -N was specified.
     */
    (options: '+N'): ShellString;

    /**
     * Displays the list of currently remembered directories.
     *
     * @param options Displays the Nth directory (counting from the right of the list
     *                printed by dirs when invoked without options), starting with zero.
     * @return        Returns an array of paths in the stack, or a single path if +N or -N was specified.
     */
    (options: '-N'): ShellString;

    /**
     * Displays the list of currently remembered directories.
     *
     * @param options Available options:
     *        - `-c`: Clears the directory stack by deleting all of the elements.
     *        - `-N`: Displays the Nth directory (counting from the right of the list
     *                printed by dirs when invoked without options), starting with zero.
     *        - `+N`: Displays the Nth directory (counting from the left of the list
     *                printed by dirs when invoked without options), starting with zero.
     * @return        Returns an array of paths in the stack, or a single path if +N or -N was specified.
     */
    (options: string): ShellArray | ShellString;
}

/**
 * Displays the list of currently remembered directories.
 *
 * @param options Available options:
 *        - `-c`: Clears the directory stack by deleting all of the elements.
 *        - `-N`: Displays the Nth directory (counting from the right of the list
 *                printed by dirs when invoked without options), starting with zero.
 *        - `+N`: Displays the Nth directory (counting from the left of the list
 *                printed by dirs when invoked without options), starting with zero.
 * @return        Returns an array of paths in the stack, or a single path if +N or -N was specified.
 */
export const dirs: DirsFunction;

export interface LinkFunction {
    /**
     * Links source to dest. Use `-f` to force the link, should dest already exist.
     *
     * @param options Available options:
     *        - `-s`: Create a symbolic link, defaults to a hardlink
     *        - `-f`: Force creation
     * @param source The source.
     * @param dest   The destination.
     * @return       Object with shell exit code, stderr and stdout.
     */
    (options: string, source: string, dest: string): ShellString;

    /**
     * Links source to dest. Use `-f` to force the link, should dest already exist.
     *
     * @param source The source.
     * @param dest   The destination.
     * @return       Object with shell exit code, stderr and stdout.
     */
    (source: string, dest: string): ShellString;
}

/**
 * Links source to dest. Use `-f` to force the link, should dest already exist.
 *
 * @param options Available options:
 *        - `-s`: Create a symbolic link, defaults to a hardlink
 *        - `-f`: Force creation
 * @param source The source.
 * @param dest   The destination.
 * @return       Object with shell exit code, stderr and stdout.
 */
export const ln: LinkFunction;

/**
 * Exits the current process with the given exit code.
 *
 * Equivalent to calling `process.exit(code)`.
 *
 * @param code The exit code.
 */
export function exit(code?: number): never;

/**
 * Object containing environment variables (both getter and setter). Shortcut to `process.env`.
 */
export const env: NodeJS.ProcessEnv;

export interface ExecFunction {
    /**
     * Executes the given command synchronously.
     *
     * @param command The command to execute.
     * @return        Returns an object containing the return code and output as string.
     */
    (command: string): ShellString;

    /**
     * Executes the given command synchronously.
     *
     * @param command The command to execute.
     * @param options Silence and synchronous options.
     * @return        Returns an object containing the return code and output as string,
     *                or if `{async: true}` was passed, a `ChildProcess`.
     */
    (command: string, options: ExecOptions & { async?: false | undefined }): ShellString;

    /**
     * Executes the given command asynchronously.
     *
     * @param command The command to execute.
     * @param options Silence and synchronous options.
     * @return        Returns an object containing the return code and output as string,
     *                or if `{async: true}` was passed, a `ChildProcess`.
     */
    (command: string, options: ExecOptions & { async: true }): child.ChildProcess;

    /**
     * Executes the given command.
     *
     * @param command The command to execute.
     * @param options Silence and synchronous options.
     * @return        Returns an object containing the return code and output as string,
     *                or if `{async: true}` was passed, a `ChildProcess`.
     */
    (command: string, options: ExecOptions): ShellString | child.ChildProcess;

    /**
     * Executes the given command synchronously.
     *
     * @param command The command to execute.
     * @param options Silence and synchronous options.
     * @param callback Receives code and output asynchronously.
     */
    (command: string, options: ExecOptions, callback: ExecCallback): child.ChildProcess;

    /**
     * Executes the given command synchronously.
     *
     * @param command The command to execute.
     * @param callback Receives code and output asynchronously.
     */
    (command: string, callback: ExecCallback): child.ChildProcess;
}

/**
 * Executes the given command.
 *
 * @param command The command to execute.
 * @param options Silence and synchronous options.
 * @param [callback] Receives code and output asynchronously.
 * @return Returns an object containing the return code and output as string,
 *         or if `{async: true}` or a `callback` was passed, a `ChildProcess`.
 */
export const exec: ExecFunction;

export type ExecCallback = (
    /** The process exit code. */
    code: number,

    /** The process standard output. */
    stdout: string,

    /** The process standard error output. */
    stderr: string,
) => any;

export interface ExecOptions extends child.ExecOptions {
    /**
     * Do not echo program output to the console.
     *
     * @default false
     */
    silent?: boolean | undefined;

    /**
     * Exit when command return code is non-zero.
     *
     * @default false
     */
    fatal?: boolean | undefined;

    /**
     * Asynchronous execution.
     *
     * If a callback is provided, it will be set to `true`, regardless of the passed value.
     *
     * @default false
     */
    async?: boolean | undefined;

    /**
     * Character encoding to use.
     *
     * Affects the values returned by `stdout` and `stderr`,
     * and what is written to `stdout` and `stderr` when not in silent mode
     *
     * @default "utf8"
     */
    encoding?: string | undefined;
}

export interface ExecOutputReturnValue {
    /** The process exit code. */
    code: number;

    /** The process standard output. */
    stdout: string;

    /** The process standard error output. */
    stderr: string;
}

export interface ShellReturnValue extends ExecOutputReturnValue {
    /**
     * Analogous to the redirection operator `>` in Unix, but works with JavaScript strings
     * (such as those returned by `cat`, `grep`, etc).
     *
     * Like Unix redirections, `to()` will overwrite any existing file!
     *
     * @param file The file to use.
     */
    to(file: string): void;

    /**
     * Analogous to the redirect-and-append operator `>>` in Unix, but works with JavaScript strings
     * (such as those returned by `cat`, `grep`, etc).
     *
     * @param file The file to append to.
     */
    toEnd(file: string): void;

    /**
     * Returns a string containing the given pipeline, or a concatenated string
     * containing the pipelines if more than one input stream is given
     * (a new line character is introduced between each input).
     *
     * @return A string containing the given pipeline, or a concatenated string
     *         containing the pipelines if more than one input stream is given
     *         (a new line character is introduced between each input).
     */
    cat: CatFunction;

    /**
     * Executes the given command.
     *
     * @param command The command to execute.
     * @param options Silence and synchronous options.
     * @param [callback] Receives code and output asynchronously.
     * @return Returns an object containing the return code and output as string,
     *         or if `{async: true}` or a `callback` was passed, a `ChildProcess`.
     */
    exec: ExecFunction;

    /**
     * Read the start of a pipeline input.
     */
    head: HeadFunction;

    /**
     * Reads input string from given files and returns a string containing all lines
     * of the file that match the given `regex_filter`. Wildcard `*` accepted.
     *
     * @param options Available options:
     *        - `-v`: Inverse the sense of the regex and print
     *                the lines not matching the criteria.
     *        - `-l`: Print only filenames of matching files
     * @param regex_filter The regular expression to use.
     * @return Returns a string containing all lines of the file that match the given `regex_filter`.
     */
    grep: GrepFunction;

    /**
     * Reads an input string from pipeline and performs a JavaScript `replace()`
     * on the input using the given search regex and replacement string or function.
     *
     * @param options Available options:
     *        - `-i`: Replace contents of 'file' in-place. Note that no backups will be created!
     * @param searchRegex The regular expression to use for search.
     * @param replacement The replacement.
     * @return            The new string after replacement.
     */
    sed: SedFunction;

    /**
     * Return the contents of the pipeline, sorted line-by-line.
     *
     * @param options Available options:
     *        - `-r`: Reverse the results
     *        - `-n`: Compare according to numerical value
     */
    sort: SortFunction;

    /**
     * Read the end of a pipeline input.
     */
    tail: TailFunction;

    /**
     * Filter adjacent matching lines from input.
     *
     * @param options Available options:
     *        - `-i`: Ignore case while comparing
     *        - `-c`: Prefix lines by the number of occurrences
     *        - `-d`: Only print duplicate lines, one for each group of identical lines
     */
    uniq: UniqFunction;
}

export type ShellString = string & ShellReturnValue;

export type ShellArray = string[] & ShellReturnValue;

export interface ShellStringConstructor {
    /**
     * Wraps a string (or array) value. This has all the string (or array) methods,
     * but also exposes extra methods: `.to()`, `.toEnd()`, and all the pipe-able
     * methods (ex. `.cat()`, `.grep()`, etc.).
     *
     * This can be easily converted into a string by calling `.toString()`.
     *
     * This type also exposes the corresponding command's stdout, stderr, and return status
     * code via the `.stdout` (string), `.stderr` (string), and `.code` (number) properties
     * respectively.
     *
     * Construct signature allows for:
     *
     * var foo = new ShellString('hello world');
     *
     * as per example in shelljs docs:
     * https://github.com/shelljs/shelljs#shellstringstr
     *
     * @param value     The string value to wrap.
     * @return                A string-like object with special methods.
     */
    new (value: string): ShellString;
    new (value: string[]): ShellArray;

    /**
     * Wraps a string (or array) value. This has all the string (or array) methods,
     * but also exposes extra methods: `.to()`, `.toEnd()`, and all the pipe-able
     * methods (ex. `.cat()`, `.grep()`, etc.).
     *
     * This can be easily converted into a string by calling `.toString()`.
     *
     * This type also exposes the corresponding command's stdout, stderr, and return status
     * code via the `.stdout` (string), `.stderr` (string), and `.code` (number) properties
     * respectively.
     *
     * @param value     The string value to wrap.
     * @return                A string-like object with special methods.
     */
    (value: string): ShellString;
    (value: string[]): ShellArray;
}

export const ShellString: ShellStringConstructor;

export interface ChmodFunction {
    /**
     * Alters the permissions of a file or directory by either specifying the absolute
     * permissions in octal form or expressing the changes in symbols.
     *
     * This command tries to mimic the POSIX behavior as much as possible.
     *
     * Notable exceptions:
     * - In symbolic modes, 'a-r' and '-r' are identical. No consideration is given to the umask.
     * - There is no "quiet" option since default behavior is to run silent.
     *
     * @param options Available options:
     *        - `-v`: output a diagnostic for every file processed
     *        - `-c`: like -v but report only when a change is made
     *        - `-R`: change files and directories recursively
     * @param mode    The access mode. Can be an octal string or a symbolic mode string.
     * @param file    The file to use.
     * @return        Object with shell exit code, stderr and stdout.
     */
    (options: string, mode: string | number, file: string): ShellString;

    /**
     * Alters the permissions of a file or directory by either specifying the absolute
     * permissions in octal form or expressing the changes in symbols.
     *
     * This command tries to mimic the POSIX behavior as much as possible.
     *
     * Notable exceptions:
     * - In symbolic modes, 'a-r' and '-r' are identical. No consideration is given to the umask.
     * - There is no "quiet" option since default behavior is to run silent.
     *
     * @param mode The access mode. Can be an octal string or a symbolic mode string.
     * @param file The file to use.
     * @return     Object with shell exit code, stderr and stdout.
     */
    (mode: string | number, file: string): ShellString;
}

/**
 * Alters the permissions of a file or directory by either specifying the absolute
 * permissions in octal form or expressing the changes in symbols.
 *
 * This command tries to mimic the POSIX behavior as much as possible.
 *
 * Notable exceptions:
 * - In symbolic modes, 'a-r' and '-r' are identical. No consideration is given to the umask.
 * - There is no "quiet" option since default behavior is to run silent.
 *
 * @param options Available options:
 *        - `-v`: output a diagnostic for every file processed
 *        - `-c`: like -v but report only when a change is made
 *        - `-R`: change files and directories recursively
 * @param mode    The access mode. Can be an octal string or a symbolic mode string.
 * @param file    The file to use.
 * @return        Object with shell exit code, stderr and stdout.
 */
export const chmod: ChmodFunction;

// Non-Unix commands

/**
 * Searches and returns string containing a writeable, platform-dependent temporary directory.
 * Follows Python's tempfile algorithm.
 *
 * @return The temp file path.
 */
export function tempdir(): ShellString;

/**
 * Tests if error occurred in the last command.
 *
 * @return Returns null if no error occurred, otherwise returns string explaining the error
 */
export function error(): ShellString;

export type TouchOptionsLiteral = '-a' | '-c' | '-m' | '-d' | '-r';

export interface TouchOptionsArray {
    '-d'?: string | undefined;
    '-r'?: string | undefined;
}

export interface TouchFunction {
    (options: TouchOptionsLiteral | TouchOptionsArray, files: string[]): ShellString;
    (options: TouchOptionsLiteral | TouchOptionsArray, ...files: string[]): ShellString;

    (files: string[]): ShellString;
    (...files: string[]): ShellString;
}

/**
 * Update the access and modification times of each FILE to the current time.
 * A FILE argument that does not exist is created empty, unless `-c` is supplied
 */
export const touch: TouchFunction;

export interface HeadOptions {
    /** Show the first <num> lines of the files. */
    '-n': number;
}

export interface HeadFunction {
    (options: HeadOptions, files: string[]): ShellString;
    (options: HeadOptions, ...files: string[]): ShellString;

    (files: string[]): ShellString;
    (...files: string[]): ShellString;
}

/**
 * Read the start of a file.
 */
export const head: HeadFunction;

export interface SortFunction {
    /**
     * Return the contents of the files, sorted line-by-line.
     * Sorting multiple files mixes their content (just as unix sort does).
     *
     * @param options Available options:
     *        - `-r`: Reverse the results
     *        - `-n`: Compare according to numerical value
     */
    (options: string, files: string[]): ShellString;
    (options: string, ...files: string[]): ShellString;

    /**
     * Return the contents of the files, sorted line-by-line.
     * Sorting multiple files mixes their content (just as unix sort does).
     */
    (files: string[]): ShellString;
    (...files: string[]): ShellString;
}

/**
 * Return the contents of the files, sorted line-by-line.
 * Sorting multiple files mixes their content (just as unix sort does).
 *
 * @param options Available options:
 *        - `-r`: Reverse the results
 *        - `-n`: Compare according to numerical value
 */
export const sort: SortFunction;

export interface TailOptions {
    /** Show the last <num> lines of files. */
    '-n': number;
}

export interface TailFunction {
    (options: TailOptions, files: string[]): ShellString;
    (options: TailOptions, ...files: string[]): ShellString;

    (files: string[]): ShellString;
    (...files: string[]): ShellString;
}

/**
 * Read the end of a file.
 */
export const tail: TailFunction;

export interface UniqFunction {
    /**
     * Filter adjacent matching lines from input.
     *
     * @param options Available options:
     *        - `-i`: Ignore case while comparing
     *        - `-c`: Prefix lines by the number of occurrences
     *        - `-d`: Only print duplicate lines, one for each group of identical lines
     */
    (options: string, input: string, output?: string): ShellString;

    /**
     * Filter adjacent matching lines from input.
     */
    (input: string, output?: string): ShellString;
}

/**
 * Filter adjacent matching lines from input.
 *
 * @param options Available options:
 *        - `-i`: Ignore case while comparing
 *        - `-c`: Prefix lines by the number of occurrences
 *        - `-d`: Only print duplicate lines, one for each group of identical lines
 */
export const uniq: UniqFunction;

/**
 * Sets global configuration variables
 * @param options Available options:
 *        - `+/-e`: exit upon error (`config.fatal`),
 *        - `+/-v`: verbose: show all commands (`config.verbose`),
 *        - `+/-f`: disable filename expansion (globbing)
 */
export function set(options: string): void;

// Configuration

export interface ShellConfig {
    /**
     * Suppresses all command output if true, except for echo() calls. Default is false.
     */
    silent: boolean;

    /**
     * If true the script will die on errors. Default is false.
     */
    fatal: boolean;

    /**
     * Will print each executed command to the screen.
     *
     * @default false
     */
    verbose: boolean;

    /**
     * Passed to glob.sync() instead of the default options ({}).
     */
    globOptions: glob.IOptions;

    /**
     * Absolute path of the Node binary. Default is null (inferred).
     */
    execPath: string | null;

    /**
     * Reset shell.config to the defaults.
     */
    reset(): void;
}

/**
 * The shelljs configuration.
 */
export const config: ShellConfig;
