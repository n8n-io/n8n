/// <reference types="node" />

import * as SafeBuffer from "safe-buffer";
import type * as NodeStream from "stream";

declare class StringDecoder {
    constructor(encoding?: BufferEncoding | string);
    write(buffer: Buffer): string;
    end(buffer?: Buffer): string;
}

type Is<T extends U, U> = T;
declare var NoAsyncDispose: {
    new(
        ...arguments: any[]
    ): typeof globalThis.Symbol extends { readonly asyncDispose: Is<infer S, symbol> }
        ? symbol extends S ? {} : { [P in S]: never }
        : {};
};

type ComposeFnParam = (source: any) => void;

interface _IEventEmitter {
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: string | symbol, ...args: any[]): boolean;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;

    removeAllListeners(event?: string | symbol): this;
    off(eventName: string | symbol, listener: (...args: any[]) => void): this;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    // eslint-disable-next-line @typescript-eslint/ban-types
    listeners(eventName: string | symbol): Function[];
    // eslint-disable-next-line @typescript-eslint/ban-types
    rawListeners(eventName: string | symbol): Function[];
    listenerCount(eventName: string | symbol): number;
    eventNames(): Array<string | symbol>;
}

interface SignalOption {
    signal?: AbortSignal;
}
interface ArrayOptions extends SignalOption {
    concurrency?: number;
}

interface _IReadable extends _IEventEmitter {
    _read(size: number): void;
    read(size?: number): any;
    setEncoding(encoding: string): this;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
    unpipe(destination?: _Readable.Writable): this;
    unshift(chunk: any): void;
    wrap(oldStream: _Readable.Readable): this;
    push(chunk: any, encoding?: string): boolean;
    iterator(options?: { destroyOnReturn?: boolean }): AsyncIterableIterator<any>;
    map(fn: (data: any, options?: SignalOption) => any, options?: ArrayOptions): _Readable.Readable;
    filter(
        fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>,
        options?: ArrayOptions,
    ): _Readable.Readable;
    forEach(fn: (data: any, options?: SignalOption) => void | Promise<void>, options?: ArrayOptions): Promise<void>;
    toArray(options?: SignalOption): Promise<any[]>;
    some(
        fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>,
        options?: ArrayOptions,
    ): Promise<boolean>;
    find<T>(fn: (data: any, options?: SignalOption) => data is T, options?: ArrayOptions): Promise<T | undefined>;
    find(fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>, options?: ArrayOptions): Promise<any>;
    every(
        fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>,
        options?: ArrayOptions,
    ): Promise<boolean>;
    flatMap(fn: (data: any, options?: SignalOption) => any, options?: ArrayOptions): _Readable.Readable;
    drop(limit: number, options?: SignalOption): _Readable.Readable;
    take(limit: number, options?: SignalOption): _Readable.Readable;
    asIndexedPairs(options?: SignalOption): _Readable.Readable;
    reduce<T = any>(
        fn: (previous: any, data: any, options?: Pick<ArrayOptions, "signal">) => T,
        initial?: undefined,
        options?: Pick<ArrayOptions, "signal">,
    ): Promise<T>;
    reduce<T = any>(
        fn: (previous: T, data: any, options?: Pick<ArrayOptions, "signal">) => T,
        initial: T,
        options?: Pick<ArrayOptions, "signal">,
    ): Promise<T>;
    _destroy(error: Error | null, callback: (error?: Error | null) => void): void;
    destroy(error?: Error): this;
}

declare class _Readable extends NoAsyncDispose implements _IReadable {
    readable: boolean;
    readonly readableFlowing: boolean | null;
    readonly readableHighWaterMark: number;
    readonly readableLength: number;
    readonly closed: boolean;
    readonly errored: Error | null;
    _read(size: number): void;
    read(size?: number): any;
    setEncoding(encoding: string): this;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
    unpipe(destination?: _Readable.Writable): this;
    unshift(chunk: any): void;
    wrap(oldStream: _Readable.Readable): this;
    push(chunk: any, encoding?: string): boolean;
    map(fn: (data: any, options?: SignalOption) => any, options?: ArrayOptions): _Readable.Readable;
    filter(
        fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>,
        options?: ArrayOptions,
    ): _Readable.Readable;
    forEach(fn: (data: any, options?: SignalOption) => void | Promise<void>, options?: ArrayOptions): Promise<void>;
    toArray(options?: SignalOption): Promise<any[]>;
    some(
        fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>,
        options?: ArrayOptions,
    ): Promise<boolean>;
    find<T>(fn: (data: any, options?: SignalOption) => data is T, options?: ArrayOptions): Promise<T | undefined>;
    find(fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>, options?: ArrayOptions): Promise<any>;
    every(
        fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>,
        options?: ArrayOptions,
    ): Promise<boolean>;
    flatMap(fn: (data: any, options?: SignalOption) => any, options?: ArrayOptions): _Readable.Readable;
    drop(limit: number, options?: SignalOption): _Readable.Readable;
    take(limit: number, options?: SignalOption): _Readable.Readable;
    asIndexedPairs(options?: SignalOption): _Readable.Readable;
    reduce<T = any>(
        fn: (previous: any, data: any, options?: Pick<ArrayOptions, "signal">) => T,
        initial?: undefined,
        options?: Pick<ArrayOptions, "signal">,
    ): Promise<T>;
    reduce<T = any>(
        fn: (previous: T, data: any, options?: Pick<ArrayOptions, "signal">) => T,
        initial: T,
        options?: Pick<ArrayOptions, "signal">,
    ): Promise<T>;
    _destroy(error: Error | null, callback: (error?: Error | null) => void): void;
    destroy(error?: Error): this;

    /**
     * Event emitter
     * The defined events on documents including:
     * 1. close
     * 2. data
     * 3. end
     * 4. readable
     * 5. error
     */
    addListener(event: "close", listener: () => void): this;
    addListener(event: "data", listener: (chunk: any) => void): this;
    addListener(event: "end", listener: () => void): this;
    addListener(event: "readable", listener: () => void): this;
    addListener(event: "error", listener: (err: Error) => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;

    emit(event: "close"): boolean;
    emit(event: "data", chunk: any): boolean;
    emit(event: "end"): boolean;
    emit(event: "readable"): boolean;
    emit(event: "error", err: Error): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;

    on(event: "close", listener: () => void): this;
    on(event: "data", listener: (chunk: any) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "readable", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;

    once(event: "close", listener: () => void): this;
    once(event: "data", listener: (chunk: any) => void): this;
    once(event: "end", listener: () => void): this;
    once(event: "readable", listener: () => void): this;
    once(event: "error", listener: (err: Error) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;

    prependListener(event: "close", listener: () => void): this;
    prependListener(event: "data", listener: (chunk: any) => void): this;
    prependListener(event: "end", listener: () => void): this;
    prependListener(event: "readable", listener: () => void): this;
    prependListener(event: "error", listener: (err: Error) => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;

    prependOnceListener(event: "close", listener: () => void): this;
    prependOnceListener(event: "data", listener: (chunk: any) => void): this;
    prependOnceListener(event: "end", listener: () => void): this;
    prependOnceListener(event: "readable", listener: () => void): this;
    prependOnceListener(event: "error", listener: (err: Error) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;

    removeListener(event: "close", listener: () => void): this;
    removeListener(event: "data", listener: (chunk: any) => void): this;
    removeListener(event: "end", listener: () => void): this;
    removeListener(event: "readable", listener: () => void): this;
    removeListener(event: "error", listener: (err: Error) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;

    removeAllListeners(event?: string | symbol): this;
    off(eventName: string | symbol, listener: (...args: any[]) => void): this;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    // eslint-disable-next-line @typescript-eslint/ban-types
    listeners(eventName: string | symbol): Function[];
    // eslint-disable-next-line @typescript-eslint/ban-types
    rawListeners(eventName: string | symbol): Function[];
    listenerCount(eventName: string | symbol): number;
    eventNames(): Array<string | symbol>;

    iterator(options?: { destroyOnReturn?: boolean }): AsyncIterableIterator<any>;
    [Symbol.asyncIterator](): AsyncIterableIterator<any>;

    // static ReadableState: _Readable.ReadableState;
    _readableState: _Readable.ReadableState;
    destroyed: boolean;

    constructor(options?: _Readable.ReadableOptions);

    _undestroy(): void;
}

declare namespace _Readable {
    // ==== BufferList ====
    interface Entry<D> {
        data: D;
        next: Entry<D> | null;
    }

    interface BufferList<D extends SafeBuffer.Buffer = SafeBuffer.Buffer> {
        head: Entry<D>;
        tail: Entry<D>;
        length: number;

        push(v: D): void;
        unshift(v: D): void;
        shift(): D;
        clear(): void;
        join(s: any): string;
        concat(n: number): D;
    }

    // ==== destroy ====
    interface Destroy {
        destroy(
            this: Readable | Writable,
            error: Error | null,
            callback?: (error: Error | null) => void,
        ): Readable | Writable;
        undestroy(this: Readable | Writable): void;
    }

    // ==== _stream_duplex ====
    type DuplexOptions = ReadableOptions & WritableOptions & {
        allowHalfOpen?: boolean | undefined;
        readable?: boolean | undefined;
        writable?: boolean | undefined;
        read?(this: Duplex, size: number): void;
        write?(this: Duplex, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
        writev?(
            this: Duplex,
            chunks: Array<{ chunk: any; encoding: BufferEncoding }>,
            callback: (error?: Error | null) => void,
        ): void;
        final?(this: Duplex, callback: (error?: Error | null) => void): void;
        destroy?(this: Duplex, error: Error | null, callback: (error: Error | null) => void): void;
    };

    type _IDuplex = _IReadable & _IWritable;

    class Duplex extends _Writable implements _IDuplex, /*extends*/ _Readable, Duplex {
        /**
         * This is a dummy function required to retain type compatibility to node.
         * @deprecated DO NOT USE
         */
        static from(source: any): any;
        allowHalfOpen: boolean;
        destroyed: boolean;
        // Readable
        readable: boolean;
        readonly readableEncoding: BufferEncoding | null;
        readonly readableEnded: boolean;
        readonly readableFlowing: boolean | null;
        readonly readableHighWaterMark: number;
        readonly readableLength: number;
        readonly readableObjectMode: boolean;
        readonly writableObjectMode: boolean;

        readonly readableAborted: never;
        readonly readableDidRead: never;
        readonly writableEnded: never;
        readonly writableFinished: never;
        readonly writableCorked: never;

        _readableState: ReadableState;

        _read(size?: number): void;
        read(size?: number): any;
        setEncoding(enc: BufferEncoding): this;
        resume(): this;
        pause(): this;
        isPaused(): boolean;
        unpipe(dest?: Writable): this;
        unshift(chunk: any): boolean;
        wrap(oldStream: Readable): this;
        push(chunk: any, encoding?: BufferEncoding): boolean;
        map(fn: (data: any, options?: SignalOption) => any, options?: ArrayOptions): Readable;
        filter(fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>, options?: ArrayOptions): Readable;
        forEach(fn: (data: any, options?: SignalOption) => void | Promise<void>, options?: ArrayOptions): Promise<void>;
        toArray(options?: SignalOption): Promise<any[]>;
        some(
            fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>,
            options?: ArrayOptions,
        ): Promise<boolean>;
        find<T>(fn: (data: any, options?: SignalOption) => data is T, options?: ArrayOptions): Promise<T | undefined>;
        find(
            fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>,
            options?: ArrayOptions,
        ): Promise<any>;
        every(
            fn: (data: any, options?: SignalOption) => boolean | Promise<boolean>,
            options?: ArrayOptions,
        ): Promise<boolean>;
        flatMap(fn: (data: any, options?: SignalOption) => any, options?: ArrayOptions): Readable;
        drop(limit: number, options?: SignalOption): Readable;
        take(limit: number, options?: SignalOption): Readable;
        asIndexedPairs(options?: SignalOption): Readable;
        reduce<T = any>(
            fn: (previous: any, data: any, options?: Pick<ArrayOptions, "signal">) => T,
            initial?: undefined,
            options?: Pick<ArrayOptions, "signal">,
        ): Promise<T>;
        reduce<T = any>(
            fn: (previous: T, data: any, options?: Pick<ArrayOptions, "signal">) => T,
            initial: T,
            options?: Pick<ArrayOptions, "signal">,
        ): Promise<T>;
        _destroy(err: Error | null, callback: (error: Error | null) => void): void;
        destroy(err?: Error, callback?: (error: Error | null) => void): this;
        pipe<S extends _IWritable>(dest: S, pipeOpts?: { end?: boolean | undefined }): S;
        addListener(ev: string | symbol, fn: (...args: any[]) => void): this;
        on(ev: string | symbol, fn: (...args: any[]) => void): this;

        _undestroy(): void;
        iterator(options?: { destroyOnReturn?: boolean }): AsyncIterableIterator<any>;
        [Symbol.asyncIterator](): AsyncIterableIterator<any>;
        // end-Readable

        constructor(options?: DuplexOptions);
    }

    // ==== _stream_passthrough ====
    class PassThrough extends Transform {
        constructor(options?: TransformOptions);

        _transform<T>(
            chunk: T,
            encoding: BufferEncoding | string | null | undefined,
            callback: (error?: Error, data?: T) => void,
        ): void;
    }

    // ==== _stream_readable ====
    interface ReadableStateOptions {
        defaultEncoding?: BufferEncoding | undefined;
        encoding?: BufferEncoding | undefined;
        highWaterMark?: number | undefined;
        objectMode?: boolean | undefined;
        readableObjectMode?: boolean | undefined;
        readableHighWaterMark?: number | undefined;
    }

    interface ReadableState {
        objectMode: boolean;
        highWaterMark: number;
        buffer: BufferList<any>;
        length: number;
        pipes: any;
        pipesCount: number;
        flowing: any;
        ended: boolean;
        endEmitted: boolean;
        reading: boolean;
        sync: boolean;
        needReadable: boolean;
        emittedReadable: boolean;
        readableListening: boolean;
        resumeScheduled: boolean;
        destroyed: boolean;
        awaitDrain: number;
        defaultEncoding: BufferEncoding;
        readingMore: boolean;
        decoder: StringDecoder | null;
        encoding: BufferEncoding | null;

        // new (options: ReadableStateOptions, stream: _Readable): ReadableState;
    }

    type ReadableOptions = ReadableStateOptions & {
        read?(this: _IReadable, size: number): void;
        destroy?(this: _IReadable, error: Error | null, callback: (error: Error | null) => void): void;
    };

    class Readable extends _Readable {
        readonly readableAborted: never;
        readonly readableDidRead: never;
        readonly readableEncoding: never;
        readonly readableEnded: never;
        readonly readableObjectMode: never;

        constructor(options?: ReadableOptions);
        pipe<T extends _IWritable>(destination: T, options?: { end?: boolean | undefined }): T;
        compose<T extends NodeJS.ReadableStream>(
            stream: T | ComposeFnParam | Iterable<T> | AsyncIterable<T>,
            options?: { signal: AbortSignal },
        ): T;
    }

    // ==== _stream_transform ====
    type TransformOptions = ReadableOptions & WritableOptions & {
        read?(this: _ITransform, size: number): void;
        write?(this: _ITransform, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
        writev?(
            this: _ITransform,
            chunks: Array<{ chunk: any; encoding: BufferEncoding }>,
            callback: (error?: Error | null) => void,
        ): void;
        final?(this: _ITransform, callback: (error?: Error | null) => void): void;
        destroy?(this: _ITransform, error: Error | null, callback: (error: Error | null) => void): void;
        transform?(
            this: _ITransform,
            chunk: any,
            encoding: BufferEncoding,
            callback: (error?: Error | null, data?: any) => void,
        ): void;
        flush?(callback: (error?: Error | null, data?: any) => void): void;
    };

    interface _ITransform extends _IDuplex {
        _transform(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void): void;
        _flush(callback: (error?: Error | null, data?: any) => void): void;
    }

    class Transform extends Duplex {
        _transformState: {
            // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
            afterTransform: (this: Transform, er: any, data: any) => void | boolean;
            needTransform: boolean;
            transforming: boolean;
            writecb: ((err: any) => any) | null;
            writechunk: any; // TODO
            writeencoding: BufferEncoding | null;
        };

        constructor(options?: TransformOptions);

        _transform(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void): void;
        _flush(callback: (error?: Error | null, data?: any) => void): void;
    }

    // ==== _stream_writable ====
    interface CorkedRequest {
        next: any;
        entry: any;
        finish(): void;
    }

    interface BufferRequest {
        chunk: any; // TODO
        encoding: BufferEncoding;
        isBuf: boolean;
        callback: (error?: Error | null) => void;
        next: BufferRequest | null;
    }

    interface WritableStateOptions {
        decodeStrings?: boolean | undefined;
        defaultEncoding?: BufferEncoding | undefined;
        highWaterMark?: number | undefined;
        objectMode?: boolean | undefined;
        writableObjectMode?: boolean | undefined;
        writableHighWaterMark?: number | undefined;
    }

    interface WritableState {
        buffer: BufferRequest[];
        objectMode: boolean;
        highWaterMark: number;
        finalCalled: boolean;
        needDrain: boolean;
        ending: boolean;
        ended: boolean;
        finished: boolean;
        destroyed: boolean;
        decodeStrings: boolean;
        defaultEncoding: BufferEncoding;
        length: number;
        writing: boolean;
        corked: number;
        sync: boolean;
        bufferProcessing: boolean;
        writelen: number;
        pendingcb: number;
        prefinished: boolean;
        errorEmitted: boolean;
        bufferedRequestCount: number;
        writecb: ((err?: Error | null) => void) | null;
        onwrite: (er?: Error | null) => any;
        bufferedRequest: BufferRequest | null;
        lastBufferedRequest: BufferRequest | null;
        corkedRequestsFree: CorkedRequest;

        // new (options: WritableStateOptions, stream: Writable): WritableState;

        getBuffer(): BufferRequest[];
    }

    type WritableOptions = WritableStateOptions & {
        write?(
            this: _IWritable,
            chunk: any,
            encoding: BufferEncoding | string,
            callback: (error?: Error | null) => void,
        ): void;
        writev?(
            this: _IWritable,
            chunk: ArrayLike<{ chunk: any; encoding: BufferEncoding | string }>,
            callback: (error?: Error | null) => void,
        ): void;
        destroy?(this: _IWritable, error: Error | null, callback: (error?: Error | null) => void): void;
        final?(this: _IWritable, callback: (error?: Error | null) => void): void;
    };

    interface _IWritable extends _IEventEmitter {
        writable: boolean;
        write(chunk: any, cb?: (error: Error | null | undefined) => void): boolean;
        write(chunk: any, encoding?: string, cb?: (error: Error | null | undefined) => void): boolean;
        end(cb?: () => void): this;
        end(data: string | Uint8Array, cb?: () => void): this;
        end(str: string, encoding?: BufferEncoding, cb?: () => void): this;
    }

    class _Writable extends Stream implements _IWritable {
        writable: boolean;
        readonly writableHighWaterMark: number;
        readonly writableLength: number;
        readonly closed: boolean;
        readonly errored: Error | null;
        readonly writableNeedDrain: boolean;
        constructor(opts?: WritableOptions);
        _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void;
        _writev?(chunks: Array<{ chunk: any; encoding: string }>, callback: (error?: Error | null) => void): void;
        _destroy(error: Error | null, callback: (error: Error | null) => void): void;
        _final(callback: (error?: Error | null) => void): void;
        write(chunk: any, cb?: (error: Error | null | undefined) => void): boolean;
        write(chunk: any, encoding?: string, cb?: (error: Error | null | undefined) => void): boolean;
        setDefaultEncoding(encoding: string): this;
        end(cb?: () => void): this;
        end(chunk: any, cb?: () => void): this;
        end(chunk: any, encoding?: string, cb?: () => void): this;
        cork(): void;
        uncork(): void;
        destroy(error?: Error): this;

        /**
         * Event emitter
         * The defined events on documents including:
         * 1. close
         * 2. drain
         * 3. error
         * 4. finish
         * 5. pipe
         * 6. unpipe
         */
        addListener(event: "close", listener: () => void): this;
        addListener(event: "drain", listener: () => void): this;
        addListener(event: "error", listener: (err: Error) => void): this;
        addListener(event: "finish", listener: () => void): this;
        addListener(event: "pipe", listener: (src: Readable) => void): this;
        addListener(event: "unpipe", listener: (src: Readable) => void): this;
        addListener(event: string | symbol, listener: (...args: any[]) => void): this;

        emit(event: "close"): boolean;
        emit(event: "drain"): boolean;
        emit(event: "error", err: Error): boolean;
        emit(event: "finish"): boolean;
        emit(event: "pipe", src: Readable): boolean;
        emit(event: "unpipe", src: Readable): boolean;
        emit(event: string | symbol, ...args: any[]): boolean;

        on(event: "close", listener: () => void): this;
        on(event: "drain", listener: () => void): this;
        on(event: "error", listener: (err: Error) => void): this;
        on(event: "finish", listener: () => void): this;
        on(event: "pipe", listener: (src: Readable) => void): this;
        on(event: "unpipe", listener: (src: Readable) => void): this;
        on(event: string | symbol, listener: (...args: any[]) => void): this;

        once(event: "close", listener: () => void): this;
        once(event: "drain", listener: () => void): this;
        once(event: "error", listener: (err: Error) => void): this;
        once(event: "finish", listener: () => void): this;
        once(event: "pipe", listener: (src: Readable) => void): this;
        once(event: "unpipe", listener: (src: Readable) => void): this;
        once(event: string | symbol, listener: (...args: any[]) => void): this;

        prependListener(event: "close", listener: () => void): this;
        prependListener(event: "drain", listener: () => void): this;
        prependListener(event: "error", listener: (err: Error) => void): this;
        prependListener(event: "finish", listener: () => void): this;
        prependListener(event: "pipe", listener: (src: Readable) => void): this;
        prependListener(event: "unpipe", listener: (src: Readable) => void): this;
        prependListener(event: string | symbol, listener: (...args: any[]) => void): this;

        prependOnceListener(event: "close", listener: () => void): this;
        prependOnceListener(event: "drain", listener: () => void): this;
        prependOnceListener(event: "error", listener: (err: Error) => void): this;
        prependOnceListener(event: "finish", listener: () => void): this;
        prependOnceListener(event: "pipe", listener: (src: Readable) => void): this;
        prependOnceListener(event: "unpipe", listener: (src: Readable) => void): this;
        prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;

        removeListener(event: "close", listener: () => void): this;
        removeListener(event: "drain", listener: () => void): this;
        removeListener(event: "error", listener: (err: Error) => void): this;
        removeListener(event: "finish", listener: () => void): this;
        removeListener(event: "pipe", listener: (src: Readable) => void): this;
        removeListener(event: "unpipe", listener: (src: Readable) => void): this;
        removeListener(event: string | symbol, listener: (...args: any[]) => void): this;

        // static WritableState: WritableState;
        // private static realHasInstance: (obj: any) => boolean;
        destroyed: boolean;
        _writableState: WritableState;

        _undestroy(): void;
    }

    class Writable extends _Writable {
        readonly writableEnded: never;
        readonly writableFinished: never;
        readonly writableObjectMode: never;
        readonly writableCorked: never;

        constructor(opts?: WritableOptions);
    }

    class Stream extends _Readable {
        constructor(options?: ReadableOptions);
        pipe<T extends _IWritable>(destination: T, options?: { end?: boolean | undefined }): T;
        compose<T extends NodeJS.ReadableStream>(
            stream: T | ComposeFnParam | Iterable<T> | AsyncIterable<T>,
            options?: { signal: AbortSignal },
        ): T;
    }

    const finished: typeof NodeStream.finished;
    const pipeline: typeof NodeStream.pipeline;
}

export = _Readable;
export as namespace _Readable;
