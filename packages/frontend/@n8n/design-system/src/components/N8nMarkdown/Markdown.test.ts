import { render, fireEvent } from '@testing-library/vue';

import { n8nHtml } from '@n8n/design-system/directives';

import N8nMarkdown from './Markdown.vue';

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

		// ADO-5423: a single blank line in sticky markdown must keep collapsing
		// to one block. When `\n\n` produces two separate <p> tags, the user-agent
		// default margins stack on top of the theme spacing and notes gain the
		// extra top padding / margin (and shifted UL) reported in the bug.
		it('renders a single blank line as one block in sticky markdown (ADO-5423)', () => {
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
			expect(paragraphs).toHaveLength(1);
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
