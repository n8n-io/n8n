/**
 * Parse eval-only LLM header JSON (`EVAL_MODAL_LLM_HEADERS`) — a JSON object of
 * HTTP header names to string values (e.g. Modal proxy auth).
 */
export function parseModelHeadersJson(raw: string | undefined): Record<string, string> | undefined {
	const trimmed = raw?.trim();
	if (!trimmed) return undefined;

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return undefined;
	}

	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return undefined;
	}

	const headers: Record<string, string> = {};
	for (const [key, value] of Object.entries(parsed)) {
		if (typeof key !== 'string' || !key.trim()) continue;
		if (typeof value !== 'string') continue;
		headers[key.trim()] = value;
	}

	return Object.keys(headers).length > 0 ? headers : undefined;
}
