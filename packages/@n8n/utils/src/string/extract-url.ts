const URL_REGEXP =
	/(?:(?:https?|ftp):\/\/)(?:www\.)?((?:(?:[-\w]+\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::\d+)?(?:\/[^\s?#]*)?(?:\?[^\s#]*)?(?=([^\s]+#.*)?)#?[^\s]*/i;

// These characters delimit a URL in a text. They are never part of it.
const DELIMITERS = /[<>"]/;

// At the end of a URL, these characters usually belong to the sentence.
const SENTENCE_PUNCTUATION = '.,;:!?';

function count(text: string, char: string): number {
	return text.split(char).length - 1;
}

/**
 * Removes the sentence punctuation and the unmatched `)` characters from the
 * end of the URL. Characters in the middle of the URL stay.
 */
function trimEnd(url: string): string {
	let end = url.length;
	let unmatchedClosings = count(url, ')') - count(url, '(');
	while (end > 0) {
		const char = url[end - 1];
		if (char === ')' && unmatchedClosings > 0) unmatchedClosings--;
		else if (!SENTENCE_PUNCTUATION.includes(char)) break;
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
