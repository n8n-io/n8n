import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentApprovalRoute, AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import AgentToolConfigApprovalSetting from '../components/AgentToolConfigApprovalSetting.vue';
import AgentApprovalRouteSelect from '../components/AgentApprovalRouteSelect.vue';
import AgentHitlConfigurationModal from '../components/AgentHitlConfigurationModal.vue';

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
}
it('opens directly to review options with creation first and no input', async () => {
	const { wrapper } = render();
	expect(wrapper.text()).toContain('Reviewers');
	const requester = wrapper.get('[data-testid="agent-review-requester"]');
	expect(requester.text()).toBe('Ask user');
	expect(requester.find('[data-icon="info"]').exists()).toBe(true);
	expect(requester.get('button').attributes('aria-label')).toContain('asks you first');
	expect(wrapper.find('[data-testid="agent-review-remove"]').exists()).toBe(false);
	expect(wrapper.text()).toContain('Ask user');
	await openMenu(wrapper);
	const options = wrapper.findAll('[role="menuitem"]');
	expect(options.map((option) => option.text())).toEqual([
		'Create human review',
		'Finance data check',
		'Team review',
	]);
	expect(options[0].find('[data-icon="plus"]').exists()).toBe(true);
	expect(wrapper.find('input').exists()).toBe(false);
});
it('appends a review after existing pills and excludes selected reviews from the menu', async () => {
	const { wrapper } = render({ type: 'configuration', configurationIds: ['workflow'] });
	expect(wrapper.get('[data-testid="agent-review-pill"]').text()).toBe('Finance data check');
	expect(wrapper.get('[data-testid="agent-review-pill"] [data-icon="workflow"]').exists()).toBe(
		true,
	);
	await openMenu(wrapper);
	expect(wrapper.findAll('[role="menuitem"]').map((option) => option.text())).toEqual([
		'Create human review',
		'Team review',
	]);
	await wrapper.findAll('[role="menuitem"]')[1].trigger('click');
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
	expect(wrapper.text()).not.toContain('Reviews run in the order shown');
	expect(wrapper.find('[data-testid="agent-review-requester"]').exists()).toBe(true);
});
it('keeps Ask user when the last external review is removed', async () => {
	const { wrapper } = render({ type: 'configuration', configurationIds: ['workflow', 'slack'] });
	await wrapper.findAll('[data-testid="agent-review-remove"]')[0].trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		{ type: 'configuration', configurationIds: ['slack'] },
	]);
	await wrapper.setProps({ modelValue: { type: 'configuration', configurationIds: ['slack'] } });
	await wrapper.get('[data-testid="agent-review-remove"]').trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([undefined]);
	await wrapper.setProps({ modelValue: undefined });
	expect(wrapper.get('[data-testid="agent-review-requester"]').text()).toBe('Ask user');
	expect(wrapper.find('[data-testid="agent-review-remove"]').exists()).toBe(false);
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
	await wrapper.findAll('[role="menuitem"]')[0].trigger('click');
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
describe('with the modal Tools selection', () => {
	const created: AgentHitlConfiguration = {
		id: 'new',
		name: 'PII review',
		method: 'workflow',
		workflowId: 'wf2',
	};
	function renderForTool(modelValue?: AgentApprovalRoute) {
		const result = render(modelValue);
		result.config.value = {
			...result.config.value,
			tools: [
				{ type: 'workflow', workflow: 'Write' },
				{ type: 'workflow', workflow: 'Delete' },
			],
		};
		return result;
	}
	async function saveFromModal(
		wrapper: ReturnType<typeof render>['wrapper'],
		configuration: AgentHitlConfiguration,
		toolKeys: string[],
	) {
		await wrapper.setProps({ toolKey: 'tool:workflow:Write' });
		await openMenu(wrapper);
		await wrapper.findAll('[role="menuitem"]')[0].trigger('click');
		await flushPromises();
		const modal = wrapper.getComponent(AgentHitlConfigurationModal);
		expect(modal.props('includeToolKey')).toBe('tool:workflow:Write');
		modal.vm.$emit('save', configuration, toolKeys);
		await flushPromises();
	}

	it('keeps the review on this tool when the selection includes it', async () => {
		const { wrapper, saveConfiguration } = renderForTool();
		await saveFromModal(wrapper, created, ['tool:workflow:Write', 'tool:workflow:Delete']);
		expect(saveConfiguration).toHaveBeenCalledWith(created, [
			'tool:workflow:Write',
			'tool:workflow:Delete',
		]);
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
			{ type: 'configuration', configurationIds: ['new'] },
		]);
	});

	it('does not attach the review when the user removes this tool', async () => {
		const { wrapper } = renderForTool();
		await saveFromModal(wrapper, created, ['tool:workflow:Delete']);
		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
	});

	it('detaches an edited review when the user removes this tool', async () => {
		const { wrapper } = renderForTool({
			type: 'configuration',
			configurationIds: ['workflow', 'slack'],
		});
		await wrapper.setProps({ toolKey: 'tool:workflow:Write' });
		await wrapper.findAll('[data-testid="agent-review-pill"] button')[0].trigger('click');
		wrapper
			.getComponent(AgentHitlConfigurationModal)
			.vm.$emit('save', configurations[0], ['tool:workflow:Delete']);
		await flushPromises();
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
			{ type: 'configuration', configurationIds: ['slack'] },
		]);
	});

	it('attaches the review to a tool that is not in the saved config yet', async () => {
		const { wrapper } = render();
		await saveFromModal(wrapper, created, []);
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
			{ type: 'configuration', configurationIds: ['new'] },
		]);
	});
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

it('keeps the approval toggle inside the section and reveals choices when enabled', async () => {
	const { wrapper } = render();
	await wrapper.setProps({ approvalRequired: false });
	const section = wrapper.get('[data-testid="agent-review"]');
	expect(section.text()).toContain('Require approval');
	expect(wrapper.find('[data-testid="agent-review-add"]').exists()).toBe(false);
	wrapper.getComponent(AgentToolConfigApprovalSetting).vm.$emit('update:modelValue', true);
	expect(wrapper.emitted('update:approvalRequired')?.[0]).toEqual([true]);
	await wrapper.setProps({ approvalRequired: true });
	expect(wrapper.find('[data-testid="agent-review-add"]').exists()).toBe(true);
	await openMenu(wrapper);
	await wrapper.setProps({ approvalRequired: false });
	expect(wrapper.find('[role="menu"]').exists()).toBe(false);
	await wrapper.setProps({ approvalRequired: true });
	expect(wrapper.find('[role="menu"]').exists()).toBe(false);
});
it('keeps the standard approval toggle available when Human review is off', async () => {
	feature.enabled = false;
	const { wrapper } = render();
	await wrapper.setProps({ approvalRequired: false });
	expect(wrapper.findComponent(AgentToolConfigApprovalSetting).exists()).toBe(true);
	expect(wrapper.find('[data-testid="agent-review"]').exists()).toBe(false);
});

it('keeps Ask user before selected reviewers', async () => {
	const { wrapper } = render();
	await openMenu(wrapper);
	await wrapper.findAll('[role="menuitem"]')[1].trigger('click');
	expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
		{ type: 'configuration', configurationIds: ['workflow'] },
	]);
	await wrapper.setProps({ modelValue: { type: 'configuration', configurationIds: ['workflow'] } });
	expect(wrapper.find('[data-testid="agent-review-requester"]').exists()).toBe(true);
	expect(wrapper.text()).toContain('Ask user');
	expect(
		wrapper
			.get('[data-testid="agent-review-requester"]')
			.element.compareDocumentPosition(wrapper.get('[data-testid="agent-review-pill"]').element) &
			Node.DOCUMENT_POSITION_FOLLOWING,
	).toBeTruthy();
	expect(wrapper.get('[data-testid="agent-review-pill"]').text()).toBe('Finance data check');
});
