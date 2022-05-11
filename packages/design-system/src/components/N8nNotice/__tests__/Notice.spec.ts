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
			it('should truncate content longer than 150 characters', async () => {
				const wrapper = render(N8nNotice, {
					props: {
						id: 'notice',
						truncate: true,
						trailingEllipsis: true,
						content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
					},
					stubs: ['n8n-text'],
				});

				const region = await wrapper.findByRole('post-expansion-region');

				expect(region).toBeVisible();
				expect(region.textContent!.endsWith('...')).toBeTruthy();
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
				const region = await wrapper.findByRole('post-expansion-region');

				await fireEvent.click(button);

				expect(button).toHaveTextContent('Show less');
				expect(region.textContent!.endsWith('...')).not.toBeTruthy();
			});
		});

		describe('expansion text', () => {
			it('should expand from content - multiple scopes', async () => {
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

				const preRegion = await wrapper.findByRole('pre-expansion-region');
				const expansionRegion = await wrapper.findByRole('expansion-text-region');
				const postRegion = await wrapper.findByRole('post-expansion-region');

				expect(preRegion.textContent).toBe('');
				expect(expansionRegion).toBeVisible();
				expect(postRegion).toBeVisible();

				expect(expansionRegion).toHaveTextContent('2 scopes');
				expect(postRegion).toHaveTextContent('available for Google Calendar credentials');
			});

			it('should expand from content - single scope', async () => {
				const wrapper = render(N8nNotice, {
					props: {
						id: 'notice',
						truncate: true,
						expandFromContent: true,
						expansionTextPattern: /\d+ scopes?/,
						content: '1 scope available for Google Books credentials<br>user.books',
					},
					stubs: ['n8n-text'],
				});

				const preRegion = await wrapper.findByRole('pre-expansion-region');
				const expansionRegion = await wrapper.findByRole('expansion-text-region');
				const postRegion = await wrapper.findByRole('post-expansion-region');

				expect(preRegion.textContent).toBe('');
				expect(expansionRegion).toBeVisible();
				expect(postRegion).toBeVisible();

				expect(expansionRegion).toHaveTextContent('1 scope');
				expect(postRegion).toHaveTextContent('available for Google Books credentials');
			});
		});
	});
});
