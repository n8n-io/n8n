/**
Typings for Node.js specific entry point.
*/

import type {Readable as NodeReadableStream} from 'node:stream';
import type {AnyWebByteStream} from 'strtok3';
import {
	type FileTypeResult,
	type StreamOptions,
	type AnyWebReadableStream,
	type AnyWebReadableByteStreamWithFileType,
	type FileTypeOptions,
	FileTypeParser as DefaultFileTypeParser,
} from './core.js';

export type ReadableStreamWithFileType = NodeReadableStream & {
	readonly fileType?: FileTypeResult;
};

/**
Extending `FileTypeParser` with Node.js engine specific functions.
*/
export declare class FileTypeParser extends DefaultFileTypeParser {
	/**
	@param stream - Node.js `stream.Readable` or web `ReadableStream`.
	*/
	fromStream(stream: AnyWebReadableStream<Uint8Array> | NodeReadableStream): Promise<FileTypeResult | undefined>;

	fromFile(filePath: string): Promise<FileTypeResult | undefined>;

	/**
	Works the same way as {@link fileTypeStream}, additionally taking into account custom detectors (if any were provided to the constructor).
	*/
	toDetectionStream(readableStream: NodeReadableStream, options?: FileTypeOptions & StreamOptions): Promise<ReadableStreamWithFileType>;
	toDetectionStream(webStream: AnyWebReadableStream<Uint8Array>, options?: FileTypeOptions & StreamOptions): Promise<AnyWebReadableByteStreamWithFileType>;
}

/**
Detect the file type of a file path.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the file.

This is for Node.js only.

To read from a [`File`](https://developer.mozilla.org/docs/Web/API/File), see `fileTypeFromBlob()`.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

@returns The detected file type and MIME type or `undefined` when there is no match.
*/
export function fileTypeFromFile(filePath: string, options?: FileTypeOptions): Promise<FileTypeResult | undefined>;

/**
Detect the file type of a [web `ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

If the engine is Node.js, this may also be a [Node.js `stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable).

Direct support for Node.js streams will be dropped in the future, when Node.js streams can be converted to Web streams (see [`toWeb()`](https://nodejs.org/api/stream.html#streamreadabletowebstreamreadable-options)).

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

@param stream - A [web `ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) or [Node.js `stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable) streaming a file to examine.
@param options - Options to override default behaviour.
 @returns A `Promise` for an object with the detected file type, or `undefined` when there is no match.
*/
export function fileTypeFromStream(stream: AnyWebReadableStream<Uint8Array> | NodeReadableStream, options?: FileTypeOptions): Promise<FileTypeResult | undefined>;

/**
Returns a `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `fileTypeFromFile()`.

This method can be handy to put in between a stream, but it comes with a price.
Internally `stream()` builds up a buffer of `sampleSize` bytes, used as a sample, to determine the file type.
The sample size impacts the file detection resolution.
A smaller sample size will result in lower probability of the best file type detection.

@param readableStream - A [web `ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) or [Node.js `stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable), streaming a file to examine.
@param options - May be used to override the default sample size.
@returns A `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `fileTypeFromFile()`.

@example
```
import got from 'got';
import {fileTypeStream} from 'file-type';

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

const stream1 = got.stream(url);
const stream2 = await fileTypeStream(stream1, {sampleSize: 1024});

if (stream2.fileType?.mime === 'image/jpeg') {
	// stream2 can be used to stream the JPEG image (from the very beginning of the stream)
}
```
*/
export function fileTypeStream(readableStream: NodeReadableStream, options?: FileTypeOptions & StreamOptions): Promise<ReadableStreamWithFileType>;
export function fileTypeStream(webStream: AnyWebByteStream, options?: FileTypeOptions & StreamOptions): Promise<AnyWebReadableByteStreamWithFileType>;

export * from './core.js';
