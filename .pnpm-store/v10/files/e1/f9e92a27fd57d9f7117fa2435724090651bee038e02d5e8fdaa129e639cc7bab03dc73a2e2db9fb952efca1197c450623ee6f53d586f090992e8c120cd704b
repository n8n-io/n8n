<h1 align="center" title="file-type">
	<img src="media/logo.jpg" alt="file-type logo">
</h1>

> Detect the file type of a file, stream, or data

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

This package is for detecting binary-based file formats, not text-based formats like `.txt`, `.csv`, `.svg`, etc.

We accept contributions for commonly used modern file formats, not historical or obscure ones. Open an issue first for discussion.

> [!IMPORTANT]
> NO SECURITY REPORTS WILL BE ACCEPTED RIGHT NOW. I'm currently hardening the parser and all the low-quality AI-generated security reports is just a huge waste of time.

## Install

```sh
npm install file-type
```

**This package is an ESM package. Your project needs to be ESM too. [Read more](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c). For TypeScript + CommonJS, see [`load-esm`](https://github.com/Borewit/load-esm).** If you use it with Webpack, you need the latest Webpack version and ensure you configure it correctly for ESM.

> [!IMPORTANT]
> File type detection is based on binary signatures (magic numbers) and is a best-effort hint. It does not guarantee the file is actually of that type or that the file is valid/not malformed.
>
> Robustness against malformed input is best-effort. When processing untrusted files on a server, enforce a reasonable file size limit and use a worker thread with a timeout (e.g., [`make-asynchronous`](https://github.com/sindresorhus/make-asynchronous)). These are not considered security issues in this package.

## Usage

### Node.js

Determine file type from a file:

```js
import {fileTypeFromFile} from 'file-type';

console.log(await fileTypeFromFile('Unicorn.png'));
//=> {ext: 'png', mime: 'image/png'}
```

Determine file type from a Uint8Array/ArrayBuffer, which may be a portion of the beginning of a file:

```js
import {fileTypeFromBuffer} from 'file-type';
import {readChunk} from 'read-chunk';

const buffer = await readChunk('Unicorn.png', {length: 4100});

console.log(await fileTypeFromBuffer(buffer));
//=> {ext: 'png', mime: 'image/png'}
```

Determine file type from a stream:

```js
import fs from 'node:fs';
import {fileTypeFromStream} from 'file-type';

const stream = fs.createReadStream('Unicorn.mp4');

console.log(await fileTypeFromStream(stream));
//=> {ext: 'mp4', mime: 'video/mp4'}
```

The stream method can also be used to read from a remote location:

```js
import got from 'got';
import {fileTypeFromStream} from 'file-type';

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

const stream = got.stream(url);

console.log(await fileTypeFromStream(stream));
//=> {ext: 'jpg', mime: 'image/jpeg'}
```

Another stream example:

```js
import stream from 'node:stream';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileTypeStream} from 'file-type';

const read = fs.createReadStream('encrypted.enc');
const decipher = crypto.createDecipheriv(alg, key, iv);

const streamWithFileType = await fileTypeStream(stream.pipeline(read, decipher));

console.log(streamWithFileType.fileType);
//=> {ext: 'mov', mime: 'video/quicktime'}

const write = fs.createWriteStream(`decrypted.${streamWithFileType.fileType.ext}`);
streamWithFileType.pipe(write);
```

### Browser

```js
import {fileTypeFromStream} from 'file-type';

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

const response = await fetch(url);
const fileType = await fileTypeFromStream(response.body);

console.log(fileType);
//=> {ext: 'jpg', mime: 'image/jpeg'}
```

## API

### fileTypeFromBuffer(buffer, options)

Detect the file type of a `Uint8Array`, or `ArrayBuffer`.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

If file access is available, it is recommended to use `fileTypeFromFile()` instead.

Returns a `Promise` for an object with the detected file type:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

#### buffer

Type: `Uint8Array | ArrayBuffer`

A buffer representing file data. It works best if the buffer contains the entire file. It may work with a smaller portion as well.

### fileTypeFromFile(filePath, options)

Detect the file type of a file path.

This is for Node.js only.

To read from a [`File`](https://developer.mozilla.org/docs/Web/API/File), see [`fileTypeFromBlob()`](#filetypefromblobblob-options).

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

Returns a `Promise` for an object with the detected file type:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

#### filePath

Type: `string`

The file path to parse.

### fileTypeFromStream(stream)

Detect the file type of a [web `ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

If the engine is Node.js, this may also be a [Node.js `stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable).

Direct support for Node.js streams will be dropped in the future, when Node.js streams can be converted to Web streams (see [`toWeb()`](https://nodejs.org/api/stream.html#streamreadabletowebstreamreadable-options)).

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

Returns a `Promise` for an object with the detected file type:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

#### stream

Type: [Web `ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) or [Node.js `stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable)

A readable stream representing file data.

### fileTypeFromBlob(blob, options)

Detect the file type of a [`Blob`](https://developer.mozilla.org/docs/Web/API/Blob),

> [!TIP]
> A [`File` object](https://developer.mozilla.org/docs/Web/API/File) is a `Blob` and can be passed in here.

It will **stream** the underlying Blob.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the blob.

Returns a `Promise` for an object with the detected file type:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

```js
import {fileTypeFromBlob} from 'file-type';

const blob = new Blob(['<?xml version="1.0" encoding="ISO-8859-1" ?>'], {
	type: 'text/plain',
	endings: 'native'
});

console.log(await fileTypeFromBlob(blob));
//=> {ext: 'txt', mime: 'text/plain'}
```

#### blob

Type: [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)

### fileTypeFromTokenizer(tokenizer, options)

Detect the file type from an `ITokenizer` source.

This method is used internally, but can also be used for a special "tokenizer" reader.

A tokenizer propagates the internal read functions, allowing alternative transport mechanisms, to access files, to be implemented and used.

Returns a `Promise` for an object with the detected file type:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

An example is [`@tokenizer/http`](https://github.com/Borewit/tokenizer-http), which requests data using [HTTP-range-requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests). A difference with a conventional stream and the [*tokenizer*](https://github.com/Borewit/strtok3#tokenizer), is that it can *ignore* (seek, fast-forward) in the stream. For example, you may only need and read the first 6 bytes, and the last 128 bytes, which may be an advantage in case reading the entire file would take longer.

```js
import {makeTokenizer} from '@tokenizer/http';
import {fileTypeFromTokenizer} from 'file-type';

const audioTrackUrl = 'https://test-audio.netlify.com/Various%20Artists%20-%202009%20-%20netBloc%20Vol%2024_%20tiuqottigeloot%20%5BMP3-V2%5D/01%20-%20Diablo%20Swing%20Orchestra%20-%20Heroines.mp3';

const httpTokenizer = await makeTokenizer(audioTrackUrl);
const fileType = await fileTypeFromTokenizer(httpTokenizer);

console.log(fileType);
//=> {ext: 'mp3', mime: 'audio/mpeg'}
```

Or use [`@tokenizer/s3`](https://github.com/Borewit/tokenizer-s3) to determine the file type of a file stored on [Amazon S3](https://aws.amazon.com/s3):

```js
import {S3Client} from '@aws-sdk/client-s3';
import {makeChunkedTokenizerFromS3} from '@tokenizer/s3';
import {fileTypeFromTokenizer} from 'file-type';

// Initialize the S3 client
// Initialize S3 client
const s3 = new S3Client();

// Initialize the S3 tokenizer.
const s3Tokenizer = await makeChunkedTokenizerFromS3(s3, {
	Bucket: 'affectlab',
	Key: '1min_35sec.mp4'
});

// Figure out what kind of file it is.
const fileType = await fileTypeFromTokenizer(s3Tokenizer);
console.log(fileType);
```

Note that only the minimum amount of data required to determine the file type is read (okay, just a bit extra to prevent too many fragmented reads).

#### tokenizer

Type: [`ITokenizer`](https://github.com/Borewit/strtok3#tokenizer)

A file source implementing the [tokenizer interface](https://github.com/Borewit/strtok3#tokenizer).

### fileTypeStream(webStream, options?)

Returns a `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `fileTypeFromFile()`.

This method can be handy to put in between a stream, but it comes with a price.
Internally `stream()` builds up a buffer of `sampleSize` bytes, used as a sample, to determine the file type.
The sample size impacts the file detection resolution.
A smaller sample size will result in lower probability of the best file type detection.

**Note:** When using Node.js, a `stream.Readable` may be provided as well.

#### readableStream

Type: [`stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable)

#### options

Type: `object`

Supports the following options in addition to the [general options](#options):

##### sampleSize

Type: `number`\
Default: `4100`

The sample size in bytes.

#### Example

```js
import got from 'got';
import {fileTypeStream} from 'file-type';

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

const stream1 = got.stream(url);
const stream2 = await fileTypeStream(stream1, {sampleSize: 1024});

if (stream2.fileType?.mime === 'image/jpeg') {
	// stream2 can be used to stream the JPEG image (from the very beginning of the stream)
}
```

#### readableStream

Type: [`stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable)

The input stream.

### supportedExtensions

Returns a `Set<string>` of supported file extensions.

### supportedMimeTypes

Returns a `Set<string>` of supported MIME types.

### Options

#### customDetectors

Array of custom file type detectors to run before default detectors.

For example:

```js
import {fileTypeFromFile} from 'file-type';
import {detectXml} from '@file-type/xml';

const fileType = await fileTypeFromFile('sample.kml', {customDetectors: [detectXml]});
console.log(fileType);
```

#### mpegOffsetTolerance

Default: `0`

Specifies the byte tolerance for locating the first MPEG audio frame (e.g. `.mp1`, `.mp2`, `.mp3`, `.aac`).

Allows detection to handle slight sync offsets between the expected and actual frame start. Common in malformed or incorrectly muxed files, which, while technically invalid, do occur in the wild.

A tolerance of 10 bytes covers most cases.

## Custom detectors

Custom file type detectors are plugins designed to extend the default detection capabilities.
They allow support for uncommon file types, non-binary formats, or customized detection behavior.

Detectors can be added via the constructor options or by modifying `FileTypeParser#detectors` directly.
Detectors provided through the constructor are executed before the default ones.

Detectors can be added via the constructor options or by directly modifying `FileTypeParser#detectors`.

### Example adding a detector

For example:

```js
import {FileTypeParser} from 'file-type';
import {detectXml} from '@file-type/xml';

const parser = new FileTypeParser({customDetectors: [detectXml]});
const fileType = await parser.fromFile('sample.kml');
console.log(fileType);
```

### Available third-party file-type detectors

- [@file-type/av](https://github.com/Borewit/file-type-av): Improves detection of audio and video file formats, with accurate differentiation between the two
- [@file-type/cfbf](https://github.com/Borewit/file-type-cfbf): Detects Compound File Binary Format (CFBF) based formats, such as Office 97–2003 documents and `.msi`.
- [@file-type/pdf](https://github.com/Borewit/file-type-pdf): Detects PDF based file types, such as Adobe Illustrator
- [@file-type/xml](https://github.com/Borewit/file-type-xml): Detects common XML file types, such as GLM, KML, MusicXML, RSS, SVG, and XHTML

### Detector execution flow

If a detector returns `undefined`, the following rules apply:

1. **No Tokenizer Interaction**: If the detector does not modify the tokenizer's position, the next detector in the sequence is executed.
2. **Tokenizer Interaction**: If the detector modifies the tokenizer's position (`tokenizer.position` is advanced), no further detectors are executed. In this case, the file type remains `undefined`, as subsequent detectors cannot evaluate the content. This is an exceptional scenario, as it prevents any other detectors from determining the file type.

### Writing your own custom detector

Below is an example of a custom detector array. This can be passed to the `FileTypeParser` via the `fileTypeOptions` argument.

```js
import {FileTypeParser} from 'file-type';

const unicornDetector = {
	id: 'unicorn', // May be used to recognize the detector in the detector list
  	async detect(tokenizer) {
		const unicornHeader = [85, 78, 73, 67, 79, 82, 78]; // "UNICORN" in ASCII decimal

		const buffer = new Uint8Array(unicornHeader.length);
		await tokenizer.peekBuffer(buffer, {length: unicornHeader.length, mayBeLess: true});
		if (unicornHeader.every((value, index) => value === buffer[index])) {
			return {ext: 'unicorn', mime: 'application/unicorn'};
		}

		return undefined;
	}
}

const buffer = new Uint8Array([85, 78, 73, 67, 79, 82, 78]);
const parser = new FileTypeParser({customDetectors: [unicornDetector]});
const fileType = await parser.fromBuffer(buffer);
console.log(fileType); // {ext: 'unicorn', mime: 'application/unicorn'}
```

```ts
/**
@param tokenizer - The [tokenizer](https://github.com/Borewit/strtok3#tokenizer) used to read file content.
@param fileType - The file type detected by standard or previous custom detectors, or `undefined` if no match is found.
@returns The detected file type, or `undefined` if no match is found.
*/
export type Detector = (tokenizer: ITokenizer, fileType?: FileTypeResult) => Promise<FileTypeResult | undefined>;
```

## Abort signal

Some async operations can be aborted by passing an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) to the `FileTypeParser` constructor.

```js
import {FileTypeParser} from 'file-type';

const abortController = new AbortController()

const parser = new FileTypeParser({signal: abortController.signal});

const promise = parser.fromStream(blob.stream());

abortController.abort(); // Abort file-type reading from the Blob stream.
```

## Supported file types

- [`3g2`](https://en.wikipedia.org/wiki/3GP_and_3G2#3G2) - Multimedia container format defined by the 3GPP2 for 3G CDMA2000 multimedia services
- [`3gp`](https://en.wikipedia.org/wiki/3GP_and_3G2#3GP) - Multimedia container format defined by the Third Generation Partnership Project (3GPP) for 3G UMTS multimedia services
- [`3mf`](https://en.wikipedia.org/wiki/3D_Manufacturing_Format) - 3D Manufacturing Format
- [`7z`](https://en.wikipedia.org/wiki/7z) - 7-Zip archive
- [`Z`](https://fileinfo.com/extension/z) - Unix Compressed File
- [`aac`](https://en.wikipedia.org/wiki/Advanced_Audio_Coding) - Advanced Audio Coding
- [`ac3`](https://www.atsc.org/standard/a522012-digital-audio-compression-ac-3-e-ac-3-standard-12172012/) - ATSC A/52 Audio File
- [`ace`](https://en.wikipedia.org/wiki/ACE_(compressed_file_format)) - ACE archive
- [`aif`](https://en.wikipedia.org/wiki/Audio_Interchange_File_Format) - Audio Interchange file
- [`alias`](https://en.wikipedia.org/wiki/Alias_%28Mac_OS%29) - macOS Alias file
- [`amr`](https://en.wikipedia.org/wiki/Adaptive_Multi-Rate_audio_codec) - Adaptive Multi-Rate audio codec
- [`ape`](https://en.wikipedia.org/wiki/Monkey%27s_Audio) - Monkey's Audio
- [`apk`](https://en.wikipedia.org/wiki/Apk_(file_format)) - Android package format
- [`apng`](https://en.wikipedia.org/wiki/APNG) - Animated Portable Network Graphics
- [`ar`](https://en.wikipedia.org/wiki/Ar_(Unix)) - Archive file
- [`arj`](https://en.wikipedia.org/wiki/ARJ) - Archive file
- [`arrow`](https://arrow.apache.org) - Columnar format for tables of data
- [`arw`](https://en.wikipedia.org/wiki/Raw_image_format#ARW) - Sony Alpha Raw image file
- [`asar`](https://github.com/electron/asar#format) - Archive format primarily used to enclose Electron applications
- [`asf`](https://en.wikipedia.org/wiki/Advanced_Systems_Format) - Advanced Systems Format
- [`avi`](https://en.wikipedia.org/wiki/Audio_Video_Interleave) - Audio Video Interleave file
- [`avif`](https://en.wikipedia.org/wiki/AV1#AV1_Image_File_Format_(AVIF)) - AV1 Image File Format
- [`avro`](https://en.wikipedia.org/wiki/Apache_Avro#Avro_Object_Container_File) - Object container file developed by Apache Avro
- [`blend`](https://wiki.blender.org/index.php/Dev:Source/Architecture/File_Format) - Blender project
- [`bmp`](https://en.wikipedia.org/wiki/BMP_file_format) - Bitmap image file
- [`bpg`](https://bellard.org/bpg/) - Better Portable Graphics file
- [`bz2`](https://en.wikipedia.org/wiki/Bzip2) - Archive file
- [`cab`](https://en.wikipedia.org/wiki/Cabinet_(file_format)) - Cabinet file
- [`cfb`](https://en.wikipedia.org/wiki/Compound_File_Binary_Format) - Compound File Binary Format
- [`chm`](https://en.wikipedia.org/wiki/Microsoft_Compiled_HTML_Help) - Microsoft Compiled HTML Help
- [`class`](https://en.wikipedia.org/wiki/Java_class_file) - Java class file
- [`cpio`](https://en.wikipedia.org/wiki/Cpio) - Cpio archive
- [`cr2`](https://fileinfo.com/extension/cr2) - Canon Raw image file (v2)
- [`cr3`](https://fileinfo.com/extension/cr3) - Canon Raw image file (v3)
- [`crx`](https://developer.chrome.com/extensions/crx) - Google Chrome extension
- [`cur`](https://en.wikipedia.org/wiki/ICO_(file_format)) - Icon file
- [`dat`](https://en.wikipedia.org/wiki/Windows_Registry) - Windows registry hive file
- [`dcm`](https://en.wikipedia.org/wiki/DICOM#Data_format) - DICOM Image File
- [`deb`](https://en.wikipedia.org/wiki/Deb_(file_format)) - Debian package
- [`dmg`](https://en.wikipedia.org/wiki/Apple_Disk_Image) - Apple Disk Image
- [`dng`](https://en.wikipedia.org/wiki/Digital_Negative) - Adobe Digital Negative image file
- [`docm`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions) - Microsoft Word macro-enabled document
- [`docx`](https://en.wikipedia.org/wiki/Office_Open_XML) - Microsoft Word document
- [`dotm`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions) - Microsoft Word macro-enabled template
- [`dotx`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions) - Microsoft Word template
- [`drc`](https://en.wikipedia.org/wiki/Zstandard) - Google's Draco 3D Data Compression
- [`dsf`](https://dsd-guide.com/sites/default/files/white-papers/DSFFileFormatSpec_E.pdf) - Sony DSD Stream File (DSF)
- [`dwg`](https://en.wikipedia.org/wiki/.dwg) - Autodesk CAD file
- [`elf`](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format) - Unix Executable and Linkable Format
- [`eot`](https://en.wikipedia.org/wiki/Embedded_OpenType) - Embedded OpenType font
- [`eps`](https://en.wikipedia.org/wiki/Encapsulated_PostScript) - Encapsulated PostScript
- [`epub`](https://en.wikipedia.org/wiki/EPUB) - E-book file
- [`exe`](https://en.wikipedia.org/wiki/.exe) - Executable file
- [`f4a`](https://en.wikipedia.org/wiki/Flash_Video) - Audio-only ISO base media file format used by Adobe Flash Player
- [`f4b`](https://en.wikipedia.org/wiki/Flash_Video) - Audiobook and podcast ISO base media file format used by Adobe Flash Player
- [`f4p`](https://en.wikipedia.org/wiki/Flash_Video) - ISO base media file format protected by Adobe Access DRM used by Adobe Flash Player
- [`f4v`](https://en.wikipedia.org/wiki/Flash_Video) - ISO base media file format used by Adobe Flash Player
- [`fbx`](https://en.wikipedia.org/wiki/FBX) - Filmbox is a proprietary file format used to provide interoperability between digital content creation apps.
- [`flac`](https://en.wikipedia.org/wiki/FLAC) - Free Lossless Audio Codec
- [`flif`](https://en.wikipedia.org/wiki/Free_Lossless_Image_Format) - Free Lossless Image Format
- [`flv`](https://en.wikipedia.org/wiki/Flash_Video) - Flash video
- [`gif`](https://en.wikipedia.org/wiki/GIF) - Graphics Interchange Format
- [`glb`](https://github.com/KhronosGroup/glTF) - GL Transmission Format
- [`gz`](https://en.wikipedia.org/wiki/Gzip) - Archive file
- [`heic`](https://nokiatech.github.io/heif/technical.html) - High Efficiency Image File Format
- [`icc`](https://en.wikipedia.org/wiki/ICC_profile) - ICC Profile
- [`icns`](https://en.wikipedia.org/wiki/Apple_Icon_Image_format) - Apple Icon image
- [`ico`](https://en.wikipedia.org/wiki/ICO_(file_format)) - Windows icon file
- [`ics`](https://en.wikipedia.org/wiki/ICalendar#Data_format) - iCalendar
- [`indd`](https://en.wikipedia.org/wiki/Adobe_InDesign#File_format) - Adobe InDesign document
- [`it`](https://wiki.openmpt.org/Manual:_Module_formats#The_Impulse_Tracker_format_.28.it.29) - Audio module format: Impulse Tracker
- [`j2c`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`jar`](https://en.wikipedia.org/wiki/JAR_(file_format)) - Java archive
- [`jls`](https://en.wikipedia.org/wiki/Lossless_JPEG#JPEG-LS) - Lossless/near-lossless compression standard for continuous-tone images
- [`jmp`](https://en.wikipedia.org/wiki/JMP_(statistical_software)) - JMP data file format by SAS Institute
- [`jp2`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`jpg`](https://en.wikipedia.org/wiki/JPEG) - Joint Photographic Experts Group image
- [`jpm`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`jpx`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`jxl`](https://en.wikipedia.org/wiki/JPEG_XL) - JPEG XL image format
- [`jxr`](https://en.wikipedia.org/wiki/JPEG_XR) - Joint Photographic Experts Group extended range
- [`ktx`](https://www.khronos.org/opengles/sdk/tools/KTX/file_format_spec/) - OpenGL and OpenGL ES textures
- [`lnk`](https://en.wikipedia.org/wiki/Shortcut_%28computing%29#Microsoft_Windows) - Microsoft Windows file shortcut
- [`lz`](https://en.wikipedia.org/wiki/Lzip) - Archive file
- [`lz4`](https://en.wikipedia.org/wiki/LZ4_(compression_algorithm)) - Compressed archive created by one of a variety of LZ4 compression utilities
- [`lzh`](https://en.wikipedia.org/wiki/LHA_(file_format)) - LZH archive
- [`m4a`](https://en.wikipedia.org/wiki/M4A) - Audio-only MPEG-4 files
- [`m4b`](https://en.wikipedia.org/wiki/M4B) - Audiobook and podcast MPEG-4 files, which also contain metadata including chapter markers, images, and hyperlinks
- [`m4p`](https://en.wikipedia.org/wiki/MPEG-4_Part_14#Filename_extensions) - MPEG-4 files with audio streams encrypted by FairPlay Digital Rights Management as were sold through the iTunes Store
- [`m4v`](https://en.wikipedia.org/wiki/M4V) - Video container format developed by Apple, which is very similar to the MP4 format
- [`macho`](https://en.wikipedia.org/wiki/Mach-O) - Mach-O binary format
- [`mid`](https://en.wikipedia.org/wiki/MIDI) - Musical Instrument Digital Interface file
- [`mie`](https://en.wikipedia.org/wiki/Sidecar_file) - Dedicated meta information format which supports storage of binary as well as textual meta information
- [`mj2`](https://en.wikipedia.org/wiki/Motion_JPEG_2000) - Motion JPEG 2000
- [`mkv`](https://en.wikipedia.org/wiki/Matroska) - Matroska video file
- [`mobi`](https://en.wikipedia.org/wiki/Mobipocket) - Mobipocket
- [`mov`](https://en.wikipedia.org/wiki/QuickTime_File_Format) - QuickTime video file
- [`mp1`](https://en.wikipedia.org/wiki/MPEG-1_Audio_Layer_I) - MPEG-1 Audio Layer I
- [`mp2`](https://en.wikipedia.org/wiki/MPEG-1_Audio_Layer_II) - MPEG-1 Audio Layer II
- [`mp3`](https://en.wikipedia.org/wiki/MP3) - Audio file
- [`mp4`](https://en.wikipedia.org/wiki/MPEG-4_Part_14#Filename_extensions) - MPEG-4 Part 14 video file
- [`mpc`](https://en.wikipedia.org/wiki/Musepack) - Musepack (SV7 & SV8)
- [`mpg`](https://en.wikipedia.org/wiki/MPEG-1) - MPEG-1 file
- [`mts`](https://en.wikipedia.org/wiki/.m2ts) - MPEG-2 Transport Stream, both raw and Blu-ray Disc Audio-Video (BDAV) versions
- [`mxf`](https://en.wikipedia.org/wiki/Material_Exchange_Format) - Material Exchange Format
- [`nef`](https://www.nikonusa.com/en/learn-and-explore/a/products-and-innovation/nikon-electronic-format-nef.html) - Nikon Electronic Format image file
- [`nes`](https://fileinfo.com/extension/nes) - Nintendo NES ROM
- [`odg`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for drawing
- [`odp`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for presentations
- [`ods`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for spreadsheets
- [`odt`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for word processing
- [`oga`](https://en.wikipedia.org/wiki/Ogg) - Audio file
- [`ogg`](https://en.wikipedia.org/wiki/Ogg) - Audio file
- [`ogm`](https://en.wikipedia.org/wiki/Ogg) - Audio file
- [`ogv`](https://en.wikipedia.org/wiki/Ogg) - Audio file
- [`ogx`](https://en.wikipedia.org/wiki/Ogg) - Audio file
- [`opus`](https://en.wikipedia.org/wiki/Opus_(audio_format)) - Audio file
- [`orf`](https://en.wikipedia.org/wiki/ORF_format) - Olympus Raw image file
- [`otf`](https://en.wikipedia.org/wiki/OpenType) - OpenType font
- [`otg`](https://en.wikipedia.org/wiki/OpenDocument_technical_specification#Templates) - OpenDocument template for drawing
- [`otp`](https://en.wikipedia.org/wiki/OpenDocument_technical_specification#Templates) - OpenDocument template for presentations
- [`ots`](https://en.wikipedia.org/wiki/OpenDocument_technical_specification#Templates) - OpenDocument template for spreadsheets
- [`ott`](https://en.wikipedia.org/wiki/OpenDocument_technical_specification#Templates) - OpenDocument template for word processing
- [`parquet`](https://en.wikipedia.org/wiki/Apache_Parquet) - Apache Parquet
- [`pcap`](https://wiki.wireshark.org/Development/LibpcapFileFormat) - Libpcap File Format
- [`pdf`](https://en.wikipedia.org/wiki/Portable_Document_Format) - Portable Document Format
- [`pgp`](https://en.wikipedia.org/wiki/Pretty_Good_Privacy) - Pretty Good Privacy
- [`png`](https://en.wikipedia.org/wiki/Portable_Network_Graphics) - Portable Network Graphics
- [`potm`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions) - Microsoft PowerPoint macro-enabled template
- [`potx`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions) - Microsoft PowerPoint template
- [`ppsm`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions#PowerPoint) - Office PowerPoint 2007 macro-enabled slide show
- [`ppsx`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions#PowerPoint) - Office PowerPoint 2007 slide show
- [`pptm`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions) - Microsoft PowerPoint macro-enabled document
- [`pptx`](https://en.wikipedia.org/wiki/Office_Open_XML) - Microsoft PowerPoint document
- [`ps`](https://en.wikipedia.org/wiki/Postscript) - Postscript
- [`psd`](https://en.wikipedia.org/wiki/Adobe_Photoshop#File_format) - Adobe Photoshop document
- [`pst`](https://en.wikipedia.org/wiki/Personal_Storage_Table) - Personal Storage Table file
- [`qcp`](https://en.wikipedia.org/wiki/QCP) - Tagged and chunked data
- [`raf`](https://en.wikipedia.org/wiki/Raw_image_format) - Fujifilm RAW image file
- [`rar`](https://en.wikipedia.org/wiki/RAR_(file_format)) - Archive file
- [`reg`](https://en.wikipedia.org/wiki/Windows_Registry) - Windows registry (entries) file format
- [`rm`](https://en.wikipedia.org/wiki/RealMedia) - RealMedia
- [`rpm`](https://fileinfo.com/extension/rpm) - Red Hat Package Manager file
- [`rtf`](https://en.wikipedia.org/wiki/Rich_Text_Format) - Rich Text Format
- [`rw2`](https://en.wikipedia.org/wiki/Raw_image_format) - Panasonic RAW image file
- [`s3m`](https://wiki.openmpt.org/Manual:_Module_formats#The_ScreamTracker_3_format_.28.s3m.29) - Audio module format: ScreamTracker 3
- [`sav`](https://en.wikipedia.org/wiki/SPSS) - SPSS Statistical Data File
- [`shp`](https://en.wikipedia.org/wiki/Shapefile) - Geospatial vector data format
- [`skp`](https://en.wikipedia.org/wiki/SketchUp) - SketchUp
- [`spx`](https://en.wikipedia.org/wiki/Ogg) - Audio file
- [`sqlite`](https://www.sqlite.org/fileformat2.html) - SQLite file
- [`stl`](https://en.wikipedia.org/wiki/STL_(file_format)) - Standard Tesselated Geometry File Format (ASCII only)
- [`swf`](https://en.wikipedia.org/wiki/SWF) - Adobe Flash Player file
- [`tar`](https://en.wikipedia.org/wiki/Tar_(computing)#File_format) - Tape archive or tarball
- [`tar.gz`](https://en.wikipedia.org/wiki/Gzip) - Gzipped tape archive (tarball)
- [`tif`](https://en.wikipedia.org/wiki/Tagged_Image_File_Format) - Tagged Image file
- [`ttc`](https://en.wikipedia.org/wiki/TrueType#TrueType_Collection) - TrueType Collection font
- [`ttf`](https://en.wikipedia.org/wiki/TrueType) - TrueType font
- [`vcf`](https://en.wikipedia.org/wiki/VCard) - vCard
- [`voc`](https://wiki.multimedia.cx/index.php/Creative_Voice) - Creative Voice File
- [`vsdx`](https://en.wikipedia.org/wiki/Microsoft_Visio) - Microsoft Visio File
- [`vtt`](https://en.wikipedia.org/wiki/WebVTT) - WebVTT File (for video captions)
- [`wasm`](https://en.wikipedia.org/wiki/WebAssembly) - WebAssembly intermediate compiled format
- [`wav`](https://en.wikipedia.org/wiki/WAV) - Waveform Audio file
- [`webm`](https://en.wikipedia.org/wiki/WebM) - Web video file
- [`webp`](https://en.wikipedia.org/wiki/WebP) - Web Picture format
- [`woff`](https://en.wikipedia.org/wiki/Web_Open_Font_Format) - Web Open Font Format
- [`woff2`](https://en.wikipedia.org/wiki/Web_Open_Font_Format) - Web Open Font Format
- [`wv`](https://en.wikipedia.org/wiki/WavPack) - WavPack
- [`xcf`](https://en.wikipedia.org/wiki/XCF_(file_format)) - eXperimental Computing Facility
- [`xlsm`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions) - Microsoft Excel macro-enabled document
- [`xlsx`](https://en.wikipedia.org/wiki/Office_Open_XML) - Microsoft Excel document
- [`xltm`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions) - Microsoft Excel macro-enabled template
- [`xltx`](https://en.wikipedia.org/wiki/List_of_Microsoft_Office_filename_extensions) - Microsoft Excel template
- [`xm`](https://wiki.openmpt.org/Manual:_Module_formats#The_FastTracker_2_format_.28.xm.29) - Audio module format: FastTracker 2
- [`xml`](https://en.wikipedia.org/wiki/XML) - eXtensible Markup Language
- [`xpi`](https://en.wikipedia.org/wiki/XPInstall) - XPInstall file
- [`xz`](https://en.wikipedia.org/wiki/Xz) - Compressed file
- [`zip`](https://en.wikipedia.org/wiki/Zip_(file_format)) - Archive file
- [`zst`](https://en.wikipedia.org/wiki/Zstandard) - Archive file

*[Pull requests](.github/pull_request_template.md) are welcome for additional commonly used file types.*

The following file types will not be accepted, but most of them are supported by [third-party detector](#available-third-party-file-type-detectors)
- [MS-CFB: Microsoft Compound File Binary File Format based formats](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/53989ce4-7b05-4f8d-829b-d08d6148375b)
	- `.doc` - Microsoft Word 97-2003 Document
	- `.xls` - Microsoft Excel 97-2003 Document
	- `.ppt` - Microsoft PowerPoint97-2003 Document
	- `.msi` - Microsoft Windows Installer
- `.csv` - [Reason.](https://github.com/sindresorhus/file-type/issues/264#issuecomment-568439196)
- `.svg`

#### tokenizer

Type: [`ITokenizer`](https://github.com/Borewit/strtok3#tokenizer)

Usable as source of the examined file.

#### fileType

Type: `FileTypeResult`

An object having an `ext` (extension) and `mime` (mime type) property.

Detected by the standard detections or a previous custom detection. Undefined if no matching fileTypeResult could be found.

## Related

- [file-type-cli](https://github.com/sindresorhus/file-type-cli) - CLI for this module
- [image-dimensions](https://github.com/sindresorhus/image-dimensions) - Get the dimensions of an image

## Maintainers

- [Sindre Sorhus](https://github.com/sindresorhus)
- [Borewit](https://github.com/Borewit)
