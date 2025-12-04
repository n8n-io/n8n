/* eslint-disable @typescript-eslint/consistent-type-imports */
import { type HLJSApi } from 'highlight.js';
import { computed, ref } from 'vue';
import type MarkdownIt from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';

let hljsInstance: HLJSApi | undefined;
let asyncImport:
	| {
			status: 'inProgress';
			promise: Promise<[typeof import('highlight.js'), typeof import('./languageModules')]>;
	  }
	| { status: 'uninitialized' }
	| { status: 'done' } = { status: 'uninitialized' };

export function useChatHubMarkdownOptions(codeBlockActionsClassName: string) {
	const forceReRenderKey = ref(0);
	const codeBlockContents = ref<Map<string, string>>();

	const options = {
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
					'</pre>',
					`<div data-markdown-token-idx="${idx}" class="${codeBlockActionsClassName}"></div></pre>`,
				);
			};
		};
		return [linksNewTabPlugin, codeBlockPlugin];
	});

	return { options, forceReRenderKey, plugins, codeBlockContents };
}
