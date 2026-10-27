/* eslint-disable @typescript-eslint/consistent-type-imports */
import { computed } from 'vue';
import type MarkdownIt from 'markdown-it';
import markdownItKatex from '@vscode/markdown-it-katex';
import markdownItFootnote from 'markdown-it-footnote';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import 'katex/dist/katex.min.css';
import type StateCore from 'markdown-it/lib/rules_core/state_core';

type FootnoteEnv = {
	footnotes?: { list?: Array<{ label?: string; count?: number; content?: string }> };
};

export function shouldOpenChatMarkdownLinkInNewTab(href: string): boolean {
	const normalizedHref = href.trim().toLowerCase();

	if (!normalizedHref) return false;
	if (normalizedHref.startsWith('#')) return false;
	if (normalizedHref.startsWith('/')) return normalizedHref.startsWith('//');
	if (normalizedHref.startsWith('./') || normalizedHref.startsWith('../')) return false;

	return /^[a-z][a-z0-9+.-]*:/.test(normalizedHref);
}

/**
 * To render streamed content cleanly, strip orphaned [^label] references that have no matching definition.
 * markdown-it-footnote only creates footnote_ref tokens for resolved references; unresolved ones remain as literal text.
 */
function hideOrphanFootnoteRefs(state: StateCore) {
	for (const token of state.tokens) {
		if (token.type === 'inline' && token.children) {
			for (const child of token.children) {
				if (child.type === 'text') {
					child.content = child.content.replace(/\[\^[^\]]+\]/g, '');
				}
			}
		}
	}
}

/**
 * footnote_tail puts content into the main token stream, not into env.footnotes.list.
 * This rule runs after footnote_tail and backfills list[id].content from the token stream.
 */
function footnoteContentExtractor(state: StateCore) {
	const list = (state.env as FootnoteEnv).footnotes?.list;
	if (!list) return;

	let currentId = -1;
	for (const token of state.tokens) {
		if (token.type === 'footnote_open') {
			currentId = token.meta.id;
		} else if (token.type === 'inline' && currentId >= 0) {
			if (!list[currentId].content) {
				list[currentId].content = token.content;
			}
			currentId = -1;
		} else if (token.type === 'footnote_close') {
			currentId = -1;
		}
	}
}

export interface ChatMarkdownOptions {
	math?: boolean;
	footnotes?: 'pill' | 'normal' | false;
}

export function useChatMarkdownOptions(
	config: ChatMarkdownOptions = {},
	tableContainerClassName = 'n8n-markdown-table-container',
	footnoteRefClassName: string | null = 'n8n-markdown-footnote-ref',
) {
	const options = { breaks: true, linkify: true };

	const plugins = computed(() => {
		const linksNewTabPlugin = (vueMarkdownItInstance: MarkdownIt) => {
			const defaultLinkOpenRenderer =
				vueMarkdownItInstance.renderer.rules.link_open ??
				((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

			vueMarkdownItInstance.renderer.rules.link_open = (tokens, idx, options, env, self) => {
				const href = tokens[idx].attrGet('href');

				if (href && shouldOpenChatMarkdownLinkInNewTab(href)) {
					tokens[idx].attrSet('target', '_blank');
					tokens[idx].attrSet('rel', 'noopener');
				}

				return defaultLinkOpenRenderer(tokens, idx, options, env, self);
			};
		};

		const tablePlugin = (vueMarkdownItInstance: MarkdownIt) => {
			const defaultTableOpenRenderer = vueMarkdownItInstance.renderer.rules.table_open;
			const defaultTableCloseRenderer = vueMarkdownItInstance.renderer.rules.table_close;

			vueMarkdownItInstance.renderer.rules.table_open = (tokens, idx, options, env, self) => {
				const defaultRendered =
					defaultTableOpenRenderer?.(tokens, idx, options, env, self) ??
					self.renderToken(tokens, idx, options);

				return defaultRendered.replace('<table', `<div class="${tableContainerClassName}"><table`);
			};
			vueMarkdownItInstance.renderer.rules.table_close = (tokens, idx, options, env, self) => {
				const defaultRendered =
					defaultTableCloseRenderer?.(tokens, idx, options, env, self) ??
					self.renderToken(tokens, idx, options);

				return defaultRendered.replace('</table>', '</table></div>');
			};
		};

		const mathPlugin = (vueMarkdownItInstance: MarkdownIt) => {
			const katexPlugin =
				(markdownItKatex as typeof markdownItKatex & { default?: typeof markdownItKatex })
					.default ?? markdownItKatex;
			vueMarkdownItInstance.use(katexPlugin, { throwOnError: false });
		};

		const footnotePlugin = (md: MarkdownIt) => {
			md.use(markdownItFootnote);

			md.core.ruler.push('hide_orphan_footnote_refs', hideOrphanFootnoteRefs);

			if (!footnoteRefClassName || config.footnotes === 'normal') return;

			md.core.ruler.push('footnote_content_extractor', footnoteContentExtractor);

			md.renderer.rules.footnote_ref = (tokens, idx, _options, env) => {
				const id = tokens[idx].meta.id;
				const content = (env as FootnoteEnv).footnotes?.list?.[id]?.content;
				const text = content ?? String(id + 1);
				const truncated = truncateBeforeLast(text, 25, 11, 4);
				const escapedFull = md.utils.escapeHtml(text);
				const escapedTruncated = md.utils.escapeHtml(truncated);
				return `<span class="${footnoteRefClassName}" title="${escapedFull}">${escapedTruncated}</span>`;
			};

			/** The sanitizer preserves this class. The chat hides the block with CSS. */
			md.renderer.rules.footnote_block_open = () => '<div class="n8n-markdown-footnote-block">';
			md.renderer.rules.footnote_block_close = () => '</div>';
			md.renderer.rules.footnote_open = () => '';
			md.renderer.rules.footnote_close = () => '';
			md.renderer.rules.footnote_anchor = () => '';
		};

		return [
			linksNewTabPlugin,
			tablePlugin,
			...(config.math ? [mathPlugin] : []),
			...(config.footnotes ? [footnotePlugin] : []),
		];
	});

	return { options, plugins };
}
