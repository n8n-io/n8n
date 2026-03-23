import { createWriteStream, mkdirSync } from 'fs';
import type { FileHandle } from 'fs/promises';
import { open, readFile, readdir, mkdir } from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createInflateRaw } from 'zlib';
import { safeJoinPath } from '@n8n/backend-common';
import * as fflate from 'fflate';

// Reuse the same compression levels as the Compression node
const ALREADY_COMPRESSED = [
	'7z',
	'aifc',
	'bz2',
	'doc',
	'docx',
	'gif',
	'gz',
	'heic',
	'heif',
	'jpg',
	'jpeg',
	'mov',
	'mp3',
	'mp4',
	'pdf',
	'png',
	'ppt',
	'pptx',
	'rar',
	'webm',
	'webp',
	'xls',
	'xlsx',
	'zip',
];

export interface CompressionOptions {
	level?: fflate.ZipOptions['level'];
	exclude?: string[];
	includeHidden?: boolean;
}

export interface DecompressionOptions {
	overwrite?: boolean;
	exclude?: string[];
}

/**
 * Sanitize file path to prevent zip slip attacks
 * Ensures the resolved path stays within the output directory
 */
function sanitizePath(fileName: string, outputDir: string): string {
	// Normalize the path and resolve any relative path components
	const normalizedPath = path.normalize(fileName);

	// Join with output directory and resolve to get absolute path
	const resolvedPath = path.resolve(outputDir, normalizedPath);
	const resolvedOutputDir = path.resolve(outputDir);

	// Check if the resolved path is within the output directory
	if (
		!resolvedPath.startsWith(resolvedOutputDir + path.sep) &&
		resolvedPath !== resolvedOutputDir
	) {
		throw new Error(
			`Path traversal detected: ${fileName} would be extracted outside the output directory`,
		);
	}

	return resolvedPath;
}

/**
 * Compress a folder into a ZIP archive using streaming
 * Based on fflate documentation: https://github.com/101arrowz/fflate
 */
export async function compressFolder(
	sourceDir: string,
	outputPath: string,
	options: CompressionOptions = {},
): Promise<void> {
	const { level = 6, exclude = [], includeHidden = false } = options;

	// Ensure output directory exists
	const outputDir = path.dirname(outputPath);
	await mkdir(outputDir, { recursive: true });

	// Create write stream for the output ZIP file
	const outputStream = createWriteStream(outputPath);

	// Create streaming ZIP using fflate
	const zip = new fflate.Zip();

	// Handle data from the ZIP stream
	zip.ondata = (error, data, final) => {
		if (error) {
			outputStream.destroy(error);
			return;
		}
		outputStream.write(Buffer.from(data));
		if (final) {
			outputStream.end();
		}
	};

	// Add directory contents to ZIP using streaming
	await addDirectoryToZipStreaming(sourceDir, '', zip, { exclude, includeHidden, level });

	// Finalize the ZIP
	zip.end();

	// Wait for the stream to finish
	return await new Promise<void>((resolve, reject) => {
		outputStream.on('finish', resolve);
		outputStream.on('error', reject);
	});
}

/**
 * Decompress a ZIP archive to a folder.
 *
 * Uses the central directory (at the end of the ZIP) for correct file sizes and
 * offsets — including ZIP64 — rather than local file headers, which may contain
 * zero-size placeholders when the archive was created with a streaming compressor.
 * Each file is streamed through Node's built-in zlib one at a time, keeping memory
 * usage constant regardless of archive size.
 */
export async function decompressFolder(sourcePath: string, outputDir: string): Promise<void> {
	await mkdir(outputDir, { recursive: true });

	// Resolve once so we can skip the source ZIP if it was included in the archive.
	// This happens when the archive is created inside the same directory it compresses,
	// causing a 0-byte self-referential entry that would otherwise truncate the source.
	const absoluteSourcePath = path.resolve(sourcePath);

	const fileHandle = await open(sourcePath, 'r');
	try {
		const { size: fileSize } = await fileHandle.stat();
		const { cdOffset, cdSize } = await readEOCD(fileHandle, fileSize);
		const entries = await readCentralDirectory(fileHandle, cdOffset, cdSize);

		for (const entry of entries) {
			if (entry.name.endsWith('/')) continue;

			const filePath = sanitizePath(entry.name, outputDir);
			if (filePath === absoluteSourcePath) continue;

			mkdirSync(path.dirname(filePath), { recursive: true });

			const dataOffset = await getDataOffset(fileHandle, entry.localHeaderOffset);
			const readStream = Readable.from(
				readFileChunks(fileHandle, Number(dataOffset), Number(entry.compressedSize)),
			);
			const writeStream = createWriteStream(filePath);

			if (entry.compressionMethod === COMPRESSION_DEFLATE) {
				await pipeline(readStream, createInflateRaw(), writeStream);
			} else if (entry.compressionMethod === COMPRESSION_STORED) {
				await pipeline(readStream, writeStream);
			} else {
				throw new Error(`Unsupported ZIP compression method: ${entry.compressionMethod}`);
			}
		}
	} finally {
		await fileHandle.close();
	}
}

/**
 * Add directory contents to zip using streaming approach
 * This version processes files one at a time instead of loading everything into memory
 */
async function addDirectoryToZipStreaming(
	dirPath: string,
	zipPath: string,
	zip: fflate.Zip,
	options: { exclude: string[]; includeHidden: boolean; level: fflate.ZipOptions['level'] },
): Promise<void> {
	const { exclude, includeHidden, level } = options;

	const entries = await readdir(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		// Skip hidden files if not including them
		if (!includeHidden && entry.name.startsWith('.')) {
			continue;
		}

		// Skip excluded files
		if (
			exclude.some((pattern) =>
				pattern.startsWith('*.')
					? entry.name.endsWith(pattern.slice(1))
					: entry.name.includes(pattern),
			)
		) {
			continue;
		}

		const fullPath = safeJoinPath(dirPath, entry.name);
		const zipEntryPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			await addDirectoryToZipStreaming(fullPath, zipEntryPath, zip, options);
		} else {
			// Determine compression level based on file extension
			const fileExtension = path.extname(entry.name).toLowerCase().slice(1);
			const compressionLevel: fflate.ZipOptions['level'] = ALREADY_COMPRESSED.includes(
				fileExtension,
			)
				? 0
				: level;

			// Create a ZIP stream for this specific file
			const zipStream = new fflate.ZipDeflate(zipEntryPath, { level: compressionLevel });
			zip.add(zipStream);

			// Read file content and stream it
			const fileContent = await readFile(fullPath);
			zipStream.push(new Uint8Array(fileContent), true);
		}
	}
}

// ---------------------------------------------------------------------------
// ZIP parsing helpers for decompressFolder
// ---------------------------------------------------------------------------

const EOCD_SIG = 0x06054b50;
const EOCD64_LOCATOR_SIG = 0x07064b50;
const EOCD64_SIG = 0x06064b50;
const CD_ENTRY_SIG = 0x02014b50;
const LOCAL_HEADER_SIG = 0x04034b50;
const ZIP64_EXTRA_ID = 0x0001;

const COMPRESSION_STORED = 0;
const COMPRESSION_DEFLATE = 8;

interface ZipEntry {
	name: string;
	compressionMethod: number;
	compressedSize: bigint;
	localHeaderOffset: bigint;
}

/**
 * Try to read a ZIP64 end-of-central-directory record using the ZIP64 locator
 * immediately preceding the standard EOCD. Returns null if not found.
 */
async function tryReadZip64(
	fileHandle: FileHandle,
	locatorPos: number,
): Promise<{ cdOffset: bigint; cdSize: bigint } | null> {
	if (locatorPos < 0) return null;

	const locBuf = Buffer.allocUnsafe(20);
	await fileHandle.read(locBuf, 0, 20, locatorPos);
	if (locBuf.readUInt32LE(0) !== EOCD64_LOCATOR_SIG) return null;

	const eocd64Offset = Number(locBuf.readBigUInt64LE(8));
	const eocd64Buf = Buffer.allocUnsafe(56);
	await fileHandle.read(eocd64Buf, 0, 56, eocd64Offset);
	if (eocd64Buf.readUInt32LE(0) !== EOCD64_SIG) return null;

	return {
		cdSize: eocd64Buf.readBigUInt64LE(40),
		cdOffset: eocd64Buf.readBigUInt64LE(48),
	};
}

/**
 * Locate the end-of-central-directory record and return the central directory
 * offset and size. Handles ZIP64 archives transparently.
 */
async function readEOCD(
	fileHandle: FileHandle,
	fileSize: number,
): Promise<{ cdOffset: bigint; cdSize: bigint }> {
	// EOCD is at most 65557 bytes from the end (22 fixed + 65535 max comment)
	const searchSize = Math.min(65557, fileSize);
	const buf = Buffer.allocUnsafe(searchSize);
	await fileHandle.read(buf, 0, searchSize, fileSize - searchSize);

	for (let i = searchSize - 22; i >= 0; i--) {
		if (buf.readUInt32LE(i) !== EOCD_SIG) continue;

		const cdSize32 = buf.readUInt32LE(i + 12);
		const cdOffset32 = buf.readUInt32LE(i + 16);

		if (cdSize32 === 0xffffffff || cdOffset32 === 0xffffffff) {
			const zip64 = await tryReadZip64(fileHandle, fileSize - searchSize + i - 20);
			if (zip64) return zip64;
		}

		return { cdSize: BigInt(cdSize32), cdOffset: BigInt(cdOffset32) };
	}

	throw new Error('Could not find End of Central Directory record in ZIP file');
}

/**
 * Parse the central directory and return all file entries.
 * The central directory always has correct sizes and offsets, including ZIP64
 * extended fields, unlike local file headers which may hold placeholder values.
 */
async function readCentralDirectory(
	fileHandle: FileHandle,
	cdOffset: bigint,
	cdSize: bigint,
): Promise<ZipEntry[]> {
	const buf = Buffer.allocUnsafe(Number(cdSize));
	await fileHandle.read(buf, 0, Number(cdSize), Number(cdOffset));

	const entries: ZipEntry[] = [];
	let pos = 0;

	while (pos + 46 <= buf.length) {
		if (buf.readUInt32LE(pos) !== CD_ENTRY_SIG) break;

		const compressionMethod = buf.readUInt16LE(pos + 10);
		let compressedSize = BigInt(buf.readUInt32LE(pos + 20));
		let uncompressedSize = BigInt(buf.readUInt32LE(pos + 24));
		const nameLength = buf.readUInt16LE(pos + 28);
		const extraLength = buf.readUInt16LE(pos + 30);
		const commentLength = buf.readUInt16LE(pos + 32);
		let localHeaderOffset = BigInt(buf.readUInt32LE(pos + 42));

		const name = buf.toString('utf8', pos + 46, pos + 46 + nameLength);

		// Read ZIP64 extended fields when 32-bit values have overflowed
		let ePos = pos + 46 + nameLength;
		const eEnd = ePos + extraLength;
		while (ePos + 4 <= eEnd) {
			const headerId = buf.readUInt16LE(ePos);
			const dataSize = buf.readUInt16LE(ePos + 2);
			if (headerId === ZIP64_EXTRA_ID) {
				let z = ePos + 4;
				if (uncompressedSize === BigInt(0xffffffff) && z + 8 <= eEnd) {
					uncompressedSize = buf.readBigUInt64LE(z);
					z += 8;
				}
				if (compressedSize === BigInt(0xffffffff) && z + 8 <= eEnd) {
					compressedSize = buf.readBigUInt64LE(z);
					z += 8;
				}
				if (localHeaderOffset === BigInt(0xffffffff) && z + 8 <= eEnd) {
					localHeaderOffset = buf.readBigUInt64LE(z);
				}
				break;
			}
			ePos += 4 + dataSize;
		}

		entries.push({ name, compressionMethod, compressedSize, localHeaderOffset });
		pos += 46 + nameLength + extraLength + commentLength;
	}

	return entries;
}

/**
 * Read the local file header to find where compressed data actually starts.
 * The local header's extra field may differ in length from the central directory.
 */
async function getDataOffset(fileHandle: FileHandle, localHeaderOffset: bigint): Promise<bigint> {
	const buf = Buffer.allocUnsafe(30);
	await fileHandle.read(buf, 0, 30, Number(localHeaderOffset));

	if (buf.readUInt32LE(0) !== LOCAL_HEADER_SIG) {
		throw new Error(`Invalid local file header at offset ${localHeaderOffset}`);
	}

	const nameLength = buf.readUInt16LE(26);
	const extraLength = buf.readUInt16LE(28);
	return localHeaderOffset + BigInt(30 + nameLength + extraLength);
}

/**
 * Yield file data in chunks using positioned reads (pread), without advancing
 * the FileHandle's cursor or accumulating listeners. Safe on NFS/EFS.
 */
async function* readFileChunks(
	fileHandle: FileHandle,
	offset: number,
	size: number,
	chunkSize = 64 * 1024,
): AsyncGenerator<Buffer> {
	let pos = offset;
	let remaining = size;
	while (remaining > 0) {
		const toRead = Math.min(remaining, chunkSize);
		const buf = Buffer.allocUnsafe(toRead);
		const { bytesRead } = await fileHandle.read(buf, 0, toRead, pos);
		if (bytesRead === 0) break;
		yield bytesRead === toRead ? buf : buf.subarray(0, bytesRead);
		pos += bytesRead;
		remaining -= bytesRead;
	}
}
