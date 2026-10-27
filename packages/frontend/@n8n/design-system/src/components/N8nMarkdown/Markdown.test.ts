import { render, fireEvent } from '@testing-library/vue';
import { defineComponent, h, nextTick, ref } from 'vue';

import N8nMarkdown from './Markdown.vue';
import { n8nHtml } from '../../directives';

describe('components', () => {
	describe('N8nMarkdown', () => {
		it('passes sanitized links and plain labels to the link slot', async () => {
			const wrapper = render(N8nMarkdown, {
				props: { content: '[**Workflow**](/workflow/1 "Details")' },
				slots: {
					link: (link: {
						href: string;
						label: string;
						title?: string;
						target?: string;
						rel?: string;
					}) =>
						h(
							'a',
							{ href: link.href, title: link.title, target: link.target, rel: link.rel },
							link.label,
						),
				},
			});
			await nextTick();
			expect(wrapper.getByRole('link')).toHaveTextContent('Workflow');
			expect(wrapper.getByRole('link')).toHaveAttribute('href', '/workflow/1');
			expect(wrapper.getByRole('link')).toHaveAttribute('title', 'Details');
			expect(wrapper.getByRole('link')).toHaveAttribute('rel', 'noopener');
			await wrapper.rerender({ content: '[Unsafe](javascript:alert%281%29)' });
			await nextTick();
			expect(wrapper.queryByRole('link')).toBeNull();
		});
		it('keeps slot targets across streamed HTML and preserves raw nested fences', async () => {
			const wrapper = render(N8nMarkdown, {
				props: { content: '> ```js\n>   first\n> ```' },
				slots: {
					'code-block': ({ code, language }: { code: string; language: string }) =>
						h('pre', { 'data-language': language }, code),
				},
			});
			await nextTick();
			const target = wrapper.container.querySelector('blockquote pre')?.parentElement;
			expect(target).toHaveClass('not-prose');
			expect(target?.textContent).toBe('  first\n');
			await wrapper.rerender({ content: 'New paragraph\n\n> ```js\n>   second\n> ```' });
			await nextTick();
			expect(wrapper.container.querySelector('blockquote pre')?.parentElement).toBe(target);
			expect(target?.textContent).toBe('  second\n');
			await wrapper.rerender({ content: 'New paragraph\n\n> ```js\n>   third\n> ```' });
			await nextTick();
			expect(target?.textContent).toBe('  third\n');
		});
		it('preserves formatted and image links when a plain-label slot is present', async () => {
			const wrapper = render(N8nMarkdown, {
				props: { content: '[**Bold**](/bold) [![Preview](https://example.com/image.png)](/image)' },
				slots: { link: ({ label }: { label: string }) => h('span', label) },
			});
			await nextTick();
			expect(wrapper.container.querySelector('a[href="/bold"] strong')).toHaveTextContent('Bold');
			expect(wrapper.container.querySelector('a[href="/image"] img')).toHaveAttribute(
				'src',
				'https://example.com/image.png',
			);
		});

		it('updates rendering when slots are added and removed', async () => {
			const enabled = ref(false);
			const wrapper = render(
				defineComponent({
					setup() {
						return () =>
							h(
								N8nMarkdown,
								{ content: '[Link](/link)\n\n```js\ncode\n```' },
								enabled.value
									? {
											link: ({ label }: { label: string }) => h('button', label),
											'code-block': ({ code }: { code: string }) => h('textarea', code),
										}
									: {},
							);
					},
				}),
			);
			enabled.value = true;
			await nextTick();
			await nextTick();
			expect(wrapper.getByRole('button')).toHaveTextContent('Link');
			expect(wrapper.getByRole('textbox')).toHaveTextContent('code');
			enabled.value = false;
			await nextTick();
			await nextTick();
			expect(wrapper.getByRole('link')).toHaveTextContent('Link');
			expect(wrapper.container.querySelector('pre code')).toHaveTextContent('code');
		});

		it('keeps fence slot instances when preceding Markdown tokens change', async () => {
			const wrapper = render(N8nMarkdown, {
				props: { content: '```js\nfirst\n```\n\n```js\nsecond\n```' },
				slots: { 'code-block': () => h('input') },
			});
			await nextTick();
			const inputs = wrapper.getAllByRole('textbox');
			await fireEvent.update(inputs[0], 'local state');
			await wrapper.rerender({
				content: '# Heading\n\nParagraph\n\n```js\nfirst updated\n```\n\n```js\nsecond\n```',
			});
			await nextTick();
			expect(wrapper.getAllByRole('textbox')[0]).toBe(inputs[0]);
			expect(wrapper.getAllByRole('textbox')[1]).toBe(inputs[1]);
			expect(inputs[0]).toHaveValue('local state');
		});

		it('preserves the second fence state when the first fence is removed', async () => {
			const wrapper = render(N8nMarkdown, {
				props: { content: '```js\nfirst\n```\n\n```js\nsecond\n```' },
				slots: { 'code-block': () => h('input') },
			});
			await nextTick();
			const inputs = wrapper.getAllByRole('textbox');
			await fireEvent.update(inputs[0], 'first state');
			await fireEvent.update(inputs[1], 'second state');
			await wrapper.rerender({ content: '```js\nsecond\n```' });
			await nextTick();
			expect(wrapper.getAllByRole('textbox')).toHaveLength(1);
			expect(wrapper.getByRole('textbox')).toBe(inputs[1]);
			expect(wrapper.getByRole('textbox')).toHaveValue('second state');
		});

		it('supports flat parser options and preserves defaults', () => {
			const wrapper = render(N8nMarkdown, {
				props: {
					content: 'First\nSecond\n\nhttps://example.com',
					options: { breaks: false },
				},
			});

			expect(wrapper.container.querySelector('br')).toBeNull();
			expect(wrapper.getByRole('link')).toHaveAttribute('target', '_blank');
		});

		it('supports nested parser options', () => {
			const wrapper = render(N8nMarkdown, {
				props: {
					content: 'First\nSecond',
					options: { markdown: { breaks: false } },
				},
			});

			expect(wrapper.container.querySelector('br')).toBeNull();
		});

		it('applies custom plugins and sanitizes their output', () => {
			const wrapper = render(N8nMarkdown, {
				props: {
					content: '```text\nExample\n```',
					options: {
						highlight: () => '<strong>Highlighted</strong>',
					},
					plugins: [
						function addHeading(parser) {
							const renderFence = parser.renderer.rules.fence;
							parser.renderer.rules.fence = (tokens, idx, options, env, self) =>
								'<h2>Code</h2><script>alert(1)</script>' +
								(renderFence?.(tokens, idx, options, env, self) ?? '');
						},
					],
				},
			});

			expect(wrapper.getByRole('heading')).toHaveTextContent('Code');
			expect(wrapper.container.querySelector('pre strong')).toHaveTextContent('Highlighted');
			expect(wrapper.container.querySelector('script')).toBeNull();
		});

		it('updates the parser when options change', async () => {
			const wrapper = render(N8nMarkdown, {
				props: { content: 'First\nSecond', options: { breaks: false } },
			});

			await wrapper.rerender({ options: { breaks: true } });

			expect(wrapper.container.querySelector('br')).not.toBeNull();
		});

		it('should render unchecked checkboxes', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: '__TODO__\n- [ ] Buy milk\n- [ ] Buy socks\n',
				},
			});
			const checkboxes = wrapper.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(2);
			checkboxes.forEach((checkbox) => {
				expect(checkbox).not.toBeChecked();
			});
		});

		it('should render image urls', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: '![alt text](fileId:2)\n',
					images: [
						{
							id: '1',
							url: 'https://example.com/image.png',
						},
						{
							id: '2',
							url: 'https://example.com/image.png"> foo="',
						},
					],
				},
			});

			expect(wrapper.html()).toContain(
				'<p><img src="https://example.com/image.png&quot;> foo=&quot;" alt="alt text"></p>',
			);
		});

		it('should render checked checkboxes', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: '__TODO__\n- [X] Buy milk\n- [X] Buy socks\n',
				},
			});
			const checkboxes = wrapper.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(2);
			checkboxes.forEach((checkbox) => {
				expect(checkbox).toBeChecked();
			});
		});

		it('should toggle checkboxes when clicked', async () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: '__TODO__\n- [ ] Buy milk\n- [ ] Buy socks\n',
				},
			});
			const checkboxes = wrapper.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(2);
			expect(checkboxes[0]).not.toBeChecked();
			expect(checkboxes[1]).not.toBeChecked();

			await fireEvent.click(checkboxes[0]);
			expect(checkboxes[0]).toBeChecked();
			expect(checkboxes[1]).not.toBeChecked();

			const updatedContent = wrapper.emitted()['update-content'][0];
			expect(updatedContent).toEqual(['__TODO__\n- [x] Buy milk\n- [ ] Buy socks\n']);
		});

		it('should render inputs as plain text', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content:
						'__TODO__\n- [X] Buy milk\n- <input type="text" data-testid="text-input" value="Something"/>\n',
				},
			});
			const checkboxes = wrapper.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(1);
			expect(wrapper.queryByTestId('text-input')).toBeNull();
			expect(wrapper.html()).toContain(
				'&lt;input type=“text” data-testid=“text-input” value=“Something”/&gt;',
			);
		});

		it('should render YouTube embed player', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: '@[youtube](ZCuL2e4zC_4)\n',
				},
			});

			expect(wrapper.html()).toContain(
				'<p><iframe width="100%" src="https://www.youtube-nocookie.com/embed/ZCuL2e4zC_4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></p>',
			);
		});

		// ADO-5800: stickies in saved workflows were laid out against the legacy
		// spacing semantics, where a single blank line is a real paragraph break.
		// Sticky paragraph spacing comes from the `.sticky` theme margins, not
		// from merging paragraphs into one block.
		it('renders a single blank line as a paragraph break in sticky markdown (ADO-5800)', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: 'Line 1\n\nLine 2',
					withMultiBreaks: true,
					theme: 'sticky',
				},
			});

			const paragraphs = wrapper.container.querySelectorAll('p');
			expect(paragraphs).toHaveLength(2);
			expect(wrapper.container.textContent).not.toContain('\u00a0');
		});

		// ADO-5800: each blank line beyond the paragraph break renders as an
		// &nbsp; line, so intentional vertical gaps in stickies keep their height.
		it('renders extra blank lines as &nbsp; lines in sticky markdown (ADO-5800)', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: 'Line 1\n\n\n\nLine 2',
					withMultiBreaks: true,
					theme: 'sticky',
				},
			});

			const paragraphs = wrapper.container.querySelectorAll('p');
			expect(paragraphs).toHaveLength(2);
			expect(paragraphs[1].textContent).toContain('\u00a0');
			expect(paragraphs[1].querySelectorAll('br')).toHaveLength(2);
		});

		// ADO-5800: the sticky theme opts out of the shared `.n8n-markdown` styles
		// so hand-sized notes in saved workflows keep their legacy layout.
		it('does not apply the global n8n-markdown class in the sticky theme', () => {
			const sticky = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: 'Some text',
					theme: 'sticky',
				},
			});
			expect(sticky.container.querySelector('.n8n-markdown')).toBeNull();

			const regular = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: 'Some text',
				},
			});
			expect(regular.container.querySelector('.n8n-markdown')).not.toBeNull();
		});

		// Pinning #27231: a blank line BETWEEN a list and following text must stay
		// a real paragraph break, otherwise the &nbsp; substitution turns the
		// trailing text into a list-item continuation under the last bullet.
		it('keeps text after a list as a separate block (sticky markdown)', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: '- item1\n- item2\n\nfollowing text',
					withMultiBreaks: true,
					theme: 'sticky',
				},
			});

			expect(wrapper.container.querySelectorAll('ul li')).toHaveLength(2);
			const list = wrapper.container.querySelector('ul');
			expect(list?.textContent).not.toContain('following text');
		});

		// A blank line inside a fenced code block must stay literal: the &nbsp;
		// soft-break substitution must not leak into rendered code.
		it('leaves blank lines inside code blocks untouched (sticky markdown)', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: '```\nconst a = 1;\n\nconst b = 2;\n```',
					withMultiBreaks: true,
					theme: 'sticky',
				},
			});

			const code = wrapper.container.querySelector('pre code');
			expect(code?.textContent).toContain('const a = 1;');
			expect(code?.textContent).toContain('const b = 2;');
			expect(code?.textContent).not.toContain('&nbsp;');
			expect(code?.textContent).not.toContain(' ');
		});

		// A longer outer fence (4 backticks) can contain a shorter inner fence (3
		// backticks) as literal content. The shorter run must NOT close the block, so
		// blank lines after it stay literal and never become a &nbsp; soft-break.
		it('treats a shorter inner fence as code, not a closing fence (sticky markdown)', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: '````\nouter code\n```\nstill code\n\nalso still code\n````',
					withMultiBreaks: true,
					theme: 'sticky',
				},
			});

			const code = wrapper.container.querySelector('pre code');
			expect(code?.textContent).toContain('still code');
			expect(code?.textContent).toContain('also still code');
			expect(code?.textContent).not.toContain('&nbsp;');
			expect(code?.textContent).not.toContain(' ');
		});

		it('should not render YouTube embed player with extra parameters', () => {
			const wrapper = render(N8nMarkdown, {
				global: {
					directives: {
						n8nHtml,
					},
				},
				props: {
					content: '@[youtube](ZCuL2e4zC_4?autoplay=1 )\n',
				},
			});

			expect(wrapper.html()).toContain(
				'<p>@<a href="" target="_blank" rel="noopener">youtube</a></p>',
			);
		});
	});
});
