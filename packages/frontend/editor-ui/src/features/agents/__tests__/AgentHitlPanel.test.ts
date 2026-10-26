import { mount } from '@vue/test-utils';
import type { AgentJsonConfig } from '@n8n/api-types';
import AgentHitlPanel from '../components/AgentHitlPanel.vue';
import AgentHitlConfigurationModal from '../components/AgentHitlConfigurationModal.vue';
import AgentItemContextMenu from '../components/AgentItemContextMenu.vue';

const configuration = {
	id: 'review',
	name: 'Finance approvals',
	method: 'workflow',
	workflowId: 'wf',
} as const;
const config: AgentJsonConfig = {
	name: 'Agent',
	model: 'anthropic/test',
	instructions: 'Help',
	hitlConfigurations: [configuration],
};
function render(disabled = false) {
	return mount(AgentHitlPanel, {
		props: { config, projectId: 'project', agentId: 'agent', disabled },
		global: {
			stubs: {
				AgentPanel: { template: '<section><slot /></section>' },
				AgentHitlConfigurationModal: true,
				AgentItemContextMenu: { template: '<div><slot /></div>', emits: ['remove'] },
			},
		},
	});
}
it('edits configurations from pills and creates one with the plus action', async () => {
	const wrapper = render();
	expect(wrapper.find('[data-testid="agent-approval-route"]').exists()).toBe(false);
	await wrapper.get('[data-testid="agent-hitl-configuration"]').trigger('click');
	expect(wrapper.getComponent(AgentHitlConfigurationModal).props('configuration')).toEqual(
		configuration,
	);
	wrapper.getComponent(AgentHitlConfigurationModal).vm.$emit('close');
	await wrapper.vm.$nextTick();
	await wrapper.get('[data-testid="agent-hitl-add"]').trigger('click');
	expect(wrapper.getComponent(AgentHitlConfigurationModal).props('configuration')).toBeUndefined();
});
it('removes a configuration and clears its tool and MCP references', async () => {
	const wrapper = render();
	await wrapper.setProps({
		config: {
			...config,
			tools: [
				{
					type: 'workflow',
					workflow: 'Write records',
					name: 'write',
					approvalRoute: { type: 'configuration', configurationId: 'review' },
					requireApproval: true,
				},
			],
			mcpServers: [
				{
					name: 'server',
					transport: 'streamableHttp',
					authentication: 'none',
					url: 'https://example.com/mcp',
					approvalRoute: { type: 'configuration', configurationId: 'review' },
				},
			],
		},
	});
	wrapper.getComponent(AgentItemContextMenu).vm.$emit('remove');
	expect(wrapper.emitted('update:config')?.[0]).toEqual([
		{
			hitlConfigurations: [],
			tools: [expect.objectContaining({ approvalRoute: undefined, requireApproval: true })],
			mcpServers: [expect.objectContaining({ approvalRoute: undefined })],
		},
	]);
});
it('keeps configuration actions disabled under the edit lock', async () => {
	const wrapper = render(true);
	expect(wrapper.get('[data-testid="agent-hitl-add"]').attributes('disabled')).toBeDefined();
	expect(
		wrapper.get('[data-testid="agent-hitl-configuration"]').attributes('disabled'),
	).toBeDefined();
	wrapper.getComponent(AgentItemContextMenu).vm.$emit('remove');
	expect(wrapper.emitted('update:config')).toBeUndefined();
});
