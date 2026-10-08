import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ChatCollapsibleContainer from './ChatCollapsibleContainer.vue';

function mountContainer(
	overrides: Partial<{ expanded: boolean; collapsible: boolean; disabled: boolean }> = {},
) {
	return mount(ChatCollapsibleContainer, {
		props: { expanded: false, label: 'Queued messages', ...overrides },
		slots: { default: '<button type="button">Edit message</button>' },
	});
}

describe('ChatCollapsibleContainer', () => {
	it('connects the toggle to its content and makes collapsed content inert', async () => {
		const wrapper = mountContainer();
		const toggle = wrapper.get('button[aria-expanded]');
		const content = wrapper.get(`[id="${toggle.attributes('aria-controls')}"]`);

		expect(toggle.attributes('aria-label')).toBe('Queued messages');
		expect(toggle.attributes('aria-expanded')).toBe('false');
		expect(content.attributes('inert')).toBe('true');
		await toggle.trigger('click');
		expect(wrapper.emitted('update:expanded')).toEqual([[true]]);

		await wrapper.setProps({ expanded: true });
		expect(toggle.attributes('aria-expanded')).toBe('true');
		expect(content.attributes('inert')).toBe('false');
		await toggle.trigger('click');
		expect(wrapper.emitted('update:expanded')).toEqual([[true], [false]]);
		wrapper.unmount();
	});

	it('keeps non-collapsible content open without a toggle', () => {
		const wrapper = mountContainer({ collapsible: false });

		expect(wrapper.find('button[aria-expanded]').exists()).toBe(false);
		expect(wrapper.get('[inert]').attributes('inert')).toBe('false');
		expect(wrapper.get('button').text()).toBe('Edit message');
		wrapper.unmount();
	});

	it('does not toggle while disabled', async () => {
		const wrapper = mountContainer({ disabled: true });
		const toggle = wrapper.get('button[aria-expanded]');

		expect(toggle.attributes('disabled')).toBeDefined();
		await toggle.trigger('click');
		expect(wrapper.emitted('update:expanded')).toBeUndefined();
		wrapper.unmount();
	});

});
