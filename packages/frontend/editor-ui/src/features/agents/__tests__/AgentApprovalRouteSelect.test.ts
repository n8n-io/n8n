import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentApprovalRoute, AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import AgentApprovalRouteSelect from '../components/AgentApprovalRouteSelect.vue';
import AgentHitlConfigurationModal from '../components/AgentHitlConfigurationModal.vue';

enableAutoUnmount(afterEach);

const configurations: AgentHitlConfiguration[] = [
	{ id: 'workflow', name: 'HITL Settings 1', method: 'workflow', workflowId: 'wf' },
	{
		id: 'slack',
		name: 'Slack review',
		method: 'channel',
		channel: 'slack',
		credentialId: 'slack',
		recipient: { kind: 'channel', id: 'C1' },
		disallowRequesterApproval: true,
	},
	{
		id: 'telegram',
		name: 'Telegram review',
		method: 'channel',
		channel: 'telegram',
		credentialId: 'telegram',
		recipient: { kind: 'user', id: '123' },
		disallowRequesterApproval: false,
	},
	{
		id: 'discord',
		name: 'Discord review',
		method: 'channel',
		channel: 'discord',
		credentialId: 'discord',
		recipient: { kind: 'channel', id: 'C2' },
		guildId: 'server',
		disallowRequesterApproval: true,
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
		global: { stubs: { AgentHitlConfigurationModal: true } },
	});
	return { wrapper, config, saveConfiguration };
}

it('lists creation first, the default, and each configuration with its approval policy and icon', async () => {
	const { wrapper } = render();
	const input = wrapper.get<HTMLInputElement>('input');
	expect(wrapper.get('label').text()).toBe('Approval settings');
	expect(input.attributes('aria-label')).toBe('Approval settings');
	expect(input.element.value).toBe('Ask user');
	await input.trigger('focus');
	await flushPromises();
	const options = wrapper.findAll('[role="option"]');
	expect(options.map((option) => option.text())).toEqual([
		'Create configuration',
		'Ask user',
		'Ask user or HITL Settings 1',
		'Only use Slack review',
		'Ask user or Telegram review',
		'Only use Discord review',
	]);
	for (const [index, icon] of [
		'plus',
		'user',
		'workflow',
		'slack',
		'telegram',
		'discord',
	].entries()) {
		expect(options[index].find(`[data-icon="${icon}"]`).exists()).toBe(true);
	}
	await wrapper.setProps({ label: 'Approval settings for Ask first tools' });
	expect(wrapper.get('label').text()).toBe('Approval settings for Ask first tools');
	expect(input.attributes('aria-label')).toBe('Approval settings for Ask first tools');
});

it('searches configurations and keeps the selected policy and icon in the field', async () => {
	const { wrapper, config } = render();
	const input = wrapper.get<HTMLInputElement>('input');
	await input.trigger('focus');
	await input.setValue('slack');
	await flushPromises();
	const options = wrapper.findAll('[role="option"]').filter((option) => option.isVisible());
	expect(options.map((option) => option.text())).toEqual(['Only use Slack review']);
	await options[0].trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		{ type: 'configuration', configurationId: 'slack' },
	]);
	await wrapper.setProps({ modelValue: { type: 'configuration', configurationId: 'slack' } });
	expect(input.element.value).toBe('Only use Slack review');
	expect(wrapper.get('[data-testid="agent-approval-route"] [data-icon="slack"]').exists()).toBe(
		true,
	);
	config.value = {
		...config.value,
		hitlConfigurations: configurations.map((configuration) => ({
			...configuration,
			disallowRequesterApproval: false,
		})),
	};
	await flushPromises();
	expect(input.element.value).toBe('Ask user or Slack review');
	await input.trigger('focus');
	await input.setValue('Ask user');
	await flushPromises();
	await wrapper
		.findAll('[role="option"]')
		.find((option) => option.text() === 'Ask user')
		?.trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([undefined]);
});

it('opens creation without changing the route and selects the saved configuration', async () => {
	const route = { type: 'configuration', configurationId: 'slack' } as const;
	const { wrapper, saveConfiguration } = render(route);
	const input = wrapper.get<HTMLInputElement>('input');
	await input.trigger('focus');
	await flushPromises();
	await wrapper.get('[role="option"]').trigger('click');
	await flushPromises();
	expect(wrapper.emitted('update:modelValue')).toBeUndefined();
	expect(input.element.value).toBe('Only use Slack review');
	const modal = wrapper.getComponent(AgentHitlConfigurationModal);
	expect(modal.props('nextNumber')).toBe(5);
	modal.vm.$emit('close');
	await flushPromises();
	expect(wrapper.findComponent(AgentHitlConfigurationModal).exists()).toBe(false);
	expect(wrapper.emitted('update:modelValue')).toBeUndefined();
	await input.trigger('focus');
	await flushPromises();
	await wrapper.get('[role="option"]').trigger('click');
	await flushPromises();
	const configuration: AgentHitlConfiguration = {
		id: 'new',
		name: 'New review',
		method: 'workflow',
		workflowId: 'wf2',
	};
	wrapper
		.getComponent(AgentHitlConfigurationModal)
		.vm.$emit('save', configuration, ['tool:workflow:Write']);
	await flushPromises();
	expect(saveConfiguration).toHaveBeenCalledWith(configuration, ['tool:workflow:Write']);
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		{ type: 'configuration', configurationId: 'new' },
	]);
	expect(wrapper.findComponent(AgentHitlConfigurationModal).exists()).toBe(false);
});
