// n8n's database version policy covers Postgres only. SQLite has no policy:
// the library ships bundled with n8n, so users never pick its version.

/**
 * Oldest Postgres major inside the supported range. The range is the two
 * newest actively maintained majors, so anything newer than this is fine too.
 */
export const OLDEST_SUPPORTED_POSTGRES_MAJOR = 17;

/**
 * Oldest Postgres major that still gets compatibility support. Below this,
 * n8n is _not_ tested against the server at all.
 */
export const OLDEST_COMPATIBILITY_POSTGRES_MAJOR = 16;

/** Parses the major out of a Postgres server version like `17.6`. */
function parsePostgresMajor(version: string): number | null {
	const major = Number.parseInt(version.split('.')[0], 10);

	return Number.isInteger(major) ? major : null;
}

/**
 * Warning to log for a Postgres server version outside the supported range,
 * or `null` when the version is supported or could not be parsed.
 */
export function getPostgresVersionWarning(version: string): string | null {
	const major = parsePostgresMajor(version);
	if (major === null) return null;

	if (major < OLDEST_COMPATIBILITY_POSTGRES_MAJOR) {
		return `Postgres ${major} is not supported. n8n supports Postgres ${OLDEST_SUPPORTED_POSTGRES_MAJOR} and newer, with ${OLDEST_COMPATIBILITY_POSTGRES_MAJOR} on compatibility support. Upgrade to Postgres ${OLDEST_SUPPORTED_POSTGRES_MAJOR} or newer.`;
	}

	if (major < OLDEST_SUPPORTED_POSTGRES_MAJOR) {
		return `Postgres ${major} is outside the supported range and receives compatibility support only. Upgrade to Postgres ${OLDEST_SUPPORTED_POSTGRES_MAJOR} or newer.`;
	}

	return null;
}
