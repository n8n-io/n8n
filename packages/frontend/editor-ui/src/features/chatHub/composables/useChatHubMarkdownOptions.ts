import { useThrottle } from '@vueuse/core';
import hljs from 'highlight.js';
import { ref } from 'vue';

const attemptedLanguages = new Set<string>();
const hljsInstance = hljs.newInstance();

export function useChatHubMarkdownOptions() {
	const forceReRenderKey = ref(0);
	const throttledForceReRenderKey = useThrottle(forceReRenderKey, 100);

	const markdownOptions = {
		highlight(str: string, lang: string) {
			if (!lang) {
				return ''; // use external default escaping
			}

			if (hljsInstance.getLanguage(lang)) {
				try {
					return hljsInstance.highlight(str, { language: lang }).value;
				} catch {}
			}

			void importLanguage(lang);

			return '';
		},
	};

	async function importLanguage(lang: string) {
		if (attemptedLanguages.has(lang)) {
			return;
		}

		attemptedLanguages.add(lang);

		try {
			let mod;
			switch (lang.toLowerCase()) {
				case 'bash':
				case 'sh':
				case 'zsh':
					mod = await import('highlight.js/lib/languages/bash');
					break;
				case 'c':
					mod = await import('highlight.js/lib/languages/c');
					break;
				case 'cpp':
				case 'c++':
				case 'cc':
				case 'cxx':
					mod = await import('highlight.js/lib/languages/cpp');
					break;
				case 'csharp':
				case 'c#':
				case 'cs':
					mod = await import('highlight.js/lib/languages/csharp');
					break;
				case 'css':
					mod = await import('highlight.js/lib/languages/css');
					break;
				case 'dart':
					mod = await import('highlight.js/lib/languages/dart');
					break;
				case 'diff':
				case 'patch':
					mod = await import('highlight.js/lib/languages/diff');
					break;
				case 'dockerfile':
				case 'docker':
					mod = await import('highlight.js/lib/languages/dockerfile');
					break;
				case 'elixir':
					mod = await import('highlight.js/lib/languages/elixir');
					break;
				case 'go':
				case 'golang':
					mod = await import('highlight.js/lib/languages/go');
					break;
				case 'graphql':
				case 'gql':
					mod = await import('highlight.js/lib/languages/graphql');
					break;
				case 'groovy':
					mod = await import('highlight.js/lib/languages/groovy');
					break;
				case 'haskell':
				case 'hs':
					mod = await import('highlight.js/lib/languages/haskell');
					break;
				case 'ini':
				case 'toml':
					mod = await import('highlight.js/lib/languages/ini');
					break;
				case 'java':
					mod = await import('highlight.js/lib/languages/java');
					break;
				case 'javascript':
				case 'js':
				case 'jsx':
				case 'mjs':
				case 'cjs':
					mod = await import('highlight.js/lib/languages/javascript');
					break;
				case 'json':
					mod = await import('highlight.js/lib/languages/json');
					break;
				case 'kotlin':
				case 'kt':
				case 'kts':
					mod = await import('highlight.js/lib/languages/kotlin');
					break;
				case 'less':
					mod = await import('highlight.js/lib/languages/less');
					break;
				case 'lua':
					mod = await import('highlight.js/lib/languages/lua');
					break;
				case 'makefile':
				case 'make':
				case 'mk':
					mod = await import('highlight.js/lib/languages/makefile');
					break;
				case 'markdown':
				case 'md':
				case 'mkdown':
				case 'mkd':
					mod = await import('highlight.js/lib/languages/markdown');
					break;
				case 'nginx':
				case 'nginxconf':
					mod = await import('highlight.js/lib/languages/nginx');
					break;
				case 'objectivec':
				case 'objective-c':
				case 'objc':
				case 'obj-c':
					mod = await import('highlight.js/lib/languages/objectivec');
					break;
				case 'perl':
				case 'pl':
				case 'pm':
					mod = await import('highlight.js/lib/languages/perl');
					break;
				case 'php':
					mod = await import('highlight.js/lib/languages/php');
					break;
				case 'plaintext':
				case 'text':
				case 'txt':
					mod = await import('highlight.js/lib/languages/plaintext');
					break;
				case 'powershell':
				case 'ps':
				case 'ps1':
					mod = await import('highlight.js/lib/languages/powershell');
					break;
				case 'python':
				case 'py':
				case 'gyp':
					mod = await import('highlight.js/lib/languages/python');
					break;
				case 'r':
					mod = await import('highlight.js/lib/languages/r');
					break;
				case 'ruby':
				case 'rb':
				case 'gemspec':
				case 'podspec':
				case 'thor':
				case 'irb':
					mod = await import('highlight.js/lib/languages/ruby');
					break;
				case 'rust':
				case 'rs':
					mod = await import('highlight.js/lib/languages/rust');
					break;
				case 'scala':
					mod = await import('highlight.js/lib/languages/scala');
					break;
				case 'scss':
					mod = await import('highlight.js/lib/languages/scss');
					break;
				case 'shell':
				case 'console':
					mod = await import('highlight.js/lib/languages/shell');
					break;
				case 'sql':
					mod = await import('highlight.js/lib/languages/sql');
					break;
				case 'swift':
					mod = await import('highlight.js/lib/languages/swift');
					break;
				case 'typescript':
				case 'ts':
				case 'tsx':
					mod = await import('highlight.js/lib/languages/typescript');
					break;
				case 'vbnet':
				case 'vb':
					mod = await import('highlight.js/lib/languages/vbnet');
					break;
				case 'xml':
				case 'html':
				case 'xhtml':
				case 'rss':
				case 'atom':
				case 'xjb':
				case 'xsd':
				case 'xsl':
				case 'plist':
				case 'svg':
					mod = await import('highlight.js/lib/languages/xml');
					break;
				case 'yaml':
				case 'yml':
					mod = await import('highlight.js/lib/languages/yaml');
					break;
				default:
					// Language not supported
					return;
			}

			if (mod) {
				hljsInstance.registerLanguage(lang.toLowerCase(), mod.default);
				forceReRenderKey.value++;
			}
		} catch (error) {
			console.warn(`Failed to load syntax highlighting for language: ${lang}`, error);
		}
	}

	return { markdownOptions, forceReRenderKey: throttledForceReRenderKey };
}
