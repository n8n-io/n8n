/// <reference types="node" />
import type { Writable } from "stream";
import { EventCallback, StreamWrapper } from "./chooseStreamWrapper";
export declare class Node18UniversalStreamWrapper<ReadFormat extends Uint8Array | Uint16Array | Uint32Array> implements StreamWrapper<Node18UniversalStreamWrapper<ReadFormat> | Writable | WritableStream<ReadFormat>, ReadFormat> {
    private readableStream;
    private reader;
    private events;
    private paused;
    private resumeCallback;
    private encoding;
    constructor(readableStream: ReadableStream<ReadFormat>);
    on(event: string, callback: EventCallback): void;
    off(event: string, callback: EventCallback): void;
    pipe(dest: Node18UniversalStreamWrapper<ReadFormat> | Writable | WritableStream<ReadFormat>): Node18UniversalStreamWrapper<ReadFormat> | Writable | WritableStream<ReadFormat>;
    pipeTo(dest: Node18UniversalStreamWrapper<ReadFormat> | Writable | WritableStream<ReadFormat>): Node18UniversalStreamWrapper<ReadFormat> | Writable | WritableStream<ReadFormat>;
    unpipe(dest: Node18UniversalStreamWrapper<ReadFormat> | Writable | WritableStream<ReadFormat>): void;
    destroy(error?: Error): void;
    pause(): void;
    resume(): void;
    get isPaused(): boolean;
    read(): Promise<ReadFormat | undefined>;
    setEncoding(encoding: string): void;
    text(): Promise<string>;
    json<T>(): Promise<T>;
    private _write;
    private _end;
    private _error;
    private _emit;
    private _startReading;
    [Symbol.asyncIterator](): AsyncIterableIterator<ReadFormat>;
}
