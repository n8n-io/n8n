/**
 * CommandHandle - async handle to a running command with streaming output
 * and auto-reconnect.
 *
 * Port of Python's AsyncCommandHandle to TypeScript.
 */
import { LangSmithSandboxConnectionError, LangSmithSandboxOperationError, } from "./errors.js";
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
export class CommandHandle {
    /** @internal */
    constructor(messageStream, control, sandbox, options) {
        Object.defineProperty(this, "_stream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_control", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_sandbox", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_commandId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_pid", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_result", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_stdoutParts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_stderrParts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_exhausted", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_lastStdoutOffset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_lastStderrOffset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_started", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._stream = messageStream;
        this._control = control;
        this._sandbox = sandbox;
        this._lastStdoutOffset = options?.stdoutOffset ?? 0;
        this._lastStderrOffset = options?.stderrOffset ?? 0;
        // New executions (no commandId): _ensureStarted reads "started".
        // Reconnections (commandId set): skip since reconnect streams
        // don't send a "started" message.
        if (options?.commandId) {
            this._commandId = options.commandId;
            this._started = true;
        }
        else {
            this._started = false;
        }
    }
    /**
     * Read the 'started' message to populate commandId and pid.
     *
     * Must be called (and awaited) before iterating for new executions.
     */
    async _ensureStarted() {
        if (this._started)
            return;
        const firstResult = await this._stream.next();
        if (firstResult.done) {
            throw new LangSmithSandboxOperationError("Command stream ended before 'started' message", "command");
        }
        const firstMsg = firstResult.value;
        if (firstMsg.type !== "started") {
            throw new LangSmithSandboxOperationError(`Expected 'started' message, got '${firstMsg.type}'`, "command");
        }
        this._commandId = firstMsg.command_id ?? null;
        this._pid = firstMsg.pid ?? null;
        this._started = true;
    }
    /** The server-assigned command ID. Available after _ensureStarted(). */
    get commandId() {
        return this._commandId;
    }
    /** The process ID on the sandbox. Available after _ensureStarted(). */
    get pid() {
        return this._pid;
    }
    /**
     * The final execution result. Drains the stream if not already exhausted.
     */
    get result() {
        return this._getResult();
    }
    async _getResult() {
        if (this._result === null) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of this) {
                // drain
            }
        }
        if (this._result === null) {
            throw new LangSmithSandboxOperationError("Command stream ended without exit message", "command");
        }
        return this._result;
    }
    /**
     * Iterate over output chunks from the current stream (no reconnect).
     */
    async *_iterStream() {
        await this._ensureStarted();
        if (this._exhausted)
            return;
        for await (const msg of this._stream) {
            const msgType = msg.type;
            if (msgType === "stdout" || msgType === "stderr") {
                const chunk = {
                    stream: msgType,
                    data: msg.data,
                    offset: msg.offset ?? 0,
                };
                if (msgType === "stdout") {
                    this._stdoutParts.push(msg.data);
                }
                else {
                    this._stderrParts.push(msg.data);
                }
                yield chunk;
            }
            else if (msgType === "exit") {
                this._result = {
                    stdout: this._stdoutParts.join(""),
                    stderr: this._stderrParts.join(""),
                    exit_code: msg.exit_code ?? -1,
                };
                this._exhausted = true;
                return;
            }
        }
        this._exhausted = true;
    }
    /**
     * Async iterate over output chunks with auto-reconnect on transient errors.
     *
     * Reconnect strategy:
     * - 1001 Going Away (hot-reload): immediate reconnect, no delay
     * - Other SandboxConnectionError:  exponential backoff (0.5s, 1s, 2s...)
     * - After kill():                  no reconnect, error propagates
     */
    async *[Symbol.asyncIterator]() {
        let reconnectAttempts = 0;
        while (true) {
            try {
                for await (const chunk of this._iterStream()) {
                    reconnectAttempts = 0; // Reset on successful data
                    if (chunk.stream === "stdout") {
                        this._lastStdoutOffset =
                            chunk.offset + new TextEncoder().encode(chunk.data).length;
                    }
                    else {
                        this._lastStderrOffset =
                            chunk.offset + new TextEncoder().encode(chunk.data).length;
                    }
                    yield chunk;
                }
                return; // Stream ended normally (exit message received)
            }
            catch (e) {
                const eName = e != null && typeof e === "object" ? e.name : "";
                if (eName !== "LangSmithSandboxConnectionError" &&
                    eName !== "LangSmithSandboxServerReloadError") {
                    throw e;
                }
                if (this._control && this._control.killed) {
                    throw e;
                }
                reconnectAttempts++;
                if (reconnectAttempts > CommandHandle.MAX_AUTO_RECONNECTS) {
                    throw new LangSmithSandboxConnectionError(`Lost connection ${reconnectAttempts} times in succession, giving up`);
                }
                const isHotReload = eName === "LangSmithSandboxServerReloadError";
                if (!isHotReload) {
                    const delay = Math.min(CommandHandle.BACKOFF_BASE * 2 ** (reconnectAttempts - 1), CommandHandle.BACKOFF_MAX);
                    await new Promise((r) => setTimeout(r, delay * 1000));
                }
                if (this._commandId === null) {
                    throw e;
                }
                const newHandle = await this._sandbox.reconnect(this._commandId, {
                    stdoutOffset: this._lastStdoutOffset,
                    stderrOffset: this._lastStderrOffset,
                });
                this._stream = newHandle._stream;
                this._control = newHandle._control;
                this._exhausted = false;
            }
        }
    }
    /**
     * Send a kill signal to the running command (SIGKILL).
     *
     * The server kills the entire process group. The stream will
     * subsequently yield an exit message with a non-zero exit code.
     */
    kill() {
        if (this._control) {
            this._control.sendKill();
        }
    }
    /**
     * Write data to the command's stdin.
     */
    sendInput(data) {
        if (this._control) {
            this._control.sendInput(data);
        }
    }
    /** Last known stdout byte offset (for manual reconnection). */
    get lastStdoutOffset() {
        return this._lastStdoutOffset;
    }
    /** Last known stderr byte offset (for manual reconnection). */
    get lastStderrOffset() {
        return this._lastStderrOffset;
    }
    /**
     * Reconnect to this command from the last known offsets.
     *
     * Returns a new CommandHandle that resumes output from where this one
     * left off.
     */
    async reconnect() {
        if (this._commandId === null) {
            throw new LangSmithSandboxOperationError("Cannot reconnect: command ID not available", "reconnect");
        }
        return this._sandbox.reconnect(this._commandId, {
            stdoutOffset: this._lastStdoutOffset,
            stderrOffset: this._lastStderrOffset,
        });
    }
}
Object.defineProperty(CommandHandle, "MAX_AUTO_RECONNECTS", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 5
});
Object.defineProperty(CommandHandle, "BACKOFF_BASE", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 0.5
}); // seconds
Object.defineProperty(CommandHandle, "BACKOFF_MAX", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 8.0
}); // seconds
