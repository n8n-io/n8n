/**
 * Utility functions for trigger-service
 */

export function removeTrailingSlash(path: string) {
	return path.endsWith('/') ? path.slice(0, -1) : path;
}
