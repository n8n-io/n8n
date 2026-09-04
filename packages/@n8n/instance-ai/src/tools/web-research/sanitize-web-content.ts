/**
 * Sanitize web content before passing it to the LLM.
 *
 * Defends against indirect prompt injection by:
 * 1. Stripping HTML comments (common injection hiding spot)
 * 2. Removing zero-width and invisible Unicode characters
 * 3. Wrapping content in boundary tags so the LLM can distinguish
 *    external data from instructions
 */

import { stripInvisibleUnicode } from '@n8n/agents';

export { stripInvisibleUnicode, wrapUntrustedData } from '@n8n/agents';

/**
 * Strip HTML comments: <!-- ... -->
 *
 * Scanned with `indexOf` rather than `/<!--[\s\S]*?-->/g`: content carrying many
 * unclosed `<!--` markers makes that regex restart its search for a terminator
 * at every one of them, which costs time quadratic in the length of the
 * content. An unclosed marker is left in place, as the regex left it.
 */
function stripHtmlComments(text: string): string {
	let kept = '';
	let cursor = 0;

	for (;;) {
		const start = text.indexOf('<!--', cursor);
		if (start === -1) break;

		const end = text.indexOf('-->', start + 4);
		// Nothing closes this comment, so nothing closes a later one either —
		// the rest of the text is kept as it is.
		if (end === -1) break;

		kept += text.slice(cursor, start);
		cursor = end + 3;
	}

	return cursor === 0 ? text : kept + text.slice(cursor);
}

/** Sanitize raw web content: strip hidden content, remove invisible characters. */
export function sanitizeWebContent(content: string): string {
	return stripInvisibleUnicode(stripHtmlComments(content));
}
