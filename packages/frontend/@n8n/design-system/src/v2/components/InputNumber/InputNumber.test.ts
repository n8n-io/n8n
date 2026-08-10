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
			expect(wrapper.getByTestId('input-number')).toBeInTheDocument();
		});

		it('should render disabled state', () => {
			const wrapper = render(InputNumber, {
				props: {
					disabled: true,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeDisabled();
			expect(wrapper.getByTestId('input-number').className).toContain('isDisabled');
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

		it('should render with defaultValue when uncontrolled', () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 7,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveValue('7');
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
			const container = wrapper.getByTestId('input-number');
			expect(container.className).toContain(expected);
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
			expect(wrapper.getByLabelText('Decrease')).toBeInTheDocument();
			expect(wrapper.getByLabelText('Increase')).toBeInTheDocument();
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

			await userEvent.click(wrapper.getByLabelText('Increase'));

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

			await userEvent.click(wrapper.getByLabelText('Decrease'));

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

			await userEvent.click(wrapper.getByLabelText('Increase'));

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

			await userEvent.click(wrapper.getByLabelText('Decrease'));

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
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.clear(input);
			await userEvent.type(input, '123');
			await userEvent.tab();

			await waitFor(() => {
				const emitted = wrapper.emitted('update:modelValue');
				expect(emitted).toBeTruthy();
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

			const decrementButton = wrapper.getByLabelText('Decrease');

			await userEvent.click(decrementButton);
			await userEvent.click(decrementButton);

			await waitFor(() => {
				const emitted = wrapper.emitted('update:modelValue');
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

			const incrementButton = wrapper.getByLabelText('Increase');

			await userEvent.click(incrementButton);
			await userEvent.click(incrementButton);

			await waitFor(() => {
				const emitted = wrapper.emitted('update:modelValue');
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

			await userEvent.click(wrapper.getByLabelText('Increase'));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([5]);
			});
		});
	});

	describe('events', () => {
		it('should emit focus event', async () => {
			const wrapper = render(InputNumber);
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);

			await waitFor(() => {
				expect(wrapper.emitted('focus')).toBeTruthy();
			});
		});

		it('should emit blur event', async () => {
			const wrapper = render(InputNumber);
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

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
