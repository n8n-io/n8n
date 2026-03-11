import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import N8nDropdown from '../N8nDropdown/Dropdown.vue';

describe('N8nActionDropdown compatibility', () => {
	it('renders unified dropdown for items mode', async () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				items: [
					{ id: 'item1', label: 'Action 1' },
					{ id: 'item2', label: 'Action 2' },
				],
			},
			attachTo: document.body,
		});

		await wrapper.find('[data-test-id="action-toggle"]').trigger('click');
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(document.querySelector('[data-test-id="action-toggle-dropdown"]')).not.toBeNull();
		expect(document.querySelector('[data-test-id="action-item1"]')).not.toBeNull();

		wrapper.unmount();
	});

	it('keeps data-test-id prefix contract for action dropdown items', async () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				items: [
					{ id: 'item1', label: 'Action 1' },
					{ id: 'item2', label: 'Action 2' },
				],
				'data-test-id': 'workflow-menu',
			},
			attachTo: document.body,
		});

		await wrapper.find('[data-test-id="action-toggle"]').trigger('click');
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(document.querySelector('[data-test-id="workflow-menu-item-item1"]')).not.toBeNull();
		expect(document.querySelector('[data-test-id="workflow-menu-item-item2"]')).not.toBeNull();

		wrapper.unmount();
	});

	it('emits select for clicked action item', async () => {
		const wrapper = mount(N8nDropdown, {
			props: {
				items: [
					{ id: 'edit', label: 'Edit' },
					{ id: 'delete', label: 'Delete' },
				],
			},
			attachTo: document.body,
		});

		await wrapper.find('[data-test-id="action-toggle"]').trigger('click');
		await new Promise((resolve) => setTimeout(resolve, 0));

		document
			.querySelector('[data-test-id="action-edit"]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(wrapper.emitted('select')?.[0]).toEqual(['edit']);
		expect(wrapper.emitted('action')?.[0]).toEqual(['edit']);

		wrapper.unmount();
	});
});
