import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { N8nSwitch2, N8nTooltip } from '@n8n/design-system';
import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import AgentHitlConfigurationModal from '../components/AgentHitlConfigurationModal.vue';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import AgentHitlDestinationPicker from '../components/AgentHitlDestinationPicker.vue';

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
vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: () => ({ href: '/workflow/new' }) }),
}));
vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	const { inject, provide } = await import('vue');
	return {
		...actual,
		N8nRecycleScroller: defineComponent({
			props: ['items'],
			template: '<div><slot v-for="item in items" :item="item" /></div>',
		}),
		N8nSelect: defineComponent({
			props: ['modelValue'],
			emits: ['update:modelValue'],
			setup(_props, { emit }) {
				provide('select', (value: string) => emit('update:modelValue', value));
			},
			template: '<div><slot /></div>',
		}),
		N8nOption: defineComponent({
			props: ['value', 'label', 'disabled'],
			setup() {
				return { select: inject<(value: string) => void>('select') };
			},
			template:
				'<button type="button" :disabled="disabled" @click="select?.(value)"><slot>{{ label }}</slot></button>',
		}),
	};
});
const config: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/test',
	instructions: 'Help',
};
function render(configuration?: AgentHitlConfiguration) {
	return mount(AgentHitlConfigurationModal, {
		props: {
			projectId: 'project',
			nextNumber: 8,
			context: { agentId: 'agent', getConfig: () => config, saveConfiguration: vi.fn() },
			configuration,
		},
		global: {
			stubs: {
				AgentModal: {
					props: ['title'],
					template:
						'<div><input data-testid="title" :value="title" @input="$emit(\'update:title\', $event.target.value)" /><slot /><slot name="footerActions" /></div>',
				},
				AgentHitlDestinationPicker: true,
			},
		},
	});
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
	mocks.create.mockResolvedValue({ id: 'new', name: 'Support Agent HITL workflow 1' });
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
it('reuses the searchable workflow picker and keeps create in its list', async () => {
	const wrapper = render();
	await flushPromises();
	expect(wrapper.findComponent(ToolsConnectionModal).exists()).toBe(true);
	expect(wrapper.find('[data-test-id="agent-hitl-create-workflow"]').exists()).toBe(true);
	const search = wrapper.find('input[placeholder="Search workflows"]');
	expect(search.exists()).toBe(true);
	await search.setValue('expenses');
	await vi.waitFor(() => {
		expect(wrapper.text()).toContain('Review expenses');
		expect(wrapper.text()).not.toContain('Confirm deployment');
	});
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
	const picker = wrapper.getComponent(ToolsConnectionModal);
	picker.vm.$emit('connect', picker.props('items')[0]);
	await wrapper.vm.$nextTick();
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
		{ name: 'Support Agent HITL workflow 1' },
		{ name: 'Support Agent HITL workflow 3' },
	]);
	await wrapper.find('[data-test-id="agent-hitl-create-workflow"]').trigger('click');
	await flushPromises();
	expect(mocks.create).toHaveBeenCalledWith(
		expect.objectContaining({
			name: 'Support Agent HITL workflow 2',
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
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Connected channel')
		?.trigger('click');
	const save = wrapper.get('[data-testid="agent-hitl-save"]');
	expect(save.attributes('disabled')).toBeDefined();
	expect(await saveHint(wrapper)).toBe('Select a channel and complete its configuration');
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Telegram')
		?.trigger('click');
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
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Channel')
		?.trigger('click');
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
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Connected channel')
		?.trigger('click');
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Discord')
		?.trigger('click');
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
	const option = wrapper.get('[data-testid="agent-hitl-channel-method"]');
	expect(option.attributes('disabled')).toBeDefined();
	expect(option.findAll('span').map((span) => span.text())).toContain(
		'No supported channels are attached to this Agent',
	);
	await option.trigger('click');
	expect(wrapper.find('[data-testid="agent-hitl-channel"]').exists()).toBe(false);
});

it('keeps channel approval disabled until the available connections load', async () => {
	const wrapper = render();
	expect(
		wrapper.get('[data-testid="agent-hitl-channel-method"]').attributes('disabled'),
	).toBeDefined();
	await flushPromises();
	expect(
		wrapper.get('[data-testid="agent-hitl-channel-method"]').attributes('disabled'),
	).toBeUndefined();
});

it.each(['none', 3600, 86400, 604800] as const)('saves the request expiry %s', async (expiry) => {
	const wrapper = render({ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' });
	await flushPromises();
	const selector = wrapper.findComponent('[data-testid="agent-hitl-expiry"]');
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
	const selector = wrapper.findComponent('[data-testid="agent-hitl-expiry"]');
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
