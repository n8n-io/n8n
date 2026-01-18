/**
 * Markdown Node Types
 *
 * Convert data between Markdown and HTML
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/markdown/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Convert data from Markdown to HTML */
export type MarkdownV1MarkdownToHtmlConfig = {
	mode: 'markdownToHtml';
	/**
	 * The Markdown to be converted to html
	 */
	markdown: string | Expression<string>;
	/**
	 * The field to put the output in. Specify nested fields using dots, e.g."level1.level2.newKey".
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
	 */
	html: string | Expression<string>;
	/**
	 * The field to put the output in. Specify nested fields using dots, e.g."level1.level2.newKey".
	 * @default data
	 */
	destinationKey: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type MarkdownV1Params = MarkdownV1MarkdownToHtmlConfig | MarkdownV1HtmlToMarkdownConfig;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type MarkdownV1Node = {
	type: 'n8n-nodes-base.markdown';
	version: 1;
	config: NodeConfig<MarkdownV1Params>;
	credentials?: Record<string, never>;
};

export type MarkdownNode = MarkdownV1Node;
