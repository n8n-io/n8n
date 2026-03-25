/// <reference lib="es2018.asynciterable" />

/**
 * A signal object that allows you to communicate with a request and abort it if required
 * via its associated `AbortController` object.
 *
 * @remarks
 *   This interface is compatible with the `AbortSignal` interface defined in TypeScript's DOM types.
 *   It is redefined here, so it can be polyfilled without a DOM, for example with
 *   {@link https://www.npmjs.com/package/abortcontroller-polyfill | abortcontroller-polyfill} in a Node environment.
 *
 * @public
 */
export declare interface AbortSignal {
    /**
     * Whether the request is aborted.
     */
    readonly aborted: boolean;
    /**
     * Add an event listener to be triggered when this signal becomes aborted.
     */
    addEventListener(type: 'abort', listener: () => void): void;
    /**
     * Remove an event listener that was previously added with {@link AbortSignal.addEventListener}.
     */
    removeEventListener(type: 'abort', listener: () => void): void;
}

/**
 * A queuing strategy that counts the number of bytes in each chunk.
 *
 * @public
 */
export declare class ByteLengthQueuingStrategy implements QueuingStrategy<ArrayBufferView> {
    constructor(options: QueuingStrategyInit);
    /**
     * Returns the high water mark provided to the constructor.
     */
    get highWaterMark(): number;
    /**
     * Measures the size of `chunk` by returning the value of its `byteLength` property.
     */
    get size(): (chunk: ArrayBufferView) => number;
}

/**
 * A queuing strategy that counts the number of chunks.
 *
 * @public
 */
export declare class CountQueuingStrategy implements QueuingStrategy<any> {
    constructor(options: QueuingStrategyInit);
    /**
     * Returns the high water mark provided to the constructor.
     */
    get highWaterMark(): number;
    /**
     * Measures the size of `chunk` by always returning 1.
     * This ensures that the total queue size is a count of the number of chunks in the queue.
     */
    get size(): (chunk: any) => 1;
}

/**
 * A queuing strategy.
 *
 * @public
 */
export declare interface QueuingStrategy<T = any> {
    /**
     * A non-negative number indicating the high water mark of the stream using this queuing strategy.
     */
    highWaterMark?: number;
    /**
     * A function that computes and returns the finite non-negative size of the given chunk value.
     */
    size?: QueuingStrategySizeCallback<T>;
}

/**
 * @public
 */
export declare interface QueuingStrategyInit {
    /**
     * {@inheritDoc QueuingStrategy.highWaterMark}
     */
    highWaterMark: number;
}

declare type QueuingStrategySizeCallback<T = any> = (chunk: T) => number;

declare type ReadableByteStream = ReadableStream<Uint8Array> & {
    _readableStreamController: ReadableByteStreamController;
};

/**
 * Allows control of a {@link ReadableStream | readable byte stream}'s state and internal queue.
 *
 * @public
 */
export declare class ReadableByteStreamController {
    private constructor();
    /**
     * Returns the current BYOB pull request, or `null` if there isn't one.
     */
    get byobRequest(): ReadableStreamBYOBRequest | null;
    /**
     * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
     * over-full. An underlying byte source ought to use this information to determine when and how to apply backpressure.
     */
    get desiredSize(): number | null;
    /**
     * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
     * the stream, but once those are read, the stream will become closed.
     */
    close(): void;
    /**
     * Enqueues the given chunk chunk in the controlled readable stream.
     * The chunk has to be an `ArrayBufferView` instance, or else a `TypeError` will be thrown.
     */
    enqueue(chunk: ArrayBufferView): void;
    /**
     * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
     */
    error(e?: any): void;
}

/**
 * A readable stream represents a source of data, from which you can read.
 *
 * @public
 */
export declare class ReadableStream<R = any> {
    constructor(underlyingSource: UnderlyingByteSource, strategy?: {
        highWaterMark?: number;
        size?: undefined;
    });
    constructor(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>);
    /**
     * Whether or not the readable stream is locked to a {@link ReadableStreamDefaultReader | reader}.
     */
    get locked(): boolean;
    /**
     * Cancels the stream, signaling a loss of interest in the stream by a consumer.
     *
     * The supplied `reason` argument will be given to the underlying source's {@link UnderlyingSource.cancel | cancel()}
     * method, which might or might not use it.
     */
    cancel(reason?: any): Promise<void>;
    /**
     * Creates a {@link ReadableStreamBYOBReader} and locks the stream to the new reader.
     *
     * This call behaves the same way as the no-argument variant, except that it only works on readable byte streams,
     * i.e. streams which were constructed specifically with the ability to handle "bring your own buffer" reading.
     * The returned BYOB reader provides the ability to directly read individual chunks from the stream via its
     * {@link ReadableStreamBYOBReader.read | read()} method, into developer-supplied buffers, allowing more precise
     * control over allocation.
     */
    getReader({ mode }: {
        mode: 'byob';
    }): ReadableStreamBYOBReader;
    /**
     * Creates a {@link ReadableStreamDefaultReader} and locks the stream to the new reader.
     * While the stream is locked, no other reader can be acquired until this one is released.
     *
     * This functionality is especially useful for creating abstractions that desire the ability to consume a stream
     * in its entirety. By getting a reader for the stream, you can ensure nobody else can interleave reads with yours
     * or cancel the stream, which would interfere with your abstraction.
     */
    getReader(): ReadableStreamDefaultReader<R>;
    /**
     * Provides a convenient, chainable way of piping this readable stream through a transform stream
     * (or any other `{ writable, readable }` pair). It simply {@link ReadableStream.pipeTo | pipes} the stream
     * into the writable side of the supplied pair, and returns the readable side for further use.
     *
     * Piping a stream will lock it for the duration of the pipe, preventing any other consumer from acquiring a reader.
     */
    pipeThrough<RS extends ReadableStream>(transform: {
        readable: RS;
        writable: WritableStream<R>;
    }, options?: StreamPipeOptions): RS;
    /**
     * Pipes this readable stream to a given writable stream. The way in which the piping process behaves under
     * various error conditions can be customized with a number of passed options. It returns a promise that fulfills
     * when the piping process completes successfully, or rejects if any errors were encountered.
     *
     * Piping a stream will lock it for the duration of the pipe, preventing any other consumer from acquiring a reader.
     */
    pipeTo(destination: WritableStream<R>, options?: StreamPipeOptions): Promise<void>;
    /**
     * Tees this readable stream, returning a two-element array containing the two resulting branches as
     * new {@link ReadableStream} instances.
     *
     * Teeing a stream will lock it, preventing any other consumer from acquiring a reader.
     * To cancel the stream, cancel both of the resulting branches; a composite cancellation reason will then be
     * propagated to the stream's underlying source.
     *
     * Note that the chunks seen in each branch will be the same object. If the chunks are not immutable,
     * this could allow interference between the two branches.
     */
    tee(): [ReadableStream<R>, ReadableStream<R>];
    /**
     * Asynchronously iterates over the chunks in the stream's internal queue.
     *
     * Asynchronously iterating over the stream will lock it, preventing any other consumer from acquiring a reader.
     * The lock will be released if the async iterator's {@link ReadableStreamAsyncIterator.return | return()} method
     * is called, e.g. by breaking out of the loop.
     *
     * By default, calling the async iterator's {@link ReadableStreamAsyncIterator.return | return()} method will also
     * cancel the stream. To prevent this, use the stream's {@link ReadableStream.values | values()} method, passing
     * `true` for the `preventCancel` option.
     */
    values(options?: ReadableStreamIteratorOptions): ReadableStreamAsyncIterator<R>;
    /**
     * {@inheritDoc ReadableStream.values}
     */
    [Symbol.asyncIterator]: (options?: ReadableStreamIteratorOptions) => ReadableStreamAsyncIterator<R>;
}

/**
 * An async iterator returned by {@link ReadableStream.values}.
 *
 * @public
 */
export declare interface ReadableStreamAsyncIterator<R> extends AsyncIterator<R> {
    next(): Promise<IteratorResult<R, undefined>>;
    return(value?: any): Promise<IteratorResult<any>>;
}

/**
 * A BYOB reader vended by a {@link ReadableStream}.
 *
 * @public
 */
export declare class ReadableStreamBYOBReader {
    constructor(stream: ReadableByteStream);
    /**
     * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
     * the reader's lock is released before the stream finishes closing.
     */
    get closed(): Promise<undefined>;
    /**
     * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
     */
    cancel(reason?: any): Promise<void>;
    /**
     * Attempts to reads bytes into view, and returns a promise resolved with the result.
     *
     * If reading a chunk causes the queue to become empty, more data will be pulled from the underlying source.
     */
    read<T extends ArrayBufferView>(view: T): Promise<ReadableStreamBYOBReadResult<T>>;
    /**
     * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
     * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
     * from now on; otherwise, the reader will appear closed.
     *
     * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
     * the reader's {@link ReadableStreamBYOBReader.read | read()} method has not yet been settled. Attempting to
     * do so will throw a `TypeError` and leave the reader locked to the stream.
     */
    releaseLock(): void;
}

/**
 * A result returned by {@link ReadableStreamBYOBReader.read}.
 *
 * @public
 */
export declare type ReadableStreamBYOBReadResult<T extends ArrayBufferView> = {
    done: false;
    value: T;
} | {
    done: true;
    value: T | undefined;
};

/**
 * A pull-into request in a {@link ReadableByteStreamController}.
 *
 * @public
 */
export declare class ReadableStreamBYOBRequest {
    private constructor();
    /**
     * Returns the view for writing in to, or `null` if the BYOB request has already been responded to.
     */
    get view(): ArrayBufferView | null;
    /**
     * Indicates to the associated readable byte stream that `bytesWritten` bytes were written into
     * {@link ReadableStreamBYOBRequest.view | view}, causing the result be surfaced to the consumer.
     *
     * After this method is called, {@link ReadableStreamBYOBRequest.view | view} will be transferred and no longer
     * modifiable.
     */
    respond(bytesWritten: number): void;
    /**
     * Indicates to the associated readable byte stream that instead of writing into
     * {@link ReadableStreamBYOBRequest.view | view}, the underlying byte source is providing a new `ArrayBufferView`,
     * which will be given to the consumer of the readable byte stream.
     *
     * After this method is called, `view` will be transferred and no longer modifiable.
     */
    respondWithNewView(view: ArrayBufferView): void;
}

/**
 * Allows control of a {@link ReadableStream | readable stream}'s state and internal queue.
 *
 * @public
 */
export declare class ReadableStreamDefaultController<R> {
    private constructor();
    /**
     * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
     * over-full. An underlying source ought to use this information to determine when and how to apply backpressure.
     */
    get desiredSize(): number | null;
    /**
     * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
     * the stream, but once those are read, the stream will become closed.
     */
    close(): void;
    /**
     * Enqueues the given chunk `chunk` in the controlled readable stream.
     */
    enqueue(chunk: R): void;
    /**
     * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
     */
    error(e?: any): void;
}

/**
 * A default reader vended by a {@link ReadableStream}.
 *
 * @public
 */
export declare class ReadableStreamDefaultReader<R = any> {
    constructor(stream: ReadableStream<R>);
    /**
     * Returns a promise that will be fulfilled when the stream becomes closed,
     * or rejected if the stream ever errors or the reader's lock is released before the stream finishes closing.
     */
    get closed(): Promise<undefined>;
    /**
     * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
     */
    cancel(reason?: any): Promise<void>;
    /**
     * Returns a promise that allows access to the next chunk from the stream's internal queue, if available.
     *
     * If reading a chunk causes the queue to become empty, more data will be pulled from the underlying source.
     */
    read(): Promise<ReadableStreamDefaultReadResult<R>>;
    /**
     * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
     * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
     * from now on; otherwise, the reader will appear closed.
     *
     * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
     * the reader's {@link ReadableStreamDefaultReader.read | read()} method has not yet been settled. Attempting to
     * do so will throw a `TypeError` and leave the reader locked to the stream.
     */
    releaseLock(): void;
}

/**
 * A result returned by {@link ReadableStreamDefaultReader.read}.
 *
 * @public
 */
export declare type ReadableStreamDefaultReadResult<T> = {
    done: false;
    value: T;
} | {
    done: true;
    value?: undefined;
};

/**
 * Options for {@link ReadableStream.values | async iterating} a stream.
 *
 * @public
 */
export declare interface ReadableStreamIteratorOptions {
    preventCancel?: boolean;
}

/**
 * A pair of a {@link ReadableStream | readable stream} and {@link WritableStream | writable stream} that can be passed
 * to {@link ReadableStream.pipeThrough}.
 *
 * @public
 */
export declare interface ReadableWritablePair<R, W> {
    readable: ReadableStream<R>;
    writable: WritableStream<W>;
}

/**
 * Options for {@link ReadableStream.pipeTo | piping} a stream.
 *
 * @public
 */
export declare interface StreamPipeOptions {
    /**
     * If set to true, {@link ReadableStream.pipeTo} will not abort the writable stream if the readable stream errors.
     */
    preventAbort?: boolean;
    /**
     * If set to true, {@link ReadableStream.pipeTo} will not cancel the readable stream if the writable stream closes
     * or errors.
     */
    preventCancel?: boolean;
    /**
     * If set to true, {@link ReadableStream.pipeTo} will not close the writable stream if the readable stream closes.
     */
    preventClose?: boolean;
    /**
     * Can be set to an {@link AbortSignal} to allow aborting an ongoing pipe operation via the corresponding
     * `AbortController`. In this case, the source readable stream will be canceled, and the destination writable stream
     * aborted, unless the respective options `preventCancel` or `preventAbort` are set.
     */
    signal?: AbortSignal;
}

/**
 * A transformer for constructing a {@link TransformStream}.
 *
 * @public
 */
export declare interface Transformer<I = any, O = any> {
    /**
     * A function that is called immediately during creation of the {@link TransformStream}.
     */
    start?: TransformerStartCallback<O>;
    /**
     * A function called when a new chunk originally written to the writable side is ready to be transformed.
     */
    transform?: TransformerTransformCallback<I, O>;
    /**
     * A function called after all chunks written to the writable side have been transformed by successfully passing
     * through {@link Transformer.transform | transform()}, and the writable side is about to be closed.
     */
    flush?: TransformerFlushCallback<O>;
    readableType?: undefined;
    writableType?: undefined;
}

/** @public */
export declare type TransformerFlushCallback<O> = (controller: TransformStreamDefaultController<O>) => void | PromiseLike<void>;

/** @public */
export declare type TransformerStartCallback<O> = (controller: TransformStreamDefaultController<O>) => void | PromiseLike<void>;

/** @public */
export declare type TransformerTransformCallback<I, O> = (chunk: I, controller: TransformStreamDefaultController<O>) => void | PromiseLike<void>;

/**
 * A transform stream consists of a pair of streams: a {@link WritableStream | writable stream},
 * known as its writable side, and a {@link ReadableStream | readable stream}, known as its readable side.
 * In a manner specific to the transform stream in question, writes to the writable side result in new data being
 * made available for reading from the readable side.
 *
 * @public
 */
export declare class TransformStream<I = any, O = any> {
    constructor(transformer?: Transformer<I, O>, writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<O>);
    /**
     * The readable side of the transform stream.
     */
    get readable(): ReadableStream<O>;
    /**
     * The writable side of the transform stream.
     */
    get writable(): WritableStream<I>;
}

/**
 * Allows control of the {@link ReadableStream} and {@link WritableStream} of the associated {@link TransformStream}.
 *
 * @public
 */
export declare class TransformStreamDefaultController<O> {
    private constructor();
    /**
     * Returns the desired size to fill the readable side’s internal queue. It can be negative, if the queue is over-full.
     */
    get desiredSize(): number | null;
    /**
     * Enqueues the given chunk `chunk` in the readable side of the controlled transform stream.
     */
    enqueue(chunk: O): void;
    /**
     * Errors both the readable side and the writable side of the controlled transform stream, making all future
     * interactions with it fail with the given error `e`. Any chunks queued for transformation will be discarded.
     */
    error(reason?: any): void;
    /**
     * Closes the readable side and errors the writable side of the controlled transform stream. This is useful when the
     * transformer only needs to consume a portion of the chunks written to the writable side.
     */
    terminate(): void;
}

/**
 * An underlying byte source for constructing a {@link ReadableStream}.
 *
 * @public
 */
export declare interface UnderlyingByteSource {
    /**
     * {@inheritDoc UnderlyingSource.start}
     */
    start?: UnderlyingByteSourceStartCallback;
    /**
     * {@inheritDoc UnderlyingSource.pull}
     */
    pull?: UnderlyingByteSourcePullCallback;
    /**
     * {@inheritDoc UnderlyingSource.cancel}
     */
    cancel?: UnderlyingSourceCancelCallback;
    /**
     * Can be set to "bytes" to signal that the constructed {@link ReadableStream} is a readable byte stream.
     * This ensures that the resulting {@link ReadableStream} will successfully be able to vend BYOB readers via its
     * {@link ReadableStream.(getReader:1) | getReader()} method.
     * It also affects the controller argument passed to the {@link UnderlyingByteSource.start | start()}
     * and {@link UnderlyingByteSource.pull | pull()} methods.
     */
    type: 'bytes';
    /**
     * Can be set to a positive integer to cause the implementation to automatically allocate buffers for the
     * underlying source code to write into. In this case, when a consumer is using a default reader, the stream
     * implementation will automatically allocate an ArrayBuffer of the given size, so that
     * {@link ReadableByteStreamController.byobRequest | controller.byobRequest} is always present,
     * as if the consumer was using a BYOB reader.
     */
    autoAllocateChunkSize?: number;
}

/** @public */
export declare type UnderlyingByteSourcePullCallback = (controller: ReadableByteStreamController) => void | PromiseLike<void>;

/** @public */
export declare type UnderlyingByteSourceStartCallback = (controller: ReadableByteStreamController) => void | PromiseLike<void>;

/**
 * An underlying sink for constructing a {@link WritableStream}.
 *
 * @public
 */
export declare interface UnderlyingSink<W = any> {
    /**
     * A function that is called immediately during creation of the {@link WritableStream}.
     */
    start?: UnderlyingSinkStartCallback;
    /**
     * A function that is called when a new chunk of data is ready to be written to the underlying sink. The stream
     * implementation guarantees that this function will be called only after previous writes have succeeded, and never
     * before {@link UnderlyingSink.start | start()} has succeeded or after {@link UnderlyingSink.close | close()} or
     * {@link UnderlyingSink.abort | abort()} have been called.
     *
     * This function is used to actually send the data to the resource presented by the underlying sink, for example by
     * calling a lower-level API.
     */
    write?: UnderlyingSinkWriteCallback<W>;
    /**
     * A function that is called after the producer signals, via
     * {@link WritableStreamDefaultWriter.close | writer.close()}, that they are done writing chunks to the stream, and
     * subsequently all queued-up writes have successfully completed.
     *
     * This function can perform any actions necessary to finalize or flush writes to the underlying sink, and release
     * access to any held resources.
     */
    close?: UnderlyingSinkCloseCallback;
    /**
     * A function that is called after the producer signals, via {@link WritableStream.abort | stream.abort()} or
     * {@link WritableStreamDefaultWriter.abort | writer.abort()}, that they wish to abort the stream. It takes as its
     * argument the same value as was passed to those methods by the producer.
     *
     * Writable streams can additionally be aborted under certain conditions during piping; see the definition of the
     * {@link ReadableStream.pipeTo | pipeTo()} method for more details.
     *
     * This function can clean up any held resources, much like {@link UnderlyingSink.close | close()}, but perhaps with
     * some custom handling.
     */
    abort?: UnderlyingSinkAbortCallback;
    type?: undefined;
}

/** @public */
export declare type UnderlyingSinkAbortCallback = (reason: any) => void | PromiseLike<void>;

/** @public */
export declare type UnderlyingSinkCloseCallback = () => void | PromiseLike<void>;

/** @public */
export declare type UnderlyingSinkStartCallback = (controller: WritableStreamDefaultController) => void | PromiseLike<void>;

/** @public */
export declare type UnderlyingSinkWriteCallback<W> = (chunk: W, controller: WritableStreamDefaultController) => void | PromiseLike<void>;

/**
 * An underlying source for constructing a {@link ReadableStream}.
 *
 * @public
 */
export declare interface UnderlyingSource<R = any> {
    /**
     * A function that is called immediately during creation of the {@link ReadableStream}.
     */
    start?: UnderlyingSourceStartCallback<R>;
    /**
     * A function that is called whenever the stream’s internal queue of chunks becomes not full,
     * i.e. whenever the queue’s desired size becomes positive. Generally, it will be called repeatedly
     * until the queue reaches its high water mark (i.e. until the desired size becomes non-positive).
     */
    pull?: UnderlyingSourcePullCallback<R>;
    /**
     * A function that is called whenever the consumer cancels the stream, via
     * {@link ReadableStream.cancel | stream.cancel()},
     * {@link ReadableStreamDefaultReader.cancel | defaultReader.cancel()}, or
     * {@link ReadableStreamBYOBReader.cancel | byobReader.cancel()}.
     * It takes as its argument the same value as was passed to those methods by the consumer.
     */
    cancel?: UnderlyingSourceCancelCallback;
    type?: undefined;
}

/** @public */
export declare type UnderlyingSourceCancelCallback = (reason: any) => void | PromiseLike<void>;

/** @public */
export declare type UnderlyingSourcePullCallback<R> = (controller: ReadableStreamDefaultController<R>) => void | PromiseLike<void>;

/** @public */
export declare type UnderlyingSourceStartCallback<R> = (controller: ReadableStreamDefaultController<R>) => void | PromiseLike<void>;

/**
 * A writable stream represents a destination for data, into which you can write.
 *
 * @public
 */
export declare class WritableStream<W = any> {
    constructor(underlyingSink?: UnderlyingSink<W>, strategy?: QueuingStrategy<W>);
    /**
     * Returns whether or not the writable stream is locked to a writer.
     */
    get locked(): boolean;
    /**
     * Aborts the stream, signaling that the producer can no longer successfully write to the stream and it is to be
     * immediately moved to an errored state, with any queued-up writes discarded. This will also execute any abort
     * mechanism of the underlying sink.
     *
     * The returned promise will fulfill if the stream shuts down successfully, or reject if the underlying sink signaled
     * that there was an error doing so. Additionally, it will reject with a `TypeError` (without attempting to cancel
     * the stream) if the stream is currently locked.
     */
    abort(reason?: any): Promise<void>;
    /**
     * Closes the stream. The underlying sink will finish processing any previously-written chunks, before invoking its
     * close behavior. During this time any further attempts to write will fail (without erroring the stream).
     *
     * The method returns a promise that will fulfill if all remaining chunks are successfully written and the stream
     * successfully closes, or rejects if an error is encountered during this process. Additionally, it will reject with
     * a `TypeError` (without attempting to cancel the stream) if the stream is currently locked.
     */
    close(): Promise<undefined>;
    /**
     * Creates a {@link WritableStreamDefaultWriter | writer} and locks the stream to the new writer. While the stream
     * is locked, no other writer can be acquired until this one is released.
     *
     * This functionality is especially useful for creating abstractions that desire the ability to write to a stream
     * without interruption or interleaving. By getting a writer for the stream, you can ensure nobody else can write at
     * the same time, which would cause the resulting written data to be unpredictable and probably useless.
     */
    getWriter(): WritableStreamDefaultWriter<W>;
}

/**
 * Allows control of a {@link WritableStream | writable stream}'s state and internal queue.
 *
 * @public
 */
export declare class WritableStreamDefaultController<W = any> {
    private constructor();
    /**
     * The reason which was passed to `WritableStream.abort(reason)` when the stream was aborted.
     *
     * @deprecated
     *  This property has been removed from the specification, see https://github.com/whatwg/streams/pull/1177.
     *  Use {@link WritableStreamDefaultController.signal}'s `reason` instead.
     */
    get abortReason(): any;
    /**
     * An `AbortSignal` that can be used to abort the pending write or close operation when the stream is aborted.
     */
    get signal(): AbortSignal;
    /**
     * Closes the controlled writable stream, making all future interactions with it fail with the given error `e`.
     *
     * This method is rarely used, since usually it suffices to return a rejected promise from one of the underlying
     * sink's methods. However, it can be useful for suddenly shutting down a stream in response to an event outside the
     * normal lifecycle of interactions with the underlying sink.
     */
    error(e?: any): void;
}

/**
 * A default writer vended by a {@link WritableStream}.
 *
 * @public
 */
export declare class WritableStreamDefaultWriter<W = any> {
    constructor(stream: WritableStream<W>);
    /**
     * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
     * the writer’s lock is released before the stream finishes closing.
     */
    get closed(): Promise<undefined>;
    /**
     * Returns the desired size to fill the stream’s internal queue. It can be negative, if the queue is over-full.
     * A producer can use this information to determine the right amount of data to write.
     *
     * It will be `null` if the stream cannot be successfully written to (due to either being errored, or having an abort
     * queued up). It will return zero if the stream is closed. And the getter will throw an exception if invoked when
     * the writer’s lock is released.
     */
    get desiredSize(): number | null;
    /**
     * Returns a promise that will be fulfilled when the desired size to fill the stream’s internal queue transitions
     * from non-positive to positive, signaling that it is no longer applying backpressure. Once the desired size dips
     * back to zero or below, the getter will return a new promise that stays pending until the next transition.
     *
     * If the stream becomes errored or aborted, or the writer’s lock is released, the returned promise will become
     * rejected.
     */
    get ready(): Promise<undefined>;
    /**
     * If the reader is active, behaves the same as {@link WritableStream.abort | stream.abort(reason)}.
     */
    abort(reason?: any): Promise<void>;
    /**
     * If the reader is active, behaves the same as {@link WritableStream.close | stream.close()}.
     */
    close(): Promise<void>;
    /**
     * Releases the writer’s lock on the corresponding stream. After the lock is released, the writer is no longer active.
     * If the associated stream is errored when the lock is released, the writer will appear errored in the same way from
     * now on; otherwise, the writer will appear closed.
     *
     * Note that the lock can still be released even if some ongoing writes have not yet finished (i.e. even if the
     * promises returned from previous calls to {@link WritableStreamDefaultWriter.write | write()} have not yet settled).
     * It’s not necessary to hold the lock on the writer for the duration of the write; the lock instead simply prevents
     * other producers from writing in an interleaved manner.
     */
    releaseLock(): void;
    /**
     * Writes the given chunk to the writable stream, by waiting until any previous writes have finished successfully,
     * and then sending the chunk to the underlying sink's {@link UnderlyingSink.write | write()} method. It will return
     * a promise that fulfills with undefined upon a successful write, or rejects if the write fails or stream becomes
     * errored before the writing process is initiated.
     *
     * Note that what "success" means is up to the underlying sink; it might indicate simply that the chunk has been
     * accepted, and not necessarily that it is safely saved to its ultimate destination.
     */
    write(chunk: W): Promise<void>;
}

export { }
