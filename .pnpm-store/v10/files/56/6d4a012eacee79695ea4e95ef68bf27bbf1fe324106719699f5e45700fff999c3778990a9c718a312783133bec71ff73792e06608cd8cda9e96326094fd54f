import { Logger } from './logger';
export type EventSourceOptions = {
    /**
     * Disables connection retrying.
     */
    disableRetry?: boolean;
    /**
     * Delay in milliseconds for retrying connection.
     */
    retry?: number;
    /**
     * Disables logging.
     */
    disableLogger?: boolean;
    /**
     * Logger to use for events and errors. Defaults to console.
     */
    logger?: Logger;
    /**
     * Fetch implementation to use for connecting. Defaults to {@link globalThis.fetch}
     */
    fetch?: typeof fetch;
} & Omit<RequestInit, 'cache' | 'credentials' | 'signal'>;
/**
 * @deprecated
 */
export type EventSourceExtraOptions = {
    /**
     * @deprecated Use {@link EventSourceOptions#fetch} instead
     */
    fetchInput?: typeof fetch;
};
export type CustomEvent = Event & {
    response?: Response;
};
export declare class CustomEventSource extends EventTarget implements EventSource {
    url: string;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;
    readyState: number;
    onerror: ((this: EventSource, ev: CustomEvent) => any) | null;
    onmessage: ((this: EventSource, ev: MessageEvent) => any) | null;
    onopen: ((this: EventSource, ev: CustomEvent) => any) | null;
    onRetryDelayReceived: ((this: EventSource, delay: number) => any) | null;
    readonly options: EventSourceInit & EventSourceOptions;
    private readonly extraOptions?;
    private abortController?;
    private timeoutId;
    private retry;
    private currentLastEventId?;
    private logger?;
    constructor(url: string | URL, initDict?: EventSourceInit & EventSourceOptions, 
    /**
     * @deprecated Use the related options in initDict
     */
    extraOptions?: EventSourceExtraOptions);
    get withCredentials(): boolean;
    get retryDelay(): number;
    private connect;
    private reconnect;
    private dispatchMessage;
    private failConnection;
    private announceConnection;
    close(): void;
    addEventListener(type: string, listener: (this: EventSource, event: MessageEvent) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: (this: EventSource, event: MessageEvent) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}
