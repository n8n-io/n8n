//#region src/utils/iflytek_websocket_stream.d.ts
interface WebSocketConnection<T extends Uint8Array | string = Uint8Array | string> {
  readable: ReadableStream<T>;
  writable: WritableStream<T>;
  protocol: string;
  extensions: string;
}
interface WebSocketCloseInfo {
  code?: number;
  reason?: string;
}
interface WebSocketStreamOptions {
  protocols?: string[];
  signal?: AbortSignal;
}
/**
 * [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) with [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
 *
 * @see https://web.dev/websocketstream/
 */
declare abstract class BaseWebSocketStream<T extends Uint8Array | string = Uint8Array | string> {
  readonly url: string;
  readonly connection: Promise<WebSocketConnection<T>>;
  readonly closed: Promise<WebSocketCloseInfo>;
  readonly close: (closeInfo?: WebSocketCloseInfo) => void;
  constructor(url: string, options?: WebSocketStreamOptions);
  abstract openWebSocket(url: string, options: WebSocketStreamOptions): WebSocket;
}
//#endregion
export { BaseWebSocketStream, WebSocketStreamOptions };
//# sourceMappingURL=iflytek_websocket_stream.d.cts.map