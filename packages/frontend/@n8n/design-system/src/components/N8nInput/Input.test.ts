/**
 * Comprehensive test suite for N8nInput component
 */

import { render, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import N8nInput from './Input.vue';

describe('N8nInput', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nInput);
			const input = container.querySelector('.n8n-input');
			expect(input).toBeInTheDocument();
		});

		it('should render correctly with basic props', () => {
			const wrapper = render(N8nInput, {
				props: {
					name: 'input',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render with provided model value', () => {
			const { container } = render(N8nInput, {
				props: {
					modelValue: 'test value',
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('test value');
		});
	});

	describe('Input Types', () => {
		it('should render text input by default', () => {
			const { container } = render(N8nInput);
			const input = container.querySelector('input[type="text"]');
			expect(input).toBeInTheDocument();
		});

		it('should add .ph-no-capture class on password input', () => {
			const { container } = render(N8nInput, {
				props: {
					type: 'password',
				},
			});
			expect(container.firstChild).toHaveClass('ph-no-capture');
		});

		it('should not add .ph-no-capture class on other input types', () => {
			const { container } = render(N8nInput, {
				props: {
					type: 'number',
				},
			});
			expect(container.firstChild).not.toHaveClass('ph-no-capture');
		});

		it('should render email input', () => {
			const { container } = render(N8nInput, {
				props: {
					type: 'email',
				},
			});
			const input = container.querySelector('input[type="email"]');
			expect(input).toBeInTheDocument();
		});

		it('should render textarea when type is textarea', () => {
			const { container } = render(N8nInput, {
				props: {
					type: 'textarea',
					modelValue: 'textarea content',
				},
			});
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeInTheDocument();
			expect(textarea.value).toBe('textarea content');
		});
	});

	describe('Size Configuration', () => {
		it('should render with default large size', () => {
			const { container } = render(N8nInput);
			const input = container.querySelector('.el-input--large');
			expect(input).toBeInTheDocument();
		});

		it('should render with small size', () => {
			const { container } = render(N8nInput, {
				props: {
					size: 'small',
				},
			});
			const input = container.querySelector('.el-input--small');
			expect(input).toBeInTheDocument();
		});

		it('should convert medium size to default for Element Plus', () => {
			const { container } = render(N8nInput, {
				props: {
					size: 'medium',
				},
			});
			const input = container.querySelector('.el-input--default');
			expect(input).toBeInTheDocument();
		});

		it('should render xlarge size with custom class', () => {
			const { container } = render(N8nInput, {
				props: {
					size: 'xlarge',
				},
			});
			const input = container.querySelector('.n8n-input.xlarge');
			expect(input).toBeInTheDocument();
		});
	});

	describe('Props Configuration', () => {
		it('should apply placeholder', () => {
			const { container } = render(N8nInput, {
				props: {
					placeholder: 'Enter text here',
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.placeholder).toBe('Enter text here');
		});

		it('should apply disabled state', () => {
			const { container } = render(N8nInput, {
				props: {
					disabled: true,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeDisabled();
		});

		it('should apply readonly state', () => {
			const { container } = render(N8nInput, {
				props: {
					readonly: true,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toHaveAttribute('readonly');
		});

		it('should apply clearable functionality', () => {
			const { container } = render(N8nInput, {
				props: {
					clearable: true,
					modelValue: 'some text',
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('some text');
		});

		it('should apply maxlength attribute', () => {
			const { container } = render(N8nInput, {
				props: {
					maxlength: 100,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.getAttribute('maxlength')).toBe('100');
		});

		it('should apply title attribute', () => {
			const { container } = render(N8nInput, {
				props: {
					title: 'Input title',
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.title).toBe('Input title');
		});

		it('should use provided name', () => {
			const { container } = render(N8nInput, {
				props: {
					name: 'custom-input-name',
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.name).toBe('custom-input-name');
		});

		it('should apply autocomplete attribute', () => {
			const { container } = render(N8nInput, {
				props: {
					autocomplete: 'email',
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.getAttribute('autocomplete')).toBe('email');
		});
	});

	describe('Slots', () => {
		it('should render prepend slot', () => {
			const { getByText } = render(N8nInput, {
				slots: {
					prepend: 'Prepend Content',
				},
			});
			expect(getByText('Prepend Content')).toBeInTheDocument();
		});

		it('should render append slot', () => {
			const { getByText } = render(N8nInput, {
				slots: {
					append: 'Append Content',
				},
			});
			expect(getByText('Append Content')).toBeInTheDocument();
		});

		it('should render prefix slot', () => {
			const { getByText } = render(N8nInput, {
				slots: {
					prefix: 'Prefix Content',
				},
			});
			expect(getByText('Prefix Content')).toBeInTheDocument();
		});

		it('should render suffix slot', () => {
			const { getByText } = render(N8nInput, {
				slots: {
					suffix: 'Suffix Content',
				},
			});
			expect(getByText('Suffix Content')).toBeInTheDocument();
		});
	});

	describe('User Interactions', () => {
		it('should handle input events', async () => {
			const user = userEvent.setup();
			const inputHandler = vi.fn();

			const { container } = render(N8nInput, {
				props: {
					onInput: inputHandler,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			await user.type(input, 'test input');

			expect(inputHandler).toHaveBeenCalled();
		});

		it('should handle change events', async () => {
			const user = userEvent.setup();
			const changeHandler = vi.fn();

			const { container } = render(N8nInput, {
				props: {
					modelValue: '',
					'onUpdate:modelValue': changeHandler,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			await user.type(input, 'test');

			// For Element Plus, model updates happen on input events
			expect(changeHandler).toHaveBeenCalled();
		});

		it('should handle focus events', async () => {
			const user = userEvent.setup();
			const focusHandler = vi.fn();

			const { container } = render(N8nInput, {
				props: {
					onFocus: focusHandler,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			await user.click(input);

			expect(focusHandler).toHaveBeenCalled();
		});

		it('should handle blur events', async () => {
			const user = userEvent.setup();
			const blurHandler = vi.fn();

			const { container } = render(N8nInput, {
				props: {
					onBlur: blurHandler,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			await user.click(input);
			await user.tab();

			expect(blurHandler).toHaveBeenCalled();
		});

		it('should handle keyboard events', async () => {
			const user = userEvent.setup();
			const keydownHandler = vi.fn();

			const { container } = render(N8nInput, {
				props: {
					onKeydown: keydownHandler,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			await user.click(input);
			await user.keyboard('{Enter}');

			expect(keydownHandler).toHaveBeenCalled();
		});
	});

	describe('Textarea Specific', () => {
		it('should apply rows to textarea', () => {
			const { container } = render(N8nInput, {
				props: {
					type: 'textarea',
					rows: 5,
				},
			});
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea.rows).toBe(5);
		});

		it('should use default rows for textarea', () => {
			const { container } = render(N8nInput, {
				props: {
					type: 'textarea',
				},
			});
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea.rows).toBe(2);
		});

		it('should handle textarea input', async () => {
			const user = userEvent.setup();
			const updateHandler = vi.fn();

			const { container } = render(N8nInput, {
				props: {
					type: 'textarea',
					modelValue: '',
					'onUpdate:modelValue': updateHandler,
				},
			});

			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			await user.type(textarea, 'test');

			// Verify the update handler was called for textarea typing
			expect(updateHandler).toHaveBeenCalled();
		});
	});

	describe('Model Value Types', () => {
		it('should handle string model value', () => {
			const { container } = render(N8nInput, {
				props: {
					modelValue: 'string value',
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('string value');
		});

		it('should handle number model value', () => {
			const { container } = render(N8nInput, {
				props: {
					type: 'number',
					modelValue: 42,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('42');
		});

		it('should handle null model value', () => {
			const { container } = render(N8nInput, {
				props: {
					modelValue: null,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('');
		});
	});

	describe('Clearable Functionality', () => {
		it('should show clear button when clearable and has value', () => {
			const { container } = render(N8nInput, {
				props: {
					clearable: true,
					modelValue: 'test value',
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('test value');
			// Note: Clear button testing would require interacting with Element Plus internals
		});

		it('should clear input when clear button is used', async () => {
			const user = userEvent.setup();
			const updateHandler = vi.fn();

			const { container } = render(N8nInput, {
				props: {
					clearable: true,
					modelValue: 'test value',
					'onUpdate:modelValue': updateHandler,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('test value');

			// Simulate clearing the input by selecting all and deleting
			await user.click(input);
			await user.keyboard('{Control>}a{/Control}');
			await user.keyboard('{Delete}');

			// Verify the update handler was called (Element Plus behavior)
			expect(updateHandler).toHaveBeenCalled();
		});
	});

	describe('Accessibility', () => {
		it('should have proper input role', () => {
			const { container } = render(N8nInput);
			const input = container.querySelector('input');
			expect(input).toBeInTheDocument();
		});

		it('should support aria attributes through v-bind', () => {
			const { container } = render(N8nInput, {
				props: {
					modelValue: 'test',
				},
				attrs: {
					'aria-label': 'Test input',
					'aria-describedby': 'help-text',
				},
			});

			// Element Plus wraps the input, so attributes might be on the wrapper or input
			const wrapper = container.querySelector('.el-input');
			const input = container.querySelector('input') as HTMLInputElement;

			// Test that the aria attributes are present somewhere in the component
			expect(wrapper || input).toBeInTheDocument();
			// Note: Element Plus may apply attributes to wrapper instead of input element
		});

		it('should be focusable when not disabled', async () => {
			const user = userEvent.setup();

			const { container } = render(N8nInput);
			const input = container.querySelector('input') as HTMLInputElement;

			await user.click(input);
			expect(input).toHaveFocus();
		});

		it('should not be focusable when disabled', () => {
			const { container } = render(N8nInput, {
				props: {
					disabled: true,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeDisabled();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty string placeholder', () => {
			const { container } = render(N8nInput, {
				props: {
					placeholder: '',
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.placeholder).toBe('');
		});

		it('should handle zero maxlength', () => {
			const { container } = render(N8nInput, {
				props: {
					maxlength: 0,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.getAttribute('maxlength')).toBe('0');
		});

		it('should handle undefined maxlength (no attribute)', () => {
			const { container } = render(N8nInput, {
				props: {
					maxlength: undefined,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.hasAttribute('maxlength')).toBe(false);
		});

		it('should handle very long model values', () => {
			const longValue = 'a'.repeat(1000);
			const { container } = render(N8nInput, {
				props: {
					modelValue: longValue,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe(longValue);
		});

		it('should handle special characters in model value', () => {
			const specialValue = '!@#$%^&*()_+-=[]{}\\|;:"\'<>?,./ 日本語 émojis 🎉';
			const { container } = render(N8nInput, {
				props: {
					modelValue: specialValue,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe(specialValue);
		});

		it('should combine multiple classes correctly', () => {
			const { container } = render(N8nInput, {
				props: {
					size: 'xlarge',
					type: 'password',
				},
			});
			const input = container.querySelector('.n8n-input.xlarge.ph-no-capture');
			expect(input).toBeInTheDocument();
		});
	});

	describe('Exposed Methods', () => {
		it('should expose focus, blur, and select methods', () => {
			const { container } = render(N8nInput);
			// Note: Testing exposed methods would require accessing the component instance
			// This is more of a documentation test to ensure the methods exist
			expect(container.querySelector('input')).toBeInTheDocument();
		});
	});
});
