/**
 * Shared in-sandbox runtime: secrets manifest parsing.
 *
 * This is a source *string* embedded into the pi extensions — they run under
 * pi's jiti loader inside the sandbox and cannot import workspace modules.
 * Written as plain JavaScript (also valid TypeScript) so unit tests can
 * evaluate it with `new Function` and exercise exactly the code that ships.
 */
export const MANIFEST_RUNTIME_SOURCE = String.raw`
// ── shared runtime: secrets manifest ─────────────────────────────────────────

/**
 * Parses the host-written secrets manifest (env var names and labels only —
 * never values). Returns null on any structural problem: callers then treat
 * the run as having no known secrets instead of crashing the harness on
 * plumbing.
 */
function parseSecretsManifest(jsonText) {
	if (typeof jsonText !== 'string' || jsonText.length === 0) return null;
	let parsed;
	try {
		parsed = JSON.parse(jsonText);
	} catch {
		return null;
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	if (parsed.version !== 1 || !Array.isArray(parsed.secrets)) return null;
	const secrets = [];
	for (const entry of parsed.secrets) {
		if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return null;
		if (typeof entry.envVar !== 'string' || typeof entry.label !== 'string') return null;
		secrets.push({ envVar: entry.envVar, label: entry.label });
	}
	return { version: 1, secrets };
}
`;
