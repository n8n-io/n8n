import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const markdownStyles = readFileSync(resolve(process.cwd(), 'src/css/markdown.scss'), 'utf8');

function ruleBody(selector: string) {
	const start = markdownStyles.indexOf(`${selector} {`);
	expect(start).toBeGreaterThanOrEqual(0);
	return markdownStyles.slice(start, markdownStyles.indexOf('}', start));
}

describe('Markdown consumer style contracts', () => {
	it('inherits base text styles unless the consumer sets an override', () => {
		const root = ruleBody('.n8n-markdown');
		expect(root).toContain('color: var(--n8n-markdown--color, inherit)');
		expect(root).toContain('font-size: var(--n8n-markdown--font-size--base, inherit)');
		expect(root).toContain('line-height: inherit');
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
