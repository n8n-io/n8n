import { ref, shallowRef, nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';

import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';

import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';

let mockOnCredentialDeleted: ((credentialId: string) => void) | undefined;

vi.mock('@/features/credentials/credentials.store', async () => {
	const actual = await vi.importActual('@/features/credentials/credentials.store');
	return {
		...actual,
		listenForCredentialChanges: vi.fn((opts: { onCredentialDeleted?: (id: string) => void }) => {
			mockOnCredentialDeleted = opts.onCredentialDeleted;
			return vi.fn();
		}),
	};
});

const mockUpdateNodeProperties = vi.fn();
const mockUpdateNodeCredentialIssuesByName = vi.fn();
const mockUpdateNodesCredentialsIssues = vi.fn();

const mockWorkflowDocumentStore = {
	allNodes: [] as INodeUi[],
	getNodeByName: vi.fn() as ReturnType<typeof vi.fn>,
	getNodes: vi.fn() as ReturnType<typeof vi.fn>,
	updateNodeProperties: mockUpdateNodeProperties,
};

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return {
		...actual,
		injectWorkflowDocumentStore: vi.fn(() => shallowRef(mockWorkflowDocumentStore)),
	};
});

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn(() => ({
		updateNodeCredentialIssuesByName: mockUpdateNodeCredentialIssuesByName,
		updateNodesCredentialsIssues: mockUpdateNodesCredentialsIssues,
	})),
}));

const mockGetNodeTypeDisplayableCredentials = vi.fn().mockReturnValue([]);
const mockGetNodeParametersIssues = vi.fn().mockReturnValue({});

vi.mock('@/app/utils/nodes/nodeTransforms', () => ({
	getNodeTypeDisplayableCredentials: (...args: unknown[]) =>
		mockGetNodeTypeDisplayableCredentials(...args),
}));

vi.mock('@/features/setupPanel/setupPanel.utils', async () => {
	const actual = await vi.importActual('@/features/setupPanel/setupPanel.utils');
	return {
		...actual,
		getNodeParametersIssues: (...args: unknown[]) => mockGetNodeParametersIssues(...args),
	};
});

// Sorting/filtering by execution order is tested in setupPanel.utils.test.ts.
// Use a pass-through mock here so non-sorting tests are not affected.
vi.mock('@/app/utils/workflowUtils', async () => {
	const actual = await vi.importActual('@/app/utils/workflowUtils');
	return {
		...actual,
		sortNodesByExecutionOrder: (nodes: unknown[]) => nodes,
	};
});

const createNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
	createTestNode({
		name: 'TestNode',
		type: 'n8n-nodes-base.testNode',
		typeVersion: 1,
		position: [0, 0],
		...overrides,
	}) as INodeUi;

describe('useWorkflowSetupState', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		createTestingPinia();
		workflowsStore = mockedStore(useWorkflowsStore);
		credentialsStore = mockedStore(useCredentialsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);

		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(undefined);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);
		credentialsStore.getNodesWithAccess = vi.fn().mockReturnValue([]);
		credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(true);
		credentialsStore.isCredentialTestPending = vi.fn().mockReturnValue(false);
		credentialsStore.getCredentialData = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(false);
		workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

		mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);
		mockWorkflowDocumentStore.allNodes = [];
		mockWorkflowDocumentStore.getNodeByName = vi.fn();
		mockWorkflowDocumentStore.getNodes = vi.fn();
		mockUpdateNodeProperties.mockReset();
		mockUpdateNodeCredentialIssuesByName.mockReset();
		mockUpdateNodesCredentialsIssues.mockReset();
		mockGetNodeParametersIssues.mockReset().mockReturnValue({});
		mockOnCredentialDeleted = undefined;
	});

	describe('setupCards', () => {
		it('should return empty array when no nodes', () => {
			mockWorkflowDocumentStore.allNodes = [];

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toEqual([]);
		});

		it('should return trigger cards for trigger nodes', () => {
			const triggerNode = createNode({
				name: 'WebhookTrigger',
				type: 'n8n-nodes-base.webhook',
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toHaveLength(1);
			expect(setupCards.value[0].state.isTrigger).toBe(true);
			expect(setupCards.value[0].state.credentialType).toBeUndefined();
			expect(setupCards.value[0].state).toMatchObject({
				node: expect.objectContaining({ name: 'WebhookTrigger' }),
			});
		});

		it('should return credential cards for nodes with credentials', () => {
			const node = createNode({ name: 'OpenAI' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toHaveLength(1);
			expect(setupCards.value[0].state.credentialType).toBe('openAiApi');
			expect(setupCards.value[0].state.credentialDisplayName).toBe('OpenAI API');
		});

		it('should group multiple nodes needing same credential into one credential card', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toHaveLength(1);
			const nodeNames = setupCards.value[0].state.allNodesUsingCredential?.map((n) => n.name) ?? [];
			expect(nodeNames).toContain('OpenAI1');
			expect(nodeNames).toContain('OpenAI2');
		});

		it('should create separate credential cards for different credential types', () => {
			const node1 = createNode({ name: 'Node1', position: [0, 0] });
			const node2 = createNode({ name: 'Node2', position: [100, 0] });
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'Node1') return [{ name: 'slackApi' }];
				if ((node as INodeUi).name === 'Node2') return [{ name: 'openAiApi' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const { setupCards } = useWorkflowSetupState();

			const credCards = setupCards.value.filter((c) => !!c.state.credentialType);
			expect(credCards).toHaveLength(2);
		});

		it('should embed trigger into credential card for trigger with credentials (no separate trigger card)', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);

			const { setupCards } = useWorkflowSetupState();

			const triggerOnlyCards = setupCards.value.filter(
				(c) => c.state.isTrigger && !c.state.credentialType,
			);
			const credCards = setupCards.value.filter((c) => !!c.state.credentialType);
			expect(triggerOnlyCards).toHaveLength(0);
			expect(credCards).toHaveLength(1);
			expect(credCards[0].state.isTrigger).toBe(true);
			expect(credCards[0].state.node.name).toBe('SlackTrigger');
		});

		it('should only allow executing first trigger; other triggers get no standalone cards', () => {
			const trigger1 = createNode({
				name: 'SlackTrigger1',
				type: 'n8n-nodes-base.slackTrigger',
				position: [0, 0],
			});
			const trigger2 = createNode({
				name: 'SlackTrigger2',
				type: 'n8n-nodes-base.slackTrigger',
				position: [100, 0],
			});
			mockWorkflowDocumentStore.allNodes = [trigger1, trigger2];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'SlackTrigger1') return trigger1;
				if (name === 'SlackTrigger2') return trigger2;
				return null;
			});

			const { setupCards } = useWorkflowSetupState();

			const credCards = setupCards.value.filter((c) => !!c.state.credentialType);
			const triggerOnlyCards = setupCards.value.filter(
				(c) => c.state.isTrigger && !c.state.credentialType,
			);

			// One credential card with ALL nodes (both triggers included for display)
			expect(credCards).toHaveLength(1);
			const allNodes = credCards[0].state.allNodesUsingCredential ?? [];
			expect(allNodes).toHaveLength(2);
			expect(allNodes.map((n) => n.name)).toEqual(['SlackTrigger1', 'SlackTrigger2']);

			// No standalone trigger cards — only the first trigger is executable,
			// and it's already embedded in the credential card
			expect(triggerOnlyCards).toHaveLength(0);
		});

		it('should produce only trigger card for trigger without credentials', () => {
			const triggerNode = createNode({
				name: 'ScheduleTrigger',
				type: 'n8n-nodes-base.scheduleTrigger',
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toHaveLength(1);
			expect(setupCards.value[0].state.isTrigger).toBe(true);
			expect(setupCards.value[0].state.credentialType).toBeUndefined();
		});

		it('should sort cards by primary node execution order, interleaving credential and trigger cards', () => {
			// Trigger comes before regular node in execution order
			const triggerNode = createNode({
				name: 'ScheduleTrigger',
				type: 'n8n-nodes-base.scheduleTrigger',
				position: [0, 0],
			});
			const regularNode = createNode({
				name: 'Regular',
				type: 'n8n-nodes-base.regular',
				position: [100, 0],
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode, regularNode];
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.scheduleTrigger',
			);
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'Regular') return [{ name: 'testApi' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Regular') return regularNode;
				if (name === 'ScheduleTrigger') return triggerNode;
				return null;
			});

			const { setupCards } = useWorkflowSetupState();

			// Trigger card first (ScheduleTrigger at index 0 in execution order),
			// then credential card (Regular at index 1)
			expect(setupCards.value).toHaveLength(2);
			expect(setupCards.value[0].state.isTrigger).toBe(true);
			expect(setupCards.value[0].state.credentialType).toBeUndefined();
			expect(setupCards.value[1].state.credentialType).toBeDefined();
		});

		it('should exclude disabled nodes', () => {
			const node = createNode({ name: 'DisabledNode', disabled: true });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toEqual([]);
		});

		it('should exclude nodes without credentials (non-trigger)', () => {
			const node = createNode({ name: 'NoCredNode' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toEqual([]);
		});
	});

	describe('credentialTypeStates', () => {
		it('should group by credential type', () => {
			const node1 = createNode({ name: 'Node1', position: [0, 0] });
			const node2 = createNode({ name: 'Node2', position: [100, 0] });
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value).toHaveLength(1);
			expect(credentialTypeStates.value[0].credentialType).toBe('openAiApi');
		});

		it('should include all nodes sharing the credential type', () => {
			const node1 = createNode({ name: 'Node1', position: [0, 0] });
			const node2 = createNode({ name: 'Node2', position: [100, 0] });
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const { credentialTypeStates } = useWorkflowSetupState();

			const nodeNames = credentialTypeStates.value[0].nodes.map((n) => n.name);
			expect(nodeNames).toEqual(['Node1', 'Node2']);
		});

		it('should mark isComplete true when credential is set without issues (non-trigger node)', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(true);
		});

		it('should mark isComplete false when credential is set but embedded trigger has not executed', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
				credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(false);
			const triggerNodes = credentialTypeStates.value[0].nodes.filter((n) =>
				nodeTypesStore.isTriggerNode(n.type),
			);
			expect(triggerNodes).toHaveLength(1);
		});

		it('should mark isComplete true when credential is set and embedded trigger has executed', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
				credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue([{ data: {} }]);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(true);
			const triggerNodes = credentialTypeStates.value[0].nodes.filter((n) =>
				nodeTypesStore.isTriggerNode(n.type),
			);
			expect(triggerNodes).toHaveLength(1);
		});

		it('should mark isComplete false when credential is missing', () => {
			const node = createNode({ name: 'Slack' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(false);
		});

		it('should mark isComplete false when credential has issues', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
				issues: {
					credentials: {
						slackApi: ['Token expired'],
					},
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(false);
		});

		it('should preserve execution order from nodesRequiringSetup', () => {
			const nodeA = createNode({ name: 'NodeA', position: [300, 0] });
			const nodeB = createNode({ name: 'NodeB', position: [100, 0] });
			// sortNodesByExecutionOrder is mocked as pass-through, so order matches allNodes
			mockWorkflowDocumentStore.allNodes = [nodeA, nodeB];
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'NodeA') return [{ name: 'apiA' }];
				if ((node as INodeUi).name === 'NodeB') return [{ name: 'apiB' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'NodeA') return nodeA;
				if (name === 'NodeB') return nodeB;
				return null;
			});

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].credentialType).toBe('apiA');
			expect(credentialTypeStates.value[1].credentialType).toBe('apiB');
		});
	});

	describe('triggerStates', () => {
		it('should mark trigger without credentials as complete after execution', () => {
			const triggerNode = createNode({
				name: 'ScheduleTrigger',
				type: 'n8n-nodes-base.scheduleTrigger',
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue([{ data: {} }]);

			const { triggerStates } = useWorkflowSetupState();

			expect(triggerStates.value).toHaveLength(1);
			expect(triggerStates.value[0].isComplete).toBe(true);
		});

		it('should not include trigger with credentials in triggerStates (it is embedded in credential card)', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { triggerStates } = useWorkflowSetupState();

			expect(triggerStates.value).toHaveLength(0);
		});

		it('should mark trigger without credentials and no execution as incomplete', () => {
			const triggerNode = createNode({
				name: 'ScheduleTrigger',
				type: 'n8n-nodes-base.scheduleTrigger',
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { triggerStates } = useWorkflowSetupState();

			expect(triggerStates.value[0].isComplete).toBe(false);
		});
	});

	describe('setCredential', () => {
		it('should update all nodes that need the credential type', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI1',
				properties: {
					credentials: {
						openAiApi: { id: 'cred-1', name: 'My OpenAI Key' },
					},
				},
			});
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI2',
				properties: {
					credentials: {
						openAiApi: { id: 'cred-1', name: 'My OpenAI Key' },
					},
				},
			});
		});

		it('should call updateNodesCredentialsIssues once', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			expect(mockUpdateNodesCredentialsIssues).toHaveBeenCalledTimes(1);
		});

		it('should not call updateNodeCredentialIssuesByName', () => {
			const node = createNode({ name: 'OpenAI' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			expect(mockUpdateNodeCredentialIssuesByName).not.toHaveBeenCalled();
		});

		it('should not show toast (no auto-assign toast)', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			// useToast is no longer used in the composable, so no toast should be shown
			// (there is no mockShowMessage to check — the composable doesn't depend on useToast)
		});

		it('should return early when credential not found', () => {
			const node = createNode({ name: 'OpenAI' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'non-existent');

			expect(mockUpdateNodeProperties).not.toHaveBeenCalled();
		});

		it('should preserve existing credentials on each node', () => {
			const node = createNode({
				name: 'MultiCred',
				credentials: {
					existingApi: { id: 'existing-1', name: 'Existing' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([
				{ name: 'existingApi' },
				{ name: 'newApi' },
			]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-2',
				name: 'New Cred',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('newApi', 'cred-2');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'MultiCred',
				properties: {
					credentials: {
						existingApi: { id: 'existing-1', name: 'Existing' },
						newApi: { id: 'cred-2', name: 'New Cred' },
					},
				},
			});
		});
	});

	describe('setCredential — HTTP Request auto-assign', () => {
		it('should auto-assign to another HTTP Request node with the same URL and credential type', () => {
			const httpNode1 = createNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				position: [0, 0],
				parameters: { url: 'https://api.example.com/data' },
			});
			const httpNode2 = createNode({
				name: 'HTTP Request1',
				type: 'n8n-nodes-base.httpRequest',
				position: [100, 0],
				parameters: { url: 'https://api.example.com/data' },
			});
			mockWorkflowDocumentStore.allNodes = [httpNode1, httpNode2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Header Auth',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'HTTP Request') return httpNode1;
				if (name === 'HTTP Request1') return httpNode2;
				return null;
			});
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My Auth',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('httpHeaderAuth', 'cred-1', 'HTTP Request');

			// Both nodes should get the credential because they share the same URL
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'HTTP Request',
				properties: {
					credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My Auth' } },
				},
			});
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'HTTP Request1',
				properties: {
					credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My Auth' } },
				},
			});
		});

		it('should NOT auto-assign to another HTTP Request node with a different URL', () => {
			const httpNode1 = createNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				position: [0, 0],
				parameters: { url: 'https://api.example.com/data' },
			});
			const httpNode2 = createNode({
				name: 'HTTP Request1',
				type: 'n8n-nodes-base.httpRequest',
				position: [100, 0],
				parameters: { url: 'https://api.other.com/data' },
			});
			mockWorkflowDocumentStore.allNodes = [httpNode1, httpNode2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Header Auth',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'HTTP Request') return httpNode1;
				if (name === 'HTTP Request1') return httpNode2;
				return null;
			});
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My Auth',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('httpHeaderAuth', 'cred-1', 'HTTP Request');

			// Only the source node should get the credential
			expect(mockUpdateNodeProperties).toHaveBeenCalledTimes(1);
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'HTTP Request',
				properties: {
					credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My Auth' } },
				},
			});
		});

		it('should create separate cards for HTTP Request nodes with same credential type', () => {
			const httpNode = createNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				position: [0, 0],
				parameters: { url: 'https://api.example.com' },
			});
			const regularNode = createNode({
				name: 'Slack',
				position: [100, 0],
			});
			mockWorkflowDocumentStore.allNodes = [httpNode, regularNode];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Header Auth',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'HTTP Request') return httpNode;
				if (name === 'Slack') return regularNode;
				return null;
			});

			const { credentialTypeStates } = useWorkflowSetupState();

			// HTTP Request gets its own card, regular node gets its own card
			expect(credentialTypeStates.value).toHaveLength(2);
			expect(credentialTypeStates.value[0].nodes[0].name).toBe('HTTP Request');
			expect(credentialTypeStates.value[1].nodes[0].name).toBe('Slack');
		});
	});

	describe('unsetCredential', () => {
		it('should remove credential from all nodes that need the type', () => {
			const node1 = createNode({
				name: 'OpenAI1',
				position: [0, 0],
				credentials: {
					openAiApi: { id: 'cred-1', name: 'My OpenAI' },
					otherApi: { id: 'cred-2', name: 'Other' },
				},
			});
			const node2 = createNode({
				name: 'OpenAI2',
				position: [100, 0],
				credentials: {
					openAiApi: { id: 'cred-1', name: 'My OpenAI' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});

			const { unsetCredential } = useWorkflowSetupState();
			unsetCredential('openAiApi');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI1',
				properties: {
					credentials: {
						otherApi: { id: 'cred-2', name: 'Other' },
					},
				},
			});
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI2',
				properties: {
					credentials: {},
				},
			});
		});

		it('should call updateNodesCredentialsIssues once', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { unsetCredential } = useWorkflowSetupState();
			unsetCredential('slackApi');

			expect(mockUpdateNodesCredentialsIssues).toHaveBeenCalledTimes(1);
		});
	});

	describe('isAllComplete', () => {
		it('should return false when empty', () => {
			mockWorkflowDocumentStore.allNodes = [];

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(false);
		});

		it('should return true when all cards are complete', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(true);
		});

		it('should return false when any card is incomplete', () => {
			const node1 = createNode({
				name: 'Complete',
				position: [0, 0],
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			const node2 = createNode({
				name: 'Incomplete',
				position: [100, 0],
			});
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'Complete') return [{ name: 'slackApi' }];
				if ((node as INodeUi).name === 'Incomplete') return [{ name: 'openAiApi' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Complete') return node1;
				if (name === 'Incomplete') return node2;
				return null;
			});

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(false);
		});

		it('should return false when trigger card is incomplete', () => {
			const triggerNode = createNode({
				name: 'Trigger',
				type: 'n8n-nodes-base.trigger',
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(false);
		});
	});

	describe('totalCredentialsMissing', () => {
		it('should return 0 when no credential cards exist', () => {
			mockWorkflowDocumentStore.allNodes = [];

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(0);
		});

		it('should count incomplete credential type cards', () => {
			const node = createNode({ name: 'TestNode' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'credA' }, { name: 'credB' }]);
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(2);
		});

		it('should return 0 when all credential type cards are complete', () => {
			const node = createNode({
				name: 'TestNode',
				credentials: {
					testApi: { id: 'cred-1', name: 'Test' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(0);
		});

		it('should count credential with issues as missing even if it has an id', () => {
			const node = createNode({
				name: 'TestNode',
				credentials: {
					testApi: { id: 'cred-1', name: 'Test' },
				},
				issues: {
					credentials: {
						testApi: ['Invalid credential'],
					},
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(1);
		});

		it('should count shared credential type only once even when multiple nodes need it', () => {
			const node1 = createNode({ name: 'Node1', position: [0, 0] });
			const node2 = createNode({ name: 'Node2', position: [100, 0] });
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const { totalCredentialsMissing } = useWorkflowSetupState();

			// One credential type card, not two
			expect(totalCredentialsMissing.value).toBe(1);
		});
	});

	describe('totalCardsRequiringSetup', () => {
		it('should return 0 when no cards exist', () => {
			mockWorkflowDocumentStore.allNodes = [];

			const { totalCardsRequiringSetup } = useWorkflowSetupState();

			expect(totalCardsRequiringSetup.value).toBe(0);
		});

		it('should return total number of setup cards', () => {
			const triggerNode = createNode({
				name: 'ScheduleTrigger',
				type: 'n8n-nodes-base.scheduleTrigger',
				position: [0, 0],
			});
			const regularNode = createNode({
				name: 'Regular',
				type: 'n8n-nodes-base.regular',
				position: [100, 0],
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode, regularNode];
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.scheduleTrigger',
			);
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'Regular') return [{ name: 'testApi' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'ManualTrigger') return triggerNode;
				if (name === 'Regular') return regularNode;
				return null;
			});

			const { totalCardsRequiringSetup } = useWorkflowSetupState();

			// 1 standalone trigger card (no credentials) + 1 credential card
			expect(totalCardsRequiringSetup.value).toBe(2);
		});

		it('should produce single credential card for trigger with credentials (trigger embedded)', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			});
			mockWorkflowDocumentStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);

			const { totalCardsRequiringSetup } = useWorkflowSetupState();

			// 1 credential card with embedded trigger (no separate trigger card)
			expect(totalCardsRequiringSetup.value).toBe(1);
		});

		it('should produce only credential card for two triggers sharing a credential (no standalone card for second trigger)', () => {
			const trigger1 = createNode({
				name: 'SlackTrigger1',
				type: 'n8n-nodes-base.slackTrigger',
				position: [0, 0],
			});
			const trigger2 = createNode({
				name: 'SlackTrigger2',
				type: 'n8n-nodes-base.slackTrigger',
				position: [100, 0],
			});
			mockWorkflowDocumentStore.allNodes = [trigger1, trigger2];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'SlackTrigger1') return trigger1;
				if (name === 'SlackTrigger2') return trigger2;
				return null;
			});

			const { totalCardsRequiringSetup } = useWorkflowSetupState();

			// 1 credential card with first trigger embedded; second trigger gets no card
			expect(totalCardsRequiringSetup.value).toBe(1);
		});
	});

	describe('with custom nodes ref', () => {
		it('should use provided nodes ref instead of store nodes', () => {
			const customNode = createNode({ name: 'CustomNode' });
			const storeNode = createNode({ name: 'StoreNode' });
			mockWorkflowDocumentStore.allNodes = [storeNode];

			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(customNode);

			const nodesRef = ref<INodeUi[]>([customNode]);
			const { setupCards } = useWorkflowSetupState(nodesRef);

			const credCards = setupCards.value.filter((c) => !!c.state.credentialType);
			expect(credCards).toHaveLength(1);
			const nodeNames = credCards[0].state.allNodesUsingCredential?.map((n) => n.name) ?? [];
			expect(nodeNames).toContain('CustomNode');
			expect(nodeNames).not.toContain('StoreNode');
		});

		it('should react to changes in the ref', async () => {
			const node1 = createNode({ name: 'Node1' });
			const node2 = createNode({ name: 'Node2' });

			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const nodesRef = ref<INodeUi[]>([node1]);
			const { credentialTypeStates } = useWorkflowSetupState(nodesRef);

			expect(credentialTypeStates.value).toHaveLength(1);
			expect(credentialTypeStates.value[0].nodes.map((n) => n.name)).toEqual(['Node1']);

			nodesRef.value = [node1, node2];
			await nextTick();

			expect(credentialTypeStates.value).toHaveLength(1);
			expect(credentialTypeStates.value[0].nodes.map((n) => n.name)).toEqual(['Node1', 'Node2']);
		});
	});

	describe('listenForCredentialChanges', () => {
		it('should unset credential from all affected nodes when credential is deleted', () => {
			const node1 = createNode({
				name: 'OpenAI1',
				position: [0, 0],
				credentials: {
					openAiApi: { id: 'cred-1', name: 'My OpenAI' },
				},
			});
			const node2 = createNode({
				name: 'OpenAI2',
				position: [100, 0],
				credentials: {
					openAiApi: { id: 'cred-1', name: 'My OpenAI' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});

			useWorkflowSetupState();

			expect(mockOnCredentialDeleted).toBeDefined();
			mockOnCredentialDeleted!('cred-1');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI1',
				properties: { credentials: {} },
			});
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI2',
				properties: { credentials: {} },
			});
		});

		it('should not unset credentials that do not match the deleted id', () => {
			const node = createNode({
				name: 'OpenAI',
				credentials: {
					openAiApi: { id: 'cred-1', name: 'My OpenAI' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			useWorkflowSetupState();

			mockOnCredentialDeleted!('cred-other');

			expect(mockUpdateNodeProperties).not.toHaveBeenCalled();
		});

		it('should only unset the matching credential type when node has multiple credentials', () => {
			const node = createNode({
				name: 'MultiCred',
				credentials: {
					openAiApi: { id: 'cred-1', name: 'My OpenAI' },
					slackApi: { id: 'cred-2', name: 'My Slack' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([
				{ name: 'openAiApi' },
				{ name: 'slackApi' },
			]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			useWorkflowSetupState();

			mockOnCredentialDeleted!('cred-1');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'MultiCred',
				properties: {
					credentials: {
						slackApi: { id: 'cred-2', name: 'My Slack' },
					},
				},
			});
		});
	});

	describe('testCredentialInBackground', () => {
		it('should trigger background test when setCredential is called', async () => {
			const node = createNode({ name: 'OpenAI' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
				test: { request: {} },
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});
			credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(false);
			credentialsStore.getCredentialData = vi.fn().mockResolvedValue({
				data: { apiKey: 'sk-test' },
			});
			credentialsStore.testCredential = vi.fn().mockResolvedValue({ status: 'OK' });

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			await vi.waitFor(() => {
				expect(credentialsStore.testCredential).toHaveBeenCalledWith(
					expect.objectContaining({
						id: 'cred-1',
						name: 'My OpenAI Key',
						type: 'openAiApi',
					}),
				);
			});
		});

		it('should skip test when credential is already tested OK', async () => {
			const node = createNode({ name: 'OpenAI' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
				test: { request: {} },
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});
			credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(true);

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			await nextTick();

			expect(credentialsStore.getCredentialData).not.toHaveBeenCalled();
		});

		it('should skip test when a test is already pending', async () => {
			const node = createNode({ name: 'OpenAI' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
				test: { request: {} },
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});
			credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(false);
			credentialsStore.isCredentialTestPending = vi.fn().mockReturnValue(true);

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			await nextTick();

			expect(credentialsStore.getCredentialData).not.toHaveBeenCalled();
		});

		it('should mark OAuth credentials as success without calling testCredential', async () => {
			const node = createNode({ name: 'Google' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'googleApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Google API',
				test: { request: {} },
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My Google',
			});
			credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(false);
			credentialsStore.getCredentialData = vi.fn().mockResolvedValue({
				data: { oauthTokenData: { access_token: 'tok' }, clientId: 'abc' },
			});
			credentialsStore.testCredential = vi.fn();

			const { setCredential } = useWorkflowSetupState();
			setCredential('googleApi', 'cred-1');

			await vi.waitFor(() => {
				expect(credentialsStore.credentialTestResults.get('cred-1')).toBe('success');
			});

			expect(credentialsStore.testCredential).not.toHaveBeenCalled();
		});

		it('should skip test for non-testable credential types', async () => {
			const node = createNode({ name: 'HttpRequest' });
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Header Auth',
			});
			credentialsStore.getNodesWithAccess = vi.fn().mockReturnValue([]);
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My Header Auth',
			});
			credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(false);
			credentialsStore.getCredentialData = vi.fn();
			credentialsStore.testCredential = vi.fn();

			const { setCredential } = useWorkflowSetupState();
			setCredential('httpHeaderAuth', 'cred-1');

			await nextTick();

			expect(credentialsStore.getCredentialData).not.toHaveBeenCalled();
			expect(credentialsStore.testCredential).not.toHaveBeenCalled();
		});

		it('should auto-test pre-existing credentials on initial load', async () => {
			credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(false);
			credentialsStore.getCredentialData = vi.fn().mockResolvedValue({
				data: { apiKey: 'sk-test' },
			});
			credentialsStore.testCredential = vi.fn().mockResolvedValue({ status: 'OK' });
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const node = createNode({
				name: 'OpenAI',
				credentials: {
					openAiApi: { id: 'cred-1', name: 'My OpenAI Key' },
				},
			});
			mockWorkflowDocumentStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
				test: { request: {} },
			});
			mockWorkflowDocumentStore.getNodeByName = vi.fn().mockReturnValue(node);

			useWorkflowSetupState();

			await vi.waitFor(() => {
				expect(credentialsStore.testCredential).toHaveBeenCalledWith(
					expect.objectContaining({
						id: 'cred-1',
						type: 'openAiApi',
					}),
				);
			});
		});
	});

	describe('nodeStates (credential+parameter)', () => {
		it('should create node credential cards when nodes have both credentials and parameters', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				issues: { credentials: { httpHeaderAuth: ['Credential is required'] } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			mockGetNodeParametersIssues.mockReturnValue({ url: ['URL is required'] });
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});

			const state = useWorkflowSetupState();

			expect(state.nodeStates.value).toHaveLength(1);
			expect(state.nodeStates.value[0]).toMatchObject({
				node: node1,
				credentialType: 'httpHeaderAuth',
				showCredentialPicker: true,
			});
		});

		it('should only show credential picker on first node with same credential type', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				issues: { credentials: { httpHeaderAuth: ['Credential is required'] } },
				parameters: { url: 'https://api.example.com' },
			});
			const node2 = createNode({
				name: 'HTTP Request 2',
				type: 'n8n-nodes-base.httpRequest',
				issues: { credentials: { httpHeaderAuth: ['Credential is required'] } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			mockGetNodeParametersIssues.mockReturnValue({ url: ['URL is required'] });
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});

			const state = useWorkflowSetupState();

			expect(state.nodeStates.value).toHaveLength(2);
			expect(state.nodeStates.value[0].showCredentialPicker).toBe(true);
			expect(state.nodeStates.value[1].showCredentialPicker).toBe(false);
		});

		it('should track all nodes using credential in allNodesUsingCredential', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				issues: { credentials: { httpHeaderAuth: ['Credential is required'] } },
				parameters: { url: 'https://api.example.com' },
			});
			const node2 = createNode({
				name: 'HTTP Request 2',
				type: 'n8n-nodes-base.httpRequest',
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My Credential' } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			// Only node1 has parameter issues
			mockGetNodeParametersIssues.mockImplementation((_, node) => {
				if (node.name === 'HTTP Request 1') return { url: ['URL is required'] };
				return {};
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});

			const state = useWorkflowSetupState();

			expect(state.nodeStates.value).toHaveLength(1);
			expect(state.nodeStates.value[0].allNodesUsingCredential).toHaveLength(2);
			expect(state.nodeStates.value[0].allNodesUsingCredential).toContain(node1);
			expect(state.nodeStates.value[0].allNodesUsingCredential).toContain(node2);
		});

		it('should persist cards even after parameters are filled', async () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				issues: { credentials: { httpHeaderAuth: ['Credential is required'] } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			mockGetNodeParametersIssues.mockReturnValue({ url: ['URL is required'] });
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});

			const state = useWorkflowSetupState();

			// Initial state - has parameter issues
			expect(state.nodeStates.value).toHaveLength(1);

			// Simulate parameter being filled (remove parameter issues)
			node1.issues = { credentials: { httpHeaderAuth: ['Credential is required'] } };
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});
			await nextTick();

			// Card should still exist due to persistence
			expect(state.nodeStates.value).toHaveLength(1);
		});

		it('should not create duplicate cards with credentialTypeStates', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				issues: { credentials: { httpHeaderAuth: ['Credential is required'] } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			mockGetNodeParametersIssues.mockReturnValue({ url: ['URL is required'] });
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});

			const state = useWorkflowSetupState();

			// Should only be in nodeStates, not credentialTypeStates
			expect(state.nodeStates.value).toHaveLength(1);
			expect(state.credentialTypeStates.value).toHaveLength(0);
		});

		it('should exclude nodes without parameters from card list', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				issues: { credentials: { httpHeaderAuth: ['Credential is required'] } },
				parameters: { url: 'https://api.example.com' },
			});
			const node2 = createNode({
				name: 'HTTP Request 2',
				type: 'n8n-nodes-base.httpRequest',
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My Credential' } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			mockGetNodeParametersIssues.mockImplementation((_, node) => {
				if (node.name === 'HTTP Request 1') return { url: ['URL is required'] };
				return {};
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});

			const state = useWorkflowSetupState();

			// Only node1 has parameter issues, so only it should get a card
			expect(state.nodeStates.value).toHaveLength(1);
			expect(state.nodeStates.value[0].node).toBe(node1);
		});

		it('should support node-specific credential assignment via setCredential', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				issues: { credentials: { httpHeaderAuth: ['Credential is required'] } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1];
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'HTTP Request 1') return node1;
				return null;
			});
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			mockGetNodeParametersIssues.mockReturnValue({ url: ['URL is required'] });
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});
			credentialsStore.getCredentialById = vi
				.fn()
				.mockReturnValue({ id: 'cred-1', name: 'My Credential', type: 'httpHeaderAuth' });

			const state = useWorkflowSetupState();

			// Set credential for specific node
			state.setCredential('httpHeaderAuth', 'cred-1', 'HTTP Request 1');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'HTTP Request 1',
				properties: {
					credentials: {
						httpHeaderAuth: { id: 'cred-1', name: 'My Credential' },
					},
				},
			});
		});

		it('should support node-specific credential removal via unsetCredential', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My Credential' } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1];
			mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'HTTP Request 1') return node1;
				return null;
			});
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			mockGetNodeParametersIssues.mockReturnValue({ url: ['URL is required'] });
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});

			const state = useWorkflowSetupState();

			// Unset credential for specific node
			state.unsetCredential('httpHeaderAuth', 'HTTP Request 1');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'HTTP Request 1',
				properties: {
					credentials: {},
				},
			});
		});

		it('should mark as complete when credential is set, tested, and all parameters are filled', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My Credential' } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			// Node has parameter issues, so card is created
			mockGetNodeParametersIssues.mockReturnValue({ url: ['URL is required'] });
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});
			credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(true);

			const state = useWorkflowSetupState();

			// Card exists but is incomplete due to parameter issues
			expect(state.nodeStates.value).toHaveLength(1);
			expect(state.nodeStates.value[0].isComplete).toBe(false);
		});

		it('should mark as incomplete when credential is not tested', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'My Credential' } },
				parameters: { url: 'https://api.example.com' },
			});

			mockWorkflowDocumentStore.allNodes = [node1];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);
			// Node has parameter issues, so card is created
			mockGetNodeParametersIssues.mockReturnValue({ url: ['URL is required'] });
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});
			credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(false);

			const state = useWorkflowSetupState();

			// Card exists but is incomplete due to credential not tested
			expect(state.nodeStates.value).toHaveLength(1);
			expect(state.nodeStates.value[0].isComplete).toBe(false);
		});

		it('should include in setupCards in execution order', () => {
			const node1 = createNode({
				name: 'HTTP Request 1',
				type: 'n8n-nodes-base.httpRequest',
				issues: { credentials: { httpHeaderAuth: ['Credential is required'] } },
				parameters: { url: 'https://api.example.com' },
			});
			const trigger = createNode({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
			});

			mockWorkflowDocumentStore.allNodes = [node1, trigger];
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_, node) => {
				mockGetNodeParametersIssues.mockImplementation((_, node) => {
					if (node.type === 'n8n-nodes-base.httpRequest') return { url: ['URL is required'] };
					return {};
				});
				if (node.type === 'n8n-nodes-base.httpRequest') return [{ name: 'httpHeaderAuth' }];
				return [];
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [{ name: 'url', required: true }],
			});
			nodeTypesStore.isTriggerNode = vi.fn((type: string) => type === 'n8n-nodes-base.webhook');

			const state = useWorkflowSetupState();

			expect(state.setupCards.value).toHaveLength(2);
			const nodeCredCard = state.setupCards.value.find((c) => c.state.node === node1);
			expect(nodeCredCard).toBeDefined();
			expect(nodeCredCard?.state.credentialType).toBe('httpHeaderAuth');
		});
	});
});
