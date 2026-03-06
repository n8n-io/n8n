import { createWriteStream, createReadStream, mkdirSync } from 'fs';
import { readFile, readdir, mkdir } from 'fs/promises';
import * as path from 'path';

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
 * Decompress a ZIP archive to a folder using streaming.
 * Uses UnzipInflate (synchronous, no worker threads) to avoid EOF errors
 * in containerised environments, and pipes chunks directly to write streams
 * to keep memory usage low even for multi-GB archives.
 */
export async function decompressFolder(sourcePath: string, outputDir: string): Promise<void> {
	await mkdir(outputDir, { recursive: true });

	return await new Promise<void>((resolve, reject) => {
		let pendingWrites = 0;
		let streamFinished = false;

		function checkDone() {
			if (streamFinished && pendingWrites === 0) {
				resolve();
			}
		}

		const unzip = new fflate.Unzip((stream) => {
			if (stream.name.endsWith('/')) return;

			pendingWrites++;
			const filePath = sanitizePath(stream.name, outputDir);
			mkdirSync(path.dirname(filePath), { recursive: true });

			const writeStream = createWriteStream(filePath);
			writeStream.on('error', reject);

			stream.ondata = (error, chunk, final) => {
				if (error) {
					reject(error instanceof Error ? error : new Error(String(error)));
					return;
				}
				writeStream.write(Buffer.from(chunk));
				if (final) {
					writeStream.end(() => {
						pendingWrites--;
						checkDone();
					});
				}
			};

			stream.start();
		});

		// UnzipInflate is synchronous (no worker threads), reliable in all environments
		unzip.register(fflate.UnzipInflate);

		const zipStream = createReadStream(sourcePath);
		zipStream.on('error', reject);
		zipStream.on('data', (chunk: Buffer) => {
			try {
				unzip.push(new Uint8Array(chunk));
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
		zipStream.on('end', () => {
			try {
				// Signal end-of-stream so fflate parses the central directory
				unzip.push(new Uint8Array(0), true);
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
				return;
			}
			streamFinished = true;
			checkDone();
		});
	});
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
