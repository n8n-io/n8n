/**
 * CommandHandle - async handle to a running command with streaming output
 * and auto-reconnect.
 *
 * Port of Python's AsyncCommandHandle to TypeScript.
 */
import type { ExecutionResult, OutputChunk } from "./types.js";
/**
 * Async handle to a running command with streaming output and auto-reconnect.
 *
 * Async iterable, yielding OutputChunk objects (stdout and stderr interleaved
 * in arrival order). Access .result after iteration to get the full
 * ExecutionResult.
 *
 * Auto-reconnect behavior:
 * - Server hot-reload (1001 Going Away): reconnect immediately
 * - Network error / unexpected close:    reconnect with exponential backoff
 * - User called kill():                  do NOT reconnect (propagate error)
 *
 * @example
 * ```typescript
 * const handle = await sandbox.run("make build", { timeout: 600, wait: false });
 *
 * for await (const chunk of handle) {  // auto-reconnects on transient errors
 *   process.stdout.write(chunk.data);
 * }
 *
 * const result = await handle.result;
 * console.log(`Exit code: ${result.exit_code}`);
 * ```
 */
export declare class CommandHandle {
    static MAX_AUTO_RECONNECTS: number;
    static BACKOFF_BASE: number;
    static BACKOFF_MAX: number;
    private _stream;
    private _control;
    private _sandbox;
    private _commandId;
    private _pid;
    private _result;
    private _stdoutParts;
    private _stderrParts;
    private _exhausted;
    private _lastStdoutOffset;
    private _lastStderrOffset;
    private _started;
    /**
     * Read the 'started' message to populate commandId and pid.
     *
     * Must be called (and awaited) before iterating for new executions.
     */
    _ensureStarted(): Promise<void>;
    /** The server-assigned command ID. Available after _ensureStarted(). */
    get commandId(): string | null;
    /** The process ID on the sandbox. Available after _ensureStarted(). */
    get pid(): number | null;
    /**
     * The final execution result. Drains the stream if not already exhausted.
     */
    get result(): Promise<ExecutionResult>;
    private _getResult;
    /**
     * Iterate over output chunks from the current stream (no reconnect).
     */
    private _iterStream;
    /**
     * Async iterate over output chunks with auto-reconnect on transient errors.
     *
     * Reconnect strategy:
     * - 1001 Going Away (hot-reload): immediate reconnect, no delay
     * - Other SandboxConnectionError:  exponential backoff (0.5s, 1s, 2s...)
     * - After kill():                  no reconnect, error propagates
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<OutputChunk>;
    /**
     * Send a kill signal to the running command (SIGKILL).
     *
     * The server kills the entire process group. The stream will
     * subsequently yield an exit message with a non-zero exit code.
     */
    kill(): void;
    /**
     * Write data to the command's stdin.
     */
    sendInput(data: string): void;
    /** Last known stdout byte offset (for manual reconnection). */
    get lastStdoutOffset(): number;
    /** Last known stderr byte offset (for manual reconnection). */
    get lastStderrOffset(): number;
    /**
     * Reconnect to this command from the last known offsets.
     *
     * Returns a new CommandHandle that resumes output from where this one
     * left off.
     */
    reconnect(): Promise<CommandHandle>;
}
