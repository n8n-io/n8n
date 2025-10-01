import * as fflate from 'fflate';
import { promisify } from 'util';
import { readFile, readdir, writeFile, mkdir, stat } from 'fs/promises';
import * as path from 'path';

const unzip = promisify(fflate.unzip);
const zip = promisify(fflate.zip);

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
 * Compress a folder into a ZIP archive
 * Reuses the same patterns as the Compression node
 */
export async function compressFolder(
	sourceDir: string,
	outputPath: string,
	options: CompressionOptions = {},
): Promise<void> {
	const { level = 6, exclude = [], includeHidden = false } = options;

	const zipData: fflate.Zippable = {};

	await addDirectoryToZip(sourceDir, '', zipData, { exclude, includeHidden, level });

	// Ensure output directory exists
	const outputDir = path.dirname(outputPath);
	await mkdir(outputDir, { recursive: true });
	const buffer = await zip(zipData);
	await writeFile(outputPath, buffer);
}

/**
 * Decompress a ZIP archive to a folder
 * Reuses the same patterns as the Compression node
 */
export async function decompressFolder(
	sourcePath: string,
	outputDir: string,
	options: DecompressionOptions = {},
): Promise<void> {
	const { overwrite = false, exclude = [] } = options;

	// Ensure output directory exists
	await mkdir(outputDir, { recursive: true });

	const zipContent = await readFile(sourcePath);
	const files = await unzip(zipContent);

	for (const [fileName, fileData] of Object.entries(files)) {
		// Skip excluded files
		if (
			exclude.some((pattern) =>
				pattern.startsWith('*.') ? fileName.endsWith(pattern.slice(1)) : fileName.includes(pattern),
			)
		) {
			continue;
		}

		// Skip __MACOSX files (same logic as Compression node)
		if (fileName.includes('__MACOSX')) {
			continue;
		}

		// Sanitize path to prevent zip slip attacks
		const filePath = sanitizePath(fileName, outputDir);
		const dirPath = path.dirname(filePath);

		// Create directory if it doesn't exist
		await mkdir(dirPath, { recursive: true });

		// Check if file exists and handle overwrite
		try {
			await stat(filePath);
			if (!overwrite) {
				continue; // Skip existing files
			}
		} catch {
			// File doesn't exist, continue
		}

		await writeFile(filePath, Buffer.from(fileData.buffer));
	}
}

/**
 * Add directory contents to zip data structure
 * Follows the same pattern as Compression node
 */
async function addDirectoryToZip(
	dirPath: string,
	zipPath: string,
	zipData: fflate.Zippable,
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

		const fullPath = path.join(dirPath, entry.name);
		const zipEntryPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			await addDirectoryToZip(fullPath, zipEntryPath, zipData, options);
		} else {
			const fileContent = await readFile(fullPath);
			const fileExtension = path.extname(entry.name).toLowerCase().slice(1);

			// Use same compression logic as Compression node
			const compressionLevel: fflate.ZipOptions['level'] = ALREADY_COMPRESSED.includes(
				fileExtension,
			)
				? 0
				: level;

			zipData[zipEntryPath] = [new Uint8Array(fileContent), { level: compressionLevel }];
		}
	}
}
