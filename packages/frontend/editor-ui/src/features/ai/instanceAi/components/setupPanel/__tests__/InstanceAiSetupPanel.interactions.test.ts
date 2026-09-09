import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { computed, defineComponent, h, reactive, type PropType } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import {
	deepCopy,
	NodeConnectionTypes,
	type INodeProperties,
	type INodeTypeDescription,
	type AssignmentCollectionValue,
} from 'n8n-workflow';
import type { InstanceAiAgentNode, InstanceAiCredentialSetupHint } from '@n8n/api-types';
import { createComponentRenderer, type RenderOptions } from '@/__tests__/render';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { getWorkflow } from '@/app/api/workflows';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import type { SetupPanelThreadSource } from '../../../composables/useSetupPanelState';
import type { SetupPanelThreadActions } from '../../../composables/useSetupPanelActions';
import InstanceAiSetupPanel from '../InstanceAiSetupPanel.vue';

const { showMessage, testCredentialInBackground } = vi.hoisted(() => ({
	showMessage: vi.fn(),
	testCredentialInBackground: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));
vi.mock('@/features/credentials/composables/useCredentialTestInBackground', () => ({
	useCredentialTestInBackground: () => ({ testCredentialInBackground }),
}));
vi.mock('@/app/api/workflows', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getWorkflow: vi.fn(),
}));
vi.mock('@/app/composables/useNodeHelpers', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/composables/useNodeHelpers')>();
	return {
		...actual,
		useNodeHelpers: () => ({
			...actual.useNodeHelpers(),
			getNodeCredentialIssues: () => null,
			getNodeInputIssues: () => null,
		}),
	};
});

let thread: SetupPanelThreadSource & SetupPanelThreadActions;
vi.mock('../../../instanceAi.store', () => ({ useThread: () => thread }));

const accounts = [
	mock<ICredentialsResponse>({ id: 'cred-1', name: 'First account', type: 'slackApi' }),
	mock<ICredentialsResponse>({ id: 'cred-2', name: 'Second account', type: 'slackApi' }),
];

const NodeCredentialsStub = defineComponent({
	props: {
		node: { type: Object as PropType<INodeUi>, required: true },
		overrideCredType: { type: String, required: true },
		credentialSetupHint: Object as PropType<InstanceAiCredentialSetupHint>,
		skipAutoSelect: Boolean,
		workflowId: String,
		projectId: String,
	},
	emits: ['credentialSelected'],
	setup(props, { emit }) {
		return () => {
			const assigned = props.node.credentials?.[props.overrideCredType];
			const credential = typeof assigned === 'string' ? undefined : assigned;
			return h('div', [
				h(
					'select',
					{
						'aria-label': 'Account',
						value: credential?.id ?? '',
						'data-workflow-id': props.workflowId,
						'data-project-id': props.projectId,
						'data-skip-auto-select': props.skipAutoSelect,
						onChange: (event: Event) => {
							const id = (event.target as HTMLSelectElement).value;
							emit('credentialSelected', {
								name: props.node.name,
								properties: { credentials: { [props.overrideCredType]: { id, name: id } } },
							});
						},
					},
					[
						h('option', { value: '' }, 'Select account'),
						...accounts.map((account) => h('option', { value: account.id }, account.name)),
					],
				),
				h('output', { 'data-test-id': 'selected-account' }, credential?.name ?? ''),
				h(
					'output',
					{ 'data-test-id': 'credential-recipe' },
					JSON.stringify(props.credentialSetupHint),
				),
			]);
		};
	},
});

const ParameterInputListStub = defineComponent({
	props: {
		node: { type: Object as PropType<INodeUi>, required: true },
		parameters: { type: Array as PropType<INodeProperties[]>, required: true },
	},
	emits: ['valueChanged'],
	setup(props, { emit }) {
		return () =>
			h(
				'div',
				props.parameters.map((parameter) => {
					const path = parameter.name === 'options' ? 'options.value' : parameter.name;
					const value =
						parameter.name === 'options'
							? (props.node.parameters.options as { value: string }).value
							: props.node.parameters[parameter.name];
					return h('input', {
						'aria-label': parameter.displayName,
						value,
						onInput: (event: Event) =>
							emit('valueChanged', {
								name: `parameters.${path}`,
								value: (event.target as HTMLInputElement).value,
							}),
					});
				}),
			);
	},
});

const componentStubs = {
	NodeCredentials: NodeCredentialsStub,
	ParameterInputList: ParameterInputListStub,
	CredentialIcon: true,
	NodeIcon: true,
};

const renderComponent = createComponentRenderer(InstanceAiSetupPanel, {
	props: { workflowId: 'wf-1', projectId: 'project-1' },
	global: { stubs: componentStubs },
});

describe('InstanceAiSetupPanel interactions', () => {
	let saved: IWorkflowDb;
	let updateWorkflow: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>['updateWorkflow'];
	let fetchWorkflow: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>['fetchWorkflow'];
	let documentStore: ReturnType<typeof useWorkflowDocumentStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		mockedStore(useProjectsStore).myProjects = [mock<ProjectListItem>({ id: 'project-1' })];
		const nodeTypes = mockedStore(useNodeTypesStore);
		const nodeType: INodeTypeDescription = {
			name: 'test.notify',
			displayName: 'Notify',
			description: 'Send a notification',
			version: 1,
			group: ['transform'],
			defaults: { name: 'Notify' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [{ name: 'slackApi', required: true }],
			properties: [
				{ displayName: 'Channel', name: 'channel', type: 'string', default: '', required: true },
				{ displayName: 'Text', name: 'text', type: 'string', default: '' },
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					options: [
						{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						{ displayName: 'Other', name: 'other', type: 'string', default: '' },
					],
				},
			],
		};
		nodeTypes.allNodeTypes = [nodeType];
		nodeTypes.getNodeType = vi.fn().mockReturnValue(nodeType);
		nodeTypes.loadNodeTypesIfNotLoaded.mockResolvedValue(undefined);
		const credentials = mockedStore(useCredentialsStore);
		credentials.setCredentials(accounts);
		credentials.fetchUsableCredentials.mockResolvedValue([]);
		credentials.getCredentialTypeByName = vi.fn().mockReturnValue({
			name: 'slackApi',
			displayName: 'Slack API',
			properties: [],
		});
		saved = createTestWorkflow({
			id: 'wf-1',
			nodes: [
				createTestNode({
					name: 'Notify',
					type: 'test.notify',
					typeVersion: 1,
					parameters: {
						channel: '',
						text: 'Keep this text',
						options: { value: '<__PLACEHOLDER_VALUE__value__>', other: 'Keep this option' },
					},
				}),
			],
		});
		vi.mocked(getWorkflow).mockImplementation(async () => deepCopy(saved));
		updateWorkflow = mockedStore(useWorkflowsStore).updateWorkflow;
		updateWorkflow.mockImplementation(async (_id, changes) => {
			saved = { ...saved, nodes: changes.nodes ?? saved.nodes, versionId: 'v2', checksum: 'c2' };
			return deepCopy(saved);
		});
		fetchWorkflow = mockedStore(useWorkflowsListStore).fetchWorkflow;
		fetchWorkflow.mockImplementation(async () => deepCopy(saved));
		documentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
		thread = reactive({
			messages: [],
			setupItemsByWorkflowId: {
				'wf-1': [
					{ id: 'wf-1:credential:slackApi', kind: 'credential', credentialType: 'slackApi' },
				],
			},
			sendMessage: vi.fn().mockResolvedValue(true),
		});
	});

	function startBuild() {
		const agentTree: InstanceAiAgentNode = {
			agentId: 'root',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			children: [],
			timeline: [],
			toolCalls: [
				{
					toolCallId: 'update',
					toolName: 'workflows',
					isLoading: true,
					args: { action: 'update', workflowId: 'wf-1' },
				},
			],
		};
		thread.messages = [{ agentTree }];
	}

	function renderPanel(hydrated = true, options: RenderOptions<typeof InstanceAiSetupPanel> = {}) {
		if (hydrated) documentStore.hydrate(deepCopy(saved));
		return renderComponent({
			...options,
			global: {
				...options.global,
				stubs: { ...componentStubs, ...options.global?.stubs },
				provide: { [WorkflowDocumentStoreKey as symbol]: computed(() => documentStore) },
			},
		});
	}

	async function openParameters(
		hydrated = true,
		options: RenderOptions<typeof InstanceAiSetupPanel> = {},
	) {
		const rendered = renderPanel(hydrated, options);
		await fireEvent.click(await rendered.findByRole('button', { name: 'Notify' }));
		return rendered;
	}

	it('binds a credential announced without bindings after the build ends', async () => {
		startBuild();
		const { getByRole } = renderPanel();
		await fireEvent.click(getByRole('button', { name: 'Slack' }));
		const picker = getByRole('combobox');
		expect(picker).toHaveAttribute('data-workflow-id', 'wf-1');
		expect(picker).toHaveAttribute('data-project-id', 'project-1');
		expect(picker).toHaveAttribute('data-skip-auto-select', 'true');
		expect(updateWorkflow).not.toHaveBeenCalled();
		await fireEvent.change(picker, { target: { value: 'cred-2' } });
		expect(updateWorkflow).not.toHaveBeenCalled();
		thread.messages = [];
		await flushPromises();
		expect(updateWorkflow).toHaveBeenCalledTimes(1);
		expect(saved.nodes[0].credentials?.slackApi).toEqual({ id: 'cred-2', name: 'Second account' });
		expect(testCredentialInBackground).toHaveBeenCalledWith('cred-2', 'Second account', 'slackApi');
	});

	it('opens a remaining bound node and passes its recipe to the picker', async () => {
		startBuild();
		const setupHint = {
			template: { headers: { Authorization: '{{api_key}}' } },
			placeholders: [{ name: 'api_key', title: 'API key' }],
		};
		thread.setupItemsByWorkflowId['wf-1'] = [
			{
				id: 'wf-1:credential:slackApi',
				kind: 'credential',
				credentialType: 'slackApi',
				setupHint,
				nodeBindings: [{ nodeName: 'Removed' }, { nodeName: 'Notify' }],
			},
		];
		const { getByRole, getByTestId } = renderPanel();
		await fireEvent.click(getByRole('button', { name: 'Slack' }));
		expect(getByTestId('credential-recipe')).toHaveTextContent(JSON.stringify(setupHint));
		thread.messages = [];
		await flushPromises();
		expect(getByTestId('credential-recipe')).toHaveTextContent(JSON.stringify(setupHint));
		await fireEvent.change(getByRole('combobox'), { target: { value: 'cred-1' } });
		await flushPromises();
		expect(saved.nodes[0].credentials?.slackApi?.id).toBe('cred-1');
	});

	it('follows saved account changes and keeps references absent from the local list', async () => {
		saved.nodes[0].credentials = { slackApi: { id: 'cred-1', name: 'First account' } };
		const { getByRole, getByTestId } = renderPanel();
		await fireEvent.click(getByRole('button', { name: /Slack/ }));
		expect(getByTestId('selected-account')).toHaveTextContent('First account');
		documentStore.updateNodeProperties({
			name: 'Notify',
			properties: { credentials: { slackApi: { id: 'cred-2', name: 'Second account' } } },
		});
		await flushPromises();
		expect(getByTestId('selected-account')).toHaveTextContent('Second account');
		documentStore.updateNodeProperties({
			name: 'Notify',
			properties: { credentials: { slackApi: { id: 'shared', name: 'Shared account' } } },
		});
		await flushPromises();
		expect(getByTestId('selected-account')).toHaveTextContent('Shared account');
		expect(updateWorkflow).not.toHaveBeenCalled();
	});

	it.each([true, false])('clears saved drafts with a hydrated canvas: %s', async (hydrated) => {
		const { getByRole, getByLabelText } = await openParameters(hydrated);
		const confirm = getByRole('button', { name: 'Confirm' });
		expect(confirm).toBeDisabled();
		await fireEvent.update(getByLabelText('Channel'), 'team-updates');
		await fireEvent.click(confirm);
		await flushPromises();
		expect(saved.nodes[0].parameters).toEqual({
			channel: 'team-updates',
			text: 'Keep this text',
			options: { value: '<__PLACEHOLDER_VALUE__value__>', other: 'Keep this option' },
		});
		expect(confirm).toBeDisabled();
		if (!hydrated) expect(fetchWorkflow).toHaveBeenCalledTimes(2);
	});

	it('keeps unedited roots from the latest save and preserves nested values', async () => {
		const { getByRole, getByLabelText } = await openParameters();
		await fireEvent.update(getByLabelText('Channel'), 'team-updates');
		saved.nodes[0].parameters.options = { value: 'new-server-value', other: 'Keep this option' };
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(saved.nodes[0].parameters.options).toEqual({
			value: 'new-server-value',
			other: 'Keep this option',
		});
		await fireEvent.update(getByLabelText('Options'), 'user-value');
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(saved.nodes[0].parameters.options).toEqual({
			value: 'user-value',
			other: 'Keep this option',
		});
	});

	it('follows a later saved parameter update after Confirm', async () => {
		saved.nodes[0].parameters.options = { value: 'configured', other: 'Keep this option' };
		const { getByRole, getByLabelText } = await openParameters();
		await fireEvent.update(getByLabelText('Channel'), 'first-value');
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		documentStore.updateNodeProperties({
			name: 'Notify',
			properties: { parameters: { ...saved.nodes[0].parameters, channel: 'external-value' } },
		});
		await flushPromises();
		expect(getByLabelText('Channel')).toHaveValue('external-value');
		expect(getByRole('button', { name: 'Confirm' })).toBeDisabled();
	});

	it('keeps a failed draft available for retry', async () => {
		updateWorkflow.mockRejectedValueOnce(new Error('offline'));
		const { getByRole, getByLabelText } = await openParameters();
		await fireEvent.update(getByLabelText('Channel'), 'retry-value');
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(getByLabelText('Channel')).toHaveValue('retry-value');
		expect(getByRole('button', { name: 'Confirm' })).toBeEnabled();
		expect(saved.nodes[0].parameters.channel).toBe('');
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(saved.nodes[0].parameters.channel).toBe('retry-value');
		expect(getByRole('button', { name: 'Confirm' })).toBeDisabled();
	});

	it('keeps a queued draft until the flush refreshes saved state without a canvas', async () => {
		const { getByRole, getByLabelText } = await openParameters(false);
		thread.setupItemsByWorkflowId['wf-1'].push({
			id: 'wf-1:parameters:Notify',
			kind: 'parameters',
			nodeName: 'Notify',
			parameterNames: ['channel', 'options'],
		});
		startBuild();
		await fireEvent.update(getByLabelText('Channel'), 'queued-value');
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(updateWorkflow).not.toHaveBeenCalled();
		expect(getByLabelText('Channel')).toHaveValue('queued-value');
		expect(getByRole('button', { name: 'Confirm' })).toBeEnabled();
		thread.messages = [];
		await flushPromises();
		expect(saved.nodes[0].parameters.channel).toBe('queued-value');
		expect(getByRole('button', { name: 'Confirm' })).toBeDisabled();
	});

	it('preserves an edit made while an older save is in flight', async () => {
		const read = Promise.withResolvers<IWorkflowDb>();
		const { getByRole, getByLabelText } = await openParameters();
		vi.mocked(getWorkflow).mockReturnValueOnce(read.promise);
		await fireEvent.update(getByLabelText('Channel'), 'first-value');
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		expect(getByRole('button', { name: 'Confirm' })).toBeDisabled();
		await fireEvent.update(getByLabelText('Channel'), 'newer-value');
		read.resolve(deepCopy(saved));
		await flushPromises();
		expect(saved.nodes[0].parameters.channel).toBe('first-value');
		expect(getByLabelText('Channel')).toHaveValue('newer-value');
		expect(getByRole('button', { name: 'Confirm' })).toBeEnabled();
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(saved.nodes[0].parameters.channel).toBe('newer-value');
	});

	it('preserves saved sibling changes when a nested edit is queued', async () => {
		const { getByRole, getByLabelText } = await openParameters();
		await fireEvent.update(getByLabelText('Options'), 'user-value');
		saved.nodes[0].parameters.options = {
			value: '<__PLACEHOLDER_VALUE__value__>',
			other: 'Saved while editing',
		};
		documentStore.updateNodeProperties({
			name: 'Notify',
			properties: { parameters: deepCopy(saved.nodes[0].parameters) },
		});
		thread.setupItemsByWorkflowId['wf-1'].push({
			id: 'wf-1:parameters:Notify',
			kind: 'parameters',
			nodeName: 'Notify',
			parameterNames: ['channel', 'options'],
		});
		startBuild();
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		expect(updateWorkflow).not.toHaveBeenCalled();
		expect(getByLabelText('Options')).toHaveValue('user-value');

		saved.nodes[0].parameters.options = {
			value: '<__PLACEHOLDER_VALUE__value__>',
			other: 'Saved during the build',
		};
		documentStore.updateNodeProperties({
			name: 'Notify',
			properties: { parameters: deepCopy(saved.nodes[0].parameters) },
		});
		thread.messages = [];
		await flushPromises();
		expect(updateWorkflow).toHaveBeenCalledTimes(1);
		expect(saved.nodes[0].parameters.options).toEqual({
			value: 'user-value',
			other: 'Saved during the build',
		});
		expect(getByRole('button', { name: 'Confirm' })).toBeDisabled();
	});

	it('edits only placeholder assignment values and keeps them after their controls disappear', async () => {
		const nodeType = mockedStore(useNodeTypesStore).allNodeTypes[0];
		nodeType.properties.push({
			displayName: 'Assignments',
			name: 'assignments',
			type: 'assignmentCollection',
			default: { assignments: [] },
		});
		const assignments: AssignmentCollectionValue = {
			assignments: [
				{ id: 'fixed', name: 'Keep name', type: 'string', value: 'Keep value' },
				{
					id: 'endpoint',
					name: 'Endpoint',
					type: 'string',
					value: '<__PLACEHOLDER_VALUE__endpoint__>',
				},
			],
		};
		saved.nodes[0].parameters.assignments = assignments;
		saved.nodes[0].parameters.options = { value: 'configured', other: 'Keep this option' };
		const { findByTestId, queryByTestId, queryAllByTestId, getByRole } = await openParameters(
			true,
			{
				global: { stubs: { ParameterInputList: false } },
			},
		);
		const assignment = await findByTestId('assignment');
		expect(queryAllByTestId('assignment')).toHaveLength(1);
		expect(queryByTestId('assignment-name')).not.toBeInTheDocument();
		expect(queryByTestId('assignment-type-select')).not.toBeInTheDocument();
		expect(queryByTestId('assignment-remove')).not.toBeInTheDocument();
		expect(queryByTestId('assignment-collection-drop-area')).not.toBeInTheDocument();
		const input = within(assignment).getByRole('textbox');
		await fireEvent.update(input, 'https://example.com');
		await fireEvent.blur(input);
		const confirm = getByRole('button', { name: 'Confirm' });
		await waitFor(() => expect(confirm).toBeEnabled(), { timeout: 2000 });
		await fireEvent.click(confirm);
		await waitFor(() => expect(queryByTestId('assignment-collection-assignments')).toBeNull());
		expect(confirm).toBeDisabled();
		expect(saved.nodes[0].parameters.assignments).toEqual({
			assignments: [
				assignments.assignments[0],
				{ ...assignments.assignments[1], value: 'https://example.com' },
			],
		});
		expect(updateWorkflow).toHaveBeenCalledTimes(1);
	});

	it('opens credential creation in the workflow project when artifact metadata is missing', async () => {
		const project: ProjectListItem = {
			id: 'workflow-project',
			name: 'Workflow project',
			type: 'team',
			role: 'project:admin',
			scopes: ['credential:create'],
			icon: null,
			createdAt: '',
			updatedAt: '',
		};
		const projects = mockedStore(useProjectsStore);
		projects.myProjects.push(project);
		projects.currentProject = {
			...project,
			id: 'project-1',
			scopes: ['credential:create'],
			relations: [],
			rolesManaged: false,
		};
		saved.homeProject = project;
		const uiStore = mockedStore(useUIStore);
		const { findByRole } = renderPanel(false, {
			props: { projectId: undefined },
			global: { stubs: { NodeCredentials: false } },
		});
		await fireEvent.click(await findByRole('button', { name: 'Slack' }));
		const connect = await findByRole('button', { name: 'Connect to Slack' });
		expect(connect).toBeEnabled();
		await fireEvent.click(connect);
		await flushPromises();
		expect(uiStore.openNewCredential).toHaveBeenCalledWith(
			'slackApi',
			false,
			false,
			'workflow-project',
			undefined,
			'Notify',
			expect.objectContaining({ name: 'Notify' }),
			expect.objectContaining({ workflowId: 'wf-1' }),
		);
	});

	it.each(['dropped', 'conflict'] as const)(
		'refreshes saved setup state after a %s write without a canvas',
		async (outcome) => {
			const { getByRole, getByLabelText, queryByTestId } = await openParameters(false);
			await fireEvent.update(getByLabelText('Channel'), 'user-value');
			if (outcome === 'dropped') {
				saved.nodes = [];
			} else {
				saved.nodes[0].parameters = {
					channel: 'Saved elsewhere',
					options: { value: 'configured', other: 'Keep this option' },
				};
				updateWorkflow.mockRejectedValue(new ResponseError('Conflict', { httpStatusCode: 409 }));
			}
			await fireEvent.click(getByRole('button', { name: 'Confirm' }));
			await flushPromises();
			if (outcome === 'dropped') {
				expect(queryByTestId('instance-ai-setup-panel')).not.toBeInTheDocument();
				expect(updateWorkflow).not.toHaveBeenCalled();
			} else {
				expect(getByLabelText('Channel')).toHaveValue('user-value');
				await fireEvent.click(getByRole('button', { name: 'Back' }));
				expect(getByRole('button', { name: 'Notify Ready' })).toBeInTheDocument();
				expect(saved.nodes[0].parameters.channel).toBe('Saved elsewhere');
				expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
			}
		},
	);
});
