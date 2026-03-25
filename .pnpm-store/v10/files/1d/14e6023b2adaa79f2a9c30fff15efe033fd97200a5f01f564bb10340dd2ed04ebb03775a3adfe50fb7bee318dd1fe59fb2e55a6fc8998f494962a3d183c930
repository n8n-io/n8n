import { ChildProcessByStdio, SpawnOptions, ChildProcess } from 'child_process';
/**
 * The signature for the cleanup method.
 *
 * Arguments indicate the exit status of the child process.
 *
 * If a Promise is returned, then the process is not terminated
 * until it resolves, and the resolution value is treated as the
 * exit status (if a number) or signal exit (if a signal string).
 *
 * If `undefined` is returned, then no change is made, and the parent
 * exits in the same way that the child exited.
 *
 * If boolean `false` is returned, then the parent's exit is canceled.
 *
 * If a number is returned, then the parent process exits with the number
 * as its exitCode.
 *
 * If a signal string is returned, then the parent process is killed with
 * the same signal that caused the child to exit.
 */
export type Cleanup = (code: number | null, signal: null | NodeJS.Signals, processInfo: {
    watchdogPid?: ChildProcess['pid'];
}) => void | undefined | number | NodeJS.Signals | false | Promise<void | undefined | number | NodeJS.Signals | false>;
export type FgArgs = [program: string | [cmd: string, ...args: string[]], cleanup?: Cleanup] | [
    program: [cmd: string, ...args: string[]],
    opts?: SpawnOptions,
    cleanup?: Cleanup
] | [program: string, cleanup?: Cleanup] | [program: string, opts?: SpawnOptions, cleanup?: Cleanup] | [program: string, args?: string[], cleanup?: Cleanup] | [
    program: string,
    args?: string[],
    opts?: SpawnOptions,
    cleanup?: Cleanup
];
/**
 * Normalizes the arguments passed to `foregroundChild`.
 *
 * Exposed for testing.
 *
 * @internal
 */
export declare const normalizeFgArgs: (fgArgs: FgArgs) => [program: string, args: string[], spawnOpts: SpawnOptions, cleanup: Cleanup];
/**
 * Spawn the specified program as a "foreground" process, or at least as
 * close as is possible given node's lack of exec-without-fork.
 *
 * Cleanup method may be used to modify or ignore the result of the child's
 * exit code or signal. If cleanup returns undefined (or a Promise that
 * resolves to undefined), then the parent will exit in the same way that
 * the child did.
 *
 * Return boolean `false` to prevent the parent's exit entirely.
 */
export declare function foregroundChild(cmd: string | [cmd: string, ...args: string[]], cleanup?: Cleanup): ChildProcessByStdio<null, null, null>;
export declare function foregroundChild(program: string, args?: string[], cleanup?: Cleanup): ChildProcessByStdio<null, null, null>;
export declare function foregroundChild(program: string, spawnOpts?: SpawnOptions, cleanup?: Cleanup): ChildProcessByStdio<null, null, null>;
export declare function foregroundChild(program: string, args?: string[], spawnOpts?: SpawnOptions, cleanup?: Cleanup): ChildProcessByStdio<null, null, null>;
//# sourceMappingURL=index.d.ts.map