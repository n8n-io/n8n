import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';

import {
	shouldOpenChatMarkdownLinkInNewTab,
	useChatHubMarkdownOptions,
} from './useChatHubMarkdownOptions';

function renderMarkdown(content: string): string {
	const markdown = useChatHubMarkdownOptions('code-actions', 'table-container', null);
	const renderer = new MarkdownIt();

	for (const plugin of markdown.plugins.value) {
		renderer.use(plugin);
	}

	return renderer.render(content);
}

describe('useChatHubMarkdownOptions', () => {
	it('renders app-relative links without a new-tab target', () => {
		const html = renderMarkdown('[Preview](/projects/project-1/agents/agent-1/preview)');

		expect(html).toContain('href="/projects/project-1/agents/agent-1/preview"');
		expect(html).not.toContain('target="_blank"');
	});

	it('renders external links with a new-tab target', () => {
		const html = renderMarkdown('[Docs](https://docs.n8n.io)');

		expect(html).toContain('href="https://docs.n8n.io"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener"');
	});

	it('classifies relative app links as same-tab links', () => {
		expect(shouldOpenChatMarkdownLinkInNewTab('/projects/project-1/agents/agent-1/preview')).toBe(
			false,
		);
		expect(shouldOpenChatMarkdownLinkInNewTab('projects/project-1/agents/agent-1/preview')).toBe(
			false,
		);
		expect(shouldOpenChatMarkdownLinkInNewTab('#section')).toBe(false);
		expect(shouldOpenChatMarkdownLinkInNewTab('https://docs.n8n.io')).toBe(true);
		expect(shouldOpenChatMarkdownLinkInNewTab('//docs.n8n.io')).toBe(true);
	});
});
