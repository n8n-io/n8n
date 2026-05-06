import Markdown from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';
import sanitizeHtml from 'sanitize-html';

import { useI18n } from '../../../composables/useI18n';

export function useMarkdown() {
	const { t } = useI18n();

	const md = new Markdown({
		html: false,
		breaks: true,
	});

	md.use(markdownLink, {
		attrs: {
			target: '_blank',
			rel: 'noopener',
		},
	});

	function renderMarkdown(content: string) {
		try {
			const rendered = md.render(content);
			return sanitizeHtml(rendered);
		} catch (e) {
			console.error(`Error parsing markdown content ${content}`);
			return `<p>${t('assistantChat.errorParsingMarkdown')}</p>`;
		}
	}

	return {
		renderMarkdown,
	};
}
