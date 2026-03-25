// Type definitions for Mock Socket 8.X+
// Project: Mock Socket
// Definitions by: Travis Hoover <https://github.com/thoov/mock-socket>

declare module 'mock-socket' {
  // support TS under 3.5
  type _Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

  class EventTarget {
    listeners: any;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
    dispatchEvent(evt: Event): boolean;
    removeEventListener(type: string, listener?: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
  }

  interface WebSocketCallbackMap {
    close: () => void;
    error: (err: Error) => void;
    message: (message: string | Blob | ArrayBuffer | ArrayBufferView) => void;
  }

  //
  // https://html.spec.whatwg.org/multipage/web-sockets.html#websocket
  //
  class WebSocket extends EventTarget {
    constructor(url: string | URL, protocols?: string|string[]);

    static readonly CONNECTING: 0;
    static readonly OPEN: 1;
    static readonly CLOSING: 2;
    static readonly CLOSED: 3;

    readonly url: string;

    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;
    readonly readyState: number;
    readonly bufferedAmount: number;

    onopen: (event: Event) => void;
    onerror: (event: Event) => void;
    onclose: (event: CloseEvent) => void;
    onmessage: (event: MessageEvent) => void;
    readonly extensions: string;
    readonly protocol: string;
    close(code?: number, reason?: string): void;

    binaryType: BinaryType;
    send(data: string | Blob | ArrayBuffer | ArrayBufferView): void;
  }

  interface Client extends _Omit<WebSocket, 'close'> {
    target: WebSocket;
    close(options?: CloseOptions): void;
    on<K extends keyof WebSocketCallbackMap>(type: K, callback: WebSocketCallbackMap[K]): void;
    off<K extends keyof WebSocketCallbackMap>(type: K, callback: WebSocketCallbackMap[K]): void;
  }

  class Server extends EventTarget {
    constructor(url: string, options?: ServerOptions);

    readonly options?: ServerOptions;

    stop(callback?: () => void): void;
    mockWebsocket(): void;
    restoreWebsocket(): void;

    on(type: string, callback: (socket: Client) => void): void;
    off(type: string, callback: (socket: Client) => void): void;
    close(options?: CloseOptions): void;
    emit(event: string, data: any, options?: EmitOptions): void;

    clients(): Client[];
    to(room: any, broadcaster: any, broadcastList?: object): ToReturnObject;
    in(any: any): ToReturnObject;
    simulate(event: string): void;

    static of(url: string): Server;
  }

  interface SocketIOClient extends EventTarget {
    binaryType: BinaryType;

    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;

    readonly url: string;
    readonly readyState: number;
    readonly protocol: string;
    readonly target: this;

    close(): this;
    disconnect(): this;
    emit(event: string, data: any): this;
    send(data: any): this;
    on(type: string, callback: (socket: SocketIOClient) => void): this;
    off(type: string, callback: (socket: SocketIOClient) => void): void;
    hasListeners(type: string): boolean;
    join(room: string): void;
    leave(room: string): void;
    to(room: string): ToReturnObject;
    in(room: string): ToReturnObject;

    readonly broadcast: {
      emit(event: string, data: any): SocketIOClient;
      to(room: string): ToReturnObject;
      in(room: string): ToReturnObject;
    };
  }

  const SocketIO: {
    (url: string, protocol?: string | string[]): SocketIOClient;
    connect(url: string, protocol?: string | string[]): SocketIOClient;
  }

  interface CloseOptions {
    code: number;
    reason: string;
    wasClean: boolean;
  }

  interface EmitOptions {
    websockets: Client[];
  }

  interface ToReturnObject {
    to: (chainedRoom: any, chainedBroadcaster: any) => ToReturnObject;
    emit(event: Event, data: any): void;
  }

  interface ServerOptions {
    mock?: boolean;
    verifyClient?: () => boolean;
    selectProtocol?: (protocols: string[]) => string | null;
  }
}
