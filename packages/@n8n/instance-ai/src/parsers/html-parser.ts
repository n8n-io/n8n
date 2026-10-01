import {
	MAX_DECODED_SIZE_BYTES,
	MAX_RESULT_CHARS,
	formatSizeLimitMessage,
	type AttachmentInfo,
} from './structured-file-parser';

export interface HtmlExtractionResult {
	text: string;
	title?: string;
	truncated: boolean;
}

const STRIPPABLE_TAGS = ['script', 'style', 'noscript', 'iframe', 'object', 'embed'];

interface StrippableElement {
	remove(): void;
}

interface StrippableDocument {
	querySelector(selector: string): { textContent?: string | null } | null;
	querySelectorAll(selector: string): Iterable<StrippableElement>;
	body?: { innerHTML?: string };
}

/**
 * Extracts main content from an HTML/XHTML attachment.
 *
 * Pipeline:
 *   linkedom (`parseHTML`) → strip script/style → turndown (markdown)
 *
 * We avoid Readability here to keep the type surface small (no DOM typings
 * pulled in). The body content is converted directly to markdown.
 */
export async function extractHtmlContent(
	attachment: AttachmentInfo,
): Promise<HtmlExtractionResult> {
	const decoded = Buffer.from(attachment.data, 'base64');
	if (decoded.length > MAX_DECODED_SIZE_BYTES) {
		throw new Error(formatSizeLimitMessage(decoded.length));
	}

	const html = decoded.toString('utf-8');

	const linkedom = await import('linkedom');
	const TurndownModule = await import('turndown');
	const TurndownService = TurndownModule.default;

	const dom = linkedom.parseHTML(html) as { document: StrippableDocument };
	const htmlDocument: StrippableDocument = dom.document;

	const title = htmlDocument.querySelector('title')?.textContent?.trim() ?? undefined;

	for (const tag of STRIPPABLE_TAGS) {
		for (const el of Array.from(htmlDocument.querySelectorAll(tag))) {
			el.remove();
		}
	}

	const sourceHtml = htmlDocument.body?.innerHTML ?? '';
	const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
	const markdown = turndown.turndown(sourceHtml).trim();

	if (!markdown) {
		throw new Error(`HTML "${attachment.fileName}" contains no extractable text.`);
	}

	if (markdown.length > MAX_RESULT_CHARS) {
		return { text: markdown.slice(0, MAX_RESULT_CHARS), title, truncated: true };
	}

	return { text: markdown, title, truncated: false };
}
