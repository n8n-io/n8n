import { mount } from '@vue/test-utils';
import { N8nSelect2 } from '@n8n/design-system';
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
const config: AgentJsonConfig = {
	name: 'Agent',
	model: 'test',
	instructions: 'Help',
	tools: [
		{ type: 'node', name: 'send_message', node: { nodeType: 'slack', nodeTypeVersion: 1 } },
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
it('lists node, workflow, custom, and MCP tools with their names and icons', () => {
	const wrapper = mount(AgentHitlToolsSelect, {
		props: {
			modelValue: ['tool:node:send_message', 'tool:workflow:Write'],
			config,
			getCustomToolName: () => 'Custom action',
		},
	});
	expect(wrapper.getComponent(N8nSelect2).props('items')).toEqual([
		expect.objectContaining({
			value: 'tool:node:send_message',
			label: 'Send message',
			nodeType: expect.objectContaining({ name: 'slack' }),
		}),
		expect.objectContaining({ label: 'Write', icon: 'workflow' }),
		expect.objectContaining({ label: 'Custom action', icon: 'code' }),
		expect.objectContaining({ label: 'Server', icon: 'mcp' }),
	]);
	const tags = wrapper.findAll('[data-testid="agent-hitl-tool-tag"]');
	expect(tags.map((tag) => tag.element.tagName)).toEqual(['SPAN', 'SPAN']);
	expect(tags[0].text()).toContain('Send message');
	expect(tags[0].get('[data-testid="node-icon"]').text()).toBe('slack');
	expect(tags[1].get('[data-icon="workflow"]').exists()).toBe(true);
});
it('emits selected tool keys and updates the pills from the selected values', async () => {
	const wrapper = mount(AgentHitlToolsSelect, { props: { modelValue: [], config } });
	wrapper.getComponent(N8nSelect2).vm.$emit('update:modelValue', ['tool:custom:custom']);
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['tool:custom:custom']]);
	await wrapper.setProps({ modelValue: ['tool:custom:custom'] });
	expect(wrapper.get('[data-testid="agent-hitl-tool-tag"]').text()).toBe('Custom');
});
