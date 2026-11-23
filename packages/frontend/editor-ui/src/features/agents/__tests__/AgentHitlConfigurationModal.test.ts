import type { IWorkflowBase } from 'n8n-workflow';
import { LOCAL_STORAGE_CANVAS_GROUP_EXPANDED } from '@/app/constants/localStorage';
import { useCanvasGroupIdStorage } from '@/features/workflows/canvas/composables/useCanvasGroupIdStorage';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, type ComponentPublicInstance } from 'vue';
import {
	N8nTooltip,
	N8nSelect2,
	N8nSegmentControl,
	type SelectProps,
	type SegmentControlProps,
} from '@n8n/design-system';
import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import { getAgentHitlChannels } from '../composables/useAgentApi';
import AgentHitlConfigurationModal from '../components/AgentHitlConfigurationModal.vue';
import AgentHitlToolsSelect from '../components/AgentHitlToolsSelect.vue';
import AgentHitlDestinationPicker from '../components/AgentHitlDestinationPicker.vue';
import type { AgentHitlContext } from '../components/agent-hitl.types';

vi.unmock('reka-ui');

const mocks = vi.hoisted(() => ({
	search: vi.fn(),
	create: vi.fn(),
	channels: vi.fn(),
	options: vi.fn(),
	showError: vi.fn(),
	open: vi.fn(),
	resolve: vi.fn(({ params }: { params: { workflowId: string } }) => ({
		href: `/workflow/${params.workflowId}`,
	})),
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
		resolve: mocks.resolve,
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
function render(
	configuration?: AgentHitlConfiguration,
	agentConfig = config,
	agentId = 'agent',
	includeToolKey?: string,
	contextOverrides: Partial<AgentHitlContext> = {},
) {
	return mount(AgentHitlConfigurationModal, {
		props: {
			projectId: 'project',
			nextNumber: 8,
			context: {
				agentId,
				getConfig: () => agentConfig,
				saveConfiguration: vi.fn(),
				...contextOverrides,
			},
			configuration,
			includeToolKey,
		},
		global: {
			stubs: {
				AgentModal: {
					props: ['title'],
					template:
						'<div><input data-testid="title" :value="title" @input="$emit(\'update:title\', $event.target.value)" /><slot /><slot name="footerLeft" /><slot name="footerActions" /></div>',
				},
				AgentHitlDestinationPicker: true,
				AgentChannelModal: {
					name: 'AgentChannelModal',
					props: ['agentId', 'isPublished', 'channelTypes', 'stacked'],
					emits: ['update:open', 'channel-connected'],
					template: '<div data-testid="review-channel-modal" />',
				},
			},
		},
	});
}
function getSelect(wrapper: ReturnType<typeof render>, testId: string) {
	const select = wrapper
		.findAllComponents(N8nSelect2)
		.find((component) => component.find(`[data-testid="${testId}"]`).exists());
	if (!select) throw new Error(`Select ${testId} was not found`);
	// N8nSelect2 is a generic SFC, so its type resolves to the DOM wrapper overload.
	return select as unknown as VueWrapper<ComponentPublicInstance<SelectProps>>;
}
function getMethod(wrapper: ReturnType<typeof render>) {
	return wrapper.getComponent(N8nSegmentControl) as unknown as VueWrapper<
		ComponentPublicInstance<SegmentControlProps<'workflow' | 'channel'>>
	>;
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
			fields: [{ name: 'recipient', type: 'text' }],
		},
		{
			channel: 'slack',
			credentialId: 'slack',
			label: 'Slack',
			fields: [{ name: 'recipient', type: 'search' }],
		},
	]);
	vi.spyOn(window, 'open').mockImplementation(mocks.open);
});
afterEach(() => {
	vi.restoreAllMocks();
	localStorage.removeItem(LOCAL_STORAGE_CANVAS_GROUP_EXPANDED);
});
it('searches workflows in a select and offers workflow creation', async () => {
	const wrapper = render();
	await flushPromises();
	getSelect(wrapper, 'agent-hitl-workflow').vm.$emit('update:open', true);
	await flushPromises();
	const menu = document.body.querySelector('[role="listbox"]');
	expect(menu).not.toBeNull();
	expect(menu?.textContent).toContain('Create workflow');
	const input = document.body.querySelector<HTMLInputElement>(
		'input[data-testid="agent-hitl-workflow-search"]',
	);
	if (!input) throw new Error('Workflow search was not found');
	input.value = 'expenses';
	input.dispatchEvent(new Event('input', { bubbles: true }));
	await flushPromises();
	expect(menu?.textContent).toContain('Review expenses');
	expect(menu?.textContent).toContain('Create workflow');
	expect(menu?.textContent).not.toContain('Confirm deployment');
	const picker = getSelect(wrapper, 'agent-hitl-workflow');
	picker.vm.$emit('update:modelValue', 'review');
	input.value = 'no matching workflow';
	input.dispatchEvent(new Event('input', { bubbles: true }));
	await flushPromises();
	expect(picker.text()).toBe('Review expenses');
	expect(picker.find('[data-icon="workflow"]').exists()).toBe(true);
	expect(menu?.textContent).toContain('Create workflow');
	expect(menu?.textContent).toContain('No matching workflows');
	wrapper.unmount();
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
	const picker = getSelect(wrapper, 'agent-hitl-workflow');
	expect(wrapper.find('[data-testid="agent-hitl-workflow-open"]').exists()).toBe(false);
	picker.vm.$emit('update:modelValue', 'review');
	await wrapper.vm.$nextTick();
	const openWorkflow = wrapper.get('[data-testid="agent-hitl-workflow-open"]');
	expect(openWorkflow.attributes('href')).toBe('/workflow/review');
	expect(openWorkflow.attributes('target')).toBe('_blank');
	expect(openWorkflow.attributes('aria-label')).toBe('Open workflow in a new tab');
	expect(save.attributes('disabled')).toBeUndefined();
	expect(trigger.attributes('tabindex')).toBeUndefined();
	expect(
		wrapper
			.findAllComponents(N8nTooltip)
			.find((tooltip) => tooltip.find('[data-testid="agent-hitl-save-trigger"]').exists())
			?.props('disabled'),
	).toBe(true);
	await save.trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({ method: 'workflow', workflowId: 'review' }),
	]);
});

it('names a new workflow from the Agent and the next available number', async () => {
	const wrapper = render();
	await flushPromises();
	await wrapper.find('[data-testid="title"]').setValue('Finance approvals');
	mocks.search.mockResolvedValue([
		{ name: 'Support Agent approval workflow 1' },
		{ name: 'Support Agent approval workflow 3' },
	]);
	const create = getSelect(wrapper, 'agent-hitl-workflow')
		.props('items')
		?.find((item) => 'value' in item && item.value === '__create_hitl_workflow__');
	if (create && 'onSelect' in create) create.onSelect?.(new Event('select'));
	await flushPromises();
	expect(mocks.create).toHaveBeenCalledWith(
		expect.objectContaining({
			name: 'Support Agent approval workflow 2',
			projectId: 'project',
			nodes: [
				expect.objectContaining({
					name: 'Request from agent',
					type: 'n8n-nodes-base.agentDecisionTrigger',
				}),
				expect.objectContaining({
					name: 'Verify/Approve',
					type: 'n8n-nodes-base.noOp',
				}),
				expect.objectContaining({
					name: 'Respond to agent',
					type: 'n8n-nodes-base.agentDecisionResponse',
					parameters: { approved: false },
				}),
			],
			connections: {
				'Request from agent': {
					main: [[{ node: 'Verify/Approve', type: 'main', index: 0 }]],
				},
				'Verify/Approve': {
					main: [[{ node: 'Respond to agent', type: 'main', index: 0 }]],
				},
			},
		}),
	);
	expect(mocks.resolve).toHaveBeenCalledWith(
		expect.objectContaining({ params: { workflowId: 'new' } }),
	);
	const created = mocks.create.mock.calls[0][0] as Pick<IWorkflowBase, 'nodes' | 'nodeGroups'>;
	const verification = created.nodes.find((node) => node.type === 'n8n-nodes-base.noOp');
	expect(created.nodes.some((node) => node.type === 'n8n-nodes-base.stickyNote')).toBe(false);
	expect(created.nodeGroups).toEqual([
		{
			id: expect.any(String),
			name: 'Replace this with your logic to verify the agent request',
			nodeIds: [verification?.id],
		},
	]);
	expect(useCanvasGroupIdStorage(LOCAL_STORAGE_CANVAS_GROUP_EXPANDED).read('new')).toEqual(
		created.nodeGroups?.map((group) => group.id),
	);
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({ name: 'Finance approvals', method: 'workflow', workflowId: 'new' }),
	]);
});
it('saves a Telegram destination and rejects a username', async () => {
	const wrapper = render();
	await flushPromises();
	getMethod(wrapper).vm.$emit('update:modelValue', 'channel');
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
	expect(
		wrapper
			.findAllComponents(N8nTooltip)
			.find((tooltip) => tooltip.find('[data-testid="agent-hitl-save-trigger"]').exists())
			?.props('disabled'),
	).toBe(true);
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

it('changes between a user and channel through one Destination picker', async () => {
	const wrapper = render({
		id: 'review',
		name: 'Review',
		method: 'channel',
		channel: 'slack',
		credentialId: 'slack',
		recipient: { kind: 'user', id: 'U1', name: 'Reviewer' },
	});
	await flushPromises();
	expect(wrapper.find('[data-testid="agent-hitl-recipient-type"]').exists()).toBe(false);
	wrapper
		.getComponent(AgentHitlDestinationPicker)
		.vm.$emit('update:modelValue', { id: 'C1', name: '#Approvals', kind: 'channel' });
	await wrapper.vm.$nextTick();
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
		recipient: { id: 'C1', name: '#Approvals', kind: 'channel' },
	});
});

it('requires both a Discord server and a recipient before Save is enabled', async () => {
	mocks.channels.mockResolvedValue([
		{
			channel: 'discord',
			credentialId: 'bot',
			label: 'Discord',
			fields: [
				{ name: 'guild', type: 'search' },
				{ name: 'recipient', type: 'search' },
			],
		},
	]);
	const wrapper = render();
	await flushPromises();
	getMethod(wrapper).vm.$emit('update:modelValue', 'channel');
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
		.vm.$emit('update:modelValue', { id: '456', name: 'Approvals', kind: 'channel' });
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
	expect(picker.props('modelValue')).toEqual({ id: 'U1', name: 'Reviewer', kind: 'user' });
	mocks.options.mockResolvedValue({ options: [] });
	await picker.props('load')('review', 'next');
	expect(mocks.options).toHaveBeenCalledWith(
		{},
		'project',
		'agent',
		expect.objectContaining({
			channel: 'slack',
			credentialId: 'slack',
			field: 'recipient',
			query: 'review',
			cursor: 'next',
		}),
	);
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({
			id: 'existing',
			recipient: { kind: 'user', id: 'U1', name: 'Reviewer' },
		}),
	]);
});

it('saves without the retired requester policy', async () => {
	const wrapper = render({ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' });
	await flushPromises();
	expect(wrapper.find('[data-testid="agent-hitl-disallow-requester"]').exists()).toBe(false);
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	expect(wrapper.emitted('save')?.[0]?.[0]).not.toHaveProperty('disallowRequesterApproval');
});

it('allows Channel with no saved connections and offers channel creation first', async () => {
	mocks.channels.mockResolvedValue([]);
	const wrapper = render();
	await flushPromises();
	const method = getMethod(wrapper);
	expect(method.props('disabled')).toBe(false);
	expect(method.props('options')).toEqual([
		{ value: 'workflow', label: 'Workflow' },
		{ value: 'channel', label: 'Channel' },
	]);
	method.vm.$emit('update:modelValue', 'channel');
	await wrapper.vm.$nextTick();
	const channel = getSelect(wrapper, 'agent-hitl-channel');
	expect(channel.props('placeholder')).toBe('Select channel');
	expect(channel.props('items')).toEqual([
		expect.objectContaining({ label: 'Create channel', icon: 'plus' }),
	]);
	expect(wrapper.text()).not.toContain('No supported channels');
});

it('keeps both method options available while channels load', async () => {
	const wrapper = render();
	expect(getMethod(wrapper).props('disabled')).toBe(false);
});

it('opens channel setup, refreshes its result, and preserves the review draft', async () => {
	mocks.channels.mockResolvedValue([]);
	const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
	const onChannelsChanged = vi.fn();
	const wrapper = render(undefined, config, 'agent', undefined, {
		ensureAgentPersisted,
		onChannelsChanged,
		isPublished: true,
	});
	await flushPromises();
	await wrapper.get('[data-testid="title"]').setValue('Finance review');
	getMethod(wrapper).vm.$emit('update:modelValue', 'channel');
	await wrapper.vm.$nextTick();
	const item = getSelect(wrapper, 'agent-hitl-channel').props('items')?.[0];
	if (item && 'onSelect' in item) item.onSelect?.(new Event('select'));
	await flushPromises();
	expect(ensureAgentPersisted).toHaveBeenCalledOnce();
	const setup = wrapper.getComponent({ name: 'AgentChannelModal' });
	expect(setup.props('agentId')).toBe('agent');
	expect(setup.props('isPublished')).toBe(true);
	expect(setup.props('channelTypes')).toEqual(['slack', 'telegram', 'discord']);
	mocks.channels.mockResolvedValue([
		{
			channel: 'slack',
			credentialId: 'new-bot',
			label: 'Slack',
			fields: [{ name: 'recipient', type: 'search' }],
		},
	]);
	setup.vm.$emit('channel-connected', 'slack');
	setup.vm.$emit('update:open', false);
	await flushPromises();
	expect(onChannelsChanged).toHaveBeenCalledOnce();
	expect(getSelect(wrapper, 'agent-hitl-channel').props('modelValue')).toBe('slack:new-bot');
	expect(wrapper.get('[data-testid="title"]').element).toHaveProperty('value', 'Finance review');
	expect(wrapper.findComponent(AgentHitlDestinationPicker).exists()).toBe(true);
	expect(wrapper.emitted('save')).toBeUndefined();
});

it.each(['none', 3600, 86400, 604800] as const)('saves the request expiry %s', async (expiry) => {
	const wrapper = render({ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' });
	await flushPromises();
	const selector = getSelect(wrapper, 'agent-hitl-expiry');
	expect(selector.props('modelValue')).toBe('none');
	selector.vm.$emit('update:modelValue', String(expiry));
	await wrapper.vm.$nextTick();
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
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
	expect(selector.props('modelValue')).toBe('86400');
	selector.vm.$emit('update:modelValue', 'none');
	await wrapper.vm.$nextTick();
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({ expirySeconds: undefined }),
	]);
});

it('opens the new workflow tab before the creation requests finish', async () => {
	const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
	mocks.open.mockReturnValue(tab);
	const wrapper = render();
	await flushPromises();
	const create = getSelect(wrapper, 'agent-hitl-workflow')
		.props('items')
		?.find((item) => 'value' in item && item.value === '__create_hitl_workflow__');
	if (create && 'onSelect' in create) create.onSelect?.(new Event('select'));
	expect(mocks.open).toHaveBeenCalledWith('', '_blank');
	expect(mocks.create).not.toHaveBeenCalled();
	await flushPromises();
	expect(tab.opener).toBeNull();
	expect(tab.location.href).toBe('/workflow/new');
	expect(mocks.open).toHaveBeenCalledTimes(1);
});
it('closes the blank tab when workflow creation fails', async () => {
	const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
	mocks.open.mockReturnValue(tab);
	mocks.create.mockRejectedValue(new Error('failed'));
	const wrapper = render();
	await flushPromises();
	const create = getSelect(wrapper, 'agent-hitl-workflow')
		.props('items')
		?.find((item) => 'value' in item && item.value === '__create_hitl_workflow__');
	if (create && 'onSelect' in create) create.onSelect?.(new Event('select'));
	await flushPromises();
	expect(tab.close).toHaveBeenCalledOnce();
	expect(mocks.showError).toHaveBeenCalled();
});
it('preselects the tool that opened the modal', async () => {
	const wrapper = render(
		undefined,
		{ ...config, tools: [{ type: 'workflow', workflow: 'Write' }] },
		'agent',
		'tool:workflow:Write',
	);
	await flushPromises();
	expect(wrapper.get('[data-testid="agent-hitl-tool-pill"]').text()).toContain('Write');
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
				approvalRoute: { type: 'configuration', configurationIds: ['review'] },
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

it('shows platform icons and keeps saved destination types in one picker', async () => {
	const wrapper = render({
		id: 'review',
		name: 'Review',
		method: 'channel',
		channel: 'slack',
		credentialId: 'slack',
		recipient: { kind: 'user', id: 'U1', name: 'Reviewer' },
	});
	await flushPromises();
	expect(
		wrapper.get('[data-testid="agent-hitl-channel"]').find('[data-icon="slack"]').exists(),
	).toBe(true);
	expect(wrapper.getComponent(AgentHitlDestinationPicker).props('modelValue')).toMatchObject({
		kind: 'user',
		id: 'U1',
	});
	expect(wrapper.find('[data-testid="agent-hitl-recipient-type"]').exists()).toBe(false);
});

it('uses Human review for new configurations and preserves custom names', async () => {
	const wrapper = render();
	await flushPromises();
	expect(wrapper.get('[data-testid="title"]').element).toHaveProperty('value', 'Human review 8');
	const saved = render({
		id: 'existing',
		name: 'HITL Settings 1',
		nameOverridden: true,
		method: 'workflow',
		workflowId: 'wf',
	});
	await flushPromises();
	expect(saved.get('[data-testid="title"]').element).toHaveProperty('value', 'HITL Settings 1');
});

it('generates names from workflow choices and keeps automatic naming after Save', async () => {
	const wrapper = render();
	await flushPromises();
	const picker = getSelect(wrapper, 'agent-hitl-workflow');
	picker.vm.$emit('update:modelValue', 'review');
	await wrapper.vm.$nextTick();
	expect(wrapper.get('[data-testid="title"]').element).toHaveProperty('value', 'Review expenses');
	picker.vm.$emit('update:modelValue', 'other');
	await wrapper.vm.$nextTick();
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	const saved = wrapper.emitted('save')?.[0]?.[0] as AgentHitlConfiguration;
	expect(saved).toMatchObject({ name: 'Confirm deployment', nameOverridden: false });
	expect(saved.id).toMatch(/^review_[A-Za-z0-9]{16}$/);
	const reopened = render(saved);
	await flushPromises();
	getSelect(reopened, 'agent-hitl-workflow').vm.$emit('update:modelValue', 'review');
	await reopened.vm.$nextTick();
	expect(reopened.get('[data-testid="title"]').element).toHaveProperty('value', 'Review expenses');
});

it('adopts the created workflow name unless the user has renamed the review', async () => {
	const wrapper = render();
	await flushPromises();
	const create = getSelect(wrapper, 'agent-hitl-workflow')
		.props('items')
		?.find((item) => 'value' in item && item.value === '__create_hitl_workflow__');
	if (create && 'onSelect' in create) create.onSelect?.(new Event('select'));
	await flushPromises();
	expect(wrapper.get('[data-testid="title"]').element).toHaveProperty(
		'value',
		'Support Agent approval workflow 1',
	);
});

it('preserves a custom name when the workflow changes and the modal reopens', async () => {
	const wrapper = render();
	await flushPromises();
	await wrapper.get('[data-testid="title"]').setValue('Finance team');
	getSelect(wrapper, 'agent-hitl-workflow').vm.$emit('update:modelValue', 'review');
	await wrapper.vm.$nextTick();
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	const saved = wrapper.emitted('save')?.[0]?.[0] as AgentHitlConfiguration;
	expect(saved).toMatchObject({ name: 'Finance team', nameOverridden: true });
	const reopened = render(saved);
	await flushPromises();
	getSelect(reopened, 'agent-hitl-workflow').vm.$emit('update:modelValue', 'other');
	await reopened.vm.$nextTick();
	expect(reopened.get('[data-testid="title"]').element).toHaveProperty('value', 'Finance team');
});

it.each([
	['channel', 'approvals', 'Slack #approvals'],
	['channel', '#approvals', 'Slack #approvals'],
	['user', 'Reviewer', 'Slack Reviewer'],
] as const)(
	'names a Slack %s destination %s automatically',
	async (kind, destination, expected) => {
		const wrapper = render();
		await flushPromises();
		getMethod(wrapper).vm.$emit('update:modelValue', 'channel');
		await flushPromises();
		getSelect(wrapper, 'agent-hitl-channel').vm.$emit('update:modelValue', 'slack:slack');
		await flushPromises();
		wrapper
			.getComponent(AgentHitlDestinationPicker)
			.vm.$emit('update:modelValue', { id: 'destination', name: destination, kind });
		await wrapper.vm.$nextTick();
		expect(wrapper.get('[data-testid="title"]').element).toHaveProperty('value', expected);
		await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
		expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
			name: expected,
			nameOverridden: false,
		});
	},
);

it('names a Telegram destination from its user ID', async () => {
	const wrapper = render();
	await flushPromises();
	getMethod(wrapper).vm.$emit('update:modelValue', 'channel');
	await flushPromises();
	getSelect(wrapper, 'agent-hitl-channel').vm.$emit('update:modelValue', 'telegram:bot');
	await flushPromises();
	await wrapper.get('[data-testid="agent-hitl-telegram-user"]').setValue('12345');
	expect(wrapper.get('[data-testid="title"]').element).toHaveProperty('value', 'Telegram 12345');
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
	expect(select.find('[data-icon="slack"]').exists()).toBe(true);
});

it('attaches Advanced to the destination group and hides tool selection without tools', async () => {
	const wrapper = render({ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' });
	await flushPromises();
	const destination = wrapper.get('[data-testid="agent-hitl-destination-section"]');
	expect(destination.text()).toContain('Which workflow is used to request review');
	const advanced = destination.get('[data-testid="agent-hitl-advanced"]');
	expect(advanced.attributes('aria-expanded')).toBe('false');
	expect(destination.get('#agent-hitl-advanced-content').attributes('style')).toContain(
		'display: none',
	);
	await advanced.trigger('click');

	expect(advanced.attributes('aria-expanded')).toBe('true');
	expect(destination.get('#agent-hitl-advanced-content').attributes('style')).not.toContain(
		'display: none',
	);
	expect(destination.text()).toContain('When the review expires');
	const expiry = getSelect(wrapper, 'agent-hitl-expiry');
	expect(expiry.props('items')).toHaveLength(4);
	expect(expiry.props('items')?.[0]).toMatchObject({ value: 'none', label: 'Never expires' });
	expect(destination.findComponent(AgentHitlToolsSelect).exists()).toBe(false);
	expect(wrapper.text()).not.toContain('How long to wait for review');
});

it('shows tool attachment after expiry in Advanced when tools are attached', async () => {
	const wrapper = render(undefined, {
		...config,
		tools: [{ type: 'workflow', workflow: 'Write' }],
	});
	await flushPromises();
	await wrapper.get('[data-testid="agent-hitl-advanced"]').trigger('click');
	const tools = wrapper.getComponent(AgentHitlToolsSelect);
	expect(tools.text()).toContain('Which tools require this review');
	expect(tools.props('embedded')).toBe(true);
	expect(
		getSelect(wrapper, 'agent-hitl-expiry').element.compareDocumentPosition(tools.element) &
			Node.DOCUMENT_POSITION_FOLLOWING,
	).toBeTruthy();
});

it('keeps channel and destination in the same section when the method changes', async () => {
	const wrapper = render();
	await flushPromises();
	getMethod(wrapper).vm.$emit('update:modelValue', 'channel');
	await wrapper.vm.$nextTick();
	getSelect(wrapper, 'agent-hitl-channel').vm.$emit('update:modelValue', 'slack:slack');
	await wrapper.vm.$nextTick();
	const destination = wrapper.get('[data-testid="agent-hitl-destination-section"]');
	expect(destination.find('[data-testid="agent-hitl-channel"]').exists()).toBe(true);
	expect(destination.findComponent(AgentHitlDestinationPicker).exists()).toBe(true);
	expect(destination.text()).toContain('Which channel to use for review');
	expect(destination.text()).not.toContain('Invite the bot to the channel before you select it.');
	expect(destination.find('[data-testid="agent-hitl-workflow"]').exists()).toBe(false);
});

it('configures workflow review before the Agent is saved without calling channel endpoints', async () => {
	const wrapper = render(undefined, config, '');
	await flushPromises();
	expect(mocks.channels).not.toHaveBeenCalled();
	expect(getMethod(wrapper).props('disabled')).toBe(false);
	getSelect(wrapper, 'agent-hitl-workflow').vm.$emit('update:modelValue', 'review');
	await wrapper.vm.$nextTick();
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	expect(wrapper.emitted('save')?.[0]).toEqual([
		expect.objectContaining({ method: 'workflow', workflowId: 'review' }),
	]);
});
