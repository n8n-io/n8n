interface Config {
    page: 'manager' | 'preview';
}
type ChannelHandler = (event: ChannelEvent) => void;
interface ChannelTransport {
    send(event: ChannelEvent, options?: any): void;
    setHandler(handler: ChannelHandler): void;
}
interface ChannelEvent {
    type: string;
    from: string;
    args: any[];
}
interface Listener {
    (...args: any[]): void;
}
interface ChannelArgsSingle {
    transport?: ChannelTransport;
    async?: boolean;
}
interface ChannelArgsMulti {
    transports: ChannelTransport[];
    async?: boolean;
}

declare class Channel {
    readonly isAsync: boolean;
    private sender;
    private events;
    private data;
    private readonly transports;
    constructor(input: ChannelArgsMulti);
    constructor(input: ChannelArgsSingle);
    get hasTransport(): boolean;
    addListener(eventName: string, listener: Listener): void;
    emit(eventName: string, ...args: any): void;
    last(eventName: string): any;
    eventNames(): string[];
    listenerCount(eventName: string): number;
    listeners(eventName: string): Listener[] | undefined;
    once(eventName: string, listener: Listener): void;
    removeAllListeners(eventName?: string): void;
    removeListener(eventName: string, listener: Listener): void;
    on(eventName: string, listener: Listener): void;
    off(eventName: string, listener: Listener): void;
    private handleEvent;
    private onceListener;
}

declare class PostMessageTransport implements ChannelTransport {
    private readonly config;
    private buffer;
    private handler?;
    private connected;
    constructor(config: Config);
    setHandler(handler: ChannelHandler): void;
    /**
     * Sends `event` to the associated window. If the window does not yet exist the event will be
     * stored in a buffer and sent when the window exists.
     *
     * @param event
     */
    send(event: ChannelEvent, options?: any): Promise<any>;
    private flush;
    private getFrames;
    private getCurrentFrames;
    private getLocalFrame;
    private handleEvent;
}

type OnError = (message: Event) => void;
interface WebsocketTransportArgs extends Partial<Config> {
    url: string;
    onError: OnError;
}
declare const HEARTBEAT_INTERVAL = 15000;
declare const HEARTBEAT_MAX_LATENCY = 5000;
declare class WebsocketTransport implements ChannelTransport {
    private buffer;
    private handler?;
    private socket;
    private isReady;
    private isClosed;
    private pingTimeout;
    private heartbeat;
    constructor({ url, onError, page }: WebsocketTransportArgs);
    setHandler(handler: ChannelHandler): void;
    send(event: any): void;
    private sendLater;
    private sendNow;
    private flush;
}

type Options = Config & {
    extraTransports?: ChannelTransport[];
};
/**
 * Creates a new browser channel instance.
 *
 * @param {Options} options - The options object.
 * @param {Page} options.page - Page identifier.
 * @param {ChannelTransport[]} [options.extraTransports=[]] - An optional array of extra channel
 *   transports. Default is `[]`
 * @returns {Channel} - The new channel instance.
 */
declare function createBrowserChannel({ page, extraTransports }: Options): Channel;

export { Channel, type ChannelEvent, type ChannelHandler, type ChannelTransport, HEARTBEAT_INTERVAL, HEARTBEAT_MAX_LATENCY, type Listener, PostMessageTransport, WebsocketTransport, createBrowserChannel, Channel as default };
