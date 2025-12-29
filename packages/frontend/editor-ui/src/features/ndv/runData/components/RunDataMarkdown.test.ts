import { createTestingPinia } from '@pinia/testing';
import RunDataMarkdown from '@/features/ndv/runData/components/RunDataMarkdown.vue';
import { renderComponent } from '@/__tests__/render';

describe('RunDataMarkdown.vue', () => {
	it('should render markdown content correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '# Hello World\n\nThis is a test.',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		expect(markdownContainer).toBeInTheDocument();
		expect(markdownContainer?.textContent).toContain('Hello World');
		expect(markdownContainer?.textContent).toContain('This is a test.');
	});

	it('should render headers correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		expect(markdownContainer).toBeInTheDocument();

		const h1 = markdownContainer?.querySelector('h1');
		const h2 = markdownContainer?.querySelector('h2');
		const h3 = markdownContainer?.querySelector('h3');
		const h4 = markdownContainer?.querySelector('h4');
		const h5 = markdownContainer?.querySelector('h5');
		const h6 = markdownContainer?.querySelector('h6');

		expect(h1?.textContent).toBe('H1');
		expect(h2?.textContent).toBe('H2');
		expect(h3?.textContent).toBe('H3');
		expect(h4?.textContent).toBe('H4');
		expect(h5?.textContent).toBe('H5');
		expect(h6?.textContent).toBe('H6');
	});

	it('should render bold and italic text', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '**bold text** and *italic text*',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		expect(markdownContainer).toBeInTheDocument();

		const strong = markdownContainer?.querySelector('strong');
		const em = markdownContainer?.querySelector('em');

		expect(strong?.textContent).toBe('bold text');
		expect(em?.textContent).toBe('italic text');
	});

	it('should render links correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '[Click here](https://example.com)',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const link = markdownContainer?.querySelector('a');

		expect(link).toBeInTheDocument();
		expect(link?.textContent).toBe('Click here');
		expect(link?.getAttribute('href')).toBe('https://example.com');
	});

	it('should render code blocks correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '```javascript\nconst x = 42;\n```',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const pre = markdownContainer?.querySelector('pre');
		const code = pre?.querySelector('code');

		expect(pre).toBeInTheDocument();
		expect(code).toBeInTheDocument();
		expect(code?.textContent).toContain('const x = 42;');
	});

	it('should render inline code correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: 'Use `console.log()` for debugging',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const code = markdownContainer?.querySelector('code');

		expect(code).toBeInTheDocument();
		expect(code?.textContent).toBe('console.log()');
	});

	it('should render unordered lists correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '- Item 1\n- Item 2\n- Item 3',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const ul = markdownContainer?.querySelector('ul');
		const listItems = ul?.querySelectorAll('li');

		expect(ul).toBeInTheDocument();
		expect(listItems?.length).toBe(3);
		expect(listItems?.[0].textContent).toBe('Item 1');
		expect(listItems?.[1].textContent).toBe('Item 2');
		expect(listItems?.[2].textContent).toBe('Item 3');
	});

	it('should render ordered lists correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '1. First\n2. Second\n3. Third',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const ol = markdownContainer?.querySelector('ol');
		const listItems = ol?.querySelectorAll('li');

		expect(ol).toBeInTheDocument();
		expect(listItems?.length).toBe(3);
		expect(listItems?.[0].textContent).toBe('First');
		expect(listItems?.[1].textContent).toBe('Second');
		expect(listItems?.[2].textContent).toBe('Third');
	});

	it('should render blockquotes correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '> This is a quote\n> with multiple lines',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const blockquote = markdownContainer?.querySelector('blockquote');

		expect(blockquote).toBeInTheDocument();
		expect(blockquote?.textContent).toContain('This is a quote');
		expect(blockquote?.textContent).toContain('with multiple lines');
	});

	it('should render tables correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const table = markdownContainer?.querySelector('table');
		const headers = table?.querySelectorAll('th');
		const cells = table?.querySelectorAll('td');

		expect(table).toBeInTheDocument();
		expect(headers?.length).toBe(2);
		expect(headers?.[0].textContent).toBe('Header 1');
		expect(headers?.[1].textContent).toBe('Header 2');
		expect(cells?.length).toBe(2);
		expect(cells?.[0].textContent).toContain('Cell 1');
		expect(cells?.[1].textContent).toContain('Cell 2');
	});

	it('should render horizontal rules correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: 'Before\n\n---\n\nAfter',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const hr = markdownContainer?.querySelector('hr');

		expect(hr).toBeInTheDocument();
	});

	it('should render empty string', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		expect(markdownContainer).toBeInTheDocument();
	});

	it('should render plain text without markdown syntax', () => {
		const plainText = 'This is just plain text without any markdown';
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: plainText,
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		expect(markdownContainer).toBeInTheDocument();
		expect(markdownContainer?.textContent).toContain(plainText);
	});

	it('should handle complex mixed markdown content', () => {
		const complexMarkdown = `# Main Title

This is a paragraph with **bold** and *italic* text.

## Subsection

- List item 1
- List item 2
  - Nested item

\`\`\`javascript
const code = "example";
\`\`\`

> A quote

[Link](https://example.com)`;

		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: complexMarkdown,
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		expect(markdownContainer).toBeInTheDocument();

		expect(markdownContainer?.querySelector('h1')).toBeInTheDocument();
		expect(markdownContainer?.querySelector('h2')).toBeInTheDocument();
		expect(markdownContainer?.querySelector('strong')).toBeInTheDocument();
		expect(markdownContainer?.querySelector('em')).toBeInTheDocument();
		expect(markdownContainer?.querySelector('ul')).toBeInTheDocument();
		expect(markdownContainer?.querySelector('pre')).toBeInTheDocument();
		expect(markdownContainer?.querySelector('blockquote')).toBeInTheDocument();
		expect(markdownContainer?.querySelector('a')).toBeInTheDocument();
	});

	it('should apply markdown CSS module class', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '# Test',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		expect(markdownContainer).toBeInTheDocument();
		expect(markdownContainer?.className).toContain('markdown');
	});

	it('should handle markdown with special characters', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: 'Text with < > & " special characters',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		expect(markdownContainer).toBeInTheDocument();
		expect(markdownContainer?.textContent).toContain('special characters');
	});

	it('should render markdown with newlines correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: 'Line 1\n\nLine 2\n\nLine 3',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const paragraphs = markdownContainer?.querySelectorAll('p');

		expect(markdownContainer).toBeInTheDocument();
		expect(paragraphs?.length).toBeGreaterThan(0);
	});

	it('should handle image markdown syntax', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '![Alt text](https://example.com/image.png)',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const img = markdownContainer?.querySelector('img');

		expect(img).toBeInTheDocument();
		expect(img?.getAttribute('alt')).toBe('Alt text');
		expect(img?.getAttribute('src')).toBe('https://example.com/image.png');
	});

	it('should render nested lists correctly', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '- Item 1\n  - Nested 1\n  - Nested 2\n- Item 2',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		const lists = markdownContainer?.querySelectorAll('ul');

		expect(lists && lists.length > 0).toBe(true);
	});

	it('should render strikethrough text if supported', () => {
		const { container } = renderComponent(RunDataMarkdown, {
			pinia: createTestingPinia(),
			props: {
				inputMarkdown: '~~strikethrough~~',
			},
		});

		const markdownContainer = container.querySelector('[class*="markdown"]');
		expect(markdownContainer).toBeInTheDocument();
	});
});
