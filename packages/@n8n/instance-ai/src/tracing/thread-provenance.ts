/**
 * Thread provenance → trace metadata.
 *
 * A thread records where it was opened from (`source`, from
 * INSTANCE_AI_THREAD_SOURCES) plus an optional caller bag (`sourceContext`),
 * both written at `ensureThread` and persisted in the thread's metadata. Until
 * now neither reached the trace, so a LangSmith project could not answer
 * "which entry point produced this run?" — let alone "show me every run of
 * this one eval case", which is what the offline eval harness needs when its
 * builds are traced.
 *
 * Two rules make an arbitrary caller bag safe to merge into a trace:
 *
 *   1. PREFIXED. `buildBaseMetadata` spreads caller metadata LAST, so an
 *      unprefixed `user_id` in a sourceContext would replace the real one.
 *   2. FLAT AND SCALAR. LangSmith filters match a metadata KEY, not a path
 *      into a JSON document, so a nested object is unfilterable — dropping it
 *      is more honest than shipping something that can't be queried.
 */

/** Entry point the thread was opened from (INSTANCE_AI_THREAD_SOURCES). */
export const THREAD_SOURCE_KEY = 'thread_source';

/** Namespace for the caller's own `sourceContext` entries. */
export const SOURCE_CONTEXT_PREFIX = 'source_context.';

/** `sourceContext` is size-capped at the API boundary (2 KB), but that still
 *  allows a lot of tiny keys; traces are not a place to page through them. */
const MAX_SOURCE_CONTEXT_KEYS = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): value is string | number | boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * Project a thread's stored metadata onto the flat, filterable trace fields.
 * Returns an empty object for anything unrecognised — provenance is a nice-to-
 * have on a trace and must never be the reason a run fails.
 */
export function threadProvenanceMetadata(threadMetadata: unknown): Record<string, unknown> {
	if (!isRecord(threadMetadata)) return {};

	const out: Record<string, unknown> = {};

	if (typeof threadMetadata.source === 'string' && threadMetadata.source) {
		out[THREAD_SOURCE_KEY] = threadMetadata.source;
	}

	const sourceContext = threadMetadata.sourceContext;
	if (isRecord(sourceContext)) {
		let taken = 0;
		for (const [key, value] of Object.entries(sourceContext)) {
			if (taken >= MAX_SOURCE_CONTEXT_KEYS) break;
			if (!isScalar(value)) continue;
			out[`${SOURCE_CONTEXT_PREFIX}${key}`] = value;
			taken++;
		}
	}

	return out;
}
