import Markdown from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';

import { useI18n } from '../../../composables/useI18n';

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

	// markdown-it ends fenced code with a newline. Triple-click copy would include it.
	const renderFence = md.renderer.rules.fence;
	md.renderer.rules.fence = (tokens, idx, options, env, self) => {
		tokens[idx].content = tokens[idx].content.replace(/\n$/, '');
		return renderFence
			? renderFence(tokens, idx, options, env, self)
			: self.renderToken(tokens, idx, options);
	};

	function renderMarkdown(content: string) {
		try {
			return md.render(content);
		} catch (e) {
			console.error(`Error parsing markdown content ${content}`);
			return `<p>${t('assistantChat.errorParsingMarkdown')}</p>`;
		}
	}

	return {
		renderMarkdown,
	};
}
