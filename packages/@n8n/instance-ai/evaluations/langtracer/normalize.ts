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

	// drop dispatch-only keys (not part of n8n's schema)
	delete obj.prompt;
	delete obj.scenarios;

	return obj;
}
