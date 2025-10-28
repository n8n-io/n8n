/**
 * Convert bytes to megabytes (rounded to nearest integer)
 */
export function toMb(sizeInBytes: number): number {
	return Math.round(sizeInBytes / (1024 * 1024));
}
