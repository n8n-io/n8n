import { ref } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ICredentialType } from 'n8n-workflow';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import type { InstanceAiSetupItem } from '@n8n/api-types';
import type { INodeUi } from '@/Interface';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
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

// The credential-change test runs the real `deleteCredential` action (a
// reassigned `vi.fn()` would bypass pinia's wrapper, so `$onAction` — what
// `listenForCredentialChanges` subscribes through — would never fire).
vi.mock('@/features/credentials/credentials.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	deleteCredential: vi.fn().mockResolvedValue(true),
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
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
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
		workflowsListStore.workflowsById = {
			[WORKFLOW_ID]: createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [createTestNode({ name: 'Slack' })],
			}),
		};

		const { isWorkflowAvailable, derivedItems } = useWorkflowSetupItems(() => WORKFLOW_ID);

		// A cached entry alone is not enough — availability waits for this
		// composable's own fetch (the cache may hold a list-page placeholder).
		expect(isWorkflowAvailable.value).toBe(false);
		await vi.waitFor(() => expect(isWorkflowAvailable.value).toBe(true));
		expect(derivedItems.value).toEqual([credentialItem()]);
		// It attaches to a host's store but never creates one itself.
		expect(
			getWorkflowDocumentStoreId(createWorkflowDocumentId(WORKFLOW_ID)) in pinia.state.value,
		).toBe(false);
		expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith(WORKFLOW_ID);
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
			workflowId: WORKFLOW_ID,
		});
	});

	it('does not read a list-page placeholder entry as an empty workflow', async () => {
		mockGetNodeCredentialTypes.mockReturnValue(['slackApi']);
		// What a workflows-list page seeds into the cache: real metadata, `nodes: []`.
		workflowsListStore.workflowsById = {
			[WORKFLOW_ID]: createTestWorkflow({ id: WORKFLOW_ID, nodes: [] }),
		};
		let resolveFetch!: (workflow: ReturnType<typeof createTestWorkflow>) => void;
		workflowsListStore.fetchWorkflow = vi.fn().mockImplementation(
			async () =>
				await new Promise<ReturnType<typeof createTestWorkflow>>((resolve) => {
					resolveFetch = resolve;
				}),
		);

		const { isWorkflowAvailable, derivedItems } = useWorkflowSetupItems(() => WORKFLOW_ID);

		expect(isWorkflowAvailable.value).toBe(false);
		expect(derivedItems.value).toEqual([]);

		workflowsListStore.workflowsById = {
			[WORKFLOW_ID]: createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [createTestNode({ name: 'Slack' })],
			}),
		};
		resolveFetch(workflowsListStore.workflowsById[WORKFLOW_ID]);
		await vi.waitFor(() => expect(isWorkflowAvailable.value).toBe(true));
		expect(derivedItems.value).toEqual([credentialItem()]);
	});

	it('stays unavailable when the saved-workflow fetch fails', async () => {
		workflowsListStore.workflowsById = {
			[WORKFLOW_ID]: createTestWorkflow({
				id: WORKFLOW_ID,
				nodes: [createTestNode({ name: 'Slack' })],
			}),
		};
		workflowsListStore.fetchWorkflow = vi.fn().mockRejectedValue(new Error('offline'));

		const { isWorkflowAvailable } = useWorkflowSetupItems(() => WORKFLOW_ID);

		await vi.waitFor(() => expect(workflowsListStore.fetchWorkflow).toHaveBeenCalled());
		await Promise.resolve();
		await Promise.resolve();
		expect(isWorkflowAvailable.value).toBe(false);
	});

	it('refreshes the usable-credentials slice when a credential changes elsewhere', async () => {
		credentialsStore.refreshUsableCredentials = vi.fn().mockResolvedValue(undefined);

		useWorkflowSetupItems(() => WORKFLOW_ID);
		expect(credentialsStore.refreshUsableCredentials).not.toHaveBeenCalled();

		// A deletion from e.g. the credentials page, not through this composable.
		await credentialsStore.deleteCredential({ id: 'cred-1' });

		await vi.waitFor(() => {
			expect(credentialsStore.refreshUsableCredentials).toHaveBeenCalled();
		});
	});

	it('derives nothing while neither a document store nor the saved workflow is available', () => {
		const { isWorkflowAvailable, derivedItems } = useWorkflowSetupItems(() => WORKFLOW_ID);

		expect(isWorkflowAvailable.value).toBe(false);
		expect(derivedItems.value).toEqual([]);
	});

	it('pauses fetching while the agent edits, then refreshes once it settles', async () => {
		const paused = ref(true);

		useWorkflowSetupItems(() => WORKFLOW_ID, { paused });

		expect(credentialsStore.fetchUsableCredentials).not.toHaveBeenCalled();
		expect(workflowsListStore.fetchWorkflow).not.toHaveBeenCalled();

		paused.value = false;
		await vi.waitFor(() => {
			expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
				workflowId: WORKFLOW_ID,
			});
			expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith(WORKFLOW_ID);
		});
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

	it('completes a credential item once a usable credential of its type exists, even without the workflow document', () => {
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		const getUsable = vi.fn().mockReturnValue([]);
		credentialsStore.getUsableCredentialByType = getUsable;

		const { isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);
		const item = credentialItem();

		expect(isItemDone(item)).toBe(false);

		getUsable.mockReturnValue([{ id: 'cred-1' }]);
		expect(isItemDone(item)).toBe(true);
	});

	it('ignores usable credentials fetched for another workflow or project', () => {
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(false);
		credentialsStore.getUsableCredentialByType = vi.fn().mockReturnValue([{ id: 'cred-1' }]);

		const { isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);

		expect(isItemDone(credentialItem())).toBe(false);
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
