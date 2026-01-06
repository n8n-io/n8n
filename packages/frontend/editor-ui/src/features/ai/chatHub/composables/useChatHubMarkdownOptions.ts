/* eslint-disable @typescript-eslint/consistent-type-imports */
import { type HLJSApi } from 'highlight.js';
import { computed, ref } from 'vue';
import type MarkdownIt from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';
import { detectTexSyntax } from '../chat.utils';

type Loading<T> =
	| { status: 'inProgress'; promise: Promise<T> }
	| { status: 'uninitialized' }
	| { status: 'done' };

type HljsModules = [typeof import('highlight.js'), typeof import('./languageModules')];

type TexModules = [
	typeof import('markdown-it-texmath'),
	typeof import('katex'),
	typeof import('katex/dist/katex.min.css'),
];

let hljsInstance: HLJSApi | undefined;
let katexModules: TexModules | undefined;

const asyncImports: { hljs: Loading<HljsModules>; katex: Loading<TexModules> } = {
	hljs: { status: 'uninitialized' },
	katex: { status: 'uninitialized' },
};

type AsyncImports = typeof asyncImports;

export function useChatHubMarkdownOptions(
	codeBlockActionsClassName: string,
	tableContainerClassName: string,
) {
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

	const linksNewTabPlugin = (vueMarkdownItInstance: MarkdownIt) => {
		vueMarkdownItInstance.use(markdownLink, {
			attrs: {
				target: '_blank',
				rel: 'noopener',
			},
		});
	};

	async function loadLanguageModules() {
		await loadModules(
			'hljs',
			async () => await Promise.all([import('highlight.js'), import('./languageModules')]),
			([hljs, languages]) => {
				hljsInstance = hljs.default.newInstance();

				for (const [lang, module] of Object.entries(languages)) {
					hljsInstance.registerLanguage(lang, module);
				}
			},
		);
	}

	async function loadKatexModules() {
		await loadModules(
			'katex',
			async () =>
				await Promise.all([
					import('markdown-it-texmath'),
					import('katex'),
					import('katex/dist/katex.min.css'),
				]),
			(modules) => {
				katexModules = modules;
			},
		);
	}

	async function loadModules<
		K extends keyof AsyncImports,
		M extends AsyncImports[K] extends Loading<infer MM> ? MM : never,
	>(name: K, loader: () => Promise<M>, onReady: (modules: M) => void) {
		if (asyncImports[name].status === 'done') {
			return;
		}

		if (asyncImports[name].status === 'inProgress') {
			await asyncImports[name].promise;
			forceReRenderKey.value++;
			return;
		}

		try {
			const promise = loader();

			asyncImports[name] = { status: 'inProgress', promise } as AsyncImports[K];

			const modules = await promise;

			onReady(modules);
			asyncImports[name] = { status: 'done' };
			forceReRenderKey.value++;
		} catch (error) {
			console.warn(`Failed to load ${name} modules`, error);
		}
	}

	function texmathDetectorPlugin(md: MarkdownIt) {
		const originalRender = md.render.bind(md);

		md.render = (src: string, env?: unknown) => {
			if (detectTexSyntax(src)) {
				void loadKatexModules();
			}
			return originalRender(src, env);
		};
	}

	function texmathPlugin(md: MarkdownIt) {
		if (katexModules) {
			md.use(katexModules[0].default, {
				engine: katexModules[1].default,
			});
		} else {
			// If modules not loaded yet, register detector plugin
			texmathDetectorPlugin(md);
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

		return [linksNewTabPlugin, codeBlockPlugin, tablePlugin, texmathPlugin];
	});

	return {
		options,
		forceReRenderKey,
		plugins,
		codeBlockContents,
	};
}
