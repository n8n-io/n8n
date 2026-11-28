const URL_REGEXP =
	/(?:(?:https?|ftp):\/\/)(?:www\.)?((?:(?:[-\w]+\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::\d+)?(?:\/[^\s?#]*)?(?:\?[^\s#]*)?(?=([^\s]+#.*)?)#?[^\s]*/i;

// These characters delimit a URL in a text. They are never part of it.
const DELIMITERS = /[<>"]/;

// At the end of a URL, these characters usually belong to the sentence.
const SENTENCE_PUNCTUATION = '.,;:!?';

/**
 * Gives the indexes of the `)` characters that the URL does not open.
 */
function findUnmatchedClosings(url: string): Set<number> {
	const unmatchedClosings = new Set<number>();
	let openParentheses = 0;
	for (let index = 0; index < url.length; index++) {
		if (url[index] === '(') openParentheses++;
		if (url[index] !== ')') continue;
		if (openParentheses > 0) openParentheses--;
		else unmatchedClosings.add(index);
	}
	return unmatchedClosings;
}

/**
 * Removes the sentence punctuation and the unmatched `)` characters from the
 * end of the URL. Characters in the middle of the URL stay.
 */
function trimEnd(url: string): string {
	const unmatchedClosings = findUnmatchedClosings(url);
	let end = url.length;
	while (end > 0) {
		const isUnmatchedClosing = unmatchedClosings.has(end - 1);
		if (!isUnmatchedClosing && !SENTENCE_PUNCTUATION.includes(url[end - 1])) break;
		end--;
	}
	return url.slice(0, end);
}

/**
 * Gives the first URL in a text. Gives `undefined` when the text has no URL.
 * The URL must start with `http://`, `https://` or `ftp://`.
 */
export function extractUrl(text: string): string | undefined {
	const matched = URL_REGEXP.exec(text);
	if (!matched) return undefined;

	return trimEnd(matched[0].split(DELIMITERS)[0]);
}
