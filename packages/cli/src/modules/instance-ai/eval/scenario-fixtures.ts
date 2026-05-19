/**
 * Scenario-pinned binary fixtures for the eval mock layer (TRUST-100, Step 4).
 *
 * Scenario authors can pin specific bytes to specific requests via a top-level
 * `mockFixtures` array in their scenario JSON. When a request matches, the
 * mock layer returns those exact bytes (with the declared content-type and
 * filename) instead of asking the LLM to pick one — essential for verifiers
 * that text-match against transcripts (Telegram voice → Whisper) or compare
 * file hashes.
 *
 * Precedence (highest first):
 *   1. Scenario-pinned fixture (this module)
 *   2. LLM `type: "binary"` response with quirks-driven content type
 *   3. LLM `type: "json"` response
 *
 * Note: this module never touches the filesystem. The scenario loader is
 * responsible for resolving any `fixture.path` references to a `Buffer`
 * before passing the array into the mock handler.
 */

import { z } from 'zod';

/** Matcher applied to the intercepted HTTP request. All fields are ANDed. */
export const fixtureMatchSchema = z.object({
	/** n8n node name that issued the request. Exact match. */
	nodeName: z.string().optional(),
	/** Glob pattern matched against the full request URL. `*` matches any chars except `/`; `**` matches across path separators. */
	url: z.string().optional(),
	/** HTTP method. Exact match, case-insensitive. */
	method: z.string().optional(),
});

export const scenarioMockFixtureSchema = z.object({
	match: fixtureMatchSchema,
	contentType: z.string().describe('MIME type to use for the synthesized response.'),
	filename: z.string().describe('Filename to use for content-disposition.'),
	/** Resolved fixture bytes — the scenario loader reads `fixture.path` into a Buffer before getting here. */
	bytes: z.instanceof(Buffer),
	/** Optional override HTTP status code. Defaults to 200. */
	statusCode: z.number().int().optional(),
});

export type FixtureMatch = z.infer<typeof fixtureMatchSchema>;
export type ScenarioMockFixture = z.infer<typeof scenarioMockFixtureSchema>;

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

interface RequestContext {
	nodeName: string;
	url: string;
	method: string;
}

/**
 * Find the FIRST fixture in the array whose matcher applies to this request.
 * Order in the scenario JSON defines precedence — earlier wins.
 */
export function resolveScenarioFixture(
	fixtures: readonly ScenarioMockFixture[] | undefined,
	request: RequestContext,
): ScenarioMockFixture | undefined {
	if (!fixtures || fixtures.length === 0) return undefined;
	for (const fixture of fixtures) {
		if (matchesRequest(fixture.match, request)) return fixture;
	}
	return undefined;
}

function matchesRequest(match: FixtureMatch, request: RequestContext): boolean {
	if (match.nodeName !== undefined && match.nodeName !== request.nodeName) return false;
	if (match.method !== undefined && match.method.toUpperCase() !== request.method.toUpperCase()) {
		return false;
	}
	if (match.url !== undefined && !globMatch(match.url, request.url)) return false;
	return true;
}

/**
 * Glob match against a URL. Supported wildcards:
 *   `*`  — zero or more chars except `/`
 *   `**` — zero or more chars across path separators
 *   `?`  — exactly one char
 *
 * Anchored at both ends. Bracket/brace expansions are intentionally not
 * supported — keep the grammar predictable and the regex simple.
 */
export function globMatch(pattern: string, value: string): boolean {
	let regex = '';
	for (let i = 0; i < pattern.length; i++) {
		const c = pattern[i];
		if (c === '*' && pattern[i + 1] === '*') {
			regex += '.*';
			i++;
		} else if (c === '*') {
			regex += '[^/]*';
		} else if (c === '?') {
			regex += '[^/]';
		} else if (/[.+^${}()|[\]\\]/.test(c)) {
			regex += '\\' + c;
		} else {
			regex += c;
		}
	}
	return new RegExp(`^${regex}$`).test(value);
}
