import { useMarkdown } from './useMarkdown';

describe('useMarkdown', () => {
	const { renderMarkdown } = useMarkdown();

	it('should not add a trailing newline inside a fenced code block', () => {
		const html = renderMarkdown('```\nhttps://example.com/webhook/abc\n```');

		expect(html).toContain('<code>https://example.com/webhook/abc</code>');
	});

	it('should keep newlines between lines of a fenced code block', () => {
		const html = renderMarkdown('```\nline 1\nline 2\n```');

		expect(html).toContain('<code>line 1\nline 2</code>');
	});

	it('should keep the language class on a fenced code block', () => {
		const html = renderMarkdown('```js\nconst a = 1;\n```');

		expect(html).toContain('<code class="language-js">const a = 1;</code>');
	});

	it('should keep an intentional blank last line in a fenced code block', () => {
		const html = renderMarkdown('```\nline 1\n\n```');

		expect(html).toContain('<code>line 1\n</code>');
	});
});
