import type { BinaryFileType, IBinaryData } from 'n8n-workflow';

// Constants definition
const INVALID_CHARS_REGEX = /[<>:"/\\|?*\u0000-\u001F\u007F-\u009F]/g;
const ZERO_WIDTH_CHARS_REGEX = /[\u200B-\u200D\u2060\uFEFF]/g;
const UNICODE_SPACES_REGEX = /[\u00A0\u2000-\u200A]/g;
const LEADING_TRAILING_DOTS_SPACES_REGEX = /^[\s.]+|[\s.]+$/g;
const WINDOWS_RESERVED_NAMES = new Set([
	'CON',
	'PRN',
	'AUX',
	'NUL',
	'COM1',
	'COM2',
	'COM3',
	'COM4',
	'COM5',
	'COM6',
	'COM7',
	'COM8',
	'COM9',
	'LPT1',
	'LPT2',
	'LPT3',
	'LPT4',
	'LPT5',
	'LPT6',
	'LPT7',
	'LPT8',
	'LPT9',
]);

const DEFAULT_FALLBACK_NAME = 'untitled';
const MAX_FILENAME_LENGTH = 200;

/**
 * Sanitizes a filename to be compatible with Mac, Linux, and Windows file systems
 *
 * Main features:
 * - Replace invalid characters (e.g. ":" in hello:world)
 * - Handle Windows reserved names
 * - Limit filename length
 * - Normalize Unicode characters
 *
 * @param filename - The filename to sanitize (without extension)
 * @param maxLength - Maximum filename length (default: 200)
 * @returns A sanitized filename (without extension)
 *
 * @example
 * sanitizeFilename('hello:world') // returns 'hello_world'
 * sanitizeFilename('CON') // returns '_CON'
 * sanitizeFilename('') // returns 'untitled'
 */
export const sanitizeFilename = (
	filename: string,
	maxLength: number = MAX_FILENAME_LENGTH,
): string => {
	// Input validation
	if (!filename) {
		return DEFAULT_FALLBACK_NAME;
	}

	let baseName = filename
		.trim()
		.replace(INVALID_CHARS_REGEX, '_')
		.replace(ZERO_WIDTH_CHARS_REGEX, '')
		.replace(UNICODE_SPACES_REGEX, ' ')
		.replace(LEADING_TRAILING_DOTS_SPACES_REGEX, '');

	// Handle empty or invalid filenames after cleaning
	if (!baseName) {
		baseName = DEFAULT_FALLBACK_NAME;
	}

	// Handle Windows reserved names
	if (WINDOWS_RESERVED_NAMES.has(baseName.toUpperCase())) {
		baseName = `_${baseName}`;
	}

	// Truncate if too long
	if (baseName.length > maxLength) {
		baseName = baseName.slice(0, maxLength);
	}

	return baseName;
};

export async function convertFileToBinaryData(file: File): Promise<IBinaryData> {
	const reader = new FileReader();
	return await new Promise((resolve, reject) => {
		reader.onload = () => {
			const binaryData: IBinaryData = {
				data: (reader.result as string).split('base64,')?.[1] ?? '',
				mimeType: file.type,
				fileName: file.name,
				fileSize: `${file.size} bytes`,
				fileExtension: file.name.split('.').pop() ?? '',
				fileType: file.type.split('/')[0] as BinaryFileType,
			};
			resolve(binaryData);
		};
		reader.onerror = () => {
			reject(new Error('Failed to convert file to binary data'));
		};
		reader.readAsDataURL(file);
	});
}

/**
 * Creates a placeholder file for unavailable attachments
 */
function createUnavailableFilePlaceholder(binaryData: IBinaryData): File {
	const fileName = binaryData.fileName ?? 'unknown file';
	const unavailableText = `File unavailable: ${fileName}`;
	return new File([unavailableText], `[Unavailable] ${fileName}`, {
		type: 'text/plain',
	});
}

export function convertBinaryDataToFile(binaryData: IBinaryData): File {
	try {
		const base64Data = binaryData.data;
		if (!base64Data) {
			console.error('Binary data is missing for file:', binaryData.fileName);
			return createUnavailableFilePlaceholder(binaryData);
		}

		const binaryString = atob(base64Data);
		const bytes = new Uint8Array(binaryString.length);

		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		return new File([bytes], binaryData.fileName ?? 'unnamed file', {
			type: binaryData.mimeType,
		});
	} catch (error) {
		console.error('Failed to convert binary data to file:', error, binaryData.fileName);
		return createUnavailableFilePlaceholder(binaryData);
	}
}
