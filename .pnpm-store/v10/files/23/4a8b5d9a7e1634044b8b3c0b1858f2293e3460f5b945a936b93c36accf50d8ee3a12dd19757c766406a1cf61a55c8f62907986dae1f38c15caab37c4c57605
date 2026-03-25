// Type definitions for dicer 0.2
// Project: https://github.com/mscdex/dicer
// Definitions by: BendingBender <https://github.com/BendingBender>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.2
/// <reference types="node" />

import stream = require("stream");

// tslint:disable:unified-signatures

/**
 * A very fast streaming multipart parser for node.js.
 * Dicer is a WritableStream
 *
 * Dicer (special) events:
 * - on('finish', ()) - Emitted when all parts have been parsed and the Dicer instance has been ended.
 * - on('part', (stream: PartStream)) - Emitted when a new part has been found.
 * - on('preamble', (stream: PartStream)) - Emitted for preamble if you should happen to need it (can usually be ignored).
 * - on('trailer', (data: Buffer)) - Emitted when trailing data was found after the terminating boundary (as with the preamble, this can usually be ignored too).
 */
export class Dicer extends stream.Writable {
    /**
     * Creates and returns a new Dicer instance with the following valid config settings:
     *
     * @param config The configuration to use
     */
    constructor(config: Dicer.Config);
    /**
     * Sets the boundary to use for parsing and performs some initialization needed for parsing.
     * You should only need to use this if you set headerFirst to true in the constructor and are parsing the boundary from the preamble header.
     *
     * @param boundary The boundary to use
     */
    setBoundary(boundary: string): void;
    addListener(event: "finish", listener: () => void): this;
    addListener(event: "part", listener: (stream: Dicer.PartStream) => void): this;
    addListener(event: "preamble", listener: (stream: Dicer.PartStream) => void): this;
    addListener(event: "trailer", listener: (data: Buffer) => void): this;
    addListener(event: "close", listener: () => void): this;
    addListener(event: "drain", listener: () => void): this;
    addListener(event: "error", listener: (err: Error) => void): this;
    addListener(event: "pipe", listener: (src: stream.Readable) => void): this;
    addListener(event: "unpipe", listener: (src: stream.Readable) => void): this;
    addListener(event: string, listener: (...args: any[]) => void): this;
    on(event: "finish", listener: () => void): this;
    on(event: "part", listener: (stream: Dicer.PartStream) => void): this;
    on(event: "preamble", listener: (stream: Dicer.PartStream) => void): this;
    on(event: "trailer", listener: (data: Buffer) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "drain", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "pipe", listener: (src: stream.Readable) => void): this;
    on(event: "unpipe", listener: (src: stream.Readable) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: "finish", listener: () => void): this;
    once(event: "part", listener: (stream: Dicer.PartStream) => void): this;
    once(event: "preamble", listener: (stream: Dicer.PartStream) => void): this;
    once(event: "trailer", listener: (data: Buffer) => void): this;
    once(event: "close", listener: () => void): this;
    once(event: "drain", listener: () => void): this;
    once(event: "error", listener: (err: Error) => void): this;
    once(event: "pipe", listener: (src: stream.Readable) => void): this;
    once(event: "unpipe", listener: (src: stream.Readable) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    prependListener(event: "finish", listener: () => void): this;
    prependListener(event: "part", listener: (stream: Dicer.PartStream) => void): this;
    prependListener(event: "preamble", listener: (stream: Dicer.PartStream) => void): this;
    prependListener(event: "trailer", listener: (data: Buffer) => void): this;
    prependListener(event: "close", listener: () => void): this;
    prependListener(event: "drain", listener: () => void): this;
    prependListener(event: "error", listener: (err: Error) => void): this;
    prependListener(event: "pipe", listener: (src: stream.Readable) => void): this;
    prependListener(event: "unpipe", listener: (src: stream.Readable) => void): this;
    prependListener(event: string, listener: (...args: any[]) => void): this;
    prependOnceListener(event: "finish", listener: () => void): this;
    prependOnceListener(event: "part", listener: (stream: Dicer.PartStream) => void): this;
    prependOnceListener(event: "preamble", listener: (stream: Dicer.PartStream) => void): this;
    prependOnceListener(event: "trailer", listener: (data: Buffer) => void): this;
    prependOnceListener(event: "close", listener: () => void): this;
    prependOnceListener(event: "drain", listener: () => void): this;
    prependOnceListener(event: "error", listener: (err: Error) => void): this;
    prependOnceListener(event: "pipe", listener: (src: stream.Readable) => void): this;
    prependOnceListener(event: "unpipe", listener: (src: stream.Readable) => void): this;
    prependOnceListener(event: string, listener: (...args: any[]) => void): this;
    removeListener(event: "finish", listener: () => void): this;
    removeListener(event: "part", listener: (stream: Dicer.PartStream) => void): this;
    removeListener(event: "preamble", listener: (stream: Dicer.PartStream) => void): this;
    removeListener(event: "trailer", listener: (data: Buffer) => void): this;
    removeListener(event: "close", listener: () => void): this;
    removeListener(event: "drain", listener: () => void): this;
    removeListener(event: "error", listener: (err: Error) => void): this;
    removeListener(event: "pipe", listener: (src: stream.Readable) => void): this;
    removeListener(event: "unpipe", listener: (src: stream.Readable) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
}

declare namespace Dicer {
    interface Config {
        /**
         * This is the boundary used to detect the beginning of a new part.
         */
        boundary?: string | undefined;
        /**
         * If true, preamble header parsing will be performed first.
         */
        headerFirst?: boolean | undefined;
        /**
         * The maximum number of header key=>value pairs to parse Default: 2000 (same as node's http).
         */
        maxHeaderPairs?: number | undefined;
    }

    /**
     * PartStream is a _ReadableStream_
     *
     * PartStream (special) events:
     * - on('header', (header: object)) - An object containing the header for this particular part. Each property value is an array of one or more string values.
     */
    interface PartStream extends stream.Readable {
        addListener(event: "header", listener: (header: object) => void): this;
        addListener(event: "close", listener: () => void): this;
        addListener(event: "data", listener: (chunk: Buffer | string) => void): this;
        addListener(event: "end", listener: () => void): this;
        addListener(event: "readable", listener: () => void): this;
        addListener(event: "error", listener: (err: Error) => void): this;
        addListener(event: string, listener: (...args: any[]) => void): this;
        on(event: "header", listener: (header: object) => void): this;
        on(event: "close", listener: () => void): this;
        on(event: "data", listener: (chunk: Buffer | string) => void): this;
        on(event: "end", listener: () => void): this;
        on(event: "readable", listener: () => void): this;
        on(event: "error", listener: (err: Error) => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
        once(event: "header", listener: (header: object) => void): this;
        once(event: "close", listener: () => void): this;
        once(event: "data", listener: (chunk: Buffer | string) => void): this;
        once(event: "end", listener: () => void): this;
        once(event: "readable", listener: () => void): this;
        once(event: "error", listener: (err: Error) => void): this;
        once(event: string, listener: (...args: any[]) => void): this;
        prependListener(event: "header", listener: (header: object) => void): this;
        prependListener(event: "close", listener: () => void): this;
        prependListener(event: "data", listener: (chunk: Buffer | string) => void): this;
        prependListener(event: "end", listener: () => void): this;
        prependListener(event: "readable", listener: () => void): this;
        prependListener(event: "error", listener: (err: Error) => void): this;
        prependListener(event: string, listener: (...args: any[]) => void): this;
        prependOnceListener(event: "header", listener: (header: object) => void): this;
        prependOnceListener(event: "close", listener: () => void): this;
        prependOnceListener(event: "data", listener: (chunk: Buffer | string) => void): this;
        prependOnceListener(event: "end", listener: () => void): this;
        prependOnceListener(event: "readable", listener: () => void): this;
        prependOnceListener(event: "error", listener: (err: Error) => void): this;
        prependOnceListener(event: string, listener: (...args: any[]) => void): this;
        removeListener(event: "header", listener: (header: object) => void): this;
        removeListener(event: "close", listener: () => void): this;
        removeListener(event: "data", listener: (chunk: Buffer | string) => void): this;
        removeListener(event: "end", listener: () => void): this;
        removeListener(event: "readable", listener: () => void): this;
        removeListener(event: "error", listener: (err: Error) => void): this;
        removeListener(event: string, listener: (...args: any[]) => void): this;
    }
}