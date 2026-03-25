/// <reference types="node" />
import { Readable } from "stream";
/**
 * Convert object stream piped in into an async iterable. This
 * daptor should be deprecated when Node stream iterator is stable.
 * Caveat: this adaptor won't have backpressure to inwards stream
 *
 * Reference: https://nodejs.org/docs/latest-v11.x/api/stream.html#stream_readable_symbol_asynciterator
 */
/**
 * @internal
 */
export declare function readabletoIterable<T>(readStream: Readable): AsyncIterable<T>;
