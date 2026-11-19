/**
 * Convert bytes to megabytes (rounded to nearest integer)
 */
export function toMb(sizeInBytes: number): number {
	return Math.round(sizeInBytes / (1024 * 1024));
}

/**
 * Convert bytes to gigabytes (rounded to at most two decimals, so 1.5 GB stays 1.5)
 */
export function toGb(sizeInBytes: number): number {
	return Math.round((sizeInBytes / (1024 * 1024 * 1024)) * 100) / 100;
}

/**
 * Format a size for a user-facing limit: whole megabytes below one gigabyte
 * ("500 MB"), gigabytes with at most two decimals from there on ("1.5 GB")
 */
export function formatMbOrGb(sizeInBytes: number): string {
	if (sizeInBytes < 1024 * 1024 * 1024) {
		return `${toMb(sizeInBytes)} MB`;
	}

	return `${toGb(sizeInBytes)} GB`;
}

/**
 * Format bytes to human-readable size with appropriate unit (B, KB, or MB)
 */
export function formatBytes(sizeInBytes: number): string {
	if (sizeInBytes < 1024) {
		return `${sizeInBytes}B`;
	} else if (sizeInBytes < 1024 * 1024) {
		return `${Math.round(sizeInBytes / 1024)}KB`;
	} else {
		return `${Math.round(sizeInBytes / (1024 * 1024))}MB`;
	}
}
