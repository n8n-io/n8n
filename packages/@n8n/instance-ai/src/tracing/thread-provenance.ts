/**
 * Thread provenance → trace metadata.
 *
 * `ensureThread` records where a thread was opened from (`source`) plus the
 * opener's own `sourceContext`, and persists both in the thread's metadata.
 * This projects them onto the trace so a LangSmith project can answer "which
 * entry point produced this run?" — and, for the eval harness, "show me every
 * run of this one case".
 */

/**
 * Prefixed, because `buildBaseMetadata` spreads caller metadata LAST: an
 * unprefixed `user_id` in a sourceContext would replace the real one.
 * `sourceContext` is size-capped at the API boundary, so nothing more is
 * bounded here.
 *
 * Values are forwarded as given. Scalars (and homogeneous arrays) stay
 * filterable; an object arrives JSON-stringified by `toTelemetryAttributeValue`
 * and can then only be matched whole. Forwarding it beats dropping it — a
 * provenance field that silently disappears is worse than one you have to read
 * instead of filter — and every caller today sends plain ids.
 */
export function threadProvenanceMetadata(threadMetadata: unknown): Record<string, unknown> {
	if (typeof threadMetadata !== 'object' || threadMetadata === null) return {};
	const { source, sourceContext } = threadMetadata as {
		source?: unknown;
		sourceContext?: unknown;
	};

	const out: Record<string, unknown> = {};
	if (typeof source === 'string' && source) out.thread_source = source;
	if (typeof sourceContext === 'object' && sourceContext !== null) {
		for (const [key, value] of Object.entries(sourceContext)) {
			out[`source_context.${key}`] = value;
		}
	}
	return out;
}
