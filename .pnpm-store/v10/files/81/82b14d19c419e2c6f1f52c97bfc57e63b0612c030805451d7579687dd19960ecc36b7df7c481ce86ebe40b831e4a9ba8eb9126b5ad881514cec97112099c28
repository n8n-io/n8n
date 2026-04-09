import type WebSocket from "ws";
import type { RealtimeTranscriptionSession } from "../../extra/realtime";
import { RealtimeTranscriptionWSError } from "../../extra/realtime/errors";

jest.mock("ws", () => {
  class MockWebSocket {
    readyState = 1;
    sent: string[] = [];
    closeArgs: { code?: number; reason?: string } | null = null;
    private listeners = new Map<string, Set<(event: any) => void>>();

    addEventListener(event: string, handler: (event: any) => void): void {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)?.add(handler);
    }

    removeEventListener(event: string, handler: (event: any) => void): void {
      this.listeners.get(event)?.delete(handler);
    }

    send(data: string, cb?: (err?: Error) => void): void {
      this.sent.push(data);
      cb?.();
    }

    close(code?: number, reason?: string): void {
      this.closeArgs = { code, reason };
      this.readyState = 3;
      this.emit("close", { code, reason });
    }

    emit(event: string, data: any): void {
      for (const handler of this.listeners.get(event) ?? []) {
        handler(data);
      }
    }

    emitMessage(payload: unknown): void {
      const data = typeof payload === "string" ? payload : JSON.stringify(payload);
      this.emit("message", { data });
    }
  }

  let lastSocket: MockWebSocket | undefined;

  const WebSocket = jest.fn(() => {
    lastSocket = new MockWebSocket();
    return lastSocket;
  });

  return {
    __esModule: true,
    default: WebSocket,
    MockWebSocket,
    getLastSocket: () => lastSocket,
  };
});

type MockWebSocketInstance = {
  readyState: number;
  sent: string[];
  closeArgs: { code?: number; reason?: string } | null;
  addEventListener(event: string, handler: (event: any) => void): void;
  removeEventListener(event: string, handler: (event: any) => void): void;
  send(data: string, cb?: (err?: Error) => void): void;
  close(code?: number, reason?: string): void;
  emit(event: string, data: any): void;
  emitMessage(payload: unknown): void;
};

let AudioEncoding: typeof import("../../extra/realtime").AudioEncoding;
let RealtimeConnection: typeof import("../../extra/realtime").RealtimeConnection;
let RealtimeTranscription: typeof import("../../extra/realtime").RealtimeTranscription;

beforeAll(async () => {
  const realtime = await import("../../extra/realtime");
  AudioEncoding = realtime.AudioEncoding;
  RealtimeConnection = realtime.RealtimeConnection;
  RealtimeTranscription = realtime.RealtimeTranscription;
});

function getMockModule(): {
  MockWebSocket: new () => MockWebSocketInstance;
  getLastSocket: () => MockWebSocketInstance | undefined;
} {
  return jest.requireMock("ws") as unknown as {
    MockWebSocket: new () => MockWebSocketInstance;
    getLastSocket: () => MockWebSocketInstance | undefined;
  };
}

async function waitForSocket(
  previous?: MockWebSocketInstance,
): Promise<MockWebSocketInstance> {
  const { getLastSocket } = getMockModule();
  for (let i = 0; i < 10; i += 1) {
    const ws = getLastSocket();
    if (ws && ws !== previous) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      return ws;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("WebSocket was not created");
}

function makeSession(): RealtimeTranscriptionSession {
  return {
    requestId: "ws-123456",
    model: "voxtral-realtime",
    audioFormat: {
      encoding: AudioEncoding.PcmS16le,
      sampleRate: 16000,
    },
  };
}

function makeSessionCreatedMessage() {
  return {
    type: "session.created",
    session: {
      request_id: "ws-123456",
      model: "voxtral-realtime",
      audio_format: {
        encoding: "pcm_s16le",
        sample_rate: 16000,
      },
    },
  };
}

async function collectNext(
  iterator: AsyncIterator<any>,
  ws: MockWebSocketInstance,
  payload: unknown,
) {
  const nextPromise = iterator.next();
  ws.emitMessage(payload);
  return await nextPromise;
}

describe("RealtimeConnection async iterator", () => {
  it("yields UnknownRealtimeEvent for unknown types", async () => {
    const { MockWebSocket } = getMockModule();
    const ws = new MockWebSocket();
    const connection = new RealtimeConnection(
      ws as unknown as WebSocket,
      makeSession(),
    );

    const iterator = connection[Symbol.asyncIterator]();
    const result = await collectNext(iterator, ws, {
      type: "transcription.surprise",
      payload: "hello",
    });

    expect(result.done).toBe(false);
    expect(result.value.type).toBe("transcription.surprise");
    expect(result.value.raw).toEqual({
      type: "transcription.surprise",
      payload: "hello",
    });

    const donePromise = iterator.next();
    ws.close();
    await donePromise;
  });

  it("yields UnknownRealtimeEvent on schema parse failure", async () => {
    const { MockWebSocket } = getMockModule();
    const ws = new MockWebSocket();
    const connection = new RealtimeConnection(
      ws as unknown as WebSocket,
      makeSession(),
    );

    const iterator = connection[Symbol.asyncIterator]();
    const result = await collectNext(iterator, ws, {
      type: "transcription.text.delta",
    });

    expect(result.done).toBe(false);
    expect(result.value.type).toBe("transcription.text.delta");
    expect(result.value.error).toBeInstanceOf(Error);

    const donePromise = iterator.next();
    ws.close();
    await donePromise;
  });
});

describe("RealtimeTranscription handshake", () => {
  it("replays pre-session events", async () => {
    const { getLastSocket } = getMockModule();
    const client = new RealtimeTranscription({
      apiKey: "test",
      serverURL: "wss://example.com",
    });

    const previousSocket = getMockModule().getLastSocket();
    const connectPromise = client.connect("voxtral-realtime");
    const ws = await waitForSocket(previousSocket);

    ws.emitMessage({
      type: "transcription.text.delta",
      text: "hello",
    });
    ws.emitMessage(makeSessionCreatedMessage());

    const connection = await connectPromise;
    const iterator = connection[Symbol.asyncIterator]();

    const first = await iterator.next();
    expect(first.value.type).toBe("transcription.text.delta");

    const second = await iterator.next();
    expect(second.value.type).toBe("session.created");

    const donePromise = iterator.next();
    ws.close();
    await donePromise;
  });

  it("throws RealtimeTranscriptionWSError on server error", async () => {
    const { getLastSocket } = getMockModule();
    const client = new RealtimeTranscription({
      apiKey: "test",
      serverURL: "wss://example.com",
    });

    const previousSocket = getMockModule().getLastSocket();
    const connectPromise = client.connect("voxtral-realtime");
    const ws = await waitForSocket(previousSocket);

    ws.emitMessage({
      type: "error",
      error: {
        message: "bad request",
        code: 400,
      },
    });

    const error = await connectPromise.then(
      () => new Error("Expected connection to fail"),
      (err) => err as Error,
    );
    expect(error).toBeInstanceOf(RealtimeTranscriptionWSError);
    expect(error).toMatchObject({
      payload: {
        type: "error",
        error: {
          message: "bad request",
          code: 400,
        },
      },
      code: 400,
    });
  });

  it("preserves raw payload when error schema fails", async () => {
    const { getLastSocket } = getMockModule();
    const client = new RealtimeTranscription({
      apiKey: "test",
      serverURL: "wss://example.com",
    });

    const previousSocket = getMockModule().getLastSocket();
    const connectPromise = client.connect("voxtral-realtime");
    const ws = await waitForSocket(previousSocket);

    const rawPayload = {
      type: "error",
      error: {
        message: "missing code",
      },
    };
    ws.emitMessage(rawPayload);

    const error = await connectPromise.then(
      () => new Error("Expected connection to fail"),
      (err) => err as Error,
    );
    expect(error).toBeInstanceOf(RealtimeTranscriptionWSError);
    expect(error).toMatchObject({ rawPayload });
  });
});

describe("RealtimeTranscription.transcribeStream", () => {
  it("stops on transcription.done and closes websocket", async () => {
    const { getLastSocket } = getMockModule();
    const client = new RealtimeTranscription({
      apiKey: "test",
      serverURL: "wss://example.com",
    });

    async function* audioStream() {
      yield new Uint8Array([0, 1, 2, 3]);
      yield new Uint8Array([4, 5, 6, 7]);
    }

    const previousSocket = getMockModule().getLastSocket();
    const eventsPromise = (async () => {
      const events = [] as Array<{ type: string }>;
      for await (const event of client.transcribeStream(
        audioStream(),
        "voxtral-realtime",
        {
          audioFormat: {
            encoding: AudioEncoding.PcmS16le,
            sampleRate: 16000,
          },
        },
      )) {
        events.push(event as { type: string });
      }
      return events;
    })();

    const ws = await waitForSocket(previousSocket);

    ws.emitMessage(makeSessionCreatedMessage());
    await new Promise((resolve) => setTimeout(resolve, 0));
    ws.emitMessage({
      type: "transcription.text.delta",
      text: "hello",
    });
    ws.emitMessage({
      type: "transcription.done",
      model: "voxtral-realtime",
      text: "hello",
      usage: { input_tokens: 0, output_tokens: 0 },
      language: null,
    });

    const events = await eventsPromise;
    expect(events.map((event) => event.type)).toContain("transcription.done");
    const sentMessageTypes = ws.sent.map((message) => {
      const parsed = JSON.parse(message) as { type?: string };
      return parsed.type;
    });
    const flushIndex = sentMessageTypes.lastIndexOf("input_audio.flush");
    const endIndex = sentMessageTypes.lastIndexOf("input_audio.end");
    expect(flushIndex).toBeGreaterThan(-1);
    expect(endIndex).toBeGreaterThan(flushIndex);
    expect(ws.closeArgs?.code).toBe(1000);
  });

  it("stops on server error and closes websocket", async () => {
    const { getLastSocket } = getMockModule();
    const client = new RealtimeTranscription({
      apiKey: "test",
      serverURL: "wss://example.com",
    });

    async function* audioStream() {
      yield new Uint8Array([1, 2, 3]);
    }

    const previousSocket = getMockModule().getLastSocket();
    const eventsPromise = (async () => {
      const events = [] as Array<{ type: string }>;
      for await (const event of client.transcribeStream(
        audioStream(),
        "voxtral-realtime",
      )) {
        events.push(event as { type: string });
      }
      return events;
    })();

    const ws = await waitForSocket(previousSocket);

    ws.emitMessage(makeSessionCreatedMessage());
    await new Promise((resolve) => setTimeout(resolve, 0));
    ws.emitMessage({
      type: "error",
      error: {
        message: "bad request",
        code: 400,
      },
    });

    const events = await eventsPromise;
    expect(events.map((event) => event.type)).toContain("error");
    expect(ws.closeArgs?.code).toBe(1000);
  });
});
