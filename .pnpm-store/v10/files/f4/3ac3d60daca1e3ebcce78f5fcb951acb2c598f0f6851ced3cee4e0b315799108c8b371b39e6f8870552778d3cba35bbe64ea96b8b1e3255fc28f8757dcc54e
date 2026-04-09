"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeTranscription = void 0;
const ws_1 = __importDefault(require("ws"));
const config_js_1 = require("../../lib/config.js");
const sdks_js_1 = require("../../lib/sdks.js");
const security_js_1 = require("../../lib/security.js");
const connection_js_1 = require("./connection.js");
const errors_js_1 = require("./errors.js");
/** Client for realtime transcription over WebSocket. */
class RealtimeTranscription extends sdks_js_1.ClientSDK {
    async connect(model, options = {}) {
        const securityInput = await (0, security_js_1.extractSecurity)(this._options.apiKey);
        const resolvedSecurity = (0, security_js_1.resolveGlobalSecurity)(securityInput == null ? {} : { apiKey: securityInput });
        const headers = {};
        headers["User-Agent"] = this._options.userAgent ?? config_js_1.SDK_METADATA.userAgent;
        if (resolvedSecurity?.headers) {
            Object.assign(headers, resolvedSecurity.headers);
        }
        if (options.httpHeaders) {
            Object.assign(headers, options.httpHeaders);
        }
        const url = this.getWsUrl(model, {
            serverUrl: options.serverUrl,
            queryParams: resolvedSecurity?.queryParams ?? {},
        });
        let websocket;
        try {
            websocket = new ws_1.default(url, { headers });
            const { session, initialEvents } = await recvSession(websocket, options.timeoutMs ?? this._options.timeoutMs);
            const connection = new connection_js_1.RealtimeConnection(websocket, session, initialEvents);
            if (options.audioFormat) {
                await connection.updateSession(options.audioFormat);
            }
            return connection;
        }
        catch (err) {
            if (err instanceof errors_js_1.RealtimeTranscriptionException) {
                throw err;
            }
            if (websocket) {
                websocket.close();
            }
            throw new errors_js_1.RealtimeTranscriptionException(`Failed to connect to transcription service: ${String(err)}`, { cause: err });
        }
    }
    async *transcribeStream(audioStream, model, options = {}) {
        const connection = await this.connect(model, options);
        let stopRequested = false;
        const sendAudioTask = (async () => {
            try {
                for await (const chunk of audioStream) {
                    if (stopRequested || connection.isClosed) {
                        break;
                    }
                    await connection.sendAudio(chunk);
                }
            }
            finally {
                if (!connection.isClosed) {
                    await connection.flushAudio();
                }
                await connection.endAudio();
            }
        })();
        try {
            for await (const event of connection) {
                yield event;
                if (event.type === "transcription.done") {
                    break;
                }
                if (event.type === "error") {
                    break;
                }
            }
        }
        finally {
            stopRequested = true;
            await connection.close();
            await sendAudioTask;
            const maybeReturn = audioStream.return;
            if (typeof maybeReturn === "function") {
                await maybeReturn.call(audioStream);
            }
        }
    }
    getWsUrl(model, options) {
        const baseUrl = options.serverUrl ?? this._baseURL?.toString();
        if (!baseUrl) {
            throw new errors_js_1.RealtimeTranscriptionException("No server URL configured.");
        }
        const wsUrl = new URL("v1/audio/transcriptions/realtime", normalizeBaseUrl(baseUrl));
        const params = new URLSearchParams({ model });
        for (const [key, value] of Object.entries(options.queryParams)) {
            if (value) {
                params.set(key, value);
            }
        }
        wsUrl.search = params.toString();
        return wsUrl.toString();
    }
}
exports.RealtimeTranscription = RealtimeTranscription;
async function recvSession(websocket, timeoutMs) {
    let timeoutId;
    const initialEvents = [];
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            websocket.removeEventListener("message", handleMessage);
            websocket.removeEventListener("close", handleClose);
            websocket.removeEventListener("error", handleError);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
        const fail = (error) => {
            cleanup();
            try {
                websocket.close();
            }
            catch (closeError) {
                void closeError;
            }
            reject(error);
        };
        const handleMessage = (event) => {
            const parsed = (0, connection_js_1.parseRealtimeEventFromData)(event.data);
            initialEvents.push(parsed);
            if (parsed.type === "error") {
                if ((0, connection_js_1.isUnknownRealtimeEvent)(parsed)) {
                    fail(new errors_js_1.RealtimeTranscriptionWSError(parsed.error?.message ?? "Realtime transcription error during handshake.", {
                        rawPayload: parsed.raw,
                        cause: parsed.error,
                    }));
                    return;
                }
                if (isRealtimeErrorEvent(parsed)) {
                    const errorMessage = typeof parsed.error.message === "string"
                        ? parsed.error.message
                        : JSON.stringify(parsed.error.message);
                    fail(new errors_js_1.RealtimeTranscriptionWSError(errorMessage, {
                        payload: parsed,
                        code: parsed.error.code,
                    }));
                    return;
                }
            }
            if ((0, connection_js_1.isUnknownRealtimeEvent)(parsed)) {
                return;
            }
            if (isSessionCreatedEvent(parsed)) {
                cleanup();
                resolve({ session: parsed.session, initialEvents });
            }
        };
        const handleClose = () => {
            fail(new errors_js_1.RealtimeTranscriptionException("Unexpected websocket handshake close."));
        };
        const handleError = (event) => {
            fail(new errors_js_1.RealtimeTranscriptionException("Failed to connect to transcription service.", { cause: normalizeWsError(event) }));
        };
        websocket.addEventListener("message", handleMessage);
        websocket.addEventListener("close", handleClose);
        websocket.addEventListener("error", handleError);
        if (timeoutMs && timeoutMs > 0) {
            timeoutId = setTimeout(() => {
                fail(new errors_js_1.RealtimeTranscriptionException("Timeout waiting for session creation."));
            }, timeoutMs);
        }
    });
}
function normalizeWsError(event) {
    if (event instanceof Error) {
        return event;
    }
    if (typeof event === "object"
        && event !== null
        && "error" in event
        && event.error instanceof Error) {
        return event.error;
    }
    return new Error("WebSocket connection error");
}
function isRealtimeErrorEvent(event) {
    return !(0, connection_js_1.isUnknownRealtimeEvent)(event) && "error" in event;
}
function isSessionCreatedEvent(event) {
    return !(0, connection_js_1.isUnknownRealtimeEvent)(event)
        && "session" in event
        && event.type === "session.created";
}
function normalizeBaseUrl(baseUrl) {
    const url = new URL(baseUrl);
    url.pathname = url.pathname.replace(/\/+$/, "") + "/";
    return url;
}
//# sourceMappingURL=transcription.js.map