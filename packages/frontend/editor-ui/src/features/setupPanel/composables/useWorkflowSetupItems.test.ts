import { effectScope, reactive, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ICredentialType, INodeParameters } from 'n8n-workflow';
import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import type { InstanceAiAgentNode, InstanceAiSetupItem } from '@n8n/api-types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { useSetupPanelState } from '@/features/ai/instanceAi/composables/useSetupPanelState';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type {
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
} from '@/features/credentials/credentials.types';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	getWorkflowDocumentStoreId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	getNodeCredentialTypes,
	getNodeParametersIssues,
} from '@/features/setupPanel/setupPanel.utils';
import { useWorkflowSetupItems } from './useWorkflowSetupItems';

vi.mock('@/features/setupPanel/setupPanel.utils', () => ({
	getNodeCredentialTypes: vi.fn().mockReturnValue([]),
	getNodeParametersIssues: vi.fn().mockReturnValue({}),
}));
vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makeRestApiRequest: vi.fn(),
}));

// The credential-change test runs the real `deleteCredential` action (a
// reassigned `vi.fn()` would bypass pinia's wrapper, so `$onAction` — what
// `listenForCredentialChanges` subscribes through — would never fire).
vi.mock('@/features/credentials/credentials.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	deleteCredential: vi.fn().mockResolvedValue(true),
	createNewCredential: vi
		.fn()
		.mockResolvedValue({ id: 'pending', name: 'Pending account', type: 'slackApi' }),
}));

const WORKFLOW_ID = 'wf-1';

const mockGetNodeCredentialTypes = vi.mocked(getNodeCredentialTypes);
const mockGetNodeParametersIssues = vi.mocked(getNodeParametersIssues);

function hydrateWorkflow(nodes: INodeUi[]) {
	const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
	documentStore.hydrate(createTestWorkflow({ id: WORKFLOW_ID, nodes, connections: {} }));
	return documentStore;
}

function credentialItem(
	overrides: Partial<Extract<InstanceAiSetupItem, { kind: 'credential' }>> = {},
): InstanceAiSetupItem {
	return {
		id: `${WORKFLOW_ID}:credential:slackApi`,
		kind: 'credential',
		credentialType: 'slackApi',
		nodeBindings: [{ nodeName: 'Slack' }],
		...overrides,
	};
}

describe('useWorkflowSetupItems', () => {
	let pinia: TestingPinia;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.allNodeTypes = [mockNodeTypeDescription()];
		credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.getUsableCredentialByType = vi.fn().mockReturnValue([]);
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(undefined);
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(false);
		credentialsStore.fetchUsableCredentials = vi.fn().mockResolvedValue([]);
		workflowsListStore = mockedStore(useWorkflowsListStore);
		workflowsListStore.fetchWorkflow = vi
			.fn()
			.mockResolvedValue(createTestWorkflow({ id: WORKFLOW_ID }));
		mockGetNodeCredentialTypes.mockReset().mockReturnValue([]);
		mockGetNodeParametersIssues.mockReset().mockReturnValue({});
	});

	it('derives service-keyed items from the hydrated workflow document', () => {
		mockGetNodeCredentialTypes.mockImplementation((_provider, node) => {
			if (node.name === 'Slack' || node.name === 'Old Slack') return ['slackApi'];
			if (node.name === 'Sheets') return ['googleSheetsOAuth2Api'];
			return [];
		});
		mockGetNodeParametersIssues.mockImplementation(
			(_provider, node): Record<string, string[]> =>
				node.name === 'Sheets' ? { documentId: ['Parameter "documentId" is required.'] } : {},
		);
		credentialsStore.getCredentialTypeByName = vi
			.fn()
			.mockImplementation((type: string) =>
				type === 'slackApi' ? ({ displayName: 'Slack API' } as ICredentialType) : undefined,
			);
		hydrateWorkflow([
			createTestNode({ name: 'Slack' }),
			createTestNode({ name: 'Sheets' }),
			createTestNode({ name: 'Code' }),
			createTestNode({ name: 'Old Slack', disabled: true }),
		]);

		const { isWorkflowAvailable, derivedItems } = useWorkflowSetupItems(() => WORKFLOW_ID);

		expect(isWorkflowAvailable.value).toBe(true);
		expect(derivedItems.value).toEqual([
			{
				id: 'wf-1:credential:slackApi',
				kind: 'credential',
				credentialType: 'slackApi',
				appDisplayName: 'Slack API',
				nodeBindings: [{ nodeName: 'Slack' }],
			},
			{
				id: 'wf-1:credential:googleSheetsOAuth2Api',
				kind: 'credential',
				credentialType: 'googleSheetsOAuth2Api',
				appDisplayName: undefined,
				nodeBindings: [{ nodeName: 'Sheets' }],
			},
			{
				id: 'wf-1:parameters:Sheets',
				kind: 'parameters',
				nodeName: 'Sheets',
				parameterNames: ['documentId'],
			},
		]);
	});

	it('derives from the saved workflow when no canvas host has a document store', async () => {
		mockGetNodeCredentialTypes.mockReturnValue(['slackApi']);
		workflowsListStore.fetchWorkflow = vi.fn().mockResolvedValue(
			createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [createTestNode({ name: 'Slack' })],
			}),
		);

		const { isWorkflowAvailable, derivedItems } = useWorkflowSetupItems(() => WORKFLOW_ID);

		// Nodes come from this composable's own fetch, never the workflows-list
		// cache (list pages seed it with `nodes: []` placeholders).
		expect(isWorkflowAvailable.value).toBe(false);
		expect(derivedItems.value).toEqual([]);
		await vi.waitFor(() => expect(isWorkflowAvailable.value).toBe(true));
		expect(derivedItems.value).toEqual([credentialItem()]);
		// It attaches to a host's store but never creates one itself.
		expect(
			getWorkflowDocumentStoreId(createWorkflowDocumentId(WORKFLOW_ID)) in pinia.state.value,
		).toBe(false);
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
			workflowId: WORKFLOW_ID,
		});
	});

	it('stays unavailable when the saved-workflow fetch fails', async () => {
		workflowsListStore.fetchWorkflow = vi.fn().mockRejectedValue(new Error('offline'));

		const { isWorkflowAvailable } = useWorkflowSetupItems(() => WORKFLOW_ID);

		await vi.waitFor(() => expect(workflowsListStore.fetchWorkflow).toHaveBeenCalled());
		await Promise.resolve();
		await Promise.resolve();
		expect(isWorkflowAvailable.value).toBe(false);
	});

	it('refreshes completion from saved data without creating a canvas document', async () => {
		const pending = createTestWorkflow({
			id: WORKFLOW_ID,
			nodes: [
				createTestNode({
					name: 'Slack',
					parameters: { channel: '<__PLACEHOLDER_VALUE__channel__>' },
				}),
			],
		});
		workflowsListStore.fetchWorkflow.mockResolvedValueOnce(pending);
		const state = useWorkflowSetupItems(() => WORKFLOW_ID);
		await flushPromises();
		const item = state.derivedItems.value[0];
		expect(item).toMatchObject({ kind: 'parameters', parameterNames: ['channel'] });
		expect(state.isItemDone(item)).toBe(false);

		workflowsListStore.fetchWorkflow.mockResolvedValueOnce(
			createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [createTestNode({ name: 'Slack', parameters: { channel: 'team-updates' } })],
			}),
		);
		await state.refreshWorkflow();
		expect(state.isItemDone(item)).toBe(true);
		expect(state.getNodeByName('Slack')?.parameters.channel).toBe('team-updates');
		expect(
			getWorkflowDocumentStoreId(createWorkflowDocumentId(WORKFLOW_ID)) in pinia.state.value,
		).toBe(false);
	});

	it('ignores an older fetch that finishes after a refresh', async () => {
		const oldRead = Promise.withResolvers<IWorkflowDb>();
		workflowsListStore.fetchWorkflow.mockReturnValueOnce(oldRead.promise);
		const state = useWorkflowSetupItems(() => WORKFLOW_ID);
		workflowsListStore.fetchWorkflow.mockResolvedValueOnce(
			createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [createTestNode({ name: 'Slack', parameters: { channel: 'new-value' } })],
			}),
		);
		await state.refreshWorkflow();
		oldRead.resolve(
			createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [createTestNode({ name: 'Slack', parameters: { channel: 'old-value' } })],
			}),
		);
		await flushPromises();
		expect(state.getNodeByName('Slack')?.parameters.channel).toBe('new-value');
	});

	it('recovers a failed overlapping refresh without accepting the older response', async () => {
		const initialRead = Promise.withResolvers<IWorkflowDb>();
		const refreshRead = Promise.withResolvers<IWorkflowDb>();
		const retryRead = Promise.withResolvers<IWorkflowDb>();
		workflowsListStore.fetchWorkflow
			.mockReturnValueOnce(initialRead.promise)
			.mockReturnValueOnce(refreshRead.promise)
			.mockReturnValueOnce(retryRead.promise);
		const state = useWorkflowSetupItems(() => WORKFLOW_ID);
		const refresh = state.refreshWorkflow();
		refreshRead.reject(new Error('Temporary failure'));
		await flushPromises();
		initialRead.resolve(
			createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [createTestNode({ name: 'Slack', parameters: { channel: 'old-value' } })],
			}),
		);
		await flushPromises();
		expect(state.isWorkflowAvailable.value).toBe(false);
		retryRead.resolve(
			createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [createTestNode({ name: 'Slack', parameters: { channel: 'current-value' } })],
			}),
		);
		await refresh;
		expect(state.isWorkflowAvailable.value).toBe(true);
		expect(state.getNodeByName('Slack')?.parameters.channel).toBe('current-value');
	});

	it.each<{ label: string; value: INodeParameters[string] }>([
		{ label: 'direct', value: '<__PLACEHOLDER_VALUE__API URL__>' },
		{ label: 'embedded', value: 'https://example.com/<__PLACEHOLDER_VALUE__path__>' },
		{ label: 'nested', value: { entries: [{ key: '<__PLACEHOLDER_VALUE__API key__>' }] } },
	])('keeps $label placeholders incomplete until they are replaced', ({ value, label }) => {
		hydrateWorkflow([createTestNode({ name: 'Request', parameters: { value } })]);
		const { derivedItems, isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);
		const item: InstanceAiSetupItem = {
			id: `${WORKFLOW_ID}:parameters:Request`,
			kind: 'parameters',
			nodeName: 'Request',
			parameterNames: ['value'],
		};
		expect(derivedItems.value).toEqual([item]);
		expect(isItemDone(item)).toBe(false);
		if (label === 'nested') {
			expect(isItemDone({ ...item, parameterNames: ['value.entries[0].key'] })).toBe(false);
		}

		hydrateWorkflow([createTestNode({ name: 'Request', parameters: { value: 'real-value' } })]);
		expect(isItemDone(item)).toBe(true);
		expect(derivedItems.value).toEqual([item]);
	});

	it('does not retain temporary parameter rows when it resolves an event credential binding', () => {
		mockGetNodeCredentialTypes.mockReturnValue(['slackApi']);
		mockGetNodeParametersIssues.mockReturnValue({ channel: ['Required'] });
		hydrateWorkflow([createTestNode({ name: 'Slack', parameters: { channel: '' } })]);
		const agentTree: InstanceAiAgentNode = {
			agentId: 'root',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			timeline: [],
			children: [],
			toolCalls: [
				{
					toolCallId: 'update',
					toolName: 'workflows',
					isLoading: true,
					args: { action: 'update', workflowId: WORKFLOW_ID },
				},
			],
		};
		const thread = reactive({
			messages: [{ agentTree }],
			setupItemsByWorkflowId: { [WORKFLOW_ID]: [credentialItem({ nodeBindings: undefined })] },
		});
		const state = useSetupPanelState({ thread, workflowId: () => WORKFLOW_ID });
		expect(state.rows.value).toEqual([{ item: credentialItem(), isDone: false }]);

		mockGetNodeParametersIssues.mockReturnValue({});
		hydrateWorkflow([
			createTestNode({ name: 'Slack', parameters: { channel: 'generated-value' } }),
		]);
		thread.messages = [];
		expect(state.rows.value).toEqual([{ item: credentialItem(), isDone: false }]);
	});

	// Without node types the derivation would drop type-defined credentials and
	// read parameters as issue-free, so everything would falsely show as done.
	it('loads node types and stays unavailable until they are in', () => {
		nodeTypesStore.allNodeTypes = [];
		hydrateWorkflow([createTestNode({ name: 'Slack' })]);

		const { isWorkflowAvailable } = useWorkflowSetupItems(() => WORKFLOW_ID);

		expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalled();
		expect(isWorkflowAvailable.value).toBe(false);

		nodeTypesStore.allNodeTypes = [mockNodeTypeDescription()];
		expect(isWorkflowAvailable.value).toBe(true);
	});

	it("refetches this workflow's usable slice when a credential changes elsewhere", async () => {
		useWorkflowSetupItems(() => WORKFLOW_ID);
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledTimes(1);

		// A deletion from e.g. the credentials page, not through this composable.
		// The refetch targets this workflow's scope, not the store's last one.
		await credentialsStore.deleteCredential({ id: 'cred-1' });

		await vi.waitFor(() => {
			expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledTimes(2);
		});
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenLastCalledWith({
			workflowId: WORKFLOW_ID,
		});
	});

	it('recovers readiness after the first credential read fails', async () => {
		credentialsStore.fetchUsableCredentials.mockRejectedValueOnce(new Error('Read failed'));
		const state = useWorkflowSetupItems(() => WORKFLOW_ID);
		await flushPromises();
		expect(state.credentialsAvailable.value).toBe(false);
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		await credentialsStore.deleteCredential({ id: 'cred-1' });
		await flushPromises();
		expect(state.credentialsAvailable.value).toBe(true);
	});

	it('uses the save response immediately without waiting for another workflow fetch', async () => {
		workflowsListStore.fetchWorkflow.mockResolvedValueOnce(
			createTestWorkflow({ id: WORKFLOW_ID, nodes: [createTestNode({ name: 'Slack' })] }),
		);
		const state = useWorkflowSetupItems(() => WORKFLOW_ID);
		await flushPromises();
		expect(state.getNodeByName('Slack')?.credentials).toBeUndefined();
		const saved = createTestWorkflow({
			id: WORKFLOW_ID,
			checksum: 'saved-checksum',
			nodes: [
				createTestNode({
					name: 'Slack',
					credentials: { slackApi: { id: 'existing', name: 'Existing account' } },
				}),
			],
		});
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(saved);
		const olderRead = Promise.withResolvers<IWorkflowDb>();
		workflowsListStore.fetchWorkflow.mockReturnValueOnce(olderRead.promise);
		const refresh = state.refreshWorkflow();
		await useWorkflowsStore().updateWorkflow(WORKFLOW_ID, { nodes: saved.nodes });
		expect(state.getNodeByName('Slack')?.credentials?.slackApi).toEqual({
			id: 'existing',
			name: 'Existing account',
		});
		olderRead.resolve(
			createTestWorkflow({ id: WORKFLOW_ID, nodes: [createTestNode({ name: 'Slack' })] }),
		);
		await refresh;
		expect(state.isItemDone(credentialItem())).toBe(true);
	});

	// Pins that the subscription stays non-detached and registered synchronously
	// in the composable body: that is what lets pinia unbind it on scope dispose,
	// so a closed panel does not keep re-anchoring the shared usable slice.
	it('stops refetching once its host scope is disposed', async () => {
		const scope = effectScope();
		scope.run(() => useWorkflowSetupItems(() => WORKFLOW_ID));
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledTimes(1);

		scope.stop();
		await credentialsStore.deleteCredential({ id: 'cred-1' });
		await Promise.resolve();
		await Promise.resolve();
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledTimes(1);
	});

	it('reads credentials during a build but defers the workflow fetch until it settles', async () => {
		const paused = ref(true);

		useWorkflowSetupItems(() => WORKFLOW_ID, { paused });

		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
			workflowId: WORKFLOW_ID,
		});
		expect(workflowsListStore.fetchWorkflow).not.toHaveBeenCalled();

		paused.value = false;
		await vi.waitFor(() => {
			expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
				workflowId: WORKFLOW_ID,
			});
			expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith(WORKFLOW_ID);
		});
	});

	it('reads saved bindings during a build when its snapshot is explicitly refreshed', async () => {
		const paused = ref(true);
		const read = Promise.withResolvers<IWorkflowDb>();
		const canvas = hydrateWorkflow([createTestNode({ name: 'Slack' })]);
		workflowsListStore.fetchWorkflow.mockReturnValueOnce(read.promise);
		const state = useWorkflowSetupItems(() => WORKFLOW_ID, { paused });
		const refresh = state.refreshWorkflow({ force: true });
		expect(state.isRefreshingWorkflow.value).toBe(true);
		expect(state.isItemDone(credentialItem())).toBe(false);
		read.resolve(
			createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [
					createTestNode({
						name: 'Slack',
						credentials: { slackApi: { id: 'cred-1', name: 'Existing account' } },
					}),
				],
			}),
		);
		await refresh;
		expect(state.isRefreshingWorkflow.value).toBe(false);
		expect(state.isItemDone(credentialItem())).toBe(true);
		expect(canvas.allNodes[0].credentials).toBeUndefined();
	});

	it('does not refresh the usable slice before a connection flow publishes its credential', async () => {
		useWorkflowSetupItems(() => WORKFLOW_ID);
		await flushPromises();
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledTimes(1);
		await credentialsStore.createNewCredential(
			{ id: '', name: 'Pending account', type: 'slackApi', data: {} },
			'project',
			undefined,
			{ skipStoreUpdate: true },
		);
		await flushPromises();
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledTimes(1);
		await credentialsStore.createNewCredential(
			{ id: '', name: 'Saved account', type: 'slackApi', data: {} },
			'project',
		);
		await flushPromises();
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledTimes(2);
	});

	it('requires a fresh credential read before reporting readiness, even with a cached scope', async () => {
		const read = Promise.withResolvers<[]>();
		credentialsStore.fetchUsableCredentials.mockReturnValueOnce(read.promise);
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		const state = useWorkflowSetupItems(() => WORKFLOW_ID, { paused: true });
		expect(state.credentialsAvailable.value).toBe(false);
		read.resolve([]);
		await flushPromises();
		expect(state.credentialsAvailable.value).toBe(true);
	});

	it('derives a managed credential as complete without an ordinary credential ID', () => {
		hydrateWorkflow([
			createTestNode({
				name: 'Slack',
				credentials: { slackApi: { id: null, name: '', __aiGatewayManaged: true } },
			}),
		]);
		expect(useWorkflowSetupItems(() => WORKFLOW_ID).isItemDone(credentialItem())).toBe(true);
	});

	it('keeps an unconnected private credential pending even if another account is usable', () => {
		hydrateWorkflow([
			createTestNode({
				name: 'Slack',
				credentials: { slackApi: { id: 'private', name: 'Private' } },
			}),
		]);
		credentialsStore.getCredentialById = vi
			.fn()
			.mockReturnValue({ id: 'private', isResolvable: true, connectedByMe: false });
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		credentialsStore.getUsableCredentialByType = vi.fn().mockReturnValue([{ id: 'ordinary' }]);
		expect(useWorkflowSetupItems(() => WORKFLOW_ID).isItemDone(credentialItem())).toBe(false);
	});

	it('uses scoped connection metadata after the flat credential map is replaced', () => {
		hydrateWorkflow([
			createTestNode({
				name: 'Slack',
				credentials: { slackApi: { id: 'private', name: 'Private' } },
			}),
		]);
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		credentialsStore.getUsableCredentialById.mockReturnValue({
			id: 'private',
			isResolvable: true,
			connectedByMe: false,
		} as ICredentialsResponse);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);
		expect(useWorkflowSetupItems(() => WORKFLOW_ID).isItemDone(credentialItem())).toBe(false);
	});

	it('follows the canvas host through dispose and recreate cycles', () => {
		mockGetNodeCredentialTypes.mockImplementation((_provider, node) =>
			node.name === 'Slack' ? ['slackApi'] : ['notionApi'],
		);
		const firstStore = hydrateWorkflow([createTestNode({ name: 'Slack' })]);

		const { isWorkflowAvailable, derivedItems } = useWorkflowSetupItems(() => WORKFLOW_ID);
		expect(derivedItems.value).toEqual([credentialItem()]);

		disposeWorkflowDocumentStore(firstStore);
		expect(isWorkflowAvailable.value).toBe(false);

		hydrateWorkflow([createTestNode({ name: 'Notion' })]);
		expect(isWorkflowAvailable.value).toBe(true);
		expect(derivedItems.value.map((item) => item.id)).toEqual(['wf-1:credential:notionApi']);
	});

	it('splits generic auth credential items per node', () => {
		mockGetNodeCredentialTypes.mockReturnValue(['httpHeaderAuth']);
		hydrateWorkflow([
			createTestNode({ name: 'Fetch docs' }),
			createTestNode({
				name: 'Fetch stats',
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Stats header' } },
			}),
		]);

		const { derivedItems, isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);

		expect(derivedItems.value.map((item) => item.id)).toEqual([
			'wf-1:credential:httpHeaderAuth:Fetch docs',
			'wf-1:credential:httpHeaderAuth:Fetch stats',
		]);
		// A usable credential of a generic type says nothing about this service:
		// only the node's own binding completes the item.
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		credentialsStore.getUsableCredentialByType = vi.fn().mockReturnValue([{ id: 'cred-9' }]);
		expect(isItemDone(derivedItems.value[0])).toBe(false);
		expect(isItemDone(derivedItems.value[1])).toBe(true);
	});

	it('keeps an available account pending until it is bound to the workflow', () => {
		const getUsable = vi.fn().mockReturnValue([{ id: 'cred-1' }]);
		credentialsStore.getUsableCredentialByType = getUsable;

		const { isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);

		// The slice was last fetched for another workflow or project: not trusted.
		expect(isItemDone(credentialItem())).toBe(false);

		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		getUsable.mockReturnValue([]);
		expect(isItemDone(credentialItem())).toBe(false);

		getUsable.mockReturnValue([{ id: 'cred-1' }]);
		expect(isItemDone(credentialItem())).toBe(false);
		hydrateWorkflow([createTestNode({ name: 'Slack' })]);
		expect(isItemDone(credentialItem())).toBe(false);
		hydrateWorkflow([
			createTestNode({
				name: 'Slack',
				credentials: { slackApi: { id: 'cred-1', name: 'Saved account' } },
			}),
		]);
		expect(isItemDone(credentialItem())).toBe(true);
	});

	it('completes a credential item when every bound node already carries one', () => {
		hydrateWorkflow([
			createTestNode({ name: 'Slack', credentials: { slackApi: { id: 'cred-9', name: 'Acme' } } }),
			createTestNode({ name: 'Unbound' }),
		]);

		const { isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);

		expect(isItemDone(credentialItem())).toBe(true);
		expect(isItemDone(credentialItem({ nodeBindings: [{ nodeName: 'Unbound' }] }))).toBe(false);
		expect(
			isItemDone(
				credentialItem({ nodeBindings: [{ nodeName: 'Slack' }, { nodeName: 'Unbound' }] }),
			),
		).toBe(false);
	});

	it.each([false, true])(
		'checks an OAuth selection before its nodes exist: %s',
		async (connected) => {
			const credential = { id: 'gmail-early', name: 'Gmail', type: 'gmailOAuth2' };
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
			credentialsStore.getCredentialTypeByName = vi
				.fn()
				.mockReturnValue({ extends: ['oAuth2Api'] });
			credentialsStore.getCredentialData.mockResolvedValue({
				...credential,
				data: connected ? { oauthTokenData: { access_token: 'test-token' } } : {},
			} as ICredentialsDecryptedResponse);
			hydrateWorkflow([]);
			const state = useWorkflowSetupItems(() => WORKFLOW_ID);
			expect(state.isCredentialConfigured(credential)).toBe(false);
			expect(state.isCheckingOAuthCredentials.value).toBe(true);
			await flushPromises();
			expect(state.isCredentialConfigured(credential)).toBe(connected);
			expect(state.isCheckingOAuthCredentials.value).toBe(false);
		},
	);

	it.each([
		'connected',
		'disconnected',
		'read-only shared credential',
		'read-only shared read-error',
		'editable missing data',
		'unknown access missing data',
		'clientCredentials',
		'read-error',
	] as const)('derives saved OAuth completion after loading a workflow: %s', async (scenario) => {
		const scopes: ICredentialsResponse['scopes'] = scenario.startsWith('read-only')
			? ['credential:read']
			: scenario === 'unknown access missing data'
				? undefined
				: ['credential:read', 'credential:update'];
		const credential = {
			id: 'gmail-1',
			name: 'Gmail account',
			type: 'gmailOAuth2',
			scopes,
			isManaged: false,
			createdAt: '2026-09-22T00:00:00.000Z' as const,
			updatedAt: '2026-09-22T00:00:00.000Z' as const,
		};
		credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({ extends: ['oAuth2Api'] });
		vi.mocked(credentialsStore.hasUsableCredentialsForScope).mockReturnValue(true);
		const read = Promise.withResolvers<ICredentialsDecryptedResponse | ICredentialsResponse>();
		credentialsStore.getCredentialData.mockReturnValue(read.promise);
		workflowsListStore.fetchWorkflow.mockResolvedValue(
			createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [
					createTestNode({
						name: 'Gmail',
						credentials: { gmailOAuth2: { id: credential.id, name: credential.name } },
					}),
				],
			}),
		);
		const state = useWorkflowSetupItems(() => WORKFLOW_ID);
		await flushPromises();
		const item = credentialItem({
			credentialType: 'gmailOAuth2',
			nodeBindings: [{ nodeName: 'Gmail' }],
		});
		expect(state.isItemDone(item)).toBe(false);
		expect(state.credentialsAvailable.value).toBe(true);
		expect(state.isCheckingOAuthCredentials.value).toBe(true);
		if (scenario.endsWith('read-error')) read.reject(new Error('Request failed'));
		else
			read.resolve({
				...credential,
				data:
					scenario === 'read-only shared credential' || scenario.endsWith('missing data')
						? undefined
						: {
								grantType:
									scenario === 'clientCredentials' ? 'clientCredentials' : 'authorizationCode',
								oauthTokenData: scenario === 'connected',
							},
			});
		await flushPromises();
		expect(state.isItemDone(item)).toBe(
			scenario.startsWith('read-only') || ['connected', 'clientCredentials'].includes(scenario),
		);
		expect(state.isCheckingOAuthCredentials.value).toBe(false);
	});

	describe('OAuth connection refreshes', () => {
		const first: ICredentialsResponse = {
			id: 'gmail-1',
			name: 'First Gmail account',
			type: 'gmailOAuth2',
			data: '',
			isManaged: false,
			isResolvable: false,
			createdAt: '2026-09-22T00:00:00.000Z',
			updatedAt: '2026-09-22T00:00:00.000Z',
			scopes: ['credential:read', 'credential:update'],
		};
		const second: ICredentialsResponse = { ...first, id: 'gmail-2', name: 'Second Gmail account' };
		let workflow: IWorkflowDb;

		beforeEach(() => {
			credentialsStore.setCredentials([first, second]);
			credentialsStore.getCredentialTypeByName = vi
				.fn()
				.mockReturnValue({ extends: ['oAuth2Api'] });
			credentialsStore.getCredentialData.mockImplementation(async ({ id }) => ({
				...first,
				id,
				data: { oauthTokenData: true },
			}));
			workflow = createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [
					createTestNode({
						name: 'First Gmail',
						credentials: { gmailOAuth2: { id: first.id, name: first.name } },
					}),
					createTestNode({
						name: 'Second Gmail',
						credentials: { gmailOAuth2: { id: second.id, name: second.name } },
					}),
					createTestNode({ name: 'Unrelated' }),
				],
			});
			workflowsListStore.fetchWorkflow.mockImplementation(async () => structuredClone(workflow));
		});

		it.each([
			'add node',
			'remove node',
			'reorder nodes',
			'workflow refresh',
			'credential list',
			'unrelated upsert',
			'scope order',
		])('preserves OAuth completion without refetching after an unrelated %s', async (change) => {
			const state = useWorkflowSetupItems(() => WORKFLOW_ID);
			await flushPromises();
			expect(credentialsStore.getCredentialData).toHaveBeenCalledTimes(2);
			const pending = Promise.withResolvers<ICredentialsDecryptedResponse>();
			credentialsStore.getCredentialData.mockReturnValue(pending.promise);
			if (change === 'add node') workflow.nodes.push(createTestNode({ name: 'Another node' }));
			if (change === 'remove node') workflow.nodes.pop();
			if (change === 'reorder nodes') workflow.nodes.reverse();
			if (change === 'credential list')
				credentialsStore.setCredentials(structuredClone([first, second]));
			if (change === 'unrelated upsert')
				credentialsStore.upsertCredential({ ...first, id: 'unrelated' });
			if (change === 'scope order')
				credentialsStore.upsertCredential({
					...first,
					scopes: ['credential:update', 'credential:read'],
				});
			await state.refreshWorkflow({ force: true });
			await flushPromises();
			expect(state.isCredentialConfigured(first)).toBe(true);
			expect(state.isCredentialConfigured(second)).toBe(true);
			expect(credentialsStore.getCredentialData).toHaveBeenCalledTimes(2);
			pending.resolve({ ...first, data: { oauthTokenData: true } });
			await flushPromises();
		});

		it('keeps an in-flight OAuth read across equivalent workflow refreshes', async () => {
			const read = Promise.withResolvers<ICredentialsDecryptedResponse>();
			credentialsStore.getCredentialData.mockReturnValue(read.promise);
			const state = useWorkflowSetupItems(() => WORKFLOW_ID);
			await flushPromises();
			await state.refreshWorkflow({ force: true });
			await flushPromises();
			expect(credentialsStore.getCredentialData).toHaveBeenCalledTimes(2);
			read.resolve({ ...first, data: { oauthTokenData: true } });
			await flushPromises();
			expect(state.isCredentialConfigured(first)).toBe(true);
			expect(state.isCredentialConfigured(second)).toBe(true);
		});

		it.each(['revision', 'permissions'])(
			'refreshes only the credential whose %s changed',
			async (change) => {
				const state = useWorkflowSetupItems(() => WORKFLOW_ID);
				await flushPromises();
				const read = Promise.withResolvers<ICredentialsDecryptedResponse | ICredentialsResponse>();
				credentialsStore.getCredentialData.mockReturnValue(read.promise);
				credentialsStore.upsertCredential({
					...first,
					...(change === 'revision'
						? { updatedAt: '2026-09-23T00:00:00.000Z' as const }
						: { scopes: ['credential:read'] }),
				});
				expect(state.isCheckingOAuthCredentials.value).toBe(true);
				await flushPromises();
				expect(credentialsStore.getCredentialData).toHaveBeenCalledTimes(3);
				expect(credentialsStore.getCredentialData).toHaveBeenLastCalledWith({ id: first.id });
				expect(state.isCheckingOAuthCredentials.value).toBe(true);
				expect(state.isCredentialConfigured(first)).toBe(false);
				expect(state.isCredentialConfigured(second)).toBe(true);
				read.resolve({ ...first, data: change === 'permissions' ? undefined : {} });
				await flushPromises();
				expect(state.isCheckingOAuthCredentials.value).toBe(false);
				expect(state.isCredentialConfigured(first)).toBe(change === 'permissions');
			},
		);

		it('retries failed reads without refetching connected credentials', async () => {
			credentialsStore.getCredentialData.mockRejectedValueOnce(new Error('offline'));
			const state = useWorkflowSetupItems(() => WORKFLOW_ID);
			await flushPromises();
			expect(state.isCredentialConfigured(first)).toBe(false);
			expect(state.isCredentialConfigured(second)).toBe(true);
			await state.refreshWorkflow({ force: true });
			await flushPromises();
			expect(credentialsStore.getCredentialData).toHaveBeenCalledTimes(3);
			expect(credentialsStore.getCredentialData).toHaveBeenLastCalledWith({ id: first.id });
			expect(state.isCredentialConfigured(first)).toBe(true);
		});

		it.each([false, true])(
			'ignores an older read after a credential is removed and bound again (early: %s)',
			async (early) => {
				const older = Promise.withResolvers<ICredentialsDecryptedResponse>();
				credentialsStore.getCredentialData.mockReturnValueOnce(older.promise);
				const savedNodes = workflow.nodes;
				if (early) workflow.nodes = [];
				const state = useWorkflowSetupItems(() => WORKFLOW_ID);
				await flushPromises();
				expect(state.isCredentialConfigured(first)).toBe(false);
				if (early) {
					await flushPromises();
					workflow.nodes = savedNodes;
					await state.refreshWorkflow({ force: true });
					await flushPromises();
				}
				const removed = workflow.nodes[0];
				workflow.nodes = workflow.nodes.slice(1);
				await state.refreshWorkflow({ force: true });
				await flushPromises();
				expect(state.isCredentialConfigured(second)).toBe(true);
				credentialsStore.getCredentialData.mockResolvedValueOnce({ ...first, data: {} });
				workflow.nodes.push(removed);
				await state.refreshWorkflow({ force: true });
				await flushPromises();
				expect(credentialsStore.getCredentialData).toHaveBeenCalledTimes(3);
				expect(state.isCredentialConfigured(first)).toBe(false);
				older.resolve({ ...first, data: { oauthTokenData: true } });
				await flushPromises();
				expect(state.isCredentialConfigured(first)).toBe(false);
			},
		);

		it('refreshes credentials on a workflow switch and ignores the previous workflow read', async () => {
			const older = Promise.withResolvers<ICredentialsDecryptedResponse>();
			credentialsStore.getCredentialData.mockReturnValueOnce(older.promise);
			const workflowId = ref(WORKFLOW_ID);
			const state = useWorkflowSetupItems(workflowId);
			await flushPromises();
			credentialsStore.getCredentialData.mockResolvedValueOnce({ ...first, data: {} });
			workflow.id = 'another-workflow';
			workflowId.value = workflow.id;
			await flushPromises();
			expect(credentialsStore.getCredentialData).toHaveBeenCalledTimes(4);
			expect(state.isCredentialConfigured(first)).toBe(false);
			older.resolve({ ...first, data: { oauthTokenData: true } });
			await flushPromises();
			expect(state.isCredentialConfigured(first)).toBe(false);
		});

		it('does not restore OAuth state after disposal', async () => {
			const read = Promise.withResolvers<ICredentialsDecryptedResponse>();
			credentialsStore.getCredentialData.mockReturnValue(read.promise);
			const scope = effectScope();
			const state = scope.run(() => useWorkflowSetupItems(() => WORKFLOW_ID))!;
			await flushPromises();
			scope.stop();
			read.resolve({ ...first, data: { oauthTokenData: true } });
			await flushPromises();
			expect(state.isCredentialConfigured(first)).toBe(false);
		});
	});

	it('does not treat a legacy credential name as a saved binding', () => {
		const node = createTestNode({ name: 'Slack' });
		Object.assign(node, { credentials: { slackApi: 'Legacy account' } });
		hydrateWorkflow([node]);
		expect(useWorkflowSetupItems(() => WORKFLOW_ID).isItemDone(credentialItem())).toBe(false);
	});

	it('completes a parameters item once the workflow no longer raises its issues', () => {
		mockGetNodeParametersIssues.mockReturnValue({
			documentId: ['Parameter "documentId" is required.'],
		});
		hydrateWorkflow([createTestNode({ name: 'Sheets' })]);

		const { isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);
		const item: InstanceAiSetupItem = {
			id: `${WORKFLOW_ID}:parameters:Sheets`,
			kind: 'parameters',
			nodeName: 'Sheets',
			parameterNames: ['documentId'],
		};

		expect(isItemDone(item)).toBe(false);

		mockGetNodeParametersIssues.mockReturnValue({});
		expect(isItemDone(item)).toBe(true);

		expect(isItemDone({ ...item, nodeName: 'Ghost' })).toBe(false);
	});

	it('keeps a parameters item listed as done once its issues resolve', () => {
		mockGetNodeParametersIssues.mockImplementation(
			(_provider, node): Record<string, string[]> =>
				node.name === 'Sheets' && !node.parameters?.documentId
					? { documentId: ['Parameter "documentId" is required.'] }
					: {},
		);
		hydrateWorkflow([createTestNode({ name: 'Sheets', parameters: {} })]);

		const { derivedItems, isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);
		expect(derivedItems.value.map((item) => item.id)).toEqual(['wf-1:parameters:Sheets']);
		expect(isItemDone(derivedItems.value[0])).toBe(false);

		hydrateWorkflow([createTestNode({ name: 'Sheets', parameters: { documentId: 'doc-1' } })]);
		expect(derivedItems.value.map((item) => item.id)).toEqual(['wf-1:parameters:Sheets']);
		expect(isItemDone(derivedItems.value[0])).toBe(true);

		// A row whose node is gone no longer applies.
		hydrateWorkflow([createTestNode({ name: 'Code' })]);
		expect(derivedItems.value).toEqual([]);
	});

	it('treats prototype property names as regular parameter names', () => {
		hydrateWorkflow([createTestNode({ name: 'Sheets' })]);

		const { isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);
		const item: InstanceAiSetupItem = {
			id: `${WORKFLOW_ID}:parameters:Sheets`,
			kind: 'parameters',
			nodeName: 'Sheets',
			parameterNames: ['constructor'],
		};

		mockGetNodeParametersIssues.mockReturnValue({});
		expect(isItemDone(item)).toBe(true);

		mockGetNodeParametersIssues.mockReturnValue({ constructor: ['required'] });
		expect(isItemDone(item)).toBe(false);
	});
});
