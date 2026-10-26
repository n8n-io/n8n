import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
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
			props: ['value', 'label'],
			setup() {
				return { select: inject<(value: string) => void>('select') };
			},
			template: '<button type="button" @click="select?.(value)">{{ label }}</button>',
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
					props: ['title', 'titleError'],
					template:
						'<div><input data-testid="title" :value="title" @input="$emit(\'update:title\', $event.target.value)" /><span>{{ titleError }}</span><slot /><slot name="footerActions" /></div>',
				},
				AgentHitlDestinationPicker: true,
			},
		},
	});
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
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Telegram')
		?.trigger('click');
	await wrapper.find('[data-testid="agent-hitl-telegram-user"]').setValue('@reviewer');
	const save = wrapper.findAll('button').find((button) => button.text() === 'Save');
	await save?.trigger('click');
	expect(wrapper.emitted('save')).toBeUndefined();
	await wrapper.find('[data-testid="agent-hitl-telegram-user"]').setValue('12345');
	await save?.trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({
			method: 'channel',
			channel: 'telegram',
			credentialId: 'bot',
			recipient: { kind: 'user', id: '12345', name: '12345' },
		}),
	]);
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
