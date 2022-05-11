import {fireEvent, render} from '@testing-library/vue';
import N8nNotice from "../Notice.vue";

describe('components', () => {
	describe('N8nNotice', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nNotice, {
				props: {
					id: 'notice',
				},
				slots: {
					default: 'This is a notice.',
				},
				stubs: ['n8n-text'],
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		describe('props', () => {
			describe('content', () => {
				it('should render correctly with content prop', () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							content: 'This is a notice.',
						},
						stubs: ['n8n-text'],
					});
					expect(wrapper.html()).toMatchSnapshot();
				});

				it('should render HTML', () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							content: '<strong>Hello world!</strong> This is a notice.',
						},
						stubs: ['n8n-text'],
					});

					expect(wrapper.container.querySelectorAll('strong')).toHaveLength(1);
					expect(wrapper.html()).toMatchSnapshot();
				});

				it('should sanitize rendered HTML', () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							content: '<script>alert(1);</script> This is a notice.',
						},
						stubs: ['n8n-text'],
					});

					expect(wrapper.container.querySelector('script')).not.toBeTruthy();
					expect(wrapper.html()).toMatchSnapshot();
				});
			});
		});

		describe('truncation', () => {
			it('should truncate content longer than 150 characters - with trailing ellipsis', async () => {
				const wrapper = render(N8nNotice, {
					props: {
						id: 'notice',
						truncate: true,
						trailingEllipsis: true,
						content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
					},
					stubs: ['n8n-text'],
				});

				const post = await wrapper.findByRole('post-expansion-region');

				expect(post).toBeVisible();
				expect(post.textContent!.endsWith('...')).toBeTruthy();
			});

			it('should expand truncated text when clicking \'Show more\'', async () => {
				const wrapper = render(N8nNotice, {
					props: {
						id: 'notice',
						truncate: true,
						trailingEllipsis: true,
						content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
					},
					stubs: ['n8n-text'],
				});

				const button = await wrapper.findByRole('button');
				const post = await wrapper.findByRole('post-expansion-region');

				await fireEvent.click(button);

				expect(button).toHaveTextContent('Show less');
				expect(post.textContent!.endsWith('...')).not.toBeTruthy();
			});
		});

		describe('expansion text', () => {

			describe('should expand from content', () => {

				it('expansion text at start - without trailing ellipsis', async () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							truncate: true,
							expandFromContent: true,
							expansionTextPattern: /\d+ scopes?/,
							content: '2 scopes available for Google Calendar credentials<br>user.profile<br>user.contacts',
						},
						stubs: ['n8n-text'],
					});

					const pre = await wrapper.findByRole('pre-expansion-region');
					const expansionRegion = await wrapper.findByRole('expansion-region');
					const post = await wrapper.findByRole('post-expansion-region');

					expect(pre).toBeVisible();
					expect(expansionRegion).toBeVisible();
					expect(post).toBeVisible();

					expect(pre).toBeEmptyDOMElement();
					expect(expansionRegion).toHaveTextContent('2 scopes');
					expect(post).toHaveTextContent('available for Google Calendar credentials');
					expect(post.textContent?.endsWith('...')).toBe(false);
				});

				it('expansion text at start - with trailing ellipsis', async () => {
					const content = '2 scopes available for Google Calendar credentials<br>user.profile<br>user.contacts';

					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							truncate: true,
							truncateAt: content.indexOf('<br>'),
							trailingEllipsis: true,
							expandFromContent: true,
							expansionTextPattern: /\d+ scopes?/,
							content,
						},
						stubs: ['n8n-text'],
					});

					const pre = await wrapper.findByRole('pre-expansion-region');
					const expansionRegion = await wrapper.findByRole('expansion-region');
					const post = await wrapper.findByRole('post-expansion-region');

					expect(pre).toBeVisible();
					expect(expansionRegion).toBeVisible();
					expect(post).toBeVisible();

					expect(pre).toBeEmptyDOMElement();
					expect(expansionRegion).toHaveTextContent('2 scopes');
					expect(post).toHaveTextContent('available for Google Calendar credentials');
					expect(post.textContent?.endsWith('...')).toBe(true);
				});

				it('expansion text at middle - without trailing ellipsis', async () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							truncate: true,
							expandFromContent: true,
							expansionTextPattern: /\d+ scopes?/,
							content: 'Google Books has 1 scope available<br>user.books',
						},
						stubs: ['n8n-text'],
					});

					const pre = await wrapper.findByRole('pre-expansion-region');
					const expansion = await wrapper.findByRole('expansion-region');
					const post = await wrapper.findByRole('post-expansion-region');

					expect(pre).toBeVisible();
					expect(expansion).toBeVisible();
					expect(post).toBeVisible();

					expect(pre).toHaveTextContent('Google Books has');
					expect(expansion).toHaveTextContent('1 scope');
					expect(post).toHaveTextContent('available');
					expect(post.textContent?.endsWith('...')).toBe(false);
				});
			});

			it('expansion text at middle - with trailing ellipsis', async () => {
				const content = 'Google Books has 1 scope available<br>user.books';

				const wrapper = render(N8nNotice, {
					props: {
						id: 'notice',
						truncate: true,
						truncateAt: content.indexOf('<br>'),
						trailingEllipsis: true,
						expandFromContent: true,
						expansionTextPattern: /\d+ scopes?/,
						content,
					},
					stubs: ['n8n-text'],
				});

				const pre = await wrapper.findByRole('pre-expansion-region');
				const expansion = await wrapper.findByRole('expansion-region');
				const post = await wrapper.findByRole('post-expansion-region');

				expect(pre).toBeVisible();
				expect(expansion).toBeVisible();
				expect(post).toBeVisible();

				expect(pre).toHaveTextContent('Google Books has');
				expect(expansion).toHaveTextContent('1 scope');
				expect(post).toHaveTextContent('available');
				expect(post.textContent?.endsWith('...')).toBe(true);
			});
		});

		it('expansion text at end - without trailing ellipsis', async () => {
			const content = 'Google Calendar credentials have 1 scope<br>user.profile';

			const wrapper = render(N8nNotice, {
				props: {
					id: 'notice',
					truncate: true,
					truncateAt: content.indexOf('<br>'),
					expandFromContent: true,
					expansionTextPattern: /\d+ scopes?/,
					content,
				},
				stubs: ['n8n-text'],
			});

			const pre = await wrapper.findByRole('pre-expansion-region');
			const expansionRegion = await wrapper.findByRole('expansion-region');
			const post = await wrapper.findByRole('post-expansion-region');

			expect(pre).toBeVisible();
			expect(expansionRegion).toBeVisible();
			expect(post).toBeVisible();

			expect(pre).toHaveTextContent('Google Calendar credentials have');
			expect(expansionRegion).toHaveTextContent('1 scope');
			expect(post).toBeEmptyDOMElement();
			expect(post.textContent?.endsWith('...')).toBe(false);
		});

		it('expansion text at end - with trailing ellipsis', async () => {
			const content = 'Google Calendar credentials have 1 scope<br>user.profile';

			const wrapper = render(N8nNotice, {
				props: {
					id: 'notice',
					truncate: true,
					truncateAt: content.indexOf('<br>'),
					trailingEllipsis: true,
					expandFromContent: true,
					expansionTextPattern: /\d+ scopes?/,
					content,
				},
				stubs: ['n8n-text'],
			});

			const pre = await wrapper.findByRole('pre-expansion-region');
			const expansionRegion = await wrapper.findByRole('expansion-region');
			const post = await wrapper.findByRole('post-expansion-region');

			expect(pre).toBeVisible();
			expect(expansionRegion).toBeVisible();
			expect(post).toBeVisible();

			expect(pre).toHaveTextContent('Google Calendar credentials have');
			expect(expansionRegion).toHaveTextContent('1 scope');
			expect(post).toHaveTextContent('...');
		});
	});
});
