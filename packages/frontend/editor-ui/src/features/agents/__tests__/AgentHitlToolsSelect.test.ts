import { mount } from '@vue/test-utils';
import { flushPromises, enableAutoUnmount } from '@vue/test-utils';
import AgentPillField from '../components/AgentPillField.vue';
import type { AgentJsonConfig } from '@n8n/api-types';
import AgentHitlToolsSelect from '../components/AgentHitlToolsSelect.vue';

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		props: ['nodeType'],
		template: '<span data-testid="node-icon">{{ nodeType.name }}</span>',
	},
}));
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (name: string) =>
			name === 'slack' ? { name: 'slack', displayName: 'Slack' } : null,
	}),
}));
vi.unmock('reka-ui');

enableAutoUnmount(afterEach);
const config: AgentJsonConfig = {
	name: 'Agent',
	model: 'test',
	instructions: 'Help',
	tools: [
		{
			type: 'node',
			name: 'send_message',
			node: { nodeType: 'slack', nodeTypeVersion: 1, nodeParameters: {} },
		},
		{ type: 'workflow', workflow: 'Write records', name: 'Write' },
		{ type: 'custom', id: 'custom' },
	],
	mcpServers: [
		{
			name: 'Server',
			url: 'https://example.com',
			transport: 'streamableHttp',
			authentication: 'none',
		},
	],
};
it('lists attached tools with icons and shows selected tools as removable pills', async () => {
	const wrapper = mount(AgentHitlToolsSelect, {
		props: {
			modelValue: [],
			config,
			getCustomToolName: () => 'Custom action',
		},
	});
	expect(wrapper.getComponent(AgentPillField).props('items')).toEqual([
		expect.objectContaining({
			id: 'tool:node:send_message',
			label: 'Send message',
		}),
		expect.objectContaining({ label: 'Write', icon: { type: 'icon', value: 'workflow' } }),
		expect.objectContaining({ label: 'Custom action', icon: { type: 'icon', value: 'code' } }),
		expect.objectContaining({ label: 'Server', icon: { type: 'icon', value: 'mcp' } }),
	]);
	expect(wrapper.text()).toContain('Which tools require this review');
	await wrapper.setProps({ modelValue: ['tool:node:send_message', 'tool:workflow:Write'] });
	const tags = wrapper.findAll('[data-testid="agent-hitl-tool-pill"]');
	expect(tags.map((tag) => tag.element.tagName)).toEqual(['SPAN', 'SPAN']);
	expect(tags[0].text()).toContain('Send message');
	expect(tags[0].get('[data-testid="node-icon"]').text()).toBe('slack');
	expect(tags[1].find('[data-icon="workflow"]').exists()).toBe(true);
});

it('adds tools from the plus menu and removes only the selected tool', async () => {
	const wrapper = mount(AgentHitlToolsSelect, {
		props: { modelValue: ['tool:workflow:Write'], config },
	});
	const add = wrapper.get('[data-testid="agent-hitl-tool-add"]');
	expect(add.attributes('aria-haspopup')).toBe('menu');
	await add.trigger('click');
	expect(add.attributes('aria-expanded')).toBe('true');
	await flushPromises();
	const options = wrapper.findAll('[role="menuitem"]');
	expect(wrapper.find('input').exists()).toBe(false);
	expect(options.map((option) => option.text())).toEqual(['slackSend message', 'Custom', 'Server']);
	expect(options[0].get('[data-testid="node-icon"]').text()).toBe('slack');
	await options[1].trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		['tool:workflow:Write', 'tool:custom:custom'],
	]);
	await wrapper.setProps({ modelValue: ['tool:workflow:Write', 'tool:custom:custom'] });
	await wrapper.findAll('[data-testid="agent-hitl-tool-remove"]')[0].trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([['tool:custom:custom']]);
});
it('keeps tool choices unchanged under a read-only lock', async () => {
	const wrapper = mount(AgentHitlToolsSelect, {
		props: { modelValue: ['tool:workflow:Write'], config, disabled: true },
	});
	expect(wrapper.get('[data-testid="agent-hitl-tool-add"]').attributes('disabled')).toBeDefined();
	expect(
		wrapper.get('[data-testid="agent-hitl-tool-remove"]').attributes('disabled'),
	).toBeDefined();
	wrapper.getComponent(AgentPillField).vm.$emit('select', 'tool:custom:custom');
	wrapper.getComponent(AgentPillField).vm.$emit('remove', 'tool:workflow:Write');
	expect(wrapper.emitted('update:modelValue')).toBeUndefined();
});
