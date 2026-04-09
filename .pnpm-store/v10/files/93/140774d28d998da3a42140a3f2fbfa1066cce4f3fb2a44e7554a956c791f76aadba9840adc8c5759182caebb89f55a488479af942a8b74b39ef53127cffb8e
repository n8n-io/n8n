import WebSocket from "ws";
import { SDK_METADATA } from "../../lib/config.js";
import { ClientSDK } from "../../lib/sdks.js";
import { extractSecurity, resolveGlobalSecurity } from "../../lib/security.js";
import type { AudioFormat } from "../../models/components/audioformat.js";
import type {
  RealtimeTranscriptionError,
} from "../../models/components/realtimetranscriptionerror.js";
import type { RealtimeTranscriptionSession } from "../../models/components/realtimetranscriptionsession.js";
import type { RealtimeEvent } from "./connection.js";
import {
  RealtimeConnection,
  isUnknownRealtimeEvent,
  parseRealtimeEventFromData,
} from "./connection.js";
import {
  RealtimeTranscriptionException,
  RealtimeTranscriptionWSError,
} from "./errors.js";

export type RealtimeConnectOptions = Readonly<{
  audioFormat?: AudioFormat | undefined;
  serverUrl?: string | undefined;
  timeoutMs?: number | undefined;
  httpHeaders?: Record<string, string> | undefined;
}>;

/** Client for realtime transcription over WebSocket. */
export class RealtimeTranscription extends ClientSDK {
  async connect(
    model: string,
    options: RealtimeConnectOptions = {},
  ): Promise<RealtimeConnection> {
    const securityInput = await extractSecurity(this._options.apiKey);
    const resolvedSecurity = resolveGlobalSecurity(
      securityInput == null ? {} : { apiKey: securityInput },
    );

    const headers: Record<string, string> = {};

    headers["User-Agent"] = this._options.userAgent ?? SDK_METADATA.userAgent;

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

    let websocket: WebSocket | undefined;
    try {
      websocket = new WebSocket(url, { headers });
      const { session, initialEvents } = await recvSession(
        websocket,
        options.timeoutMs ?? this._options.timeoutMs,
      );
      const connection = new RealtimeConnection(websocket, session, initialEvents);

      if (options.audioFormat) {
        await connection.updateSession(options.audioFormat);
      }

      return connection;
    } catch (err) {
      if (err instanceof RealtimeTranscriptionException) {
        throw err;
      }

      if (websocket) {
        websocket.close();
      }

      throw new RealtimeTranscriptionException(
        `Failed to connect to transcription service: ${String(err)}`,
        { cause: err },
      );
    }
  }

  async *transcribeStream(
    audioStream: AsyncIterable<Uint8Array>,
    model: string,
    options: RealtimeConnectOptions = {},
  ): AsyncIterable<RealtimeEvent> {
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
      } finally {
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
    } finally {
      stopRequested = true;

      await connection.close();
      await sendAudioTask;
      const maybeReturn =
        (audioStream as { return?: () => Promise<IteratorResult<Uint8Array>> }).return;
      if (typeof maybeReturn === "function") {
        await maybeReturn.call(audioStream);
      }
    }
  }

  private getWsUrl(
    model: string,
    options: { serverUrl?: string | undefined; queryParams: Record<string, string> },
  ): string {
    const baseUrl = options.serverUrl ?? this._baseURL?.toString();
    if (!baseUrl) {
      throw new RealtimeTranscriptionException("No server URL configured.");
    }

    const wsUrl = new URL(
      "v1/audio/transcriptions/realtime",
      normalizeBaseUrl(baseUrl),
    );

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

async function recvSession(
  websocket: WebSocket,
  timeoutMs?: number,
): Promise<{ session: RealtimeTranscriptionSession; initialEvents: RealtimeEvent[] }> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const initialEvents: RealtimeEvent[] = [];

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      websocket.removeEventListener("message", handleMessage);
      websocket.removeEventListener("close", handleClose);
      websocket.removeEventListener("error", handleError);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const fail = (error: Error) => {
      cleanup();
      try {
        websocket.close();
      } catch (closeError) {
        void closeError;
      }
      reject(error);
    };

    const handleMessage = (event: WebSocket.MessageEvent) => {
      const parsed = parseRealtimeEventFromData(event.data);
      initialEvents.push(parsed);

      if (parsed.type === "error") {
        if (isUnknownRealtimeEvent(parsed)) {
          fail(new RealtimeTranscriptionWSError(
            parsed.error?.message ?? "Realtime transcription error during handshake.",
            {
              rawPayload: parsed.raw,
              cause: parsed.error,
            },
          ));
          return;
        }

        if (isRealtimeErrorEvent(parsed)) {
          const errorMessage = typeof parsed.error.message === "string"
            ? parsed.error.message
            : JSON.stringify(parsed.error.message);
          fail(new RealtimeTranscriptionWSError(
            errorMessage,
            {
              payload: parsed,
              code: parsed.error.code,
            },
          ));
          return;
        }
      }

      if (isUnknownRealtimeEvent(parsed)) {
        return;
      }

      if (isSessionCreatedEvent(parsed)) {
        cleanup();
        resolve({ session: parsed.session, initialEvents });
      }
    };

    const handleClose = () => {
      fail(new RealtimeTranscriptionException(
        "Unexpected websocket handshake close.",
      ));
    };

    const handleError = (event: unknown) => {
      fail(new RealtimeTranscriptionException(
        "Failed to connect to transcription service.",
        { cause: normalizeWsError(event) },
      ));
    };

    websocket.addEventListener("message", handleMessage);
    websocket.addEventListener("close", handleClose);
    websocket.addEventListener("error", handleError);

    if (timeoutMs && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        fail(new RealtimeTranscriptionException(
          "Timeout waiting for session creation.",
        ));
      }, timeoutMs);
    }
  });
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

function isRealtimeErrorEvent(
  event: RealtimeEvent,
): event is RealtimeTranscriptionError {
  return !isUnknownRealtimeEvent(event) && "error" in event;
}

function isSessionCreatedEvent(
  event: RealtimeEvent,
): event is { type: "session.created"; session: RealtimeTranscriptionSession } {
  return !isUnknownRealtimeEvent(event)
    && "session" in event
    && event.type === "session.created";
}

function normalizeBaseUrl(baseUrl: string): URL {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/+$/, "") + "/";
  return url;
}
