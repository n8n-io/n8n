/* eslint-disable @typescript-eslint/consistent-type-imports */
import { type HLJSApi } from 'highlight.js';
import { ref } from 'vue';

let hljsInstance: HLJSApi | undefined;
let asyncImportPromise:
	| Promise<[typeof import('highlight.js'), typeof import('./languageModules')]>
	| undefined;

export function useChatHubMarkdownOptions() {
	const forceReRenderKey = ref(0);

	const markdownOptions = {
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
		if (asyncImportPromise) {
			await asyncImportPromise;
			forceReRenderKey.value++;
			return;
		}

		try {
			asyncImportPromise = Promise.all([import('highlight.js'), import('./languageModules')]);

			const [hljs, languages] = await asyncImportPromise;

			asyncImportPromise = undefined;
			hljsInstance = hljs.default.newInstance();

			for (const [lang, module] of Object.entries(languages)) {
				hljsInstance.registerLanguage(lang, module);
			}

			forceReRenderKey.value++;
		} catch (error) {
			console.warn('Failed to load syntax highlighting modules', error);
		}
	}

	return { markdownOptions, forceReRenderKey };
}
