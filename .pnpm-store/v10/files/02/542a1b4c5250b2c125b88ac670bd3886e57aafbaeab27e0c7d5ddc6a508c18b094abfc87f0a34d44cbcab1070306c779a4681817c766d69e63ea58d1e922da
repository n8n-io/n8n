/**
 * Sandbox class for interacting with a specific sandbox instance.
 */
import type { ExecutionResult, RunOptions } from "./types.js";
import { CommandHandle } from "./command_handle.js";
/**
 * Represents an active sandbox for running commands and file operations.
 *
 * This class is typically obtained from SandboxClient.createSandbox() and
 * provides methods for command execution and file I/O within the sandbox
 * environment.
 *
 * @example
 * ```typescript
 * const sandbox = await client.createSandbox("python-sandbox");
 * try {
 *   const result = await sandbox.run("python --version");
 *   console.log(result.stdout);
 * } finally {
 *   await sandbox.delete();
 * }
 * ```
 */
export declare class Sandbox {
    /** Display name (can be updated). */
    readonly name: string;
    /** Name of the template used to create this sandbox. */
    readonly template_name: string;
    /** URL for data plane operations (file I/O, command execution). */
    readonly dataplane_url?: string;
    /** Provisioning status ("provisioning", "ready", "failed"). */
    readonly status?: string;
    /** Human-readable status message (e.g., error details when failed). */
    readonly status_message?: string;
    /** Unique identifier (UUID). Remains constant even if name changes. */
    readonly id?: string;
    /** Timestamp when the sandbox was created. */
    readonly created_at?: string;
    /** Timestamp when the sandbox was last updated. */
    readonly updated_at?: string;
    /** Maximum lifetime TTL in seconds (`0` means disabled). */
    readonly ttl_seconds?: number;
    /** Idle timeout TTL in seconds (`0` means disabled). */
    readonly idle_ttl_seconds?: number;
    /** Computed expiration timestamp when a TTL is active. */
    readonly expires_at?: string;
    private _client;
    /**
     * Validate and return the dataplane URL.
     * @throws LangSmithSandboxNotReadyError if sandbox status is not "ready".
     * @throws LangSmithDataplaneNotConfiguredError if dataplane_url is not configured.
     */
    private requireDataplaneUrl;
    /**
     * Execute a command in the sandbox.
     *
     * When `wait` is true (default) and no streaming callbacks are provided,
     * tries WebSocket first and falls back to HTTP POST.
     *
     * When `wait` is false or streaming callbacks are provided, uses WebSocket
     * (required). Returns a CommandHandle for streaming output.
     *
     * @param command - Shell command to execute.
     * @param options - Execution options.
     * @returns ExecutionResult when wait=true, CommandHandle when wait=false.
     *
     * @example
     * ```typescript
     * // Blocking (default)
     * const result = await sandbox.run("echo hello");
     * console.log(result.stdout);
     *
     * // Streaming with callbacks
     * const result = await sandbox.run("make build", {
     *   onStdout: (data) => process.stdout.write(data),
     * });
     *
     * // Non-blocking with CommandHandle
     * const handle = await sandbox.run("make build", { wait: false });
     * for await (const chunk of handle) {
     *   process.stdout.write(chunk.data);
     * }
     * const result = await handle.result;
     * ```
     */
    run(command: string, options: RunOptions & {
        wait: false;
    }): Promise<CommandHandle>;
    run(command: string, options?: RunOptions & {
        wait?: true;
    }): Promise<ExecutionResult>;
    run(command: string, options?: RunOptions): Promise<ExecutionResult | CommandHandle>;
    /**
     * Reconnect to a running command by its command ID.
     *
     * Returns a new CommandHandle that resumes output from the given offsets.
     *
     * @param commandId - The server-assigned command ID.
     * @param options - Reconnection options with byte offsets.
     * @returns A new CommandHandle.
     */
    reconnect(commandId: string, options?: {
        stdoutOffset?: number;
        stderrOffset?: number;
    }): Promise<CommandHandle>;
    /**
     * Write content to a file in the sandbox.
     *
     * @param path - Target file path in the sandbox.
     * @param content - File content (string or bytes).
     * @param timeout - Request timeout in seconds.
     *
     * @example
     * ```typescript
     * await sandbox.write("/tmp/script.py", 'print("Hello!")');
     * ```
     */
    write(path: string, content: string | Uint8Array, timeout?: number): Promise<void>;
    /**
     * Read a file from the sandbox.
     *
     * @param path - File path to read.
     * @param timeout - Request timeout in seconds.
     * @returns File contents as Uint8Array.
     *
     * @example
     * ```typescript
     * const content = await sandbox.read("/tmp/output.txt");
     * const text = new TextDecoder().decode(content);
     * console.log(text);
     * ```
     */
    read(path: string, timeout?: number): Promise<Uint8Array>;
    /**
     * Delete this sandbox.
     *
     * @example
     * ```typescript
     * const sandbox = await client.createSandbox("python-sandbox");
     * try {
     *   await sandbox.run("echo hello");
     * } finally {
     *   await sandbox.delete();
     * }
     * ```
     */
    delete(): Promise<void>;
}
