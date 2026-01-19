/**
 * Markdown Node - Version 1
 * Convert data between Markdown and HTML
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Convert data from Markdown to HTML */
export type MarkdownV1MarkdownToHtmlConfig = {
	mode: 'markdownToHtml';
/**
 * The Markdown to be converted to html
 * @displayOptions.show { mode: ["markdownToHtml"] }
 */
		markdown: string | Expression<string>;
/**
 * The field to put the output in. Specify nested fields using dots, e.g."level1.level2.newKey".
 * @displayOptions.show { mode: ["markdownToHtml", "htmlToMarkdown"] }
 * @default data
 */
		destinationKey: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Convert data from HTML to Markdown */
export type MarkdownV1HtmlToMarkdownConfig = {
	mode: 'htmlToMarkdown';
/**
 * The HTML to be converted to markdown
 * @displayOptions.show { mode: ["htmlToMarkdown"] }
 */
		html: string | Expression<string>;
/**
 * The field to put the output in. Specify nested fields using dots, e.g."level1.level2.newKey".
 * @displayOptions.show { mode: ["markdownToHtml", "htmlToMarkdown"] }
 * @default data
 */
		destinationKey: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type MarkdownV1Params =
	| MarkdownV1MarkdownToHtmlConfig
	| MarkdownV1HtmlToMarkdownConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface MarkdownV1NodeBase {
	type: 'n8n-nodes-base.markdown';
	version: 1;
}

export type MarkdownV1MarkdownToHtmlNode = MarkdownV1NodeBase & {
	config: NodeConfig<MarkdownV1MarkdownToHtmlConfig>;
};

export type MarkdownV1HtmlToMarkdownNode = MarkdownV1NodeBase & {
	config: NodeConfig<MarkdownV1HtmlToMarkdownConfig>;
};

export type MarkdownV1Node =
	| MarkdownV1MarkdownToHtmlNode
	| MarkdownV1HtmlToMarkdownNode
	;