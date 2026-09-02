import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { mount } from '@vue/test-utils';

import type { InputNumberExposed } from './InputNumber.types';
import InputNumber from './InputNumber.vue';

describe('components/N8nInputNumber', () => {
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

		it('should render controls by default (right mode)', () => {
			const wrapper = render(InputNumber);
			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons).toHaveLength(2);
			expect(buttons[0]).toHaveAttribute('aria-label', 'Increase');
			expect(buttons[1]).toHaveAttribute('aria-label', 'Decrease');
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
		it('should not render controls when controls is false', () => {
			const wrapper = render(InputNumber, {
				props: {
					controls: false,
				},
			});
			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons).toHaveLength(0);
		});

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

		it('should select the full value on input click', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 42,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);

			await waitFor(() => {
				expect(input.selectionStart).toBe(0);
				expect(input.selectionEnd).toBe(input.value.length);
			});
		});

		it('should not select the value on focus alone', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 42,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			input.focus();

			await waitFor(() => {
				expect(wrapper.emitted('focus')).toBeTruthy();
			});
			expect(input.selectionStart).toBe(input.selectionEnd);
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
					increment:
						'<button type="button" data-test-id="custom-increment" aria-label="Increase">UP</button>',
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
					decrement:
						'<button type="button" data-test-id="custom-decrement" aria-label="Decrease">DOWN</button>',
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

		it('should preserve decimals on blur when precision is unset', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 3.14159,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			await userEvent.tab();

			await waitFor(() => {
				expect(input).toHaveValue('3.14159');
			});
		});

		it('should keep precision formatting on blur', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 3.14,
					precision: 2,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			await userEvent.tab();

			await waitFor(() => {
				expect(input).toHaveValue('3.14');
			});
		});

		it('should format as an integer on blur when precision is 0', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 3.7,
					precision: 0,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			expect(input).toHaveValue('4');

			await userEvent.click(input);
			await userEvent.tab();

			await waitFor(() => {
				expect(input).toHaveValue('4');
				const emitted = wrapper.emitted('update:modelValue');
				expect(emitted?.[emitted.length - 1]).toEqual([4]);
			});
		});
	});

	describe('stepSnapping', () => {
		it('should snap typed value to step on blur when stepSnapping is true', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 0,
					step: 1,
					stepSnapping: true,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.clear(input);
			await userEvent.type(input, '3.14');
			await userEvent.tab();

			await waitFor(() => {
				expect(input).toHaveValue('3');
			});
		});
	});

	describe('readonly', () => {
		it('should render readonly state', () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 42,
					readonly: true,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveAttribute('readonly');
			expect(wrapper.getByTestId('input-number')).toHaveAttribute('data-readonly');
		});

		it('should not update value when clicking controls while readonly', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 5,
					readonly: true,
					controls: true,
					controlsPosition: 'both',
				},
			});

			await userEvent.click(wrapper.getByLabelText('Increase'));

			expect(wrapper.emitted('update:modelValue')).toBeUndefined();
			expect(wrapper.container.querySelector('input')).toHaveValue('5');
		});
	});

	describe('disabled controls', () => {
		it('should not update value when clicking controls while disabled', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 5,
					disabled: true,
					controls: true,
					controlsPosition: 'both',
				},
			});

			await userEvent.click(wrapper.getByLabelText('Increase'));
			await userEvent.click(wrapper.getByLabelText('Decrease'));

			expect(wrapper.emitted('update:modelValue')).toBeUndefined();
			expect(wrapper.container.querySelector('input')).toHaveValue('5');
		});
	});

	describe('typed min/max', () => {
		async function pasteText(text: string) {
			const clipboardData = new DataTransfer();
			clipboardData.setData('text', text);
			await userEvent.paste(clipboardData);
		}

		function dispatchPaste(input: HTMLInputElement, text: string) {
			const clipboardData = new DataTransfer();
			clipboardData.setData('text', text);
			const event = new Event('paste', { bubbles: true, cancelable: true });
			Object.defineProperty(event, 'clipboardData', { value: clipboardData });
			input.dispatchEvent(event);
			return event;
		}

		it('should clamp value below min on blur', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 15,
					min: 10,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			// Typing below min is allowed (1 can become 15); set the DOM value then blur to clamp.
			await userEvent.click(input);
			input.value = '5';
			await userEvent.tab();

			await waitFor(() => {
				expect(input).toHaveValue('10');
			});
		});

		it('should clamp value above max on blur', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 5,
					max: 10,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			input.value = '50';
			await userEvent.tab();

			await waitFor(() => {
				expect(input).toHaveValue('10');
			});
		});

		it('should ignore keystrokes that would exceed max', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 5,
					max: 10,
					controls: false,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			await userEvent.type(input, '50');

			expect(input).toHaveValue('5');
		});

		it('should allow typing a value equal to max', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 1,
					max: 10,
					controls: false,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			await userEvent.type(input, '10');

			expect(input).toHaveValue('10');
		});

		it('should ignore pasted values that would exceed max', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 5,
					max: 10,
					controls: false,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			await pasteText('50');

			expect(input).toHaveValue('5');
		});

		it('should reject over-max paste from clipboardData when beforeinput data is empty', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 5,
					max: 10,
					controls: false,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			const event = dispatchPaste(input, '50');

			expect(event.defaultPrevented).toBe(true);
		});

		it('should allow pasting a value equal to max', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 5,
					max: 10,
					controls: false,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			await pasteText('10');

			expect(input).toHaveValue('10');
		});

		it('should still bubble paste so consumers can handle expressions', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 5,
					max: 10,
					controls: false,
				},
			});
			const root = wrapper.getByTestId('input-number');
			const bubbled: Event[] = [];
			root.addEventListener('paste', (event) => bubbled.push(event));

			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			await pasteText('{{ $json.foo }}');

			expect(bubbled).toHaveLength(1);
			expect(bubbled[0].defaultPrevented).toBe(false);
		});

		it('should bubble over-max paste after rejecting it', async () => {
			const wrapper = render(InputNumber, {
				props: {
					defaultValue: 5,
					max: 10,
					controls: false,
				},
			});
			const root = wrapper.getByTestId('input-number');
			const bubbled: Event[] = [];
			root.addEventListener('paste', (event) => bubbled.push(event));

			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			await userEvent.click(input);
			const event = dispatchPaste(input, '50');

			expect(event.defaultPrevented).toBe(true);
			expect(bubbled).toHaveLength(1);
		});
	});

	describe('external v-model updates', () => {
		it('should display value when parent updates modelValue', async () => {
			const wrapper = render(InputNumber, {
				props: {
					modelValue: 5,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveValue('5');

			await wrapper.rerender({ modelValue: 10 });

			await waitFor(() => {
				expect(input).toHaveValue('10');
			});
		});
	});

	describe('exposed methods', () => {
		const mounted: Array<{ unmount: () => void }> = [];

		afterEach(() => {
			while (mounted.length) mounted.pop()?.unmount();
		});

		it('should focus, blur, and select the nested input via the template ref', async () => {
			const wrapper = mount(InputNumber, {
				attachTo: document.body,
				props: {
					modelValue: 42,
					controls: false,
				},
			});
			mounted.push(wrapper);

			const input = wrapper.find('input').element;
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Expected input element');
			}

			const exposed = wrapper.vm as unknown as InputNumberExposed;

			expect(typeof exposed.focus).toBe('function');
			expect(typeof exposed.blur).toBe('function');
			expect(typeof exposed.select).toBe('function');

			exposed.focus();
			expect(document.activeElement).toBe(input);

			exposed.select();
			expect(input.selectionStart).toBe(0);
			expect(input.selectionEnd).toBe(input.value.length);

			exposed.blur();
			expect(document.activeElement).not.toBe(input);
		});
	});
});
