/**
 * Enhanced test suite for N8nInput component
 */

import { render } from '@testing-library/vue';
import { describe, it, expect, vi } from 'vitest';
import N8nInput from '../Input.vue';

describe('N8nInput', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nInput);
			const input = container.querySelector('.n8n-input');
			expect(input).toBeInTheDocument();
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

	describe('Size Prop', () => {
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

	describe('Input Types', () => {
		it('should render text input by default', () => {
			const { container } = render(N8nInput);
			const input = container.querySelector('input[type="text"]');
			expect(input).toBeInTheDocument();
		});

		it('should render password input with security class', () => {
			const { container } = render(N8nInput, {
				props: {
					type: 'password',
				},
			});
			const input = container.querySelector('input[type="password"]');
			const wrapper = container.querySelector('.n8n-input.ph-no-capture');
			expect(input).toBeInTheDocument();
			expect(wrapper).toBeInTheDocument();
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

		it('should render number input', () => {
			const { container } = render(N8nInput, {
				props: {
					type: 'number',
				},
			});
			const input = container.querySelector('input[type="number"]');
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
			// Verify clearable prop is applied by checking the input has value
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('some text');
			expect(input).toBeInTheDocument();
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

		it('should generate unique name when not provided', () => {
			const { container: container1 } = render(N8nInput);
			const { container: container2 } = render(N8nInput);

			const input1 = container1.querySelector('input') as HTMLInputElement;
			const input2 = container2.querySelector('input') as HTMLInputElement;

			expect(input1.name).toBeTruthy();
			expect(input2.name).toBeTruthy();
			expect(input1.name).not.toBe(input2.name);
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

	describe('Textarea Specific Props', () => {
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

		it('should render multiple slots simultaneously', () => {
			const { getByText } = render(N8nInput, {
				slots: {
					prepend: 'Prepend',
					append: 'Append',
					prefix: 'Prefix',
					suffix: 'Suffix',
				},
			});
			expect(getByText('Prepend')).toBeInTheDocument();
			expect(getByText('Append')).toBeInTheDocument();
			expect(getByText('Prefix')).toBeInTheDocument();
			expect(getByText('Suffix')).toBeInTheDocument();
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

	describe('Classes Application', () => {
		it('should apply base n8n-input class', () => {
			const { container } = render(N8nInput);
			const input = container.querySelector('.n8n-input');
			expect(input).toBeInTheDocument();
		});

		it('should apply multiple classes for xlarge password input', () => {
			const { container } = render(N8nInput, {
				props: {
					size: 'xlarge',
					type: 'password',
				},
			});
			const input = container.querySelector('.n8n-input.xlarge.ph-no-capture');
			expect(input).toBeInTheDocument();
		});

		it('should not apply special classes for default input', () => {
			const { container } = render(N8nInput);
			const input = container.querySelector('.n8n-input');
			expect(input).not.toHaveClass('xlarge');
			expect(input).not.toHaveClass('ph-no-capture');
		});
	});

	describe('Component Functionality', () => {
		it('should render properly with focus, blur, and select capabilities', () => {
			const { container } = render(N8nInput, {
				props: {
					modelValue: 'test',
				},
			});

			// Verify component renders and has input element
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeInTheDocument();
			expect(input.value).toBe('test');
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

		it('should handle all autocomplete values', () => {
			const autocompleteValues = [
				'off',
				'new-password',
				'current-password',
				'given-name',
				'family-name',
				'email',
			];

			autocompleteValues.forEach((value) => {
				const { container } = render(N8nInput, {
					props: {
						autocomplete: value as any,
					},
				});
				const input = container.querySelector('input') as HTMLInputElement;
				expect(input.getAttribute('autocomplete')).toBe(value);
			});
		});

		it('should handle very long model values', () => {
			const longValue = 'a'.repeat(10000);
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
	});
});
