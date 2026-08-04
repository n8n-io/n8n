import { render, fireEvent } from '@testing-library/vue';

import IconTextButton from './IconTextButton.vue';

const stubs = ['N8nIcon'];

describe('components', () => {
	describe('IconTextButton', () => {
		it('should render correctly with default props', () => {
			const wrapper = render(IconTextButton, {
				props: {
					icon: 'undo-2',
				},
				slots: {
					default: 'Button text',
				},
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render icon on the right when iconPosition is right', () => {
			const wrapper = render(IconTextButton, {
				props: {
					icon: 'arrow-up-right',
					iconPosition: 'right',
				},
				slots: {
					default: 'Button text',
				},
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render disabled state', () => {
			const wrapper = render(IconTextButton, {
				props: {
					icon: 'undo-2',
					disabled: true,
				},
				slots: {
					default: 'Button text',
				},
				global: {
					stubs,
				},
			});
			const button = wrapper.container.querySelector('button');
			expect(button?.disabled).toBe(true);
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render active state', () => {
			const wrapper = render(IconTextButton, {
				props: {
					icon: 'undo-2',
					active: true,
				},
				slots: {
					default: 'Button text',
				},
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should emit click event when clicked', async () => {
			const wrapper = render(IconTextButton, {
				props: {
					icon: 'undo-2',
				},
				slots: {
					default: 'Button text',
				},
				global: {
					stubs,
				},
			});
			const button = wrapper.container.querySelector('button');
			await fireEvent.click(button!);
			expect(wrapper.emitted().click).toHaveLength(1);
		});

		it('should have disabled attribute when disabled', () => {
			const wrapper = render(IconTextButton, {
				props: {
					icon: 'undo-2',
					disabled: true,
				},
				slots: {
					default: 'Button text',
				},
				global: {
					stubs,
				},
			});
			const button = wrapper.container.querySelector('button');
			expect(button).toHaveAttribute('disabled');
		});
	});
});
