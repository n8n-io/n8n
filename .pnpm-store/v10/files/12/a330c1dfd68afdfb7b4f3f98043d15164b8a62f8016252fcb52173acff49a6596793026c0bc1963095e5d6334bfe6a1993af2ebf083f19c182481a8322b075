/**
 * Core libraries that every NodeJS toolchain project should use.
 *
 * @packageDocumentation
 */

/// <reference types="node" />

import * as child_process from 'child_process';
import * as nodeFs from 'fs';
import * as nodePath from 'path';

/**
 * Specifies the behavior of APIs such as {@link FileSystem.copyFile} or
 * {@link FileSystem.createSymbolicLinkFile} when the output file path already exists.
 *
 * @remarks
 * For {@link FileSystem.copyFile} and related APIs, the "output file path" is
 * {@link IFileSystemCopyFileOptions.destinationPath}.
 *
 * For {@link FileSystem.createSymbolicLinkFile} and related APIs, the "output file path" is
 * {@link IFileSystemCreateLinkOptions.newLinkPath}.
 *
 * @public
 */
export declare enum AlreadyExistsBehavior {
    /**
     * If the output file path already exists, try to overwrite the existing object.
     *
     * @remarks
     * If overwriting the object would require recursively deleting a folder tree,
     * then the operation will fail.  As an example, suppose {@link FileSystem.copyFile}
     * is copying a single file `/a/b/c` to the destination path `/d/e`, and `/d/e` is a
     * nonempty folder.  In this situation, an error will be reported; specifying
     * `AlreadyExistsBehavior.Overwrite` does not help.  Empty folders can be overwritten
     * depending on the details of the implementation.
     */
    Overwrite = "overwrite",
    /**
     * If the output file path already exists, the operation will fail, and an error
     * will be reported.
     */
    Error = "error",
    /**
     * If the output file path already exists, skip this item, and continue the operation.
     */
    Ignore = "ignore"
}

/**
 * This exception can be thrown to indicate that an operation failed and an error message has already
 * been reported appropriately. Thus, the catch handler does not have responsibility for reporting
 * the error.
 *
 * @remarks
 * For example, suppose a tool writes interactive output to `console.log()`.  When an exception is thrown,
 * the `catch` handler will typically provide simplistic reporting such as this:
 *
 * ```ts
 * catch (error) {
 *   console.log("ERROR: " + error.message);
 * }
 * ```
 *
 * Suppose that the code performing the operation normally prints rich output to the console.  It may be able to
 * present an error message more nicely (for example, as part of a table, or structured log format).  Throwing
 * `AlreadyReportedError` provides a way to use exception handling to abort the operation, but instruct the `catch`
 * handler not to print an error a second time:
 *
 * ```ts
 * catch (error) {
 *   if (error instanceof AlreadyReportedError) {
 *     return;
 *   }
 *   console.log("ERROR: " + error.message);
 * }
 * ```
 *
 * @public
 */
export declare class AlreadyReportedError extends Error {
    constructor();
    static [Symbol.hasInstance](instance: object): boolean;
}

/**
 * Utilities for parallel asynchronous operations, for use with the system `Promise` APIs.
 *
 * @public
 */
export declare class Async {
    /**
     * Given an input array and a `callback` function, invoke the callback to start a
     * promise for each element in the array.  Returns an array containing the results.
     *
     * @remarks
     * This API is similar to the system `Array#map`, except that the loop is asynchronous,
     * and the maximum number of concurrent promises can be throttled
     * using {@link IAsyncParallelismOptions.concurrency}.
     *
     * If `callback` throws a synchronous exception, or if it returns a promise that rejects,
     * then the loop stops immediately.  Any remaining array items will be skipped, and
     * overall operation will reject with the first error that was encountered.
     *
     * @param iterable - the array of inputs for the callback function
     * @param callback - a function that starts an asynchronous promise for an element
     *   from the array
     * @param options - options for customizing the control flow
     * @returns an array containing the result for each callback, in the same order
     *   as the original input `array`
     */
    static mapAsync<TEntry, TRetVal>(iterable: Iterable<TEntry> | AsyncIterable<TEntry>, callback: (entry: TEntry, arrayIndex: number) => Promise<TRetVal>, options?: (IAsyncParallelismOptions & {
        weighted?: false;
    }) | undefined): Promise<TRetVal[]>;
    /**
     * Given an input array and a `callback` function, invoke the callback to start a
     * promise for each element in the array.  Returns an array containing the results.
     *
     * @remarks
     * This API is similar to the system `Array#map`, except that the loop is asynchronous,
     * and the maximum number of concurrent units can be throttled
     * using {@link IAsyncParallelismOptions.concurrency}. Using the {@link IAsyncParallelismOptions.weighted}
     * option, the weight of each operation can be specified, which determines how many concurrent units it takes up.
     *
     * If `callback` throws a synchronous exception, or if it returns a promise that rejects,
     * then the loop stops immediately.  Any remaining array items will be skipped, and
     * overall operation will reject with the first error that was encountered.
     *
     * @param iterable - the array of inputs for the callback function
     * @param callback - a function that starts an asynchronous promise for an element
     *   from the array
     * @param options - options for customizing the control flow
     * @returns an array containing the result for each callback, in the same order
     *   as the original input `array`
     */
    static mapAsync<TEntry extends IWeighted, TRetVal>(iterable: Iterable<TEntry> | AsyncIterable<TEntry>, callback: (entry: TEntry, arrayIndex: number) => Promise<TRetVal>, options: IAsyncParallelismOptions & {
        weighted: true;
    }): Promise<TRetVal[]>;
    private static _forEachWeightedAsync;
    /**
     * Given an input array and a `callback` function, invoke the callback to start a
     * promise for each element in the array.
     *
     * @remarks
     * This API is similar to the system `Array#forEach`, except that the loop is asynchronous,
     * and the maximum number of concurrent promises can be throttled
     * using {@link IAsyncParallelismOptions.concurrency}.
     *
     * If `callback` throws a synchronous exception, or if it returns a promise that rejects,
     * then the loop stops immediately.  Any remaining array items will be skipped, and
     * overall operation will reject with the first error that was encountered.
     *
     * @param iterable - the array of inputs for the callback function
     * @param callback - a function that starts an asynchronous promise for an element
     *   from the array
     * @param options - options for customizing the control flow
     */
    static forEachAsync<TEntry>(iterable: Iterable<TEntry> | AsyncIterable<TEntry>, callback: (entry: TEntry, arrayIndex: number) => Promise<void>, options?: (IAsyncParallelismOptions & {
        weighted?: false;
    }) | undefined): Promise<void>;
    /**
     * Given an input array and a `callback` function, invoke the callback to start a
     * promise for each element in the array.
     *
     * @remarks
     * This API is similar to the other `Array#forEachAsync`, except that each item can have
     * a weight that determines how many concurrent operations are allowed. The unweighted
     * `Array#forEachAsync` is a special case of this method where weight = 1 for all items.
     *
     * The maximum number of concurrent operations can still be throttled using
     * {@link IAsyncParallelismOptions.concurrency}, however it no longer determines the
     * maximum number of operations that can be in progress at once. Instead, it determines the
     * number of concurrency units that can be in progress at once. The weight of each operation
     * determines how many concurrency units it takes up. For example, if the concurrency is 2
     * and the first operation has a weight of 2, then only one more operation can be in progress.
     *
     * If `callback` throws a synchronous exception, or if it returns a promise that rejects,
     * then the loop stops immediately.  Any remaining array items will be skipped, and
     * overall operation will reject with the first error that was encountered.
     *
     * @param iterable - the array of inputs for the callback function
     * @param callback - a function that starts an asynchronous promise for an element
     *   from the array
     * @param options - options for customizing the control flow
     */
    static forEachAsync<TEntry extends IWeighted>(iterable: Iterable<TEntry> | AsyncIterable<TEntry>, callback: (entry: TEntry, arrayIndex: number) => Promise<void>, options: IAsyncParallelismOptions & {
        weighted: true;
    }): Promise<void>;
    /**
     * Return a promise that resolves after the specified number of milliseconds.
     */
    static sleepAsync(ms: number): Promise<void>;
    /**
     * Executes an async function and optionally retries it if it fails.
     */
    static runWithRetriesAsync<TResult>({ action, maxRetries, retryDelayMs }: IRunWithRetriesOptions<TResult>): Promise<TResult>;
    /**
     * Ensures that the argument is a valid {@link IWeighted}, with a `weight` argument that
     * is a positive integer or 0.
     */
    static validateWeightedIterable(operation: IWeighted): void;
    /**
     * Returns a Signal, a.k.a. a "deferred promise".
     */
    static getSignal(): [Promise<void>, () => void, (err: Error) => void];
}

/**
 * A queue that allows for asynchronous iteration. During iteration, the queue will wait until
 * the next item is pushed into the queue before yielding. If instead all queue items are consumed
 * and all callbacks have been called, the queue will return.
 *
 * @public
 */
export declare class AsyncQueue<T> implements AsyncIterable<[T, () => void]> {
    private _queue;
    private _onPushSignal;
    private _onPushResolve;
    constructor(iterable?: Iterable<T>);
    [Symbol.asyncIterator](): AsyncIterableIterator<[T, () => void]>;
    /**
     * Adds an item to the queue.
     *
     * @param item - The item to push into the queue.
     */
    push(item: T): void;
}

/**
 * A "branded type" is a primitive type with a compile-type key that makes it incompatible with other
 * aliases for the primitive type.
 *
 * @remarks
 *
 * Example usage:
 *
 * ```ts
 * // PhoneNumber is a branded type based on the "string" primitive.
 * type PhoneNumber = Brand<string, 'PhoneNumber'>;
 *
 * function createPhoneNumber(input: string): PhoneNumber {
 *   if (!/\d+(\-\d+)+/.test(input)) {
 *     throw new Error('Invalid phone number: ' + JSON.stringify(input));
 *   }
 *   return input as PhoneNumber;
 * }
 *
 * const p1: PhoneNumber = createPhoneNumber('123-456-7890');
 *
 * // PhoneNumber is a string and can be used as one:
 * const p2: string = p1;
 *
 * // But an arbitrary string cannot be implicitly type cast as PhoneNumber.
 * // ERROR: Type 'string' is not assignable to type 'PhoneNumber'
 * const p3: PhoneNumber = '123-456-7890';
 * ```
 *
 * For more information about this pattern, see {@link
 * https://github.com/Microsoft/TypeScript/blob/7b48a182c05ea4dea81bab73ecbbe9e013a79e99/src/compiler/types.ts#L693-L698
 * | this comment} explaining the TypeScript compiler's introduction of this pattern, and
 * {@link https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/ | this article}
 * explaining the technique in depth.
 *
 * @public
 */
export declare type Brand<T, BrandTag extends string> = T & {
    __brand: BrandTag;
};

/**
 * The allowed types of encodings, as supported by Node.js
 * @public
 */
export declare enum Encoding {
    Utf8 = "utf8"
}

/**
 * A helper for looking up TypeScript `enum` keys/values.
 *
 * @remarks
 * TypeScript enums implement a lookup table for mapping between their keys and values:
 *
 * ```ts
 * enum Colors {
 *   Red = 1
 * }
 *
 * // Prints "Red"
 * console.log(Colors[1]);
 *
 * // Prints "1"
 * console.log(Colors["Red]);
 * ```
 *
 * However the compiler's "noImplicitAny" validation has trouble with these mappings, because
 * there are so many possible types for the map elements:
 *
 * ```ts
 * function f(s: string): Colors | undefined {
 *   // (TS 7015) Element implicitly has an 'any' type because
 *   // index expression is not of type 'number'.
 *   return Colors[s];
 * }
 * ```
 *
 * The `Enum` helper provides a more specific, strongly typed way to access members:
 *
 * ```ts
 * function f(s: string): Colors | undefined {
 *   return Enum.tryGetValueByKey(Colors, s);
 * }
 * ```
 *
 * @public
 */
export declare class Enum {
    private constructor();
    /**
     * Returns an enum value, given its key. Returns `undefined` if no matching key is found.
     *
     * @example
     *
     * Example usage:
     * ```ts
     * enum Colors {
     *   Red = 1
     * }
     *
     * // Prints "1"
     * console.log(Enum.tryGetValueByKey(Colors, "Red"));
     *
     * // Prints "undefined"
     * console.log(Enum.tryGetValueByKey(Colors, "Black"));
     * ```
     */
    static tryGetValueByKey<TEnumValue>(enumObject: {
        [key: string]: TEnumValue | string;
        [key: number]: TEnumValue | string;
    }, key: string): TEnumValue | undefined;
    /**
     * This API is similar to {@link Enum.tryGetValueByKey}, except that it throws an exception
     * if the key is undefined.
     */
    static getValueByKey<TEnumValue>(enumObject: {
        [key: string]: TEnumValue | string;
        [key: number]: TEnumValue | string;
    }, key: string): TEnumValue;
    /**
     * Returns an enum string key, given its numeric value.  Returns `undefined` if no matching value
     * is found.
     *
     * @remarks
     * The TypeScript compiler only creates a reverse mapping for enum members whose value is numeric.
     * For example:
     *
     * ```ts
     * enum E {
     *   A = 1,
     *   B = 'c'
     * }
     *
     * // Prints "A"
     * console.log(E[1]);
     *
     * // Prints "undefined"
     * console.log(E["c"]);
     * ```
     *
     * @example
     *
     * Example usage:
     * ```ts
     * enum Colors {
     *   Red = 1,
     *   Blue = 'blue'
     * }
     *
     * // Prints "Red"
     * console.log(Enum.tryGetKeyByNumber(Colors, 1));
     *
     * // Prints "undefined"
     * console.log(Enum.tryGetKeyByNumber(Colors, -1));
     * ```
     */
    static tryGetKeyByNumber<TEnumValue, TEnumObject extends {
        [key: string]: TEnumValue;
    }>(enumObject: TEnumObject, value: number): keyof typeof enumObject | undefined;
    /**
     * This API is similar to {@link Enum.tryGetKeyByNumber}, except that it throws an exception
     * if the key is undefined.
     */
    static getKeyByNumber<TEnumValue, TEnumObject extends {
        [key: string]: TEnumValue;
    }>(enumObject: TEnumObject, value: number): keyof typeof enumObject;
}

/**
 * A map data structure that stores process environment variables.  On Windows
 * operating system, the variable names are case-insensitive.
 * @public
 */
export declare class EnvironmentMap {
    private readonly _map;
    /**
     * Whether the environment variable names are case-sensitive.
     *
     * @remarks
     * On Windows operating system, environment variables are case-insensitive.
     * The map will preserve the variable name casing from the most recent assignment operation.
     */
    readonly caseSensitive: boolean;
    constructor(environmentObject?: Record<string, string | undefined>);
    /**
     * Clears all entries, resulting in an empty map.
     */
    clear(): void;
    /**
     * Assigns the variable to the specified value.  A previous value will be overwritten.
     *
     * @remarks
     * The value can be an empty string.  To completely remove the entry, use
     * {@link EnvironmentMap.unset} instead.
     */
    set(name: string, value: string): void;
    /**
     * Removes the key from the map, if present.
     */
    unset(name: string): void;
    /**
     * Returns the value of the specified variable, or `undefined` if the map does not contain that name.
     */
    get(name: string): string | undefined;
    /**
     * Returns the map keys, which are environment variable names.
     */
    names(): IterableIterator<string>;
    /**
     * Returns the map entries.
     */
    entries(): IterableIterator<IEnvironmentEntry>;
    /**
     * Adds each entry from `environmentMap` to this map.
     */
    mergeFrom(environmentMap: EnvironmentMap): void;
    /**
     * Merges entries from a plain JavaScript object, such as would be used with the `process.env` API.
     */
    mergeFromObject(environmentObject?: Record<string, string | undefined>): void;
    /**
     * Returns the keys as a plain JavaScript object similar to the object returned by the `process.env` API.
     */
    toObject(): Record<string, string>;
}

/**
 * The Executable class provides a safe, portable, recommended solution for tools that need
 * to launch child processes.
 *
 * @remarks
 * The NodeJS child_process API provides a solution for launching child processes, however
 * its design encourages reliance on the operating system shell for certain features.
 * Invoking the OS shell is not safe, not portable, and generally not recommended:
 *
 * - Different shells have different behavior and command-line syntax, and which shell you
 *   will get with NodeJS is unpredictable.  There is no universal shell guaranteed to be
 *   available on all platforms.
 *
 * - If a command parameter contains symbol characters, a shell may interpret them, which
 *   can introduce a security vulnerability
 *
 * - Each shell has different rules for escaping these symbols.  On Windows, the default
 *   shell is incapable of escaping certain character sequences.
 *
 * The Executable API provides a pure JavaScript implementation of primitive shell-like
 * functionality for searching the default PATH, appending default file extensions on Windows,
 * and executing a file that may contain a POSIX shebang.  This primitive functionality
 * is sufficient (and recommended) for most tooling scenarios.
 *
 * If you need additional shell features such as wildcard globbing, environment variable
 * expansion, piping, or built-in commands, then we recommend to use the `@microsoft/rushell`
 * library instead.  Rushell is a pure JavaScript shell with a standard syntax that is
 * guaranteed to work consistently across all platforms.
 *
 * @public
 */
export declare class Executable {
    /**
     * Synchronously create a child process and optionally capture its output.
     *
     * @remarks
     * This function is similar to child_process.spawnSync().  The main differences are:
     *
     * - It does not invoke the OS shell unless the executable file is a shell script.
     * - Command-line arguments containing special characters are more accurately passed
     *   through to the child process.
     * - If the filename is missing a path, then the shell's default PATH will be searched.
     * - If the filename is missing a file extension, then Windows default file extensions
     *   will be searched.
     *
     * @param filename - The name of the executable file.  This string must not contain any
     * command-line arguments.  If the name contains any path delimiters, then the shell's
     * default PATH will not be searched.
     * @param args - The command-line arguments to be passed to the process.
     * @param options - Additional options
     * @returns the same data type as returned by the NodeJS child_process.spawnSync() API
     *
     * @privateRemarks
     *
     * NOTE: The NodeJS spawnSync() returns SpawnSyncReturns<string> or SpawnSyncReturns<Buffer>
     * polymorphically based on the options.encoding parameter value.  This is a fairly confusing
     * design.  In most cases, developers want string with the default encoding.  If/when someone
     * wants binary output or a non-default text encoding, we will introduce a separate API function
     * with a name like "spawnWithBufferSync".
     */
    static spawnSync(filename: string, args: string[], options?: IExecutableSpawnSyncOptions): child_process.SpawnSyncReturns<string>;
    /**
     * Start a child process.
     *
     * @remarks
     * This function is similar to child_process.spawn().  The main differences are:
     *
     * - It does not invoke the OS shell unless the executable file is a shell script.
     * - Command-line arguments containing special characters are more accurately passed
     *   through to the child process.
     * - If the filename is missing a path, then the shell's default PATH will be searched.
     * - If the filename is missing a file extension, then Windows default file extensions
     *   will be searched.
     *
     * This command is asynchronous, but it does not return a `Promise`.  Instead it returns
     * a Node.js `ChildProcess` supporting event notifications.
     *
     * @param filename - The name of the executable file.  This string must not contain any
     * command-line arguments.  If the name contains any path delimiters, then the shell's
     * default PATH will not be searched.
     * @param args - The command-line arguments to be passed to the process.
     * @param options - Additional options
     * @returns the same data type as returned by the NodeJS child_process.spawnSync() API
     */
    static spawn(filename: string, args: string[], options?: IExecutableSpawnOptions): child_process.ChildProcess;
    /** {@inheritDoc Executable.(waitForExitAsync:3)} */
    static waitForExitAsync(childProcess: child_process.ChildProcess, options: IWaitForExitWithStringOptions): Promise<IWaitForExitResult<string>>;
    /** {@inheritDoc Executable.(waitForExitAsync:3)} */
    static waitForExitAsync(childProcess: child_process.ChildProcess, options: IWaitForExitWithBufferOptions): Promise<IWaitForExitResult<Buffer>>;
    /**
     * Wait for a child process to exit and return the result.
     *
     * @param childProcess - The child process to wait for.
     * @param options - Options for waiting for the process to exit.
     */
    static waitForExitAsync(childProcess: child_process.ChildProcess, options?: IWaitForExitOptions): Promise<IWaitForExitResult<never>>;
    /**
     * Get the list of processes currently running on the system, keyed by the process ID.
     *
     * @remarks The underlying implementation depends on the operating system:
     * - On Windows, this uses the `wmic.exe` utility.
     * - On Unix, this uses the `ps` utility.
     */
    static getProcessInfoByIdAsync(): Promise<Map<number, IProcessInfo>>;
    /**
     * {@inheritDoc Executable.getProcessInfoByIdAsync}
     */
    static getProcessInfoById(): Map<number, IProcessInfo>;
    /**
     * Get the list of processes currently running on the system, keyed by the process name. All processes
     * with the same name will be grouped.
     *
     * @remarks The underlying implementation depends on the operating system:
     * - On Windows, this uses the `wmic.exe` utility.
     * - On Unix, this uses the `ps` utility.
     */
    static getProcessInfoByNameAsync(): Promise<Map<string, IProcessInfo[]>>;
    /**
     * {@inheritDoc Executable.getProcessInfoByNameAsync}
     */
    static getProcessInfoByName(): Map<string, IProcessInfo[]>;
    private static _buildCommandLineFixup;
    /**
     * Given a filename, this determines the absolute path of the executable file that would
     * be executed by a shell:
     *
     * - If the filename is missing a path, then the shell's default PATH will be searched.
     * - If the filename is missing a file extension, then Windows default file extensions
     *   will be searched.
     *
     * @remarks
     *
     * @param filename - The name of the executable file.  This string must not contain any
     * command-line arguments.  If the name contains any path delimiters, then the shell's
     * default PATH will not be searched.
     * @param options - optional other parameters
     * @returns the absolute path of the executable, or undefined if it was not found
     */
    static tryResolve(filename: string, options?: IExecutableResolveOptions): string | undefined;
    private static _tryResolve;
    private static _tryResolveFileExtension;
    private static _buildEnvironmentMap;
    /**
     * This is used when searching the shell PATH for an executable, to determine
     * whether a match should be skipped or not.  If it returns true, this does not
     * guarantee that the file can be successfully executed.
     */
    private static _canExecute;
    /**
     * Returns the list of folders where we will search for an executable,
     * based on the PATH environment variable.
     */
    private static _getSearchFolders;
    private static _getExecutableContext;
    /**
     * Given an input string containing special symbol characters, this inserts the "^" escape
     * character to ensure the symbols are interpreted literally by the Windows shell.
     */
    private static _getEscapedForWindowsShell;
    /**
     * Checks for characters that are unsafe to pass to a Windows batch file
     * due to the way that cmd.exe implements escaping.
     */
    private static _validateArgsForWindowsShell;
}

/**
 * Types for {@link IExecutableSpawnSyncOptions.stdio}
 * and {@link IExecutableSpawnOptions.stdio}
 * @public
 */
export declare type ExecutableStdioMapping = 'pipe' | 'ignore' | 'inherit' | ExecutableStdioStreamMapping[];

/**
 * Typings for one of the streams inside IExecutableSpawnSyncOptions.stdio.
 * @public
 */
export declare type ExecutableStdioStreamMapping = 'pipe' | 'ignore' | 'inherit' | NodeJS.WritableStream | NodeJS.ReadableStream | number | undefined;

/**
 * String constants for common filenames and parts of filenames.
 *
 * @public
 */
export declare const FileConstants: {
    /**
     * "package.json" - the configuration file that defines an NPM package
     */
    readonly PackageJson: "package.json";
};

/**
 * An `Error` subclass that should be thrown to report an unexpected state that specifically references
 * a location in a file.
 *
 * @remarks The file path provided to the FileError constructor is expected to exist on disk. FileError
 * should not be used for reporting errors that are not in reference to an existing file.
 *
 * @public
 */
export declare class FileError extends Error {
    /** @internal */
    static _sanitizedEnvironmentVariable: string | undefined;
    /** @internal */
    static _environmentVariableIsAbsolutePath: boolean;
    private static _environmentVariableBasePathFnMap;
    /** {@inheritdoc IFileErrorOptions.absolutePath} */
    readonly absolutePath: string;
    /** {@inheritdoc IFileErrorOptions.projectFolder} */
    readonly projectFolder: string;
    /** {@inheritdoc IFileErrorOptions.line} */
    readonly line: number | undefined;
    /** {@inheritdoc IFileErrorOptions.column} */
    readonly column: number | undefined;
    /**
     * Constructs a new instance of the {@link FileError} class.
     *
     * @param message - A message describing the error.
     * @param options - Options for the error.
     */
    constructor(message: string, options: IFileErrorOptions);
    /**
     * Get the Unix-formatted the error message.
     *
     * @override
     */
    toString(): string;
    /**
     * Get the formatted error message.
     *
     * @param options - Options for the error message format.
     */
    getFormattedErrorMessage(options?: IFileErrorFormattingOptions): string;
    private _evaluateBaseFolder;
    static [Symbol.hasInstance](instance: object): boolean;
}

/**
 * The format that the FileError message should conform to. The supported formats are:
 *  - Unix: `<path>:<line>:<column> - <message>`
 *  - VisualStudio: `<path>(<line>,<column>) - <message>`
 *
 * @public
 */
export declare type FileLocationStyle = 'Unix' | 'VisualStudio';

/**
 * The FileSystem API provides a complete set of recommended operations for interacting with the file system.
 *
 * @remarks
 * We recommend to use this instead of the native `fs` API, because `fs` is a minimal set of low-level
 * primitives that must be mapped for each supported operating system. The FileSystem API takes a
 * philosophical approach of providing "one obvious way" to do each operation. We also prefer synchronous
 * operations except in cases where there would be a clear performance benefit for using async, since synchronous
 * code is much easier to read and debug. Also, indiscriminate parallelism has been seen to actually worsen
 * performance, versus improving it.
 *
 * Note that in the documentation, we refer to "filesystem objects", this can be a
 * file, folder, symbolic link, hard link, directory junction, etc.
 *
 * @public
 */
export declare class FileSystem {
    /**
     * Returns true if the path exists on disk.
     * Behind the scenes it uses `fs.existsSync()`.
     * @remarks
     * There is a debate about the fact that after `fs.existsSync()` returns true,
     * the file might be deleted before fs.readSync() is called, which would imply that everybody
     * should catch a `readSync()` exception, and nobody should ever use `fs.existsSync()`.
     * We find this to be unpersuasive, since "unexceptional exceptions" really hinder the
     * break-on-exception debugging experience. Also, throwing/catching is generally slow.
     * @param path - The absolute or relative path to the filesystem object.
     */
    static exists(path: string): boolean;
    /**
     * An async version of {@link FileSystem.exists}.
     */
    static existsAsync(path: string): Promise<boolean>;
    /**
     * Gets the statistics for a particular filesystem object.
     * If the path is a link, this function follows the link and returns statistics about the link target.
     * Behind the scenes it uses `fs.statSync()`.
     * @param path - The absolute or relative path to the filesystem object.
     */
    static getStatistics(path: string): FileSystemStats;
    /**
     * An async version of {@link FileSystem.getStatistics}.
     */
    static getStatisticsAsync(path: string): Promise<FileSystemStats>;
    /**
     * Updates the accessed and modified timestamps of the filesystem object referenced by path.
     * Behind the scenes it uses `fs.utimesSync()`.
     * The caller should specify both times in the `times` parameter.
     * @param path - The path of the file that should be modified.
     * @param times - The times that the object should be updated to reflect.
     */
    static updateTimes(path: string, times: IFileSystemUpdateTimeParameters): void;
    /**
     * An async version of {@link FileSystem.updateTimes}.
     */
    static updateTimesAsync(path: string, times: IFileSystemUpdateTimeParameters): Promise<void>;
    /**
     * Changes the permissions (i.e. file mode bits) for a filesystem object.
     * Behind the scenes it uses `fs.chmodSync()`.
     * @param path - The absolute or relative path to the object that should be updated.
     * @param modeBits - POSIX-style file mode bits specified using the {@link PosixModeBits} enum
     */
    static changePosixModeBits(path: string, modeBits: PosixModeBits): void;
    /**
     * An async version of {@link FileSystem.changePosixModeBits}.
     */
    static changePosixModeBitsAsync(path: string, mode: PosixModeBits): Promise<void>;
    /**
     * Retrieves the permissions (i.e. file mode bits) for a filesystem object.
     * Behind the scenes it uses `fs.chmodSync()`.
     * @param path - The absolute or relative path to the object that should be updated.
     *
     * @remarks
     * This calls {@link FileSystem.getStatistics} to get the POSIX mode bits.
     * If statistics in addition to the mode bits are needed, it is more efficient
     * to call {@link FileSystem.getStatistics} directly instead.
     */
    static getPosixModeBits(path: string): PosixModeBits;
    /**
     * An async version of {@link FileSystem.getPosixModeBits}.
     */
    static getPosixModeBitsAsync(path: string): Promise<PosixModeBits>;
    /**
     * Returns a 10-character string representation of a PosixModeBits value similar to what
     * would be displayed by a command such as "ls -l" on a POSIX-like operating system.
     * @remarks
     * For example, `PosixModeBits.AllRead | PosixModeBits.AllWrite` would be formatted as "-rw-rw-rw-".
     * @param modeBits - POSIX-style file mode bits specified using the {@link PosixModeBits} enum
     */
    static formatPosixModeBits(modeBits: PosixModeBits): string;
    /**
     * Moves a file. The folder must exist, unless the `ensureFolderExists` option is provided.
     * Behind the scenes it uses `fs-extra.moveSync()`
     */
    static move(options: IFileSystemMoveOptions): void;
    /**
     * An async version of {@link FileSystem.move}.
     */
    static moveAsync(options: IFileSystemMoveOptions): Promise<void>;
    /**
     * Recursively creates a folder at a given path.
     * Behind the scenes is uses `fs-extra.ensureDirSync()`.
     * @remarks
     * Throws an exception if anything in the folderPath is not a folder.
     * @param folderPath - The absolute or relative path of the folder which should be created.
     */
    static ensureFolder(folderPath: string): void;
    /**
     * An async version of {@link FileSystem.ensureFolder}.
     */
    static ensureFolderAsync(folderPath: string): Promise<void>;
    /**
     * Reads the names of folder entries, not including "." or "..".
     * Behind the scenes it uses `fs.readdirSync()`.
     * @param folderPath - The absolute or relative path to the folder which should be read.
     * @param options - Optional settings that can change the behavior. Type: `IReadFolderOptions`
     */
    static readFolderItemNames(folderPath: string, options?: IFileSystemReadFolderOptions): string[];
    /**
     * An async version of {@link FileSystem.readFolderItemNames}.
     */
    static readFolderItemNamesAsync(folderPath: string, options?: IFileSystemReadFolderOptions): Promise<string[]>;
    /**
     * Reads the contents of the folder, not including "." or "..", returning objects including the
     * entry names and types.
     * Behind the scenes it uses `fs.readdirSync()`.
     * @param folderPath - The absolute or relative path to the folder which should be read.
     * @param options - Optional settings that can change the behavior. Type: `IReadFolderOptions`
     */
    static readFolderItems(folderPath: string, options?: IFileSystemReadFolderOptions): FolderItem[];
    /**
     * An async version of {@link FileSystem.readFolderItems}.
     */
    static readFolderItemsAsync(folderPath: string, options?: IFileSystemReadFolderOptions): Promise<FolderItem[]>;
    /**
     * Deletes a folder, including all of its contents.
     * Behind the scenes is uses `fs-extra.removeSync()`.
     * @remarks
     * Does not throw if the folderPath does not exist.
     * @param folderPath - The absolute or relative path to the folder which should be deleted.
     */
    static deleteFolder(folderPath: string): void;
    /**
     * An async version of {@link FileSystem.deleteFolder}.
     */
    static deleteFolderAsync(folderPath: string): Promise<void>;
    /**
     * Deletes the content of a folder, but not the folder itself. Also ensures the folder exists.
     * Behind the scenes it uses `fs-extra.emptyDirSync()`.
     * @remarks
     * This is a workaround for a common race condition, where the virus scanner holds a lock on the folder
     * for a brief period after it was deleted, causing EBUSY errors for any code that tries to recreate the folder.
     * @param folderPath - The absolute or relative path to the folder which should have its contents deleted.
     */
    static ensureEmptyFolder(folderPath: string): void;
    /**
     * An async version of {@link FileSystem.ensureEmptyFolder}.
     */
    static ensureEmptyFolderAsync(folderPath: string): Promise<void>;
    /**
     * Writes a text string to a file on disk, overwriting the file if it already exists.
     * Behind the scenes it uses `fs.writeFileSync()`.
     * @remarks
     * Throws an error if the folder doesn't exist, unless ensureFolder=true.
     * @param filePath - The absolute or relative path of the file.
     * @param contents - The text that should be written to the file.
     * @param options - Optional settings that can change the behavior. Type: `IWriteFileOptions`
     */
    static writeFile(filePath: string, contents: string | Buffer, options?: IFileSystemWriteFileOptions): void;
    /**
     * Writes the contents of multiple Uint8Arrays to a file on disk, overwriting the file if it already exists.
     * Behind the scenes it uses `fs.writevSync()`.
     *
     * This API is useful for writing large files efficiently, especially if the input is being concatenated from
     * multiple sources.
     *
     * @remarks
     * Throws an error if the folder doesn't exist, unless ensureFolder=true.
     * @param filePath - The absolute or relative path of the file.
     * @param contents - The content that should be written to the file.
     * @param options - Optional settings that can change the behavior.
     */
    static writeBuffersToFile(filePath: string, contents: ReadonlyArray<Uint8Array>, options?: IFileSystemWriteBinaryFileOptions): void;
    /**
     * An async version of {@link FileSystem.writeFile}.
     */
    static writeFileAsync(filePath: string, contents: string | Buffer, options?: IFileSystemWriteFileOptions): Promise<void>;
    /**
     * An async version of {@link FileSystem.writeBuffersToFile}.
     */
    static writeBuffersToFileAsync(filePath: string, contents: ReadonlyArray<Uint8Array>, options?: IFileSystemWriteBinaryFileOptions): Promise<void>;
    /**
     * Writes a text string to a file on disk, appending to the file if it already exists.
     * Behind the scenes it uses `fs.appendFileSync()`.
     * @remarks
     * Throws an error if the folder doesn't exist, unless ensureFolder=true.
     * @param filePath - The absolute or relative path of the file.
     * @param contents - The text that should be written to the file.
     * @param options - Optional settings that can change the behavior. Type: `IWriteFileOptions`
     */
    static appendToFile(filePath: string, contents: string | Buffer, options?: IFileSystemWriteFileOptions): void;
    /**
     * An async version of {@link FileSystem.appendToFile}.
     */
    static appendToFileAsync(filePath: string, contents: string | Buffer, options?: IFileSystemWriteFileOptions): Promise<void>;
    /**
     * Reads the contents of a file into a string.
     * Behind the scenes it uses `fs.readFileSync()`.
     * @param filePath - The relative or absolute path to the file whose contents should be read.
     * @param options - Optional settings that can change the behavior. Type: `IReadFileOptions`
     */
    static readFile(filePath: string, options?: IFileSystemReadFileOptions): string;
    /**
     * An async version of {@link FileSystem.readFile}.
     */
    static readFileAsync(filePath: string, options?: IFileSystemReadFileOptions): Promise<string>;
    /**
     * Reads the contents of a file into a buffer.
     * Behind the scenes is uses `fs.readFileSync()`.
     * @param filePath - The relative or absolute path to the file whose contents should be read.
     */
    static readFileToBuffer(filePath: string): Buffer;
    /**
     * An async version of {@link FileSystem.readFileToBuffer}.
     */
    static readFileToBufferAsync(filePath: string): Promise<Buffer>;
    /**
     * Copies a single file from one location to another.
     * By default, destinationPath is overwritten if it already exists.
     *
     * @remarks
     * The `copyFile()` API cannot be used to copy folders.  It copies at most one file.
     * Use {@link FileSystem.copyFiles} if you need to recursively copy a tree of folders.
     *
     * The implementation is based on `copySync()` from the `fs-extra` package.
     */
    static copyFile(options: IFileSystemCopyFileOptions): void;
    /**
     * An async version of {@link FileSystem.copyFile}.
     */
    static copyFileAsync(options: IFileSystemCopyFileOptions): Promise<void>;
    /**
     * Copies a file or folder from one location to another, recursively copying any folder contents.
     * By default, destinationPath is overwritten if it already exists.
     *
     * @remarks
     * If you only intend to copy a single file, it is recommended to use {@link FileSystem.copyFile}
     * instead to more clearly communicate the intended operation.
     *
     * The implementation is based on `copySync()` from the `fs-extra` package.
     */
    static copyFiles(options: IFileSystemCopyFilesOptions): void;
    /**
     * An async version of {@link FileSystem.copyFiles}.
     */
    static copyFilesAsync(options: IFileSystemCopyFilesAsyncOptions): Promise<void>;
    /**
     * Deletes a file. Can optionally throw if the file doesn't exist.
     * Behind the scenes it uses `fs.unlinkSync()`.
     * @param filePath - The absolute or relative path to the file that should be deleted.
     * @param options - Optional settings that can change the behavior. Type: `IDeleteFileOptions`
     */
    static deleteFile(filePath: string, options?: IFileSystemDeleteFileOptions): void;
    /**
     * An async version of {@link FileSystem.deleteFile}.
     */
    static deleteFileAsync(filePath: string, options?: IFileSystemDeleteFileOptions): Promise<void>;
    /**
     * Gets the statistics of a filesystem object. Does NOT follow the link to its target.
     * Behind the scenes it uses `fs.lstatSync()`.
     * @param path - The absolute or relative path to the filesystem object.
     */
    static getLinkStatistics(path: string): FileSystemStats;
    /**
     * An async version of {@link FileSystem.getLinkStatistics}.
     */
    static getLinkStatisticsAsync(path: string): Promise<FileSystemStats>;
    /**
     * If `path` refers to a symbolic link, this returns the path of the link target, which may be
     * an absolute or relative path.
     *
     * @remarks
     * If `path` refers to a filesystem object that is not a symbolic link, then an `ErrnoException` is thrown
     * with code 'UNKNOWN'.  If `path` does not exist, then an `ErrnoException` is thrown with code `ENOENT`.
     *
     * @param path - The absolute or relative path to the symbolic link.
     * @returns the path of the link target
     */
    static readLink(path: string): string;
    /**
     * An async version of {@link FileSystem.readLink}.
     */
    static readLinkAsync(path: string): Promise<string>;
    /**
     * Creates an NTFS "directory junction" on Windows operating systems; for other operating systems, it
     * creates a regular symbolic link.  The link target must be a folder, not a file.
     * Behind the scenes it uses `fs.symlinkSync()`.
     *
     * @remarks
     * For security reasons, Windows operating systems by default require administrator elevation to create
     * symbolic links.  As a result, on Windows it's generally recommended for Node.js tools to use hard links
     * (for files) or NTFS directory junctions (for folders), since regular users are allowed to create them.
     * Hard links and junctions are less vulnerable to symlink attacks because they cannot reference a network share,
     * and their target must exist at the time of link creation.  Non-Windows operating systems generally don't
     * restrict symlink creation, and as such are more vulnerable to symlink attacks.  Note that Windows can be
     * configured to permit regular users to create symlinks, for example by enabling Windows 10 "developer mode."
     *
     * A directory junction requires the link source and target to both be located on local disk volumes;
     * if not, use a symbolic link instead.
     */
    static createSymbolicLinkJunction(options: IFileSystemCreateLinkOptions): void;
    /**
     * An async version of {@link FileSystem.createSymbolicLinkJunction}.
     */
    static createSymbolicLinkJunctionAsync(options: IFileSystemCreateLinkOptions): Promise<void>;
    /**
     * Creates a symbolic link to a file.  On Windows operating systems, this may require administrator elevation.
     * Behind the scenes it uses `fs.symlinkSync()`.
     *
     * @remarks
     * To avoid administrator elevation on Windows, use {@link FileSystem.createHardLink} instead.
     *
     * On Windows operating systems, the NTFS file system distinguishes file symlinks versus directory symlinks:
     * If the target is not the correct type, the symlink will be created successfully, but will fail to resolve.
     * Other operating systems do not make this distinction, in which case {@link FileSystem.createSymbolicLinkFile}
     * and {@link FileSystem.createSymbolicLinkFolder} can be used interchangeably, but doing so will make your
     * tool incompatible with Windows.
     */
    static createSymbolicLinkFile(options: IFileSystemCreateLinkOptions): void;
    /**
     * An async version of {@link FileSystem.createSymbolicLinkFile}.
     */
    static createSymbolicLinkFileAsync(options: IFileSystemCreateLinkOptions): Promise<void>;
    /**
     * Creates a symbolic link to a folder.  On Windows operating systems, this may require administrator elevation.
     * Behind the scenes it uses `fs.symlinkSync()`.
     *
     * @remarks
     * To avoid administrator elevation on Windows, use {@link FileSystem.createSymbolicLinkJunction} instead.
     *
     * On Windows operating systems, the NTFS file system distinguishes file symlinks versus directory symlinks:
     * If the target is not the correct type, the symlink will be created successfully, but will fail to resolve.
     * Other operating systems do not make this distinction, in which case {@link FileSystem.createSymbolicLinkFile}
     * and {@link FileSystem.createSymbolicLinkFolder} can be used interchangeably, but doing so will make your
     * tool incompatible with Windows.
     */
    static createSymbolicLinkFolder(options: IFileSystemCreateLinkOptions): void;
    /**
     * An async version of {@link FileSystem.createSymbolicLinkFolder}.
     */
    static createSymbolicLinkFolderAsync(options: IFileSystemCreateLinkOptions): Promise<void>;
    /**
     * Creates a hard link.  The link target must be a file, not a folder.
     * Behind the scenes it uses `fs.linkSync()`.
     *
     * @remarks
     * For security reasons, Windows operating systems by default require administrator elevation to create
     * symbolic links.  As a result, on Windows it's generally recommended for Node.js tools to use hard links
     * (for files) or NTFS directory junctions (for folders), since regular users are allowed to create them.
     * Hard links and junctions are less vulnerable to symlink attacks because they cannot reference a network share,
     * and their target must exist at the time of link creation.  Non-Windows operating systems generally don't
     * restrict symlink creation, and as such are more vulnerable to symlink attacks.  Note that Windows can be
     * configured to permit regular users to create symlinks, for example by enabling Windows 10 "developer mode."
     *
     * A hard link requires the link source and target to both be located on same disk volume;
     * if not, use a symbolic link instead.
     */
    static createHardLink(options: IFileSystemCreateLinkOptions): void;
    /**
     * An async version of {@link FileSystem.createHardLink}.
     */
    static createHardLinkAsync(options: IFileSystemCreateLinkOptions): Promise<void>;
    /**
     * Follows a link to its destination and returns the absolute path to the final target of the link.
     * Behind the scenes it uses `fs.realpathSync()`.
     * @param linkPath - The path to the link.
     */
    static getRealPath(linkPath: string): string;
    /**
     * An async version of {@link FileSystem.getRealPath}.
     */
    static getRealPathAsync(linkPath: string): Promise<string>;
    /**
     * Returns true if the error object indicates the file or folder already exists (`EEXIST`).
     */
    static isExistError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the file or folder does not exist (`ENOENT` or `ENOTDIR`)
     */
    static isNotExistError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the file does not exist (`ENOENT`).
     */
    static isFileDoesNotExistError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the folder does not exist (`ENOTDIR`).
     */
    static isFolderDoesNotExistError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the target is a directory (`EISDIR`).
     */
    static isDirectoryError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the target is not a directory (`ENOTDIR`).
     */
    static isNotDirectoryError(error: Error): boolean;
    /**
     * Returns true if the error object indicates that the `unlink` system call failed
     * due to a permissions issue (`EPERM`).
     */
    static isUnlinkNotPermittedError(error: Error): boolean;
    /**
     * Detects if the provided error object is a `NodeJS.ErrnoException`
     */
    static isErrnoException(error: Error): error is NodeJS.ErrnoException;
    private static _handleLink;
    private static _handleLinkAsync;
    private static _wrapException;
    private static _wrapExceptionAsync;
    private static _updateErrorMessage;
}

/**
 * Callback function type for {@link IFileSystemCopyFilesAsyncOptions.filter}
 * @public
 */
export declare type FileSystemCopyFilesAsyncFilter = (sourcePath: string, destinationPath: string) => Promise<boolean>;

/**
 * Callback function type for {@link IFileSystemCopyFilesOptions.filter}
 * @public
 */
export declare type FileSystemCopyFilesFilter = (sourcePath: string, destinationPath: string) => boolean;

/**
 * An alias for the Node.js `fs.Stats` object.
 *
 * @remarks
 * This avoids the need to import the `fs` package when using the {@link FileSystem} API.
 * @public
 */
export declare type FileSystemStats = nodeFs.Stats;

/**
 * API for interacting with file handles.
 * @public
 */
export declare class FileWriter {
    /**
     * The `filePath` that was passed to {@link FileWriter.open}.
     */
    readonly filePath: string;
    private _fileDescriptor;
    private constructor();
    /**
     * Opens a new file handle to the file at the specified path and given mode.
     * Behind the scenes it uses `fs.openSync()`.
     * The behaviour of this function is platform specific.
     * See: https://nodejs.org/docs/latest-v8.x/api/fs.html#fs_fs_open_path_flags_mode_callback
     * @param filePath - The absolute or relative path to the file handle that should be opened.
     * @param flags - The flags for opening the handle
     */
    static open(filePath: string, flags?: IFileWriterFlags): FileWriter;
    /**
     * Helper function to convert the file writer array to a Node.js style string (e.g. "wx" or "a").
     * @param flags - The flags that should be converted.
     */
    private static _convertFlagsForNode;
    /**
     * Writes some text to the given file handle. Throws if the file handle has been closed.
     * Behind the scenes it uses `fs.writeSync()`.
     * @param text - The text to write to the file.
     */
    write(text: string): void;
    /**
     * Closes the file handle permanently. No operations can be made on this file handle after calling this.
     * Behind the scenes it uses `fs.closeSync()` and releases the file descriptor to be re-used.
     *
     * @remarks
     * The `close()` method can be called more than once; additional calls are ignored.
     */
    close(): void;
    /**
     * Gets the statistics for the given file handle. Throws if the file handle has been closed.
     * Behind the scenes it uses `fs.statSync()`.
     */
    getStatistics(): FileSystemStats;
}

/**
 * String constants for common folder names.
 *
 * @public
 */
export declare const FolderConstants: {
    /**
     * ".git" - the data storage for a Git working folder
     */
    readonly Git: ".git";
    /**
     * "node_modules" - the folder where package managers install their files
     */
    readonly NodeModules: "node_modules";
};

/**
 * An alias for the Node.js `fs.Dirent` object.
 *
 * @remarks
 * This avoids the need to import the `fs` package when using the {@link FileSystem} API.
 * @public
 */
export declare type FolderItem = nodeFs.Dirent;

/**
 * Options for controlling the parallelism of asynchronous operations.
 *
 * @remarks
 * Used with {@link (Async:class).(mapAsync:1)}, {@link (Async:class).(mapAsync:2)} and
 * {@link (Async:class).(forEachAsync:1)}, and {@link (Async:class).(forEachAsync:2)}.
 *
 * @public
 */
export declare interface IAsyncParallelismOptions {
    /**
     * Optionally used with the  {@link (Async:class).(mapAsync:1)}, {@link (Async:class).(mapAsync:2)} and
     * {@link (Async:class).(forEachAsync:1)}, and {@link (Async:class).(forEachAsync:2)} to limit the maximum
     * number of concurrent promises to the specified number.
     */
    concurrency?: number;
    /**
     * Optionally used with the {@link (Async:class).(forEachAsync:2)} to enable weighted operations where an operation can
     * take up more or less than one concurrency unit.
     */
    weighted?: boolean;
}

/**
 * This interface is part of the {@link IPackageJson} file format. It is used for the
 * "dependenciesMeta" field.
 * @public
 */
export declare interface IDependenciesMetaTable {
    [dependencyName: string]: {
        injected?: boolean;
    };
}

/**
 * A process environment variable name and its value.  Used by {@link EnvironmentMap}.
 * @public
 */
export declare interface IEnvironmentEntry {
    /**
     * The name of the environment variable.
     */
    name: string;
    /**
     * The value of the environment variable.
     */
    value: string;
}

/**
 * Options for Executable.tryResolve().
 * @public
 */
export declare interface IExecutableResolveOptions {
    /**
     * The current working directory.  If omitted, process.cwd() will be used.
     */
    currentWorkingDirectory?: string;
    /**
     * The environment variables for the child process.
     *
     * @remarks
     * If `environment` and `environmentMap` are both omitted, then `process.env` will be used.
     * If `environment` and `environmentMap` cannot both be specified.
     */
    environment?: NodeJS.ProcessEnv;
    /**
     * The environment variables for the child process.
     *
     * @remarks
     * If `environment` and `environmentMap` are both omitted, then `process.env` will be used.
     * If `environment` and `environmentMap` cannot both be specified.
     */
    environmentMap?: EnvironmentMap;
}

/**
 * Options for {@link Executable.spawn}
 * @public
 */
export declare interface IExecutableSpawnOptions extends IExecutableResolveOptions {
    /**
     * The stdio mappings for the child process.
     *
     * NOTE: If IExecutableSpawnSyncOptions.input is provided, it will take precedence
     * over the stdin mapping (stdio[0]).
     */
    stdio?: ExecutableStdioMapping;
}

/**
 * Options for {@link Executable.spawnSync}
 * @public
 */
export declare interface IExecutableSpawnSyncOptions extends IExecutableResolveOptions {
    /**
     * The content to be passed to the child process's stdin.
     *
     * NOTE: If specified, this content replaces any IExecutableSpawnSyncOptions.stdio[0]
     * mapping for stdin.
     */
    input?: string;
    /**
     * The stdio mappings for the child process.
     *
     * NOTE: If IExecutableSpawnSyncOptions.input is provided, it will take precedence
     * over the stdin mapping (stdio[0]).
     */
    stdio?: ExecutableStdioMapping;
    /**
     * The maximum time the process is allowed to run before it will be terminated.
     */
    timeoutMs?: number;
    /**
     * The largest amount of bytes allowed on stdout or stderr for this synchronous operation.
     * If exceeded, the child process will be terminated.  The default is 200 * 1024.
     */
    maxBuffer?: number;
}

/**
 * Provides options for the output message of a file error.
 *
 * @public
 */
export declare interface IFileErrorFormattingOptions {
    /**
     * The format for the error message. If no format is provided, format 'Unix' is used by default.
     */
    format?: FileLocationStyle;
}

/**
 * Provides options for the creation of a FileError.
 *
 * @public
 */
export declare interface IFileErrorOptions {
    /**
     * The absolute path to the file that contains the error.
     */
    absolutePath: string;
    /**
     * The root folder for the project that the error is in relation to.
     */
    projectFolder: string;
    /**
     * The line number of the error in the target file. Minimum value is 1.
     */
    line?: number;
    /**
     * The column number of the error in the target file. Minimum value is 1.
     */
    column?: number;
}

/**
 * @public
 */
export declare interface IFileSystemCopyFileBaseOptions {
    /**
     * The path of the existing object to be copied.
     * The path may be absolute or relative.
     */
    sourcePath: string;
    /**
     * Specifies what to do if the destination path already exists.
     * @defaultValue {@link AlreadyExistsBehavior.Overwrite}
     */
    alreadyExistsBehavior?: AlreadyExistsBehavior;
}

/**
 * The options for {@link FileSystem.copyFile}
 * @public
 */
export declare interface IFileSystemCopyFileOptions extends IFileSystemCopyFileBaseOptions {
    /**
     * The path that the object will be copied to.
     * The path may be absolute or relative.
     */
    destinationPath: string;
}

/**
 * The options for {@link FileSystem.copyFilesAsync}
 * @public
 */
export declare interface IFileSystemCopyFilesAsyncOptions {
    /**
     * The starting path of the file or folder to be copied.
     * The path may be absolute or relative.
     */
    sourcePath: string;
    /**
     * The path that the files will be copied to.
     * The path may be absolute or relative.
     */
    destinationPath: string;
    /**
     * If true, then when copying symlinks, copy the target object instead of copying the link.
     */
    dereferenceSymlinks?: boolean;
    /**
     * Specifies what to do if a destination path already exists.
     *
     * @remarks
     * This setting is applied individually for each file being copied.
     * For example, `AlreadyExistsBehavior.Overwrite` will not recursively delete a folder
     * whose path corresponds to an individual file that is being copied to that location.
     */
    alreadyExistsBehavior?: AlreadyExistsBehavior;
    /**
     * If true, then the target object will be assigned "last modification" and "last access" timestamps
     * that are the same as the source.  Otherwise, the OS default timestamps are assigned.
     */
    preserveTimestamps?: boolean;
    /**
     * A callback that will be invoked for each path that is copied.  The callback can return `false`
     * to cause the object to be excluded from the operation.
     */
    filter?: FileSystemCopyFilesAsyncFilter | FileSystemCopyFilesFilter;
}

/**
 * The options for {@link FileSystem.copyFiles}
 * @public
 */
export declare interface IFileSystemCopyFilesOptions extends IFileSystemCopyFilesAsyncOptions {
    /**  {@inheritdoc IFileSystemCopyFilesAsyncOptions.filter} */
    filter?: FileSystemCopyFilesFilter;
}

/**
 * The options for {@link FileSystem.createSymbolicLinkJunction}, {@link FileSystem.createSymbolicLinkFile},
 * {@link FileSystem.createSymbolicLinkFolder}, and {@link FileSystem.createHardLink}.
 *
 * @public
 */
export declare interface IFileSystemCreateLinkOptions {
    /**
     * The newly created symbolic link will point to `linkTargetPath` as its target.
     */
    linkTargetPath: string;
    /**
     * The newly created symbolic link will have this path.
     */
    newLinkPath: string;
    /**
     * Specifies what to do if the path to create already exists.
     * The default is `AlreadyExistsBehavior.Error`.
     */
    alreadyExistsBehavior?: AlreadyExistsBehavior;
}

/**
 * The options for {@link FileSystem.deleteFile}
 * @public
 */
export declare interface IFileSystemDeleteFileOptions {
    /**
     * If true, will throw an exception if the file did not exist before `deleteFile()` was called.
     * @defaultValue false
     */
    throwIfNotExists?: boolean;
}

/**
 * The options for {@link FileSystem.move}
 * @public
 */
export declare interface IFileSystemMoveOptions {
    /**
     * The path of the existing object to be moved.
     * The path may be absolute or relative.
     */
    sourcePath: string;
    /**
     * The new path for the object.
     * The path may be absolute or relative.
     */
    destinationPath: string;
    /**
     * If true, will overwrite the file if it already exists.
     * @defaultValue true
     */
    overwrite?: boolean;
    /**
     * If true, will ensure the folder is created before writing the file.
     * @defaultValue false
     */
    ensureFolderExists?: boolean;
}

/**
 * The options for {@link FileSystem.readFile}
 * @public
 */
export declare interface IFileSystemReadFileOptions {
    /**
     * If specified, will change the encoding of the file that will be written.
     * @defaultValue Encoding.Utf8
     */
    encoding?: Encoding;
    /**
     * If specified, will normalize line endings to the specified style of newline.
     * @defaultValue `undefined` which means no conversion will be performed
     */
    convertLineEndings?: NewlineKind;
}

/**
 * The options for {@link FileSystem.readFolderItems} and {@link FileSystem.readFolderItemNames}.
 * @public
 */
export declare interface IFileSystemReadFolderOptions {
    /**
     * If true, returns the absolute paths of the files in the folder.
     * @defaultValue false
     */
    absolutePaths?: boolean;
}

/**
 * The options for {@link FileSystem.updateTimes}
 * Both times must be specified.
 * @public
 */
export declare interface IFileSystemUpdateTimeParameters {
    /**
     * The POSIX epoch time or Date when this was last accessed.
     */
    accessedTime: number | Date;
    /**
     * The POSIX epoch time or Date when this was last modified
     */
    modifiedTime: number | Date;
}

/**
 * The options for {@link FileSystem.writeBuffersToFile}
 * @public
 */
export declare interface IFileSystemWriteBinaryFileOptions {
    /**
     * If true, will ensure the folder is created before writing the file.
     * @defaultValue false
     */
    ensureFolderExists?: boolean;
}

/**
 * The options for {@link FileSystem.writeFile}
 * @public
 */
export declare interface IFileSystemWriteFileOptions extends IFileSystemWriteBinaryFileOptions {
    /**
     * If specified, will normalize line endings to the specified style of newline.
     * @defaultValue `undefined` which means no conversion will be performed
     */
    convertLineEndings?: NewlineKind;
    /**
     * If specified, will change the encoding of the file that will be written.
     * @defaultValue "utf8"
     */
    encoding?: Encoding;
}

/**
 * Interface which represents the flags about which mode the file should be opened in.
 * @public
 */
export declare interface IFileWriterFlags {
    /**
     * Open file for appending.
     */
    append?: boolean;
    /**
     * Fails if path exists. The exclusive flag ensures that path is newly created.
     *
     * @remarks
     * On POSIX-like operating systems, path is considered to exist even if it is a symlink to a
     * non-existent file.  The exclusive flag may or may not work with network file systems.
     *
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    exclusive?: boolean;
}

/**
 * Common options shared by {@link IImportResolveModuleAsyncOptions} and {@link IImportResolvePackageAsyncOptions}
 * @public
 */
export declare interface IImportResolveAsyncOptions extends IImportResolveOptions {
    /**
     * A function used to resolve the realpath of a provided file path.
     *
     * @remarks
     * This is used to resolve symlinks and other non-standard file paths. By default, this uses the
     * {@link FileSystem.getRealPath} function. However, it can be overridden to use a custom implementation
     * which may be faster, more accurate, or provide support for additional non-standard file paths.
     */
    getRealPathAsync?: (filePath: string) => Promise<string>;
}

/**
 * Options for {@link Import.resolveModuleAsync}
 * @public
 */
export declare interface IImportResolveModuleAsyncOptions extends IImportResolveAsyncOptions {
    /**
     * The module identifier to resolve. For example "\@rushstack/node-core-library" or
     * "\@rushstack/node-core-library/lib/index.js"
     */
    modulePath: string;
}

/**
 * Options for {@link Import.resolveModule}
 * @public
 */
export declare interface IImportResolveModuleOptions extends IImportResolveOptions {
    /**
     * The module identifier to resolve. For example "\@rushstack/node-core-library" or
     * "\@rushstack/node-core-library/lib/index.js"
     */
    modulePath: string;
}

/**
 * Common options shared by {@link IImportResolveModuleOptions} and {@link IImportResolvePackageOptions}
 * @public
 */
export declare interface IImportResolveOptions {
    /**
     * The path from which {@link IImportResolveModuleOptions.modulePath} or
     * {@link IImportResolvePackageOptions.packageName} should be resolved.
     */
    baseFolderPath: string;
    /**
     * If true, if the package name matches a Node.js system module, then the return
     * value will be the package name without any path.
     *
     * @remarks
     * This will take precedence over an installed NPM package of the same name.
     *
     * Example:
     * ```ts
     * // Returns the string "fs" indicating the Node.js system module
     * Import.resolveModulePath({
     *   resolvePath: "fs",
     *   basePath: process.cwd()
     * })
     * ```
     */
    includeSystemModules?: boolean;
    /**
     * If true, then resolvePath is allowed to refer to the package.json of the active project.
     *
     * @remarks
     * This will take precedence over any installed dependency with the same name.
     * Note that this requires an additional PackageJsonLookup calculation.
     *
     * Example:
     * ```ts
     * // Returns an absolute path to the current package
     * Import.resolveModulePath({
     *   resolvePath: "current-project",
     *   basePath: process.cwd(),
     *   allowSelfReference: true
     * })
     * ```
     */
    allowSelfReference?: boolean;
    /**
     * A function used to resolve the realpath of a provided file path.
     *
     * @remarks
     * This is used to resolve symlinks and other non-standard file paths. By default, this uses the
     * {@link FileSystem.getRealPath} function. However, it can be overridden to use a custom implementation
     * which may be faster, more accurate, or provide support for additional non-standard file paths.
     */
    getRealPath?: (filePath: string) => string;
}

/**
 * Options for {@link Import.resolvePackageAsync}
 * @public
 */
export declare interface IImportResolvePackageAsyncOptions extends IImportResolveAsyncOptions {
    /**
     * The package name to resolve. For example "\@rushstack/node-core-library"
     */
    packageName: string;
}

/**
 * Options for {@link Import.resolvePackage}
 * @public
 */
export declare interface IImportResolvePackageOptions extends IImportResolveOptions {
    /**
     * The package name to resolve. For example "\@rushstack/node-core-library"
     */
    packageName: string;
    /**
     * If true, then the module path will be resolved using Node.js's built-in resolution algorithm.
     *
     * @remarks
     * This allows reusing Node's built-in resolver cache.
     * This implies `allowSelfReference: true`. The passed `getRealPath` will only be used on `baseFolderPath`.
     */
    useNodeJSResolver?: boolean;
}

/**
 * Options for {@link JsonFile.loadAndValidate} and {@link JsonFile.loadAndValidateAsync}
 *
 * @public
 */
export declare interface IJsonFileLoadAndValidateOptions extends IJsonFileParseOptions, IJsonSchemaValidateOptions {
}

/**
 * Options for {@link JsonFile.parseString}, {@link JsonFile.load}, and {@link JsonFile.loadAsync}.
 *
 * @public
 */
export declare interface IJsonFileParseOptions {
    /**
     * Specifies the variant of JSON syntax to be used.
     *
     * @defaultValue
     * {@link JsonSyntax.Json5}
     *
     * NOTE: This default will be changed to `JsonSyntax.JsonWithComments` in a future release.
     */
    jsonSyntax?: JsonSyntax;
}

/**
 * Options for {@link JsonFile.save} and {@link JsonFile.saveAsync}.
 *
 * @public
 */
export declare interface IJsonFileSaveOptions extends IJsonFileStringifyOptions {
    /**
     * If there is an existing file, and the contents have not changed, then
     * don't write anything; this preserves the old timestamp.
     */
    onlyIfChanged?: boolean;
    /**
     * Creates the folder recursively using FileSystem.ensureFolder()
     * Defaults to false.
     */
    ensureFolderExists?: boolean;
    /**
     * If true, use the "jju" library to preserve the existing JSON formatting:  The file will be loaded
     * from the target filename, the new content will be merged in (preserving whitespace and comments),
     * and then the file will be overwritten with the merged contents.  If the target file does not exist,
     * then the file is saved normally.
     */
    updateExistingFile?: boolean;
}

/**
 * Options for {@link JsonFile.stringify}
 *
 * @public
 */
export declare interface IJsonFileStringifyOptions extends IJsonFileParseOptions {
    /**
     * If provided, the specified newline type will be used instead of the default `\r\n`.
     */
    newlineConversion?: NewlineKind;
    /**
     * By default, {@link JsonFile.stringify} validates that the object does not contain any
     * keys whose value is `undefined`.  To disable this validation, set
     * {@link IJsonFileStringifyOptions.ignoreUndefinedValues} to `true`
     * which causes such keys to be silently discarded, consistent with the system `JSON.stringify()`.
     *
     * @remarks
     *
     * The JSON file format can represent `null` values ({@link JsonNull}) but not `undefined` values.
     * In ECMAScript code however, we generally avoid `null` and always represent empty states
     * as `undefined`, because it is the default value of missing/uninitialized variables.
     * (In practice, distinguishing "null" versus "uninitialized" has more drawbacks than benefits.)
     * This poses a problem when serializing ECMAScript objects that contain `undefined` members.
     * As a safeguard, {@link JsonFile} will report an error if any `undefined` values are encountered
     * during serialization.  Set {@link IJsonFileStringifyOptions.ignoreUndefinedValues} to `true`
     * to disable this safeguard.
     */
    ignoreUndefinedValues?: boolean;
    /**
     * If true, then the "jju" library will be used to improve the text formatting.
     * Note that this is slightly slower than the native JSON.stringify() implementation.
     */
    prettyFormatting?: boolean;
    /**
     * If specified, this header will be prepended to the start of the file.  The header must consist
     * of lines prefixed by "//" characters.
     * @remarks
     * When used with {@link IJsonFileSaveOptions.updateExistingFile}
     * or {@link JsonFile.updateString}, the header will ONLY be added for a newly created file.
     */
    headerComment?: string;
}

/**
 * A definition for a custom format to consider during validation.
 * @public
 */
export declare interface IJsonSchemaCustomFormat<T extends string | number> {
    /**
     * The base JSON type.
     */
    type: T extends string ? 'string' : T extends number ? 'number' : never;
    /**
     * A validation function for the format.
     * @param data - The raw field data to validate.
     * @returns whether the data is valid according to the format.
     */
    validate: (data: T) => boolean;
}

/**
 * Callback function arguments for {@link JsonSchema.validateObjectWithCallback}
 * @public
 */
export declare interface IJsonSchemaErrorInfo {
    /**
     * The ajv error list, formatted as an indented text string.
     */
    details: string;
}

/**
 * Options for {@link JsonSchema.fromFile}
 * @public
 */
export declare type IJsonSchemaFromFileOptions = IJsonSchemaLoadOptions;

/**
 * Options for {@link JsonSchema.fromLoadedObject}
 * @public
 */
export declare type IJsonSchemaFromObjectOptions = IJsonSchemaLoadOptions;

/**
 * Options for {@link JsonSchema.fromFile} and {@link JsonSchema.fromLoadedObject}
 * @public
 */
export declare interface IJsonSchemaLoadOptions {
    /**
     * Other schemas that this schema references, e.g. via the "$ref" directive.
     * @remarks
     * The tree of dependent schemas may reference the same schema more than once.
     * However, if the same schema "$id" is used by two different JsonSchema instances,
     * an error will be reported.  This means you cannot load the same filename twice
     * and use them both together, and you cannot have diamond dependencies on different
     * versions of the same schema.  Although technically this would be possible to support,
     * it normally indicates an error or design problem.
     *
     * JsonSchema also does not allow circular references between schema dependencies.
     */
    dependentSchemas?: JsonSchema[];
    /**
     * The json-schema version to target for validation.
     *
     * @defaultValue draft-07
     *
     * @remarks
     * If the a version is not explicitly set, the schema object's `$schema` property
     * will be inspected to determine the version. If a `$schema` property is not found
     * or does not match an expected URL, the default version will be used.
     */
    schemaVersion?: JsonSchemaVersion;
    /**
     * Any custom formats to consider during validation. Some standard formats are supported
     * out-of-the-box (e.g. emails, uris), but additional formats can be defined here. You could
     * for example define generic numeric formats (e.g. uint8) or domain-specific formats.
     */
    customFormats?: Record<string, IJsonSchemaCustomFormat<string> | IJsonSchemaCustomFormat<number>>;
}

/**
 * Options for {@link JsonSchema.validateObjectWithCallback}
 * @public
 */
export declare interface IJsonSchemaValidateObjectWithOptions {
    /**
     * If true, the root-level `$schema` property in a JSON object being validated will be ignored during validation.
     * If this is set to `true` and the schema requires a `$schema` property, validation will fail.
     */
    ignoreSchemaField?: boolean;
}

/**
 * Options for {@link JsonSchema.validateObject}
 * @public
 */
export declare interface IJsonSchemaValidateOptions extends IJsonSchemaValidateObjectWithOptions {
    /**
     * A custom header that will be used to report schema errors.
     * @remarks
     * If omitted, the default header is "JSON validation failed:".  The error message starts with
     * the header, followed by the full input filename, followed by the ajv error list.
     * If you wish to customize all aspects of the error message, use JsonFile.loadAndValidateWithCallback()
     * or JsonSchema.validateObjectWithCallback().
     */
    customErrorHeader?: string;
}

/**
 * Helpers for resolving and importing Node.js modules.
 * @public
 */
export declare class Import {
    private static __builtInModules;
    private static get _builtInModules();
    /**
     * Provides a way to improve process startup times by lazy-loading imported modules.
     *
     * @remarks
     * This is a more structured wrapper for the {@link https://www.npmjs.com/package/import-lazy|import-lazy}
     * package.  It enables you to replace an import like this:
     *
     * ```ts
     * import * as example from 'example'; // <-- 100ms load time
     *
     * if (condition) {
     *   example.doSomething();
     * }
     * ```
     *
     * ...with a pattern like this:
     *
     * ```ts
     * const example: typeof import('example') = Import.lazy('example', require);
     *
     * if (condition) {
     *   example.doSomething(); // <-- 100ms load time occurs here, only if needed
     * }
     * ```
     *
     * The implementation relies on JavaScript's `Proxy` feature to intercept access to object members.  Thus
     * it will only work correctly with certain types of module exports.  If a particular export isn't well behaved,
     * you may need to find (or introduce) some other module in your dependency graph to apply the optimization to.
     *
     * Usage guidelines:
     *
     * - Always specify types using `typeof` as shown above.
     *
     * - Never apply lazy-loading in a way that would convert the module's type to `any`. Losing type safety
     *   seriously impacts the maintainability of the code base.
     *
     * - In cases where the non-runtime types are needed, import them separately using the `Types` suffix:
     *
     * ```ts
     * const example: typeof import('example') = Import.lazy('example', require);
     * import type * as exampleTypes from 'example';
     * ```
     *
     * - If the imported module confusingly has the same name as its export, then use the Module suffix:
     *
     * ```ts
     * const exampleModule: typeof import('../../logic/Example') = Import.lazy(
     *   '../../logic/Example', require);
     * import type * as exampleTypes from '../../logic/Example';
     * ```
     *
     * - If the exports cause a lot of awkwardness (e.g. too many expressions need to have `exampleModule.` inserted
     *   into them), or if some exports cannot be proxied (e.g. `Import.lazy('example', require)` returns a function
     *   signature), then do not lazy-load that module.  Instead, apply lazy-loading to some other module which is
     *   better behaved.
     *
     * - It's recommended to sort imports in a standard ordering:
     *
     * ```ts
     * // 1. external imports
     * import * as path from 'path';
     * import { Import, JsonFile, JsonObject } from '@rushstack/node-core-library';
     *
     * // 2. local imports
     * import { LocalFile } from './path/LocalFile';
     *
     * // 3. lazy-imports (which are technically variables, not imports)
     * const semver: typeof import('semver') = Import.lazy('semver', require);
     * ```
     */
    static lazy(moduleName: string, require: (id: string) => unknown): any;
    /**
     * This resolves a module path using similar logic as the Node.js `require.resolve()` API,
     * but supporting extra features such as specifying the base folder.
     *
     * @remarks
     * A module path is a text string that might appear in a statement such as
     * `import { X } from "____";` or `const x = require("___");`.  The implementation is based
     * on the popular `resolve` NPM package.
     *
     * Suppose `example` is an NPM package whose entry point is `lib/index.js`:
     * ```ts
     * // Returns "/path/to/project/node_modules/example/lib/index.js"
     * Import.resolveModule({ modulePath: 'example' });
     *
     * // Returns "/path/to/project/node_modules/example/lib/other.js"
     * Import.resolveModule({ modulePath: 'example/lib/other' });
     * ```
     * If you need to determine the containing package folder
     * (`/path/to/project/node_modules/example`), use {@link Import.resolvePackage} instead.
     *
     * @returns the absolute path of the resolved module.
     * If {@link IImportResolveOptions.includeSystemModules} is specified
     * and a system module is found, then its name is returned without any file path.
     */
    static resolveModule(options: IImportResolveModuleOptions): string;
    /**
     * Async version of {@link Import.resolveModule}.
     */
    static resolveModuleAsync(options: IImportResolveModuleAsyncOptions): Promise<string>;
    /**
     * Performs module resolution to determine the folder where a package is installed.
     *
     * @remarks
     * Suppose `example` is an NPM package whose entry point is `lib/index.js`:
     * ```ts
     * // Returns "/path/to/project/node_modules/example"
     * Import.resolvePackage({ packageName: 'example' });
     * ```
     *
     * If you need to resolve a module path, use {@link Import.resolveModule} instead:
     * ```ts
     * // Returns "/path/to/project/node_modules/example/lib/index.js"
     * Import.resolveModule({ modulePath: 'example' });
     * ```
     *
     * @returns the absolute path of the package folder.
     * If {@link IImportResolveOptions.includeSystemModules} is specified
     * and a system module is found, then its name is returned without any file path.
     */
    static resolvePackage(options: IImportResolvePackageOptions): string;
    /**
     * Async version of {@link Import.resolvePackage}.
     */
    static resolvePackageAsync(options: IImportResolvePackageAsyncOptions): Promise<string>;
    private static _getPackageName;
}

/**
 * An interface for accessing common fields from a package.json file whose version field may be missing.
 *
 * @remarks
 * This interface is the same as {@link IPackageJson}, except that the `version` field is optional.
 * According to the {@link https://docs.npmjs.com/files/package.json | NPM documentation}
 * and {@link http://wiki.commonjs.org/wiki/Packages/1.0 | CommonJS Packages specification}, the `version` field
 * is normally a required field for package.json files.
 *
 * However, NodeJS relaxes this requirement for its `require()` API.  The
 * {@link https://nodejs.org/dist/latest-v10.x/docs/api/modules.html#modules_folders_as_modules
 * | "Folders as Modules" section} from the NodeJS documentation gives an example of a package.json file
 * that has only the `name` and `main` fields.  NodeJS does not consider the `version` field during resolution,
 * so it can be omitted.  Some libraries do this.
 *
 * Use the `INodePackageJson` interface when loading such files.  Use `IPackageJson` for package.json files
 * that are installed from an NPM registry, or are otherwise known to have a `version` field.
 *
 * @public
 */
export declare interface INodePackageJson {
    /**
     * The name of the package.
     */
    name: string;
    /**
     * A version number conforming to the Semantic Versioning (SemVer) standard.
     */
    version?: string;
    /**
     * Indicates whether this package is allowed to be published or not.
     */
    private?: boolean;
    /**
     * A brief description of the package.
     */
    description?: string;
    /**
     * The URL of the project's repository.
     */
    repository?: string | IPackageJsonRepository;
    /**
     * The URL to the project's web page.
     */
    homepage?: string;
    /**
     * The name of the license.
     */
    license?: string;
    /**
     * The path to the module file that will act as the main entry point.
     */
    main?: string;
    /**
     * The path to the TypeScript *.d.ts file describing the module file
     * that will act as the main entry point.
     */
    types?: string;
    /**
     * Alias for `types`
     */
    typings?: string;
    /**
     * The path to the TSDoc metadata file.
     * This is still being standardized: https://github.com/microsoft/tsdoc/issues/7#issuecomment-442271815
     * @beta
     */
    tsdocMetadata?: string;
    /**
     * The main entry point for the package.
     */
    bin?: string | Record<string, string>;
    /**
     * An array of dependencies that must always be installed for this package.
     */
    dependencies?: IPackageJsonDependencyTable;
    /**
     * An array of optional dependencies that may be installed for this package.
     */
    optionalDependencies?: IPackageJsonDependencyTable;
    /**
     * An array of dependencies that must only be installed for developers who will
     * build this package.
     */
    devDependencies?: IPackageJsonDependencyTable;
    /**
     * An array of dependencies that must be installed by a consumer of this package,
     * but which will not be automatically installed by this package.
     */
    peerDependencies?: IPackageJsonDependencyTable;
    /**
     * An array of metadata for dependencies declared inside dependencies, optionalDependencies, and devDependencies.
     * https://pnpm.io/package_json#dependenciesmeta
     */
    dependenciesMeta?: IDependenciesMetaTable;
    /**
     * An array of metadata about peer dependencies.
     */
    peerDependenciesMeta?: IPeerDependenciesMetaTable;
    /**
     * A table of script hooks that a package manager or build tool may invoke.
     */
    scripts?: IPackageJsonScriptTable;
    /**
     * A table of package version resolutions. This feature is only implemented by the Yarn package manager.
     *
     * @remarks
     * See the {@link https://github.com/yarnpkg/rfcs/blob/master/implemented/0000-selective-versions-resolutions.md
     * | 0000-selective-versions-resolutions.md RFC} for details.
     */
    resolutions?: Record<string, string>;
    /**
     * A table of TypeScript *.d.ts file paths that are compatible with specific TypeScript version
     * selectors. This data take a form similar to that of the {@link INodePackageJson.exports} field,
     * with fallbacks listed in order in the value array for example:
     *
     * ```JSON
     * "typesVersions": {
     *   ">=3.1": {
     *     "*": ["./types-3.1/*", "./types-3.1-fallback/*"]
     *   },
     *   ">=3.0": {
     *     "*": ["./types-legacy/*"]
     *   }
     * }
     * ```
     *
     * or
     *
     * ```JSON
     * "typesVersions": {
     *   ">=3.1": {
     *     "app/*": ["./app/types-3.1/*"],
     *     "lib/*": ["./lib/types-3.1/*"]
     *   },
     *   ">=3.0": {
     *     "app/*": ["./app/types-legacy/*"],
     *     "lib/*": ["./lib/types-legacy/*"]
     *   }
     * }
     * ```
     *
     * See the
     * {@link https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html#version-selection-with-typesversions
     * | TypeScript documentation} for details.
     */
    typesVersions?: Record<string, Record<string, [string, ...string[]]>>;
    /**
     * The "exports" field is used to specify the entry points for a package.
     * See {@link https://nodejs.org/api/packages.html#exports | Node.js documentation}
     */
    exports?: string | string[] | Record<string, null | string | IPackageJsonExports>;
    /**
     * The "files" field is an array of file globs that should be included in the package during publishing.
     *
     * See the {@link https://docs.npmjs.com/cli/v6/configuring-npm/package-json#files | NPM documentation}.
     */
    files?: string[];
}

/**
 * An `Error` subclass that should be thrown to report an unexpected state that may indicate a software defect.
 * An application may handle this error by instructing the end user to report an issue to the application maintainers.
 *
 * @remarks
 * Do not use this class unless you intend to solicit bug reports from end users.
 *
 * @public
 */
export declare class InternalError extends Error {
    /**
     * If true, a JavScript `debugger;` statement will be invoked whenever the `InternalError` constructor is called.
     *
     * @remarks
     * Generally applications should not be catching and ignoring an `InternalError`.  Instead, the error should
     * be reported and typically the application will terminate.  Thus, if `InternalError` is constructed, it's
     * almost always something we want to examine in a debugger.
     */
    static breakInDebugger: boolean;
    /**
     * The underlying error message, without the additional boilerplate for an `InternalError`.
     */
    readonly unformattedMessage: string;
    /**
     * Constructs a new instance of the {@link InternalError} class.
     *
     * @param message - A message describing the error.  This will be assigned to
     * {@link InternalError.unformattedMessage}.  The `Error.message` field will have additional boilerplate
     * explaining that the user has encountered a software defect.
     */
    constructor(message: string);
    private static _formatMessage;
    /** @override */
    toString(): string;
}

/**
 * An interface for accessing common fields from a package.json file.
 *
 * @remarks
 * This interface describes a package.json file format whose `name` and `version` field are required.
 * In some situations, the `version` field is optional; in that case, use the {@link INodePackageJson}
 * interface instead.
 *
 * More fields may be added to this interface in the future.  For documentation about the package.json file format,
 * see the {@link http://wiki.commonjs.org/wiki/Packages/1.0 | CommonJS Packages specification}
 * and the {@link https://docs.npmjs.com/files/package.json | NPM manual page}.
 *
 * @public
 */
export declare interface IPackageJson extends INodePackageJson {
    /** {@inheritDoc INodePackageJson.version} */
    version: string;
}

/**
 * This interface is part of the {@link IPackageJson} file format.  It is used for the
 * "dependencies", "optionalDependencies", and "devDependencies" fields.
 * @public
 */
export declare interface IPackageJsonDependencyTable {
    /**
     * The key is the name of a dependency.  The value is a Semantic Versioning (SemVer)
     * range specifier.
     */
    [dependencyName: string]: string;
}

/**
 * This interface is part of the {@link IPackageJson} file format. It is used for the values
 * of the "exports" field.
 *
 * See {@link https://nodejs.org/api/packages.html#conditional-exports | Node.js documentation on Conditional Exports} and
 * {@link https://nodejs.org/api/packages.html#community-conditions-definitions | Node.js documentation on Community Conditional Exports}.
 *
 * @public
 */
export declare interface IPackageJsonExports {
    /**
     * This export is like {@link IPackageJsonExports.node} in that it matches for any NodeJS environment.
     * This export is specifically for native C++ addons.
     */
    'node-addons'?: string | IPackageJsonExports;
    /**
     * This export matches for any NodeJS environment.
     */
    node?: string | IPackageJsonExports;
    /**
     * This export matches when loaded via ESM syntax (i.e. - `import '...'` or `import('...')`).
     * This is always mutually exclusive with {@link IPackageJsonExports.require}.
     */
    import?: string | IPackageJsonExports;
    /**
     * This export matches when loaded via `require()`.
     * This is always mutually exclusive with {@link IPackageJsonExports.import}.
     */
    require?: string | IPackageJsonExports;
    /**
     * This export matches as a fallback when no other conditions match. Because exports are evaluated in
     * the order that they are specified in the `package.json` file, this condition should always come last
     * as no later exports will match if this one does.
     */
    default?: string | IPackageJsonExports;
    /**
     * This export matches when loaded by the typing system (i.e. - the TypeScript compiler).
     */
    types?: string | IPackageJsonExports;
    /**
     * Any web browser environment.
     */
    browser?: string | IPackageJsonExports;
    /**
     * This export matches in development-only environments.
     * This is always mutually exclusive with {@link IPackageJsonExports.production}.
     */
    development?: string | IPackageJsonExports;
    /**
     * This export matches in production-only environments.
     * This is always mutually exclusive with {@link IPackageJsonExports.development}.
     */
    production?: string | IPackageJsonExports;
}

/**
 * Constructor parameters for {@link PackageJsonLookup}
 *
 * @public
 */
export declare interface IPackageJsonLookupParameters {
    /**
     * Certain package.json fields such as "contributors" can be very large, and may
     * significantly increase the memory footprint for the PackageJsonLookup cache.
     * By default, PackageJsonLookup only loads a subset of standard commonly used
     * fields names.  Set loadExtraFields=true to always return all fields.
     */
    loadExtraFields?: boolean;
}

/**
 * This interface is part of the {@link IPackageJson} file format.  It is used for the
 * "repository" field.
 * @public
 */
export declare interface IPackageJsonRepository {
    /**
     * The source control type for the repository that hosts the project. This is typically "git".
     */
    type: string;
    /**
     * The URL of the repository that hosts the project.
     */
    url: string;
    /**
     * If the project does not exist at the root of the repository, its path is specified here.
     */
    directory?: string;
}

/**
 * This interface is part of the {@link IPackageJson} file format.  It is used for the
 * "scripts" field.
 * @public
 */
export declare interface IPackageJsonScriptTable {
    /**
     * The key is the name of the script hook.  The value is the script body which may
     * be a file path or shell script command.
     */
    [scriptName: string]: string;
}

/**
 * Options that configure the validation rules used by a {@link PackageNameParser} instance.
 *
 * @remarks
 * The default validation is based on the npmjs.com registry's policy for published packages, and includes these
 * restrictions:
 *
 * - The package name cannot be longer than 214 characters.
 *
 * - The package name must not be empty.
 *
 * - Other than the `@` and `/` delimiters used for scopes, the only allowed characters
 *   are letters, numbers, `-`, `_`, and `.`.
 *
 * - The name must not start with a `.` or `_`.
 *
 * @public
 */
export declare interface IPackageNameParserOptions {
    /**
     * If true, allows upper-case letters in package names.
     * This improves compatibility with some legacy private registries that still allow that.
     */
    allowUpperCase?: boolean;
}

/**
 * A package name that has been separated into its scope and unscoped name.
 *
 * @public
 */
export declare interface IParsedPackageName {
    /**
     * The parsed NPM scope, or an empty string if there was no scope.  The scope value will
     * always include the at-sign.
     * @remarks
     * For example, if the parsed input was "\@scope/example", then scope would be "\@scope".
     */
    scope: string;
    /**
     * The parsed NPM package name without the scope.
     * @remarks
     * For example, if the parsed input was "\@scope/example", then the name would be "example".
     */
    unscopedName: string;
}

/**
 * Result object returned by {@link PackageName.tryParse}
 *
 * @public
 */
export declare interface IParsedPackageNameOrError extends IParsedPackageName {
    /**
     * If the input string could not be parsed, then this string will contain a nonempty
     * error message.  Otherwise it will be an empty string.
     */
    error: string;
}

/**
 * Options for {@link Path.formatConcisely}.
 * @public
 */
export declare interface IPathFormatConciselyOptions {
    /**
     * The path to be converted.
     */
    pathToConvert: string;
    /**
     * The base path to use when converting `pathToConvert` to a relative path.
     */
    baseFolder: string;
    /**
     * If set to true, don't include the leading `./` if the path is under the base folder.
     */
    trimLeadingDotSlash?: boolean;
}

/**
 * Options for {@link Path.formatFileLocation}.
 * @public
 */
export declare interface IPathFormatFileLocationOptions {
    /**
     * The base path to use when converting `pathToFormat` to a relative path. If not specified,
     * `pathToFormat` will be used as-is.
     */
    baseFolder?: string;
    /**
     * The path that will be used to specify the file location.
     */
    pathToFormat: string;
    /**
     * The message related to the file location.
     */
    message: string;
    /**
     * The style of file location formatting to use.
     */
    format: FileLocationStyle;
    /**
     * The optional line number. If not specified, the line number will not be included
     * in the formatted string.
     */
    line?: number;
    /**
     * The optional column number. If not specified, the column number will not be included
     * in the formatted string.
     */
    column?: number;
}

/**
 * This interface is part of the {@link IPackageJson} file format. It is used for the
 * "peerDependenciesMeta" field.
 * @public
 */
export declare interface IPeerDependenciesMetaTable {
    [dependencyName: string]: {
        optional?: boolean;
    };
}

/**
 * Process information sourced from the system. This process info is sourced differently depending
 * on the operating system:
 * - On Windows, this uses the `wmic.exe` utility.
 * - On Unix, this uses the `ps` utility.
 *
 * @public
 */
export declare interface IProcessInfo {
    /**
     * The name of the process.
     *
     * @remarks On Windows, the process name will be empty if the process is a kernel process.
     * On Unix, the process name will be empty if the process is the root process.
     */
    processName: string;
    /**
     * The process ID.
     */
    processId: number;
    /**
     * The parent process info.
     *
     * @remarks On Windows, the parent process info will be undefined if the process is a kernel process.
     * On Unix, the parent process info will be undefined if the process is the root process.
     */
    parentProcessInfo: IProcessInfo | undefined;
    /**
     * The child process infos.
     */
    childProcessInfos: IProcessInfo[];
}

/**
 * Constructor parameters for {@link ProtectableMap}
 *
 * @public
 */
export declare interface IProtectableMapParameters<K, V> {
    /**
     * An optional hook that will be invoked before Map.clear() is performed.
     */
    onClear?: (source: ProtectableMap<K, V>) => void;
    /**
     * An optional hook that will be invoked before Map.delete() is performed.
     */
    onDelete?: (source: ProtectableMap<K, V>, key: K) => void;
    /**
     * An optional hook that will be invoked before Map.set() is performed.
     * @remarks
     * If this hook is provided, the function MUST return the `value` parameter.
     * This provides the opportunity to modify the value before it is added
     * to the map.
     */
    onSet?: (source: ProtectableMap<K, V>, key: K, value: V) => V;
}

/**
 * Options used when calling the {@link Text.readLinesFromIterable} or
 * {@link Text.readLinesFromIterableAsync} methods.
 *
 * @public
 */
export declare interface IReadLinesFromIterableOptions {
    /**
     * The encoding of the input iterable. The default is utf8.
     */
    encoding?: Encoding;
    /**
     * If true, empty lines will not be returned. The default is false.
     */
    ignoreEmptyLines?: boolean;
}

/**
 * Arguments used to create a function that resolves symlinked node_modules in a path
 * @public
 */
export declare interface IRealNodeModulePathResolverOptions {
    fs?: Partial<Pick<typeof nodeFs, 'lstatSync' | 'readlinkSync'>>;
    path?: Partial<Pick<typeof nodePath, 'isAbsolute' | 'join' | 'resolve' | 'sep'>>;
    /**
     * If set to true, the resolver will not throw if part of the path does not exist.
     * @defaultValue false
     */
    ignoreMissingPaths?: boolean;
}

/**
 * @remarks
 * Used with {@link Async.runWithRetriesAsync}.
 *
 * @public
 */
export declare interface IRunWithRetriesOptions<TResult> {
    /**
     * The action to be performed. The action is repeatedly executed until it completes without throwing or the
     * maximum number of retries is reached.
     *
     * @param retryCount - The number of times the action has been retried.
     */
    action: (retryCount: number) => Promise<TResult> | TResult;
    /**
     * The maximum number of times the action should be retried.
     */
    maxRetries: number;
    /**
     * The delay in milliseconds between retries.
     */
    retryDelayMs?: number;
}

/**
 * An interface for a builder object that allows a large text string to be constructed incrementally by appending
 * small chunks.
 *
 * @remarks
 *
 * {@link StringBuilder} is the default implementation of this contract.
 *
 * @public
 */
export declare interface IStringBuilder {
    /**
     * Append the specified text to the buffer.
     */
    append(text: string): void;
    /**
     * Returns a single string containing all the text that was appended to the buffer so far.
     *
     * @remarks
     *
     * This is a potentially expensive operation.
     */
    toString(): string;
}

/**
 * Details about how the `child_process.ChildProcess` was created.
 *
 * @beta
 */
export declare interface ISubprocessOptions {
    /**
     * Whether or not the child process was started in detached mode.
     *
     * @remarks
     * On POSIX systems, detached=true is required for killing the subtree. Attempting to kill the
     * subtree on POSIX systems with detached=false will throw an error. On Windows, detached=true
     * creates a separate console window and is not required for killing the subtree. In general,
     * it is recommended to use SubprocessTerminator.RECOMMENDED_OPTIONS when forking or spawning
     * a child process.
     */
    detached: boolean;
}

/**
 * The options for running a process to completion using {@link Executable.(waitForExitAsync:3)}.
 *
 * @public
 */
export declare interface IWaitForExitOptions {
    /**
     * Whether or not to throw when the process completes with a non-zero exit code. Defaults to false.
     *
     * @defaultValue false
     */
    throwOnNonZeroExitCode?: boolean;
    /**
     * Whether or not to throw when the process is terminated by a signal. Defaults to false.
     *
     * @defaultValue false
     */
    throwOnSignal?: boolean;
    /**
     * The encoding of the output. If not provided, the output will not be collected.
     */
    encoding?: BufferEncoding | 'buffer';
}

/**
 * The result of running a process to completion using {@link Executable.(waitForExitAsync:3)}.
 *
 * @public
 */
export declare interface IWaitForExitResult<T extends Buffer | string | never = never> {
    /**
     * The process stdout output, if encoding was specified.
     */
    stdout: T;
    /**
     * The process stderr output, if encoding was specified.
     */
    stderr: T;
    /**
     * The process exit code. If the process was terminated, this will be null.
     */
    exitCode: number | null;
    /**
     * The process signal that terminated the process. If the process exited normally, this will be null.
     */
    signal: string | null;
}

/**
 * {@inheritDoc IWaitForExitOptions}
 *
 * @public
 */
export declare interface IWaitForExitWithBufferOptions extends IWaitForExitOptions {
    /**
     * {@inheritDoc IWaitForExitOptions.encoding}
     */
    encoding: 'buffer';
}

/**
 * {@inheritDoc IWaitForExitOptions}
 *
 * @public
 */
export declare interface IWaitForExitWithStringOptions extends IWaitForExitOptions {
    /**
     * {@inheritDoc IWaitForExitOptions.encoding}
     */
    encoding: BufferEncoding;
}

/**
 * @remarks
 * Used with {@link (Async:class).(forEachAsync:2)} and {@link (Async:class).(mapAsync:2)}.
 *
 * @public
 */
export declare interface IWeighted {
    /**
     * The weight of the element, used to determine the concurrency units that it will take up.
     *  Must be a whole number greater than or equal to 0.
     */
    weight: number;
}

/**
 * Utilities for reading/writing JSON files.
 * @public
 */
export declare class JsonFile {
    /**
     * @internal
     */
    static _formatPathForError: (path: string) => string;
    /**
     * Loads a JSON file.
     */
    static load(jsonFilename: string, options?: IJsonFileParseOptions): JsonObject;
    /**
     * An async version of {@link JsonFile.load}.
     */
    static loadAsync(jsonFilename: string, options?: IJsonFileParseOptions): Promise<JsonObject>;
    /**
     * Parses a JSON file's contents.
     */
    static parseString(jsonContents: string, options?: IJsonFileParseOptions): JsonObject;
    /**
     * Loads a JSON file and validate its schema.
     */
    static loadAndValidate(jsonFilename: string, jsonSchema: JsonSchema, options?: IJsonFileLoadAndValidateOptions): JsonObject;
    /**
     * An async version of {@link JsonFile.loadAndValidate}.
     */
    static loadAndValidateAsync(jsonFilename: string, jsonSchema: JsonSchema, options?: IJsonFileLoadAndValidateOptions): Promise<JsonObject>;
    /**
     * Loads a JSON file and validate its schema, reporting errors using a callback
     * @remarks
     * See JsonSchema.validateObjectWithCallback() for more info.
     */
    static loadAndValidateWithCallback(jsonFilename: string, jsonSchema: JsonSchema, errorCallback: (errorInfo: IJsonSchemaErrorInfo) => void, options?: IJsonFileLoadAndValidateOptions): JsonObject;
    /**
     * An async version of {@link JsonFile.loadAndValidateWithCallback}.
     */
    static loadAndValidateWithCallbackAsync(jsonFilename: string, jsonSchema: JsonSchema, errorCallback: (errorInfo: IJsonSchemaErrorInfo) => void, options?: IJsonFileLoadAndValidateOptions): Promise<JsonObject>;
    /**
     * Serializes the specified JSON object to a string buffer.
     * @param jsonObject - the object to be serialized
     * @param options - other settings that control serialization
     * @returns a JSON string, with newlines, and indented with two spaces
     */
    static stringify(jsonObject: JsonObject, options?: IJsonFileStringifyOptions): string;
    /**
     * Serializes the specified JSON object to a string buffer.
     * @param previousJson - the previous JSON string, which will be updated
     * @param newJsonObject - the object to be serialized
     * @param options - other settings that control serialization
     * @returns a JSON string, with newlines, and indented with two spaces
     */
    static updateString(previousJson: string, newJsonObject: JsonObject, options?: IJsonFileStringifyOptions): string;
    /**
     * Saves the file to disk.  Returns false if nothing was written due to options.onlyIfChanged.
     * @param jsonObject - the object to be saved
     * @param jsonFilename - the file path to write
     * @param options - other settings that control how the file is saved
     * @returns false if ISaveJsonFileOptions.onlyIfChanged didn't save anything; true otherwise
     */
    static save(jsonObject: JsonObject, jsonFilename: string, options?: IJsonFileSaveOptions): boolean;
    /**
     * An async version of {@link JsonFile.save}.
     */
    static saveAsync(jsonObject: JsonObject, jsonFilename: string, options?: IJsonFileSaveOptions): Promise<boolean>;
    /**
     * Used to validate a data structure before writing.  Reports an error if there
     * are any undefined members.
     */
    static validateNoUndefinedMembers(jsonObject: JsonObject): void;
    private static _validateNoUndefinedMembers;
    private static _formatKeyPath;
    private static _formatJsonHeaderComment;
    private static _buildJjuParseOptions;
}

/**
 * The Rush Stack lint rules discourage usage of `null`.  However, JSON parsers always return JavaScript's
 * `null` to keep the two syntaxes consistent.  When creating interfaces that describe JSON structures,
 * use `JsonNull` to avoid triggering the lint rule.  Do not use `JsonNull` for any other purpose.
 *
 * @remarks
 * If you are designing a new JSON file format, it's a good idea to avoid `null` entirely.  In most cases
 * there are better representations that convey more information about an item that is unknown, omitted, or disabled.
 *
 * To understand why `null` is deprecated, please see the `@rushstack/eslint-plugin` documentation here:
 *
 * {@link https://www.npmjs.com/package/@rushstack/eslint-plugin#rushstackno-null}
 *
 * @public
 */
export declare type JsonNull = null;

/**
 * Represents a JSON-serializable object whose type has not been determined yet.
 *
 * @remarks
 *
 * This type is similar to `any`, except that it communicates that the object is serializable JSON.
 *
 * @public
 */
export declare type JsonObject = any;

/**
 * Represents a JSON schema that can be used to validate JSON data files loaded by the JsonFile class.
 * @remarks
 * The schema itself is normally loaded and compiled later, only if it is actually required to validate
 * an input.  To avoid schema errors at runtime, it's recommended to create a unit test that calls
 * JsonSchema.ensureCompiled() for each of your schema objects.
 *
 * @public
 */
export declare class JsonSchema {
    private _dependentSchemas;
    private _filename;
    private _validator;
    private _schemaObject;
    private _schemaVersion;
    private _customFormats;
    private constructor();
    /**
     * Registers a JsonSchema that will be loaded from a file on disk.
     * @remarks
     * NOTE: An error occurs if the file does not exist; however, the file itself is not loaded or validated
     * until it the schema is actually used.
     */
    static fromFile(filename: string, options?: IJsonSchemaFromFileOptions): JsonSchema;
    /**
     * Registers a JsonSchema that will be loaded from an object.
     */
    static fromLoadedObject(schemaObject: JsonObject, options?: IJsonSchemaFromObjectOptions): JsonSchema;
    private static _collectDependentSchemas;
    /**
     * Used to nicely format the ZSchema error tree.
     */
    private static _formatErrorDetails;
    /**
     * Used by _formatErrorDetails.
     */
    private static _formatErrorDetailsHelper;
    /**
     * Returns a short name for this schema, for use in error messages.
     * @remarks
     * If the schema was loaded from a file, then the base filename is used.  Otherwise, the "$id"
     * field is used if available.
     */
    get shortName(): string;
    /**
     * If not already done, this loads the schema from disk and compiles it.
     * @remarks
     * Any dependencies will be compiled as well.
     */
    ensureCompiled(): void;
    /**
     * Validates the specified JSON object against this JSON schema.  If the validation fails,
     * an exception will be thrown.
     * @param jsonObject - The JSON data to be validated
     * @param filenameForErrors - The filename that the JSON data was available, or an empty string
     *    if not applicable
     * @param options - Other options that control the validation
     */
    validateObject(jsonObject: JsonObject, filenameForErrors: string, options?: IJsonSchemaValidateOptions): void;
    /**
     * Validates the specified JSON object against this JSON schema.  If the validation fails,
     * a callback is called for each validation error.
     */
    validateObjectWithCallback(jsonObject: JsonObject, errorCallback: (errorInfo: IJsonSchemaErrorInfo) => void, options?: IJsonSchemaValidateObjectWithOptions): void;
    private _ensureLoaded;
}

/**
 * Specifies the version of json-schema to be validated against.
 * https://json-schema.org/specification
 * @public
 */
export declare type JsonSchemaVersion = 'draft-04' | 'draft-07';

/**
 * Specifies the variant of JSON syntax to be used.
 *
 * @public
 */
export declare enum JsonSyntax {
    /**
     * Specifies the exact RFC 8259 format as implemented by the `JSON.parse()` system API.
     * This format was designed for machine generated inputs such as an HTTP payload.
     * It is not a recommend choice for human-authored files, because it does not support
     * code comments.
     *
     * @remarks
     *
     * A well-known quote from Douglas Crockford, the inventor of JSON:
     *
     * "I removed comments from JSON because I saw people were using them to hold parsing directives,
     * a practice which would have destroyed interoperability.  I know that the lack of comments makes
     * some people sad, but it shouldn't.  Suppose you are using JSON to keep configuration files,
     * which you would like to annotate.  Go ahead and insert all the comments you like.
     * Then pipe it through JSMin before handing it to your JSON parser."
     *
     * @see {@link https://datatracker.ietf.org/doc/html/rfc8259 | RFC 8259}
     */
    Strict = "strict",
    /**
     * `JsonSyntax.JsonWithComments` is the recommended format for human-authored config files.
     * It is a minimal extension to `JsonSyntax.Strict` adding support for code comments
     * using `//` and `/*`.
     *
     * @remarks
     *
     * VS Code calls this format `jsonc`, but it should not be confused with unrelated file formats
     * and libraries that also use the name "JSONC".
     *
     * To fix VS Code syntax highlighting, add this setting:
     * `"files.associations": { "*.json": "jsonc" }`
     *
     * To fix GitHub syntax highlighting, add this to your `.gitattributes`:
     * `*.json linguist-language=JSON-with-Comments`
     */
    JsonWithComments = "jsonWithComments",
    /**
     * JSON5 is a project that proposes a JSON-like format supplemented with ECMAScript 5.1
     * notations for objects, numbers, comments, and more.
     *
     * @remarks
     * Files using this format should use the `.json5` file extension instead of `.json`.
     *
     * JSON5 has substantial differences from JSON: object keys may be unquoted, trailing commas
     * are allowed, and strings may span multiple lines.  Whereas {@link JsonSyntax.JsonWithComments} can
     * be cheaply converted to standard JSON by stripping comments, parsing JSON5 requires a
     * nontrivial algorithm that may not be easily available in some contexts or programming languages.
     *
     * @see {@link https://json5.org/ | JSON5 project website}
     */
    Json5 = "json5"
}

/**
 * Helper functions used when interacting with APIs that do not follow modern coding practices.
 * @public
 */
export declare class LegacyAdapters {
    /**
     * This function wraps a function with a callback in a promise.
     */
    static convertCallbackToPromise<TResult, TError>(fn: (cb: LegacyCallback<TResult, TError>) => void): Promise<TResult>;
    static convertCallbackToPromise<TResult, TError, TArg1>(fn: (arg1: TArg1, cb: LegacyCallback<TResult, TError>) => void, arg1: TArg1): Promise<TResult>;
    static convertCallbackToPromise<TResult, TError, TArg1, TArg2>(fn: (arg1: TArg1, arg2: TArg2, cb: LegacyCallback<TResult, TError>) => void, arg1: TArg1, arg2: TArg2): Promise<TResult>;
    static convertCallbackToPromise<TResult, TError, TArg1, TArg2, TArg3>(fn: (arg1: TArg1, arg2: TArg2, arg3: TArg3, cb: LegacyCallback<TResult, TError>) => void, arg1: TArg1, arg2: TArg2, arg3: TArg3): Promise<TResult>;
    static convertCallbackToPromise<TResult, TError, TArg1, TArg2, TArg3, TArg4>(fn: (arg1: TArg1, arg2: TArg2, arg3: TArg3, arg4: TArg4, cb: LegacyCallback<TResult, TError>) => void, arg1: TArg1, arg2: TArg2, arg3: TArg3, arg4: TArg4): Promise<TResult>;
    /**
     * Normalizes an object into an `Error` object.
     */
    static scrubError(error: Error | string | any): Error;
}

/**
 * Callback used by {@link LegacyAdapters}.
 * @public
 */
export declare type LegacyCallback<TResult, TError> = (error: TError | null | undefined, result: TResult) => void;

/**
 * The `LockFile` implements a file-based mutex for synchronizing access to a shared resource
 * between multiple Node.js processes.  It is not recommended for synchronization solely within
 * a single Node.js process.
 * @remarks
 * The implementation works on Windows, Mac, and Linux without requiring any native helpers.
 * On non-Windows systems, the algorithm requires access to the `ps` shell command.  On Linux,
 * it requires access the `/proc/${pidString}/stat` filesystem.
 * @public
 */
export declare class LockFile {
    private static _getStartTime;
    private _fileWriter;
    private _filePath;
    private _dirtyWhenAcquired;
    private constructor();
    /**
     * Returns the path of the lockfile that will be created when a lock is successfully acquired.
     * @param resourceFolder - The folder where the lock file will be created
     * @param resourceName - An alphanumeric name that describes the resource being locked.  This will become
     *   the filename of the temporary file created to manage the lock.
     * @param pid - The PID for the current Node.js process (`process.pid`), which is used by the locking algorithm.
     */
    static getLockFilePath(resourceFolder: string, resourceName: string, pid?: number): string;
    /**
     * Attempts to create a lockfile with the given filePath.
     * @param resourceFolder - The folder where the lock file will be created
     * @param resourceName - An alphanumeric name that describes the resource being locked.  This will become
     *   the filename of the temporary file created to manage the lock.
     * @returns If successful, returns a `LockFile` instance.  If unable to get a lock, returns `undefined`.
     */
    static tryAcquire(resourceFolder: string, resourceName: string): LockFile | undefined;
    /**
     * @deprecated Use {@link LockFile.acquireAsync} instead.
     */
    static acquire(resourceFolder: string, resourceName: string, maxWaitMs?: number): Promise<LockFile>;
    /**
     * Attempts to create the lockfile.  Will continue to loop at every 100ms until the lock becomes available
     * or the maxWaitMs is surpassed.
     *
     * @remarks
     * This function is subject to starvation, whereby it does not ensure that the process that has been
     * waiting the longest to acquire the lock will get it first. This means that a process could theoretically
     * wait for the lock forever, while other processes skipped it in line and acquired the lock first.
     *
     * @param resourceFolder - The folder where the lock file will be created
     * @param resourceName - An alphanumeric name that describes the resource being locked.  This will become
     *   the filename of the temporary file created to manage the lock.
     * @param maxWaitMs - The maximum number of milliseconds to wait for the lock before reporting an error
     */
    static acquireAsync(resourceFolder: string, resourceName: string, maxWaitMs?: number): Promise<LockFile>;
    private static _tryAcquireInner;
    /**
     * Attempts to acquire the lock on a Linux or OSX machine
     */
    private static _tryAcquireMacOrLinux;
    /**
     * Attempts to acquire the lock using Windows
     * This algorithm is much simpler since we can rely on the operating system
     */
    private static _tryAcquireWindows;
    /**
     * Unlocks a file and optionally removes it from disk.
     * This can only be called once.
     *
     * @param deleteFile - Whether to delete the lockfile from disk. Defaults to true.
     */
    release(deleteFile?: boolean): void;
    /**
     * Returns the initial state of the lock.
     * This can be used to detect if the previous process was terminated before releasing the resource.
     */
    get dirtyWhenAcquired(): boolean;
    /**
     * Returns the absolute path to the lockfile
     */
    get filePath(): string;
    /**
     * Returns true if this lock is currently being held.
     */
    get isReleased(): boolean;
}

/**
 * Helper functions for working with the `Map<K, V>` data type.
 *
 * @public
 */
export declare class MapExtensions {
    /**
     * Adds all the (key, value) pairs from the source map into the target map.
     * @remarks
     * This function modifies targetMap.  Any existing keys will be overwritten.
     * @param targetMap - The map that entries will be added to
     * @param sourceMap - The map containing the entries to be added
     */
    static mergeFromMap<K, V>(targetMap: Map<K, V>, sourceMap: ReadonlyMap<K, V>): void;
    /**
     * Converts a string-keyed map to an object.
     * @remarks
     * This function has the same effect as Object.fromEntries(map.entries())
     * in supported versions of Node (\>= 12.0.0).
     * @param map - The map that the object properties will be sourced from
     */
    static toObject<TValue>(map: Map<string, TValue>): {
        [key: string]: TValue;
    };
}

/**
 * Implements a standard heap data structure for items of type T and a custom comparator.
 * The root will always be the minimum value as determined by the comparator.
 *
 * @public
 */
export declare class MinimumHeap<T> {
    private readonly _items;
    private readonly _comparator;
    /**
     * Constructs a new MinimumHeap instance.
     * @param comparator - a comparator function that determines the order of the items in the heap.
     *   If the comparator returns a value less than zero, then `a` will be considered less than `b`.
     *   If the comparator returns zero, then `a` and `b` are considered equal.
     *   Otherwise, `a` will be considered greater than `b`.
     */
    constructor(comparator: (a: T, b: T) => number);
    /**
     * Returns the number of items in the heap.
     * @returns the number of items in the heap.
     */
    get size(): number;
    /**
     * Retrieves the root item from the heap without removing it.
     * @returns the root item, or `undefined` if the heap is empty
     */
    peek(): T | undefined;
    /**
     * Retrieves and removes the root item from the heap. The next smallest item will become the new root.
     * @returns the root item, or `undefined` if the heap is empty
     */
    poll(): T | undefined;
    /**
     * Pushes an item into the heap.
     * @param item - the item to push
     */
    push(item: T): void;
}

/**
 * Enumeration controlling conversion of newline characters.
 * @public
 */
export declare enum NewlineKind {
    /**
     * Windows-style newlines
     */
    CrLf = "\r\n",
    /**
     * POSIX-style newlines
     *
     * @remarks
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    Lf = "\n",
    /**
     * Default newline type for this operating system (`os.EOL`).
     */
    OsDefault = "os"
}

/**
 * This class provides methods for finding the nearest "package.json" for a folder
 * and retrieving the name of the package.  The results are cached.
 *
 * @public
 */
export declare class PackageJsonLookup {
    private static _instance;
    /**
     * A singleton instance of `PackageJsonLookup`, which is useful for short-lived processes
     * that can reasonably assume that the file system will not be modified after the cache
     * is populated.
     *
     * @remarks
     * For long-running processes that need to clear the cache at appropriate times,
     * it is recommended to create your own instance of `PackageJsonLookup` instead
     * of relying on this instance.
     */
    static get instance(): PackageJsonLookup;
    private _loadExtraFields;
    private _packageFolderCache;
    private _packageJsonCache;
    constructor(parameters?: IPackageJsonLookupParameters);
    /**
     * A helper for loading the caller's own package.json file.
     *
     * @remarks
     *
     * This function provides a concise and efficient way for an NPM package to report metadata about itself.
     * For example, a tool might want to report its version.
     *
     * The `loadOwnPackageJson()` probes upwards from the caller's folder, expecting to find a package.json file,
     * which is assumed to be the caller's package.  The result is cached, under the assumption that a tool's
     * own package.json (and intermediary folders) will never change during the lifetime of the process.
     *
     * @example
     * ```ts
     * // Report the version of our NPM package
     * const myPackageVersion: string = PackageJsonLookup.loadOwnPackageJson(__dirname).version;
     * console.log(`Cool Tool - Version ${myPackageVersion}`);
     * ```
     *
     * @param dirnameOfCaller - The NodeJS `__dirname` macro for the caller.
     * @returns This function always returns a valid `IPackageJson` object.  If any problems are encountered during
     * loading, an exception will be thrown instead.
     */
    static loadOwnPackageJson(dirnameOfCaller: string): IPackageJson;
    /**
     * Clears the internal file cache.
     * @remarks
     * Call this method if changes have been made to the package.json files on disk.
     */
    clearCache(): void;
    /**
     * Returns the absolute path of a folder containing a package.json file, by looking
     * upwards from the specified fileOrFolderPath.  If no package.json can be found,
     * undefined is returned.
     *
     * @remarks
     * The fileOrFolderPath is not required to actually exist on disk.
     * The fileOrFolderPath itself can be the return value, if it is a folder containing
     * a package.json file.
     * Both positive and negative lookup results are cached.
     *
     * @param fileOrFolderPath - a relative or absolute path to a source file or folder
     * that may be part of a package
     * @returns an absolute path to a folder containing a package.json file
     */
    tryGetPackageFolderFor(fileOrFolderPath: string): string | undefined;
    /**
     * If the specified file or folder is part of a package, this returns the absolute path
     * to the associated package.json file.
     *
     * @remarks
     * The package folder is determined using the same algorithm
     * as {@link PackageJsonLookup.tryGetPackageFolderFor}.
     *
     * @param fileOrFolderPath - a relative or absolute path to a source file or folder
     * that may be part of a package
     * @returns an absolute path to * package.json file
     */
    tryGetPackageJsonFilePathFor(fileOrFolderPath: string): string | undefined;
    /**
     * If the specified file or folder is part of a package, this loads and returns the
     * associated package.json file.
     *
     * @remarks
     * The package folder is determined using the same algorithm
     * as {@link PackageJsonLookup.tryGetPackageFolderFor}.
     *
     * @param fileOrFolderPath - a relative or absolute path to a source file or folder
     * that may be part of a package
     * @returns an IPackageJson object, or undefined if the fileOrFolderPath does not
     * belong to a package
     */
    tryLoadPackageJsonFor(fileOrFolderPath: string): IPackageJson | undefined;
    /**
     * This function is similar to {@link PackageJsonLookup.tryLoadPackageJsonFor}, except that it does not report
     * an error if the `version` field is missing from the package.json file.
     */
    tryLoadNodePackageJsonFor(fileOrFolderPath: string): INodePackageJson | undefined;
    /**
     * Loads the specified package.json file, if it is not already present in the cache.
     *
     * @remarks
     * Unless {@link IPackageJsonLookupParameters.loadExtraFields} was specified,
     * the returned IPackageJson object will contain a subset of essential fields.
     * The returned object should be considered to be immutable; the caller must never
     * modify it.
     *
     * @param jsonFilename - a relative or absolute path to a package.json file
     */
    loadPackageJson(jsonFilename: string): IPackageJson;
    /**
     * This function is similar to {@link PackageJsonLookup.loadPackageJson}, except that it does not report an error
     * if the `version` field is missing from the package.json file.
     */
    loadNodePackageJson(jsonFilename: string): INodePackageJson;
    private _loadPackageJsonInner;
    /**
     * Try to load a package.json file as an INodePackageJson,
     * returning undefined if the found file does not contain a `name` field.
     */
    private _tryLoadNodePackageJsonInner;
    private _tryGetPackageFolderFor;
}

/**
 * Provides basic operations for validating and manipulating NPM package names such as `my-package`
 * or `@scope/my-package`.
 *
 * @remarks
 * This is the default implementation of {@link PackageNameParser}, exposed as a convenient static class.
 * If you need to configure the parsing rules, use `PackageNameParser` instead.
 *
 * @public
 */
export declare class PackageName {
    private static readonly _parser;
    /** {@inheritDoc PackageNameParser.tryParse} */
    static tryParse(packageName: string): IParsedPackageNameOrError;
    /** {@inheritDoc PackageNameParser.parse} */
    static parse(packageName: string): IParsedPackageName;
    /** {@inheritDoc PackageNameParser.getScope} */
    static getScope(packageName: string): string;
    /** {@inheritDoc PackageNameParser.getUnscopedName} */
    static getUnscopedName(packageName: string): string;
    /** {@inheritDoc PackageNameParser.isValidName} */
    static isValidName(packageName: string): boolean;
    /** {@inheritDoc PackageNameParser.validate} */
    static validate(packageName: string): void;
    /** {@inheritDoc PackageNameParser.combineParts} */
    static combineParts(scope: string, unscopedName: string): string;
}

/**
 * A configurable parser for validating and manipulating NPM package names such as `my-package` or `@scope/my-package`.
 *
 * @remarks
 * If you do not need to customize the parser configuration, it is recommended to use {@link PackageName}
 * which exposes these operations as a simple static class.
 *
 * @public
 */
export declare class PackageNameParser {
    private static readonly _invalidNameCharactersRegExp;
    private readonly _options;
    constructor(options?: IPackageNameParserOptions);
    /**
     * This attempts to parse a package name that may include a scope component.
     * The packageName must not be an empty string.
     * @remarks
     * This function will not throw an exception.
     *
     * @returns an {@link IParsedPackageNameOrError} structure whose `error` property will be
     * nonempty if the string could not be parsed.
     */
    tryParse(packageName: string): IParsedPackageNameOrError;
    /**
     * Same as {@link PackageName.tryParse}, except this throws an exception if the input
     * cannot be parsed.
     * @remarks
     * The packageName must not be an empty string.
     */
    parse(packageName: string): IParsedPackageName;
    /**
     * {@inheritDoc IParsedPackageName.scope}
     */
    getScope(packageName: string): string;
    /**
     * {@inheritDoc IParsedPackageName.unscopedName}
     */
    getUnscopedName(packageName: string): string;
    /**
     * Returns true if the specified package name is valid, or false otherwise.
     * @remarks
     * This function will not throw an exception.
     */
    isValidName(packageName: string): boolean;
    /**
     * Throws an exception if the specified name is not a valid package name.
     * The packageName must not be an empty string.
     */
    validate(packageName: string): void;
    /**
     * Combines an optional package scope with an unscoped root name.
     * @param scope - Must be either an empty string, or a scope name such as "\@example"
     * @param unscopedName - Must be a nonempty package name that does not contain a scope
     * @returns A full package name such as "\@example/some-library".
     */
    combineParts(scope: string, unscopedName: string): string;
}

/**
 * Common operations for manipulating file and directory paths.
 * @remarks
 * This API is intended to eventually be a complete replacement for the NodeJS "path" API.
 * @public
 */
export declare class Path {
    private static _relativePathRegex;
    private static _upwardPathSegmentRegex;
    /**
     * Returns true if "childPath" is located inside the "parentFolderPath" folder
     * or one of its child folders.  Note that "parentFolderPath" is not considered to be
     * under itself.  The "childPath" can refer to any type of file system object.
     *
     * @remarks
     * The indicated file/folder objects are not required to actually exist on disk.
     * For example, "parentFolderPath" is interpreted as a folder name even if it refers to a file.
     * If the paths are relative, they will first be resolved using path.resolve().
     */
    static isUnder(childPath: string, parentFolderPath: string): boolean;
    /**
     * Returns true if "childPath" is equal to "parentFolderPath", or if it is inside that folder
     * or one of its children.  The "childPath" can refer to any type of file system object.
     *
     * @remarks
     * The indicated file/folder objects are not required to actually exist on disk.
     * For example, "parentFolderPath" is interpreted as a folder name even if it refers to a file.
     * If the paths are relative, they will first be resolved using path.resolve().
     */
    static isUnderOrEqual(childPath: string, parentFolderPath: string): boolean;
    /**
     * Returns true if `path1` and `path2` refer to the same underlying path.
     *
     * @remarks
     *
     * The comparison is performed using `path.relative()`.
     */
    static isEqual(path1: string, path2: string): boolean;
    /**
     * Formats a path to look nice for reporting purposes.
     * @remarks
     * If `pathToConvert` is under the `baseFolder`, then it will be converted to a relative with the `./` prefix
     * unless the {@link IPathFormatConciselyOptions.trimLeadingDotSlash} option is set to `true`.
     * Otherwise, it will be converted to an absolute path.
     *
     * Backslashes will be converted to slashes, unless the path starts with an OS-specific string like `C:\`.
     */
    static formatConcisely(options: IPathFormatConciselyOptions): string;
    /**
     * Formats a file location to look nice for reporting purposes.
     * @remarks
     * If `pathToFormat` is under the `baseFolder`, then it will be converted to a relative with the `./` prefix.
     * Otherwise, it will be converted to an absolute path.
     *
     * Backslashes will be converted to slashes, unless the path starts with an OS-specific string like `C:\`.
     */
    static formatFileLocation(options: IPathFormatFileLocationOptions): string;
    /**
     * Replaces Windows-style backslashes with POSIX-style slashes.
     *
     * @remarks
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    static convertToSlashes(inputPath: string): string;
    /**
     * Replaces POSIX-style slashes with Windows-style backslashes
     *
     * @remarks
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    static convertToBackslashes(inputPath: string): string;
    /**
     * Replaces slashes or backslashes with the appropriate slash for the current operating system.
     */
    static convertToPlatformDefault(inputPath: string): string;
    /**
     * Returns true if the specified path is a relative path and does not use `..` to walk upwards.
     *
     * @example
     * ```ts
     * // These evaluate to true
     * isDownwardRelative('folder');
     * isDownwardRelative('file');
     * isDownwardRelative('folder/');
     * isDownwardRelative('./folder/');
     * isDownwardRelative('./folder/file');
     *
     * // These evaluate to false
     * isDownwardRelative('../folder');
     * isDownwardRelative('folder/../file');
     * isDownwardRelative('/folder/file');
     * ```
     */
    static isDownwardRelative(inputPath: string): boolean;
}

/**
 * An integer value used to specify file permissions for POSIX-like operating systems.
 *
 * @remarks
 *
 * This bitfield corresponds to the "mode_t" structure described in this document:
 * http://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html
 *
 * It is used with NodeJS APIs such as fs.Stat.mode and fs.chmodSync().  These values
 * represent a set of permissions and can be combined using bitwise arithmetic.
 *
 * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
 *
 * @public
 */
export declare enum PosixModeBits {
    /**
     * Indicates that the item's owner can read the item.
     */
    UserRead = 256,
    /**
     * Indicates that the item's owner can modify the item.
     */
    UserWrite = 128,
    /**
     * Indicates that the item's owner can execute the item (if it is a file)
     * or search the item (if it is a directory).
     */
    UserExecute = 64,
    /**
     * Indicates that users belonging to the item's group can read the item.
     */
    GroupRead = 32,
    /**
     * Indicates that users belonging to the item's group can modify the item.
     */
    GroupWrite = 16,
    /**
     * Indicates that users belonging to the item's group can execute the item (if it is a file)
     * or search the item (if it is a directory).
     */
    GroupExecute = 8,
    /**
     * Indicates that other users (besides the item's owner user or group) can read the item.
     */
    OthersRead = 4,
    /**
     * Indicates that other users (besides the item's owner user or group) can modify the item.
     */
    OthersWrite = 2,
    /**
     * Indicates that other users (besides the item's owner user or group) can execute the item (if it is a file)
     * or search the item (if it is a directory).
     */
    OthersExecute = 1,
    /**
     * A zero value where no permissions bits are set.
     */
    None = 0,
    /**
     * An alias combining OthersRead, GroupRead, and UserRead permission bits.
     */
    AllRead = 292,
    /**
     * An alias combining OthersWrite, GroupWrite, and UserWrite permission bits.
     */
    AllWrite = 146,
    /**
     * An alias combining OthersExecute, GroupExecute, and UserExecute permission bits.
     */
    AllExecute = 73
}

/**
 * The ProtectableMap provides an easy way for an API to expose a `Map<K, V>` property
 * while intercepting and validating any write operations that are performed by
 * consumers of the API.
 *
 * @remarks
 * The ProtectableMap itself is intended to be a private object that only its owner
 * can access directly.  Any operations performed directly on the ProtectableMap will
 * bypass the hooks and any validation they perform.  The public property that is exposed
 * to API consumers should return {@link ProtectableMap.protectedView} instead.
 *
 * For example, suppose you want to share your `Map<string, number>` data structure,
 * but you want to enforce that the key must always be an upper case string:
 * You could use the onSet() hook to validate the keys and throw an exception
 * if the key is not uppercase.
 *
 * @public
 */
export declare class ProtectableMap<K, V> {
    private readonly _protectedView;
    constructor(parameters: IProtectableMapParameters<K, V>);
    /**
     * The owner of the protectable map should return this object via its public API.
     */
    get protectedView(): Map<K, V>;
    /**
     * Removes all entries from the map.
     * This operation does NOT invoke the ProtectableMap onClear() hook.
     */
    clear(): void;
    /**
     * Removes the specified key from the map.
     * This operation does NOT invoke the ProtectableMap onDelete() hook.
     */
    delete(key: K): boolean;
    /**
     * Sets a value for the specified key.
     * This operation does NOT invoke the ProtectableMap onSet() hook.
     */
    set(key: K, value: V): this;
    /**
     * Performs an operation for each (key, value) entries in the map.
     */
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
    /**
     * Retrieves the value for the specified key.
     * @returns undefined if the value is undefined OR if the key is missing;
     * otherwise returns the value associated with the key.
     */
    get(key: K): V | undefined;
    /**
     * Returns true if the specified key belongs to the map.
     */
    has(key: K): boolean;
    /**
     * Returns the number of (key, value) entries in the map.
     */
    get size(): number;
}

/**
 * This class encapsulates a caching resolver for symlinks in node_modules directories.
 * It assumes that the only symlinks that exist in input paths are those that correspond to
 * npm packages.
 *
 * @remarks
 * In a repository with a symlinked node_modules installation, some symbolic links need to be mapped for
 * node module resolution to produce correct results. However, calling `fs.realpathSync.native` on every path,
 * as is commonly done by most resolvers, involves an enormous number of file system operations (for reference,
 * each invocation of `fs.realpathSync.native` involves a series of `fs.readlinkSync` calls, up to one for each
 * path segment in the input).
 *
 * @public
 */
export declare class RealNodeModulePathResolver {
    /**
     * Similar in function to `fs.realpathSync.native`, but assumes the only symlinks present are npm packages.
     *
     * @param input - A path to a file or directory, where the path separator is `${require('node:path').sep}`
     * @returns The real path to the input, resolving the node_modules symlinks in the path
     * @public
     */
    readonly realNodeModulePath: (input: string) => string;
    private readonly _cache;
    private readonly _errorCache;
    private readonly _fs;
    private readonly _path;
    private readonly _lstatOptions;
    constructor(options?: IRealNodeModulePathResolverOptions);
    /**
     * Clears the cache of resolved symlinks.
     * @public
     */
    clearCache(): void;
    /**
     * Tries to read a symbolic link at the specified path.
     * If the input is not a symbolic link, returns undefined.
     * @param link - The link to try to read
     * @returns The target of the symbolic link, or undefined if the input is not a symbolic link
     */
    private _tryReadLink;
}

/**
 * Operations for sorting collections.
 *
 * @public
 */
export declare class Sort {
    /**
     * Compares `x` and `y` using the JavaScript `>` and `<` operators.  This function is suitable for usage as
     * the callback for `array.sort()`.
     *
     * @remarks
     *
     * The JavaScript ordering is generalized so that `undefined` \< `null` \< all other values.
     *
     * @returns -1 if `x` is smaller than `y`, 1 if `x` is greater than `y`, or 0 if the values are equal.
     *
     * @example
     *
     * ```ts
     * let array: number[] = [3, 6, 2];
     * array.sort(Sort.compareByValue);  // [2, 3, 6]
     * ```
     */
    static compareByValue(x: any, y: any): number;
    /**
     * Sorts the array according to a key which is obtained from the array elements.
     * The result is guaranteed to be a stable sort.
     *
     * @example
     *
     * ```ts
     * let array: string[] = [ 'aaa', 'bb', 'c' ];
     * Sort.sortBy(array, x => x.length);  // [ 'c', 'bb', 'aaa' ]
     * ```
     */
    static sortBy<T>(array: T[], keySelector: (element: T) => any, comparer?: (x: any, y: any) => number): void;
    /**
     * Returns true if the collection is already sorted.
     */
    static isSorted<T>(collection: Iterable<T>, comparer?: (x: any, y: any) => number): boolean;
    /**
     * Returns true if the collection is already sorted by the specified key.
     *
     * @example
     *
     * ```ts
     * let array: string[] = [ 'a', 'bb', 'ccc' ];
     * Sort.isSortedBy(array, x => x.length); // true
     * ```
     */
    static isSortedBy<T>(collection: Iterable<T>, keySelector: (element: T) => any, comparer?: (x: any, y: any) => number): boolean;
    /**
     * Sorts the entries in a Map object according to the map keys.
     * The result is guaranteed to be a stable sort.
     *
     * @example
     *
     * ```ts
     * let map: Map<string, number> = new Map<string, number>();
     * map.set('zebra', 1);
     * map.set('goose', 2);
     * map.set('aardvark', 3);
     * Sort.sortMapKeys(map);
     * console.log(JSON.stringify(Array.from(map.keys()))); // ["aardvark","goose","zebra"]
     * ```
     */
    static sortMapKeys<K, V>(map: Map<K, V>, keyComparer?: (x: K, y: K) => number): void;
    /**
     * Sorts the entries in a Set object according to the specified keys.
     * The result is guaranteed to be a stable sort.
     *
     * @example
     *
     * ```ts
     * let set: Set<string> = new Set<string>();
     * set.add('aaa');
     * set.add('bb');
     * set.add('c');
     * Sort.sortSetBy(set, x => x.length);
     * console.log(Array.from(set)); // ['c', 'bb', 'aaa']
     * ```
     */
    static sortSetBy<T>(set: Set<T>, keySelector: (element: T) => any, keyComparer?: (x: T, y: T) => number): void;
    /**
     * Sorts the entries in a Set object.  The result is guaranteed to be a stable sort.
     *
     * @example
     *
     * ```ts
     * let set: Set<string> = new Set<string>();
     * set.add('zebra');
     * set.add('goose');
     * set.add('aardvark');
     * Sort.sortSet(set);
     * console.log(Array.from(set)); // ['aardvark', 'goose', 'zebra']
     * ```
     */
    static sortSet<T>(set: Set<T>, comparer?: (x: T, y: T) => number): void;
    /**
     * Sort the keys deeply given an object or an array.
     *
     * Doesn't handle cyclic reference.
     *
     * @param object - The object to be sorted
     *
     * @example
     *
     * ```ts
     * console.log(Sort.sortKeys({ c: 3, b: 2, a: 1 })); // { a: 1, b: 2, c: 3}
     * ```
     */
    static sortKeys<T extends Partial<Record<string, unknown>> | unknown[]>(object: T): T;
}

/**
 * This class allows a large text string to be constructed incrementally by appending small chunks.  The final
 * string can be obtained by calling StringBuilder.toString().
 *
 * @remarks
 * A naive approach might use the `+=` operator to append strings:  This would have the downside of copying
 * the entire string each time a chunk is appended, resulting in `O(n^2)` bytes of memory being allocated
 * (and later freed by the garbage  collector), and many of the allocations could be very large objects.
 * StringBuilder avoids this overhead by accumulating the chunks in an array, and efficiently joining them
 * when `getText()` is finally called.
 *
 * @public
 */
export declare class StringBuilder implements IStringBuilder {
    private _chunks;
    constructor();
    /** {@inheritDoc IStringBuilder.append} */
    append(text: string): void;
    /** {@inheritDoc IStringBuilder.toString} */
    toString(): string;
}

/**
 * When a child process is created, registering it with the SubprocessTerminator will ensure
 * that the child gets terminated when the current process terminates.
 *
 * @remarks
 * This works by hooking the current process's events for SIGTERM/SIGINT/exit, and ensuring the
 * child process gets terminated in those cases.
 *
 * SubprocessTerminator doesn't do anything on Windows, since by default Windows automatically
 * terminates child processes when their parent is terminated.
 *
 * @beta
 */
export declare class SubprocessTerminator {
    /**
     * Whether the hooks are installed
     */
    private static _initialized;
    /**
     * The list of registered child processes.  Processes are removed from this set if they
     * terminate on their own.
     */
    private static _subprocessesByPid;
    private static readonly _isWindows;
    /**
     * The recommended options when creating a child process.
     */
    static readonly RECOMMENDED_OPTIONS: ISubprocessOptions;
    /**
     * Registers a child process so that it will be terminated automatically if the current process
     * is terminated.
     */
    static killProcessTreeOnExit(subprocess: child_process.ChildProcess, subprocessOptions: ISubprocessOptions): void;
    /**
     * Terminate the child process and all of its children.
     */
    static killProcessTree(subprocess: child_process.ChildProcess, subprocessOptions: ISubprocessOptions): void;
    private static _ensureInitialized;
    private static _cleanupChildProcesses;
    private static _validateSubprocessOptions;
    private static _onExit;
    private static _onTerminateSignal;
    private static _logDebug;
}

/**
 * Operations for working with strings that contain text.
 *
 * @remarks
 * The utilities provided by this class are intended to be simple, small, and very
 * broadly applicable.
 *
 * @public
 */
export declare class Text {
    private static readonly _newLineRegEx;
    private static readonly _newLineAtEndRegEx;
    /**
     * Returns the same thing as targetString.replace(searchValue, replaceValue), except that
     * all matches are replaced, rather than just the first match.
     * @param input         - The string to be modified
     * @param searchValue   - The value to search for
     * @param replaceValue  - The replacement text
     */
    static replaceAll(input: string, searchValue: string, replaceValue: string): string;
    /**
     * Converts all newlines in the provided string to use Windows-style CRLF end of line characters.
     */
    static convertToCrLf(input: string): string;
    /**
     * Converts all newlines in the provided string to use POSIX-style LF end of line characters.
     *
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    static convertToLf(input: string): string;
    /**
     * Converts all newlines in the provided string to use the specified newline type.
     */
    static convertTo(input: string, newlineKind: NewlineKind): string;
    /**
     * Returns the newline character sequence for the specified `NewlineKind`.
     */
    static getNewline(newlineKind: NewlineKind): string;
    /**
     * Append characters to the end of a string to ensure the result has a minimum length.
     * @remarks
     * If the string length already exceeds the minimum length, then the string is unchanged.
     * The string is not truncated.
     */
    static padEnd(s: string, minimumLength: number, paddingCharacter?: string): string;
    /**
     * Append characters to the start of a string to ensure the result has a minimum length.
     * @remarks
     * If the string length already exceeds the minimum length, then the string is unchanged.
     * The string is not truncated.
     */
    static padStart(s: string, minimumLength: number, paddingCharacter?: string): string;
    /**
     * If the string is longer than maximumLength characters, truncate it to that length
     * using "..." to indicate the truncation.
     *
     * @remarks
     * For example truncateWithEllipsis('1234578', 5) would produce '12...'.
     */
    static truncateWithEllipsis(s: string, maximumLength: number): string;
    /**
     * Returns the input string with a trailing `\n` character appended, if not already present.
     */
    static ensureTrailingNewline(s: string, newlineKind?: NewlineKind): string;
    /**
     * Escapes a string so that it can be treated as a literal string when used in a regular expression.
     */
    static escapeRegExp(literal: string): string;
    /**
     * Read lines from an iterable object that returns strings or buffers, and return a generator that
     * produces the lines as strings. The lines will not include the newline characters.
     *
     * @param iterable - An iterable object that returns strings or buffers
     * @param options - Options used when reading the lines from the provided iterable
     */
    static readLinesFromIterableAsync(iterable: AsyncIterable<string | Buffer>, options?: IReadLinesFromIterableOptions): AsyncGenerator<string>;
    /**
     * Read lines from an iterable object that returns strings or buffers, and return a generator that
     * produces the lines as strings. The lines will not include the newline characters.
     *
     * @param iterable - An iterable object that returns strings or buffers
     * @param options - Options used when reading the lines from the provided iterable
     */
    static readLinesFromIterable(iterable: Iterable<string | Buffer | null>, options?: IReadLinesFromIterableOptions): Generator<string>;
    /**
     * Returns a new string that is the input string with the order of characters reversed.
     */
    static reverse(s: string): string;
    /**
     * Splits the provided string by newlines. Note that leading and trailing newlines will produce
     * leading or trailing empty string array entries.
     */
    static splitByNewLines(s: undefined): undefined;
    static splitByNewLines(s: string): string[];
    static splitByNewLines(s: string | undefined): string[] | undefined;
}

/**
 * Provides a version-independent implementation of the JavaScript `instanceof` operator.
 *
 * @remarks
 * The JavaScript `instanceof` operator normally only identifies objects from a particular library instance.
 * For example, suppose the NPM package `example-lib` has two published versions 1.2.0 and 1.3.0, and
 * it exports a class called `A`.  Suppose some code consumes version `1.3.0` of the library, but it receives
 * an object that was constructed using version `1.2.0`.  In this situation `a instanceof A` will return `false`,
 * even though `a` is an instance of `A`.  The reason is that there are two prototypes for `A`; one for each
 * version.
 *
 * The `TypeUuid` facility provides a way to make `a instanceof A` return true for both prototypes of `A`,
 * by instead using a universally unique identifier (UUID) to detect object instances.
 *
 * You can use `Symbol.hasInstance` to enable the system `instanceof` operator to recognize type UUID equivalence:
 * ```ts
 * const uuidWidget: string = '9c340ef0-d29f-4e2e-a09f-42bacc59024b';
 * class Widget {
 *   public static [Symbol.hasInstance](instance: object): boolean {
 *     return TypeUuid.isInstanceOf(instance, uuidWidget);
 *   }
 * }
 * ```
 * // Example usage:
 * ```ts
 * import { Widget as Widget1 } from 'v1-of-library';
 * import { Widget as Widget2 } from 'v2-of-library';
 * const widget = new Widget2();
 * console.log(widget instanceof Widget1); // prints true
 * ```
 *
 * @public
 */
export declare class TypeUuid {
    private static _uuidRegExp;
    /**
     * Registers a JavaScript class as having a type identified by the specified UUID.
     * @privateRemarks
     * We cannot use a construct signature for `targetClass` because it may be an abstract class.
     */
    static registerClass(targetClass: any, typeUuid: string): void;
    /**
     * Returns true if the `targetObject` is an instance of a JavaScript class that was previously
     * registered using the specified `typeUuid`.  Base classes are also considered.
     */
    static isInstanceOf(targetObject: unknown, typeUuid: string): boolean;
}

export { }
