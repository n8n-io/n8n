"use strict";
/**
 * Sandbox class for interacting with a specific sandbox instance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sandbox = void 0;
const errors_js_1 = require("./errors.cjs");
const helpers_js_1 = require("./helpers.cjs");
const command_handle_js_1 = require("./command_handle.cjs");
const ws_execute_js_1 = require("./ws_execute.cjs");
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
class Sandbox {
    /** @internal */
    constructor(data, client) {
        /** Display name (can be updated). */
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Name of the template used to create this sandbox. */
        Object.defineProperty(this, "template_name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** URL for data plane operations (file I/O, command execution). */
        Object.defineProperty(this, "dataplane_url", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Provisioning status ("provisioning", "ready", "failed"). */
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Human-readable status message (e.g., error details when failed). */
        Object.defineProperty(this, "status_message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Unique identifier (UUID). Remains constant even if name changes. */
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Timestamp when the sandbox was created. */
        Object.defineProperty(this, "created_at", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Timestamp when the sandbox was last updated. */
        Object.defineProperty(this, "updated_at", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Maximum lifetime TTL in seconds (`0` means disabled). */
        Object.defineProperty(this, "ttl_seconds", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Idle timeout TTL in seconds (`0` means disabled). */
        Object.defineProperty(this, "idle_ttl_seconds", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Computed expiration timestamp when a TTL is active. */
        Object.defineProperty(this, "expires_at", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = data.name;
        this.template_name = data.template_name;
        this.dataplane_url = data.dataplane_url;
        this.status = data.status;
        this.status_message = data.status_message;
        this.id = data.id;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.ttl_seconds = data.ttl_seconds;
        this.idle_ttl_seconds = data.idle_ttl_seconds;
        this.expires_at = data.expires_at;
        this._client = client;
    }
    /**
     * Validate and return the dataplane URL.
     * @throws LangSmithSandboxNotReadyError if sandbox status is not "ready".
     * @throws LangSmithDataplaneNotConfiguredError if dataplane_url is not configured.
     */
    requireDataplaneUrl() {
        if (this.status && this.status !== "ready") {
            throw new errors_js_1.LangSmithSandboxNotReadyError(`Sandbox '${this.name}' is not ready (status: ${this.status}). ` +
                "Use waitForSandbox() to wait for the sandbox to become ready.");
        }
        if (!this.dataplane_url) {
            throw new errors_js_1.LangSmithDataplaneNotConfiguredError(`Sandbox '${this.name}' does not have a dataplane_url configured. ` +
                "Runtime operations require a dataplane URL.");
        }
        return this.dataplane_url;
    }
    async run(command, options = {}) {
        const { wait = true, onStdout, onStderr, idleTimeout, killOnDisconnect, ttlSeconds, pty, ...restOptions } = options;
        const hasCallbacks = onStdout !== undefined || onStderr !== undefined;
        if (!wait || hasCallbacks) {
            // WebSocket required for streaming / non-blocking
            const handle = await this._runWs(command, {
                ...restOptions,
                idleTimeout,
                killOnDisconnect,
                ttlSeconds,
                pty,
                onStdout,
                onStderr,
            });
            if (!wait) {
                return handle;
            }
            // wait=true with callbacks: drain stream and return result
            return handle.result;
        }
        // wait=true, no callbacks: try WS, fall back to HTTP
        try {
            const handle = await this._runWs(command, {
                ...restOptions,
                idleTimeout,
                killOnDisconnect,
                ttlSeconds,
                pty,
            });
            return await handle.result;
        }
        catch (e) {
            // Fall back to HTTP on connection errors or missing ws package
            const name = e != null && typeof e === "object" ? e.name : "";
            const message = e != null && typeof e === "object" ? e.message ?? "" : "";
            if (name === "LangSmithSandboxConnectionError" ||
                name === "LangSmithSandboxServerReloadError" ||
                message.includes("'ws' package")) {
                return this._runHttp(command, restOptions);
            }
            throw e;
        }
    }
    /**
     * Execute a command via WebSocket streaming.
     * @internal
     */
    async _runWs(command, options = {}) {
        const { timeout = 60, env, cwd, shell = "/bin/bash", onStdout, onStderr, idleTimeout, killOnDisconnect, ttlSeconds, pty, } = options;
        const dataplaneUrl = this.requireDataplaneUrl();
        const [stream, control] = await (0, ws_execute_js_1.runWsStream)(dataplaneUrl, this._client.getApiKey(), command, {
            timeout,
            env,
            cwd,
            shell,
            onStdout,
            onStderr,
            idleTimeout,
            killOnDisconnect,
            ttlSeconds,
            pty,
        });
        const handle = new command_handle_js_1.CommandHandle(stream, control, this);
        await handle._ensureStarted();
        return handle;
    }
    /**
     * Execute a command via HTTP POST (blocking).
     * @internal
     */
    async _runHttp(command, options = {}) {
        const { timeout = 60, env, cwd, shell = "/bin/bash" } = options;
        const dataplaneUrl = this.requireDataplaneUrl();
        const url = `${dataplaneUrl}/execute`;
        const payload = {
            command,
            timeout,
            shell,
        };
        if (env !== undefined) {
            payload.env = env;
        }
        if (cwd !== undefined) {
            payload.cwd = cwd;
        }
        const response = await this._client._fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout((timeout + 10) * 1000),
        });
        if (!response.ok) {
            await (0, helpers_js_1.handleSandboxHttpError)(response);
        }
        const data = await response.json();
        return {
            stdout: data.stdout ?? "",
            stderr: data.stderr ?? "",
            exit_code: data.exit_code ?? -1,
        };
    }
    /**
     * Reconnect to a running command by its command ID.
     *
     * Returns a new CommandHandle that resumes output from the given offsets.
     *
     * @param commandId - The server-assigned command ID.
     * @param options - Reconnection options with byte offsets.
     * @returns A new CommandHandle.
     */
    async reconnect(commandId, options = {}) {
        const { stdoutOffset = 0, stderrOffset = 0 } = options;
        const dataplaneUrl = this.requireDataplaneUrl();
        const [stream, control] = await (0, ws_execute_js_1.reconnectWsStream)(dataplaneUrl, this._client.getApiKey(), commandId, { stdoutOffset, stderrOffset });
        return new command_handle_js_1.CommandHandle(stream, control, this, {
            commandId,
            stdoutOffset,
            stderrOffset,
        });
    }
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
    async write(path, content, timeout = 60) {
        const dataplaneUrl = this.requireDataplaneUrl();
        const url = `${dataplaneUrl}/upload?path=${encodeURIComponent(path)}`;
        // Ensure content is bytes for multipart upload
        const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
        const formData = new FormData();
        // Create a copy to ensure we have a plain ArrayBuffer (not SharedArrayBuffer)
        const buffer = new Uint8Array(bytes).buffer;
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        formData.append("file", blob, "file");
        const response = await this._client._fetch(url, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(timeout * 1000),
        });
        if (!response.ok) {
            await (0, helpers_js_1.handleSandboxHttpError)(response);
        }
    }
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
    async read(path, timeout = 60) {
        const dataplaneUrl = this.requireDataplaneUrl();
        const url = `${dataplaneUrl}/download?path=${encodeURIComponent(path)}`;
        const response = await this._client._fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(timeout * 1000),
        });
        if (!response.ok) {
            await (0, helpers_js_1.handleSandboxHttpError)(response);
        }
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
    }
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
    async delete() {
        await this._client.deleteSandbox(this.name);
    }
}
exports.Sandbox = Sandbox;
