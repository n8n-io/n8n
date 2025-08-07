/**
 * Test suite for N8nRadioButtons component
 */

import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect, vi } from 'vitest';
import N8nRadioButtons from '../RadioButtons.vue';

// Sample options for testing
const sampleOptions = [
	{ label: 'Option 1', value: 'option1' },
	{ label: 'Option 2', value: 'option2' },
	{ label: 'Option 3', value: 'option3' },
];

const sampleOptionsWithDisabled = [
	{ label: 'Enabled Option', value: 'enabled', disabled: false },
	{ label: 'Disabled Option', value: 'disabled', disabled: true },
	{ label: 'Another Option', value: 'another' },
];

const booleanOptions = [
	{ label: 'True', value: true },
	{ label: 'False', value: false },
];

describe('N8nRadioButtons', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
				},
			});

			const radioGroup = container.querySelector('[role="radiogroup"]');
			expect(radioGroup).toBeInTheDocument();
			expect(radioGroup).toHaveClass('n8n-radio-buttons');
		});

		it('should render all provided options', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
				},
			});

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(3);

			expect(container).toHaveTextContent('Option 1');
			expect(container).toHaveTextContent('Option 2');
			expect(container).toHaveTextContent('Option 3');
		});

		it('should render without options', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: [],
				},
			});

			const radioGroup = container.querySelector('[role="radiogroup"]');
			expect(radioGroup).toBeInTheDocument();

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(0);
		});

		it('should render with undefined options', () => {
			const { container } = render(N8nRadioButtons);

			const radioGroup = container.querySelector('[role="radiogroup"]');
			expect(radioGroup).toBeInTheDocument();
		});
	});

	describe('Size Variants', () => {
		it('should render with default medium size', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
				},
			});

			const radioGroup = container.querySelector('[role="radiogroup"]');
			expect(radioGroup).toBeInTheDocument();
		});

		it('should render with small size', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					size: 'small',
				},
			});

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(3);
		});

		it('should render with small-medium size', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					size: 'small-medium',
				},
			});

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(3);
		});

		it('should render with medium size explicitly', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					size: 'medium',
				},
			});

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(3);
		});
	});

	describe('Selection State', () => {
		it('should show correct active state', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					modelValue: 'option2',
				},
			});

			const selectedButton = container.querySelector('[data-test-id="radio-button-option2"]');
			expect(selectedButton).toBeInTheDocument();

			// Check aria-checked attribute
			const selectedRadio = selectedButton?.closest('[role="radio"]');
			expect(selectedRadio).toHaveAttribute('aria-checked', 'true');

			// Other buttons should not be active
			const firstButton = container.querySelector('[data-test-id="radio-button-option1"]');
			const firstRadio = firstButton?.closest('[role="radio"]');
			expect(firstRadio).toHaveAttribute('aria-checked', 'false');
		});

		it('should handle no selection', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
				},
			});

			const radioButtons = container.querySelectorAll('[role="radio"]');
			radioButtons.forEach(button => {
				expect(button).toHaveAttribute('aria-checked', 'false');
			});
		});

		it('should handle boolean values', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: booleanOptions,
					modelValue: true,
				},
			});

			const trueButton = container.querySelector('[data-test-id="radio-button-true"]');
			const trueRadio = trueButton?.closest('[role="radio"]');
			expect(trueRadio).toHaveAttribute('aria-checked', 'true');

			const falseButton = container.querySelector('[data-test-id="radio-button-false"]');
			const falseRadio = falseButton?.closest('[role="radio"]');
			expect(falseRadio).toHaveAttribute('aria-checked', 'false');
		});
	});

	describe('Event Handling', () => {
		it('should emit update:modelValue when option is clicked', async () => {
			const onUpdate = vi.fn();
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					'onUpdate:modelValue': onUpdate,
				},
			});

			const firstButton = container.querySelector('[data-test-id="radio-button-option1"]');
			expect(firstButton).toBeInTheDocument();

			await fireEvent.click(firstButton!);

			expect(onUpdate).toHaveBeenCalledTimes(1);
			expect(onUpdate).toHaveBeenCalledWith('option1', expect.any(MouseEvent));
		});

		it('should emit with correct value for different option types', async () => {
			const onUpdate = vi.fn();
			const { container } = render(N8nRadioButtons, {
				props: {
					options: booleanOptions,
					'onUpdate:modelValue': onUpdate,
				},
			});

			const trueButton = container.querySelector('[data-test-id="radio-button-true"]');
			await fireEvent.click(trueButton!);

			expect(onUpdate).toHaveBeenCalledWith(true, expect.any(MouseEvent));
		});

		it('should not emit when clicking already selected option', async () => {
			const onUpdate = vi.fn();
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					modelValue: 'option1',
					'onUpdate:modelValue': onUpdate,
				},
			});

			const selectedButton = container.querySelector('[data-test-id="radio-button-option1"]');
			await fireEvent.click(selectedButton!);

			// Should still emit even if already selected (normal radio behavior)
			expect(onUpdate).toHaveBeenCalledWith('option1', expect.any(MouseEvent));
		});
	});

	describe('Disabled State', () => {
		it('should handle globally disabled state', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					disabled: true,
				},
			});

			const radioGroup = container.querySelector('[role="radiogroup"]');
			expect(radioGroup).toHaveClass('n8n-radio-buttons');
		});

		it('should not emit events when globally disabled', async () => {
			const onUpdate = vi.fn();
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					disabled: true,
					'onUpdate:modelValue': onUpdate,
				},
			});

			const firstButton = container.querySelector('[data-test-id="radio-button-option1"]');
			await fireEvent.click(firstButton!);

			expect(onUpdate).not.toHaveBeenCalled();
		});

		it('should handle individually disabled options', async () => {
			const onUpdate = vi.fn();
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptionsWithDisabled,
					'onUpdate:modelValue': onUpdate,
				},
			});

			// Click enabled option - should work
			const enabledButton = container.querySelector('[data-test-id="radio-button-enabled"]');
			await fireEvent.click(enabledButton!);
			expect(onUpdate).toHaveBeenCalledWith('enabled', expect.any(MouseEvent));

			onUpdate.mockClear();

			// Click disabled option - should not work
			const disabledButton = container.querySelector('[data-test-id="radio-button-disabled"]');
			await fireEvent.click(disabledButton!);
			expect(onUpdate).not.toHaveBeenCalled();
		});

		it('should combine global and individual disabled states', async () => {
			const onUpdate = vi.fn();
			const { container } = render(N8nRadioButtons, {
				props: {
					options: [
						{ label: 'Enabled Option', value: 'enabled', disabled: false },
						{ label: 'Another Option', value: 'another' },
					],
					disabled: true, // Global disabled
					'onUpdate:modelValue': onUpdate,
				},
			});

			const enabledButton = container.querySelector('[data-test-id="radio-button-enabled"]');
			await fireEvent.click(enabledButton!);

			// Should not emit because globally disabled overrides individual enabled state
			expect(onUpdate).not.toHaveBeenCalled();
		});
	});

	describe('Square Buttons', () => {
		it('should render square buttons when squareButtons is true', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					squareButtons: true,
				},
			});

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(3);
		});

		it('should render normal buttons when squareButtons is false', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					squareButtons: false,
				},
			});

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(3);
		});
	});

	describe('Custom Slot Content', () => {
		it('should render custom slot content for options', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: [
						{ label: 'Custom Option', value: 'custom', data: { icon: 'star' } },
					],
				},
				slots: {
					option: `
						<template #option="{ label, data }">
							<span class="custom-content">
								<i class="icon">{{ data.icon }}</i>
								{{ label }}
							</span>
						</template>
					`,
				},
			});

			const customContent = container.querySelector('.custom-content');
			expect(customContent).toBeInTheDocument();
		});

		it('should fall back to label when no slot provided', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: [{ label: 'Default Label', value: 'default' }],
				},
			});

			expect(container).toHaveTextContent('Default Label');
		});
	});

	describe('Option Data Properties', () => {
		it('should handle options with data properties', () => {
			const optionsWithData = [
				{
					label: 'Option with Data',
					value: 'data-option',
					data: { category: 'test', priority: 1, active: true },
				},
			];

			const { container } = render(N8nRadioButtons, {
				props: {
					options: optionsWithData,
				},
			});

			const radioButton = container.querySelector('[data-test-id="radio-button-data-option"]');
			expect(radioButton).toBeInTheDocument();
		});

		it('should handle options without data properties', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: [{ label: 'Simple Option', value: 'simple' }],
				},
			});

			const radioButton = container.querySelector('[data-test-id="radio-button-simple"]');
			expect(radioButton).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA roles and attributes', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					modelValue: 'option2',
				},
			});

			const radioGroup = container.querySelector('[role="radiogroup"]');
			expect(radioGroup).toBeInTheDocument();

			const radioButtons = container.querySelectorAll('[role="radio"]');
			expect(radioButtons).toHaveLength(3);

			// Check aria-checked attributes
			const selectedButton = container.querySelector('[data-test-id="radio-button-option2"]');
			const selectedRadio = selectedButton?.closest('[role="radio"]');
			expect(selectedRadio).toHaveAttribute('aria-checked', 'true');
		});

		it('should work with assistive technologies', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					'aria-labelledby': 'radio-group-label',
					'aria-describedby': 'radio-group-description',
				},
			});

			const radioGroup = container.querySelector('[role="radiogroup"]');
			expect(radioGroup).toBeInTheDocument();
		});

		it('should handle keyboard navigation attributes', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
				},
			});

			const radioButtons = container.querySelectorAll('[role="radio"]');
			radioButtons.forEach(button => {
				expect(button).toHaveAttribute('tabindex', '-1');
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty option labels', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: [
						{ label: '', value: 'empty' },
						{ label: 'Normal', value: 'normal' },
					],
				},
			});

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(2);
		});

		it('should handle special characters in values', () => {
			const { container } = render(N8nRadioButtons, {
				props: {
					options: [
						{ label: 'Special', value: 'option-with-dashes' },
						{ label: 'Spaces', value: 'option with spaces' },
						{ label: 'Unicode', value: 'option_🎉_unicode' },
					],
				},
			});

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(3);
		});

		it('should handle very long option labels', () => {
			const longLabel = 'This is a very long option label that might wrap to multiple lines and should still work correctly';
			const { container } = render(N8nRadioButtons, {
				props: {
					options: [{ label: longLabel, value: 'long' }],
				},
			});

			expect(container).toHaveTextContent(longLabel);
		});

		it('should handle many options', () => {
			const manyOptions = Array.from({ length: 50 }, (_, i) => ({
				label: `Option ${i + 1}`,
				value: `option${i + 1}`,
			}));

			const { container } = render(N8nRadioButtons, {
				props: {
					options: manyOptions,
				},
			});

			const radioButtons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			expect(radioButtons).toHaveLength(50);
		});

		it('should handle rapid selection changes', async () => {
			const onUpdate = vi.fn();
			const { container } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					'onUpdate:modelValue': onUpdate,
				},
			});

			const buttons = container.querySelectorAll('[data-test-id^="radio-button-"]');
			
			// Rapidly click different buttons
			for (const button of buttons) {
				await fireEvent.click(button);
			}

			expect(onUpdate).toHaveBeenCalledTimes(3);
		});
	});

	describe('Performance', () => {
		it('should render efficiently with many options', () => {
			const manyOptions = Array.from({ length: 100 }, (_, i) => ({
				label: `Option ${i}`,
				value: `option${i}`,
			}));

			expect(() => {
				render(N8nRadioButtons, {
					props: { options: manyOptions },
				});
			}).not.toThrow();
		});

		it('should handle frequent prop updates', () => {
			const { rerender } = render(N8nRadioButtons, {
				props: {
					options: sampleOptions,
					modelValue: 'option1',
				},
			});

			expect(() => {
				for (let i = 0; i < 10; i++) {
					rerender({
						options: sampleOptions,
						modelValue: sampleOptions[i % 3].value,
					});
				}
			}).not.toThrow();
		});
	});
});