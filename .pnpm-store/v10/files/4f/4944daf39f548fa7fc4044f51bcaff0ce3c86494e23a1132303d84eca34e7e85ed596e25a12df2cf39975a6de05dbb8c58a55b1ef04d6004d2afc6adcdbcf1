/**
Typings for primary entry point, Node.js specific typings can be found in index.d.ts
*/

import type {ReadableStream as WebReadableStream} from 'node:stream/web';
import type {ITokenizer, AnyWebByteStream} from 'strtok3';

/**
Either the Node.js ReadableStream or the `lib.dom.d.ts` ReadableStream.
Related issue: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/60377
*/
export type AnyWebReadableStream<G> = WebReadableStream<G> | ReadableStream<G>;

export type FileTypeResult = {
	/**
	One of the supported [file types](https://github.com/sindresorhus/file-type#supported-file-types).
	*/
	readonly ext: string;

	/**
	The detected [MIME type](https://en.wikipedia.org/wiki/Internet_media_type).
	*/
	readonly mime: string;
};

/**
Detect the file type of a `Uint8Array` or `ArrayBuffer`.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

If file access is available, it is recommended to use `.fromFile()` instead.

@param buffer - An Uint8Array or ArrayBuffer representing file data. It works best if the buffer contains the entire file. It may work with a smaller portion as well.
@param options - Options to override default behavior.
@returns The detected file type, or `undefined` when there is no match.
*/
export function fileTypeFromBuffer(buffer: Uint8Array | ArrayBuffer, options?: FileTypeOptions): Promise<FileTypeResult | undefined>;

/**
Detect the file type of a [web `ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

@param stream - A [web `ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) streaming a file to examine.
@param options - Options to override default behavior.
@returns A `Promise` for an object with the detected file type, or `undefined` when there is no match.
*/
export function fileTypeFromStream(stream: AnyWebByteStream, options?: FileTypeOptions): Promise<FileTypeResult | undefined>;

/**
Detect the file type from an [`ITokenizer`](https://github.com/Borewit/strtok3#tokenizer) source.

This method is used internally, but can also be used for a special "tokenizer" reader.

A tokenizer propagates the internal read functions, allowing alternative transport mechanisms, to access files, to be implemented and used.

@param tokenizer - File source implementing the tokenizer interface.
@param options - Options to override default behavior.
@returns The detected file type, or `undefined` when there is no match.

An example is [`@tokenizer/http`](https://github.com/Borewit/tokenizer-http), which requests data using [HTTP-range-requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests). A difference with a conventional stream and the [*tokenizer*](https://github.com/Borewit/strtok3#tokenizer), is that it is able to *ignore* (seek, fast-forward) in the stream. For example, you may only need and read the first 6 bytes, and the last 128 bytes, which may be an advantage in case reading the entire file would take longer.

@example
```
import {makeTokenizer} from '@tokenizer/http';
import {fileTypeFromTokenizer} from 'file-type';

const audioTrackUrl = 'https://test-audio.netlify.com/Various%20Artists%20-%202009%20-%20netBloc%20Vol%2024_%20tiuqottigeloot%20%5BMP3-V2%5D/01%20-%20Diablo%20Swing%20Orchestra%20-%20Heroines.mp3';

const httpTokenizer = await makeTokenizer(audioTrackUrl);
const fileType = await fileTypeFromTokenizer(httpTokenizer);

console.log(fileType);
//=> {ext: 'mp3', mime: 'audio/mpeg'}
```
*/
export function fileTypeFromTokenizer(tokenizer: ITokenizer, options?: FileTypeOptions): Promise<FileTypeResult | undefined>;

/**
Supported file extensions.
*/
export const supportedExtensions: ReadonlySet<string>;

/**
Supported MIME types.
*/
export const supportedMimeTypes: ReadonlySet<string>;

export type StreamOptions = {
	/**
	The default sample size in bytes.

	@default 4100
	*/
	readonly sampleSize?: number;
};

/**
Detect the file type of a [`Blob`](https://nodejs.org/api/buffer.html#class-blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).

@param blob - The [`Blob`](https://nodejs.org/api/buffer.html#class-blob) used for file detection.
@param options - Options to override default behavior.
@returns The detected file type, or `undefined` when there is no match.

@example
```
import {fileTypeFromBlob} from 'file-type';

const blob = new Blob(['<?xml version="1.0" encoding="ISO-8859-1" ?>'], {
	type: 'text/plain',
	endings: 'native'
});

console.log(await fileTypeFromBlob(blob));
//=> {ext: 'txt', mime: 'text/plain'}
```
*/
export declare function fileTypeFromBlob(blob: Blob, options?: FileTypeOptions): Promise<FileTypeResult | undefined>;

/**
A custom file type detector.

Custom file type detectors are plugins designed to extend the default detection capabilities.
They allow support for uncommon file types, non-binary formats, or customized detection behavior.

Detectors can be added via the constructor options or by modifying `FileTypeParser#detectors` directly.
Detectors provided through the constructor are executed before the default ones.

Detectors can be added via the constructor options or by directly modifying `FileTypeParser#detectors`.

### Example adding a detector

```js
import {FileTypeParser} from 'file-type';
import {detectXml} from '@file-type/xml';

const parser = new FileTypeParser({customDetectors: [detectXml]});
const fileType = await parser.fromFile('sample.kml');
console.log(fileType);
```

### Available-third party file-type detectors

- [@file-type/xml](https://github.com/Borewit/file-type-xml): Detects common XML file types, such as GLM, KML, MusicXML, RSS, SVG, and XHTML

### Detector execution flow

If a detector returns `undefined`, the following rules apply:

1. **No Tokenizer Interaction**: If the detector does not modify the tokenizer's position, the next detector in the sequence is executed.
2. **Tokenizer Interaction**: If the detector modifies the tokenizer's position (`tokenizer.position` is advanced), no further detectors are executed. In this case, the file type remains `undefined`, as subsequent detectors cannot evaluate the content. This is an exceptional scenario, as it prevents any other detectors from determining the file type.

### Example writing a custom detector

Below is an example of a custom detector array. This can be passed to the `FileTypeParser` via the `fileTypeOptions` argument.

```
import {FileTypeParser} from 'file-type';

const customDetectors = [
	async tokenizer => {
		const unicornHeader = [85, 78, 73, 67, 79, 82, 78]; // "UNICORN" in ASCII decimal

		const buffer = new Uint8Array(unicornHeader.length);
		await tokenizer.peekBuffer(buffer, {length: unicornHeader.length, mayBeLess: true});
		if (unicornHeader.every((value, index) => value === buffer[index])) {
			return {ext: 'unicorn', mime: 'application/unicorn'};
		}

		return undefined;
	},
];

const buffer = new Uint8Array([85, 78, 73, 67, 79, 82, 78]);
const parser = new FileTypeParser({customDetectors});
const fileType = await parser.fromBuffer(buffer);
console.log(fileType); // {ext: 'unicorn', mime: 'application/unicorn'}
```

@param tokenizer - The [tokenizer](https://github.com/Borewit/strtok3#tokenizer) used to read file content.
@param fileType - The file type detected by standard or previous custom detectors, or `undefined` if no match is found.
@returns The detected file type, or `undefined` if no match is found.
*/
export type Detector = {
	id: string;
	detect: (tokenizer: ITokenizer, fileType?: FileTypeResult) => Promise<FileTypeResult | undefined>;
};

export type FileTypeOptions = {
	customDetectors?: Iterable<Detector>;

	/**
	Specifies the byte tolerance for locating the first MPEG audio frame (e.g. `.mp1`, `.mp2`, `.mp3`, `.aac`).

	Allows detection to handle slight sync offsets between the expected and actual frame start. Common in malformed or incorrectly muxed files, which, while technically invalid, do occur in the wild.

	A tolerance of 10 bytes covers most cases.

 	@default 0
	*/
	mpegOffsetTolerance?: number;
};

export declare class TokenizerPositionError extends Error {
	constructor(message?: string);
}

export type AnyWebReadableByteStreamWithFileType = AnyWebReadableStream<Uint8Array> & {
	readonly fileType?: FileTypeResult;
};

/**
Workaround for using `bundler` as the module-resolution in TypeScript.
*/
export function fileTypeFromFile(filePath: string, options?: {customDetectors?: Iterable<Detector>}): Promise<FileTypeResult | undefined>;

/**
Returns a `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `fileTypeFromFile()`.

This method can be handy to put in a stream pipeline, but it comes with a price. Internally `stream()` builds up a buffer of `sampleSize` bytes, used as a sample, to determine the file type. The sample size impacts the file detection resolution. A smaller sample size will result in lower probability of the best file type detection.
*/
export function fileTypeStream(webStream: AnyWebReadableStream<Uint8Array>, options?: StreamOptions): Promise<AnyWebReadableByteStreamWithFileType>;

export declare class FileTypeParser {
	/**
	File type detectors.

	Initialized with a single entry holding the built-in detector function.
	*/
	detectors: Detector[];

	constructor(options?: {customDetectors?: Iterable<Detector>; signal?: AbortSignal});

	/**
	Works the same way as {@link fileTypeFromBuffer}, additionally taking into account custom detectors (if any were provided to the constructor).
	*/
	fromBuffer(buffer: Uint8Array | ArrayBuffer): Promise<FileTypeResult | undefined>;

	/**
	Works the same way as {@link fileTypeFromTokenizer}, additionally taking into account custom detectors (if any were provided to the constructor).
	*/
	fromTokenizer(tokenizer: ITokenizer): Promise<FileTypeResult | undefined>;

	/**
	Works the same way as {@link fileTypeFromBlob}, additionally taking into account custom detectors (if any were provided to the constructor).
	*/
	fromBlob(blob: Blob): Promise<FileTypeResult | undefined>;

	/**
	Works the same way as {@link fileTypeStream}, additionally taking into account custom detectors (if any were provided to the constructor).
	*/
	toDetectionStream(webStream: AnyWebReadableStream<Uint8Array>, options?: StreamOptions): Promise<AnyWebReadableByteStreamWithFileType>;
}
