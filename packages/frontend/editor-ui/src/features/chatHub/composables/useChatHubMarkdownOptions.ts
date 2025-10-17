import { type HLJSApi } from 'highlight.js';
import { ref } from 'vue';

let hljsInstance: HLJSApi | undefined;
let languagesLoaded = false;

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
		if (languagesLoaded) {
			return;
		}

		languagesLoaded = true;

		try {
			const [hljs, languages] = await Promise.all([
				import('highlight.js'),
				import('./languageModules'),
			]);

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
