import { WORKFLOW_TEST_CASE_KEYS } from '../data/workflows/schema';

/** Keys n8n's `.strict()` case schema accepts — anything else must be stripped. */
const ALLOWED_KEYS = new Set(WORKFLOW_TEST_CASE_KEYS);

/** Fold lang-tracer's legacy `buildExpectations` into `outcomeExpectations` (the key
 *  n8n's schema forbids). Outcome runs in every build mode. No-ops post-split. */
export function normalizeExportedCase(raw: unknown): unknown {
	if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;

	const obj: Record<string, unknown> = { ...raw };

	if (Array.isArray(obj.buildExpectations)) {
		const legacy = obj.buildExpectations.filter((s): s is string => typeof s === 'string');
		const existing = Array.isArray(obj.outcomeExpectations)
			? obj.outcomeExpectations.filter((s): s is string => typeof s === 'string')
			: [];
		const merged = [...existing, ...legacy];
		if (merged.length > 0) obj.outcomeExpectations = merged;
		delete obj.buildExpectations;
	}

	// Whitelist to the schema's accepted keys. LangTracer attaches export-only keys
	// (id, name, suiteId, timestamps, the dispatch-only prompt/scenarios, …); n8n's
	// schema is `.strict()` and the loader aggregates errors, so a single stray key
	// fails the whole suite. Stripping to the allowed set is robust where deleting
	// the two keys we happen to know today is not.
	const cleaned: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (ALLOWED_KEYS.has(key)) cleaned[key] = value;
	}
	return cleaned;
}
