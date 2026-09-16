import { scrubSecretsInText } from '../scrub-secrets';

// A delimiter quote ends a quoted URL. An escaped quote stays inside the query.
// An apostrophe inside a word also stays inside the query. A bare URL ends at
// whitespace or an angle bracket. The optional query group matches URLs with and
// without queries in one pass.
const QUOTED_URL_QUERY =
	/(["'])(https?:\/\/(?:(?!\1)[^\s?<>])+)(?:\?(?:\\.|(?!\1(?!\w))[^\s<>\\])*)?/gi;
const BARE_URL_QUERY = /(https?:\/\/[^\s?<>]+)(?:\?[^\s<>]*)?/gi;

export function sanitizeErrorDetail(message: string, maxLength: number): string {
	return scrubSecretsInText(message)
		.replace(QUOTED_URL_QUERY, '$1$2')
		.replace(BARE_URL_QUERY, '$1')
		.slice(0, maxLength);
}
