/**
Node.js specific entry point.
*/

import {ReadableStream as WebReadableStream} from 'node:stream/web';
import {pipeline, PassThrough, Readable} from 'node:stream';
import fs from 'node:fs/promises';
import {constants as fileSystemConstants} from 'node:fs';
import * as strtok3 from 'strtok3';
import {
	FileTypeParser as DefaultFileTypeParser,
	reasonableDetectionSizeInBytes,
	normalizeSampleSize,
} from './core.js';

function isTokenizerStreamBoundsError(error) {
	if (
		!(error instanceof RangeError)
		|| error.message !== 'offset is out of bounds'
		|| typeof error.stack !== 'string'
	) {
		return false;
	}

	// Some malformed or non-byte Node.js streams can surface this tokenizer-internal range error.
	// Note: This stack-trace check is fragile and may break if strtok3 restructures its internals.
	return /strtok3[/\\]lib[/\\]stream[/\\]/.test(error.stack);
}

export class FileTypeParser extends DefaultFileTypeParser {
	async fromStream(stream) {
		this.options.signal?.throwIfAborted();
		const tokenizer = await (stream instanceof WebReadableStream ? this.createTokenizerFromWebStream(stream) : strtok3.fromStream(stream, this.getTokenizerOptions()));
		try {
			return await super.fromTokenizer(tokenizer);
		} catch (error) {
			if (isTokenizerStreamBoundsError(error)) {
				return;
			}

			throw error;
		} finally {
			// TODO: Remove this when `strtok3.fromStream()` closes the underlying Readable instead of only aborting tokenizer reads.
			if (
				stream instanceof Readable
				&& !stream.destroyed
			) {
				stream.destroy();
			}
		}
	}

	async fromFile(path) {
		this.options.signal?.throwIfAborted();
		// TODO: Remove this when `strtok3.fromFile()` safely rejects non-regular filesystem objects without a pathname race.
		const fileHandle = await fs.open(path, fileSystemConstants.O_RDONLY | fileSystemConstants.O_NONBLOCK);
		const fileStat = await fileHandle.stat();
		if (!fileStat.isFile()) {
			await fileHandle.close();
			return;
		}

		const tokenizer = new strtok3.FileTokenizer(fileHandle, {
			...this.getTokenizerOptions(),
			fileInfo: {
				path,
				size: fileStat.size,
			},
		});
		return super.fromTokenizer(tokenizer);
	}

	async toDetectionStream(readableStream, options = {}) {
		if (!(readableStream instanceof Readable)) {
			return super.toDetectionStream(readableStream, options);
		}

		const {sampleSize = reasonableDetectionSizeInBytes} = options;
		const {signal} = this.options;
		const normalizedSampleSize = normalizeSampleSize(sampleSize);

		signal?.throwIfAborted();

		return new Promise((resolve, reject) => {
			let isSettled = false;

			const cleanup = () => {
				readableStream.off('error', onError);
				readableStream.off('readable', onReadable);
				signal?.removeEventListener('abort', onAbort);
			};

			const settle = (callback, value) => {
				if (isSettled) {
					return;
				}

				isSettled = true;
				cleanup();
				callback(value);
			};

			const onError = error => {
				settle(reject, error);
			};

			const onAbort = () => {
				if (!readableStream.destroyed) {
					readableStream.destroy();
				}

				settle(reject, signal.reason);
			};

			const onReadable = () => {
				(async () => {
					try {
						const pass = new PassThrough();
						const outputStream = pipeline ? pipeline(readableStream, pass, () => {}) : readableStream.pipe(pass);
						const chunk = readableStream.read(normalizedSampleSize) ?? readableStream.read() ?? new Uint8Array(0);
						try {
							pass.fileType = await this.fromBuffer(chunk);
						} catch (error) {
							if (error instanceof strtok3.EndOfStreamError) {
								pass.fileType = undefined;
							} else {
								settle(reject, error);
							}
						}

						settle(resolve, outputStream);
					} catch (error) {
						settle(reject, error);
					}
				})();
			};

			readableStream.on('error', onError);
			readableStream.once('readable', onReadable);
			signal?.addEventListener('abort', onAbort, {once: true});
		});
	}
}

export async function fileTypeFromFile(path, options) {
	return (new FileTypeParser(options)).fromFile(path, options);
}

export async function fileTypeFromStream(stream, options) {
	return (new FileTypeParser(options)).fromStream(stream);
}

export async function fileTypeStream(readableStream, options = {}) {
	return new FileTypeParser(options).toDetectionStream(readableStream, options);
}

export {
	fileTypeFromTokenizer,
	fileTypeFromBuffer,
	fileTypeFromBlob,
	supportedMimeTypes,
	supportedExtensions,
} from './core.js';
