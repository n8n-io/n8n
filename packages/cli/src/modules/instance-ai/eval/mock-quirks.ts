/**
 * Registry of per-API mocking quirks the eval mock-handler exposes via
 * the `get_endpoint_quirks` tool. Entries are short decision rules — the
 * response shape itself comes from the API docs in the user prompt.
 *
 * Bar for adding an entry:
 *   - A scenario reproducibly fails due to a specific API quirk
 *   - The quirk is documented behavior we can cite
 */

export interface MockQuirk {
	/** Matched against the service name extracted from the request URL. */
	service: string;
	/** `${METHOD} ${path}` pattern (no query, no host). Omit to apply service-wide. */
	endpoint?: string;
	guidance: string;
	rationale: string;
	/** ISO date (YYYY-MM-DD). */
	addedAt: string;
}

export const MOCK_QUIRKS: MockQuirk[] = [
	{
		service: 'Notion',
		guidance:
			'Notion documents partial response variants (objects with only `{object, id}`) alongside full ones for many resources (pages, databases, blocks, users). ALWAYS return the FULL response object with all documented fields (`properties`, `parent`, `created_time`, schema, etc.) — never a partial form. Use a partial variant ONLY if the request body explicitly opts in (e.g. a `template` field for create-page). The `object` field must match the endpoint\'s resource type — GET `/v1/databases/{id}` returns `object: "database"`, not `"page"`.',
		rationale:
			'Notion exposes partial variants for many resources without a client-controllable flag. The LLM occasionally picks the partial form (or returns a page-shaped object for a database GET), which crashes n8n nodes that read fields like properties[*].type.',
		addedAt: '2026-05-08',
	},
];

/** Exact match on `${METHOD} ${pathname}` (case-insensitive), or any endpoint if `quirk.endpoint` is omitted. Exported for testing. */
export function quirkMatches(
	quirk: MockQuirk,
	service: string,
	method: string,
	pathname: string,
): boolean {
	if (quirk.service !== service) return false;
	if (!quirk.endpoint) return true;
	const key = `${method.toUpperCase()} ${pathname}`;
	return quirk.endpoint.toUpperCase() === key.toUpperCase();
}

/** Returns all matching guidance lines (composes service-wide + endpoint-specific). */
export function findMockQuirks(service: string, method: string, pathname: string): string[] {
	return MOCK_QUIRKS.filter((q) => quirkMatches(q, service, method, pathname)).map(
		(q) => q.guidance,
	);
}
