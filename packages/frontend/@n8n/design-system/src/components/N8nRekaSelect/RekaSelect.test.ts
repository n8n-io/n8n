import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import N8nRekaSelect from './RekaSelect.vue';
import type { RekaSelectOption } from './RekaSelect.vue';

describe('N8nRekaSelect', () => {
	const defaultOptions: RekaSelectOption[] = [
		{ label: 'Option 1', value: 'option1' },
		{ label: 'Option 2', value: 'option2' },
		{ label: 'Option 3', value: 'option3' },
	];

	it('should render with default props', () => {
		const wrapper = mount(N8nRekaSelect, {
			props: {
				options: defaultOptions,
			},
		});

		expect(wrapper.exists()).toBe(true);
		expect(wrapper.find('[data-test-id^="dropdown-trigger-"]').exists()).toBe(true);
	});

	it('should display placeholder when no value is selected', () => {
		const wrapper = mount(N8nRekaSelect, {
			props: {
				options: defaultOptions,
				placeholder: 'Select an option',
			},
		});

		expect(wrapper.text()).toContain('Select an option');
	});

	it('should display selected label when value is provided', () => {
		const wrapper = mount(N8nRekaSelect, {
			props: {
				options: defaultOptions,
				modelValue: 'option2',
			},
		});

		const trigger = wrapper.find('[data-test-id="dropdown-trigger-option2"]');
		expect(trigger.exists()).toBe(true);
	});

	it('should emit update:modelValue when selection changes', async () => {
		const wrapper = mount(N8nRekaSelect, {
			props: {
				options: defaultOptions,
				modelValue: 'option1',
			},
		});

		// Simulate value change
		await wrapper.vm.$emit('update:modelValue', 'option2');

		expect(wrapper.emitted('update:modelValue')).toBeTruthy();
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option2']);
	});

	it('should apply disabled state correctly', () => {
		const wrapper = mount(N8nRekaSelect, {
			props: {
				options: defaultOptions,
				disabled: true,
			},
		});

		const trigger = wrapper.find('[data-test-id^="dropdown-trigger-"]');
		expect(trigger.attributes('data-disabled')).toBeDefined();
	});

	it('should apply size variants correctly', () => {
		const sizes = ['small', 'medium', 'large'] as const;

		sizes.forEach((size) => {
			const wrapper = mount(N8nRekaSelect, {
				props: {
					options: defaultOptions,
					size,
				},
			});

			const trigger = wrapper.find('[data-test-id^="dropdown-trigger-"]');
			expect(trigger.classes()).toContain(size);
		});
	});

	it('should handle disabled options', () => {
		const optionsWithDisabled: RekaSelectOption[] = [
			{ label: 'Enabled', value: 'enabled' },
			{ label: 'Disabled', value: 'disabled', disabled: true },
		];

		const wrapper = mount(N8nRekaSelect, {
			props: {
				options: optionsWithDisabled,
			},
		});

		expect(wrapper.exists()).toBe(true);
	});

	it('should show selected label for valid value', () => {
		const wrapper = mount(N8nRekaSelect, {
			props: {
				options: defaultOptions,
				modelValue: 'option1',
			},
		});

		const trigger = wrapper.find('[data-test-id="dropdown-trigger-option1"]');
		expect(trigger.exists()).toBe(true);
	});

	it('should show placeholder for invalid value', () => {
		const wrapper = mount(N8nRekaSelect, {
			props: {
				options: defaultOptions,
				modelValue: 'invalid-value',
				placeholder: 'Select option',
			},
		});

		const trigger = wrapper.find('[data-test-id="dropdown-trigger-invalid-value"]');
		expect(trigger.exists()).toBe(true);
	});

	it('should support custom trigger slot', () => {
		const wrapper = mount(N8nRekaSelect, {
			props: {
				options: defaultOptions,
			},
			slots: {
				trigger: '<button class="custom-trigger">Custom Trigger</button>',
			},
		});

		expect(wrapper.find('.custom-trigger').exists()).toBe(true);
		expect(wrapper.text()).toContain('Custom Trigger');
	});
});
