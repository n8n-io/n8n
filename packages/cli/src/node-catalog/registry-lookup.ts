/**
 * Precise lookup of verified community nodes in the n8n registry.
 *
 * The alternative is a local fuzzy index over the whole registry, which is
 * built for recall: it always finds something, so a query like "slack" comes
 * back with unrelated packages and has to be filtered by a hand-tuned gate.
 * Matching on word starts instead gives the precision this needs. Asked for a
 * service by name it answers with that service or with nothing, and "nothing"
 * is the right answer most of the time.
 *
 * Only `name` and `displayName` are matched, so reach is limited to queries
 * that name the service ("firecrawl"). A capability query ("scrape a website")
 * deliberately returns nothing: descriptions are free-text marketing copy and
 * matching them was never measured.
 */

/** Registry fields a query is matched against. */
export interface RegistryEntryFields {
	name: string;
	displayName?: string;
}

/** A registry entry as far as matching and ranking are concerned. */
export interface RegistryCandidate extends RegistryEntryFields {
	numberOfDownloads?: number;
}

/**
 * Terms shorter than this match inside unrelated words: "if" hits "apify",
 * "set" hits "baseten". Anything this short is also a core-node query the
 * registry has no business answering.
 */
const MIN_TERM_LENGTH = 3;

/** Words that appear in so many package names they select nothing. */
const STOP_WORDS = new Set([
	'and',
	'api',
	'app',
	'for',
	'from',
	'n8n',
	'node',
	'nodes',
	'official',
	'the',
	'tool',
	'with',
]);

/** Most registry nodes offered for a single query. */
const MAX_REGISTRY_MATCHES = 3;

/**
 * Split a query into lowercase alphanumeric words.
 *
 * Deliberately *not* camelCase aware, unlike candidate names: a query is
 * written by a person or relayed from one, so "OpenAI" is one word. Splitting
 * it would search for "open" and match OpenInbox and Open Banking.
 */
export const registryQueryTerms = (query: string): string[] => {
	const seen = new Set(
		query
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((term) => term.length >= MIN_TERM_LENGTH && !STOP_WORDS.has(term)),
	);
	return [...seen];
};

/** Candidate names split into words, camelCase aware: `braveSearch` -> brave, search. */
const candidateTokens = (entry: RegistryEntryFields): string[] =>
	[entry.name, entry.displayName ?? '']
		.join(' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean);

/**
 * Whether an entry answers the query. `terms` must come from
 * {@link registryQueryTerms}, which guarantees they are lowercase alphanumeric.
 *
 * Every term must start a word of the entry's name. Anchoring at word starts
 * rather than matching anywhere is what stops "Box" answering with OpenInbox
 * and "Git" with Digitalsac; substring matching produced most of the false hits
 * this had before.
 *
 * A multi-word query also matches when its words run together in the entry's
 * name, so "fire crawl" still finds Firecrawl. That relaxation is limited to
 * multi-word queries because for a single word it is just substring matching
 * again.
 */
export function matchesRegistryQuery(entry: RegistryEntryFields, terms: string[]): boolean {
	if (terms.length === 0) return false;
	const tokens = candidateTokens(entry);

	if (terms.every((term) => tokens.some((token) => token.startsWith(term)))) return true;

	if (terms.length > 1) {
		const joined = terms.join('');
		return tokens.some((token) => token.includes(joined));
	}

	return false;
}

/**
 * Rank matches so the most direct answer leads: an exact display-name match,
 * then one whose display name starts with the query, then by adoption.
 */
export function rankRegistryMatches<T extends RegistryCandidate>(query: string, matches: T[]): T[] {
	const normalized = query.trim().toLowerCase();

	const rank = (entry: T): number => {
		const displayName = (entry.displayName ?? '').toLowerCase();
		if (displayName === normalized) return 0;
		if (displayName.startsWith(normalized)) return 1;
		return 2;
	};

	return [...matches].sort(
		(a, b) => rank(a) - rank(b) || (b.numberOfDownloads ?? 0) - (a.numberOfDownloads ?? 0),
	);
}

/**
 * Registry nodes that answer the query, best first, capped. The one entry point
 * callers need; the pieces above are exported for tests and for the offline
 * calibration harness.
 */
export function findRegistryMatches<T extends RegistryCandidate>(
	query: string,
	candidates: T[],
): T[] {
	const terms = registryQueryTerms(query);
	if (terms.length === 0) return [];

	const matches = candidates.filter((candidate) => matchesRegistryQuery(candidate, terms));
	return rankRegistryMatches(query, matches).slice(0, MAX_REGISTRY_MATCHES);
}
