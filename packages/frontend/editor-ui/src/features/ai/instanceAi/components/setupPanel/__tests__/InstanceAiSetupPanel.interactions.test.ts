import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { computed, defineComponent, h, reactive, ref, type PropType } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { getActivePinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	deepCopy,
	NodeConnectionTypes,
	type INodeProperties,
	type INodeTypeDescription,
	type AssignmentCollectionValue,
} from 'n8n-workflow';
import type {
	InstanceAiAgentNode,
	InstanceAiCredentialSetupHint,
	InstanceAiSetupItem,
	PushMessage,
} from '@n8n/api-types';
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
import { getWorkflowExecutionStateStoreId } from '@/app/stores/workflowExecutionState.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { SETUP_PANEL_SUCCESS_DELAY } from '@/app/constants/durations';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import type { SetupPanelThreadSource } from '../../../composables/useSetupPanelState';
import type { ThreadRuntime } from '../../../instanceAi.store';
import { fetchThread, updateThreadMetadata } from '../../../instanceAi.memory.api';
import InstanceAiSetupPanel from '../InstanceAiSetupPanel.vue';

const { showMessage, testCredentialInBackground, authorize } = vi.hoisted(() => ({
	showMessage: vi.fn(),
	testCredentialInBackground: vi.fn().mockResolvedValue(undefined),
	authorize: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));
vi.mock('@/features/credentials/composables/useCredentialTestInBackground', () => ({
	useCredentialTestInBackground: () => ({ testCredentialInBackground }),
}));
vi.mock('@/features/credentials/composables/useCredentialOAuth', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/credentials/composables/useCredentialOAuth')>();
	return {
		...actual,
		useCredentialOAuth: () => ({ ...actual.useCredentialOAuth(), authorize }),
	};
});
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

let thread: SetupPanelThreadSource &
	Pick<ThreadRuntime, 'id' | 'sendMessage' | 'rememberManualExecution'>;
let threadMetadata = ref<Record<string, unknown>>({});
vi.mock('../../../instanceAi.store', () => ({
	useThread: () => thread,
	useInstanceAiStore: () => ({
		getThreadMetadata: () => threadMetadata.value,
		setThreadMetadata: (_id: string, metadata: Record<string, unknown>) => {
			threadMetadata.value = metadata;
		},
	}),
}));
vi.mock('../../../instanceAi.memory.api', () => ({
	fetchThread: vi.fn(),
	updateThreadMetadata: vi.fn(),
}));

const accounts = [
	mock<ICredentialsResponse>({
		id: 'cred-1',
		name: 'First account',
		type: 'slackApi',
	}),
	mock<ICredentialsResponse>({
		id: 'cred-2',
		name: 'Second account',
		type: 'slackApi',
	}),
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

const SetupCredentialStub = defineComponent({
	props: {
		item: {
			type: Object as PropType<Extract<InstanceAiSetupItem, { kind: 'credential' }>>,
			required: true,
		},
		node: Object as PropType<INodeUi>,
		workflowId: String,
		projectId: String,
		allowPerNode: Boolean,
	},
	emits: ['bindCredential', 'setCredentialsPerNode'],
	setup(props, { emit }) {
		return () =>
			props.node
				? h('div', [
						props.allowPerNode
							? h(
									'button',
									{ onClick: () => emit('setCredentialsPerNode') },
									'Set credentials per node',
								)
							: null,
						h(NodeCredentialsStub, {
							node: props.node,
							overrideCredType: props.item.credentialType,
							credentialSetupHint: props.item.setupHint,
							workflowId: props.workflowId,
							projectId: props.projectId,
							skipAutoSelect: true,
							onCredentialSelected: (update: {
								properties: { credentials: Record<string, { id: string }> };
							}) =>
								emit(
									'bindCredential',
									props.item,
									update.properties.credentials[props.item.credentialType].id,
								),
						}),
					])
				: null;
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
	InstanceAiSetupCredential: SetupCredentialStub,
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
		threadMetadata = ref({});
		vi.mocked(updateThreadMetadata).mockResolvedValue({
			thread: { id: 'thread-1', resourceId: 'user-1', createdAt: '', updatedAt: '' },
		});
		vi.mocked(fetchThread).mockImplementation(async () => ({
			thread: {
				id: 'thread-1',
				resourceId: 'user-1',
				createdAt: '',
				updatedAt: '',
				metadata: threadMetadata.value,
			},
		}));
		localStorage.clear();
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
		credentials.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		credentials.getNewCredentialName.mockResolvedValue('Slack account');
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
			id: 'thread-1',
			messages: [],
			setupItemsByWorkflowId: {
				'wf-1': [
					{ id: 'wf-1:credential:slackApi', kind: 'credential', credentialType: 'slackApi' },
				],
			},
			sendMessage: vi.fn().mockResolvedValue(true),
			rememberManualExecution: vi.fn(),
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
		saved.nodes[0].credentials = { slackApi: { id: 'cred-1', name: 'First account' } };
		const rendered = renderPanel(hydrated, options);
		await fireEvent.click(await rendered.findByRole('button', { name: /Slack/ }));
		return rendered;
	}

	it('hides empty node sections until the shared credential is selected', async () => {
		saved.nodes.push({
			...deepCopy(saved.nodes[0]),
			id: 'second-node',
			name: 'Second notification',
		});
		const view = renderPanel();
		await fireEvent.click(await view.findByRole('button', { name: /Slack/ }));
		expect(view.queryByRole('heading', { name: 'Notify' })).toBeNull();
		expect(view.queryByRole('heading', { name: 'Second notification' })).toBeNull();
		expect(view.queryByLabelText('Channel')).toBeNull();
		await fireEvent.update(view.getByLabelText('Account'), 'cred-1');
		await flushPromises();
		expect(view.getByRole('heading', { name: 'Notify' })).toBeVisible();
		expect(view.getByRole('heading', { name: 'Second notification' })).toBeVisible();
		const channels = view.getAllByLabelText('Channel');
		expect(channels).toHaveLength(2);
		for (const channel of channels) expect(channel).toBeVisible();
	});

	it('preserves drafts when splitting a shared account and saves both nodes with one Confirm', async () => {
		saved.nodes[0].credentials = { slackApi: { id: 'cred-1', name: 'First account' } };
		saved.nodes.push({
			...deepCopy(saved.nodes[0]),
			id: 'second-node',
			name: 'Second notification',
		});
		const view = await openParameters();
		const channels = view.getAllByLabelText('Channel');
		await fireEvent.update(channels[0], 'first-channel');
		await fireEvent.update(channels[1], 'second-channel');
		expect(view.getAllByLabelText('Account')).toHaveLength(1);
		await fireEvent.click(view.getByRole('button', { name: 'Set credentials per node' }));
		expect(updateWorkflow).not.toHaveBeenCalled();
		expect(
			view.getAllByLabelText('Channel').map((input) => (input as HTMLInputElement).value),
		).toEqual(['first-channel', 'second-channel']);
		const accounts = view.getAllByLabelText('Account');
		expect(accounts).toHaveLength(2);
		await fireEvent.update(accounts[1], 'cred-2');
		await flushPromises();
		expect(saved.nodes.map((node) => node.credentials?.slackApi.id)).toEqual(['cred-1', 'cred-2']);
		updateWorkflow.mockClear();
		expect(view.getAllByRole('button', { name: 'Confirm' })).toHaveLength(1);
		await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(updateWorkflow).toHaveBeenCalledTimes(1);
		expect(saved.nodes.map((node) => node.parameters.channel)).toEqual([
			'first-channel',
			'second-channel',
		]);
	});

	it('opens existing different accounts per node and preserves all drafts after a failed batch', async () => {
		saved.nodes.push({
			...deepCopy(saved.nodes[0]),
			id: 'second-node',
			name: 'Second notification',
			credentials: { slackApi: { id: 'cred-2', name: 'Second account' } },
		});
		const view = await openParameters();
		expect(
			view.getAllByLabelText('Account').map((input) => (input as HTMLSelectElement).value),
		).toEqual(['cred-1', 'cred-2']);
		const channels = view.getAllByLabelText('Channel');
		await fireEvent.update(channels[0], 'first-channel');
		await fireEvent.update(channels[1], 'second-channel');
		updateWorkflow.mockRejectedValueOnce(new Error('offline'));
		await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(saved.nodes.map((node) => node.parameters.channel)).toEqual(['', '']);
		expect(
			view.getAllByLabelText('Channel').map((input) => (input as HTMLInputElement).value),
		).toEqual(['first-channel', 'second-channel']);
		await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(saved.nodes.map((node) => node.parameters.channel)).toEqual([
			'first-channel',
			'second-channel',
		]);
	});

	it('holds confirmed fields briefly, then preserves the completed review when an edit is saved', async () => {
		const defaultMatchMedia = window.matchMedia;
		const media = window.matchMedia('');
		window.matchMedia = vi.fn((query) => ({ ...media, media: query, matches: false }));
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		try {
			saved.nodes[0].parameters.options = { value: 'configured', other: 'Keep this option' };
			const view = await openParameters();
			await fireEvent.update(view.getByLabelText('Channel'), 'first-value');
			await fireEvent.click(view.getByRole('button', { name: 'Confirm' }));
			await flushPromises();
			await vi.advanceTimersByTimeAsync(SETUP_PANEL_SUCCESS_DELAY - 1);
			expect(view.getByLabelText('Channel')).toHaveValue('first-value');
			await vi.advanceTimersByTimeAsync(1);
			expect(view.queryByRole('dialog')).toBeNull();
			await fireEvent.click(view.getByRole('button', { name: 'Setup complete' }));
			await vi.advanceTimersByTimeAsync(32);
			await fireEvent.click(view.getByRole('button', { name: 'Slack Complete' }));
			await vi.advanceTimersByTimeAsync(SETUP_PANEL_SUCCESS_DELAY * 2);
			expect(view.getByLabelText('Channel')).toHaveValue('first-value');
			await fireEvent.update(view.getByLabelText('Channel'), 'updated-value');
			await fireEvent.click(view.getByRole('button', { name: 'Update' }));
			await flushPromises();
			await vi.advanceTimersByTimeAsync(SETUP_PANEL_SUCCESS_DELAY);
			expect(view.queryByRole('dialog')).toBeNull();
			expect(view.getByRole('button', { name: 'Slack Complete' })).toBeVisible();
			expect(view.getByRole('button', { name: 'Setup complete' })).toHaveAttribute(
				'aria-expanded',
				'true',
			);
			expect(saved.nodes[0].parameters.channel).toBe('updated-value');
			view.unmount();
		} finally {
			window.matchMedia = defaultMatchMedia;
			vi.useRealTimers();
		}
	});

	it('binds a credential announced without bindings after the build ends', async () => {
		startBuild();
		const { getByRole, findByRole, getByTestId, queryByRole } = renderPanel();
		await flushPromises();
		await fireEvent.click(await findByRole('button', { name: /Slack/ }));
		const picker = getByRole('combobox');
		expect(picker).toHaveAttribute('data-workflow-id', 'wf-1');
		expect(picker).toHaveAttribute('data-project-id', 'project-1');
		expect(picker).toHaveAttribute('data-skip-auto-select', 'true');
		expect(updateWorkflow).not.toHaveBeenCalled();
		await fireEvent.change(picker, { target: { value: 'cred-2' } });
		expect(updateWorkflow).not.toHaveBeenCalled();
		await waitFor(() =>
			expect(getByTestId('selected-account')).toHaveTextContent('Second account'),
		);
		await fireEvent.click(getByRole('button', { name: 'Back to setup checklist' }));
		await fireEvent.click(getByRole('button', { name: 'Slack Complete' }));
		expect(getByRole('combobox')).toHaveValue('cred-2');
		expect(queryByRole('button', { name: 'Execute' })).toBeNull();
		// The user's explicit choice replaces the SDK's selection when writes resume.
		saved.nodes[0].credentials = { slackApi: { id: 'cred-1', name: 'First account' } };
		thread.messages = [];
		await flushPromises();
		expect(updateWorkflow).toHaveBeenCalledTimes(1);
		expect(saved.nodes[0].credentials?.slackApi).toEqual({ id: 'cred-2', name: 'Second account' });
		expect(testCredentialInBackground).toHaveBeenCalledWith('cred-2', 'Second account', 'slackApi');
	});

	it.each([false, true])(
		'uses the SDK-selected credential before the build ends, canvas: %s',
		async (hydrated) => {
			const read = Promise.withResolvers<IWorkflowDb>();
			fetchWorkflow.mockReturnValueOnce(read.promise);
			startBuild();
			const { queryByRole, queryByTestId } = renderPanel(hydrated);
			await flushPromises();
			expect(queryByTestId('instance-ai-setup-panel')).toBeNull();
			saved.nodes[0].credentials = { slackApi: { id: 'cred-1', name: 'First account' } };
			read.resolve(deepCopy(saved));
			await flushPromises();
			expect(queryByRole('button', { name: /Add connection/ })).toBeNull();
			expect(queryByTestId('instance-ai-setup-panel')).toBeNull();
			expect(updateWorkflow).not.toHaveBeenCalled();
		},
	);

	it('keeps private Connect available after an unrelated credential list replaces the flat map', async () => {
		vi.spyOn(useSettingsStore(), 'isModuleActive').mockReturnValue(true);
		const credential = mock<ICredentialsResponse>({
			id: 'private-account',
			name: 'Private Slack',
			type: 'slackApi',
			isResolvable: true,
			connectedByMe: false,
			scopes: ['credential:read', 'credential:connect'],
		});
		const credentials = mockedStore(useCredentialsStore);
		credentials.setCredentials([credential]);
		credentials.usableCredentials = { [credential.id]: credential };
		saved.nodes[0].credentials = { slackApi: { id: credential.id, name: credential.name } };
		const view = renderPanel(false, {
			global: { stubs: { InstanceAiSetupCredential: false, NodeCredentials: false } },
		});
		await userEvent.click(await view.findByRole('button', { name: /Slack/ }));
		expect(await view.findByTestId('node-credential-private-connect')).toBeEnabled();
		credentials.setCredentials([]);
		await flushPromises();
		expect(credentials.getCredentialById(credential.id)).toBeUndefined();
		expect(credentials.getUsableCredentialById(credential.id)).toMatchObject({
			connectedByMe: false,
		});
		expect(view.getByTestId('node-credential-private-connect')).toBeEnabled();
		authorize.mockResolvedValueOnce(true);
		await userEvent.click(view.getByTestId('node-credential-private-connect'));
		await flushPromises();
		expect(authorize).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ id: credential.id, type: credential.type, isResolvable: true }),
		);
		expect(credentials.getUsableCredentialById(credential.id)).toMatchObject({
			connectedByMe: true,
		});
		expect(view.getByTestId('node-credential-private-connected-actions')).toBeVisible();
		expect(testCredentialInBackground).toHaveBeenCalledWith(
			credential.id,
			credential.name,
			credential.type,
		);
		expect(updateWorkflow).not.toHaveBeenCalled();
	});

	it('keeps a completed workflow dismissed when its execution finishes on another artifact', async () => {
		saved.nodes[0].parameters = { channel: 'ready', options: { value: 'ready' } };
		saved.nodes.push(createTestNode({ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }));
		const nodeTypes = mockedStore(useNodeTypesStore);
		const notifyType = nodeTypes.allNodeTypes[0];
		const triggerType: INodeTypeDescription = {
			...notifyType,
			name: 'n8n-nodes-base.manualTrigger',
			group: ['trigger'],
			credentials: [],
			properties: [],
		};
		nodeTypes.getNodeType = vi.fn((type) => (type === triggerType.name ? triggerType : notifyType));
		const otherWorkflow = createTestWorkflow({ id: 'wf-2', nodes: deepCopy(saved.nodes) });
		vi.mocked(getWorkflow).mockImplementation(async (_context, id) =>
			deepCopy(id === otherWorkflow.id ? otherWorkflow : saved),
		);
		fetchWorkflow.mockImplementation(async (id) =>
			deepCopy(id === otherWorkflow.id ? otherWorkflow : saved),
		);
		mockedStore(useNodeTypesStore).isTriggerNode = vi.fn(
			(type) => type === 'n8n-nodes-base.manualTrigger',
		);
		const handlers = new Set<(event: PushMessage) => void>();
		const push = mockedStore(usePushConnectionStore);
		push.isConnected = true;
		push.addEventListener.mockImplementation((handler) => {
			handlers.add(handler);
			return () => {
				handlers.delete(handler);
			};
		});
		const workflows = mockedStore(useWorkflowsStore);
		workflows.runWorkflow.mockResolvedValueOnce({ executionId: 'run-first' });
		workflows.fetchExecutionDataById.mockResolvedValue(null);
		const view = renderPanel(false);
		await userEvent.click(await view.findByRole('button', { name: /Slack/ }));
		await fireEvent.change(view.getByRole('combobox'), { target: { value: 'cred-1' } });
		await userEvent.click(await view.findByRole('button', { name: 'Execute' }));
		await flushPromises();
		expect(workflows.runWorkflow).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			triggerToStartFrom: { name: 'Start' },
		});
		expect(thread.sendMessage).not.toHaveBeenCalled();
		await view.rerender({ workflowId: 'wf-2' });
		await flushPromises();
		expect(view.getByRole('button', { name: /Slack/ })).toBeVisible();
		for (const handler of handlers)
			handler({
				type: 'executionFinished',
				data: { workflowId: 'wf-1', executionId: 'run-first', status: 'success' },
			});
		await waitFor(() =>
			expect(thread.sendMessage).toHaveBeenCalledExactlyOnceWith(
				'The workflow execution finished with execution id "run-first"',
				{
					authorship: { kind: 'prefill', prefillType: 'handoff_setup_panel_execute' },
					pushRef: useRootStore().pushRef,
				},
			),
		);
		expect(view.getByRole('button', { name: /Slack/ })).toBeVisible();
		await view.rerender({ workflowId: 'wf-1' });
		await flushPromises();
		expect(view.queryByTestId('instance-ai-setup-panel')).toBeNull();
		view.unmount();
		const restored = renderPanel(false);
		await flushPromises();
		expect(restored.queryByTestId('instance-ai-setup-panel')).toBeNull();
		saved.nodes[0].parameters.channel = '';
		await restored.rerender({ workflowId: 'wf-2' });
		await flushPromises();
		await restored.rerender({ workflowId: 'wf-1' });
		await flushPromises();
		expect(restored.getByRole('button', { name: /Slack/ })).toBeVisible();
		expect(restored.queryByRole('button', { name: 'Execute' })).toBeNull();
	});

	it.each([
		{ count: 1, preferNew: false },
		{ count: 2, preferNew: false },
		{ count: 1, preferNew: true },
	])(
		'selects an early account only when its scoped choice is unique: %s',
		async ({ count, preferNew }) => {
			startBuild();
			saved.nodes = [];
			thread.setupItemsByWorkflowId['wf-1'] = [
				{
					id: 'wf-1:credential:slackApi',
					kind: 'credential',
					credentialType: 'slackApi',
					preferNew,
				},
			];
			mockedStore(useCredentialsStore).usableCredentials = Object.fromEntries(
				accounts.slice(0, count).map((account) => [account.id, account]),
			);
			const view = renderPanel(false);
			await flushPromises();
			if (count === 1 && !preferNew) {
				expect(updateThreadMetadata).toHaveBeenCalledTimes(1);
				expect(view.getByRole('button', { name: 'Slack Complete' })).toBeVisible();
			} else {
				expect(updateThreadMetadata).not.toHaveBeenCalled();
				expect(view.getByRole('button', { name: /Slack/ })).toBeVisible();
			}
			expect(updateWorkflow).not.toHaveBeenCalled();
		},
	);

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
		await flushPromises();
		await fireEvent.click(getByRole('button', { name: /Slack/ }));
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
		await flushPromises();
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

	it('removes a node heading when its last setup field becomes hidden', async () => {
		const type = mockedStore(useNodeTypesStore).allNodeTypes[0];
		type.properties.unshift({
			name: 'resource',
			displayName: 'Resource',
			type: 'string',
			default: 'message',
		});
		type.properties.find((property) => property.name === 'channel')!.displayOptions = {
			show: { resource: ['message'] },
		};
		saved.nodes[0].parameters = { resource: 'message', channel: '' };
		saved.nodes[0].credentials = { slackApi: { id: 'cred-1', name: 'First account' } };
		saved.nodes.push({
			...deepCopy(saved.nodes[0]),
			id: 'second-node',
			name: 'Second notification',
		});
		const view = await openParameters();
		expect(view.getByRole('heading', { name: 'Notify' })).toBeVisible();
		documentStore.updateNodeProperties({
			name: 'Notify',
			properties: { parameters: { resource: 'other', channel: '' } },
		});
		await flushPromises();
		expect(view.queryByRole('heading', { name: 'Notify' })).toBeNull();
		expect(view.getByRole('heading', { name: 'Second notification' })).toBeVisible();
	});

	it('renders fields gated by defaults omitted from the saved workflow', async () => {
		const type = mockedStore(useNodeTypesStore).allNodeTypes[0];
		type.properties.unshift({
			name: 'resource',
			displayName: 'Resource',
			type: 'options',
			default: 'message',
			options: [{ name: 'Message', value: 'message' }],
		});
		const channel = type.properties.find((property) => property.name === 'channel')!;
		channel.displayOptions = { show: { resource: ['message'] } };
		channel.placeholder = 'Choose a channel';
		const rendered = await openParameters(false, {
			global: { stubs: { ParameterInputList: false } },
		});
		const input = await rendered.findByPlaceholderText('Choose a channel');
		expect(input).toBeVisible();
		await fireEvent.update(input, 'announcements');
		await fireEvent.blur(input);
		await fireEvent.click(rendered.getByRole('button', { name: 'Confirm' }));
		await flushPromises();
		expect(saved.nodes[0].parameters.channel).toBe('announcements');
		expect(saved.nodes[0].parameters.resource).toBeUndefined();
	});

	it('preserves a hidden sibling when evaluating a setup field', async () => {
		const type = mockedStore(useNodeTypesStore).allNodeTypes[0];
		type.properties.unshift(
			{ name: 'mode', displayName: 'Mode', type: 'string', default: 'basic' },
			{
				name: 'useChannel',
				displayName: 'Use channel',
				type: 'boolean',
				default: true,
				displayOptions: { show: { mode: ['advanced'] } },
			},
		);
		const channel = type.properties.find((property) => property.name === 'channel')!;
		channel.displayOptions = { show: { useChannel: [true] } };
		channel.placeholder = 'Choose a channel';
		const rendered = await openParameters(false, {
			global: { stubs: { ParameterInputList: false } },
		});
		expect(await rendered.findByPlaceholderText('Choose a channel')).toBeVisible();
	});

	it('disposes the temporary execution store when the panel unmounts', async () => {
		const rendered = await openParameters(false, {
			global: { stubs: { ParameterInputList: false } },
		});
		const documentId = createWorkflowDocumentId('wf-1', 'wf-1:parameters:Notify');
		useNDVStore(documentId);
		const storeId = getWorkflowExecutionStateStoreId(documentId);
		expect(getActivePinia()!.state.value[storeId]).toBeDefined();
		rendered.unmount();
		expect(getActivePinia()!.state.value[storeId]).toBeUndefined();
	});

	it.each(['back', 'escape'])('disposes detail stores after closing with %s', async (method) => {
		const rendered = await openParameters(false, {
			global: { stubs: { ParameterInputList: false, transition: false } },
		});
		const documentId = createWorkflowDocumentId('wf-1', 'wf-1:parameters:Notify');
		const storeIds = [
			useWorkflowDocumentStore(documentId).$id,
			useNDVStore(documentId).$id,
			getWorkflowExecutionStateStoreId(documentId),
		];
		for (const id of storeIds) expect(getActivePinia()!.state.value[id]).toBeDefined();
		if (method === 'back') {
			await userEvent.click(rendered.getByRole('button', { name: 'Back to setup checklist' }));
		} else {
			rendered.getByRole('button', { name: 'Back to setup checklist' }).focus();
			await userEvent.keyboard('{Escape}');
		}
		await waitFor(() => {
			for (const id of storeIds) expect(getActivePinia()!.state.value[id]).toBeUndefined();
		});
		expect(rendered.getByTestId('instance-ai-setup-panel')).toBeVisible();
		expect(rendered.getByRole('button', { name: /Slack/ })).toBeVisible();
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
		await fireEvent.click(getByRole('button', { name: 'Setup complete' }));
		await waitFor(() => expect(getByRole('button', { name: 'Slack Complete' })).toBeVisible());
		await fireEvent.click(getByRole('button', { name: 'Slack Complete' }));
		expect(getByLabelText('Channel')).toHaveValue('external-value');
		expect(getByRole('button', { name: 'Update' })).toBeDisabled();
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
		expect(getByRole('button', { name: 'Confirm' })).toBeDisabled();
		await fireEvent.click(getByRole('button', { name: 'Back to setup checklist' }));
		await fireEvent.click(getByRole('button', { name: /Slack/ }));
		expect(getByLabelText('Channel')).toHaveValue('queued-value');
		expect(getByRole('button', { name: 'Confirm' })).toBeDisabled();
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

	it('lets a queued field return to its original saved value', async () => {
		const { getByRole, getByLabelText } = await openParameters(false);
		thread.setupItemsByWorkflowId['wf-1'].push({
			id: 'wf-1:parameters:Notify',
			kind: 'parameters',
			nodeName: 'Notify',
			parameterNames: ['channel', 'options'],
		});
		startBuild();
		await flushPromises();
		await fireEvent.update(getByLabelText('Channel'), 'queued-value');
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		await fireEvent.update(getByLabelText('Channel'), '');
		expect(getByLabelText('Channel')).toHaveValue('');
		expect(getByRole('button', { name: 'Confirm' })).toBeEnabled();
		await fireEvent.click(getByRole('button', { name: 'Confirm' }));
		expect(getByRole('button', { name: 'Confirm' })).toBeDisabled();
		thread.messages = [];
		await flushPromises();
		expect(saved.nodes[0].parameters.channel).toBe('');
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
			global: { stubs: { NodeCredentials: false, InstanceAiSetupCredential: false } },
		});
		await fireEvent.click(await findByRole('button', { name: /Slack/ }));
		await userEvent.click(await findByRole('button', { name: 'More options' }));
		await userEvent.click(await findByRole('menuitem', { name: 'Advanced setup' }));
		await flushPromises();
		expect(uiStore.openNewCredential).toHaveBeenCalledWith(
			'slackApi',
			false,
			true,
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
				await fireEvent.click(getByRole('button', { name: 'Back to setup checklist' }));
				await fireEvent.click(getByRole('button', { name: 'Setup complete' }));
				await waitFor(() => expect(getByRole('button', { name: 'Slack Complete' })).toBeVisible());
				expect(saved.nodes[0].parameters.channel).toBe('Saved elsewhere');
				expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
			}
		},
	);
});
