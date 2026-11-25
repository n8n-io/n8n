import { mount, flushPromises } from '@vue/test-utils';
import type { AgentHitlConfiguration } from '@n8n/api-types';
import AgentHitlConfigurationModal from '../components/AgentHitlConfigurationModal.vue';
import AgentApprovalDestinationMenu from '../components/AgentApprovalDestinationMenu.vue';
import AgentHitlToolsSelect from '../components/AgentHitlToolsSelect.vue';
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
vi.mock('vue-router', () => ({ useRouter: () => ({ resolve: mocks.resolve }) }));

const configuration: AgentHitlConfiguration = {
	id: 'approval',
	method: 'channel',
	channel: 'slack',
	credentialId: 'slack',
	name: 'Slack #finance',
	recipient: { id: 'C1', kind: 'channel', name: '#finance' },
};
const context = { agentId: 'agent', getConfig: () => null, saveConfiguration: vi.fn() };

function render(
	overrides: Partial<Pick<AgentHitlConfiguration, 'name' | 'nameOverridden'>> = {},
	approvalContext: AgentHitlContext = context,
) {
	return mount(AgentHitlConfigurationModal, {
		props: {
			projectId: 'project',
			context: approvalContext,
			configuration: { ...configuration, ...overrides },
		},
		global: {
			stubs: {
				AgentHitlToolsSelect: true,
				AgentModal: {
					props: ['title'],
					template:
						'<div><span data-testid="title">{{ title }}</span><slot /><slot name="footerActions" /></div>',
				},
			},
		},
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.channels.mockResolvedValue([
		{
			channel: 'slack',
			credentialId: 'slack',
			label: 'Slack',
			fields: [{ name: 'recipient', type: 'search' }],
		},
	]);
	mocks.options.mockResolvedValue({
		options: [
			{ id: 'U1', name: 'Alex', kind: 'user' },
			{ id: 'C1', name: '#finance', kind: 'channel' },
		],
	});
});

it('shows the saved destination without the platform prefix and updates the automatic name', async () => {
	const wrapper = render();
	const trigger = wrapper.get('[data-testid="agent-hitl-destination"]');
	expect(trigger.text()).toBe('#finance');
	await trigger.trigger('click');
	await flushPromises();
	expect(trigger.attributes('aria-expanded')).toBe('true');
	wrapper.getComponent(AgentApprovalDestinationMenu).vm.$emit('select', {
		method: 'workflow',
		workflowId: 'wf',
		name: 'Finance approval',
	});
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
		id: 'approval',
		method: 'workflow',
		workflowId: 'wf',
		name: 'Finance approval',
		nameOverridden: false,
	});
	wrapper.unmount();
});

it('renders the tool picker as an embedded row when the agent has tools', () => {
	const wrapper = render(
		{},
		{
			...context,
			getConfig: () => ({
				name: 'Agent',
				model: 'anthropic/test',
				instructions: 'Help',
				tools: [{ type: 'custom', id: 'test-tool' }],
			}),
		},
	);
	expect(wrapper.getComponent(AgentHitlToolsSelect).props('embedded')).toBe(true);
	wrapper.unmount();
});

it('keeps a custom name when the destination changes', async () => {
	const wrapper = render({ name: 'Finance check', nameOverridden: true });
	wrapper.getComponent(AgentApprovalDestinationMenu).vm.$emit('select', {
		method: 'workflow',
		workflowId: 'wf',
		name: 'Finance approval',
	});
	await wrapper.get('[data-testid="agent-hitl-save"]').trigger('click');
	expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
		name: 'Finance check',
		nameOverridden: true,
	});
	wrapper.unmount();
});

it.each([true, undefined])(
	'keeps the menu linked to its trigger (teleported: %s)',
	async (teleported) => {
		const column = document.createElement('div');
		document.body.append(column);
		const wrapper = mount(AgentApprovalDestinationMenu, {
			attachTo: column,
			props: {
				context,
				projectId: 'project',
				label: 'Add approver',
				testId: 'add',
				teleported,
			},
		});
		try {
			const trigger = wrapper.get('[data-testid="add"]');
			await trigger.trigger('click');
			await flushPromises();
			const menu = document.querySelector(
				`[role="dialog"][aria-labelledby="${trigger.attributes('id')}"]`,
			);
			expect(menu).toBeInTheDocument();
			expect(column.contains(menu)).toBe(teleported !== true);

			const slack = Array.from(menu?.querySelectorAll('button') ?? []).find(
				(button) => button.textContent?.trim() === 'Slack',
			);
			expect(slack).toBeInTheDocument();
			slack?.dispatchEvent(new Event('pointerenter'));
			await flushPromises();

			const results = menu?.querySelector('[data-testid="approval-destination-results"]');
			const destinationPane = results?.closest('[role="dialog"]');
			expect(destinationPane).toBeInTheDocument();
			expect(destinationPane).not.toBe(menu);
			expect(menu).toHaveAttribute('aria-labelledby', trigger.attributes('id'));
		} finally {
			wrapper.unmount();
			column.remove();
		}
	},
);

it('lists available approvals above the divider and creation options', async () => {
	const wrapper = mount(AgentApprovalDestinationMenu, {
		props: {
			context: {
				...context,
				getConfig: () => ({
					name: 'Agent',
					model: 'anthropic/test',
					instructions: 'Help',
					hitlConfigurations: [
						configuration,
						{ id: 'attached', method: 'workflow', workflowId: 'wf', name: 'Attached workflow' },
					],
				}),
			},
			projectId: 'project',
			label: 'Add approver',
			testId: 'add',
			existing: true,
			excludeIds: ['attached'],
		},
	});
	await wrapper.get('[data-testid="add"]').trigger('click');
	await flushPromises();

	const entries = wrapper.get('[role="dialog"]').findAll('button, hr');
	expect(entries.map((entry) => entry.text())).toEqual(['#finance', '', 'Workflow', 'Slack']);
	expect(entries[1].element.tagName).toBe('HR');
	await entries[0].trigger('click');
	expect(wrapper.emitted('attach')).toEqual([['approval']]);
	wrapper.unmount();
});

it('loads connected channel recipients by group and selects a person directly', async () => {
	const wrapper = mount(AgentApprovalDestinationMenu, {
		props: { context, projectId: 'project', label: 'Add approver', testId: 'add' },
	});
	await wrapper.get('[data-testid="add"]').trigger('click');
	await flushPromises();
	await wrapper.get('button[aria-expanded="false"]:nth-child(2)').trigger('pointerenter');
	await flushPromises();
	expect(wrapper.text()).toContain('People');
	expect(wrapper.text()).toContain('Channels');
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'Alex')
		?.trigger('click');
	expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({
		method: 'channel',
		channel: 'slack',
		name: 'Alex',
		recipient: { id: 'U1', kind: 'user' },
	});
	wrapper.unmount();
});

it('offers Discord people search when the server only returns channels for browsing', async () => {
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
	mocks.options
		.mockResolvedValueOnce({ options: [{ id: '42', name: 'Server' }] })
		.mockResolvedValueOnce({ options: [{ id: '3', name: '#general', kind: 'channel' }] })
		.mockResolvedValueOnce({ options: [{ id: '1', name: 'Alex', kind: 'user' }] });
	const wrapper = mount(AgentApprovalDestinationMenu, {
		props: { context, projectId: 'project', label: 'Add approver', testId: 'add' },
	});
	try {
		await wrapper.get('[data-testid="add"]').trigger('click');
		await flushPromises();
		await wrapper.get('button[aria-expanded="false"]:nth-child(2)').trigger('pointerenter');
		await flushPromises();
		await wrapper.get('[data-testid="approval-destination-results"] button').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('People');
		expect(wrapper.text()).toContain('Search by username or server nickname');
		expect(wrapper.text()).toContain('#general');
		await wrapper.get('input').setValue('Alex');
		await vi.waitFor(() =>
			expect(wrapper.get('[data-testid="approval-destination-results"] button').text()).toBe(
				'Alex',
			),
		);
		await wrapper.get('[data-testid="approval-destination-results"] button').trigger('click');
		expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({
			channel: 'discord',
			credentialId: 'bot',
			guildId: '42',
			recipient: { id: '1', kind: 'user', name: 'Alex' },
		});
	} finally {
		wrapper.unmount();
	}
});

it('fetches workflows in pages of 20 as the menu scrolls', async () => {
	mocks.search
		.mockResolvedValueOnce(
			Array.from({ length: 20 }, (_, index) => ({
				id: String(index),
				name: `Approval ${index}`,
			})),
		)
		.mockResolvedValueOnce([{ id: 'next', name: 'Next workflow' }]);
	const wrapper = mount(AgentApprovalDestinationMenu, {
		props: { context, projectId: 'project', label: 'Add approver', testId: 'add' },
	});
	await wrapper.get('[data-testid="add"]').trigger('click');
	await flushPromises();
	await wrapper.get('button[aria-expanded="false"]').trigger('pointerenter');
	await flushPromises();
	await wrapper.get('[data-testid="approval-destination-results"]').trigger('scroll');
	await flushPromises();
	expect(mocks.search).toHaveBeenLastCalledWith(
		expect.objectContaining({
			options: expect.objectContaining({ take: 20, skip: 20 }),
		}),
	);
	expect(wrapper.text()).toContain('Next workflow');
	wrapper.unmount();
});

it('creates and opens an approval workflow with a replaceable middle node', async () => {
	const tab = { opener: window, location: { href: '' } };
	vi.spyOn(window, 'open').mockImplementation(() => tab as unknown as Window);
	mocks.search.mockResolvedValue([]);
	mocks.create.mockResolvedValue({ id: 'new', name: 'Approval workflow' });
	const wrapper = mount(AgentApprovalDestinationMenu, {
		props: { context, projectId: 'project', label: 'Add approver', testId: 'add' },
	});
	try {
		await wrapper.get('[data-testid="add"]').trigger('click');
		await wrapper.get('button[aria-expanded="false"]').trigger('pointerenter');
		await flushPromises();
		await wrapper
			.findAll('button')
			.find((button) => button.text() === 'Create new workflow')
			?.trigger('click');
		await flushPromises();
		expect(mocks.create).toHaveBeenCalledWith(
			expect.objectContaining({
				nodes: [
					expect.objectContaining({ name: 'Request from agent', position: [0, 0] }),
					expect.objectContaining({
						name: 'Replace Me',
						type: 'n8n-nodes-base.noOp',
						placeholder: true,
						position: [256, 0],
					}),
					expect.objectContaining({ name: 'Respond to agent', position: [512, 0] }),
				],
				connections: {
					'Request from agent': { main: [[{ node: 'Replace Me', type: 'main', index: 0 }]] },
					'Replace Me': { main: [[{ node: 'Respond to agent', type: 'main', index: 0 }]] },
				},
			}),
		);
		expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('nodeGroups');
		expect(tab.location.href).toBe('/workflow/new');
		expect(wrapper.emitted('select')).toEqual([
			[{ method: 'workflow', workflowId: 'new', name: 'Approval workflow' }],
		]);
	} finally {
		wrapper.unmount();
		vi.restoreAllMocks();
	}
});

it('fills the first Slack page across provider pages and reuses it when switching sources', async () => {
	const rows = (start: number, length: number) =>
		Array.from({ length }, (_, index) => ({
			id: String(start + index),
			name: `Person ${start + index}`,
			kind: 'user',
		}));
	mocks.options
		.mockResolvedValueOnce({ options: rows(1, 5), nextCursor: 'a' })
		.mockResolvedValueOnce({ options: rows(6, 5), nextCursor: 'b' })
		.mockResolvedValueOnce({ options: rows(11, 10), nextCursor: 'c' })
		.mockResolvedValueOnce({ options: rows(21, 1) });
	mocks.search.mockResolvedValue([{ id: 'wf', name: 'A workflow' }]);
	const wrapper = mount(AgentApprovalDestinationMenu, {
		props: { context, projectId: 'project', label: 'Add approver', testId: 'add', iconOnly: true },
	});
	const source = (name: string) =>
		wrapper.findAll('button').find((button) => button.text() === name);
	try {
		const add = wrapper.get('[data-testid="add"]');
		expect(add.text()).toBe('');
		expect(add.attributes('aria-label')).toBe('Add approver');
		await add.trigger('click');
		await flushPromises();
		await source('Slack')?.trigger('pointerenter');
		await flushPromises();
		const results = wrapper.get('[data-testid="approval-destination-results"]');
		expect(results.findAll('button')).toHaveLength(20);
		expect(mocks.options).toHaveBeenCalledTimes(3);
		await source('Workflow')?.trigger('pointerenter');
		await flushPromises();
		await source('Slack')?.trigger('pointerenter');
		await flushPromises();
		expect(mocks.options).toHaveBeenCalledTimes(3);
		await results.trigger('scroll');
		await flushPromises();
		expect(results.text()).toContain('Person 21');
		expect(mocks.options).toHaveBeenCalledTimes(4);
	} finally {
		wrapper.unmount();
	}
});

it('accepts a numeric Telegram user ID and rejects text', async () => {
	mocks.channels.mockResolvedValue([
		{
			channel: 'telegram',
			credentialId: 'bot',
			label: 'Telegram',
			fields: [{ name: 'recipient', type: 'text' }],
		},
	]);
	const wrapper = mount(AgentApprovalDestinationMenu, {
		props: { context, projectId: 'project', label: 'Add approver', testId: 'add' },
	});
	try {
		await wrapper.get('[data-testid="add"]').trigger('click');
		await flushPromises();
		await wrapper
			.findAll('button')
			.find((button) => button.text() === 'Telegram')
			?.trigger('click');
		const input = wrapper.get('input');
		const useId = wrapper.findAll('button').find((button) => button.text() === 'Use this user ID');
		await input.setValue('@alex');
		expect(useId?.attributes('disabled')).toBeDefined();
		await input.setValue(' 1234567890123 ');
		expect(useId?.attributes('disabled')).toBeUndefined();
		await useId?.trigger('click');
		expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({
			channel: 'telegram',
			credentialId: 'bot',
			recipient: { kind: 'user', id: '1234567890123' },
		});
	} finally {
		wrapper.unmount();
	}
});
