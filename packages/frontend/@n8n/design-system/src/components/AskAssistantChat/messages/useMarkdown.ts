import Markdown from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';

import { useI18n } from '@n8n/i18n';

export function useMarkdown() {
	const { t } = useI18n();

	const md = new Markdown({
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
			return md.render(content);
		} catch (e) {
			console.error(`Error parsing markdown content ${content}`);
			return `<p>${t('aiAssistant.builder.error.parsingMarkdown')}</p>`;
		}
	}

	return {
		renderMarkdown,
	};
}
