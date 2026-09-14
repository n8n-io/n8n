import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { TEMPLATES_DIR } from '@/constants';

/**
 * `templates/app-chat.js` ships as browser JavaScript, so it is loaded here the
 * way the page loads it: run against a window, a document and the `URL` it uses
 * to check a link.
 */
const loadRenderMarkdown = (): ((text: string) => string) => {
	const source = readFileSync(join(TEMPLATES_DIR, 'app-chat.js'), 'utf8');
	const page: { window: { n8nAppChat?: { renderMarkdown: (text: string) => string } } } = {
		window: {},
	};
	runInNewContext(source, { ...page, document: { querySelectorAll: () => [] }, URL });
	if (!page.window.n8nAppChat) throw new Error('app-chat.js did not expose its namespace');
	return page.window.n8nAppChat.renderMarkdown;
};

const renderMarkdown = loadRenderMarkdown();

describe('renderMarkdown', () => {
	it('renders paragraphs and inline formatting', () => {
		expect(renderMarkdown('Hello **world**, this is *it*.')).toBe(
			'<p>Hello <strong>world</strong>, this is <em>it</em>.</p>',
		);
	});

	it('keeps line breaks inside a paragraph', () => {
		expect(renderMarkdown('one\ntwo')).toBe('<p>one<br>two</p>');
	});

	it('renders headings, rules, lists and quotes', () => {
		expect(renderMarkdown('## Title')).toBe('<h2>Title</h2>');
		expect(renderMarkdown('---')).toBe('<hr>');
		expect(renderMarkdown('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
		expect(renderMarkdown('1. one\n2. two')).toBe('<ol><li>one</li><li>two</li></ol>');
		expect(renderMarkdown('> quoted')).toBe('<blockquote><p>quoted</p></blockquote>');
	});

	it('renders inline code and fenced code blocks', () => {
		expect(renderMarkdown('use `npm i`')).toBe('<p>use <code>npm i</code></p>');
		expect(renderMarkdown('```js\nconst a = 1;\n```')).toBe(
			'<pre><code>const a = 1;\n</code></pre>',
		);
	});

	it('renders a fence that is still streaming', () => {
		expect(renderMarkdown('```js\nconst a =')).toBe('<pre><code>const a =</code></pre>');
	});

	it('leaves markdown syntax inside code untouched', () => {
		expect(renderMarkdown('`**not bold**`')).toBe('<p><code>**not bold**</code></p>');
	});

	it('renders a link and opens it in a new tab', () => {
		expect(renderMarkdown('[n8n](https://n8n.io)')).toBe(
			'<p><a href="https://n8n.io" target="_blank" rel="noopener noreferrer">n8n</a></p>',
		);
	});

	it('does not render a link with a scheme that is not allowed', () => {
		expect(renderMarkdown('[click](javascript:alert(1))')).toBe(
			'<p>[click](javascript:alert(1))</p>',
		);
	});

	it('escapes html in the reply', () => {
		expect(renderMarkdown('<img src=x onerror="alert(1)">')).toBe(
			'<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>',
		);
		expect(renderMarkdown('```\n<script>alert(1)</script>\n```')).toBe(
			'<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;\n</code></pre>',
		);
	});

	it('renders every prefix of a reply without throwing', () => {
		const reply =
			'# Title\n\nSome **text**, a [link](https://n8n.io) and:\n\n- one\n\n```js\nx\n```';
		for (let length = 0; length <= reply.length; length++) {
			expect(() => renderMarkdown(reply.slice(0, length))).not.toThrow();
		}
	});
});
