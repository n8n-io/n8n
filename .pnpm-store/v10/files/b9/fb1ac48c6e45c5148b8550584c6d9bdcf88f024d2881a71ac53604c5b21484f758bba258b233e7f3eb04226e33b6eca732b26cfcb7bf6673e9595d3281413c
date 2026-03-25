interface ExtendableEvent extends Event {
    waitUntil(f: Promise<any>): void;
}
export interface FetchEvent extends ExtendableEvent {
    readonly clientId: string;
    readonly handled: Promise<void>;
    readonly preloadResponse: Promise<any>;
    readonly request: Request;
    readonly resultingClientId: string;
    respondWith(r: Response | PromiseLike<Response>): void;
}
export {};
