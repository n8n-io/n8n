const MARKDOWN_BLOCK_SEPARATOR = '\n\n';

/** Adds the text as a new markdown block after the content. Empty content gives the text alone. */
export function appendMarkdownBlock(content: string, text: string): string {
	const existing = content.trimEnd();
	return existing === '' ? text : `${existing}${MARKDOWN_BLOCK_SEPARATOR}${text}`;
}
