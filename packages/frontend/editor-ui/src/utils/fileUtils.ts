/**
 * Sanitizes a filename to be compatible with Mac, Linux, and Windows file systems.
 *
 * @param filename - The filename to sanitize
 * @param maxLength - Maximum length for the filename (default: 200, leaving room for extension)
 * @returns A sanitized filename safe for all major operating systems
 */
export const sanitizeFilename = (filename: string, maxLength: number = 200): string => {
	if (!filename || typeof filename !== 'string') {
		return 'untitled';
	}

	let sanitized = filename.trim();

	// Step 1: Replace invalid characters for Windows, Mac, and Linux
	// Windows: < > : " / \ | ? * and control characters (0x00-0x1F, 0x7F-0x9F)
	// Mac: : / and control characters (in HFS+)
	// Linux: / and null character
	sanitized = sanitized.replace(/[<>:"/\\|?*\u0000-\u001F\u007F-\u009F]/g, '_');

	// Step 2: Handle additional problematic Unicode characters
	sanitized = sanitized.replace(/[\u200B-\u200D\u2060\uFEFF]/g, ''); // Zero-width spaces
	sanitized = sanitized.replace(/[\u00A0]/g, ' '); // Non-breaking space to regular space
	sanitized = sanitized.replace(/[\u2000-\u200A]/g, ' '); // Various Unicode spaces

	// Step 3: Handle Windows reserved names (case-insensitive)
	// These are reserved regardless of extension
	const windowsReserved = [
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
	];

	// Check the base name (without extension) against reserved names
	const lastDotIndex = sanitized.lastIndexOf('.');
	const baseName = lastDotIndex > 0 ? sanitized.substring(0, lastDotIndex) : sanitized;

	if (windowsReserved.includes(baseName.toUpperCase())) {
		sanitized = `_${sanitized}`;
	}

	// Step 4: Remove leading/trailing spaces and dots (Windows requirement)
	// Windows doesn't allow files to start or end with spaces or dots
	sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

	// Step 5: Handle empty or problematic filenames
	if (!sanitized || sanitized === '.' || sanitized === '..' || /^\.+$/.test(sanitized)) {
		sanitized = 'untitled';
	}

	// Step 6: Handle filenames starting with dot (hidden files on Unix-like systems)
	// While legal, it might cause confusion, so we add a prefix
	if (sanitized.startsWith('.') && sanitized.length > 1) {
		sanitized = '_' + sanitized.substring(1);
	}

	// Step 7: Handle very long filenames
	// Most filesystems support 255 characters, but we leave room for extensions
	if (sanitized.length > maxLength) {
		const dotIndex = sanitized.lastIndexOf('.');

		if (dotIndex > 0 && dotIndex > sanitized.length - 10) {
			// Has a reasonable extension, preserve it
			const extension = sanitized.substring(dotIndex);
			const nameWithoutExt = sanitized.substring(0, dotIndex);
			const maxNameLength = Math.max(1, maxLength - extension.length);
			sanitized = nameWithoutExt.substring(0, maxNameLength) + extension;
		} else {
			// No extension or extension is too long, just truncate
			sanitized = sanitized.substring(0, maxLength);
		}
	}

	// Step 8: Final cleanup after truncation
	// Ensure we don't end with spaces or dots after truncation
	sanitized = sanitized.replace(/[\s.]+$/, '');

	// Step 9: Final safety check
	if (!sanitized) {
		sanitized = 'untitled';
	}

	return sanitized;
};

/**
 * Validates if a filename is safe for cross-platform use
 *
 * @param filename - The filename to validate
 * @returns Object with validation result and issues found
 */
export const validateFilename = (
	filename: string,
): {
	isValid: boolean;
	issues: string[];
	sanitized: string;
} => {
	const issues: string[] = [];
	const sanitized = sanitizeFilename(filename);

	if (!filename) {
		issues.push('Filename is empty');
	}

	if (filename !== sanitized) {
		issues.push('Filename contains invalid characters or format');
	}

	if (filename.length > 255) {
		issues.push('Filename is too long (max 255 characters)');
	}

	// Check for Windows reserved names
	const windowsReserved = [
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
	];
	const baseName = filename.split('.')[0]?.toUpperCase();
	if (windowsReserved.includes(baseName)) {
		issues.push('Filename uses Windows reserved name');
	}

	return {
		isValid: issues.length === 0,
		issues,
		sanitized,
	};
};

/**
 * Generates a safe filename with timestamp if the original is invalid
 *
 * @param preferredName - The preferred filename
 * @param fallbackPrefix - Prefix for fallback name (default: 'file')
 * @returns A guaranteed safe filename
 */
export const generateSafeFilename = (
	preferredName: string,
	fallbackPrefix: string = 'file',
): string => {
	const sanitized = sanitizeFilename(preferredName);

	// If sanitization resulted in a generic name, make it unique
	if (sanitized === 'untitled' && preferredName !== 'untitled') {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		return `${fallbackPrefix}_${timestamp}`;
	}

	return sanitized;
};
