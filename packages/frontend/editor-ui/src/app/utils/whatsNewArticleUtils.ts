/**
 * The body of a what's new article is markdown with inline HTML, written for
 * the full-width panel. The sidebar card shows only its first image.
 */

const MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*<?(https?:\/\/[^\s)>]+)[^)]*\)/i;
const HTML_IMAGE = /<img\b[^>]*\bsrc\s*=\s*["'](https?:\/\/[^"']+)["']/i;

/** First image in the article body, or `undefined` when it has none. */
export function getWhatsNewArticleImage(content: string): string | undefined {
	return MARKDOWN_IMAGE.exec(content)?.[1] ?? HTML_IMAGE.exec(content)?.[1];
}

/**
 * A link that ends the article, like `[Learn more](https://…)`, whether it
 * stands alone or closes the last sentence. The optional `"title"` part of a
 * markdown link is accepted and dropped.
 */
const TRAILING_LINK = /(?:^|\s)\[([^\]\n]+)\]\(\s*<?(https?:\/\/[^\s)>]+)>?(?:\s+"[^"]*")?\s*\)$/i;

export interface WhatsNewArticleCta {
	label: string;
	href: string;
}

/**
 * Split the article's call to action off its body. The link that ends the
 * article is the call to action; the panel renders it as a button. A link
 * followed by more text, even a full stop, stays in the body.
 */
export function splitWhatsNewArticleCta(content: string): {
	body: string;
	cta?: WhatsNewArticleCta;
} {
	const trimmed = content.trimEnd();
	const match = TRAILING_LINK.exec(trimmed);
	if (!match) return { body: content };

	return {
		body: trimmed.slice(0, match.index).trimEnd(),
		cta: { label: match[1].trim().replace(/\.$/, ''), href: match[2] },
	};
}
