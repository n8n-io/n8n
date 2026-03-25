import { OutgoingHttpHeaders } from 'node:http';
import { Writable } from 'node:stream';

declare function readWithoutBlocking(readPromise: Promise<ReadableStreamReadResult<Uint8Array>>): Promise<ReadableStreamReadResult<Uint8Array> | undefined>;
declare function writeFromReadableStreamDefaultReader(reader: ReadableStreamDefaultReader<Uint8Array>, writable: Writable, currentReadPromise?: Promise<ReadableStreamReadResult<Uint8Array>> | undefined): Promise<undefined>;
declare function writeFromReadableStream(stream: ReadableStream<Uint8Array>, writable: Writable): Promise<undefined> | undefined;
declare const buildOutgoingHttpHeaders: (headers: Headers | HeadersInit | null | undefined) => OutgoingHttpHeaders;

export { buildOutgoingHttpHeaders, readWithoutBlocking, writeFromReadableStream, writeFromReadableStreamDefaultReader };
