const URL_REGEXP =
	/(?:(?:https?|ftp):\/\/)(?:www\.)?((?:(?:[-\w]+\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::\d+)?(?:\/[^\s?#<>]*)?(?:\?[^\s#<>]*)?(?=([^\s]+#.*)?)#?[^\s<>]*/i;

// At the end of a match, these characters belong to the text around the URL.
const TRAILING_PUNCTUATION = '.,;:!?*"\'';

/**
 * Gives the first URL in a text. Gives `undefined` when the text has no URL.
 * The URL must start with `http://`, `https://` or `ftp://`.
 *
 * Follows the GFM autolink rule: punctuation at the end is not part of the URL,
 * and a `)` at the end stays only when its `(` is in the URL.
 * The URL ends at `<` or `>`, which a URL cannot contain.
 */
export function extractUrl(text: string): string | undefined {
	const matched = URL_REGEXP.exec(text);
	if (!matched) return undefined;

	// A URL that starts after a quote ends at the next quote of that type.
	const quote = text[matched.index - 1];
	const url = quote === '"' || quote === "'" ? matched[0].split(quote)[0] : matched[0];

	const count = (char: string) => url.split(char).length - 1;
	// A `)` with no `(` in the URL belongs to the text around the URL.
	let extraClosingParens = count(')') - count('(');
	for (let end = url.length; end > 0; end--) {
		const char = url[end - 1];
		if (char === ')' && extraClosingParens > 0) extraClosingParens--;
		else if (!TRAILING_PUNCTUATION.includes(char)) return url.slice(0, end);
	}

	// Not reachable: a match starts with the protocol, which the loop keeps.
	return undefined;
}
