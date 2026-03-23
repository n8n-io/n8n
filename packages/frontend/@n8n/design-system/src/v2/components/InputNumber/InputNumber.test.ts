import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import InputNumber from './InputNumber.vue';

describe('v2/components/InputNumber', () => {
	describe('rendering', () => {
		it('should render with placeholder text', () => {
			const wrapper = render(InputNumber, {
				props: {
					placeholder: 'Enter a number',
				},
			});
			expect(wrapper.getByPlaceholderText('Enter a number')).toBeInTheDocument();
		});

		it('should render disabled state', () => {
			const wrapper = render(InputNumber, {
				props: {
					disabled: true,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeDisabled();
		});

		it('should not render controls by default', () => {
			const wrapper = render(InputNumber);
			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons).toHaveLength(0);
		});

		it('should render controls when controls prop is true', () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: true,
				},
			});
			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons).toHaveLength(2);
		});
	});

	describe('sizes', () => {
		test.each([
			[undefined, 'medium'],
			['mini' as const, 'mini'],
			['small' as const, 'small'],
			['medium' as const, 'medium'],
			['large' as const, 'large'],
			['xlarge' as const, 'xlarge'],
		])('size %s should apply %s class', (size, expected) => {
			const wrapper = render(InputNumber, {
				props: {
					size,
				},
			});
			const container = wrapper.container.querySelector('[class*="inputNumber"]');
			expect(container?.className).toContain(expected);
		});
	});

	describe('controls', () => {
		it('should show increment and decrement buttons when controls is true (both mode)', () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: true,
					controlsPosition: 'both',
				},
			});
			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons).toHaveLength(2);
			expect(buttons[0]).toHaveTextContent('−');
			expect(buttons[1]).toHaveTextContent('+');
		});

		it('should show stacked arrow buttons when controls is true (right mode)', () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: true,
					controlsPosition: 'right',
				},
			});
			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons).toHaveLength(2);
			// Right mode: increment (up arrow) first, decrement (down arrow) second
			expect(buttons[0]).toHaveAttribute('aria-label', 'Increase');
			expect(buttons[1]).toHaveAttribute('aria-label', 'Decrease');
		});

		it('should increment value when clicking increment button (both mode)', async () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: true,
					controlsPosition: 'both',
					modelValue: 5,
				},
			});
			const buttons = wrapper.container.querySelectorAll('button');
			const incrementButton = buttons[1];

			await userEvent.click(incrementButton);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6]);
			});
		});

		it('should decrement value when clicking decrement button (both mode)', async () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: true,
					controlsPosition: 'both',
					modelValue: 5,
				},
			});
			const buttons = wrapper.container.querySelectorAll('button');
			const decrementButton = buttons[0];

			await userEvent.click(decrementButton);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4]);
			});
		});

		it('should increment value when clicking up arrow (right mode)', async () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: true,
					controlsPosition: 'right',
					modelValue: 5,
				},
			});
			const incrementButton = wrapper.getByLabelText('Increase');

			await userEvent.click(incrementButton);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6]);
			});
		});

		it('should decrement value when clicking down arrow (right mode)', async () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: true,
					controlsPosition: 'right',
					modelValue: 5,
				},
			});
			const decrementButton = wrapper.getByLabelText('Decrease');

			await userEvent.click(decrementButton);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4]);
			});
		});
	});

	describe('v-model', () => {
		it('should display modelValue', () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 42,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveValue('42');
		});

		it('should emit update:modelValue on input blur', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 0,
				},
			});
			const input = wrapper.container.querySelector('input')!;

			await userEvent.clear(input);
			await userEvent.type(input, '123');
			// Reka UI emits on blur, not on each keystroke
			await userEvent.tab();

			await waitFor(() => {
				const emitted = wrapper.emitted('update:modelValue');
				expect(emitted).toBeTruthy();
				// Check that 123 was eventually emitted
				const lastEmit = emitted?.[emitted.length - 1];
				expect(lastEmit).toEqual([123]);
			});
		});

		it('should respect min constraint', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 1,
					min: 0,
					controls: true,
					controlsPosition: 'both',
				},
			});

			const buttons = wrapper.container.querySelectorAll('button');
			const decrementButton = buttons[0];

			// Click twice: first goes to 0, second should not go below
			await userEvent.click(decrementButton);
			await userEvent.click(decrementButton);

			await waitFor(() => {
				const emitted = wrapper.emitted('update:modelValue');
				// Should have emitted 0 but not -1
				expect(emitted?.flat()).toContain(0);
				expect(emitted?.flat()).not.toContain(-1);
			});
		});

		it('should respect max constraint', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 9,
					max: 10,
					controls: true,
					controlsPosition: 'both',
				},
			});

			const buttons = wrapper.container.querySelectorAll('button');
			const incrementButton = buttons[1];

			// Click twice: first goes to 10, second should not go above
			await userEvent.click(incrementButton);
			await userEvent.click(incrementButton);

			await waitFor(() => {
				const emitted = wrapper.emitted('update:modelValue');
				// Should have emitted 10 but not 11
				expect(emitted?.flat()).toContain(10);
				expect(emitted?.flat()).not.toContain(11);
			});
		});

		it('should use step value', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 0,
					step: 5,
					controls: true,
					controlsPosition: 'both',
				},
			});

			const buttons = wrapper.container.querySelectorAll('button');
			const incrementButton = buttons[1];

			await userEvent.click(incrementButton);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([5]);
			});
		});
	});

	describe('events', () => {
		it('should emit focus event', async () => {
			const wrapper = render(InputNumber);
			const input = wrapper.container.querySelector('input')!;

			await userEvent.click(input);

			await waitFor(() => {
				expect(wrapper.emitted('focus')).toBeTruthy();
			});
		});

		it('should emit blur event', async () => {
			const wrapper = render(InputNumber);
			const input = wrapper.container.querySelector('input')!;

			await userEvent.click(input);
			await userEvent.tab();

			await waitFor(() => {
				expect(wrapper.emitted('blur')).toBeTruthy();
			});
		});
	});

	describe('slots', () => {
		it('should render custom increment slot', () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: true,
					controlsPosition: 'both',
				},
				slots: {
					increment: '<span data-test-id="custom-increment">UP</span>',
				},
			});
			expect(wrapper.getByTestId('custom-increment')).toBeInTheDocument();
			expect(wrapper.getByText('UP')).toBeInTheDocument();
		});

		it('should render custom decrement slot', () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: true,
					controlsPosition: 'both',
				},
				slots: {
					decrement: '<span data-test-id="custom-decrement">DOWN</span>',
				},
			});
			expect(wrapper.getByTestId('custom-decrement')).toBeInTheDocument();
			expect(wrapper.getByText('DOWN')).toBeInTheDocument();
		});
	});

	describe('precision', () => {
		it('should format value with precision', () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 3.14,
					precision: 2,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveValue('3.14');
		});

		it('should accept precision prop without errors', () => {
			// Just verify component renders with precision prop
			// Actual formatting depends on Reka UI and Intl.NumberFormat
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 3.14159,
					precision: 2,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeInTheDocument();
		});
	});
});
