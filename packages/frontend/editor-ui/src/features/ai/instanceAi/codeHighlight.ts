import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import scss from 'highlight.js/lib/languages/scss';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const LANGUAGE_MODULES: Record<string, typeof javascript> = {
	bash,
	css,
	html: xml,
	javascript,
	json,
	markdown,
	python,
	scss,
	typescript,
	xml,
	yaml,
};

let languagesRegistered = false;

function ensureLanguagesRegistered() {
	if (languagesRegistered) return;
	for (const [name, module] of Object.entries(LANGUAGE_MODULES)) {
		if (!hljs.getLanguage(name)) {
			hljs.registerLanguage(name, module);
		}
	}
	languagesRegistered = true;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Returns highlighted HTML, or undefined when highlighting is unavailable. */
export function highlightCode(code: string, language: string | undefined): string | undefined {
	if (!language || language === 'plaintext') return undefined;

	ensureLanguagesRegistered();
	if (!hljs.getLanguage(language)) return undefined;

	try {
		return hljs.highlight(code, { language, ignoreIllegals: true }).value;
	} catch {
		return undefined;
	}
}

/** Per-line highlight for diff rows. Falls back to escaped plain text. */
export function highlightCodeLine(line: string, language: string | undefined): string {
	return highlightCode(line, language) ?? escapeHtml(line);
}
