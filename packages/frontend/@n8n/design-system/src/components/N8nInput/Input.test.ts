import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import type { InputSize } from './Input.types';
import Input from './Input.vue';

const sizeCases: Array<[InputSize, string]> = [
	['xlarge', 'xlarge'],
	['large', 'large'],
	['medium', 'medium'],
	['small', 'small'],
	['mini', 'mini'],
];

describe('components/N8nInput', () => {
	describe('rendering', () => {
		it('should render with placeholder text', () => {
			const wrapper = render(Input, {
				props: {
					placeholder: 'Enter text...',
				},
			});
			expect(wrapper.getByPlaceholderText('Enter text...')).toBeInTheDocument();
		});

		it('should render disabled state', () => {
			const wrapper = render(Input, {
				props: {
					disabled: true,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toBeDisabled();
		});

		it('should render readonly state', () => {
			const wrapper = render(Input, {
				props: {
					readonly: true,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveAttribute('readonly');
		});

		it('should render with name attribute', () => {
			const wrapper = render(Input, {
				props: {
					name: 'username',
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveAttribute('name', 'username');
		});

		it('should render with initial value', () => {
			const wrapper = render(Input, {
				props: {
					modelValue: 'Hello World',
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveValue('Hello World');
		});
	});

	describe('sizes', () => {
		test.each(sizeCases)('size %s should apply %s class', (size, expected) => {
			const wrapper = render(Input, {
				props: {
					size,
				},
			});
			// Find the input container (the component's root div with the size class)
			const container = wrapper.container.querySelector('div > div');
			expect(container?.className).toContain(expected);
		});

		it('should default to large size', () => {
			const wrapper = render(Input);
			const container = wrapper.container.querySelector('div > div');
			expect(container?.className).toContain('large');
		});
	});

	describe('types', () => {
		it('should render text input by default', () => {
			const wrapper = render(Input);
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveAttribute('type', 'text');
		});

		it('should render textarea with rows', () => {
			const wrapper = render(Input, {
				props: {
					type: 'textarea',
					rows: 4,
				},
			});
			const textarea = wrapper.container.querySelector('textarea');
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveAttribute('rows', '4');
		});

		it('should render password input with ph-no-capture class', () => {
			const wrapper = render(Input, {
				props: {
					type: 'password',
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveAttribute('type', 'password');
			const container = wrapper.container.querySelector('div > div');
			expect(container?.className).toContain('ph-no-capture');
		});

		it('should not have ph-no-capture class for text input', () => {
			const wrapper = render(Input, {
				props: {
					type: 'text',
				},
			});
			const container = wrapper.container.querySelector('div > div');
			expect(container?.className).not.toContain('ph-no-capture');
		});
	});

	describe('v-model', () => {
		it('should emit update:modelValue on input', async () => {
			const wrapper = render(Input);
			const input = wrapper.container.querySelector('input')!;

			await userEvent.type(input, 'test');

			await waitFor(() => {
				const emitted = wrapper.emitted('update:modelValue');
				expect(emitted).toBeTruthy();
				expect(emitted?.[emitted.length - 1]).toEqual(['test']);
			});
		});

		it('should display bound value', () => {
			const wrapper = render(Input, {
				props: {
					modelValue: 'bound value',
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveValue('bound value');
		});

		it('should handle null value', () => {
			const wrapper = render(Input, {
				props: {
					modelValue: null,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveValue('');
		});
	});

	describe('clearable', () => {
		it('should show clear button when has value', () => {
			const wrapper = render(Input, {
				props: {
					clearable: true,
					modelValue: 'some text',
				},
			});
			const clearButton = wrapper.container.querySelector('button');
			expect(clearButton).toBeInTheDocument();
		});

		it('should hide clear button when empty', () => {
			const wrapper = render(Input, {
				props: {
					clearable: true,
					modelValue: '',
				},
			});
			const clearButton = wrapper.container.querySelector('button');
			expect(clearButton).not.toBeInTheDocument();
		});

		it('should hide clear button when disabled', () => {
			const wrapper = render(Input, {
				props: {
					clearable: true,
					modelValue: 'some text',
					disabled: true,
				},
			});
			const clearButton = wrapper.container.querySelector('button');
			expect(clearButton).not.toBeInTheDocument();
		});

		it('should clear value and emit on click', async () => {
			const wrapper = render(Input, {
				props: {
					clearable: true,
					modelValue: 'some text',
				},
			});
			const clearButton = wrapper.container.querySelector('button')!;
			await userEvent.click(clearButton);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
			});
		});
	});

	describe('autosize', () => {
		it('should not have rows attribute when autosize is enabled', () => {
			const wrapper = render(Input, {
				props: {
					type: 'textarea',
					autosize: true,
					rows: 4,
				},
			});
			const textarea = wrapper.container.querySelector('textarea');
			expect(textarea).not.toHaveAttribute('rows');
		});

		it('should have rows attribute when autosize is disabled', () => {
			const wrapper = render(Input, {
				props: {
					type: 'textarea',
					autosize: false,
					rows: 4,
				},
			});
			const textarea = wrapper.container.querySelector('textarea');
			expect(textarea).toHaveAttribute('rows', '4');
		});
	});

	describe('events', () => {
		it('should emit focus event', async () => {
			const wrapper = render(Input);
			const input = wrapper.container.querySelector('input')!;

			await userEvent.click(input);

			await waitFor(() => {
				expect(wrapper.emitted('focus')).toBeTruthy();
			});
		});

		it('should emit blur event', async () => {
			const wrapper = render(Input);
			const input = wrapper.container.querySelector('input')!;

			await userEvent.click(input);
			await userEvent.tab();

			await waitFor(() => {
				expect(wrapper.emitted('blur')).toBeTruthy();
			});
		});

		it('should emit keydown event', async () => {
			const wrapper = render(Input);
			const input = wrapper.container.querySelector('input')!;

			await userEvent.click(input);
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				const emitted = wrapper.emitted('keydown') as KeyboardEvent[][] | undefined;
				expect(emitted).toBeTruthy();
				expect(emitted?.[0]?.[0]?.key).toBe('Enter');
			});
		});
	});

	describe('slots', () => {
		it('should render prefix slot', () => {
			const wrapper = render(Input, {
				slots: {
					prefix: '<span data-test-id="prefix-content">Prefix</span>',
				},
			});
			expect(wrapper.getByTestId('prefix-content')).toBeInTheDocument();
		});

		it('should render suffix slot', () => {
			const wrapper = render(Input, {
				slots: {
					suffix: '<span data-test-id="suffix-content">Suffix</span>',
				},
			});
			expect(wrapper.getByTestId('suffix-content')).toBeInTheDocument();
		});
	});

	describe('exposed methods', () => {
		it('should expose focus method', async () => {
			const wrapper = render(Input);
			const input = wrapper.container.querySelector('input')!;

			// Simulate calling focus via the native input element
			input.focus();

			await waitFor(() => {
				expect(document.activeElement).toBe(input);
			});
		});

		it('should expose blur method', async () => {
			const wrapper = render(Input);
			const input = wrapper.container.querySelector('input')!;

			// Focus first
			input.focus();
			expect(document.activeElement).toBe(input);

			// Then blur
			input.blur();

			await waitFor(() => {
				expect(document.activeElement).not.toBe(input);
			});
		});

		it('should expose select method', async () => {
			const wrapper = render(Input, {
				props: {
					modelValue: 'selectable text',
				},
			});
			const input = wrapper.container.querySelector('input') as HTMLInputElement;

			input.focus();
			input.select();

			await waitFor(() => {
				expect(input.selectionStart).toBe(0);
				expect(input.selectionEnd).toBe('selectable text'.length);
			});
		});
	});

	describe('maxlength', () => {
		it('should apply maxlength attribute', () => {
			const wrapper = render(Input, {
				props: {
					maxlength: 100,
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveAttribute('maxlength', '100');
		});
	});

	describe('autocomplete', () => {
		it('should default to off', () => {
			const wrapper = render(Input);
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveAttribute('autocomplete', 'off');
		});

		it('should apply autocomplete attribute', () => {
			const wrapper = render(Input, {
				props: {
					autocomplete: 'on',
				},
			});
			const input = wrapper.container.querySelector('input');
			expect(input).toHaveAttribute('autocomplete', 'on');
		});
	});
});
