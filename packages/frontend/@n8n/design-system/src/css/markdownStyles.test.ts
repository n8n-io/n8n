import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const markdownStyles = readFileSync(resolve(process.cwd(), 'src/css/markdown.scss'), 'utf8');

function ruleBody(selector: string) {
	const start = markdownStyles.indexOf(`${selector} {`);
	expect(start).toBeGreaterThanOrEqual(0);
	return markdownStyles.slice(start, markdownStyles.indexOf('}', start));
}

describe('Markdown consumer style contracts', () => {
	it('uses default text styles unless the consumer sets an override', () => {
		const root = ruleBody('.n8n-markdown');
		expect(root).toContain(
			'color: var(--n8n-markdown--color, color-mix(in oklch, var(--text-color), transparent 10%))',
		);
		expect(root).toContain('font-size: var(--n8n-markdown--font-size--base, var(--font-size--md))');
		expect(root).toContain('line-height: var(--n8n-markdown--line-height, var(--line-height--xl))');
	});

	it('keeps the chat inline code background override', () => {
		const inlineCode = ruleBody(':not(pre) > code:not(:where(.not-prose, .not-prose *))');
		expect(inlineCode).toContain(
			'background-color: var(--chat--message--pre--background, var(--background--subtle))',
		);
	});

	it('lets tables size their columns without clipping content', () => {
		const table = ruleBody('table:not(:where(.not-prose, .not-prose *))');
		expect(table).toContain('table-layout: auto');
		expect(table).not.toContain('overflow: hidden');
		expect(
			ruleBody('.n8n-markdown-table-container:not(:where(.not-prose, .not-prose *))'),
		).toContain('overflow-x: auto');
	});
});
