const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/**
 * Human-readable byte size for error messages.
 *
 * Deliberately local rather than reused from the data-table module: modules are
 * independently enableable, so a cross-module import would couple two unrelated
 * features. This variant also carries GB, which project-file quotas need and
 * data-table's (capped at MB) does not.
 */
export function formatBytes(sizeInBytes: number): string {
	let size = sizeInBytes;
	let unit = 0;

	while (size >= 1024 && unit < UNITS.length - 1) {
		size /= 1024;
		unit++;
	}

	return `${Math.round(size)}${UNITS[unit]}`;
}
