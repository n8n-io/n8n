import { scrubSecretsInText } from '../scrub-secrets';

// A quoted URL ends at its closing quote, so a quote or apostrophe inside its
// query cannot cut the strip short and leak the rest of the query, while the
// text after the URL survives. A bare URL runs to whitespace or an angle
// bracket. The query group is optional so a URL without one is consumed in a
// single pass instead of backtracking through its whole span.
const QUOTED_URL_QUERY = /(["'])(https?:\/\/(?:(?!\1)[^\s?<>])+)(?:\?(?:(?!\1)[^\s<>])*)?/gi;
const BARE_URL_QUERY = /(https?:\/\/[^\s?<>]+)(?:\?[^\s<>]*)?/gi;

export function sanitizeErrorDetail(message: string, maxLength: number): string {
	return scrubSecretsInText(message)
		.replace(QUOTED_URL_QUERY, '$1$2')
		.replace(BARE_URL_QUERY, '$1')
		.slice(0, maxLength);
}
