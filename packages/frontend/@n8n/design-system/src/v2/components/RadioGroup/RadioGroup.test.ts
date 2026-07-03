import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import RadioGroup from './RadioGroup.vue';
import RadioGroupItem from './RadioGroupItem.vue';

function renderRadioGroup(props: Record<string, unknown> = {}, slots: { default?: string } = {}) {
	return render(RadioGroup, {
		props,
		slots: {
			default:
				'<RadioGroupItem value="option-a" label="Option A" /><RadioGroupItem value="option-b" label="Option B" />',
			...slots,
		},
		global: {
			components: { RadioGroupItem },
		},
	});
}

describe('v2/components/RadioGroup', () => {
	describe('rendering', () => {
		it('should render unchecked by default', () => {
			const wrapper = renderRadioGroup();
			const radio = wrapper.container.querySelector('[role="radio"]');
			expect(radio).toHaveAttribute('data-state', 'unchecked');
		});

		it('should render with label text', () => {
			const wrapper = renderRadioGroup({
				modelValue: 'option-a',
			});
			expect(wrapper.getByText('Option A')).toBeInTheDocument();
		});

		it('should render checked state', () => {
			const wrapper = renderRadioGroup({
				modelValue: 'option-a',
			});
			const radio = wrapper.getByRole('radio', { name: 'Option A' });
			expect(radio).toHaveAttribute('data-state', 'checked');
		});

		it('should render disabled state', () => {
			const wrapper = render(RadioGroup, {
				props: {
					modelValue: 'option-a',
				},
				slots: {
					default: '<RadioGroupItem value="option-a" label="Option A" :disabled="true" />',
				},
				global: { components: { RadioGroupItem } },
			});
			const radio = wrapper.container.querySelector('[role="radio"]');
			expect(radio).toHaveAttribute('data-disabled');
		});
	});

	describe('v-model', () => {
		it('should update modelValue on click', async () => {
			const wrapper = renderRadioGroup({
				modelValue: 'option-a',
			});

			const radio = wrapper.getByRole('radio', { name: 'Option B' });
			await userEvent.click(radio);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option-b']);
			});
		});

		it('should switch selection when clicking another option', async () => {
			const wrapper = renderRadioGroup({
				modelValue: 'option-b',
			});

			const radio = wrapper.getByRole('radio', { name: 'Option A' });
			await userEvent.click(radio);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option-a']);
			});
		});

		it('should not update when disabled', async () => {
			const wrapper = render(RadioGroup, {
				props: {
					modelValue: 'option-a',
				},
				slots: {
					default: `
						<RadioGroupItem value="option-a" label="Option A" />
						<RadioGroupItem value="option-b" label="Option B" :disabled="true" />
					`,
				},
				global: { components: { RadioGroupItem } },
			});

			const radio = wrapper.getByRole('radio', { name: 'Option B' });
			await userEvent.click(radio);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')).toBeFalsy();
			});
		});
	});

	describe('defaultValue', () => {
		it('should use defaultValue when provided', () => {
			const wrapper = renderRadioGroup({
				defaultValue: 'option-b',
			});
			const radio = wrapper.getByRole('radio', { name: 'Option B' });
			expect(radio).toHaveAttribute('data-state', 'checked');
		});

		it('should allow changing selection with defaultValue', async () => {
			const wrapper = renderRadioGroup({
				defaultValue: 'option-b',
			});

			const radio = wrapper.getByRole('radio', { name: 'Option A' });
			await userEvent.click(radio);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option-a']);
			});
		});
	});

	describe('label interaction', () => {
		it('should render radio with label', () => {
			const wrapper = renderRadioGroup({
				modelValue: 'option-a',
			});

			expect(wrapper.getByText('Option A')).toBeInTheDocument();
			const radio = wrapper.container.querySelector('[role="radio"]');
			expect(radio).toBeInTheDocument();
		});

		it('should show disabled state on label when disabled', () => {
			const wrapper = render(RadioGroup, {
				props: {
					modelValue: 'option-a',
				},
				slots: {
					default: '<RadioGroupItem value="option-a" label="Option A" :disabled="true" />',
				},
				global: { components: { RadioGroupItem } },
			});

			const label = wrapper.container.querySelector('label');
			expect(label).toHaveAttribute('data-disabled');
		});
	});

	describe('slots', () => {
		it('should render label slot', () => {
			const wrapper = render(RadioGroup, {
				props: {
					modelValue: 'option-a',
				},
				slots: {
					default: `
						<RadioGroupItem value="option-a" label="Default label">
							<template #label>
								<span data-test-id="custom-label">Custom label content</span>
							</template>
						</RadioGroupItem>
					`,
				},
				global: { components: { RadioGroupItem } },
			});
			expect(wrapper.getByTestId('custom-label')).toBeInTheDocument();
			expect(wrapper.queryByText('Default label')).not.toBeInTheDocument();
		});

		it('should render label slot with scoped props', () => {
			const wrapper = render(RadioGroup, {
				props: {
					modelValue: 'option-a',
				},
				slots: {
					default: `
						<RadioGroupItem value="option-a" label="Default label">
							<template #label="{ label }">Custom: {{ label }}</template>
						</RadioGroupItem>
					`,
				},
				global: { components: { RadioGroupItem } },
			});
			expect(wrapper.getByText(/Custom:/)).toBeInTheDocument();
		});
	});

	describe('form integration', () => {
		it('should accept name prop', () => {
			const wrapper = renderRadioGroup({
				name: 'preference',
				modelValue: 'option-a',
			});
			const radio = wrapper.container.querySelector('[role="radio"]');
			expect(radio).toBeInTheDocument();
		});

		it('should accept required prop', () => {
			const wrapper = renderRadioGroup({
				required: true,
				modelValue: 'option-a',
			});
			const radioGroup = wrapper.getByRole('radiogroup');
			expect(radioGroup).toHaveAttribute('aria-required', 'true');
		});
	});

	describe('accessibility', () => {
		it('should have proper ARIA role', () => {
			const wrapper = renderRadioGroup();
			const radio = wrapper.container.querySelector('[role="radio"]');
			expect(radio).toBeInTheDocument();
		});

		it('should associate label with radio using id', () => {
			const wrapper = renderRadioGroup({
				modelValue: 'option-a',
			});
			const radio = wrapper.getByRole('radio', { name: 'Option A' });
			const label = wrapper.container.querySelector('label');
			expect(radio).toHaveAttribute('id');
			expect(label).toHaveAttribute('for', radio.getAttribute('id'));
		});
	});
});
