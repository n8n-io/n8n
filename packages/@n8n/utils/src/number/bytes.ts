/**
 * Convert bytes to megabytes (rounded to nearest integer)
 */
export function toMb(sizeInBytes: number): number {
	return Math.round(sizeInBytes / (1024 * 1024));
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
