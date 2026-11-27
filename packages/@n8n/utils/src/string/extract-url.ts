const URL_REGEXP =
	/(?:(?:https?|ftp):\/\/)(?:www\.)?((?:(?:[-\w]+\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::\d+)?(?:\/[^\s?#]*)?(?:\?[^\s#]*)?(?=([^\s]+#.*)?)#?[^\s]*/i;

// RFC 3986, Appendix C: these characters delimit a URL in a text. They are never part of it.
const DELIMITERS = '<>"';

/**
 * Gives the index where the URL stops. RFC 3986 permits `(` and `)` in a URL,
 * so a `)` stops the URL only when the URL does not open it.
 */
function findUrlEnd(candidate: string): number {
	let openParentheses = 0;
	for (let index = 0; index < candidate.length; index++) {
		const char = candidate[index];
		if (DELIMITERS.includes(char)) return index;
		if (char === '(') openParentheses++;
		if (char === ')') {
			if (openParentheses === 0) return index;
			openParentheses--;
		}
	}
	return candidate.length;
}

/**
 * Gives the first URL in a text. Gives `undefined` when the text has no URL.
 * The URL must start with `http://`, `https://` or `ftp://`.
 */
export function extractUrl(text: string): string | undefined {
	const matched = URL_REGEXP.exec(text);
	if (!matched) return undefined;

	return matched[0].slice(0, findUrlEnd(matched[0]));
}
