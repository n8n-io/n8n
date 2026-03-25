// Definitions by: Jacob Baskin <https://github.com/jacobbaskin>
//                 BendingBender <https://github.com/BendingBender>
//                 Igor Savin <https://github.com/kibertoad>

/// <reference types="node" />

import * as http from 'http';
import { Readable, Writable } from 'stream';
export { Dicer } from "../deps/dicer/lib/dicer";

export const Busboy: BusboyConstructor;
export default Busboy;

export interface BusboyConfig {
    /**
     * These are the HTTP headers of the incoming request, which are used by individual parsers.
     */
    headers: BusboyHeaders;
    /**
     * `highWaterMark` to use for this Busboy instance.
     * @default WritableStream default.
     */
    highWaterMark?: number | undefined;
    /**
     * highWaterMark to use for file streams.
     * @default ReadableStream default.
     */
    fileHwm?: number | undefined;
    /**
     * Default character set to use when one isn't defined.
     * @default 'utf8'
     */
    defCharset?: string | undefined;
    /**
     * Detect if a Part is a file.
     * 
     * By default a file is detected if contentType 
     * is application/octet-stream or fileName is not
     * undefined.
     * 
     * Modify this to handle e.g. Blobs.
     */
    isPartAFile?: (fieldName: string | undefined, contentType: string | undefined, fileName: string | undefined) => boolean;
    /**
     * If paths in the multipart 'filename' field shall be preserved.
     * @default false
     */
    preservePath?: boolean | undefined;
    /**
     * Various limits on incoming data.
     */
    limits?:
    | {
        /**
         * Max field name size (in bytes)
         * @default 100 bytes
         */
        fieldNameSize?: number | undefined;
        /**
         * Max field value size (in bytes)
         * @default 1MB
         */
        fieldSize?: number | undefined;
        /**
         * Max number of non-file fields
         * @default Infinity
         */
        fields?: number | undefined;
        /**
         * For multipart forms, the max file size (in bytes)
         * @default Infinity
         */
        fileSize?: number | undefined;
        /**
         * For multipart forms, the max number of file fields
         * @default Infinity
         */
        files?: number | undefined;
        /**
         * For multipart forms, the max number of parts (fields + files)
         * @default Infinity
         */
        parts?: number | undefined;
        /**
         * For multipart forms, the max number of header key=>value pairs to parse
         * @default 2000
         */
        headerPairs?: number | undefined;

        /**
         * For multipart forms, the max size of a header part
         * @default 81920
         */
        headerSize?: number | undefined;
    }
    | undefined;
}

export type BusboyHeaders = { 'content-type': string } & http.IncomingHttpHeaders;

export interface BusboyFileStream extends
    Readable {

        truncated: boolean;

        /**
         * The number of bytes that have been read so far.
         */
        bytesRead: number;
}

export interface Busboy extends Writable {
    addListener<Event extends keyof BusboyEvents>(event: Event, listener: BusboyEvents[Event]): this;

    addListener(event: string | symbol, listener: (...args: any[]) => void): this;

    on<Event extends keyof BusboyEvents>(event: Event, listener: BusboyEvents[Event]): this;

    on(event: string | symbol, listener: (...args: any[]) => void): this;

    once<Event extends keyof BusboyEvents>(event: Event, listener: BusboyEvents[Event]): this;

    once(event: string | symbol, listener: (...args: any[]) => void): this;

    removeListener<Event extends keyof BusboyEvents>(event: Event, listener: BusboyEvents[Event]): this;

    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;

    off<Event extends keyof BusboyEvents>(event: Event, listener: BusboyEvents[Event]): this;

    off(event: string | symbol, listener: (...args: any[]) => void): this;

    prependListener<Event extends keyof BusboyEvents>(event: Event, listener: BusboyEvents[Event]): this;

    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;

    prependOnceListener<Event extends keyof BusboyEvents>(event: Event, listener: BusboyEvents[Event]): this;

    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
}

export interface BusboyEvents {
    /**
     * Emitted for each new file form field found.
     *
     * * Note: if you listen for this event, you should always handle the `stream` no matter if you care about the
     * file contents or not (e.g. you can simply just do `stream.resume();` if you want to discard the contents),
     * otherwise the 'finish' event will never fire on the Busboy instance. However, if you don't care about **any**
     * incoming files, you can simply not listen for the 'file' event at all and any/all files will be automatically
     * and safely discarded (these discarded files do still count towards `files` and `parts` limits).
     * * If a configured file size limit was reached, `stream` will both have a boolean property `truncated`
     * (best checked at the end of the stream) and emit a 'limit' event to notify you when this happens.
     *
     * @param listener.transferEncoding Contains the 'Content-Transfer-Encoding' value for the file stream.
     * @param listener.mimeType Contains the 'Content-Type' value for the file stream.
     */
    file: (
        fieldname: string,
        stream: BusboyFileStream,
        filename: string,
        transferEncoding: string,
        mimeType: string,
    ) => void;
    /**
     * Emitted for each new non-file field found.
     */
    field: (
        fieldname: string,
        value: string,
        fieldnameTruncated: boolean,
        valueTruncated: boolean,
        transferEncoding: string,
        mimeType: string,
    ) => void;
    finish: () => void;
    /**
     * Emitted when specified `parts` limit has been reached. No more 'file' or 'field' events will be emitted.
     */
    partsLimit: () => void;
    /**
     *  Emitted when specified `files` limit has been reached. No more 'file' events will be emitted.
     */
    filesLimit: () => void;
    /**
     * Emitted when specified `fields` limit has been reached. No more 'field' events will be emitted.
     */
    fieldsLimit: () => void;
    error: (error: unknown) => void;
}

export interface BusboyConstructor {
    (options: BusboyConfig): Busboy;

    new(options: BusboyConfig): Busboy;
}

