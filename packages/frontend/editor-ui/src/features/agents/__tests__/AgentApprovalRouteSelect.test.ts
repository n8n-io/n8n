import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentApprovalRoute, AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import AgentApprovalRouteSelect from '../components/AgentApprovalRouteSelect.vue';
import AgentHitlConfigurationModal from '../components/AgentHitlConfigurationModal.vue';

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
async function openMenu(wrapper: ReturnType<typeof render>['wrapper']) {
	await wrapper.get('[data-testid="agent-review-add"]').trigger('click');
	await flushPromises();
	await wrapper.get('input').trigger('focus');
	await flushPromises();
}
it('shows the default and opens a searchable add menu with creation first', async () => {
	const { wrapper } = render();
	expect(wrapper.text()).toContain('Human review for approval');
	expect(wrapper.text()).toContain('Ask user');
	await openMenu(wrapper);
	const options = wrapper.findAll('[role="option"]');
	expect(options.map((option) => option.text())).toEqual([
		'Create human review',
		'Finance data check',
		'Team review',
	]);
	expect(options[0].find('[data-icon="plus"]').exists()).toBe(true);
	await wrapper.get('input').setValue('team');
	await flushPromises();
	expect(
		wrapper
			.findAll('[role="option"]')
			.filter((option) => option.isVisible())
			.map((option) => option.text()),
	).toEqual(['Team review']);
});
it('appends a review after existing pills and excludes selected reviews from the menu', async () => {
	const { wrapper } = render({ type: 'configuration', configurationIds: ['workflow'] });
	expect(wrapper.get('[data-testid="agent-review-pill"]').text()).toBe('Finance data check');
	expect(wrapper.get('[data-testid="agent-review-pill"] [data-icon="workflow"]').exists()).toBe(
		true,
	);
	await openMenu(wrapper);
	expect(wrapper.findAll('[role="option"]').map((option) => option.text())).toEqual([
		'Create human review',
		'Team review',
	]);
	await wrapper.findAll('[role="option"]')[1].trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		{ type: 'configuration', configurationIds: ['workflow', 'slack'] },
	]);
	await wrapper.setProps({
		modelValue: { type: 'configuration', configurationIds: ['workflow', 'slack'] },
	});
	expect(wrapper.findAll('[data-testid="agent-review-pill"]').map((pill) => pill.text())).toEqual([
		'Finance data check',
		'Team review',
	]);
	expect(wrapper.text()).toContain('Reviews run in the order shown');
});
it('removes only the selected pill and falls back to Ask user after removing the last', async () => {
	const { wrapper } = render({ type: 'configuration', configurationIds: ['workflow', 'slack'] });
	await wrapper.findAll('[data-testid="agent-review-remove"]')[0].trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		{ type: 'configuration', configurationIds: ['slack'] },
	]);
	await wrapper.setProps({ modelValue: { type: 'configuration', configurationIds: ['slack'] } });
	await wrapper.get('[data-testid="agent-review-remove"]').trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([undefined]);
});
it('opens an existing review for editing without changing its order', async () => {
	const { wrapper, saveConfiguration } = render({
		type: 'configuration',
		configurationIds: ['slack', 'workflow'],
	});
	await wrapper.findAll('[data-testid="agent-review-pill"] button')[0].trigger('click');
	expect(wrapper.getComponent(AgentHitlConfigurationModal).props('configuration')).toEqual(
		configurations[1],
	);
	const updated = { ...configurations[1], name: 'Team leads' };
	wrapper.getComponent(AgentHitlConfigurationModal).vm.$emit('save', updated);
	await flushPromises();
	expect(saveConfiguration).toHaveBeenCalledWith(updated, undefined);
	expect(wrapper.emitted('update:modelValue')).toBeUndefined();
});
it('creates a review from the plus menu and appends it without changing existing pills', async () => {
	const { wrapper, saveConfiguration } = render({
		type: 'configuration',
		configurationIds: ['slack'],
	});
	await openMenu(wrapper);
	await wrapper.findAll('[role="option"]')[0].trigger('click');
	await flushPromises();
	const created: AgentHitlConfiguration = {
		id: 'new',
		name: 'PII review',
		method: 'workflow',
		workflowId: 'wf2',
	};
	wrapper.getComponent(AgentHitlConfigurationModal).vm.$emit('save', created);
	await flushPromises();
	expect(saveConfiguration).toHaveBeenCalledWith(created, undefined);
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		{ type: 'configuration', configurationIds: ['slack', 'new'] },
	]);
});
it('disables attachment and removal under a read-only lock', async () => {
	const { wrapper } = render({ type: 'configuration', configurationIds: ['workflow'] });
	await wrapper.setProps({ disabled: true });
	expect(wrapper.get('[data-testid="agent-review-add"]').attributes('disabled')).toBeDefined();
	expect(wrapper.get('[data-testid="agent-review-remove"]').attributes('disabled')).toBeDefined();
});
it('hides controls when the feature is disabled', () => {
	feature.enabled = false;
	expect(render().wrapper.find('[data-testid="agent-approval-route"]').exists()).toBe(false);
});
