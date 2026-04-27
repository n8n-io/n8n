const MAX_ARRAY_ITEMS = 20;
const MAX_DEPTH = 6;
const BINARY_KEYS = new Set(['data', 'mimeType', 'fileName']);

/**
 * Trim user-supplied request/response examples before sending them to v0.
 *
 * - Truncates arrays to the first MAX_ARRAY_ITEMS so a 10k-row response
 *   doesn't blow the prompt budget.
 * - Drops n8n binary-shaped objects (`{ data, mimeType, fileName }`) — base64
 *   blobs are useless to v0 and can be enormous.
 * - Drops `binary` keys outright, same reason.
 * - Caps recursion at MAX_DEPTH and replaces deeper nodes with the string '…'
 *   so cyclic-shaped data doesn't trip us up.
 *
 * Pure function: no I/O, no exceptions for normal inputs.
 */
export function sanitizeEndpointExamples(value: unknown, depth = 0): unknown {
	if (depth > MAX_DEPTH) return '…';
	if (value === null || typeof value !== 'object') return value;

	if (Array.isArray(value)) {
		return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeEndpointExamples(item, depth + 1));
	}

	const obj = value as Record<string, unknown>;
	const keys = Object.keys(obj);
	const looksBinary =
		keys.length >= 2 && keys.every((k) => BINARY_KEYS.has(k)) && typeof obj.data === 'string';
	if (looksBinary) return undefined;

	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (k === 'binary') continue;
		const sanitized = sanitizeEndpointExamples(v, depth + 1);
		if (sanitized !== undefined) out[k] = sanitized;
	}
	return out;
}
