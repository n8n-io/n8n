import * as fflate from 'fflate';
import { readFile, readdir, writeFile, mkdir } from 'fs/promises';
import * as path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { safeJoinPath } from '@n8n/backend-common';

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

	// Resolve paths to handle relative paths correctly
	const resolvedSourceDir = path.resolve(sourceDir);
	const resolvedOutputPath = path.resolve(outputPath);

	// If output file is inside source directory, exclude it to prevent self-inclusion
	const outputFileName = path.basename(resolvedOutputPath);
	const outputIsInSource =
		resolvedOutputPath.startsWith(resolvedSourceDir + path.sep) ||
		resolvedOutputPath === resolvedSourceDir;

	// Add output file to exclude list if it's inside the source directory
	const excludeList = outputIsInSource ? [...exclude, outputFileName] : exclude;

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
	await addDirectoryToZipStreaming(sourceDir, '', zip, {
		exclude: excludeList,
		includeHidden,
		level,
	});

	// Finalize the ZIP
	zip.end();

	// Wait for the stream to finish
	return await new Promise<void>((resolve, reject) => {
		outputStream.on('finish', resolve);
		outputStream.on('error', reject);
	});
}

/**
 * Decompress a ZIP archive to a folder using streaming
 * Reuses the same patterns as the Compression node but with streaming approach
 */
export async function decompressFolder(sourcePath: string, outputDir: string): Promise<void> {
	await mkdir(outputDir, { recursive: true });

	return new Promise<void>(async (resolve, reject) => {
		let filesToProcess = 0;
		let streamEnded = false;

		const attemptToResolve = () => {
			if (streamEnded && filesToProcess === 0) {
				resolve();
			}
		};

		const unzip = new fflate.Unzip((stream) => {
			if (!stream.name.endsWith('/')) {
				// Validate no null bytes (path traversal attack vector)
				if (stream.name.includes('\0')) {
					reject(new Error(`Invalid path: null byte detected in ${stream.name}`));
					return;
				}

				// Normalize path separators (zip files can contain both / and \)
				const normalizedName = stream.name.replace(/\\/g, '/');

				// Use safeJoinPath to prevent path traversal attacks
				let filePath: string;
				try {
					filePath = safeJoinPath(outputDir, normalizedName);
				} catch (error) {
					reject(error);
					return;
				}

				const dirPath = path.dirname(filePath);

				// Ensure directory exists before writing (await to prevent race conditions)
				const dirPromise = mkdir(dirPath, { recursive: true }).catch((error) => {
					if (error.code !== 'EEXIST') {
						reject(error);
					}
				});

				filesToProcess++;

				const chunks: Uint8Array[] = [];
				let totalLength = 0;

				stream.ondata = async (error, chunk, final) => {
					if (error) {
						reject(error);
						return;
					}

					chunks.push(chunk);
					totalLength += chunk.length;

					if (final) {
						// Ensure directory is created before writing
						await dirPromise;

						const finalBuffer = new Uint8Array(totalLength);
						let offset = 0;

						for (const chunk of chunks) {
							finalBuffer.set(chunk, offset);
							offset += chunk.length;
						}

						await writeFile(filePath, Buffer.from(finalBuffer));

						filesToProcess--;
						attemptToResolve();
					}
				};

				stream.start();
			}
		});

		unzip.register(fflate.AsyncUnzipInflate);

		const zipStream = createReadStream(sourcePath);

		// Register error handler BEFORE reading to catch EOF and other stream errors
		zipStream.on('error', (error) => {
			// If stream ends with EOF, it's normal - just finalize
			const errorWithCode = error as { code?: string; message?: string };
			if (errorWithCode.code === 'EOF' || errorWithCode.message?.includes('EOF')) {
				streamEnded = true;
				unzip.push(new Uint8Array(0), true);
				attemptToResolve();
			} else {
				reject(error);
			}
		});

		// Handle stream end event (normal completion)
		zipStream.on('end', () => {
			streamEnded = true;
			unzip.push(new Uint8Array(0), true);
			attemptToResolve();
		});

		try {
			for await (const chunk of zipStream) {
				unzip.push(chunk as Uint8Array, false);
			}

			// Only set streamEnded if loop completed normally (not via error/end event)
			if (!streamEnded) {
				streamEnded = true;
				// IMPORTANT: signal end of zip stream
				unzip.push(new Uint8Array(0), true);
				attemptToResolve();
			}
		} catch (err) {
			// Handle EOF errors gracefully (common in Kubernetes with network filesystems)
			if (
				(err as { code?: string; message?: string }).code === 'EOF' ||
				(err as { message?: string }).message?.includes('EOF')
			) {
				streamEnded = true;
				unzip.push(new Uint8Array(0), true);
				attemptToResolve();
			} else {
				reject(err);
			}
		}
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
