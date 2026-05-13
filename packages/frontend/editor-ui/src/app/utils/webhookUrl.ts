/**
 * Extracts the webhook path from a user-supplied filter input.
 *
 * Accepts either a full URL (e.g. `https://host/webhook/foo/bar`) or a raw
 * path (`foo/bar`). When given a URL, query strings and fragments are
 * stripped, and the first matching endpoint prefix from `prefixes` is
 * removed. Webhook paths themselves may contain `/`, so we can't extract
 * by splitting — we strip the known prefix instead.
 *
 * Returns the input unchanged if no prefix matches.
 */
export function extractWebhookId(value: string, prefixes: string[]): string {
	const trimmed = value.trim();
	if (!trimmed) return trimmed;

	let normalized = trimmed;
	try {
		const url = new URL(trimmed);
		normalized = `${url.origin}${url.pathname}`;
	} catch {
		// Not a URL — treat the input as a raw webhook path.
	}

	for (const prefix of prefixes) {
		const fullPrefix = `${prefix}/`;
		if (normalized.startsWith(fullPrefix)) {
			return normalized.slice(fullPrefix.length);
		}
	}

	return trimmed;
}
