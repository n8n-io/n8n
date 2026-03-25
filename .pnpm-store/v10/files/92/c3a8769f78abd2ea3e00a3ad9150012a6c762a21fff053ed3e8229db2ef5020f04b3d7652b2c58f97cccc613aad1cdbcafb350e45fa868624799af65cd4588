/// <reference lib="dom" />
/// <reference lib="es2018.asynciterable" />

import type {
  ReadableStreamAsyncIterator,
  ReadableStreamBYOBReader,
  ReadableStreamBYOBReadResult,
  ReadableStreamIteratorOptions
} from './ponyfill';

export type {
  ReadableStreamAsyncIterator,
  ReadableStreamBYOBReader,
  ReadableStreamBYOBReadResult,
  ReadableStreamIteratorOptions
};

declare global {
  interface ReadableStream<R = any> {
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
}

