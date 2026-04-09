"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeConnection = void 0;
exports.isUnknownRealtimeEvent = isUnknownRealtimeEvent;
exports.parseRealtimeEventFromData = parseRealtimeEventFromData;
const node_buffer_1 = require("node:buffer");
const transcriptionstreamdone_js_1 = require("../../models/components/transcriptionstreamdone.js");
const transcriptionstreamlanguage_js_1 = require("../../models/components/transcriptionstreamlanguage.js");
const transcriptionstreamsegmentdelta_js_1 = require("../../models/components/transcriptionstreamsegmentdelta.js");
const transcriptionstreamtextdelta_js_1 = require("../../models/components/transcriptionstreamtextdelta.js");
const audioformat_js_1 = require("../../models/components/audioformat.js");
const realtimetranscriptionerror_js_1 = require("../../models/components/realtimetranscriptionerror.js");
const realtimetranscriptionsessioncreated_js_1 = require("../../models/components/realtimetranscriptionsessioncreated.js");
const realtimetranscriptionsessionupdated_js_1 = require("../../models/components/realtimetranscriptionsessionupdated.js");
const WS_CLOSING = 2;
const WS_CLOSED = 3;
/** @internal */
function isUnknownRealtimeEvent(event) {
    return "raw" in event;
}
/** @internal */
function parseRealtimeEventFromData(data) {
    try {
        const payload = messageDataToString(data);
        try {
            const parsed = JSON.parse(payload);
            return parseRealtimeEvent(parsed);
        }
        catch (err) {
            const error = err instanceof Error
                ? err
                : new Error("Failed to parse websocket JSON", { cause: err });
            return unknownEvent("unknown", payload, error);
        }
    }
    catch (err) {
        const error = err instanceof Error
            ? err
            : new Error("Failed to read websocket message", { cause: err });
        return unknownEvent("unknown", data, error);
    }
}
/** WebSocket connection for realtime transcription. */
class RealtimeConnection {
    constructor(websocket, session, initialEvents = []) {
        this.closed = false;
        this.websocket = websocket;
        this.currentSession = session;
        this.currentAudioFormat = session.audioFormat;
        this.initialEvents = [...initialEvents];
    }
    get requestId() {
        return this.currentSession.requestId;
    }
    get session() {
        return this.currentSession;
    }
    get audioFormat() {
        return this.currentAudioFormat;
    }
    get isClosed() {
        return (this.closed
            || this.websocket.readyState === WS_CLOSING
            || this.websocket.readyState === WS_CLOSED);
    }
    [Symbol.asyncIterator]() {
        return this.events();
    }
    async *events() {
        const queued = this.initialEvents;
        this.initialEvents = [];
        for (const event of queued) {
            this.applySessionEvent(event);
            yield event;
        }
        const queue = [];
        let resolver = null;
        let done = false;
        const push = (item) => {
            if (done) {
                return;
            }
            if (resolver) {
                const resolve = resolver;
                resolver = null;
                resolve(item);
                return;
            }
            queue.push(item);
        };
        const handleMessage = (event) => {
            push({ kind: "message", data: event.data });
        };
        const handleClose = () => {
            this.closed = true;
            push({ kind: "close" });
        };
        const handleError = (event) => {
            push({ kind: "error", error: normalizeWsError(event) });
        };
        this.websocket.addEventListener("message", handleMessage);
        this.websocket.addEventListener("close", handleClose);
        this.websocket.addEventListener("error", handleError);
        try {
            while (true) {
                const item = queue.length > 0
                    ? queue.shift()
                    : await new Promise((resolve) => {
                        resolver = resolve;
                    });
                if (item.kind === "close") {
                    break;
                }
                if (item.kind === "error") {
                    const error = item.error ?? new Error("WebSocket connection error");
                    yield unknownEvent("unknown", error, error);
                    continue;
                }
                const event = parseRealtimeEventFromData(item.data);
                this.applySessionEvent(event);
                yield event;
            }
        }
        finally {
            done = true;
            this.websocket.removeEventListener("message", handleMessage);
            this.websocket.removeEventListener("close", handleClose);
            this.websocket.removeEventListener("error", handleError);
            if (resolver !== null) {
                const resolve = resolver;
                resolver = null;
                resolve({ kind: "close" });
            }
        }
    }
    async sendAudio(audioBytes) {
        if (this.isClosed) {
            throw new Error("Connection is closed");
        }
        const message = {
            type: "input_audio.append",
            audio: node_buffer_1.Buffer.from(toUint8Array(audioBytes)).toString("base64"),
        };
        await this.sendJson(message);
    }
    async flushAudio() {
        if (this.isClosed) {
            throw new Error("Connection is closed");
        }
        await this.sendJson({ type: "input_audio.flush" });
    }
    async updateSession(audioFormat) {
        if (this.isClosed) {
            throw new Error("Connection is closed");
        }
        const message = {
            type: "session.update",
            session: {
                audio_format: audioformat_js_1.AudioFormat$outboundSchema.parse(audioFormat),
            },
        };
        await this.sendJson(message);
        this.currentAudioFormat = audioFormat;
    }
    async endAudio() {
        if (this.isClosed) {
            return;
        }
        await this.sendJson({ type: "input_audio.end" });
    }
    async close(code = 1000, reason = "") {
        if (this.closed) {
            return;
        }
        this.closed = true;
        if (this.websocket.readyState === WS_CLOSED) {
            return;
        }
        await new Promise((resolve) => {
            const finalize = () => {
                this.websocket.removeEventListener("close", finalize);
                resolve();
            };
            this.websocket.addEventListener("close", finalize);
            this.websocket.close(code, reason);
        });
    }
    async sendJson(payload) {
        const message = JSON.stringify(payload);
        await new Promise((resolve, reject) => {
            this.websocket.send(message, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    applySessionEvent(event) {
        if (isUnknownRealtimeEvent(event)) {
            return;
        }
        if ("session" in event) {
            this.currentSession = event.session;
            this.currentAudioFormat = event.session.audioFormat;
        }
    }
}
exports.RealtimeConnection = RealtimeConnection;
function parseRealtimeEvent(payload) {
    if (!isRecord(payload)) {
        return unknownEvent("unknown", payload, new Error("Invalid websocket message payload (expected JSON object)."));
    }
    const msgType = payload["type"];
    if (typeof msgType !== "string") {
        return unknownEvent("unknown", payload, new Error("Invalid websocket message payload (missing `type`)."));
    }
    if (msgType === "session.created") {
        return parseWithSchema(realtimetranscriptionsessioncreated_js_1.RealtimeTranscriptionSessionCreated$inboundSchema, payload, msgType);
    }
    if (msgType === "session.updated") {
        return parseWithSchema(realtimetranscriptionsessionupdated_js_1.RealtimeTranscriptionSessionUpdated$inboundSchema, payload, msgType);
    }
    if (msgType === "error") {
        return parseWithSchema(realtimetranscriptionerror_js_1.RealtimeTranscriptionError$inboundSchema, payload, msgType);
    }
    if (msgType === "transcription.language") {
        return parseWithSchema(transcriptionstreamlanguage_js_1.TranscriptionStreamLanguage$inboundSchema, payload, msgType);
    }
    if (msgType === "transcription.segment") {
        return parseWithSchema(transcriptionstreamsegmentdelta_js_1.TranscriptionStreamSegmentDelta$inboundSchema, payload, msgType);
    }
    if (msgType === "transcription.text.delta") {
        return parseWithSchema(transcriptionstreamtextdelta_js_1.TranscriptionStreamTextDelta$inboundSchema, payload, msgType);
    }
    if (msgType === "transcription.done") {
        return parseWithSchema(transcriptionstreamdone_js_1.TranscriptionStreamDone$inboundSchema, payload, msgType);
    }
    return unknownEvent(msgType, payload);
}
function parseWithSchema(schema, payload, msgType) {
    const result = schema.safeParse(payload);
    if (result.success) {
        return result.data;
    }
    const error = new Error(`Invalid websocket message payload for ${msgType}.`, { cause: result.error });
    return unknownEvent(msgType, payload, error);
}
function unknownEvent(type, raw, error) {
    return {
        type,
        raw,
        error,
    };
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
function messageDataToString(data) {
    if (typeof data === "string") {
        return data;
    }
    if (node_buffer_1.Buffer.isBuffer(data)) {
        return data.toString("utf8");
    }
    if (Array.isArray(data) && data.every((item) => node_buffer_1.Buffer.isBuffer(item))) {
        return node_buffer_1.Buffer.concat(data).toString("utf8");
    }
    if (data instanceof ArrayBuffer) {
        return node_buffer_1.Buffer.from(data).toString("utf8");
    }
    if (ArrayBuffer.isView(data)) {
        return node_buffer_1.Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
    }
    throw new Error("Unsupported websocket message format");
}
function toUint8Array(value) {
    if (value instanceof Uint8Array) {
        return value;
    }
    if (value instanceof ArrayBuffer) {
        return new Uint8Array(value);
    }
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=connection.js.map