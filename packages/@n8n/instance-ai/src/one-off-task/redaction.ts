/**
 * Host-side redaction for one-off task sandboxes.
 *
 * This is the **authoritative** redaction layer per the design
 * (`docs/one-off-task-sandboxes.md`): the in-sandbox `tool_result` hook fires
 * only after a tool finishes, while pi streams partial output earlier — so
 * every string that leaves toward the stream or the orchestrator (deltas,
 * status lines, tool summaries, final report fields) must pass through
 * {@link scrub} against the injected secret values before emission.
 */

export interface ScrubSecret {
	/** The raw secret value injected into the harness environment. */
	value: string;
	/** Human label for the redaction marker, e.g. `[REDACTED:GOOGLE_TOKEN]`. */
	label: string;
}

/**
 * Values shorter than this are never scrubbed: a 1–3 character "secret" would
 * shred ordinary text, and no real credential value is that short.
 */
const MIN_SECRET_VALUE_LENGTH = 4;

/**
 * Replace every occurrence of every secret value in `text` with
 * `[REDACTED:<label>]`. Longer values are scrubbed first so a secret that
 * contains another secret as a substring leaves no partial remainder.
 *
 * Exact-value matching only — encoded or transformed secrets can evade this
 * layer (accepted residual risk; the egress allowlist is the future answer).
 */
export function scrub(text: string, secrets: ScrubSecret[]): string {
	const ordered = [...secrets]
		.filter((secret) => secret.value.length >= MIN_SECRET_VALUE_LENGTH)
		.sort((a, b) => b.value.length - a.value.length);

	let result = text;
	for (const secret of ordered) {
		result = result.split(secret.value).join(`[REDACTED:${secret.label}]`);
	}
	return result;
}

/**
 * Scrub every string in an arbitrary JSON-ish structure — string values and
 * object keys alike. Non-string primitives pass through unchanged.
 */
export function scrubDeep(value: unknown, secrets: ScrubSecret[]): unknown {
	if (typeof value === 'string') return scrub(value, secrets);
	if (Array.isArray(value)) return value.map((item) => scrubDeep(item, secrets));
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [scrub(key, secrets), scrubDeep(item, secrets)]),
		);
	}
	return value;
}
