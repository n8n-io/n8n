import { Buffer } from "node:buffer";
import WebSocket from "ws";
import {
  TranscriptionStreamDone,
  TranscriptionStreamDone$inboundSchema,
} from "../../models/components/transcriptionstreamdone.js";
import {
  TranscriptionStreamLanguage,
  TranscriptionStreamLanguage$inboundSchema,
} from "../../models/components/transcriptionstreamlanguage.js";
import {
  TranscriptionStreamSegmentDelta,
  TranscriptionStreamSegmentDelta$inboundSchema,
} from "../../models/components/transcriptionstreamsegmentdelta.js";
import {
  TranscriptionStreamTextDelta,
  TranscriptionStreamTextDelta$inboundSchema,
} from "../../models/components/transcriptionstreamtextdelta.js";
import {
  AudioFormat$outboundSchema,
  type AudioFormat,
} from "../../models/components/audioformat.js";
import {
  RealtimeTranscriptionError$inboundSchema,
  type RealtimeTranscriptionError,
} from "../../models/components/realtimetranscriptionerror.js";
import type {
  RealtimeTranscriptionSession,
} from "../../models/components/realtimetranscriptionsession.js";
import {
  RealtimeTranscriptionSessionCreated$inboundSchema,
  type RealtimeTranscriptionSessionCreated,
} from "../../models/components/realtimetranscriptionsessioncreated.js";
import {
  RealtimeTranscriptionSessionUpdated$inboundSchema,
  type RealtimeTranscriptionSessionUpdated,
} from "../../models/components/realtimetranscriptionsessionupdated.js";

const WS_CLOSING = 2;
const WS_CLOSED = 3;

export type KnownRealtimeEvent =
  | RealtimeTranscriptionSessionCreated
  | RealtimeTranscriptionSessionUpdated
  | RealtimeTranscriptionError
  | TranscriptionStreamLanguage
  | TranscriptionStreamSegmentDelta
  | TranscriptionStreamTextDelta
  | TranscriptionStreamDone;

export type UnknownRealtimeEvent = {
  type: string;
  raw: unknown;
  error?: Error | undefined;
};

export type RealtimeEvent = KnownRealtimeEvent | UnknownRealtimeEvent;

/** @internal */
export function isUnknownRealtimeEvent(
  event: RealtimeEvent,
): event is UnknownRealtimeEvent {
  return "raw" in event;
}

/** @internal */
export function parseRealtimeEventFromData(data: unknown): RealtimeEvent {
  try {
    const payload = messageDataToString(data);
    try {
      const parsed = JSON.parse(payload);
      return parseRealtimeEvent(parsed);
    } catch (err) {
      const error = err instanceof Error
        ? err
        : new Error("Failed to parse websocket JSON", { cause: err });
      return unknownEvent("unknown", payload, error);
    }
  } catch (err) {
    const error = err instanceof Error
      ? err
      : new Error("Failed to read websocket message", { cause: err });
    return unknownEvent("unknown", data, error);
  }
}

/** WebSocket connection for realtime transcription. */
export class RealtimeConnection implements AsyncIterable<RealtimeEvent> {
  private readonly websocket: WebSocket;
  private closed = false;
  private currentAudioFormat: AudioFormat;
  private currentSession: RealtimeTranscriptionSession;
  private initialEvents: RealtimeEvent[];

  constructor(
    websocket: WebSocket,
    session: RealtimeTranscriptionSession,
    initialEvents: RealtimeEvent[] = [],
  ) {
    this.websocket = websocket;
    this.currentSession = session;
    this.currentAudioFormat = session.audioFormat;
    this.initialEvents = [...initialEvents];
  }

  get requestId(): string {
    return this.currentSession.requestId;
  }

  get session(): RealtimeTranscriptionSession {
    return this.currentSession;
  }

  get audioFormat(): AudioFormat {
    return this.currentAudioFormat;
  }

  get isClosed(): boolean {
    return (
      this.closed
      || this.websocket.readyState === WS_CLOSING
      || this.websocket.readyState === WS_CLOSED
    );
  }

  [Symbol.asyncIterator](): AsyncIterator<RealtimeEvent> {
    return this.events();
  }

  async *events(): AsyncGenerator<RealtimeEvent> {
    const queued = this.initialEvents;
    this.initialEvents = [];
    for (const event of queued) {
      this.applySessionEvent(event);
      yield event;
    }

    type QueueItem = {
      kind: "message" | "close" | "error";
      data?: unknown;
      error?: Error;
    };
    const queue: QueueItem[] = [];
    let resolver: ((item: QueueItem) => void) | null = null;
    let done = false;

    const push = (item: QueueItem) => {
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

    const handleMessage = (event: WebSocket.MessageEvent) => {
      push({ kind: "message", data: event.data });
    };

    const handleClose = () => {
      this.closed = true;
      push({ kind: "close" });
    };

    const handleError = (event: unknown) => {
      push({ kind: "error", error: normalizeWsError(event) });
    };

    this.websocket.addEventListener("message", handleMessage);
    this.websocket.addEventListener("close", handleClose);
    this.websocket.addEventListener("error", handleError);

    try {
      while (true) {
        const item = queue.length > 0
          ? queue.shift()!
          : await new Promise<QueueItem>((resolve) => {
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
    } finally {
      done = true;
      this.websocket.removeEventListener("message", handleMessage);
      this.websocket.removeEventListener("close", handleClose);
      this.websocket.removeEventListener("error", handleError);
      if (resolver !== null) {
        const resolve = resolver as (item: QueueItem) => void;
        resolver = null;
        resolve({ kind: "close" });
      }
    }
  }

  async sendAudio(audioBytes: Uint8Array | ArrayBuffer): Promise<void> {
    if (this.isClosed) {
      throw new Error("Connection is closed");
    }

    const message = {
      type: "input_audio.append",
      audio: Buffer.from(toUint8Array(audioBytes)).toString("base64"),
    };
    await this.sendJson(message);
  }

  async flushAudio(): Promise<void> {
    if (this.isClosed) {
      throw new Error("Connection is closed");
    }

    await this.sendJson({ type: "input_audio.flush" });
  }

  async updateSession(audioFormat: AudioFormat): Promise<void> {
    if (this.isClosed) {
      throw new Error("Connection is closed");
    }

    const message = {
      type: "session.update",
      session: {
        audio_format: AudioFormat$outboundSchema.parse(audioFormat),
      },
    };

    await this.sendJson(message);
    this.currentAudioFormat = audioFormat;
  }

  async endAudio(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    await this.sendJson({ type: "input_audio.end" });
  }

  async close(code: number = 1000, reason: string = ""): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.websocket.readyState === WS_CLOSED) {
      return;
    }

    await new Promise<void>((resolve) => {
      const finalize = () => {
        this.websocket.removeEventListener("close", finalize);
        resolve();
      };
      this.websocket.addEventListener("close", finalize);
      this.websocket.close(code, reason);
    });
  }

  private async sendJson(payload: unknown): Promise<void> {
    const message = JSON.stringify(payload);
    await new Promise<void>((resolve, reject) => {
      this.websocket.send(message, (err: Error | undefined) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private applySessionEvent(event: RealtimeEvent): void {
    if (isUnknownRealtimeEvent(event)) {
      return;
    }

    if ("session" in event) {
      this.currentSession = event.session;
      this.currentAudioFormat = event.session.audioFormat;
    }
  }
}

function parseRealtimeEvent(payload: unknown): RealtimeEvent {
  if (!isRecord(payload)) {
    return unknownEvent(
      "unknown",
      payload,
      new Error("Invalid websocket message payload (expected JSON object)."),
    );
  }

  const msgType = payload["type"];
  if (typeof msgType !== "string") {
    return unknownEvent(
      "unknown",
      payload,
      new Error("Invalid websocket message payload (missing `type`)."),
    );
  }

  if (msgType === "session.created") {
    return parseWithSchema(
      RealtimeTranscriptionSessionCreated$inboundSchema,
      payload,
      msgType,
    );
  }

  if (msgType === "session.updated") {
    return parseWithSchema(
      RealtimeTranscriptionSessionUpdated$inboundSchema,
      payload,
      msgType,
    );
  }

  if (msgType === "error") {
    return parseWithSchema(
      RealtimeTranscriptionError$inboundSchema,
      payload,
      msgType,
    );
  }

  if (msgType === "transcription.language") {
    return parseWithSchema(
      TranscriptionStreamLanguage$inboundSchema,
      payload,
      msgType,
    );
  }

  if (msgType === "transcription.segment") {
    return parseWithSchema(
      TranscriptionStreamSegmentDelta$inboundSchema,
      payload,
      msgType,
    );
  }

  if (msgType === "transcription.text.delta") {
    return parseWithSchema(
      TranscriptionStreamTextDelta$inboundSchema,
      payload,
      msgType,
    );
  }

  if (msgType === "transcription.done") {
    return parseWithSchema(
      TranscriptionStreamDone$inboundSchema,
      payload,
      msgType,
    );
  }

  return unknownEvent(msgType, payload);
}

function parseWithSchema<T extends KnownRealtimeEvent>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: Error } },
  payload: unknown,
  msgType: string,
): RealtimeEvent {
  const result = schema.safeParse(payload);
  if (result.success) {
    return result.data;
  }

  const error = new Error(
    `Invalid websocket message payload for ${msgType}.`,
    { cause: result.error },
  );
  return unknownEvent(msgType, payload, error);
}

function unknownEvent(type: string, raw: unknown, error?: Error): UnknownRealtimeEvent {
  return {
    type,
    raw,
    error,
  };
}

function normalizeWsError(event: unknown): Error {
  if (event instanceof Error) {
    return event;
  }

  if (
    typeof event === "object"
    && event !== null
    && "error" in event
    && (event as { error?: unknown }).error instanceof Error
  ) {
    return (event as { error: Error }).error;
  }

  return new Error("WebSocket connection error");
}

function messageDataToString(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }

  if (Array.isArray(data) && data.every((item) => Buffer.isBuffer(item))) {
    return Buffer.concat(data).toString("utf8");
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString("utf8");
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  }

  throw new Error("Unsupported websocket message format");
}

function toUint8Array(value: Uint8Array | ArrayBuffer | ArrayBufferView): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
