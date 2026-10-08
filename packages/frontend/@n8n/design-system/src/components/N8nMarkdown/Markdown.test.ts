import { render, fireEvent } from '@testing-library/vue';

import N8nMarkdown from './Markdown.vue';
import { n8nHtml } from '../../directives';

describe('components', () => {
	describe('N8nMarkdown', () => {
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

			expect(wrapper.html()).toContain('<p>@<a href="" target="_blank">youtube</a></p>');
		});
	});
});
