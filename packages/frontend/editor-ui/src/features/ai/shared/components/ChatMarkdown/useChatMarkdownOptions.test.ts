import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { useChatMarkdownOptions } from './useChatMarkdownOptions';

function render(content: string, config: Parameters<typeof useChatMarkdownOptions>[0] = {}) {
	const markdown = useChatMarkdownOptions(config);
	const parser = new MarkdownIt(markdown.options);
	for (const plugin of markdown.plugins.value) parser.use(plugin);
	return { html: parser.render(content), markdown };
}

describe('useChatMarkdownOptions', () => {
	it('adds automatic links and scrollable tables without code actions by default', () => {
		const { html } = render('https://example.com\n\n| A |\n| - |\n| B |\n\n```\ntext\n```');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('n8n-markdown-table-container');
		expect(html).not.toContain('data-markdown-token-idx');
	});

	it('stores code content only when actions are enabled', () => {
		const { html, markdown } = render('```\ntext\n```', { codeActions: true });
		expect(html).toContain('data-markdown-token-idx');
		expect([...markdown.codeBlockContents.value!.values()]).toEqual(['text']);
	});

	it('renders footnote pills only when selected', () => {
		const content = 'Reference[^a]\n\n[^a]: Details';
		expect(render(content).html).not.toContain('n8n-markdown-footnote-ref');
		expect(render(content, { footnotes: 'pill' }).html).toContain('n8n-markdown-footnote-ref');
		expect(render(content, { footnotes: 'normal' }).html).not.toContain(
			'n8n-markdown-footnote-ref',
		);
	});
});
