/// <reference types="node" />
import type { Readable, Writable } from "stream";
import { EventCallback, StreamWrapper } from "./chooseStreamWrapper";
export declare class NodePre18StreamWrapper implements StreamWrapper<Writable, Buffer> {
    private readableStream;
    private encoding;
    constructor(readableStream: Readable);
    on(event: string, callback: EventCallback): void;
    off(event: string, callback: EventCallback): void;
    pipe(dest: Writable): Writable;
    pipeTo(dest: Writable): Writable;
    unpipe(dest?: Writable): void;
    destroy(error?: Error): void;
    pause(): void;
    resume(): void;
    get isPaused(): boolean;
    read(): Promise<Buffer | undefined>;
    setEncoding(encoding?: string): void;
    text(): Promise<string>;
    json<T>(): Promise<T>;
    [Symbol.asyncIterator](): AsyncIterableIterator<Buffer>;
}
