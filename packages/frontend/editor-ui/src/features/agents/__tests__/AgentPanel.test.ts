/** eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { N8nVisuallyHidden } from '@n8n/design-system';

import AgentPanel from '../components/AgentPanel.vue';
import AgentPanelHeader from '../components/AgentPanelHeader.vue';

describe('AgentPanelHeader', function describeAgentPanelHeader() {
	it('requires headerId and applies it to the heading', function testRequiredHeaderId() {
		const wrapper = mount(AgentPanelHeader, {
			props: { title: 'Settings', headerId: 'settings-header' },
		});

		expect(wrapper.vm.$options.props).toMatchObject({
			headerId: { type: String, required: true },
		});
		expect(wrapper.get('h3').attributes('id')).toBe('settings-header');
	});
});

describe('AgentPanel', function describeAgentPanel() {
	it('links the section to its heading', function testSectionLabel() {
		const wrapper = mount(AgentPanel, {
			props: { header: 'Settings', description: 'Manage your settings.' },
		});
		const headerId = wrapper.get('h3').attributes('id');

		expect(wrapper.vm.$options.props).toMatchObject({
			header: { type: String, required: true },
		});
		expect(headerId).toBeTruthy();
		expect(wrapper.get('section').attributes('aria-labelledby')).toBe(headerId);
		expect(wrapper.get('h3').text()).toBe('Settings');
	});

	it('keeps the heading reference when the heading is visually hidden', async function testHiddenHeader() {
		const wrapper = mount(AgentPanel, {
			props: { header: 'Settings', description: 'Manage your settings.' },
			slots: { 'header-actions': '<button>Save</button>' },
		});
		const headerId = wrapper.get('h3').attributes('id');

		await wrapper.setProps({ headerVisibility: 'visually-hidden' });

		const hiddenHeading = wrapper.getComponent(N8nVisuallyHidden);
		expect(hiddenHeading.element).toBe(wrapper.get('h3').element);
		expect(hiddenHeading.text()).toBe('Settings');
		expect(wrapper.get('h3').attributes('id')).toBe(headerId);
		expect(wrapper.get('section').attributes('aria-labelledby')).toBe(headerId);
		expect(wrapper.text()).not.toContain('Manage your settings.');
		expect(wrapper.get('button').isVisible()).toBe(true);
		expect(hiddenHeading.find('button').exists()).toBe(false);

		await wrapper.setProps({ headerVisibility: 'visible' });

		expect(wrapper.findComponent(N8nVisuallyHidden).exists()).toBe(false);
		expect(wrapper.get('h3').attributes('id')).toBe(headerId);
		expect(wrapper.get('section').attributes('aria-labelledby')).toBe(headerId);
		expect(wrapper.text()).toContain('Manage your settings.');
	});
});
