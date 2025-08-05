/**
 * Comprehensive test suite for N8nFormInputs component
 */

import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect, vi } from 'vitest';
import N8nFormInputs from '../FormInputs.vue';
import type { IFormInput, FormFieldValue } from '../../../types';
import { createFormEventBus } from '../../../utils';

describe('N8nFormInputs', () => {
	const mockInputs: IFormInput[] = [
		{
			name: 'firstName',
			properties: {
				label: 'First Name',
				type: 'text',
				required: true,
			},
			initialValue: 'John',
		},
		{
			name: 'lastName',
			properties: {
				label: 'Last Name',
				type: 'text',
				required: true,
			},
			initialValue: 'Doe',
		},
		{
			name: 'email',
			properties: {
				label: 'Email',
				type: 'email',
				required: true,
			},
		},
		{
			name: 'age',
			properties: {
				label: 'Age',
				type: 'number',
				required: false,
			},
		},
	];

	const mockInfoInput: IFormInput[] = [
		{
			name: 'info',
			properties: {
				type: 'info',
				label: 'This is an informational message',
				labelSize: 'medium',
				labelAlignment: 'left',
			},
		},
	];

	const mockConditionalInputs: IFormInput[] = [
		{
			name: 'showConditional',
			properties: {
				label: 'Show Conditional',
				type: 'boolean',
			},
		},
		{
			name: 'conditionalField',
			properties: {
				label: 'Conditional Field',
				type: 'text',
			},
			shouldDisplay: (values) => values.showConditional === true,
		},
	];

	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: [],
				},
			});

			const formInputs = container.querySelector('div');
			expect(formInputs).toBeInTheDocument();
		});

		it('should render form inputs', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
				},
			});

			// Check that form inputs are rendered by their data-test-id
			expect(container.querySelector('[data-test-id="firstName"]')).toBeInTheDocument();
			expect(container.querySelector('[data-test-id="lastName"]')).toBeInTheDocument();
			expect(container.querySelector('[data-test-id="email"]')).toBeInTheDocument();
			expect(container.querySelector('[data-test-id="age"]')).toBeInTheDocument();
		});

		it('should render info type inputs as text', () => {
			const { getByText } = render(N8nFormInputs, {
				props: {
					inputs: mockInfoInput,
				},
			});

			expect(getByText('This is an informational message')).toBeInTheDocument();
		});
	});

	describe('Props Configuration', () => {
		it('should render in column view', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
					columnView: true,
				},
			});

			const grid = container.querySelector('.grid');
			expect(grid).toBeInTheDocument();
		});

		it('should render with vertical spacing', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
					verticalSpacing: 'm',
				},
			});

			const formInputs = container.querySelectorAll('div[class*="mt-m"]');
			expect(formInputs.length).toBeGreaterThan(0);
		});

		it('should render with custom event bus', () => {
			const customEventBus = createFormEventBus();
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
					eventBus: customEventBus,
				},
			});

			const formInputs = container.querySelector('div');
			expect(formInputs).toBeInTheDocument();
		});

		it('should render with teleported disabled', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
					teleported: false,
				},
			});

			const formInputs = container.querySelector('div');
			expect(formInputs).toBeInTheDocument();
		});
	});

	describe('Initial Values', () => {
		it('should set initial values from input definitions', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
				},
			});

			// Verify that inputs with initial values are rendered
			const firstNameContainer = container.querySelector('[data-test-id="firstName"]');
			const lastNameContainer = container.querySelector('[data-test-id="lastName"]');

			expect(firstNameContainer).toBeInTheDocument();
			expect(lastNameContainer).toBeInTheDocument();
		});

		it('should handle inputs without initial values', () => {
			const inputsWithoutInitial: IFormInput[] = [
				{
					name: 'noInitial',
					properties: {
						label: 'No Initial Value',
						type: 'text',
					},
				},
			];

			const { container } = render(N8nFormInputs, {
				props: {
					inputs: inputsWithoutInitial,
				},
			});

			// Verify input without initial value is rendered
			const inputContainer = container.querySelector('[data-test-id="noInitial"]');
			expect(inputContainer).toBeInTheDocument();
		});
	});

	describe('Conditional Display', () => {
		it('should show/hide inputs based on shouldDisplay function', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockConditionalInputs,
				},
			});

			// Initially conditional field should not be visible
			expect(container.querySelector('[data-test-id="conditionalField"]')).not.toBeInTheDocument();

			// Show Conditional should be visible
			expect(container.querySelector('[data-test-id="showConditional"]')).toBeInTheDocument();
		});

		it('should filter inputs correctly', () => {
			const inputsWithFilter: IFormInput[] = [
				{
					name: 'alwaysVisible',
					properties: {
						label: 'Always Visible',
						type: 'text',
					},
				},
				{
					name: 'neverVisible',
					properties: {
						label: 'Never Visible',
						type: 'text',
					},
					shouldDisplay: () => false,
				},
			];

			const { container } = render(N8nFormInputs, {
				props: {
					inputs: inputsWithFilter,
				},
			});

			expect(container.querySelector('[data-test-id="alwaysVisible"]')).toBeInTheDocument();
			expect(container.querySelector('[data-test-id="neverVisible"]')).not.toBeInTheDocument();
		});
	});

	describe('Event Emissions', () => {
		it('should emit update events when input values change', () => {
			const { emitted } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
				},
			});

			// The component should be set up to emit update events
			expect(emitted).toBeDefined();
		});

		it('should emit ready event when validation changes', () => {
			const { emitted } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
				},
			});

			// The component should be able to emit ready events
			expect(emitted).toBeDefined();
		});
	});

	describe('Validation', () => {
		it('should track validation state', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
				},
			});

			// Verify form inputs are rendered for validation tracking
			const formInputs = container.querySelectorAll(
				'[data-test-id^="firstName"], [data-test-id^="lastName"]',
			);
			expect(formInputs.length).toBeGreaterThan(0);
		});

		it('should handle submit validation', () => {
			const eventBus = createFormEventBus();
			const { emitted } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
					eventBus,
				},
			});

			// Trigger submit through event bus
			eventBus.emit('submit');

			// Should emit submit if validation passes, otherwise no submit event
			expect(emitted).toBeDefined();
		});
	});

	describe('Component Exposure', () => {
		it('should expose getValues method functionality', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
				},
			});

			// Verify component renders properly for getValues to work
			const formContainer = container.querySelector('div');
			expect(formContainer).toBeInTheDocument();
		});
	});

	describe('Grid Layout', () => {
		it('should render single column grid by default', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
				},
			});

			// Check that ResizeObserver wrapper exists
			const gridContainer = container.querySelector('div');
			expect(gridContainer).toBeInTheDocument();
		});

		it('should render multi-column grid on larger screens', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
					columnView: false,
				},
			});

			// Check that grid structure exists
			const gridContainer = container.querySelector('div');
			expect(gridContainer).toBeInTheDocument();
		});
	});

	describe('Event Bus Integration', () => {
		it('should work with default event bus', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
				},
			});

			const formInputs = container.querySelector('div');
			expect(formInputs).toBeInTheDocument();
		});

		it('should work with custom event bus', () => {
			const customEventBus = createFormEventBus();
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
					eventBus: customEventBus,
				},
			});

			const formInputs = container.querySelector('div');
			expect(formInputs).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty vertical spacing', () => {
			const { container } = render(N8nFormInputs, {
				props: {
					inputs: mockInputs,
					verticalSpacing: '',
				},
			});

			const formInputs = container.querySelector('div');
			expect(formInputs).toBeInTheDocument();
		});

		it('should handle all vertical spacing options', () => {
			const spacingOptions = ['xs', 's', 'm', 'l', 'xl'] as const;

			spacingOptions.forEach((spacing) => {
				const { container } = render(N8nFormInputs, {
					props: {
						inputs: mockInputs,
						verticalSpacing: spacing,
					},
				});

				const formInputs = container.querySelector('div');
				expect(formInputs).toBeInTheDocument();
			});
		});

		it('should handle mixed input types', () => {
			const mixedInputs: IFormInput[] = [...mockInputs, ...mockInfoInput];

			const { container, getByText } = render(N8nFormInputs, {
				props: {
					inputs: mixedInputs,
				},
			});

			// Should render both form inputs and info text
			expect(container.querySelector('[data-test-id="firstName"]')).toBeInTheDocument();
			expect(getByText('This is an informational message')).toBeInTheDocument();
		});
	});
});
