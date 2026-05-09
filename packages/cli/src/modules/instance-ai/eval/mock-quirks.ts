/**
 * Registry of known per-API mocking quirks the eval mock-handler injects
 * as additional guidance into the user prompt.
 *
 * Bar for adding an entry:
 *   - An eval scenario reproducibly fails due to a specific API quirk
 *   - The quirk is a documented behavior of the API we can cite
 *
 * Each entry should be a short decision rule, not a field-by-field template —
 * the actual response shape comes from the inlined API docs.
 */

export interface MockQuirk {
	/** Matched against the service name extracted from the request URL. */
	service: string;
	/**
	 * Optional `${METHOD} ${path}` pattern (path only — no query string, no host).
	 * Omit to apply to any endpoint of `service`.
	 */
	endpoint?: string;
	/** Guidance appended to the user prompt for matching mocks. */
	guidance: string;
	/** Why this entry exists — audit trail for future reviewers. */
	rationale: string;
	/** ISO date the entry was added. */
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

/**
 * Whether a quirk applies to a given request. A quirk with no `endpoint`
 * applies to any endpoint of `service`; otherwise the match is exact on
 * `${METHOD} ${pathname}` (case-insensitive on method, no globs).
 *
 * Exported for testing — callers should use `findMockQuirks`.
 */
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

/**
 * Returns the guidance lines that match a given request, or an empty array.
 * Multiple matching quirks compose — service-wide and endpoint-specific
 * guidance for the same request both fire.
 */
export function findMockQuirks(service: string, method: string, pathname: string): string[] {
	return MOCK_QUIRKS.filter((q) => quirkMatches(q, service, method, pathname)).map(
		(q) => q.guidance,
	);
}
