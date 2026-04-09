/**
 * WebSocket-based command execution for long-running commands.
 *
 * Uses the `ws` npm package (optional peer dependency).
 * Install with: npm install ws
 */
import { LangSmithCommandTimeoutError, LangSmithSandboxConnectionError, LangSmithSandboxOperationError, LangSmithSandboxServerReloadError, } from "./errors.js";
async function ensureWs() {
    try {
        const ws = await import("ws");
        return { WebSocket: ws.default || ws.WebSocket || ws };
    }
    catch {
        throw new Error("WebSocket-based execution requires the 'ws' package. " +
            "Install it with: npm install ws");
    }
}
// =============================================================================
// URL and Auth Helpers
// =============================================================================
/**
 * Convert a dataplane HTTP URL to a WebSocket URL for /execute/ws.
 */
export function buildWsUrl(dataplaneUrl) {
    const wsUrl = dataplaneUrl
        .replace("https://", "wss://")
        .replace("http://", "ws://");
    return `${wsUrl}/execute/ws`;
}
/**
 * Build auth headers for the WebSocket upgrade request.
 */
export function buildAuthHeaders(apiKey) {
    if (apiKey) {
        return { "X-Api-Key": apiKey };
    }
    return {};
}
// =============================================================================
// Stream Control
// =============================================================================
/**
 * Control interface for an active WebSocket stream.
 *
 * Created before the async generator starts, bound to the WebSocket once
 * the connection opens. The CommandHandle holds a reference to this
 * object to send kill/input messages.
 */
export class WSStreamControl {
    constructor() {
        Object.defineProperty(this, "_ws", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_closed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_killed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
    }
    /** Bind to the active WebSocket. Called inside the generator. */
    _bind(ws) {
        this._ws = ws;
    }
    /** Mark as closed. Called when the generator exits. */
    _unbind() {
        this._closed = true;
        this._ws = null;
    }
    /** True if kill() has been called on this stream. */
    get killed() {
        return this._killed;
    }
    /** Send a kill message to abort the running command. */
    sendKill() {
        this._killed = true;
        if (this._ws && !this._closed && this._ws.readyState === 1) {
            this._ws.send(JSON.stringify({ type: "kill" }));
        }
    }
    /** Send stdin data to the running command. */
    sendInput(data) {
        if (this._ws && !this._closed && this._ws.readyState === 1) {
            this._ws.send(JSON.stringify({ type: "input", data }));
        }
    }
}
// =============================================================================
// Error Handling
// =============================================================================
/**
 * Raise the appropriate exception from a server error message.
 */
export function raiseForWsError(msg, commandId = "") {
    const errorType = msg.error_type ?? "CommandError";
    const errorMsg = msg.error ?? "Unknown error";
    if (errorType === "CommandTimeout") {
        throw new LangSmithCommandTimeoutError(errorMsg);
    }
    if (errorType === "CommandNotFound") {
        throw new LangSmithSandboxOperationError(commandId ? `Command not found: ${commandId}` : errorMsg, commandId ? "reconnect" : "command", errorType);
    }
    if (errorType === "SessionExpired") {
        throw new LangSmithSandboxOperationError(commandId ? `Session expired: ${commandId}` : errorMsg, commandId ? "reconnect" : "command", errorType);
    }
    throw new LangSmithSandboxOperationError(errorMsg, commandId ? "reconnect" : "command", errorType);
}
// =============================================================================
// WebSocket Stream Helpers
// =============================================================================
/**
 * Create a ws WebSocket connection and return a promise that resolves when open
 * or rejects on error.
 */
async function connectWs(url, headers) {
    const { WebSocket: WS } = await ensureWs();
    return new Promise((resolve, reject) => {
        const ws = new WS(url, { headers });
        ws.on("open", () => {
            ws.removeAllListeners("error");
            resolve(ws);
        });
        ws.on("error", (err) => {
            ws.removeAllListeners("open");
            reject(new LangSmithSandboxConnectionError(`Failed to connect to sandbox WebSocket: ${err.message}`));
        });
    });
}
/**
 * Read messages from a ws WebSocket as an async iterable.
 *
 * Yields parsed WsMessage objects. Handles close events and errors,
 * mapping them to appropriate exceptions.
 */
async function* readWsMessages(ws) {
    // Buffer incoming messages so the consumer can process them at its own pace
    const messageQueue = [];
    let resolve = null;
    let error = null;
    let done = false;
    const onMessage = (data) => {
        const raw = typeof data === "string" ? data : data.toString();
        const msg = JSON.parse(raw);
        messageQueue.push(msg);
        if (resolve) {
            const r = resolve;
            resolve = null;
            r();
        }
    };
    const onClose = (code, reason) => {
        done = true;
        if (code === 1001) {
            error = new LangSmithSandboxServerReloadError("Server is reloading, reconnect to resume");
        }
        else if (code !== 1000) {
            error = new LangSmithSandboxConnectionError(`WebSocket connection closed unexpectedly (code: ${code}, reason: ${reason.toString()})`);
        }
        if (resolve) {
            const r = resolve;
            resolve = null;
            r();
        }
    };
    const onError = (err) => {
        done = true;
        if (!error) {
            error = new LangSmithSandboxConnectionError(`WebSocket connection error: ${err.message}`);
        }
        if (resolve) {
            const r = resolve;
            resolve = null;
            r();
        }
    };
    ws.on("message", onMessage);
    ws.on("close", onClose);
    ws.on("error", onError);
    try {
        while (true) {
            // Drain buffered messages first
            while (messageQueue.length > 0) {
                yield messageQueue.shift();
            }
            // If done and queue is empty, we're finished
            if (done) {
                if (error) {
                    throw error;
                }
                return;
            }
            // Wait for next message or close/error
            await new Promise((r) => {
                resolve = r;
            });
        }
    }
    finally {
        ws.removeListener("message", onMessage);
        ws.removeListener("close", onClose);
        ws.removeListener("error", onError);
    }
}
// =============================================================================
// Async Stream Functions
// =============================================================================
/**
 * Execute a command over WebSocket, yielding raw message dicts.
 *
 * Returns a tuple of [async_message_iterator, control]. The control object
 * provides sendKill() and sendInput() methods for the CommandHandle.
 *
 * The iterator yields WsMessage objects with a "type" field:
 * - { type: "started", command_id: "...", pid: N }
 * - { type: "stdout", data: "...", offset: N }
 * - { type: "stderr", data: "...", offset: N }
 * - { type: "exit", exit_code: N }
 *
 * If onStdout/onStderr callbacks are provided, they are invoked as
 * data arrives in addition to yielding the messages.
 */
export async function runWsStream(dataplaneUrl, apiKey, command, options = {}) {
    const { timeout = 60, env, cwd, shell = "/bin/bash", onStdout, onStderr, commandId, idleTimeout = 300, killOnDisconnect = false, ttlSeconds = 600, pty, } = options;
    const wsUrl = buildWsUrl(dataplaneUrl);
    const headers = buildAuthHeaders(apiKey);
    const control = new WSStreamControl();
    async function* stream() {
        let ws;
        try {
            ws = await connectWs(wsUrl, headers);
            control._bind(ws);
            // Send execute request
            const payload = {
                type: "execute",
                command,
                timeout_seconds: timeout,
                shell,
                idle_timeout_seconds: idleTimeout,
                kill_on_disconnect: killOnDisconnect,
                ttl_seconds: ttlSeconds,
            };
            if (env)
                payload.env = env;
            if (cwd)
                payload.cwd = cwd;
            if (commandId)
                payload.command_id = commandId;
            if (pty)
                payload.pty = true;
            ws.send(JSON.stringify(payload));
            // Read messages until exit or error
            for await (const msg of readWsMessages(ws)) {
                const msgType = msg.type;
                if (msgType === "started") {
                    yield msg;
                }
                else if (msgType === "stdout") {
                    if (onStdout)
                        onStdout(msg.data);
                    yield msg;
                }
                else if (msgType === "stderr") {
                    if (onStderr)
                        onStderr(msg.data);
                    yield msg;
                }
                else if (msgType === "exit") {
                    yield msg;
                    return;
                }
                else if (msgType === "error") {
                    raiseForWsError(msg);
                }
            }
        }
        finally {
            control._unbind();
            if (ws && ws.readyState === 1) {
                ws.close();
            }
        }
    }
    return [stream(), control];
}
/**
 * Reconnect to an existing command over WebSocket.
 *
 * Returns a tuple of [async_message_iterator, control], same as runWsStream.
 * The iterator yields stdout, stderr, exit, and error messages.
 * No 'started' message is sent on reconnection.
 */
export async function reconnectWsStream(dataplaneUrl, apiKey, commandId, options = {}) {
    const { stdoutOffset = 0, stderrOffset = 0 } = options;
    const wsUrl = buildWsUrl(dataplaneUrl);
    const headers = buildAuthHeaders(apiKey);
    const control = new WSStreamControl();
    async function* stream() {
        let ws;
        try {
            ws = await connectWs(wsUrl, headers);
            control._bind(ws);
            // Send reconnect request
            ws.send(JSON.stringify({
                type: "reconnect",
                command_id: commandId,
                stdout_offset: stdoutOffset,
                stderr_offset: stderrOffset,
            }));
            // Read messages until exit or error
            for await (const msg of readWsMessages(ws)) {
                const msgType = msg.type;
                if (msgType === "stdout" || msgType === "stderr") {
                    yield msg;
                }
                else if (msgType === "exit") {
                    yield msg;
                    return;
                }
                else if (msgType === "error") {
                    raiseForWsError(msg, commandId);
                }
            }
        }
        finally {
            control._unbind();
            if (ws && ws.readyState === 1) {
                ws.close();
            }
        }
    }
    return [stream(), control];
}
