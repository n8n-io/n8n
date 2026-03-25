/// <reference types="node" />
import { Readable } from 'stream';
/**
 * Implements an async iterable that processes the readable stream of an assistant chat response.
 *
 * This class expects each chunk of data in the stream to begin with `data:` and be followed by a valid chunk of JSON.
 * If a chunk contains malformed JSON, it is skipped, and a debug message is logged.
 *
 * @template Item - The type of items yielded by the iterable.
 */
export declare class ChatStream<Item> implements AsyncIterable<Item> {
    private stream;
    constructor(stream: Readable);
    [Symbol.asyncIterator](): AsyncIterator<Item>;
}
