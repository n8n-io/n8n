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
					});
					expect(wrapper.html()).toMatchSnapshot();
				});

				it('should render html', () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							content: '<strong>Hello world!</strong> This is a notice.',
						},
					});

					expect(wrapper.container.querySelectorAll('strong')).toHaveLength(1);
					expect(wrapper.html()).toMatchSnapshot();
				});

				it('should sanitize rendered html', () => {
					const wrapper = render(N8nNotice, {
						props: {
							id: 'notice',
							content: '<script>alert(1);</script> This is a notice.',
						},
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
						content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
					},
				});

				const button = await wrapper.findByRole('button');
				const region = await wrapper.findByRole('region');

				expect(button).toBeVisible();
				expect(button).toHaveTextContent('Show more');

				expect(region).toBeVisible();
				expect(region.textContent!.endsWith('...')).toBeTruthy();
			});

			it('should expand truncated text when clicking show more', async () => {
				const wrapper = render(N8nNotice, {
					props: {
						id: 'notice',
						truncate: true,
						content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
					},
				});

				const button = await wrapper.findByRole('button');
				const region = await wrapper.findByRole('region');

				await fireEvent.click(button);

				expect(button).toHaveTextContent('Show less');
				expect(region.textContent!.endsWith('...')).not.toBeTruthy();
			});
		});
	});
});
