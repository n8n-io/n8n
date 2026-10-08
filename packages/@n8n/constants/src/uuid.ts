/**
 * Matches a uuidv7: version `7` in the third group, RFC 4122 variant in the
 * fourth. Time-ordered ids are validated against this on the wire.
 */
export const UUID_V7_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
