[![Node.js CI](https://github.com/Borewit/tokenizer-inflate/actions/workflows/nodejs-ci.yml/badge.svg)](https://github.com/Borewit/tokenizer-inflate/actions/workflows/nodejs-ci.yml)
[![NPM version](https://badge.fury.io/js/%40tokenizer%2Finflate.svg)](https://npmjs.org/package/@tokenizer/inflate)
[![npm downloads](https://img.shields.io/npm/dm/@tokenizer%2Finflate.svg)](https://npmcharts.com/compare/%40tokenizer%2Finflate?start=1200&interval=30)

# @tokenizer/inflate

`@tokenizer/inflate` is a package designed for handling and extracting data from ZIP files efficiently using a tokenizer-based approach.
The library provides a customizable way to parse ZIP archives and extract compressed data while minimizing memory usage.

## Features
- Efficient Decompression: Handles streams compressed with DEFLATE and related formats (e.g., gzip).
- Tokenizer Compatibility: Seamlessly integrates with [strtok3](https://github.com/Borewit/strtok3). For example, use  [@tokenizer/s3](https://github.com/Borewit/tokenizer-s3) for efficient partial extraction of a Zip stored on AWS S3 cloud file storage.
- Streamlined Interface: Provides an intuitive API for working with compressed data in streaming and random-access scenarios.
- Chunked Data Access: Leverages the underlying media's capabilities to offer chunked or random access to data, unlike traditional streams.
- Plug-and-Play: Easily integrate with existing tokenizer-based workflows for parsing file metadata or binary structures.
- Interrupt the extraction process conditionally.

## Installation
```bash
npm install @tokenizer/inflate
```

## Usage

### Example: Extracting Specific Files

The following example demonstrates how to use the library to extract .txt files and stop processing when encountering a .stop file.

```js
import { ZipHandler } from '@tokenizer/inflate';
import { fromFile } from 'strtok3';

const fileFilter = (file) => {
  console.log(`Processing file: ${file.filename}`);

  if (file.filename?.endsWith(".stop")) {
    console.log(`Stopping processing due to file: ${file.filename}`);
    return { handler: false, stop: true }; // Stop the unzip process
  }

  if (file.filename?.endsWith(".txt")) {
    return {
      handler: async (data) => {
        console.log(`Extracted text file: ${file.filename}`);
        console.log(new TextDecoder().decode(data));
      },
    };
  }

  return { handler: false }; // Ignore other files
};

async function extractFiles(zipFilePath) {
  const tokenizer = await fromFile(zipFilePath);
  const zipHandler = new ZipHandler(tokenizer);
  await zipHandler.unzip(fileFilter);
}

extractFiles('example.zip').catch(console.error);
```

## API

### `ZipHandler`
A class for handling ZIP file parsing and extraction.
#### Constructor
```ts
new ZipHandler(tokenizer: ITokenizer)
```
- **tokenizer**: An instance of ITokenizer to read the ZIP archive.
#### Methods
 
- `isZip(): Promise<boolean>`

   Determines whether the input file is a ZIP archive.

- `unzip(fileCb: InflateFileFilter): Promise<void>`

  Extracts files from the ZIP archive, applying the provided `InflateFileFilter` callback to each file.

```InflatedDataHandler``` 

## Types

### `InflateFileFilter`
```ts
type InflateFileFilter = (file: IFullZipHeader) => InflateFileFilterResult;
```
Callback function to determine whether a file should be handled or ignored.

### `InflateFileFilterResult`
```ts
type InflateFileFilterResult = {
  handler: InflatedDataHandler | false; // Handle file data or ignore
  stop?: boolean; // Stop processing further files
};

```
Returned from `InflateFileFilter` to control file handling and extraction flow.

### `InflatedDataHandler`
```ts
type InflatedDataHandler = (fileData: Uint8Array) => Promise<void>;
```
Handler for processing uncompressed file data.

## Compatibility

This module is a [pure ECMAScript Module (ESM)](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
The distributed JavaScript codebase is compliant with the [ECMAScript 2020 (11th Edition)](https://en.wikipedia.org/wiki/ECMAScript_version_history#11th_Edition_%E2%80%93_ECMAScript_2020) standard.
If used with Node.js, it requires version ≥ 18.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.