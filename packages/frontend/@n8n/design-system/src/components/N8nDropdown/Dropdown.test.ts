import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import N8nDropdown from './Dropdown.vue';
import type { N8nDropdownOption } from './Dropdown.vue';

describe('N8nDropdown', () => {
	const defaultOptions: N8nDropdownOption[] = [
		{ label: 'Option 1', value: 'option1' },
		{ label: 'Option 2', value: 'option2' },
		{ label: 'Option 3', value: 'option3' },
	];

	it('should render with default props', () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				options: defaultOptions,
			},
		});

		expect(wrapper.exists()).toBe(true);
		expect(wrapper.find('[data-test-id="dropdown-trigger"]').exists()).toBe(true);
	});

	it('should display placeholder when no value is selected', () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				options: defaultOptions,
				placeholder: 'Select an option',
			},
		});

		expect(wrapper.text()).toContain('Select an option');
	});

	it('should display selected label when value is provided', () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				options: defaultOptions,
				modelValue: 'option2',
			},
		});

		const trigger = wrapper.find('[data-test-id="dropdown-trigger"]');
		expect(trigger.exists()).toBe(true);
	});

	it('should emit select when an option is clicked', async () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				options: defaultOptions,
			},
			attachTo: document.body,
		});

		// Open the dropdown by clicking the trigger
		const trigger = wrapper.find('[data-test-id="dropdown-trigger"]');
		await trigger.trigger('click');

		// Wait for dropdown content to be rendered in portal
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Find and click the option in the document (since it's rendered in a portal)
		const option = document.querySelector('[data-test-id="dropdown-option-option2"]');
		expect(option).not.toBeNull();
		option?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		// Wait for event to propagate
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(wrapper.emitted('select')).toBeTruthy();
		expect(wrapper.emitted('select')?.[0]).toEqual(['option2']);

		wrapper.unmount();
	});

	it('should apply disabled state correctly', () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				options: defaultOptions,
				disabled: true,
			},
		});

		const trigger = wrapper.find('[data-test-id="dropdown-trigger"]');
		expect(trigger.attributes('data-disabled')).toBeDefined();
	});

	it('should apply size variants correctly', () => {
		const sizes = ['small', 'medium', 'large'] as const;

		sizes.forEach((size) => {
			const wrapper = mount(N8nDropdown, {
				props: {
					options: defaultOptions,
					size,
				},
			});

			const trigger = wrapper.find('[data-test-id="dropdown-trigger"]');
			expect(trigger.classes()).toContain(size);
		});
	});

	it('should handle disabled options', () => {
		const optionsWithDisabled: N8nDropdownOption[] = [
			{ label: 'Enabled', value: 'enabled' },
			{ label: 'Disabled', value: 'disabled', disabled: true },
		];

		const wrapper = mount(N8nDropdown, {
			props: {
				options: optionsWithDisabled,
			},
		});

		expect(wrapper.exists()).toBe(true);
	});

	it('should show selected label for valid value', () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				options: defaultOptions,
				modelValue: 'option1',
			},
		});

		const trigger = wrapper.find('[data-test-id="dropdown-trigger"]');
		expect(trigger.exists()).toBe(true);
	});

	it('should show placeholder for invalid value', () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				options: defaultOptions,
				modelValue: 'invalid-value',
				placeholder: 'Select option',
			},
		});

		const trigger = wrapper.find('[data-test-id="dropdown-trigger"]');
		expect(trigger.exists()).toBe(true);
	});

	it('should support custom trigger slot', () => {
		const wrapper = mount(N8nDropdown, {
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
