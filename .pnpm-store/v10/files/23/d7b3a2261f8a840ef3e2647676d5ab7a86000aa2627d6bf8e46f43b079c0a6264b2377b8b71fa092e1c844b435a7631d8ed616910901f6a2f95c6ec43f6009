import type * as child_process from 'child_process';
/**
 * Details about how the `child_process.ChildProcess` was created.
 *
 * @beta
 */
export interface ISubprocessOptions {
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
//# sourceMappingURL=SubprocessTerminator.d.ts.map