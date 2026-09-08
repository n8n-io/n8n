/** eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

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

		expect(headerId).toBeTruthy();
		expect(wrapper.get('section').attributes('aria-labelledby')).toBe(headerId);
		expect(wrapper.get('h3').text()).toBe('Settings');
	});

	it('removes the heading reference when the heading is hidden', async function testHiddenHeader() {
		const wrapper = mount(AgentPanel, {
			props: { header: 'Settings' },
		});

		await wrapper.setProps({ showHeader: false });

		expect(wrapper.find('h3').exists()).toBe(false);
		expect(wrapper.get('section').attributes('aria-labelledby')).toBeUndefined();
	});
});
