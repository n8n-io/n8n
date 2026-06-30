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

/**
 * Wrap untrusted data (fetched web pages, search snippets, execution output,
 * file content) in boundary tags so the LLM treats it as data, not
 * instructions.
 *
 * The only content rewrite this performs is escaping closing
 * `</untrusted_data>` sequences to prevent breakout — HTML comments and
 * invisible Unicode are preserved (they may be meaningful in execution/file
 * contexts). For fetched web content, callers should pass the body through
 * `sanitizeWebContent` first to strip those.
 */
export function wrapUntrustedData(content: string, source: string, label?: string): string {
	const safeSource = source
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	const safeLabel = label
		? ` label="${label.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"`
		: '';
	// Escape any closing boundary tags in the content to prevent breakout
	const safeContent = content.replace(/<\/untrusted_data/gi, '&lt;/untrusted_data');
	return `<untrusted_data source="${safeSource}"${safeLabel}>\n${safeContent}\n</untrusted_data>`;
}
