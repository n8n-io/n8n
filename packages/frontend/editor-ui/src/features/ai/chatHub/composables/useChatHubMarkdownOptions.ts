/* eslint-disable @typescript-eslint/consistent-type-imports */
import { type HLJSApi } from 'highlight.js';
import { computed, ref } from 'vue';
import type MarkdownIt from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';
import markdownItKatex from '@vscode/markdown-it-katex';
import markdownItFootnote from 'markdown-it-footnote';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import 'katex/dist/katex.min.css';
import type StateCore from 'markdown-it/lib/rules_core/state_core';

let hljsInstance: HLJSApi | undefined;
let asyncImport:
	| {
			status: 'inProgress';
			promise: Promise<[typeof import('highlight.js'), typeof import('./languageModules')]>;
	  }
	| { status: 'uninitialized' }
	| { status: 'done' } = { status: 'uninitialized' };

type FootnoteEnv = {
	footnotes?: { list?: Array<{ label?: string; count?: number; content?: string }> };
};

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

export function useChatHubMarkdownOptions(
	codeBlockActionsClassName: string,
	tableContainerClassName: string,
	footnoteRefClassName: string | null,
) {
	const forceReRenderKey = ref(0);
	const codeBlockContents = ref<Map<string, string>>();

	const options = {
		breaks: true,
		highlight(str: string, lang: string) {
			if (!lang) {
				return ''; // use external default escaping
			}

			const normalizedLang = lang.toLowerCase();

			if (hljsInstance?.getLanguage(normalizedLang)) {
				try {
					return hljsInstance.highlight(str, { language: normalizedLang }).value;
				} catch {}
			}

			void loadLanguageModules();

			return '';
		},
	};

	async function loadLanguageModules() {
		if (asyncImport.status === 'done') {
			return;
		}

		if (asyncImport.status === 'inProgress') {
			await asyncImport.promise;
			forceReRenderKey.value++;
			return;
		}

		try {
			const promise = Promise.all([import('highlight.js'), import('./languageModules')]);

			asyncImport = { status: 'inProgress', promise };

			const [hljs, languages] = await asyncImport.promise;

			asyncImport = { status: 'done' };
			hljsInstance = hljs.default.newInstance();

			for (const [lang, module] of Object.entries(languages)) {
				hljsInstance.registerLanguage(lang, module);
			}

			forceReRenderKey.value++;
		} catch (error) {
			console.warn('Failed to load syntax highlighting modules', error);
		}
	}

	const plugins = computed(() => {
		const linksNewTabPlugin = (vueMarkdownItInstance: MarkdownIt) => {
			vueMarkdownItInstance.use(markdownLink, {
				attrs: {
					target: '_blank',
					rel: 'noopener',
				},
			});
		};

		const codeBlockPlugin = (vueMarkdownItInstance: MarkdownIt) => {
			const defaultFenceRenderer = vueMarkdownItInstance.renderer.rules.fence;

			codeBlockContents.value = new Map();

			vueMarkdownItInstance.renderer.rules.fence = (tokens, idx, options, env, self) => {
				const defaultRendered =
					defaultFenceRenderer?.(tokens, idx, options, env, self) ??
					self.renderToken(tokens, idx, options);

				const content = tokens[idx]?.content.trim();

				if (content) {
					codeBlockContents.value?.set(String(idx), content);
				}

				return defaultRendered.replace(
					'<pre>',
					`<pre><div data-markdown-token-idx="${idx}" class="${codeBlockActionsClassName}"></div>`,
				);
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

			if (!footnoteRefClassName) return;

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

			// Hide the footnote block — the pill is the only UI for footnote content
			md.renderer.rules.footnote_block_open = () => '<div style="display:none" aria-hidden="true">';
			md.renderer.rules.footnote_block_close = () => '</div>';
			md.renderer.rules.footnote_open = () => '';
			md.renderer.rules.footnote_close = () => '';
			md.renderer.rules.footnote_anchor = () => '';
		};

		return [linksNewTabPlugin, codeBlockPlugin, tablePlugin, mathPlugin, footnotePlugin];
	});

	return { options, forceReRenderKey, plugins, codeBlockContents };
}
