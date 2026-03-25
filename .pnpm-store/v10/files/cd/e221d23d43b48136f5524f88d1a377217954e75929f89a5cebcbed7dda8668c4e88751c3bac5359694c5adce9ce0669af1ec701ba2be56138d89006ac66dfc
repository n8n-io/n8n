/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Duplex, DuplexOptions, Readable, Stream, Writable } from 'stream';
import { APICallback, CancellableStream, GRPCCallResult, SimpleCallbackFunction } from '../apitypes';
import { RetryOptions, RetryRequestOptions } from '../gax';
import { GoogleError } from '../googleError';
declare const duplexify: DuplexifyConstructor;
export interface DuplexifyOptions extends DuplexOptions {
    autoDestroy?: boolean;
    end?: boolean;
}
export interface Duplexify extends Duplex {
    readonly destroyed: boolean;
    setWritable(writable: Writable | false | null): void;
    setReadable(readable: Readable | false | null): void;
}
export interface DuplexifyConstructor {
    obj(writable?: Writable | false | null, readable?: Readable | false | null, options?: DuplexifyOptions): Duplexify;
    new (writable?: Writable | false | null, readable?: Readable | false | null, options?: DuplexifyOptions): Duplexify;
    (writable?: Writable | false | null, readable?: Readable | false | null, options?: DuplexifyOptions): Duplexify;
}
/**
 * The type of gRPC streaming.
 * @enum {number}
 */
export declare enum StreamType {
    /** Client sends a single request, server streams responses. */
    SERVER_STREAMING = 1,
    /** Client streams requests, server returns a single response. */
    CLIENT_STREAMING = 2,
    /** Both client and server stream objects. */
    BIDI_STREAMING = 3
}
export declare class StreamProxy extends duplexify implements GRPCCallResult {
    type: StreamType;
    private _callback;
    private _isCancelCalled;
    stream?: CancellableStream;
    private _responseHasSent;
    rest?: boolean;
    gaxServerStreamingRetries?: boolean;
    apiCall?: SimpleCallbackFunction;
    argument?: {};
    /**
     * StreamProxy is a proxy to gRPC-streaming method.
     *
     * @private
     * @constructor
     * @param {StreamType} type - the type of gRPC stream.
     * @param {ApiCallback} callback - the callback for further API call.
     */
    constructor(type: StreamType, callback: APICallback, rest?: boolean, gaxServerStreamingRetries?: boolean);
    private shouldRetryRequest;
    cancel(): void;
    /**
     * Helper function to handle total timeout + max retry check for server streaming retries
     * @param {number} deadline - the current retry deadline
     * @param {number} maxRetries - maximum total number of retries
     * @param {number} totalTimeoutMillis - total timeout in milliseconds used in timeout calculation
     * @param {GoogleError} originalError - underlying error received by the stream
     * @param {originalTimeout} originalTimeout - the original Timeout set in backoff settings
     * @param {retries} retries - the number of retries the call has made so far
     */
    throwIfMaxRetriesOrTotalTimeoutExceeded(deadline: number, maxRetries: number, totalTimeoutMillis: number, originalError: GoogleError, originalTimeout: number | undefined, retries: number): void;
    /**
     * Forwards events from an API request stream to the user's stream.
     * @param {Stream} stream - The API request stream.
     */
    eventForwardHelper(stream: Stream): void;
    /**
     * Helper function that emits a response on the stream after either a 'metadata'
     * or a 'status' event - this helps streams to behave more like http consumers expect
     * @param {Stream} stream - The API request stream.
     */
    statusMetadataHelper(stream: Stream): void;
    /**
     * Forward events from an API request stream to the user's stream.
     * @param {Stream} stream - The API request stream.
     * @param {RetryOptions} retry - Configures the exceptions upon which the
     *   function should retry, and the parameters to the exponential backoff retry
     *   algorithm.
     */
    forwardEvents(stream: Stream): void;
    /**
     * Default mechanism for determining whether a streaming call should retry
     * If a user passes in a "shouldRetryFn", this will not be used
     * @param {GoogleError} errpr - The error we need to determine is retryable or not
     * @param {RetryOptions} retry - Configures the exceptions upon which the
     *   function should retry, and the parameters to the exponential backoff retry
     *   algorithm.
     */
    defaultShouldRetry(error: GoogleError, retry: RetryOptions): boolean;
    /**
     * Specifies the target stream.
     * @param {ApiCall} apiCall - the API function to be called.
     * @param {Object} argument - the argument to be passed to the apiCall.
     * @param {RetryOptions} retry - Configures the exceptions upon which the
     *   function should retry, and the parameters to the exponential backoff retry
     *   algorithm.
     */
    setStream(apiCall: SimpleCallbackFunction, argument: {}, retryRequestOptions: RetryRequestOptions | undefined, retry: RetryOptions): void;
    /**
     * Creates a new retry request stream -
     *inner arrow function "newMakeRequest" handles retrying and resumption
     * @param {streamingRetryRequestOptions} opts
     *   {request} - the request to be made if the stream errors
     *   {retry} - the retry options associated with the call
     * @returns {CancellableStream} - the stream that handles retry logic
     */
    private newStreamingRetryRequest;
}
export {};
