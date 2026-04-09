/**
Primary entry point, Node.js specific entry point is index.js
*/

import * as Token from 'token-types';
import * as strtok3 from 'strtok3/core';
import {ZipHandler, GzipHandler} from '@tokenizer/inflate';
import {getUintBE} from 'uint8array-extras';
import {
	stringToBytes,
	tarHeaderChecksumMatches,
	uint32SyncSafeToken,
} from './util.js';
import {extensions, mimeTypes} from './supported.js';

export const reasonableDetectionSizeInBytes = 4100; // A fair amount of file-types are detectable within this range.
// Keep defensive limits small enough to avoid accidental memory spikes from untrusted inputs.
const maximumMpegOffsetTolerance = reasonableDetectionSizeInBytes - 2;
const maximumZipEntrySizeInBytes = 1024 * 1024;
const maximumZipEntryCount = 1024;
const maximumZipBufferedReadSizeInBytes = (2 ** 31) - 1;
const maximumUntrustedSkipSizeInBytes = 16 * 1024 * 1024;
const maximumUnknownSizePayloadProbeSizeInBytes = maximumZipEntrySizeInBytes;
const maximumZipTextEntrySizeInBytes = maximumZipEntrySizeInBytes;
const maximumNestedGzipDetectionSizeInBytes = maximumUntrustedSkipSizeInBytes;
const maximumNestedGzipProbeDepth = 1;
const unknownSizeGzipProbeTimeoutInMilliseconds = 100;
const maximumId3HeaderSizeInBytes = maximumUntrustedSkipSizeInBytes;
const maximumEbmlDocumentTypeSizeInBytes = 64;
const maximumEbmlElementPayloadSizeInBytes = maximumUnknownSizePayloadProbeSizeInBytes;
const maximumEbmlElementCount = 256;
const maximumPngChunkCount = 512;
const maximumPngStreamScanBudgetInBytes = maximumUntrustedSkipSizeInBytes;
const maximumAsfHeaderObjectCount = 512;
const maximumTiffTagCount = 512;
const maximumDetectionReentryCount = 256;
const maximumPngChunkSizeInBytes = maximumUnknownSizePayloadProbeSizeInBytes;
const maximumAsfHeaderPayloadSizeInBytes = maximumUnknownSizePayloadProbeSizeInBytes;
const maximumTiffStreamIfdOffsetInBytes = maximumUnknownSizePayloadProbeSizeInBytes;
const maximumTiffIfdOffsetInBytes = maximumUntrustedSkipSizeInBytes;
const recoverableZipErrorMessages = new Set([
	'Unexpected signature',
	'Encrypted ZIP',
	'Expected Central-File-Header signature',
]);
const recoverableZipErrorMessagePrefixes = [
	'ZIP entry count exceeds ',
	'Unsupported ZIP compression method:',
	'ZIP entry compressed data exceeds ',
	'ZIP entry decompressed data exceeds ',
	'Expected data-descriptor-signature at position ',
];
const recoverableZipErrorCodes = new Set([
	'Z_BUF_ERROR',
	'Z_DATA_ERROR',
	'ERR_INVALID_STATE',
]);

class ParserHardLimitError extends Error {}

function patchWebByobTokenizerClose(tokenizer) {
	const streamReader = tokenizer?.streamReader;
	if (streamReader?.constructor?.name !== 'WebStreamByobReader') {
		return tokenizer;
	}

	const {reader} = streamReader;
	const cancelAndRelease = async () => {
		await reader.cancel();
		reader.releaseLock();
	};

	streamReader.close = cancelAndRelease;
	streamReader.abort = async () => {
		streamReader.interrupted = true;
		await cancelAndRelease();
	};

	return tokenizer;
}

function getSafeBound(value, maximum, reason) {
	if (
		!Number.isFinite(value)
		|| value < 0
		|| value > maximum
	) {
		throw new ParserHardLimitError(`${reason} has invalid size ${value} (maximum ${maximum} bytes)`);
	}

	return value;
}

async function safeIgnore(tokenizer, length, {maximumLength = maximumUntrustedSkipSizeInBytes, reason = 'skip'} = {}) {
	const safeLength = getSafeBound(length, maximumLength, reason);
	await tokenizer.ignore(safeLength);
}

async function safeReadBuffer(tokenizer, buffer, options, {maximumLength = buffer.length, reason = 'read'} = {}) {
	const length = options?.length ?? buffer.length;
	const safeLength = getSafeBound(length, maximumLength, reason);
	return tokenizer.readBuffer(buffer, {
		...options,
		length: safeLength,
	});
}

async function decompressDeflateRawWithLimit(data, {maximumLength = maximumZipEntrySizeInBytes} = {}) {
	const input = new ReadableStream({
		start(controller) {
			controller.enqueue(data);
			controller.close();
		},
	});
	const output = input.pipeThrough(new DecompressionStream('deflate-raw'));
	const reader = output.getReader();
	const chunks = [];
	let totalLength = 0;

	try {
		for (;;) {
			const {done, value} = await reader.read();
			if (done) {
				break;
			}

			totalLength += value.length;
			if (totalLength > maximumLength) {
				await reader.cancel();
				throw new Error(`ZIP entry decompressed data exceeds ${maximumLength} bytes`);
			}

			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const uncompressedData = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		uncompressedData.set(chunk, offset);
		offset += chunk.length;
	}

	return uncompressedData;
}

const zipDataDescriptorSignature = 0x08_07_4B_50;
const zipDataDescriptorLengthInBytes = 16;
const zipDataDescriptorOverlapLengthInBytes = zipDataDescriptorLengthInBytes - 1;

function findZipDataDescriptorOffset(buffer, bytesConsumed) {
	if (buffer.length < zipDataDescriptorLengthInBytes) {
		return -1;
	}

	const lastPossibleDescriptorOffset = buffer.length - zipDataDescriptorLengthInBytes;
	for (let index = 0; index <= lastPossibleDescriptorOffset; index++) {
		if (
			Token.UINT32_LE.get(buffer, index) === zipDataDescriptorSignature
			&& Token.UINT32_LE.get(buffer, index + 8) === bytesConsumed + index
		) {
			return index;
		}
	}

	return -1;
}

function isPngAncillaryChunk(type) {
	return (type.codePointAt(0) & 0x20) !== 0;
}

function mergeByteChunks(chunks, totalLength) {
	const merged = new Uint8Array(totalLength);
	let offset = 0;

	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.length;
	}

	return merged;
}

async function readZipDataDescriptorEntryWithLimit(zipHandler, {shouldBuffer, maximumLength = maximumZipEntrySizeInBytes} = {}) {
	const {syncBuffer} = zipHandler;
	const {length: syncBufferLength} = syncBuffer;
	const chunks = [];
	let bytesConsumed = 0;

	for (;;) {
		const length = await zipHandler.tokenizer.peekBuffer(syncBuffer, {mayBeLess: true});
		const dataDescriptorOffset = findZipDataDescriptorOffset(syncBuffer.subarray(0, length), bytesConsumed);
		const retainedLength = dataDescriptorOffset >= 0
			? 0
			: (
				length === syncBufferLength
					? Math.min(zipDataDescriptorOverlapLengthInBytes, length - 1)
					: 0
			);
		const chunkLength = dataDescriptorOffset >= 0 ? dataDescriptorOffset : length - retainedLength;

		if (chunkLength === 0) {
			break;
		}

		bytesConsumed += chunkLength;
		if (bytesConsumed > maximumLength) {
			throw new Error(`ZIP entry compressed data exceeds ${maximumLength} bytes`);
		}

		if (shouldBuffer) {
			const data = new Uint8Array(chunkLength);
			await zipHandler.tokenizer.readBuffer(data);
			chunks.push(data);
		} else {
			await zipHandler.tokenizer.ignore(chunkLength);
		}

		if (dataDescriptorOffset >= 0) {
			break;
		}
	}

	if (!hasUnknownFileSize(zipHandler.tokenizer)) {
		zipHandler.knownSizeDescriptorScannedBytes += bytesConsumed;
	}

	if (!shouldBuffer) {
		return;
	}

	return mergeByteChunks(chunks, bytesConsumed);
}

function getRemainingZipScanBudget(zipHandler, startOffset) {
	if (hasUnknownFileSize(zipHandler.tokenizer)) {
		return Math.max(0, maximumUntrustedSkipSizeInBytes - (zipHandler.tokenizer.position - startOffset));
	}

	return Math.max(0, maximumZipEntrySizeInBytes - zipHandler.knownSizeDescriptorScannedBytes);
}

async function readZipEntryData(zipHandler, zipHeader, {shouldBuffer, maximumDescriptorLength = maximumZipEntrySizeInBytes} = {}) {
	if (
		zipHeader.dataDescriptor
		&& zipHeader.compressedSize === 0
	) {
		return readZipDataDescriptorEntryWithLimit(zipHandler, {
			shouldBuffer,
			maximumLength: maximumDescriptorLength,
		});
	}

	if (!shouldBuffer) {
		await safeIgnore(zipHandler.tokenizer, zipHeader.compressedSize, {
			maximumLength: hasUnknownFileSize(zipHandler.tokenizer) ? maximumZipEntrySizeInBytes : zipHandler.tokenizer.fileInfo.size,
			reason: 'ZIP entry compressed data',
		});
		return;
	}

	const maximumLength = getMaximumZipBufferedReadLength(zipHandler.tokenizer);
	if (
		!Number.isFinite(zipHeader.compressedSize)
		|| zipHeader.compressedSize < 0
		|| zipHeader.compressedSize > maximumLength
	) {
		throw new Error(`ZIP entry compressed data exceeds ${maximumLength} bytes`);
	}

	const fileData = new Uint8Array(zipHeader.compressedSize);
	await zipHandler.tokenizer.readBuffer(fileData);
	return fileData;
}

// Override the default inflate to enforce decompression size limits, since @tokenizer/inflate does not expose a configuration hook for this.
ZipHandler.prototype.inflate = async function (zipHeader, fileData, callback) {
	if (zipHeader.compressedMethod === 0) {
		return callback(fileData);
	}

	if (zipHeader.compressedMethod !== 8) {
		throw new Error(`Unsupported ZIP compression method: ${zipHeader.compressedMethod}`);
	}

	const uncompressedData = await decompressDeflateRawWithLimit(fileData, {maximumLength: maximumZipEntrySizeInBytes});
	return callback(uncompressedData);
};

ZipHandler.prototype.unzip = async function (fileCallback) {
	let stop = false;
	let zipEntryCount = 0;
	const zipScanStart = this.tokenizer.position;
	this.knownSizeDescriptorScannedBytes = 0;
	do {
		if (hasExceededUnknownSizeScanBudget(this.tokenizer, zipScanStart, maximumUntrustedSkipSizeInBytes)) {
			throw new ParserHardLimitError(`ZIP stream probing exceeds ${maximumUntrustedSkipSizeInBytes} bytes`);
		}

		const zipHeader = await this.readLocalFileHeader();
		if (!zipHeader) {
			break;
		}

		zipEntryCount++;
		if (zipEntryCount > maximumZipEntryCount) {
			throw new Error(`ZIP entry count exceeds ${maximumZipEntryCount}`);
		}

		const next = fileCallback(zipHeader);
		stop = Boolean(next.stop);
		await this.tokenizer.ignore(zipHeader.extraFieldLength);
		const fileData = await readZipEntryData(this, zipHeader, {
			shouldBuffer: Boolean(next.handler),
			maximumDescriptorLength: Math.min(maximumZipEntrySizeInBytes, getRemainingZipScanBudget(this, zipScanStart)),
		});

		if (next.handler) {
			await this.inflate(zipHeader, fileData, next.handler);
		}

		if (zipHeader.dataDescriptor) {
			const dataDescriptor = new Uint8Array(zipDataDescriptorLengthInBytes);
			await this.tokenizer.readBuffer(dataDescriptor);
			if (Token.UINT32_LE.get(dataDescriptor, 0) !== zipDataDescriptorSignature) {
				throw new Error(`Expected data-descriptor-signature at position ${this.tokenizer.position - dataDescriptor.length}`);
			}
		}

		if (hasExceededUnknownSizeScanBudget(this.tokenizer, zipScanStart, maximumUntrustedSkipSizeInBytes)) {
			throw new ParserHardLimitError(`ZIP stream probing exceeds ${maximumUntrustedSkipSizeInBytes} bytes`);
		}
	} while (!stop);
};

function createByteLimitedReadableStream(stream, maximumBytes) {
	const reader = stream.getReader();
	let emittedBytes = 0;
	let sourceDone = false;
	let sourceCanceled = false;

	const cancelSource = async reason => {
		if (
			sourceDone
			|| sourceCanceled
		) {
			return;
		}

		sourceCanceled = true;
		await reader.cancel(reason);
	};

	return new ReadableStream({
		async pull(controller) {
			if (emittedBytes >= maximumBytes) {
				controller.close();
				await cancelSource();
				return;
			}

			const {done, value} = await reader.read();
			if (
				done
				|| !value
			) {
				sourceDone = true;
				controller.close();
				return;
			}

			const remainingBytes = maximumBytes - emittedBytes;
			if (value.length > remainingBytes) {
				controller.enqueue(value.subarray(0, remainingBytes));
				emittedBytes += remainingBytes;
				controller.close();
				await cancelSource();
				return;
			}

			controller.enqueue(value);
			emittedBytes += value.length;
		},
		async cancel(reason) {
			await cancelSource(reason);
		},
	});
}

export async function fileTypeFromStream(stream, options) {
	return new FileTypeParser(options).fromStream(stream);
}

export async function fileTypeFromBuffer(input, options) {
	return new FileTypeParser(options).fromBuffer(input);
}

export async function fileTypeFromBlob(blob, options) {
	return new FileTypeParser(options).fromBlob(blob);
}

function getFileTypeFromMimeType(mimeType) {
	mimeType = mimeType.toLowerCase();
	switch (mimeType) {
		case 'application/epub+zip':
			return {
				ext: 'epub',
				mime: mimeType,
			};
		case 'application/vnd.oasis.opendocument.text':
			return {
				ext: 'odt',
				mime: mimeType,
			};
		case 'application/vnd.oasis.opendocument.text-template':
			return {
				ext: 'ott',
				mime: mimeType,
			};
		case 'application/vnd.oasis.opendocument.spreadsheet':
			return {
				ext: 'ods',
				mime: mimeType,
			};
		case 'application/vnd.oasis.opendocument.spreadsheet-template':
			return {
				ext: 'ots',
				mime: mimeType,
			};
		case 'application/vnd.oasis.opendocument.presentation':
			return {
				ext: 'odp',
				mime: mimeType,
			};
		case 'application/vnd.oasis.opendocument.presentation-template':
			return {
				ext: 'otp',
				mime: mimeType,
			};
		case 'application/vnd.oasis.opendocument.graphics':
			return {
				ext: 'odg',
				mime: mimeType,
			};
		case 'application/vnd.oasis.opendocument.graphics-template':
			return {
				ext: 'otg',
				mime: mimeType,
			};
		case 'application/vnd.openxmlformats-officedocument.presentationml.slideshow':
			return {
				ext: 'ppsx',
				mime: mimeType,
			};
		case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
			return {
				ext: 'xlsx',
				mime: mimeType,
			};
		case 'application/vnd.ms-excel.sheet.macroenabled':
			return {
				ext: 'xlsm',
				mime: 'application/vnd.ms-excel.sheet.macroenabled.12',
			};
		case 'application/vnd.openxmlformats-officedocument.spreadsheetml.template':
			return {
				ext: 'xltx',
				mime: mimeType,
			};
		case 'application/vnd.ms-excel.template.macroenabled':
			return {
				ext: 'xltm',
				mime: 'application/vnd.ms-excel.template.macroenabled.12',
			};
		case 'application/vnd.ms-powerpoint.slideshow.macroenabled':
			return {
				ext: 'ppsm',
				mime: 'application/vnd.ms-powerpoint.slideshow.macroenabled.12',
			};
		case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
			return {
				ext: 'docx',
				mime: mimeType,
			};
		case 'application/vnd.ms-word.document.macroenabled':
			return {
				ext: 'docm',
				mime: 'application/vnd.ms-word.document.macroenabled.12',
			};
		case 'application/vnd.openxmlformats-officedocument.wordprocessingml.template':
			return {
				ext: 'dotx',
				mime: mimeType,
			};
		case 'application/vnd.ms-word.template.macroenabledtemplate':
			return {
				ext: 'dotm',
				mime: 'application/vnd.ms-word.template.macroenabled.12',
			};
		case 'application/vnd.openxmlformats-officedocument.presentationml.template':
			return {
				ext: 'potx',
				mime: mimeType,
			};
		case 'application/vnd.ms-powerpoint.template.macroenabled':
			return {
				ext: 'potm',
				mime: 'application/vnd.ms-powerpoint.template.macroenabled.12',
			};
		case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
			return {
				ext: 'pptx',
				mime: mimeType,
			};
		case 'application/vnd.ms-powerpoint.presentation.macroenabled':
			return {
				ext: 'pptm',
				mime: 'application/vnd.ms-powerpoint.presentation.macroenabled.12',
			};
		case 'application/vnd.ms-visio.drawing':
			return {
				ext: 'vsdx',
				mime: 'application/vnd.visio',
			};
		case 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml':
			return {
				ext: '3mf',
				mime: 'model/3mf',
			};
		default:
	}
}

function _check(buffer, headers, options) {
	options = {
		offset: 0,
		...options,
	};

	for (const [index, header] of headers.entries()) {
		// If a bitmask is set
		if (options.mask) {
			// If header doesn't equal `buf` with bits masked off
			if (header !== (options.mask[index] & buffer[index + options.offset])) {
				return false;
			}
		} else if (header !== buffer[index + options.offset]) {
			return false;
		}
	}

	return true;
}

export function normalizeSampleSize(sampleSize) {
	// `sampleSize` is an explicit caller-controlled tuning knob, not untrusted file input.
	// Preserve valid caller-requested probe depth here; applications must bound attacker-derived option values themselves.
	if (!Number.isFinite(sampleSize)) {
		return reasonableDetectionSizeInBytes;
	}

	return Math.max(1, Math.trunc(sampleSize));
}

function readByobReaderWithSignal(reader, buffer, signal) {
	if (signal === undefined) {
		return reader.read(buffer);
	}

	signal.throwIfAborted();

	return new Promise((resolve, reject) => {
		const cleanup = () => {
			signal.removeEventListener('abort', onAbort);
		};

		const onAbort = () => {
			const abortReason = signal.reason;
			cleanup();

			(async () => {
				try {
					await reader.cancel(abortReason);
				} catch {}
			})();

			reject(abortReason);
		};

		signal.addEventListener('abort', onAbort, {once: true});
		(async () => {
			try {
				const result = await reader.read(buffer);
				cleanup();
				resolve(result);
			} catch (error) {
				cleanup();
				reject(error);
			}
		})();
	});
}

function normalizeMpegOffsetTolerance(mpegOffsetTolerance) {
	// This value controls scan depth and therefore worst-case CPU work.
	if (!Number.isFinite(mpegOffsetTolerance)) {
		return 0;
	}

	return Math.max(0, Math.min(maximumMpegOffsetTolerance, Math.trunc(mpegOffsetTolerance)));
}

function getKnownFileSizeOrMaximum(fileSize) {
	if (!Number.isFinite(fileSize)) {
		return Number.MAX_SAFE_INTEGER;
	}

	return Math.max(0, fileSize);
}

function hasUnknownFileSize(tokenizer) {
	const fileSize = tokenizer.fileInfo.size;
	return (
		!Number.isFinite(fileSize)
		|| fileSize === Number.MAX_SAFE_INTEGER
	);
}

function hasExceededUnknownSizeScanBudget(tokenizer, startOffset, maximumBytes) {
	return (
		hasUnknownFileSize(tokenizer)
		&& tokenizer.position - startOffset > maximumBytes
	);
}

function getMaximumZipBufferedReadLength(tokenizer) {
	const fileSize = tokenizer.fileInfo.size;
	const remainingBytes = Number.isFinite(fileSize)
		? Math.max(0, fileSize - tokenizer.position)
		: Number.MAX_SAFE_INTEGER;

	return Math.min(remainingBytes, maximumZipBufferedReadSizeInBytes);
}

function isRecoverableZipError(error) {
	if (error instanceof strtok3.EndOfStreamError) {
		return true;
	}

	if (error instanceof ParserHardLimitError) {
		return true;
	}

	if (!(error instanceof Error)) {
		return false;
	}

	if (recoverableZipErrorMessages.has(error.message)) {
		return true;
	}

	if (recoverableZipErrorCodes.has(error.code)) {
		return true;
	}

	for (const prefix of recoverableZipErrorMessagePrefixes) {
		if (error.message.startsWith(prefix)) {
			return true;
		}
	}

	return false;
}

function canReadZipEntryForDetection(zipHeader, maximumSize = maximumZipEntrySizeInBytes) {
	const sizes = [zipHeader.compressedSize, zipHeader.uncompressedSize];
	for (const size of sizes) {
		if (
			!Number.isFinite(size)
			|| size < 0
			|| size > maximumSize
		) {
			return false;
		}
	}

	return true;
}

function createOpenXmlZipDetectionState() {
	return {
		hasContentTypesEntry: false,
		hasParsedContentTypesEntry: false,
		isParsingContentTypes: false,
		hasUnparseableContentTypes: false,
		hasWordDirectory: false,
		hasPresentationDirectory: false,
		hasSpreadsheetDirectory: false,
		hasThreeDimensionalModelEntry: false,
	};
}

function updateOpenXmlZipDetectionStateFromFilename(openXmlState, filename) {
	if (filename.startsWith('word/')) {
		openXmlState.hasWordDirectory = true;
	}

	if (filename.startsWith('ppt/')) {
		openXmlState.hasPresentationDirectory = true;
	}

	if (filename.startsWith('xl/')) {
		openXmlState.hasSpreadsheetDirectory = true;
	}

	if (
		filename.startsWith('3D/')
		&& filename.endsWith('.model')
	) {
		openXmlState.hasThreeDimensionalModelEntry = true;
	}
}

function getOpenXmlFileTypeFromZipEntries(openXmlState) {
	// Only use directory-name heuristic when [Content_Types].xml was present in the archive
	// but its handler was skipped (not invoked, not currently running, and not already resolved).
	// This avoids guessing from directory names when content-type parsing already gave a definitive answer or failed.
	if (
		!openXmlState.hasContentTypesEntry
		|| openXmlState.hasUnparseableContentTypes
		|| openXmlState.isParsingContentTypes
		|| openXmlState.hasParsedContentTypesEntry
	) {
		return;
	}

	if (openXmlState.hasWordDirectory) {
		return {
			ext: 'docx',
			mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		};
	}

	if (openXmlState.hasPresentationDirectory) {
		return {
			ext: 'pptx',
			mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		};
	}

	if (openXmlState.hasSpreadsheetDirectory) {
		return {
			ext: 'xlsx',
			mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		};
	}

	if (openXmlState.hasThreeDimensionalModelEntry) {
		return {
			ext: '3mf',
			mime: 'model/3mf',
		};
	}
}

function getOpenXmlMimeTypeFromContentTypesXml(xmlContent) {
	// We only need the `ContentType="...main+xml"` value, so a small string scan is enough and avoids full XML parsing.
	const endPosition = xmlContent.indexOf('.main+xml"');
	if (endPosition === -1) {
		const mimeType = 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml';
		if (xmlContent.includes(`ContentType="${mimeType}"`)) {
			return mimeType;
		}

		return;
	}

	const truncatedContent = xmlContent.slice(0, endPosition);
	const firstQuotePosition = truncatedContent.lastIndexOf('"');
	// If no quote is found, `lastIndexOf` returns -1 and this intentionally falls back to the full truncated prefix.
	return truncatedContent.slice(firstQuotePosition + 1);
}

export async function fileTypeFromTokenizer(tokenizer, options) {
	return new FileTypeParser(options).fromTokenizer(tokenizer);
}

export async function fileTypeStream(webStream, options) {
	return new FileTypeParser(options).toDetectionStream(webStream, options);
}

export class FileTypeParser {
	constructor(options) {
		const normalizedMpegOffsetTolerance = normalizeMpegOffsetTolerance(options?.mpegOffsetTolerance);
		this.options = {
			...options,
			mpegOffsetTolerance: normalizedMpegOffsetTolerance,
		};

		this.detectors = [...(this.options.customDetectors ?? []),
			{id: 'core', detect: this.detectConfident},
			{id: 'core.imprecise', detect: this.detectImprecise}];
		this.tokenizerOptions = {
			abortSignal: this.options.signal,
		};
		this.gzipProbeDepth = 0;
	}

	getTokenizerOptions() {
		return {
			...this.tokenizerOptions,
		};
	}

	createTokenizerFromWebStream(stream) {
		return patchWebByobTokenizerClose(strtok3.fromWebStream(stream, this.getTokenizerOptions()));
	}

	async parseTokenizer(tokenizer, detectionReentryCount = 0) {
		this.detectionReentryCount = detectionReentryCount;
		const initialPosition = tokenizer.position;
		// Iterate through all file-type detectors
		for (const detector of this.detectors) {
			let fileType;
			try {
				fileType = await detector.detect(tokenizer);
			} catch (error) {
				if (error instanceof strtok3.EndOfStreamError) {
					return;
				}

				if (error instanceof ParserHardLimitError) {
					return;
				}

				throw error;
			}

			if (fileType) {
				return fileType;
			}

			if (initialPosition !== tokenizer.position) {
				return undefined; // Cannot proceed scanning of the tokenizer is at an arbitrary position
			}
		}
	}

	async fromTokenizer(tokenizer) {
		try {
			return await this.parseTokenizer(tokenizer);
		} finally {
			await tokenizer.close();
		}
	}

	async fromBuffer(input) {
		if (!(input instanceof Uint8Array || input instanceof ArrayBuffer)) {
			throw new TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof input}\``);
		}

		const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);

		if (!(buffer?.length > 1)) {
			return;
		}

		return this.fromTokenizer(strtok3.fromBuffer(buffer, this.getTokenizerOptions()));
	}

	async fromBlob(blob) {
		this.options.signal?.throwIfAborted();
		const tokenizer = strtok3.fromBlob(blob, this.getTokenizerOptions());
		return this.fromTokenizer(tokenizer);
	}

	async fromStream(stream) {
		this.options.signal?.throwIfAborted();
		const tokenizer = this.createTokenizerFromWebStream(stream);
		return this.fromTokenizer(tokenizer);
	}

	async toDetectionStream(stream, options) {
		const sampleSize = normalizeSampleSize(options?.sampleSize ?? reasonableDetectionSizeInBytes);
		let detectedFileType;
		let firstChunk;

		const reader = stream.getReader({mode: 'byob'});
		try {
			// Read the first chunk from the stream
			const {value: chunk, done} = await readByobReaderWithSignal(reader, new Uint8Array(sampleSize), this.options.signal);
			firstChunk = chunk;
			if (!done && chunk) {
				try {
					// Attempt to detect the file type from the chunk
					detectedFileType = await this.fromBuffer(chunk.subarray(0, sampleSize));
				} catch (error) {
					if (!(error instanceof strtok3.EndOfStreamError)) {
						throw error; // Re-throw non-EndOfStreamError
					}

					detectedFileType = undefined;
				}
			}

			firstChunk = chunk;
		} finally {
			reader.releaseLock(); // Ensure the reader is released
		}

		// Create a new ReadableStream to manage locking issues
		const transformStream = new TransformStream({
			async start(controller) {
				controller.enqueue(firstChunk); // Enqueue the initial chunk
			},
			transform(chunk, controller) {
				// Pass through the chunks without modification
				controller.enqueue(chunk);
			},
		});

		const newStream = stream.pipeThrough(transformStream);
		newStream.fileType = detectedFileType;

		return newStream;
	}

	async detectGzip(tokenizer) {
		if (this.gzipProbeDepth >= maximumNestedGzipProbeDepth) {
			return {
				ext: 'gz',
				mime: 'application/gzip',
			};
		}

		const gzipHandler = new GzipHandler(tokenizer);
		const limitedInflatedStream = createByteLimitedReadableStream(gzipHandler.inflate(), maximumNestedGzipDetectionSizeInBytes);
		const hasUnknownSize = hasUnknownFileSize(tokenizer);
		let timeout;
		let probeSignal;
		let probeParser;
		let compressedFileType;

		if (hasUnknownSize) {
			const timeoutController = new AbortController();
			timeout = setTimeout(() => {
				timeoutController.abort(new DOMException(`Operation timed out after ${unknownSizeGzipProbeTimeoutInMilliseconds} ms`, 'TimeoutError'));
			}, unknownSizeGzipProbeTimeoutInMilliseconds);
			probeSignal = this.options.signal === undefined
				? timeoutController.signal
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				: AbortSignal.any([this.options.signal, timeoutController.signal]);
			probeParser = new FileTypeParser({
				...this.options,
				signal: probeSignal,
			});
			probeParser.gzipProbeDepth = this.gzipProbeDepth + 1;
		} else {
			this.gzipProbeDepth++;
		}

		try {
			compressedFileType = await (probeParser ?? this).fromStream(limitedInflatedStream);
		} catch (error) {
			if (
				error?.name === 'AbortError'
				&& probeSignal?.reason?.name !== 'TimeoutError'
			) {
				throw error;
			}

			// Timeout, decompression, or inner-detection failures are expected for non-tar gzip files.
		} finally {
			clearTimeout(timeout);
			if (!hasUnknownSize) {
				this.gzipProbeDepth--;
			}
		}

		if (compressedFileType?.ext === 'tar') {
			return {
				ext: 'tar.gz',
				mime: 'application/gzip',
			};
		}

		return {
			ext: 'gz',
			mime: 'application/gzip',
		};
	}

	check(header, options) {
		return _check(this.buffer, header, options);
	}

	checkString(header, options) {
		return this.check(stringToBytes(header, options?.encoding), options);
	}

	// Detections with a high degree of certainty in identifying the correct file type
	detectConfident = async tokenizer => {
		this.buffer = new Uint8Array(reasonableDetectionSizeInBytes);

		// Keep reading until EOF if the file size is unknown.
		if (tokenizer.fileInfo.size === undefined) {
			tokenizer.fileInfo.size = Number.MAX_SAFE_INTEGER;
		}

		this.tokenizer = tokenizer;

		if (hasUnknownFileSize(tokenizer)) {
			await tokenizer.peekBuffer(this.buffer, {length: 3, mayBeLess: true});
			if (this.check([0x1F, 0x8B, 0x8])) {
				return this.detectGzip(tokenizer);
			}
		}

		await tokenizer.peekBuffer(this.buffer, {length: 32, mayBeLess: true});

		// -- 2-byte signatures --

		if (this.check([0x42, 0x4D])) {
			return {
				ext: 'bmp',
				mime: 'image/bmp',
			};
		}

		if (this.check([0x0B, 0x77])) {
			return {
				ext: 'ac3',
				mime: 'audio/vnd.dolby.dd-raw',
			};
		}

		if (this.check([0x78, 0x01])) {
			return {
				ext: 'dmg',
				mime: 'application/x-apple-diskimage',
			};
		}

		if (this.check([0x4D, 0x5A])) {
			return {
				ext: 'exe',
				mime: 'application/x-msdownload',
			};
		}

		if (this.check([0x25, 0x21])) {
			await tokenizer.peekBuffer(this.buffer, {length: 24, mayBeLess: true});

			if (
				this.checkString('PS-Adobe-', {offset: 2})
				&& this.checkString(' EPSF-', {offset: 14})
			) {
				return {
					ext: 'eps',
					mime: 'application/eps',
				};
			}

			return {
				ext: 'ps',
				mime: 'application/postscript',
			};
		}

		if (
			this.check([0x1F, 0xA0])
			|| this.check([0x1F, 0x9D])
		) {
			return {
				ext: 'Z',
				mime: 'application/x-compress',
			};
		}

		if (this.check([0xC7, 0x71])) {
			return {
				ext: 'cpio',
				mime: 'application/x-cpio',
			};
		}

		if (this.check([0x60, 0xEA])) {
			return {
				ext: 'arj',
				mime: 'application/x-arj',
			};
		}

		// -- 3-byte signatures --

		if (this.check([0xEF, 0xBB, 0xBF])) { // UTF-8-BOM
			if (this.detectionReentryCount >= maximumDetectionReentryCount) {
				return;
			}

			this.detectionReentryCount++;
			// Strip off UTF-8-BOM
			await this.tokenizer.ignore(3);
			return this.detectConfident(tokenizer);
		}

		if (this.check([0x47, 0x49, 0x46])) {
			return {
				ext: 'gif',
				mime: 'image/gif',
			};
		}

		if (this.check([0x49, 0x49, 0xBC])) {
			return {
				ext: 'jxr',
				mime: 'image/vnd.ms-photo',
			};
		}

		if (this.check([0x1F, 0x8B, 0x8])) {
			return this.detectGzip(tokenizer);
		}

		if (this.check([0x42, 0x5A, 0x68])) {
			return {
				ext: 'bz2',
				mime: 'application/x-bzip2',
			};
		}

		if (this.checkString('ID3')) {
			await safeIgnore(tokenizer, 6, {
				maximumLength: 6,
				reason: 'ID3 header prefix',
			}); // Skip ID3 header until the header size
			const id3HeaderLength = await tokenizer.readToken(uint32SyncSafeToken);
			const isUnknownFileSize = hasUnknownFileSize(tokenizer);
			if (
				!Number.isFinite(id3HeaderLength)
					|| id3HeaderLength < 0
				// Keep ID3 probing bounded for unknown-size streams to avoid attacker-controlled large skips.
				|| (
					isUnknownFileSize
					&& (
						id3HeaderLength > maximumId3HeaderSizeInBytes
						|| (tokenizer.position + id3HeaderLength) > maximumId3HeaderSizeInBytes
					)
				)
			) {
				return;
			}

			if (tokenizer.position + id3HeaderLength > tokenizer.fileInfo.size) {
				if (isUnknownFileSize) {
					return;
				}

				return {
					ext: 'mp3',
					mime: 'audio/mpeg',
				};
			}

			try {
				await safeIgnore(tokenizer, id3HeaderLength, {
					maximumLength: isUnknownFileSize ? maximumId3HeaderSizeInBytes : tokenizer.fileInfo.size,
					reason: 'ID3 payload',
				});
			} catch (error) {
				if (error instanceof strtok3.EndOfStreamError) {
					return;
				}

				throw error;
			}

			if (this.detectionReentryCount >= maximumDetectionReentryCount) {
				return;
			}

			this.detectionReentryCount++;
			return this.parseTokenizer(tokenizer, this.detectionReentryCount); // Skip ID3 header, recursion
		}

		// Musepack, SV7
		if (this.checkString('MP+')) {
			return {
				ext: 'mpc',
				mime: 'audio/x-musepack',
			};
		}

		if (
			(this.buffer[0] === 0x43 || this.buffer[0] === 0x46)
			&& this.check([0x57, 0x53], {offset: 1})
		) {
			return {
				ext: 'swf',
				mime: 'application/x-shockwave-flash',
			};
		}

		// -- 4-byte signatures --

		// Requires a sample size of 4 bytes
		if (this.check([0xFF, 0xD8, 0xFF])) {
			if (this.check([0xF7], {offset: 3})) { // JPG7/SOF55, indicating a ISO/IEC 14495 / JPEG-LS file
				return {
					ext: 'jls',
					mime: 'image/jls',
				};
			}

			return {
				ext: 'jpg',
				mime: 'image/jpeg',
			};
		}

		if (this.check([0x4F, 0x62, 0x6A, 0x01])) {
			return {
				ext: 'avro',
				mime: 'application/avro',
			};
		}

		if (this.checkString('FLIF')) {
			return {
				ext: 'flif',
				mime: 'image/flif',
			};
		}

		if (this.checkString('8BPS')) {
			return {
				ext: 'psd',
				mime: 'image/vnd.adobe.photoshop',
			};
		}

		// Musepack, SV8
		if (this.checkString('MPCK')) {
			return {
				ext: 'mpc',
				mime: 'audio/x-musepack',
			};
		}

		if (this.checkString('FORM')) {
			return {
				ext: 'aif',
				mime: 'audio/aiff',
			};
		}

		if (this.checkString('icns', {offset: 0})) {
			return {
				ext: 'icns',
				mime: 'image/icns',
			};
		}

		// Zip-based file formats
		// Need to be before the `zip` check
		if (this.check([0x50, 0x4B, 0x3, 0x4])) { // Local file header signature
			let fileType;
			const openXmlState = createOpenXmlZipDetectionState();

			try {
				await new ZipHandler(tokenizer).unzip(zipHeader => {
					updateOpenXmlZipDetectionStateFromFilename(openXmlState, zipHeader.filename);

					const isOpenXmlContentTypesEntry = zipHeader.filename === '[Content_Types].xml';
					const openXmlFileTypeFromEntries = getOpenXmlFileTypeFromZipEntries(openXmlState);
					if (
						!isOpenXmlContentTypesEntry
						&& openXmlFileTypeFromEntries
					) {
						fileType = openXmlFileTypeFromEntries;
						return {
							stop: true,
						};
					}

					switch (zipHeader.filename) {
						case 'META-INF/mozilla.rsa':
							fileType = {
								ext: 'xpi',
								mime: 'application/x-xpinstall',
							};
							return {
								stop: true,
							};
						case 'META-INF/MANIFEST.MF':
							fileType = {
								ext: 'jar',
								mime: 'application/java-archive',
							};
							return {
								stop: true,
							};
						case 'mimetype':
							if (!canReadZipEntryForDetection(zipHeader, maximumZipTextEntrySizeInBytes)) {
								return {};
							}

							return {
								async handler(fileData) {
									// Use TextDecoder to decode the UTF-8 encoded data
									const mimeType = new TextDecoder('utf-8').decode(fileData).trim();
									fileType = getFileTypeFromMimeType(mimeType);
								},
								stop: true,
							};

						case '[Content_Types].xml': {
							openXmlState.hasContentTypesEntry = true;

							if (!canReadZipEntryForDetection(zipHeader, maximumZipTextEntrySizeInBytes)) {
								openXmlState.hasUnparseableContentTypes = true;
								return {};
							}

							openXmlState.isParsingContentTypes = true;
							return {
								async handler(fileData) {
									// Use TextDecoder to decode the UTF-8 encoded data
									const xmlContent = new TextDecoder('utf-8').decode(fileData);
									const mimeType = getOpenXmlMimeTypeFromContentTypesXml(xmlContent);
									if (mimeType) {
										fileType = getFileTypeFromMimeType(mimeType);
									}

									openXmlState.hasParsedContentTypesEntry = true;
									openXmlState.isParsingContentTypes = false;
								},
								stop: true,
							};
						}

						default:
							if (/classes\d*\.dex/.test(zipHeader.filename)) {
								fileType = {
									ext: 'apk',
									mime: 'application/vnd.android.package-archive',
								};
								return {stop: true};
							}

							return {};
					}
				});
			} catch (error) {
				if (!isRecoverableZipError(error)) {
					throw error;
				}

				if (openXmlState.isParsingContentTypes) {
					openXmlState.isParsingContentTypes = false;
					openXmlState.hasUnparseableContentTypes = true;
				}
			}

			return fileType ?? getOpenXmlFileTypeFromZipEntries(openXmlState) ?? {
				ext: 'zip',
				mime: 'application/zip',
			};
		}

		if (this.checkString('OggS')) {
			// This is an OGG container
			await tokenizer.ignore(28);
			const type = new Uint8Array(8);
			await tokenizer.readBuffer(type);

			// Needs to be before `ogg` check
			if (_check(type, [0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64])) {
				return {
					ext: 'opus',
					mime: 'audio/ogg; codecs=opus',
				};
			}

			// If ' theora' in header.
			if (_check(type, [0x80, 0x74, 0x68, 0x65, 0x6F, 0x72, 0x61])) {
				return {
					ext: 'ogv',
					mime: 'video/ogg',
				};
			}

			// If '\x01video' in header.
			if (_check(type, [0x01, 0x76, 0x69, 0x64, 0x65, 0x6F, 0x00])) {
				return {
					ext: 'ogm',
					mime: 'video/ogg',
				};
			}

			// If ' FLAC' in header  https://xiph.org/flac/faq.html
			if (_check(type, [0x7F, 0x46, 0x4C, 0x41, 0x43])) {
				return {
					ext: 'oga',
					mime: 'audio/ogg',
				};
			}

			// 'Speex  ' in header https://en.wikipedia.org/wiki/Speex
			if (_check(type, [0x53, 0x70, 0x65, 0x65, 0x78, 0x20, 0x20])) {
				return {
					ext: 'spx',
					mime: 'audio/ogg',
				};
			}

			// If '\x01vorbis' in header
			if (_check(type, [0x01, 0x76, 0x6F, 0x72, 0x62, 0x69, 0x73])) {
				return {
					ext: 'ogg',
					mime: 'audio/ogg',
				};
			}

			// Default OGG container https://www.iana.org/assignments/media-types/application/ogg
			return {
				ext: 'ogx',
				mime: 'application/ogg',
			};
		}

		if (
			this.check([0x50, 0x4B])
			&& (this.buffer[2] === 0x3 || this.buffer[2] === 0x5 || this.buffer[2] === 0x7)
			&& (this.buffer[3] === 0x4 || this.buffer[3] === 0x6 || this.buffer[3] === 0x8)
		) {
			return {
				ext: 'zip',
				mime: 'application/zip',
			};
		}

		if (this.checkString('MThd')) {
			return {
				ext: 'mid',
				mime: 'audio/midi',
			};
		}

		if (
			this.checkString('wOFF')
			&& (
				this.check([0x00, 0x01, 0x00, 0x00], {offset: 4})
				|| this.checkString('OTTO', {offset: 4})
			)
		) {
			return {
				ext: 'woff',
				mime: 'font/woff',
			};
		}

		if (
			this.checkString('wOF2')
			&& (
				this.check([0x00, 0x01, 0x00, 0x00], {offset: 4})
				|| this.checkString('OTTO', {offset: 4})
			)
		) {
			return {
				ext: 'woff2',
				mime: 'font/woff2',
			};
		}

		if (this.check([0xD4, 0xC3, 0xB2, 0xA1]) || this.check([0xA1, 0xB2, 0xC3, 0xD4])) {
			return {
				ext: 'pcap',
				mime: 'application/vnd.tcpdump.pcap',
			};
		}

		// Sony DSD Stream File (DSF)
		if (this.checkString('DSD ')) {
			return {
				ext: 'dsf',
				mime: 'audio/x-dsf', // Non-standard
			};
		}

		if (this.checkString('LZIP')) {
			return {
				ext: 'lz',
				mime: 'application/x-lzip',
			};
		}

		if (this.checkString('fLaC')) {
			return {
				ext: 'flac',
				mime: 'audio/flac',
			};
		}

		if (this.check([0x42, 0x50, 0x47, 0xFB])) {
			return {
				ext: 'bpg',
				mime: 'image/bpg',
			};
		}

		if (this.checkString('wvpk')) {
			return {
				ext: 'wv',
				mime: 'audio/wavpack',
			};
		}

		if (this.checkString('%PDF')) {
			// Assume this is just a normal PDF
			return {
				ext: 'pdf',
				mime: 'application/pdf',
			};
		}

		if (this.check([0x00, 0x61, 0x73, 0x6D])) {
			return {
				ext: 'wasm',
				mime: 'application/wasm',
			};
		}

		// TIFF, little-endian type
		if (this.check([0x49, 0x49])) {
			const fileType = await this.readTiffHeader(false);
			if (fileType) {
				return fileType;
			}
		}

		// TIFF, big-endian type
		if (this.check([0x4D, 0x4D])) {
			const fileType = await this.readTiffHeader(true);
			if (fileType) {
				return fileType;
			}
		}

		if (this.checkString('MAC ')) {
			return {
				ext: 'ape',
				mime: 'audio/ape',
			};
		}

		// https://github.com/file/file/blob/master/magic/Magdir/matroska
		if (this.check([0x1A, 0x45, 0xDF, 0xA3])) { // Root element: EBML
			async function readField() {
				const msb = await tokenizer.peekNumber(Token.UINT8);
				let mask = 0x80;
				let ic = 0; // 0 = A, 1 = B, 2 = C, 3 = D

				while ((msb & mask) === 0 && mask !== 0) {
					++ic;
					mask >>= 1;
				}

				const id = new Uint8Array(ic + 1);
				await safeReadBuffer(tokenizer, id, undefined, {
					maximumLength: id.length,
					reason: 'EBML field',
				});
				return id;
			}

			async function readElement() {
				const idField = await readField();
				const lengthField = await readField();

				lengthField[0] ^= 0x80 >> (lengthField.length - 1);
				const nrLength = Math.min(6, lengthField.length); // JavaScript can max read 6 bytes integer

				const idView = new DataView(idField.buffer);
				const lengthView = new DataView(lengthField.buffer, lengthField.length - nrLength, nrLength);

				return {
					id: getUintBE(idView),
					len: getUintBE(lengthView),
				};
			}

			async function readChildren(children) {
				let ebmlElementCount = 0;
				while (children > 0) {
					ebmlElementCount++;
					if (ebmlElementCount > maximumEbmlElementCount) {
						return;
					}

					if (hasExceededUnknownSizeScanBudget(tokenizer, ebmlScanStart, maximumUntrustedSkipSizeInBytes)) {
						return;
					}

					const previousPosition = tokenizer.position;
					const element = await readElement();

					if (element.id === 0x42_82) {
						// `DocType` is a short string ("webm", "matroska", ...), reject implausible lengths to avoid large allocations.
						if (element.len > maximumEbmlDocumentTypeSizeInBytes) {
							return;
						}

						const documentTypeLength = getSafeBound(element.len, maximumEbmlDocumentTypeSizeInBytes, 'EBML DocType');
						const rawValue = await tokenizer.readToken(new Token.StringType(documentTypeLength));
						return rawValue.replaceAll(/\00.*$/g, ''); // Return DocType
					}

					if (
						hasUnknownFileSize(tokenizer)
						&& (
							!Number.isFinite(element.len)
							|| element.len < 0
							|| element.len > maximumEbmlElementPayloadSizeInBytes
						)
					) {
						return;
					}

					await safeIgnore(tokenizer, element.len, {
						maximumLength: hasUnknownFileSize(tokenizer) ? maximumEbmlElementPayloadSizeInBytes : tokenizer.fileInfo.size,
						reason: 'EBML payload',
					}); // ignore payload
					--children;

					// Safeguard against malformed files: bail if the position did not advance.
					if (tokenizer.position <= previousPosition) {
						return;
					}
				}
			}

			const rootElement = await readElement();
			const ebmlScanStart = tokenizer.position;
			const documentType = await readChildren(rootElement.len);

			switch (documentType) {
				case 'webm':
					return {
						ext: 'webm',
						mime: 'video/webm',
					};

				case 'matroska':
					return {
						ext: 'mkv',
						mime: 'video/matroska',
					};

				default:
					return;
			}
		}

		if (this.checkString('SQLi')) {
			return {
				ext: 'sqlite',
				mime: 'application/x-sqlite3',
			};
		}

		if (this.check([0x4E, 0x45, 0x53, 0x1A])) {
			return {
				ext: 'nes',
				mime: 'application/x-nintendo-nes-rom',
			};
		}

		if (this.checkString('Cr24')) {
			return {
				ext: 'crx',
				mime: 'application/x-google-chrome-extension',
			};
		}

		if (
			this.checkString('MSCF')
			|| this.checkString('ISc(')
		) {
			return {
				ext: 'cab',
				mime: 'application/vnd.ms-cab-compressed',
			};
		}

		if (this.check([0xED, 0xAB, 0xEE, 0xDB])) {
			return {
				ext: 'rpm',
				mime: 'application/x-rpm',
			};
		}

		if (this.check([0xC5, 0xD0, 0xD3, 0xC6])) {
			return {
				ext: 'eps',
				mime: 'application/eps',
			};
		}

		if (this.check([0x28, 0xB5, 0x2F, 0xFD])) {
			return {
				ext: 'zst',
				mime: 'application/zstd',
			};
		}

		if (this.check([0x7F, 0x45, 0x4C, 0x46])) {
			return {
				ext: 'elf',
				mime: 'application/x-elf',
			};
		}

		if (this.check([0x21, 0x42, 0x44, 0x4E])) {
			return {
				ext: 'pst',
				mime: 'application/vnd.ms-outlook',
			};
		}

		if (this.checkString('PAR1') || this.checkString('PARE')) {
			return {
				ext: 'parquet',
				mime: 'application/vnd.apache.parquet',
			};
		}

		if (this.checkString('ttcf')) {
			return {
				ext: 'ttc',
				mime: 'font/collection',
			};
		}

		if (
			this.check([0xFE, 0xED, 0xFA, 0xCE]) // 32-bit, big-endian
			|| this.check([0xFE, 0xED, 0xFA, 0xCF]) // 64-bit, big-endian
			|| this.check([0xCE, 0xFA, 0xED, 0xFE]) // 32-bit, little-endian
			|| this.check([0xCF, 0xFA, 0xED, 0xFE]) // 64-bit, little-endian
		) {
			return {
				ext: 'macho',
				mime: 'application/x-mach-binary',
			};
		}

		if (this.check([0x04, 0x22, 0x4D, 0x18])) {
			return {
				ext: 'lz4',
				mime: 'application/x-lz4', // Invented by us
			};
		}

		if (this.checkString('regf')) {
			return {
				ext: 'dat',
				mime: 'application/x-ft-windows-registry-hive',
			};
		}

		// SPSS Statistical Data File
		if (this.checkString('$FL2') || this.checkString('$FL3')) {
			return {
				ext: 'sav',
				mime: 'application/x-spss-sav',
			};
		}

		// -- 5-byte signatures --

		if (this.check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
			return {
				ext: 'otf',
				mime: 'font/otf',
			};
		}

		if (this.checkString('#!AMR')) {
			return {
				ext: 'amr',
				mime: 'audio/amr',
			};
		}

		if (this.checkString('{\\rtf')) {
			return {
				ext: 'rtf',
				mime: 'application/rtf',
			};
		}

		if (this.check([0x46, 0x4C, 0x56, 0x01])) {
			return {
				ext: 'flv',
				mime: 'video/x-flv',
			};
		}

		if (this.checkString('IMPM')) {
			return {
				ext: 'it',
				mime: 'audio/x-it',
			};
		}

		if (
			this.checkString('-lh0-', {offset: 2})
			|| this.checkString('-lh1-', {offset: 2})
			|| this.checkString('-lh2-', {offset: 2})
			|| this.checkString('-lh3-', {offset: 2})
			|| this.checkString('-lh4-', {offset: 2})
			|| this.checkString('-lh5-', {offset: 2})
			|| this.checkString('-lh6-', {offset: 2})
			|| this.checkString('-lh7-', {offset: 2})
			|| this.checkString('-lzs-', {offset: 2})
			|| this.checkString('-lz4-', {offset: 2})
			|| this.checkString('-lz5-', {offset: 2})
			|| this.checkString('-lhd-', {offset: 2})
		) {
			return {
				ext: 'lzh',
				mime: 'application/x-lzh-compressed',
			};
		}

		// MPEG program stream (PS or MPEG-PS)
		if (this.check([0x00, 0x00, 0x01, 0xBA])) {
			//  MPEG-PS, MPEG-1 Part 1
			if (this.check([0x21], {offset: 4, mask: [0xF1]})) {
				return {
					ext: 'mpg', // May also be .ps, .mpeg
					mime: 'video/MP1S',
				};
			}

			// MPEG-PS, MPEG-2 Part 1
			if (this.check([0x44], {offset: 4, mask: [0xC4]})) {
				return {
					ext: 'mpg', // May also be .mpg, .m2p, .vob or .sub
					mime: 'video/MP2P',
				};
			}
		}

		if (this.checkString('ITSF')) {
			return {
				ext: 'chm',
				mime: 'application/vnd.ms-htmlhelp',
			};
		}

		if (this.check([0xCA, 0xFE, 0xBA, 0xBE])) {
			// Java bytecode and Mach-O universal binaries have the same magic number.
			// We disambiguate based on the next 4 bytes, as done by `file`.
			// See https://github.com/file/file/blob/master/magic/Magdir/cafebabe
			const machOArchitectureCount = Token.UINT32_BE.get(this.buffer, 4);
			const javaClassFileMajorVersion = Token.UINT16_BE.get(this.buffer, 6);

			if (machOArchitectureCount > 0 && machOArchitectureCount <= 30) {
				return {
					ext: 'macho',
					mime: 'application/x-mach-binary',
				};
			}

			if (javaClassFileMajorVersion > 30) {
				return {
					ext: 'class',
					mime: 'application/java-vm',
				};
			}
		}

		if (this.checkString('.RMF')) {
			return {
				ext: 'rm',
				mime: 'application/vnd.rn-realmedia',
			};
		}

		// -- 5-byte signatures --

		if (this.checkString('DRACO')) {
			return {
				ext: 'drc',
				mime: 'application/vnd.google.draco', // Invented by us
			};
		}

		// -- 6-byte signatures --

		if (this.check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
			return {
				ext: 'xz',
				mime: 'application/x-xz',
			};
		}

		if (this.checkString('<?xml ')) {
			return {
				ext: 'xml',
				mime: 'application/xml',
			};
		}

		if (this.check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
			return {
				ext: '7z',
				mime: 'application/x-7z-compressed',
			};
		}

		if (
			this.check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7])
			&& (this.buffer[6] === 0x0 || this.buffer[6] === 0x1)
		) {
			return {
				ext: 'rar',
				mime: 'application/x-rar-compressed',
			};
		}

		if (this.checkString('solid ')) {
			return {
				ext: 'stl',
				mime: 'model/stl',
			};
		}

		if (this.checkString('AC')) {
			const version = new Token.StringType(4, 'latin1').get(this.buffer, 2);
			if (version.match('^d*') && version >= 1000 && version <= 1050) {
				return {
					ext: 'dwg',
					mime: 'image/vnd.dwg',
				};
			}
		}

		if (this.checkString('070707')) {
			return {
				ext: 'cpio',
				mime: 'application/x-cpio',
			};
		}

		// -- 7-byte signatures --

		if (this.checkString('BLENDER')) {
			return {
				ext: 'blend',
				mime: 'application/x-blender',
			};
		}

		if (this.checkString('!<arch>')) {
			await tokenizer.ignore(8);
			const string = await tokenizer.readToken(new Token.StringType(13, 'ascii'));
			if (string === 'debian-binary') {
				return {
					ext: 'deb',
					mime: 'application/x-deb',
				};
			}

			return {
				ext: 'ar',
				mime: 'application/x-unix-archive',
			};
		}

		if (
			this.checkString('WEBVTT')
			&&	(
				// One of LF, CR, tab, space, or end of file must follow "WEBVTT" per the spec (see `fixture/fixture-vtt-*.vtt` for examples). Note that `\0` is technically the null character (there is no such thing as an EOF character). However, checking for `\0` gives us the same result as checking for the end of the stream.
				(['\n', '\r', '\t', ' ', '\0'].some(char7 => this.checkString(char7, {offset: 6}))))
		) {
			return {
				ext: 'vtt',
				mime: 'text/vtt',
			};
		}

		// -- 8-byte signatures --

		if (this.check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
			const pngFileType = {
				ext: 'png',
				mime: 'image/png',
			};

			const apngFileType = {
				ext: 'apng',
				mime: 'image/apng',
			};

			// APNG format (https://wiki.mozilla.org/APNG_Specification)
			// 1. Find the first IDAT (image data) chunk (49 44 41 54)
			// 2. Check if there is an "acTL" chunk before the IDAT one (61 63 54 4C)

			// Offset calculated as follows:
			// - 8 bytes: PNG signature
			// - 4 (length) + 4 (chunk type) + 13 (chunk data) + 4 (CRC): IHDR chunk

			await tokenizer.ignore(8); // ignore PNG signature

			async function readChunkHeader() {
				return {
					length: await tokenizer.readToken(Token.INT32_BE),
					type: await tokenizer.readToken(new Token.StringType(4, 'latin1')),
				};
			}

			const isUnknownPngStream = hasUnknownFileSize(tokenizer);
			const pngScanStart = tokenizer.position;
			let pngChunkCount = 0;
			let hasSeenImageHeader = false;
			do {
				pngChunkCount++;
				if (pngChunkCount > maximumPngChunkCount) {
					break;
				}

				if (hasExceededUnknownSizeScanBudget(tokenizer, pngScanStart, maximumPngStreamScanBudgetInBytes)) {
					break;
				}

				const previousPosition = tokenizer.position;
				const chunk = await readChunkHeader();
				if (chunk.length < 0) {
					return; // Invalid chunk length
				}

				if (chunk.type === 'IHDR') {
					// PNG requires the first real image header to be a 13-byte IHDR chunk.
					if (chunk.length !== 13) {
						return;
					}

					hasSeenImageHeader = true;
				}

				switch (chunk.type) {
					case 'IDAT':
						return pngFileType;
					case 'acTL':
						return apngFileType;
					default:
						if (
							!hasSeenImageHeader
							&& chunk.type !== 'CgBI'
						) {
							return;
						}

						if (
							isUnknownPngStream
								&& chunk.length > maximumPngChunkSizeInBytes
						) {
							// Avoid huge attacker-controlled skips when probing unknown-size streams.
							return hasSeenImageHeader && isPngAncillaryChunk(chunk.type) ? pngFileType : undefined;
						}

						try {
							await safeIgnore(tokenizer, chunk.length + 4, {
								maximumLength: isUnknownPngStream ? maximumPngChunkSizeInBytes + 4 : tokenizer.fileInfo.size,
								reason: 'PNG chunk payload',
							}); // Ignore chunk-data + CRC
						} catch (error) {
							if (
								!isUnknownPngStream
									&& (
										error instanceof ParserHardLimitError
										|| error instanceof strtok3.EndOfStreamError
									)
							) {
								return pngFileType;
							}

							throw error;
						}
				}

				// Safeguard against malformed files: bail if the position did not advance.
				if (tokenizer.position <= previousPosition) {
					break;
				}
			} while (tokenizer.position + 8 < tokenizer.fileInfo.size);

			return pngFileType;
		}

		if (this.check([0x41, 0x52, 0x52, 0x4F, 0x57, 0x31, 0x00, 0x00])) {
			return {
				ext: 'arrow',
				mime: 'application/vnd.apache.arrow.file',
			};
		}

		if (this.check([0x67, 0x6C, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00])) {
			return {
				ext: 'glb',
				mime: 'model/gltf-binary',
			};
		}

		// `mov` format variants
		if (
			this.check([0x66, 0x72, 0x65, 0x65], {offset: 4}) // `free`
			|| this.check([0x6D, 0x64, 0x61, 0x74], {offset: 4}) // `mdat` MJPEG
			|| this.check([0x6D, 0x6F, 0x6F, 0x76], {offset: 4}) // `moov`
			|| this.check([0x77, 0x69, 0x64, 0x65], {offset: 4}) // `wide`
		) {
			return {
				ext: 'mov',
				mime: 'video/quicktime',
			};
		}

		// -- 9-byte signatures --

		if (this.check([0x49, 0x49, 0x52, 0x4F, 0x08, 0x00, 0x00, 0x00, 0x18])) {
			return {
				ext: 'orf',
				mime: 'image/x-olympus-orf',
			};
		}

		if (this.checkString('gimp xcf ')) {
			return {
				ext: 'xcf',
				mime: 'image/x-xcf',
			};
		}

		// File Type Box (https://en.wikipedia.org/wiki/ISO_base_media_file_format)
		// It's not required to be first, but it's recommended to be. Almost all ISO base media files start with `ftyp` box.
		// `ftyp` box must contain a brand major identifier, which must consist of ISO 8859-1 printable characters.
		// Here we check for 8859-1 printable characters (for simplicity, it's a mask which also catches one non-printable character).
		if (
			this.checkString('ftyp', {offset: 4})
			&& (this.buffer[8] & 0x60) !== 0x00 // Brand major, first character ASCII?
		) {
			// They all can have MIME `video/mp4` except `application/mp4` special-case which is hard to detect.
			// For some cases, we're specific, everything else falls to `video/mp4` with `mp4` extension.
			const brandMajor = new Token.StringType(4, 'latin1').get(this.buffer, 8).replace('\0', ' ').trim();
			switch (brandMajor) {
				case 'avif':
				case 'avis':
					return {ext: 'avif', mime: 'image/avif'};
				case 'mif1':
					return {ext: 'heic', mime: 'image/heif'};
				case 'msf1':
					return {ext: 'heic', mime: 'image/heif-sequence'};
				case 'heic':
				case 'heix':
					return {ext: 'heic', mime: 'image/heic'};
				case 'hevc':
				case 'hevx':
					return {ext: 'heic', mime: 'image/heic-sequence'};
				case 'qt':
					return {ext: 'mov', mime: 'video/quicktime'};
				case 'M4V':
				case 'M4VH':
				case 'M4VP':
					return {ext: 'm4v', mime: 'video/x-m4v'};
				case 'M4P':
					return {ext: 'm4p', mime: 'video/mp4'};
				case 'M4B':
					return {ext: 'm4b', mime: 'audio/mp4'};
				case 'M4A':
					return {ext: 'm4a', mime: 'audio/x-m4a'};
				case 'F4V':
					return {ext: 'f4v', mime: 'video/mp4'};
				case 'F4P':
					return {ext: 'f4p', mime: 'video/mp4'};
				case 'F4A':
					return {ext: 'f4a', mime: 'audio/mp4'};
				case 'F4B':
					return {ext: 'f4b', mime: 'audio/mp4'};
				case 'crx':
					return {ext: 'cr3', mime: 'image/x-canon-cr3'};
				default:
					if (brandMajor.startsWith('3g')) {
						if (brandMajor.startsWith('3g2')) {
							return {ext: '3g2', mime: 'video/3gpp2'};
						}

						return {ext: '3gp', mime: 'video/3gpp'};
					}

					return {ext: 'mp4', mime: 'video/mp4'};
			}
		}

		// -- 10-byte signatures --

		if (this.checkString('REGEDIT4\r\n')) {
			return {
				ext: 'reg',
				mime: 'application/x-ms-regedit',
			};
		}

		// -- 12-byte signatures --

		// RIFF file format which might be AVI, WAV, QCP, etc
		if (this.check([0x52, 0x49, 0x46, 0x46])) {
			if (this.checkString('WEBP', {offset: 8})) {
				return {
					ext: 'webp',
					mime: 'image/webp',
				};
			}

			if (this.check([0x41, 0x56, 0x49], {offset: 8})) {
				return {
					ext: 'avi',
					mime: 'video/vnd.avi',
				};
			}

			if (this.check([0x57, 0x41, 0x56, 0x45], {offset: 8})) {
				return {
					ext: 'wav',
					mime: 'audio/wav',
				};
			}

			// QLCM, QCP file
			if (this.check([0x51, 0x4C, 0x43, 0x4D], {offset: 8})) {
				return {
					ext: 'qcp',
					mime: 'audio/qcelp',
				};
			}
		}

		if (this.check([0x49, 0x49, 0x55, 0x00, 0x18, 0x00, 0x00, 0x00, 0x88, 0xE7, 0x74, 0xD8])) {
			return {
				ext: 'rw2',
				mime: 'image/x-panasonic-rw2',
			};
		}

		// ASF_Header_Object first 80 bytes
		if (this.check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
			let isMalformedAsf = false;
			try {
				async function readHeader() {
					const guid = new Uint8Array(16);
					await safeReadBuffer(tokenizer, guid, undefined, {
						maximumLength: guid.length,
						reason: 'ASF header GUID',
					});
					return {
						id: guid,
						size: Number(await tokenizer.readToken(Token.UINT64_LE)),
					};
				}

				await safeIgnore(tokenizer, 30, {
					maximumLength: 30,
					reason: 'ASF header prelude',
				});
				const isUnknownFileSize = hasUnknownFileSize(tokenizer);
				const asfHeaderScanStart = tokenizer.position;
				let asfHeaderObjectCount = 0;
				while (tokenizer.position + 24 < tokenizer.fileInfo.size) {
					asfHeaderObjectCount++;
					if (asfHeaderObjectCount > maximumAsfHeaderObjectCount) {
						break;
					}

					if (hasExceededUnknownSizeScanBudget(tokenizer, asfHeaderScanStart, maximumUntrustedSkipSizeInBytes)) {
						break;
					}

					const previousPosition = tokenizer.position;
					const header = await readHeader();
					let payload = header.size - 24;
					if (
						!Number.isFinite(payload)
						|| payload < 0
					) {
						isMalformedAsf = true;
						break;
					}

					if (_check(header.id, [0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65])) {
						// Sync on Stream-Properties-Object (B7DC0791-A9B7-11CF-8EE6-00C00C205365)
						const typeId = new Uint8Array(16);
						payload -= await safeReadBuffer(tokenizer, typeId, undefined, {
							maximumLength: typeId.length,
							reason: 'ASF stream type GUID',
						});

						if (_check(typeId, [0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B])) {
							// Found audio:
							return {
								ext: 'asf',
								mime: 'audio/x-ms-asf',
							};
						}

						if (_check(typeId, [0xC0, 0xEF, 0x19, 0xBC, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B])) {
							// Found video:
							return {
								ext: 'asf',
								mime: 'video/x-ms-asf',
							};
						}

						break;
					}

					if (
						isUnknownFileSize
						&& payload > maximumAsfHeaderPayloadSizeInBytes
					) {
						isMalformedAsf = true;
						break;
					}

					await safeIgnore(tokenizer, payload, {
						maximumLength: isUnknownFileSize ? maximumAsfHeaderPayloadSizeInBytes : tokenizer.fileInfo.size,
						reason: 'ASF header payload',
					});

					// Safeguard against malformed files: break if the position did not advance.
					if (tokenizer.position <= previousPosition) {
						isMalformedAsf = true;
						break;
					}
				}
			} catch (error) {
				if (
					error instanceof strtok3.EndOfStreamError
					|| error instanceof ParserHardLimitError
				) {
					if (hasUnknownFileSize(tokenizer)) {
						isMalformedAsf = true;
					}
				} else {
					throw error;
				}
			}

			if (isMalformedAsf) {
				return;
			}

			// Default to ASF generic extension
			return {
				ext: 'asf',
				mime: 'application/vnd.ms-asf',
			};
		}

		if (this.check([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A])) {
			return {
				ext: 'ktx',
				mime: 'image/ktx',
			};
		}

		if ((this.check([0x7E, 0x10, 0x04]) || this.check([0x7E, 0x18, 0x04])) && this.check([0x30, 0x4D, 0x49, 0x45], {offset: 4})) {
			return {
				ext: 'mie',
				mime: 'application/x-mie',
			};
		}

		if (this.check([0x27, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], {offset: 2})) {
			return {
				ext: 'shp',
				mime: 'application/x-esri-shape',
			};
		}

		if (this.check([0xFF, 0x4F, 0xFF, 0x51])) {
			return {
				ext: 'j2c',
				mime: 'image/j2c',
			};
		}

		if (this.check([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20, 0x0D, 0x0A, 0x87, 0x0A])) {
			// JPEG-2000 family

			await tokenizer.ignore(20);
			const type = await tokenizer.readToken(new Token.StringType(4, 'ascii'));
			switch (type) {
				case 'jp2 ':
					return {
						ext: 'jp2',
						mime: 'image/jp2',
					};
				case 'jpx ':
					return {
						ext: 'jpx',
						mime: 'image/jpx',
					};
				case 'jpm ':
					return {
						ext: 'jpm',
						mime: 'image/jpm',
					};
				case 'mjp2':
					return {
						ext: 'mj2',
						mime: 'image/mj2',
					};
				default:
					return;
			}
		}

		if (
			this.check([0xFF, 0x0A])
			|| this.check([0x00, 0x00, 0x00, 0x0C, 0x4A, 0x58, 0x4C, 0x20, 0x0D, 0x0A, 0x87, 0x0A])
		) {
			return {
				ext: 'jxl',
				mime: 'image/jxl',
			};
		}

		if (this.check([0xFE, 0xFF])) { // UTF-16-BOM-BE
			if (this.checkString('<?xml ', {offset: 2, encoding: 'utf-16be'})) {
				return {
					ext: 'xml',
					mime: 'application/xml',
				};
			}

			return undefined; // Some unknown text based format
		}

		if (this.check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
			// Detected Microsoft Compound File Binary File (MS-CFB) Format.
			return {
				ext: 'cfb',
				mime: 'application/x-cfb',
			};
		}

		// Increase sample size from 32 to 256.
		await tokenizer.peekBuffer(this.buffer, {length: Math.min(256, tokenizer.fileInfo.size), mayBeLess: true});

		if (this.check([0x61, 0x63, 0x73, 0x70], {offset: 36})) {
			return {
				ext: 'icc',
				mime: 'application/vnd.iccprofile',
			};
		}

		// ACE: requires 14 bytes in the buffer
		if (this.checkString('**ACE', {offset: 7}) && this.checkString('**', {offset: 12})) {
			return {
				ext: 'ace',
				mime: 'application/x-ace-compressed',
			};
		}

		// -- 15-byte signatures --

		if (this.checkString('BEGIN:')) {
			if (this.checkString('VCARD', {offset: 6})) {
				return {
					ext: 'vcf',
					mime: 'text/vcard',
				};
			}

			if (this.checkString('VCALENDAR', {offset: 6})) {
				return {
					ext: 'ics',
					mime: 'text/calendar',
				};
			}
		}

		// `raf` is here just to keep all the raw image detectors together.
		if (this.checkString('FUJIFILMCCD-RAW')) {
			return {
				ext: 'raf',
				mime: 'image/x-fujifilm-raf',
			};
		}

		if (this.checkString('Extended Module:')) {
			return {
				ext: 'xm',
				mime: 'audio/x-xm',
			};
		}

		if (this.checkString('Creative Voice File')) {
			return {
				ext: 'voc',
				mime: 'audio/x-voc',
			};
		}

		if (this.check([0x04, 0x00, 0x00, 0x00]) && this.buffer.length >= 16) { // Rough & quick check Pickle/ASAR
			const jsonSize = new DataView(this.buffer.buffer).getUint32(12, true);

			if (jsonSize > 12 && this.buffer.length >= jsonSize + 16) {
				try {
					const header = new TextDecoder().decode(this.buffer.subarray(16, jsonSize + 16));
					const json = JSON.parse(header);
					// Check if Pickle is ASAR
					if (json.files) { // Final check, assuring Pickle/ASAR format
						return {
							ext: 'asar',
							mime: 'application/x-asar',
						};
					}
				} catch {}
			}
		}

		if (this.check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
			return {
				ext: 'mxf',
				mime: 'application/mxf',
			};
		}

		if (this.checkString('SCRM', {offset: 44})) {
			return {
				ext: 's3m',
				mime: 'audio/x-s3m',
			};
		}

		// Raw MPEG-2 transport stream (188-byte packets)
		if (this.check([0x47]) && this.check([0x47], {offset: 188})) {
			return {
				ext: 'mts',
				mime: 'video/mp2t',
			};
		}

		// Blu-ray Disc Audio-Video (BDAV) MPEG-2 transport stream has 4-byte TP_extra_header before each 188-byte packet
		if (this.check([0x47], {offset: 4}) && this.check([0x47], {offset: 196})) {
			return {
				ext: 'mts',
				mime: 'video/mp2t',
			};
		}

		if (this.check([0x42, 0x4F, 0x4F, 0x4B, 0x4D, 0x4F, 0x42, 0x49], {offset: 60})) {
			return {
				ext: 'mobi',
				mime: 'application/x-mobipocket-ebook',
			};
		}

		if (this.check([0x44, 0x49, 0x43, 0x4D], {offset: 128})) {
			return {
				ext: 'dcm',
				mime: 'application/dicom',
			};
		}

		if (this.check([0x4C, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46])) {
			return {
				ext: 'lnk',
				mime: 'application/x.ms.shortcut', // Invented by us
			};
		}

		if (this.check([0x62, 0x6F, 0x6F, 0x6B, 0x00, 0x00, 0x00, 0x00, 0x6D, 0x61, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x00])) {
			return {
				ext: 'alias',
				mime: 'application/x.apple.alias', // Invented by us
			};
		}

		if (this.checkString('Kaydara FBX Binary  \u0000')) {
			return {
				ext: 'fbx',
				mime: 'application/x.autodesk.fbx', // Invented by us
			};
		}

		if (
			this.check([0x4C, 0x50], {offset: 34})
			&& (
				this.check([0x00, 0x00, 0x01], {offset: 8})
				|| this.check([0x01, 0x00, 0x02], {offset: 8})
				|| this.check([0x02, 0x00, 0x02], {offset: 8})
			)
		) {
			return {
				ext: 'eot',
				mime: 'application/vnd.ms-fontobject',
			};
		}

		if (this.check([0x06, 0x06, 0xED, 0xF5, 0xD8, 0x1D, 0x46, 0xE5, 0xBD, 0x31, 0xEF, 0xE7, 0xFE, 0x74, 0xB7, 0x1D])) {
			return {
				ext: 'indd',
				mime: 'application/x-indesign',
			};
		}

		// -- 16-byte signatures --

		// JMP files - check for both Little Endian and Big Endian signatures
		if (this.check([0xFF, 0xFF, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00])
			|| this.check([0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01, 0x00, 0x01])) {
			return {
				ext: 'jmp',
				mime: 'application/x-jmp-data',
			};
		}

		// Increase sample size from 256 to 512
		await tokenizer.peekBuffer(this.buffer, {length: Math.min(512, tokenizer.fileInfo.size), mayBeLess: true});

		// Requires a buffer size of 512 bytes
		if ((this.checkString('ustar', {offset: 257}) && (this.checkString('\0', {offset: 262}) || this.checkString(' ', {offset: 262})))
			|| (this.check([0, 0, 0, 0, 0, 0], {offset: 257}) && tarHeaderChecksumMatches(this.buffer))) {
			return {
				ext: 'tar',
				mime: 'application/x-tar',
			};
		}

		if (this.check([0xFF, 0xFE])) { // UTF-16-BOM-LE
			const encoding = 'utf-16le';
			if (this.checkString('<?xml ', {offset: 2, encoding})) {
				return {
					ext: 'xml',
					mime: 'application/xml',
				};
			}

			if (this.check([0xFF, 0x0E], {offset: 2}) && this.checkString('SketchUp Model', {offset: 4, encoding})) {
				return {
					ext: 'skp',
					mime: 'application/vnd.sketchup.skp',
				};
			}

			if (this.checkString('Windows Registry Editor Version 5.00\r\n', {offset: 2, encoding})) {
				return {
					ext: 'reg',
					mime: 'application/x-ms-regedit',
				};
			}

			return undefined; // Some text based format
		}

		if (this.checkString('-----BEGIN PGP MESSAGE-----')) {
			return {
				ext: 'pgp',
				mime: 'application/pgp-encrypted',
			};
		}
	};
	// Detections with limited supporting data, resulting in a higher likelihood of false positives
	detectImprecise = async tokenizer => {
		this.buffer = new Uint8Array(reasonableDetectionSizeInBytes);
		const fileSize = getKnownFileSizeOrMaximum(tokenizer.fileInfo.size);

		// Read initial sample size of 8 bytes
		await tokenizer.peekBuffer(this.buffer, {length: Math.min(8, fileSize), mayBeLess: true});

		if (
			this.check([0x0, 0x0, 0x1, 0xBA])
			|| this.check([0x0, 0x0, 0x1, 0xB3])
		) {
			return {
				ext: 'mpg',
				mime: 'video/mpeg',
			};
		}

		if (this.check([0x00, 0x01, 0x00, 0x00, 0x00])) {
			return {
				ext: 'ttf',
				mime: 'font/ttf',
			};
		}

		if (this.check([0x00, 0x00, 0x01, 0x00])) {
			return {
				ext: 'ico',
				mime: 'image/x-icon',
			};
		}

		if (this.check([0x00, 0x00, 0x02, 0x00])) {
			return {
				ext: 'cur',
				mime: 'image/x-icon',
			};
		}

		// Adjust buffer to `mpegOffsetTolerance`
		await tokenizer.peekBuffer(this.buffer, {length: Math.min(2 + this.options.mpegOffsetTolerance, fileSize), mayBeLess: true});

		// Check MPEG 1 or 2 Layer 3 header, or 'layer 0' for ADTS (MPEG sync-word 0xFFE)
		if (this.buffer.length >= (2 + this.options.mpegOffsetTolerance)) {
			for (let depth = 0; depth <= this.options.mpegOffsetTolerance; ++depth) {
				const type = this.scanMpeg(depth);
				if (type) {
					return type;
				}
			}
		}
	};

	async readTiffTag(bigEndian) {
		const tagId = await this.tokenizer.readToken(bigEndian ? Token.UINT16_BE : Token.UINT16_LE);
		await this.tokenizer.ignore(10);
		switch (tagId) {
			case 50_341:
				return {
					ext: 'arw',
					mime: 'image/x-sony-arw',
				};
			case 50_706:
				return {
					ext: 'dng',
					mime: 'image/x-adobe-dng',
				};
			default:
		}
	}

	async readTiffIFD(bigEndian) {
		const numberOfTags = await this.tokenizer.readToken(bigEndian ? Token.UINT16_BE : Token.UINT16_LE);
		if (numberOfTags > maximumTiffTagCount) {
			return;
		}

		if (
			hasUnknownFileSize(this.tokenizer)
			&& (2 + (numberOfTags * 12)) > maximumTiffIfdOffsetInBytes
		) {
			return;
		}

		for (let n = 0; n < numberOfTags; ++n) {
			const fileType = await this.readTiffTag(bigEndian);
			if (fileType) {
				return fileType;
			}
		}
	}

	async readTiffHeader(bigEndian) {
		const tiffFileType = {
			ext: 'tif',
			mime: 'image/tiff',
		};

		const version = (bigEndian ? Token.UINT16_BE : Token.UINT16_LE).get(this.buffer, 2);
		const ifdOffset = (bigEndian ? Token.UINT32_BE : Token.UINT32_LE).get(this.buffer, 4);

		if (version === 42) {
			// TIFF file header
			if (ifdOffset >= 6) {
				if (this.checkString('CR', {offset: 8})) {
					return {
						ext: 'cr2',
						mime: 'image/x-canon-cr2',
					};
				}

				if (ifdOffset >= 8) {
					const someId1 = (bigEndian ? Token.UINT16_BE : Token.UINT16_LE).get(this.buffer, 8);
					const someId2 = (bigEndian ? Token.UINT16_BE : Token.UINT16_LE).get(this.buffer, 10);

					if (
						(someId1 === 0x1C && someId2 === 0xFE)
						|| (someId1 === 0x1F && someId2 === 0x0B)) {
						return {
							ext: 'nef',
							mime: 'image/x-nikon-nef',
						};
					}
				}
			}

			if (
				hasUnknownFileSize(this.tokenizer)
				&& ifdOffset > maximumTiffStreamIfdOffsetInBytes
			) {
				return tiffFileType;
			}

			const maximumTiffOffset = hasUnknownFileSize(this.tokenizer) ? maximumTiffIfdOffsetInBytes : this.tokenizer.fileInfo.size;

			try {
				await safeIgnore(this.tokenizer, ifdOffset, {
					maximumLength: maximumTiffOffset,
					reason: 'TIFF IFD offset',
				});
			} catch (error) {
				if (error instanceof strtok3.EndOfStreamError) {
					return;
				}

				throw error;
			}

			let fileType;
			try {
				fileType = await this.readTiffIFD(bigEndian);
			} catch (error) {
				if (error instanceof strtok3.EndOfStreamError) {
					return;
				}

				throw error;
			}

			return fileType ?? tiffFileType;
		}

		if (version === 43) {	// Big TIFF file header
			return tiffFileType;
		}
	}

	/**
	Scan check MPEG 1 or 2 Layer 3 header, or 'layer 0' for ADTS (MPEG sync-word 0xFFE).

	@param offset - Offset to scan for sync-preamble.
	@returns {{ext: string, mime: string}}
	*/
	scanMpeg(offset) {
		if (this.check([0xFF, 0xE0], {offset, mask: [0xFF, 0xE0]})) {
			if (this.check([0x10], {offset: offset + 1, mask: [0x16]})) {
				// Check for (ADTS) MPEG-2
				if (this.check([0x08], {offset: offset + 1, mask: [0x08]})) {
					return {
						ext: 'aac',
						mime: 'audio/aac',
					};
				}

				// Must be (ADTS) MPEG-4
				return {
					ext: 'aac',
					mime: 'audio/aac',
				};
			}

			// MPEG 1 or 2 Layer 3 header
			// Check for MPEG layer 3
			if (this.check([0x02], {offset: offset + 1, mask: [0x06]})) {
				return {
					ext: 'mp3',
					mime: 'audio/mpeg',
				};
			}

			// Check for MPEG layer 2
			if (this.check([0x04], {offset: offset + 1, mask: [0x06]})) {
				return {
					ext: 'mp2',
					mime: 'audio/mpeg',
				};
			}

			// Check for MPEG layer 1
			if (this.check([0x06], {offset: offset + 1, mask: [0x06]})) {
				return {
					ext: 'mp1',
					mime: 'audio/mpeg',
				};
			}
		}
	}
}

export const supportedExtensions = new Set(extensions);
export const supportedMimeTypes = new Set(mimeTypes);
