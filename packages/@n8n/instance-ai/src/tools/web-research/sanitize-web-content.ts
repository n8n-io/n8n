/**
 * Sanitize web content before passing it to the LLM.
 *
 * Defends against indirect prompt injection by:
 * 1. Stripping HTML comments (common injection hiding spot)
 * 2. Removing zero-width and invisible Unicode characters
 * 3. Wrapping content in boundary tags so the LLM can distinguish
 *    external data from instructions
 */

/** Strip HTML comments: <!-- ... --> */
function stripHtmlComments(text: string): string {
	return text.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Remove invisible Unicode characters that can hide prompt injection payloads.
 * Preserves normal whitespace (space, tab, newline) and common formatting.
 *
 * Targets: zero-width chars, soft hyphens, RTL/LTR marks, word joiners,
 * invisible separators, and Tag Characters block.
 */
const INVISIBLE_UNICODE_PATTERN =
	// eslint-disable-next-line no-misleading-character-class
	/[\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB\u00AD\u034F\u061C\u180E\u{E0001}\u{E0020}-\u{E007F}]/gu;

function stripInvisibleUnicode(text: string): string {
	return text.replace(INVISIBLE_UNICODE_PATTERN, '');
}

/** Sanitize raw web content: strip hidden content, remove invisible characters. */
export function sanitizeWebContent(content: string): string {
	return stripInvisibleUnicode(stripHtmlComments(content));
}

/** Wrap content in boundary tags to reinforce the untrusted-content boundary for the LLM. */
export function wrapInBoundaryTags(content: string, url: string): string {
	return `<web_content source="external" url="${url}">\n${content}\n</web_content>`;
}
