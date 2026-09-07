// ---------------------------------------------------------------------------
// Small shared string helpers for reports and token display (avoids drift
// between cli summary and HTML report).
// ---------------------------------------------------------------------------

/** JSON.stringify for display; non-serializable values fall back to `String()`. */
export function safeStringify(value: unknown): string {
	try {
		return JSON.stringify(value) ?? '';
	} catch {
		return String(value);
	}
}

export function formatTokens(n: number): string {
	if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
	if (n >= 1_000) return `${(n / 1000).toFixed(2)}K`;
	return String(n);
}

/** Minimal HTML entity escaping for inline reports (attribute-safe text nodes). */
export function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
