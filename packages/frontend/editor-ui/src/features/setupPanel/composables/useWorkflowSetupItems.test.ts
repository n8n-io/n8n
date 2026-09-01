import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ICredentialType } from 'n8n-workflow';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import type { InstanceAiSetupItem } from '@n8n/api-types';
import type { INodeUi } from '@/Interface';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	createWorkflowDocumentId,
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
		workflowId: WORKFLOW_ID,
		kind: 'credential',
		credentialType: 'slackApi',
		nodeBindings: [{ nodeName: 'Slack' }],
		...overrides,
	};
}

describe('useWorkflowSetupItems', () => {
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.getUsableCredentialByType = vi.fn().mockReturnValue([]);
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(undefined);
		mockGetNodeCredentialTypes.mockReset().mockReturnValue([]);
		mockGetNodeParametersIssues.mockReset().mockReturnValue({});
	});

	it('derives service-keyed items from the hydrated workflow document', () => {
		mockGetNodeCredentialTypes.mockImplementation((_provider, node) => {
			if (node.name === 'Slack' || node.name === 'Old Slack') return ['slackApi'];
			if (node.name === 'Sheets') return ['googleSheetsOAuth2Api'];
			return [];
		});
		mockGetNodeParametersIssues.mockImplementation((_provider, node) =>
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
				workflowId: WORKFLOW_ID,
				kind: 'credential',
				credentialType: 'slackApi',
				appDisplayName: 'Slack API',
				nodeBindings: [{ nodeName: 'Slack' }],
			},
			{
				id: 'wf-1:credential:googleSheetsOAuth2Api',
				workflowId: WORKFLOW_ID,
				kind: 'credential',
				credentialType: 'googleSheetsOAuth2Api',
				appDisplayName: undefined,
				nodeBindings: [{ nodeName: 'Sheets' }],
			},
			{
				id: 'wf-1:parameters:Sheets',
				workflowId: WORKFLOW_ID,
				kind: 'parameters',
				nodeName: 'Sheets',
				parameterNames: ['documentId'],
			},
		]);
	});

	it('derives nothing until the workflow document is hydrated', () => {
		const { isWorkflowAvailable, derivedItems } = useWorkflowSetupItems(() => WORKFLOW_ID);

		expect(isWorkflowAvailable.value).toBe(false);
		expect(derivedItems.value).toEqual([]);
	});

	it('completes a credential item once a usable credential of its type exists, even without the workflow document', () => {
		const getUsable = vi.fn().mockReturnValue([]);
		credentialsStore.getUsableCredentialByType = getUsable;

		const { isItemDone } = useWorkflowSetupItems(() => WORKFLOW_ID);
		const item = credentialItem();

		expect(isItemDone(item)).toBe(false);

		getUsable.mockReturnValue([{ id: 'cred-1' }]);
		expect(isItemDone(item)).toBe(true);
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
			isItemDone(credentialItem({ nodeBindings: [{ nodeName: 'Slack' }, { nodeName: 'Unbound' }] })),
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
			workflowId: WORKFLOW_ID,
			kind: 'parameters',
			nodeName: 'Sheets',
			parameterNames: ['documentId'],
		};

		expect(isItemDone(item)).toBe(false);

		mockGetNodeParametersIssues.mockReturnValue({});
		expect(isItemDone(item)).toBe(true);

		expect(isItemDone({ ...item, nodeName: 'Ghost' })).toBe(false);
	});
});
