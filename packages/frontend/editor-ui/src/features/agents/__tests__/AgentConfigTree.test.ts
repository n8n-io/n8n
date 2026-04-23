/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentConfigTree from '../components/AgentConfigTree.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

describe('AgentConfigTree', () => {
	it('renders one entry per top-level key of the config, in insertion order', () => {
		const wrapper = mount(AgentConfigTree, {
			props: {
				config: { model: {}, instructions: '', tools: [] },
				selectedKey: null,
			},
		});
		const items = wrapper.findAll('[data-testid="agent-config-tree-item"]');
		expect(items).toHaveLength(3);
		expect(items.map((i) => i.attributes('data-key'))).toEqual(['model', 'instructions', 'tools']);
	});

	it('emits select when an entry is clicked', async () => {
		const wrapper = mount(AgentConfigTree, {
			props: { config: { model: {}, tools: [] }, selectedKey: null },
		});
		await wrapper.find('[data-key="tools"]').trigger('click');
		expect(wrapper.emitted('select')?.[0]).toEqual(['tools']);
	});

	it('renders an empty state when the config has no keys', () => {
		const wrapper = mount(AgentConfigTree, {
			props: { config: {}, selectedKey: null },
		});
		expect(wrapper.findAll('[data-testid="agent-config-tree-item"]')).toHaveLength(0);
		expect(wrapper.find('[data-testid="agent-config-tree-empty"]').exists()).toBe(true);
	});

	it('tolerates a null config', () => {
		const wrapper = mount(AgentConfigTree, {
			props: { config: null, selectedKey: null },
		});
		expect(wrapper.find('[data-testid="agent-config-tree-empty"]').exists()).toBe(true);
	});

	it('renders unknown keys with a humanized label and generic icon', () => {
		const wrapper = mount(AgentConfigTree, {
			props: { config: { customThing: {} }, selectedKey: null },
		});
		const item = wrapper.find('[data-key="customThing"]');
		expect(item.exists()).toBe(true);
		expect(item.text()).toContain('Custom thing');
	});

	it('marks the selected entry with the selected state', () => {
		const wrapper = mount(AgentConfigTree, {
			props: { config: { model: {}, tools: [] }, selectedKey: 'tools' },
		});
		expect(wrapper.find('[data-key="tools"]').classes()).toContain('selected');
	});
});
