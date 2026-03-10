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

	it('renders options mode with legacy trigger test id', () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				options: defaultOptions,
			},
		});

		expect(wrapper.exists()).toBe(true);
		expect(wrapper.find('[data-test-id="dropdown-trigger"]').exists()).toBe(true);
	});

	it('emits select in options mode', async () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				options: defaultOptions,
			},
			attachTo: document.body,
		});

		await wrapper.find('[data-test-id="dropdown-trigger"]').trigger('click');
		await new Promise((resolve) => setTimeout(resolve, 0));
		const option = document.querySelector('[data-test-id="action-option2"]');
		expect(option).not.toBeNull();
		option?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(wrapper.emitted('select')?.[0]).toEqual(['option2']);
		wrapper.unmount();
	});

	it('supports ActionDropdown-compatible items and prefixed test ids', async () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				items: [
					{ id: 'edit', label: 'Edit' },
					{ id: 'delete', label: 'Delete', disabled: true },
				],
				'data-test-id': 'workflow-menu',
			},
			attachTo: document.body,
		});

		await wrapper.find('[data-test-id="action-toggle"]').trigger('click');
		await new Promise((resolve) => setTimeout(resolve, 0));

		const edit = document.querySelector('[data-test-id="workflow-menu-item-edit"]');
		expect(edit).not.toBeNull();
		edit?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(wrapper.emitted('select')?.[0]).toEqual(['edit']);
		expect(wrapper.emitted('action')?.[0]).toEqual(['edit']);
		wrapper.unmount();
	});

	it('supports ActionToggle-compatible actions', async () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				actions: [
					{ label: 'Archive', value: 'archive' },
					{ label: 'Delete', value: 'delete' },
				],
			},
			attachTo: document.body,
		});

		await wrapper.find('[data-test-id="action-toggle"]').trigger('click');
		await new Promise((resolve) => setTimeout(resolve, 0));

		const action = document.querySelector('[data-test-id="action-archive"]');
		expect(action).not.toBeNull();
		action?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(wrapper.emitted('action')?.[0]).toEqual(['archive']);
		expect(wrapper.emitted('item-mouseup')?.[0]).toEqual([{ label: 'Archive', value: 'archive' }]);
		wrapper.unmount();
	});

	it('supports openActionToggle exposed method', async () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				actions: [{ label: 'Archive', value: 'archive' }],
			},
		});

		(wrapper.vm as unknown as { openActionToggle: (open: boolean) => void }).openActionToggle(true);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(wrapper.emitted('visible-change')?.[0]).toEqual([true]);
		expect(wrapper.emitted('update:open')?.[0]).toEqual([true]);
	});

	it('supports custom trigger slot', () => {
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
