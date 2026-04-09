export type SseMessage<T> = {
    data?: T | undefined;
    event?: string | undefined;
    id?: string | undefined;
    retry?: number | undefined;
};
export declare class EventStream<T extends SseMessage<unknown>> extends ReadableStream<T> {
    constructor(responseBody: ReadableStream<Uint8Array>, parse: (x: SseMessage<string>) => IteratorResult<T, undefined>);
    [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}
//# sourceMappingURL=event-streams.d.ts.map