import { enableAutoUnmount, mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentApprovalRoute, AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import AgentToolConfigApprovalSetting from '../components/AgentToolConfigApprovalSetting.vue';
import AgentApprovalRouteSelect from '../components/AgentApprovalRouteSelect.vue';
import AgentApprovalDestinationMenu from '../components/AgentApprovalDestinationMenu.vue';

vi.unmock('reka-ui');

enableAutoUnmount(afterEach);
const feature = vi.hoisted(() => ({ enabled: true }));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isAgentModuleActive: () => feature.enabled }),
}));
beforeEach(() => {
	feature.enabled = true;
});
const configurations: AgentHitlConfiguration[] = [
	{ id: 'workflow', name: 'Finance data check', method: 'workflow', workflowId: 'wf' },
	{
		id: 'slack',
		name: 'Team review',
		method: 'channel',
		channel: 'slack',
		credentialId: 'slack',
		recipient: { kind: 'channel', id: 'C1' },
	},
];
function render(modelValue?: AgentApprovalRoute) {
	const config = ref<AgentJsonConfig>({
		name: 'Agent',
		model: 'test',
		instructions: 'Help',
		hitlConfigurations: configurations,
	});
	const saveConfiguration = vi.fn();
	const wrapper = mount(AgentApprovalRouteSelect, {
		props: {
			modelValue,
			projectId: 'project',
			context: { getConfig: () => config.value, saveConfiguration },
		},
		global: { stubs: { AgentHitlConfigurationModal: true, AgentApprovalDestinationMenu: true } },
	});
	return { wrapper, config, saveConfiguration };
}

it('starts MCP approvers collapsed and lets users attach an existing approval', async () => {
	const { wrapper } = render({ type: 'configuration', configurationIds: ['workflow'] });
	expect(wrapper.text()).toContain('Send approval to');
	expect(wrapper.findComponent(AgentApprovalDestinationMenu).exists()).toBe(false);
	await wrapper.get('[data-testid="agent-approval-expand"]').trigger('click');
	const menu = wrapper.getComponent(AgentApprovalDestinationMenu);
	expect(menu.props('excludeIds')).toEqual(['workflow']);
	menu.vm.$emit('attach', 'slack');
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		{ type: 'configuration', configurationIds: ['workflow', 'slack'] },
	]);
});

it('hides Send to until Require approval is on and starts collapsed each time', async () => {
	const { wrapper } = render();
	await wrapper.setProps({ approvalRequired: false });
	expect(wrapper.getComponent(AgentToolConfigApprovalSetting).props('modelValue')).toBe(false);
	expect(wrapper.find('[data-testid="agent-approval-expand"]').exists()).toBe(false);
	await wrapper.setProps({ approvalRequired: true });
	await wrapper.get('[data-testid="agent-approval-expand"]').trigger('click');
	expect(wrapper.findComponent(AgentApprovalDestinationMenu).exists()).toBe(true);
	await wrapper.setProps({ approvalRequired: false });
	await wrapper.setProps({ approvalRequired: true });
	expect(wrapper.get('[data-testid="agent-approval-expand"]').attributes('aria-expanded')).toBe(
		'false',
	);
});

it('creates and attaches an approver without opening settings', async () => {
	const { wrapper, saveConfiguration } = render();
	await wrapper.get('[data-testid="agent-approval-expand"]').trigger('click');
	wrapper.getComponent(AgentApprovalDestinationMenu).vm.$emit('select', {
		method: 'workflow',
		workflowId: 'wf',
		name: 'New approver',
	});
	expect(saveConfiguration).toHaveBeenCalledWith(expect.objectContaining({ name: 'New approver' }));
	const { id } = saveConfiguration.mock.calls[0][0];
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		{ type: 'configuration', configurationIds: [id] },
	]);
});
