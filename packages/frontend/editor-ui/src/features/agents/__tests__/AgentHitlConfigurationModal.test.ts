import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { N8nSwitch2, N8nTooltip, N8nCombobox2, N8nSelect2 } from '@n8n/design-system';
import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import { getAgentHitlChannels } from '../composables/useAgentApi';
import AgentHitlConfigurationModal from '../components/AgentHitlConfigurationModal.vue';
import AgentHitlToolsSelect from '../components/AgentHitlToolsSelect.vue';
import AgentHitlDestinationPicker from '../components/AgentHitlDestinationPicker.vue';

vi.unmock('reka-ui');

const mocks = vi.hoisted(() => ({
	search: vi.fn(),
	create: vi.fn(),
	channels: vi.fn(),
	options: vi.fn(),
	showError: vi.fn(),
	open: vi.fn(),
}));
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({ createNewWorkflow: mocks.create }),
}));
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ searchWorkflows: mocks.search }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: mocks.showError }) }));
vi.mock('../composables/useAgentApi', () => ({
	getAgentHitlChannels: mocks.channels,
	getAgentHitlChannelOptions: mocks.options,
}));
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ getNodeType: () => null }),
}));
vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: ({ params }: { params: { workflowId: string } }) => ({
			href: `/workflow/${params.workflowId}`,
		}),
	}),
}));
vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();

	return {
		...actual,
		N8nRecycleScroller: defineComponent({
			props: ['items'],
			template: '<div><slot v-for="item in items" :item="item" /></div>',
		}),
	};
});
const config: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/test',
	instructions: 'Help',
};
function render(configuration?: AgentHitlConfiguration, agentConfig = config) {
	return mount(AgentHitlConfigurationModal, {
		props: {
			projectId: 'project',
			nextNumber: 8,
			context: { agentId: 'agent', getConfig: () => agentConfig, saveConfiguration: vi.fn() },
			configuration,
		},
		global: {
			stubs: {
				AgentModal: {
					props: ['title'],
					template:
						'<div><input data-testid="title" :value="title" @input="$emit(\'update:title\', $event.target.value)" /><slot /><slot name="footerLeft" /><slot name="footerActions" /></div>',
				},
				AgentHitlDestinationPicker: true,
			},
		},
	});
}
function getSelect(wrapper: ReturnType<typeof render>, testId: string) {
	const select = wrapper
		.findAllComponents(N8nSelect2)
		.find((component) => component.find(`[data-testid="${testId}"]`).exists());
	if (!select) throw new Error(`Select ${testId} was not found`);
	return select;
}
async function saveHint(wrapper: ReturnType<typeof render>) {
	await wrapper.get('[data-testid="agent-hitl-save-trigger"]').trigger('focus');
	await flushPromises();
	return wrapper.get('[role="tooltip"]').text();
}
beforeEach(() => {
	vi.clearAllMocks();
	mocks.search.mockResolvedValue([
		{ id: 'review', name: 'Review expenses' },
		{ id: 'other', name: 'Confirm deployment' },
	]);
	mocks.create.mockResolvedValue({ id: 'new', name: 'Support Agent approval workflow 1' });
	mocks.channels.mockResolvedValue([
		{
			channel: 'telegram',
			credentialId: 'bot',
			label: 'Telegram',
			fields: [{ name: 'recipient', type: 'text', kinds: ['user'] }],
		},
		{
			channel: 'slack',
			credentialId: 'slack',
			label: 'Slack',
			fields: [{ name: 'recipient', type: 'search', kinds: ['channel', 'user'] }],
		},
	]);
	vi.spyOn(window, 'open').mockImplementation(mocks.open);
});
afterEach(() => vi.restoreAllMocks());
it('searches workflows in a select and offers workflow creation', async () => {
	const wrapper = render();
	await flushPromises();
	const input = wrapper.get('[data-testid="agent-hitl-workflow"] input');
	await input.trigger('focus');
	await flushPromises();
	expect(wrapper.find('[role="option"]').exists()).toBe(true);
	expect(wrapper.text()).toContain('Create workflow');
	await input.setValue('expenses');
	await flushPromises();
	expect(wrapper.text()).toContain('Review expenses');
	expect(
		wrapper
			.findAll('[role="option"]')
			.filter((option) => option.isVisible())
			.map((option) => option.text()),
	).not.toContain('Confirm deployment');
});
it('explains the disabled Save on focus until a workflow is selected', async () => {
	const wrapper = render();
	await flushPromises();
	const save = wrapper.get('[data-testid="agent-hitl-save"]');
	expect(save.attributes('disabled')).toBeDefined();
	await save.trigger('click');
	expect(wrapper.emitted('save')).toBeUndefined();
	expect(wrapper.find('[role="alert"]').exists()).toBe(false);
	const trigger = wrapper.get('[data-testid="agent-hitl-save-trigger"]');
	expect(trigger.attributes('tabindex')).toBe('0');
	expect(await saveHint(wrapper)).toBe('Select a workflow');
	const picker = wrapper.getComponent(N8nCombobox2);
	expect(wrapper.find('[data-testid="agent-hitl-workflow-open"]').exists()).toBe(false);
	picker.vm.$emit('update:modelValue', 'review');
	await wrapper.vm.$nextTick();
	const openWorkflow = wrapper.get('[data-testid="agent-hitl-workflow-open"]');
	expect(openWorkflow.attributes('href')).toBe('/workflow/review');
	expect(openWorkflow.attributes('target')).toBe('_blank');
	expect(openWorkflow.attributes('aria-label')).toBe('Open workflow in a new tab');
	expect(save.attributes('disabled')).toBeUndefined();
	expect(trigger.attributes('tabindex')).toBeUndefined();
	expect(wrapper.getComponent(N8nTooltip).props('disabled')).toBe(true);
	await save.trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({ method: 'workflow', workflowId: 'review' }),
	]);
});

it('requires a configuration name before Save is enabled', async () => {
	const wrapper = render({ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' });
	await flushPromises();
	const save = wrapper.get('[data-testid="agent-hitl-save"]');
	expect(save.attributes('disabled')).toBeUndefined();
	await wrapper.get('[data-testid="title"]').setValue('  ');
	expect(save.attributes('disabled')).toBeDefined();
	expect(await saveHint(wrapper)).toBe('Enter a configuration name');
	await wrapper.get('[data-testid="title"]').setValue('Review');
	expect(save.attributes('disabled')).toBeUndefined();
});

it('names a new workflow from the Agent and the next available number', async () => {
	const wrapper = render();
	await flushPromises();
	await wrapper.find('[data-testid="title"]').setValue('Finance approvals');
	mocks.search.mockResolvedValue([
		{ name: 'Support Agent approval workflow 1' },
		{ name: 'Support Agent approval workflow 3' },
	]);
	const create = wrapper
		.getComponent(N8nCombobox2)
		.props('items')
		?.find((item) => 'value' in item && item.value === '__create_hitl_workflow__');
	if (create && 'onSelect' in create) create.onSelect?.(new Event('select'));
	await flushPromises();
	expect(mocks.create).toHaveBeenCalledWith(
		expect.objectContaining({
			name: 'Support Agent approval workflow 2',
			projectId: 'project',
			nodes: [
				expect.objectContaining({ type: 'n8n-nodes-base.agentDecisionTrigger' }),
				expect.objectContaining({
					type: 'n8n-nodes-base.agentDecisionResponse',
					parameters: { approved: false },
				}),
			],
		}),
	);
	const save = wrapper.findAll('button').find((button) => button.text() === 'Save');
	await save?.trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({ name: 'Finance approvals', method: 'workflow', workflowId: 'new' }),
	]);
});
it('saves a Telegram destination and rejects a username', async () => {
	const wrapper = render();
	await flushPromises();
	getSelect(wrapper, 'agent-hitl-method').vm.$emit('update:modelValue', 'channel');
	await wrapper.vm.$nextTick();
	const save = wrapper.get('[data-testid="agent-hitl-save"]');
	expect(save.attributes('disabled')).toBeDefined();
	expect(await saveHint(wrapper)).toBe('Select a channel and complete its configuration');
	getSelect(wrapper, 'agent-hitl-channel').vm.$emit('update:modelValue', 'telegram:bot');
	await wrapper.vm.$nextTick();
	await wrapper.find('[data-testid="agent-hitl-telegram-user"]').setValue('@reviewer');
	expect(save.attributes('disabled')).toBeDefined();
	await save.trigger('click');
	expect(wrapper.emitted('save')).toBeUndefined();
	expect(wrapper.find('[role="alert"]').exists()).toBe(false);
	await wrapper.find('[data-testid="agent-hitl-telegram-user"]').setValue('12345');
	expect(save.attributes('disabled')).toBeUndefined();
	expect(wrapper.getComponent(N8nTooltip).props('disabled')).toBe(true);
	await save.trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({
			method: 'channel',
			channel: 'telegram',
			credentialId: 'bot',
			recipient: { kind: 'user', id: '12345', name: '12345' },
		}),
	]);
});

it('requires a new recipient when the Slack destination type changes', async () => {
	const wrapper = render({
		id: 'review',
		name: 'Review',
		method: 'channel',
		channel: 'slack',
		credentialId: 'slack',
		recipient: { kind: 'user', id: 'U1', name: 'Reviewer' },
	});
	await flushPromises();
	const save = wrapper.get('[data-testid="agent-hitl-save"]');
	expect(save.attributes('disabled')).toBeUndefined();
	getSelect(wrapper, 'agent-hitl-recipient-type').vm.$emit('update:modelValue', 'channel');
	await wrapper.vm.$nextTick();
	expect(save.attributes('disabled')).toBeDefined();
	expect(await saveHint(wrapper)).toBe('Select a channel and complete its configuration');
	wrapper
		.getComponent(AgentHitlDestinationPicker)
		.vm.$emit('update:modelValue', { id: 'C1', name: 'Approvals' });
	await wrapper.vm.$nextTick();
	expect(save.attributes('disabled')).toBeUndefined();
});

it('requires both a Discord server and a recipient before Save is enabled', async () => {
	mocks.channels.mockResolvedValue([
		{
			channel: 'discord',
			credentialId: 'bot',
			label: 'Discord',
			fields: [
				{ name: 'guild', type: 'search' },
				{ name: 'recipient', type: 'search', kinds: ['channel', 'user'] },
			],
		},
	]);
	const wrapper = render();
	await flushPromises();
	getSelect(wrapper, 'agent-hitl-method').vm.$emit('update:modelValue', 'channel');
	await wrapper.vm.$nextTick();
	getSelect(wrapper, 'agent-hitl-channel').vm.$emit('update:modelValue', 'discord:bot');
	await wrapper.vm.$nextTick();
	const save = wrapper.get('[data-testid="agent-hitl-save"]');
	expect(save.attributes('disabled')).toBeDefined();
	const server = wrapper.getComponent(AgentHitlDestinationPicker);
	server.vm.$emit('update:modelValue', { id: '123', name: 'Review server' });
	await wrapper.vm.$nextTick();
	expect(save.attributes('disabled')).toBeDefined();
	wrapper
		.findAllComponents(AgentHitlDestinationPicker)[1]
		.vm.$emit('update:modelValue', { id: '456', name: 'Approvals' });
	await wrapper.vm.$nextTick();
	expect(save.attributes('disabled')).toBeUndefined();
	server.vm.$emit('update:modelValue', { id: '789', name: 'Another server' });
	await wrapper.vm.$nextTick();
	expect(save.attributes('disabled')).toBeDefined();
});
it('preserves an existing channel configuration and queries its selected connection', async () => {
	const wrapper = render({
		id: 'existing',
		name: 'Review',
		method: 'channel',
		channel: 'slack',
		credentialId: 'slack',
		recipient: { kind: 'user', id: 'U1', name: 'Reviewer' },
	});
	await flushPromises();
	const picker = wrapper.findComponent(AgentHitlDestinationPicker);
	expect(picker.props('modelValue')).toEqual({ id: 'U1', name: 'Reviewer' });
	mocks.options.mockResolvedValue({ options: [] });
	await picker.props('load')('review', 'next');
	expect(mocks.options).toHaveBeenCalledWith(
		{},
		'project',
		'agent',
		expect.objectContaining({
			channel: 'slack',
			credentialId: 'slack',
			field: 'user',
			query: 'review',
			cursor: 'next',
		}),
	);
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Save')
		?.trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({
			id: 'existing',
			recipient: { kind: 'user', id: 'U1', name: 'Reviewer' },
		}),
	]);
});

it('defaults administrator approval off and saves the selected policy', async () => {
	const wrapper = render({ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' });
	await flushPromises();
	const toggle = wrapper.getComponent(N8nSwitch2);
	expect(toggle.props('modelValue')).toBe(false);
	toggle.vm.$emit('update:modelValue', true);
	await wrapper.vm.$nextTick();
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Save')
		?.trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({ disallowRequesterApproval: true, workflowId: 'wf' }),
	]);
});

it('disables channel approval with a separate explanation when no channels are attached', async () => {
	mocks.channels.mockResolvedValue([]);
	const wrapper = render();
	await flushPromises();
	const method = getSelect(wrapper, 'agent-hitl-method');
	expect(method.props('items')).toContainEqual(
		expect.objectContaining({ value: 'channel', disabled: true }),
	);
	await wrapper.get('[data-testid="agent-hitl-method"]').trigger('keydown', { key: 'Enter' });
	await flushPromises();
	const option = document.querySelector('[role="option"][data-disabled]');
	expect(option?.textContent).toContain('No supported channels are attached to this Agent');
	expect(wrapper.find('[data-testid="agent-hitl-channel"]').exists()).toBe(false);
});

it('keeps channel approval disabled until the available connections load', async () => {
	const wrapper = render();
	expect(getSelect(wrapper, 'agent-hitl-method').props('items')).toContainEqual(
		expect.objectContaining({ value: 'channel', disabled: true }),
	);
	await flushPromises();
	expect(getSelect(wrapper, 'agent-hitl-method').props('items')).toContainEqual(
		expect.objectContaining({ value: 'channel', disabled: false }),
	);
});

it.each(['none', 3600, 86400, 604800] as const)('saves the request expiry %s', async (expiry) => {
	const wrapper = render({ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' });
	await flushPromises();
	const selector = getSelect(wrapper, 'agent-hitl-expiry');
	expect(selector.props('modelValue')).toBe('none');
	selector.vm.$emit('update:modelValue', expiry);
	await wrapper.vm.$nextTick();
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Save')
		?.trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({ expirySeconds: expiry === 'none' ? undefined : expiry }),
	]);
});

it('opens a saved expiry and allows requests with no expiry again', async () => {
	const wrapper = render({
		id: 'review',
		name: 'Review',
		method: 'workflow',
		workflowId: 'wf',
		expirySeconds: 86400,
	});
	await flushPromises();
	const selector = getSelect(wrapper, 'agent-hitl-expiry');
	expect(selector.props('modelValue')).toBe(86400);
	selector.vm.$emit('update:modelValue', 'none');
	await wrapper.vm.$nextTick();
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Save')
		?.trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({ expirySeconds: undefined }),
	]);
});

it('keeps tool attachment changes local until Save', async () => {
	const configuration: AgentHitlConfiguration = {
		id: 'review',
		name: 'Review',
		method: 'workflow',
		workflowId: 'wf',
	};
	const wrapper = render(configuration, {
		...config,
		tools: [
			{
				type: 'workflow',
				workflow: 'Write',
				requireApproval: true,
				approvalRoute: { type: 'configuration', configurationId: 'review' },
			},
		],
	});
	await flushPromises();
	const tools = wrapper.getComponent(AgentHitlToolsSelect);
	expect(tools.props('modelValue')).toEqual(['tool:workflow:Write']);
	tools.vm.$emit('update:modelValue', []);
	await wrapper.vm.$nextTick();
	expect(wrapper.emitted('save')).toBeUndefined();
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([expect.objectContaining({ id: 'review' }), []]);
});

it('uses the tool modal Remove action', async () => {
	const wrapper = render({ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' });
	await flushPromises();
	const remove = wrapper.get('[data-testid="agent-hitl-remove"]');
	expect(remove.text()).toBe('Remove');
	expect(remove.find('[data-icon="trash-2"]').exists()).toBe(true);
	await remove.trigger('click');
	expect(wrapper.emitted('remove')).toHaveLength(1);
});

it('shows platform icons in the channel select and recipient icons for each destination type', async () => {
	const wrapper = render({
		id: 'review',
		name: 'Review',
		method: 'channel',
		channel: 'slack',
		credentialId: 'slack',
		recipient: { kind: 'user', id: 'U1', name: 'Reviewer' },
	});
	await flushPromises();
	const platforms = wrapper.get('[data-testid="agent-hitl-channel"]');
	expect(getSelect(wrapper, 'agent-hitl-channel').props('items')).toEqual([
		{ value: 'telegram:bot', label: 'Telegram', icon: 'telegram' },
		{ value: 'slack:slack', label: 'Slack', icon: 'slack' },
	]);
	expect(platforms.find('[data-icon="slack"]').exists()).toBe(true);
	expect(platforms.text()).toContain('Slack');
	const types = wrapper.get('[data-testid="agent-hitl-recipient-type"]');
	expect(getSelect(wrapper, 'agent-hitl-recipient-type').props('items')).toEqual([
		expect.objectContaining({ value: 'channel', icon: 'hash' }),
		expect.objectContaining({ value: 'user', icon: 'user' }),
	]);
	expect(types.find('[data-icon="user"]').exists()).toBe(true);
	expect(wrapper.getComponent(AgentHitlDestinationPicker).props('icon')).toBe('user');
	getSelect(wrapper, 'agent-hitl-recipient-type').vm.$emit('update:modelValue', 'channel');
	await wrapper.vm.$nextTick();
	expect(wrapper.getComponent(AgentHitlDestinationPicker).props('icon')).toBe('hash');
});

it('uses Approval settings for new configurations and preserves saved names', async () => {
	const wrapper = render();
	await flushPromises();
	expect(wrapper.get('[data-testid="title"]').element).toHaveProperty(
		'value',
		'Approval settings 8',
	);
	const saved = render({
		id: 'existing',
		name: 'HITL Settings 1',
		method: 'workflow',
		workflowId: 'wf',
	});
	await flushPromises();
	expect(saved.get('[data-testid="title"]').element).toHaveProperty('value', 'HITL Settings 1');
});

it('renders a saved channel icon and label after loading without opening the select', async () => {
	let resolveChannels: (channels: Awaited<ReturnType<typeof getAgentHitlChannels>>) => void =
		() => {};
	mocks.channels.mockReturnValueOnce(
		new Promise((resolve) => {
			resolveChannels = resolve;
		}),
	);
	const wrapper = render({
		id: 'review',
		name: 'Review',
		method: 'channel',
		channel: 'slack',
		credentialId: 'slack',
		recipient: { kind: 'channel', id: 'C1' },
	});
	await flushPromises();
	const select = wrapper.get('[data-testid="agent-hitl-channel"]');
	expect(getSelect(wrapper, 'agent-hitl-channel').props('disabled')).toBe(true);
	resolveChannels([{ channel: 'slack', credentialId: 'slack', label: 'Slack', fields: [] }]);
	await flushPromises();
	expect(getSelect(wrapper, 'agent-hitl-channel').props('disabled')).toBe(false);
	expect(select.attributes('aria-expanded')).toBe('false');
	expect(select.text()).toBe('Slack');
	expect(select.get('[data-icon="slack"]').exists()).toBe(true);
});
