/* eslint-disable @typescript-eslint/consistent-type-imports */
import { type HLJSApi } from 'highlight.js';
import { ref } from 'vue';

let hljsInstance: HLJSApi | undefined;
let asyncImport:
	| {
			status: 'inProgress';
			promise: Promise<[typeof import('highlight.js'), typeof import('./languageModules')]>;
	  }
	| { status: 'uninitialized' }
	| { status: 'done' } = { status: 'uninitialized' };

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

	return { markdownOptions, forceReRenderKey };
}
