/// <reference lib="dom" />
/// <reference lib="esnext.asynciterable" />
import { ReadableStreamAsyncIterator, ReadableStreamIteratorOptions } from './ponyfill';
export * from './ponyfill';
declare global {
    interface ReadableStream<R = any> extends AsyncIterable<R> {
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
        [Symbol.asyncIterator](options?: ReadableStreamIteratorOptions): ReadableStreamAsyncIterator<R>;
    }
}
