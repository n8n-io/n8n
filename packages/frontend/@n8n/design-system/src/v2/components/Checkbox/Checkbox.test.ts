import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Checkbox from './Checkbox.vue';

describe('v2/components/Checkbox', () => {
	describe('rendering', () => {
		it('should render unchecked by default', () => {
			const wrapper = render(Checkbox);
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toHaveAttribute('data-state', 'unchecked');
		});

		it('should render with label text', () => {
			const wrapper = render(Checkbox, {
				props: {
					label: 'Accept terms',
				},
			});
			expect(wrapper.getByText('Accept terms')).toBeInTheDocument();
		});

		it('should render checked state', () => {
			const wrapper = render(Checkbox, {
				props: {
					modelValue: true,
				},
			});
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toHaveAttribute('data-state', 'checked');
		});

		it('should render disabled state', () => {
			const wrapper = render(Checkbox, {
				props: {
					disabled: true,
				},
			});
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toHaveAttribute('data-disabled');
		});

		it('should render indeterminate state', () => {
			const wrapper = render(Checkbox, {
				props: {
					indeterminate: true,
				},
			});
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
		});
	});

	describe('v-model', () => {
		it('should update modelValue on click', async () => {
			const wrapper = render(Checkbox, {
				props: {
					modelValue: false,
				},
			});

			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			await userEvent.click(checkbox!);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
			});
		});

		it('should toggle from checked to unchecked', async () => {
			const wrapper = render(Checkbox, {
				props: {
					modelValue: true,
				},
			});

			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			await userEvent.click(checkbox!);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
			});
		});

		it('should not update when disabled', async () => {
			const wrapper = render(Checkbox, {
				props: {
					modelValue: false,
					disabled: true,
				},
			});

			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			await userEvent.click(checkbox!);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')).toBeFalsy();
			});
		});
	});

	describe('defaultValue', () => {
		it('should use defaultValue when provided', () => {
			const wrapper = render(Checkbox, {
				props: {
					defaultValue: true,
				},
			});
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toHaveAttribute('data-state', 'checked');
		});

		it('should allow toggling with defaultValue', async () => {
			const wrapper = render(Checkbox, {
				props: {
					defaultValue: true,
				},
			});

			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			await userEvent.click(checkbox!);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
			});
		});
	});

	describe('events', () => {
		it('should emit change event on click', async () => {
			const wrapper = render(Checkbox, {
				props: {
					modelValue: false,
				},
			});

			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			await userEvent.click(checkbox!);

			await waitFor(() => {
				expect(wrapper.emitted('change')).toBeTruthy();
			});
		});

		it('should emit change event when toggling', async () => {
			const wrapper = render(Checkbox, {
				props: {
					modelValue: false,
				},
			});

			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			await userEvent.click(checkbox!);

			await waitFor(() => {
				expect(wrapper.emitted('change')).toBeTruthy();
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
			});
		});
	});

	describe('label interaction', () => {
		it('should render checkbox with label', () => {
			const wrapper = render(Checkbox, {
				props: {
					label: 'Click me',
					modelValue: false,
				},
			});

			expect(wrapper.getByText('Click me')).toBeInTheDocument();
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toBeInTheDocument();
		});

		it('should show disabled state on label when disabled', () => {
			const wrapper = render(Checkbox, {
				props: {
					label: 'Click me',
					modelValue: false,
					disabled: true,
				},
			});

			const label = wrapper.container.querySelector('label');
			expect(label).toHaveAttribute('data-disabled');
		});
	});

	describe('slots', () => {
		it('should render label slot', () => {
			const wrapper = render(Checkbox, {
				props: {
					label: 'Default label',
				},
				slots: {
					label: '<span data-test-id="custom-label">Custom label content</span>',
				},
			});
			expect(wrapper.getByTestId('custom-label')).toBeInTheDocument();
			expect(wrapper.queryByText('Default label')).not.toBeInTheDocument();
		});

		it('should render label slot with scoped props', () => {
			const wrapper = render(Checkbox, {
				props: {
					label: 'Default label',
				},
				slots: {
					label: '<template #label="{ label }">Custom: {{ label }}</template>',
				},
			});
			expect(wrapper.getByText(/Custom:/)).toBeInTheDocument();
		});
	});

	describe('form integration', () => {
		it('should accept name prop', () => {
			const wrapper = render(Checkbox, {
				props: {
					name: 'terms',
					value: 'accepted',
				},
			});
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toBeInTheDocument();
		});

		it('should accept required prop', () => {
			const wrapper = render(Checkbox, {
				props: {
					required: true,
				},
			});
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toHaveAttribute('aria-required', 'true');
		});
	});

	describe('indeterminate state', () => {
		it('should show minus icon when indeterminate', () => {
			const wrapper = render(Checkbox, {
				props: {
					indeterminate: true,
				},
			});
			expect(wrapper.container.querySelector('[data-icon="minus"]')).toBeInTheDocument();
		});

		it('should show check icon when not indeterminate and checked', () => {
			const wrapper = render(Checkbox, {
				props: {
					modelValue: true,
					indeterminate: false,
				},
			});
			expect(wrapper.container.querySelector('[data-icon="check"]')).toBeInTheDocument();
		});

		it('should prioritize indeterminate over checked state', () => {
			const wrapper = render(Checkbox, {
				props: {
					modelValue: true,
					indeterminate: true,
				},
			});
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
			expect(wrapper.container.querySelector('[data-icon="minus"]')).toBeInTheDocument();
		});
	});

	describe('accessibility', () => {
		it('should have proper ARIA role', () => {
			const wrapper = render(Checkbox);
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			expect(checkbox).toBeInTheDocument();
		});

		it('should associate label with checkbox using id', () => {
			const wrapper = render(Checkbox, {
				props: {
					id: 'test-checkbox',
					label: 'Test label',
				},
			});
			const checkbox = wrapper.container.querySelector('[role="checkbox"]');
			const label = wrapper.container.querySelector('label');
			expect(checkbox).toHaveAttribute('id', 'test-checkbox');
			expect(label).toHaveAttribute('for', 'test-checkbox');
		});
	});
});
