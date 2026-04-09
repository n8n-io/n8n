/**
 * (C) Copyright IBM Corp. 2024-2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
/// <reference types="node" />
import type { TransformCallback } from 'stream';
import { Transform } from 'stream';
export interface SdkHeaders {
    'User-Agent': string;
}
/**
 * Generates SDK headers with User-Agent information including package name, version, operating
 * system details, and Node.js version.
 *
 * @returns {SdkHeaders} Headers object containing User-Agent string
 */
export declare function getSdkHeaders(): SdkHeaders;
/**
 * Base transform stream class that maintains a buffer for processing streaming data. Extends
 * Node.js Transform stream with object mode for readable output.
 */
export declare class StreamTransform extends Transform {
    buffer: string;
    constructor();
}
/**
 * Transform stream that converts Server-Sent Events (SSE) formatted text into JavaScript objects.
 * Buffers incoming chunks, splits by double newlines, and parses each event into an object.
 *
 * @example
 *   ```typescript
 *   const transformStream = new ObjectTransformStream();
 *   stream.pipe(transformStream).on('data', (obj) => {
 *     console.log(obj); // Parsed SSE object
 *   });
 *   ```;
 *
 * @extends StreamTransform
 */
export declare class ObjectTransformStream extends StreamTransform {
    /**
     * Transforms incoming chunks by buffering and parsing SSE formatted data. Splits events by double
     * newlines and converts each to an object.
     *
     * @param {any} chunk - Incoming data chunk
     * @param {string} _encoding - Character encoding (unused)
     * @param {TransformCallback} callback - Callback to signal completion
     */
    _transform(chunk: any, _encoding: string, callback: TransformCallback): void;
    /**
     * Flushes any remaining buffered data when the stream ends.
     *
     * @param {TransformCallback} callback - Callback to signal completion
     */
    _flush(callback: TransformCallback): void;
}
/**
 * Generic async iterable stream wrapper that provides abort control functionality. Allows for
 * cancellation of streaming operations via AbortController.
 *
 * @example
 *   ```typescript
 *   const controller = new AbortController();
 *   const stream = await Stream.createStream<MyType>(transformStream, controller);
 *   for await (const item of stream) {
 *     console.log(item);
 *   }
 *   // Later: controller.abort() to cancel
 *   ```;
 *
 * @template T - Type of items in the stream
 */
export declare class Stream<T> implements AsyncIterable<T> {
    private iterator;
    controller: AbortController;
    /**
     * Creates a new Stream instance.
     *
     * @param {() => AsyncIterator<T>} iterator - Function that returns an async iterator
     * @param {AbortController} controller - Controller for aborting the stream
     */
    constructor(iterator: () => AsyncIterator<T>, controller: AbortController);
    /**
     * Creates a Stream instance from a Transform stream.
     *
     * @template T - Type of items in the stream
     * @param {Transform} stream - Node.js Transform stream to wrap
     * @param {AbortController} controller - Controller for aborting the stream
     * @returns {Promise<Stream<T>>} Promise resolving to a Stream instance
     */
    static createStream<T>(stream: Transform, controller: AbortController): Promise<Stream<T>>;
    /**
     * Implements the async iterator protocol for the stream.
     *
     * @returns {AsyncIterator<T>} Async iterator for the stream
     */
    [Symbol.asyncIterator](): AsyncIterator<T>;
}
/**
 * Transforms an API response stream into a stream of parsed JavaScript objects. Uses
 * ObjectTransformStream to parse Server-Sent Events (SSE) formatted data.
 *
 * @example
 *   ```typescript
 *   const objectStream = await transformStreamToObjectStream<MyType>(apiResponse);
 *   for await (const obj of objectStream) {
 *     console.log(obj); // Parsed object from SSE stream
 *   }
 *   ```;
 *
 * @template T - Type of objects in the resulting stream
 * @param {any} apiResponse - API response containing a stream result
 * @returns {Promise<Stream<T>>} Promise resolving to a Stream of parsed objects
 */
export declare function transformStreamToObjectStream<T>(apiResponse: any): Promise<Stream<T>>;
/**
 * Transform stream that splits incoming data into individual lines. Buffers partial lines and emits
 * complete lines as they arrive.
 *
 * @example
 *   ```typescript
 *   const lineStream = new LineTransformStream();
 *   stream.pipe(lineStream).on('data', (line) => {
 *     console.log(line); // Individual line of text
 *   });
 *   ```;
 *
 * @extends StreamTransform
 */
export declare class LineTransformStream extends StreamTransform {
    /**
     * Transforms incoming chunks by splitting on newlines and emitting complete lines.
     *
     * @param {any} chunk - Incoming data chunk
     * @param {string} _encoding - Character encoding (unused)
     * @param {TransformCallback} callback - Callback to signal completion
     */
    _transform(chunk: any, _encoding: string, callback: TransformCallback): void;
    /**
     * Flushes any remaining buffered line when the stream ends.
     *
     * @param {TransformCallback} callback - Callback to signal completion
     */
    _flush(callback: TransformCallback): void;
}
/**
 * Transforms an API response stream into a stream of text lines. Uses LineTransformStream to split
 * data by newlines.
 *
 * @example
 *   ```typescript
 *   const lineStream = await transformStreamToStringStream<string>(apiResponse);
 *   for await (const line of lineStream) {
 *     console.log(line); // Individual line of text
 *   }
 *   ```;
 *
 * @template T - Type of items in the resulting stream (typically string)
 * @param {any} apiResponse - API response containing a stream result
 * @returns {Promise<Stream<T>>} Promise resolving to a Stream of text lines
 */
export declare function transformStreamToStringStream<T>(apiResponse: any): Promise<Stream<T>>;
//# sourceMappingURL=common.d.ts.map